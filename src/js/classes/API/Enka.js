import { Artifact } from "../Artifact";
import { CalcSet } from "../CalcSet";
import { prepareUid } from "./Uid";
import { artifactRollsFromIds, artifactRollTotals, displaySubstatValue } from "../ArtifactMetadata";

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
        if (!json || typeof json !== 'object' || Array.isArray(json)) return null;

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
            if (!Array.isArray(builds)) continue;
            for (let build of builds) {
                if (!build?.avatar_data) continue;
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
        for (let item of data.equipList || []) {
            if (item?.weapon) {
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
    return (Array.isArray(data) ? data : []).map(importEnkaArtifact).filter(Boolean);
}

export function importEnkaArtifact(item) {
    if (!item?.reliquary || !item.flat?.reliquaryMainstat) return null;
    try {
        const main = DB.Artifacts.Mainstats.get(DB.Artifacts.Mainstats.getKeyIdGame(item.flat.reliquaryMainstat.mainPropId));
        const set = DB.Artifacts.Sets.get(DB.Artifacts.Sets.getKeyByItem(item.itemId));
        const substats = (item.flat.reliquarySubstats || []).map(ss => ({
            key: DB.Artifacts.Substats.get(DB.Artifacts.Substats.getKeyIdGame(ss.appendPropId))?.goodId,
            value: ss.statValue,
        }));
        if (!main || !set || substats.some(ss => !ss.key)) return null;
        const art = Artifact.fromGood({
            setKey: set.getGoodId(), slotKey: SLOT_DATA[item.flat.equipType],
            rarity: item.flat.rankLevel, level: item.reliquary.level - 1,
            mainStatKey: main.goodId, substats,
        });
        if (!art) return null;
        art.setMetadata({...art.getMetadata(), ...enkaRollMetadata(art, item.reliquary.appendPropIdList)});
        return art;
    } catch (error) {
        // A malformed or newly introduced item must not discard the character.
        return null;
    }
}

function enkaRollMetadata(artifact, ids) {
    const list = Array.isArray(ids) && ids.length <= 9 ? ids.map(Number) : null;
    const rolls = list && artifactRollsFromIds(list, artifact.rarity);
    if (!rolls || !artifactRollTotals(artifact, rolls)) return {};
    // Enka passes the game's roll list through in game order (all 60 showcased
    // artifacts matched an Irminsul export roll for roll), so a line's first ID is
    // its first roll.
    const initialValues = {};
    for (const {stat} of artifact.subStats) {
        initialValues[stat] = displaySubstatValue(stat, rolls.find(roll => roll.stat === stat).units / 100);
    }
    return {totalRolls: list.length, initialValues, appendPropIdList: list};
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
