import { Artifact } from "../Artifact";
import { CalcSet } from "../CalcSet";
import { prepareUid } from "./Uid";

// Numeric UID -> current showcase (no trailing slash!)
const API_UID = '/back/proxy/enka/uid/<uid>';
// Username -> profile hoyos list
const API_HOYOS = '/back/proxy/enka/profile/<uid>/hoyos/';
// Username + hash -> saved builds
const API_BUILDS = '/back/proxy/enka/profile/<uid>/hoyos/<hash>/builds/';
const HOYO_TYPE_GENSHIN = 0;

const SLOT_DATA = {
    'EQUIP_RING': 'goblet',
    'EQUIP_NECKLACE': 'plume',
    'EQUIP_DRESS': 'circlet',
    'EQUIP_BRACER': 'flower',
    'EQUIP_SHOES': 'sands',
};

export class EnkaApi {
    load(uid, hash, callback) {
        let xhr = new XMLHttpRequest();
        let url;
        let mode;

        let isNumericUid = /^1?\d{9}$/.test(uid);

        if (isNumericUid) {
            // Numeric UID - get current showcase directly
            url = API_UID.replace('<uid>', prepareUid(uid));
            mode = 'uid';
        } else if (hash) {
            // Username with hash - get specific builds
            url = API_BUILDS.replace('<uid>', prepareUid(uid)).replace('<hash>', hash);
            mode = 'builds';
        } else {
            // Username without hash - get hoyos list
            url = API_HOYOS.replace('<uid>', prepareUid(uid));
            mode = 'hoyos';
        }

        xhr.open('GET', url);
        xhr.onload = () => callback(this.processData(xhr.response, mode));
        xhr.onerror = () => callback();
        xhr.send();
    }

    isValidUid(uid) {
        if (/^1?\d{9}$/.exec(uid)) {
            return true;
        } else if (/^\d/.exec(uid)) {
            return false;
        }

        return uid.length > 0;
    }

    processData(data, mode) {
        let json;
        try {
            json = JSON.parse(data);
        } catch(e) {
            return null;
        }

        if (mode === 'uid') {
            return this.processUidData(json);
        } else if (mode === 'builds') {
            return this.processBuildsData(json);
        } else {
            return this.processHoyosData(json);
        }
    }

    processUidData(json) {
        // Process /api/uid/{uid}/ response - current showcase
        let characters = [];
        let artifacts = [];

        if (Array.isArray(json.avatarInfoList)) {
            for (let avatarData of json.avatarInfoList) {
                let calcset = processChar(avatarData);
                if (calcset) {
                    characters.push({
                        title: '',
                        set: calcset,
                    });

                    let charArts = calcset.getArtifacts();
                    for (let slot of Object.keys(charArts)) {
                        if (charArts[slot]) {
                            artifacts.push(charArts[slot].clone());
                        }
                    }
                }
            }
        }

        return {
            player: { hashes: null },
            characters: characters,
            artifacts: artifacts,
        };
    }

    processHoyosData(json) {
        // Transform {hash: {uid, player_info...}} to hashes array
        let hashes = [];
        for (let hash of Object.keys(json)) {
            let hoyo = json[hash];
            if (!hoyo.public || hoyo.hoyo_type !== HOYO_TYPE_GENSHIN) continue;
            hashes.push({
                hash: hash,
                name: hoyo.player_info?.nickname || '',
                uid: hoyo.uid,
                ar: hoyo.player_info?.level,
                region: hoyo.region,
            });
        }

        return {
            player: { hashes: hashes },
            characters: [],
            artifacts: [],
        };
    }

    processBuildsData(json) {
        // Transform {avatarId: [{name, avatar_data...}]} to builds array
        let characters = [];
        let artifacts = [];

        for (let avatarId of Object.keys(json)) {
            let builds = json[avatarId];
            for (let build of builds) {
                let calcset = processChar(build.avatar_data);
                if (calcset) {
                    characters.push({
                        title: build.name,
                        set: calcset,
                    });

                    let charArts = calcset.getArtifacts();
                    for (let slot of Object.keys(charArts)) {
                        if (charArts[slot]) {
                            artifacts.push(charArts[slot].clone());
                        }
                    }
                }
            }
        }

        return {
            player: { hashes: null },
            characters: characters,
            artifacts: artifacts,
        };
    }
}

function getHashes(data) {
    return data.hashes;
}

function getPlayer(data) {
    try {
        let player = data.playerInfo;
        let avatarId = player.profilePicture.avatarId;
        let chars = [];

        if (Array.isArray(player.showAvatarInfoList)) {
            for (let char of player.showAvatarInfoList) {
                let charData = DB.Chars.getByGameId(char.avatarId);
                if (charData) {
                    chars.push({
                        char: charData,
                        level: char.level,
                    });
                }
            }
        }

        return {
            title: player.nickname,
            signature: player.signature,
            ar: player.level,
            avatar: DB.Chars.getByGameId(avatarId),
            chars: chars,
        };
    } catch(e) {}
}

function getChars(data) {
    if (!data.hasOwnProperty('builds')) {
        return;
    }

    let chars = data.builds;
    if (!Array.isArray(chars)) {
        return;
    }

    let result = [];
    for (let charData of chars) {
        let calcset = processChar(charData.data);
        if (calcset) {
            result.push({
                title: charData.name,
                set: calcset,
            });
        }
    }

    return result;
}

function processChar(data) {
    try {
        let set = new CalcSet();

        set.setEnemy(DB.Enemies.getFirst().getFirst());
        set.setEnemyLevels({level: 90});

        let char = DB.Chars.getByGameId(data.avatarId, data.skillDepotId);
        if (!char) return;

        set.setChar(char);
        set.setCharLevels({
            level: Math.min(100, Math.max(1, parseInt(data.propMap['4001'].ival))),
            ascension: Math.min(6, Math.max(0, parseInt(data.propMap['1002'].ival))),
            constellation: Math.min(6, Math.max(0, data.talentIdList ? data.talentIdList.length : 0)),
        });

        let skillLevels = {};
        for (let skill of ['attack', 'skill', 'burst']) {
            let id = char.talents.getCategory(skill).gameId;
            skillLevels[skill] = data.skillLevelMap[id] || 1;
        }
        skillLevels.elemental = skillLevels.skill;
        set.setCharSkills(skillLevels);

        let weaponData;
        for (let item of data.equipList) {
            if (item.weapon) {
                weaponData = item;
            }
        }

        if (weaponData) {
            let weapon = DB.Weapons.get(char.weapon).getByGameId(weaponData.itemId);
            if (weapon) {
                set.setWeapon(weapon);
                let refine = 1;
                for (let affixId of Object.keys(weaponData.weapon.affixMap)) {
                    refine = weaponData.weapon.affixMap[affixId] + 1;
                    break;
                }

                set.setWeaponLevels({
                    level: Math.min(weapon.getMaxLevel(), Math.max(1, weaponData.weapon.level || 1)),
                    ascension: Math.min(weapon.getMaxAscension(), Math.max(0, weaponData.weapon.promoteLevel || 0)),
                    refine: Math.min(weapon.getMaxRefinement(), Math.max(1, refine)),
                });
            }
        }

        let artifacts = listArtifacts(data.equipList);
        for (let art of artifacts) {
            set.setArtifact(art);
        }

        return set;
    } catch(e) {
        console.log(e);
    }
}

function listArtifacts(data) {
    let artifactData = [];
    let result = [];

    for (let item of data) {
        if (item.reliquary) {
            artifactData.push(item);
        }
    }

    for (let item of artifactData) {
        let mainStat = DB.Artifacts.Mainstats.getKeyIdGame(item.flat.reliquaryMainstat.mainPropId);
        let setId = DB.Artifacts.Sets.getKeyByItem(item.itemId);
        let slot = SLOT_DATA[item.flat.equipType];
        let rarity = item.flat.rankLevel;
        let level = item.reliquary.level - 1;

        let subStats = [];
        for (let ss of item.flat.reliquarySubstats) {
            let stat = DB.Artifacts.Substats.getKeyIdGame(ss.appendPropId);
            if (stat) {
                subStats.push({
                    stat: stat,
                    value: ss.statValue,
                });
            }
        }

        let art = new Artifact(rarity, level, slot, setId, mainStat, subStats);
        result.push(art);
    }

    return result;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
