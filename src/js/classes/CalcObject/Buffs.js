import { CalcObject } from '../CalcObject';
import { Stats } from '../Stats';

export const CUSTOM_STATS = {
    atk: {
        serializeId: 1,
        flat: true,
    },
    atk_percent: {
        serializeId: 2,
    },
    def: {
        serializeId: 3,
        flat: true,
    },
    def_percent: {
        serializeId: 4,
    },
    hp: {
        serializeId: 5,
        flat: true,
    },
    hp_percent: {
        serializeId: 6,
    },
    mastery: {
        serializeId: 7,
        flat: true,
    },
    recharge: {
        serializeId: 8,
    },
    crit_rate: {
        serializeId: 9,
    },
    crit_dmg: {
        serializeId: 10,
    },
    healing: {
        serializeId: 11,
    },
    healing_recv: {
        serializeId: 12,
    },
    shield: {
        serializeId: 13,
    },
    recharge: {
        serializeId: 14,
    },
    crit_rate: {
        serializeId: 15,
    },
    crit_dmg: {
        serializeId: 16,
    },
    healing: {
        serializeId: 17,
    },
    healing_recv: {
        serializeId: 18,
    },
    shield: {
        serializeId: 19,
    },
    dmg_all: {
        serializeId: 20,
    },
    dmg_anemo: {
        serializeId: 21,
    },
    dmg_cryo: {
        serializeId: 22,
    },
    dmg_dendro: {
        serializeId: 23,
    },
    dmg_electro: {
        serializeId: 24,
    },
    dmg_geo: {
        serializeId: 25,
    },
    dmg_hydro: {
        serializeId: 26,
    },
    dmg_pyro: {
        serializeId: 27,
    },
    dmg_phys: {
        serializeId: 28,
    },
    dmg_normal: {
        serializeId: 29,
    },
    dmg_charged: {
        serializeId: 30,
    },
    dmg_plunge: {
        serializeId: 31,
    },
    dmg_skill: {
        serializeId: 32,
    },
    dmg_burst: {
        serializeId: 33,
    },
    enemy_def_reduce: {
        serializeId: 34,
    },
    enemy_def_ignore: {
        serializeId: 35,
    },
    dmg_reaction_lunar: {
        serializeId: 36,
    },
    dmg_reaction_lunarbloom: {
        serializeId: 37,
    },
    dmg_reaction_lunarcharged: {
        serializeId: 38,
    },
    dmg_reaction_lunarcrystallize: {
        serializeId: 39,
    },
    lunarcharged_multi: {
        serializeId: 40,
    },
    lunarbloom_multi: {
        serializeId: 41,
    },
    lunarcrystallize_multi: {
        serializeId: 42,
    },
    dmg_lunar_special: {
        serializeId: 43,
    },
    dmg_lunarcharged_special: {
        serializeId: 44,
    },
    dmg_lunarbloom_special: {
        serializeId: 45,
    },
    dmg_lunarcrystallize_special: {
        serializeId: 46,
    },
    dmg_stellarconduct: {
        serializeId: 47,
    },
    stellarconduct_multi: {
        serializeId: 48,
    },
    dmg_stellarconduct_special: {
        serializeId: 51,
    },
    dmg_stellarglimmer: {
        serializeId: 52,
    },
    stellarglimmer_multi: {
        serializeId: 53,
    },
    dmg_stellarglimmer_special: {
        serializeId: 54,
    },
    dmg_stellarswirl: {
        serializeId: 55,
    },
    stellarswirl_multi: {
        serializeId: 56,
    },
    dmg_stellarswirl_special: {
        serializeId: 57,
    },
};

let STATS_BY_ID = {};
for (let key of Object.keys(CUSTOM_STATS)) {
    STATS_BY_ID[ CUSTOM_STATS[key].serializeId ] = key;
}

export class CalcObjectBuffs extends CalcObject {
    constructor() {
        super();
        this.buffs = DB.Buffs;
        this.partyCharIds = [];
    }

    get() {
        return this.buffs;
    }

    getFeatures() {
        let result = [];
        let charIds = this.getPartyChars();

        for (let charId of charIds) {
            const char = DB.Chars.getById(charId);

            if (char) {
                result = result.concat(char.getPartyFeatures());
            }
        }

        return result;
    }

    isBeta() {
        return false;
    }

    getStats(settings) {
        let result = {
            stats: new Stats(),
            settings: {},
        };

        return result;
    }

    getConditions(opts) {
        let result = [];
        opts ||= {};

        for (const item of this.buffs.getList()) {
            result = result.concat(item.getConditions());
        }

        let charIds = this.getPartyChars();

        if (!opts.serialize) {
            for (let i = 0; i < charIds.length; ++i) {
                let charId = charIds[i];
                const char = DB.Chars.getById(charId);

                if (char) {
                    result = result.concat(char.getPartyConditions());
                }
            }
        }

        return result;
    }

    getMultipliers() {
        let result = [];
        for (const item of this.buffs.getList()) {
            result = result.concat(item.getMultipliers());
        }

        let charIds = this.getPartyChars();
        for (let charId of charIds) {
            const char = DB.Chars.getById(charId);

            if (char) {
                result = result.concat(char.getPartyMultipliers());
            }
        }

        return result;
    }

    getPostEffects() {
        let result = [];
        let charIds = this.getPartyChars();

        for (const item of this.buffs.getList()) {
            result = result.concat(item.getPostEffects());
        }

        for (let i = 0; i < charIds.length; ++i) {
            let charId = charIds[i];
            const char = DB.Chars.getById(charId);

            if (char) {
                result = result.concat(char.getPartyPostEffects());
            }
        }

        return result;
    }

    setPartyChars(ids) {
        this.partyCharIds = [];

        for (const id of ids) {
            if (id && DB.Chars.getById(id)) {
                this.partyCharIds.push(id);
            }
        }
    }

    getPartyChars() {
        return [].concat(this.partyCharIds);
    }

    getSettings() {
        let result = super.getSettings();
        let partySize = 1;

        // Core party (affects resonance) - first 3 supports
        for (let i = 1; i <= 3; ++i) {
            let charId = this.partyCharIds[i-1];
            const char = DB.Chars.getById(charId);

            if (char) {
                ++partySize;
                result['party_char_'+ i] = charId;
                result['resonance_element_'+ i] = char.getElement();
            } else {
                result['party_char_'+ i] = 0;
                result['resonance_element_'+ i] = '';
            }
        }

        // Extended party (buffs only, no resonance)
        let extraCount = 0;
        let extraCharIds = {};
        for (let i = 4; i <= this.partyCharIds.length; ++i) {
            let charId = this.partyCharIds[i-1];
            const char = DB.Chars.getById(charId);

            if (char) {
                extraCount++;
                result['party_char_extra_'+ extraCount] = charId;
                // Mark for condition override - use serializeId (same as getId())
                result['party_extra_override_'+ char.getId()] = 1;
                extraCharIds[char.getId()] = true;
            }
        }

        // Clear any previously set extra slots and override flags
        for (const key of Object.keys(result)) {
            if (key.startsWith('party_char_extra_')) {
                let idx = parseInt(key.replace('party_char_extra_', ''), 10);
                if (idx > extraCount) {
                    result[key] = 0;
                }
            } else if (key.startsWith('party_extra_override_')) {
                let id = parseInt(key.replace('party_extra_override_', ''), 10);
                if (!extraCharIds[id]) {
                    result[key] = 0;
                }
            }
        }

        result['party_size'] = partySize;
        result['party_total_size'] = 1 + this.partyCharIds.length;

        return result;
    }

    serialize(settings) {
        let result = [];
        let condData = this.serializeConditions(settings);

        return result.concat(condData);
    }

    serializeChars(settings) {
        let charIds = this.getPartyChars();
        let result = [];
        let count = 0;

        for (let i = 0; i < charIds.length; ++i) {
            let id = charIds[i];

            let char = DB.Chars.getById(id);
            if (char) {
                ++count;
                let conditions = char.getPartyConditions();
                let condData = this.serializeConditions(settings, conditions);

                result.push(id);
                result = result.concat(condData);
            }
        }

        result.unshift(count);

        return result;
    }

    serializeCustomBuffs(settings) {
        let count = 0;
        let result = [];

        for (let stat of Object.keys(CUSTOM_STATS)) {
            let value = settings['custom_buffs.'+ stat];
            if (!value) {
                continue;
            }

            ++count;
            let data = CUSTOM_STATS[stat];

            result.push(data.serializeId);
            if (data.flat) {
                result.push(Math.floor(value));
            } else {
                result.push(Math.floor(value * 10));
            }
        }

        if (count) {
            result.unshift(count);
        }

        return result;
    }

    deserializeChars(input) {
        let count = input.shift();

        let result = {};

        for (let i = 0; i < count; ++i) {
            let charId = input.shift();
            let char = DB.Chars.getById(charId);
            if (!char) return null;

            let conditions = char.getPartyConditions();

            // First 3 go to party_char_X, rest go to party_char_extra_X
            if (i < 3) {
                result['party_char_'+ (i+1)] = charId;
            } else {
                result['party_char_extra_'+ (i-2)] = charId;
            }

            let charSettings = this.deserializeConditions(input, conditions);
            result = Object.assign(result, charSettings);
        }

        return result;
    }

    deserializeCustomBuffs(input) {
        let count = input.shift();
        let result = {};

        for (let i = 0; i < count; ++i) {
            let statId = input.shift();
            let stat = STATS_BY_ID[statId];
            if (!stat) return null;

            let data = CUSTOM_STATS[stat];
            let value = input.shift();

            if (!data.flat) {
                value = value / 10;
            }

            result['custom_buffs.'+ stat] = value;
        }

        return result;
    }

    static deserialize(input) {
        let result = new CalcObjectBuffs();
        let settings = result.deserializeConditions(input);
        if (!settings) return null;

        let charUsed = {};
        result.partyCharIds = [];

        // Core party members (1-3)
        for (let i = 1; i <= 3; ++i) {
            if (settings['party_char_'+ i]) {
                result.partyCharIds.push(settings['party_char_'+ i]);
            }
        }

        // Extra party members
        let extraIndex = 1;
        while (settings['party_char_extra_' + extraIndex]) {
            result.partyCharIds.push(settings['party_char_extra_' + extraIndex]);
            extraIndex++;
        }

        if (result.partyCharIds.length == 0) {
            for (let i = 1; i <= 3; ++i) {
                let element = settings['old_resonance_element_'+ i];

                if (element) {
                    delete settings['old_resonance_element_'+ i];

                    for (const char of DB.Chars.getList()) {
                        let charId = char.getId();

                        if (charUsed[charId]) {
                            continue;
                        }

                        if (element == char.getElement()) {
                            result.partyCharIds.push(charId);
                            charUsed[charId] = 1;
                            break;
                        }
                    }
                }
            }
        }

        result.setSettings(settings);

        return result;
    }
}
