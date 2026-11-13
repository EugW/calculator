import { CalcObject } from '../CalcObject';
import { Stats } from '../Stats';
import { isTeamSetting } from '../Team/Settings';
import { LEGACY_BUFF_CONDITIONS } from '../Legacy/Buffs';
import { LEGACY_BUFF_DATA } from '../Legacy/BuffData';
import { LEGACY_PARTY_DATA } from '../Legacy/PartyData';
import { legacyConditions } from '../Legacy/Condition';

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
    // The enemy's DEF reduction is team state now: a control of the enemy.
    // Format-1 values migrate to the enemy's DEF reduction control.
    enemy_def_reduce: {
        serializeId: 34,
        retired: true,
    },
    def_ignore: {
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
    }

    get() {
        return this.buffs;
    }

    getFeatures() {
        return [];
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

    /**
     * @returns {Array.<DbObjectBuff>} the member's own buffs; the party's
     *     belong to the team (TeamEvaluation.resolveParty)
     */
    getMemberBuffs() {
        return this.buffs.getList().filter((item) => !item.isParty());
    }

    getConditions() {
        return this.getMemberBuffs().flatMap((item) => item.getConditions());
    }

    getMultipliers() {
        return this.getMemberBuffs().flatMap((item) => item.getMultipliers());
    }

    getPostEffects() {
        return this.getMemberBuffs().flatMap((item) => item.getPostEffects());
    }

    serialize(settings) {
        settings = Object.fromEntries(Object.entries(settings).filter(([name]) => !isTeamSetting(name)));
        let result = [];
        let condData = this.serializeConditions(settings);

        return result.concat(condData);
    }

    serializeCustomBuffs(settings) {
        let count = 0;
        let result = [];

        for (let stat of Object.keys(CUSTOM_STATS)) {
            let value = settings['custom_buffs.'+ stat];
            if (!value || CUSTOM_STATS[stat].retired) {
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

    // A format-1 build keeps its party inputs until it creates a new team.
    // Character-only imports still discard the legacy context.
    deserializeChars(input) {
        const count = input.shift();
        if (!Number.isInteger(count) || count < 0) return null;
        for (let i = 0; i < count; ++i) {
            const char = DB.Chars.getById(input.shift());
            if (!char) return null;
            const conditions = this.legacyTeam
                ? legacyConditions(LEGACY_PARTY_DATA[char.getId()])
                : char.getLegacyPartyConditions();
            const settings = this.deserializeConditions(input, conditions);
            if (!settings) return null;
            if (this.legacyTeam) this.legacyTeam.party.push({charId: char.getId(), settings});
        }
        return {};
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

            if (!data.retired) {
                result['custom_buffs.'+ stat] = value;
            } else if (this.legacyTeam && stat == 'enemy_def_reduce') {
                this.legacyTeam.defReduce = value;
            }
        }

        return result;
    }

    static deserialize(input, legacy = false) {
        const result = new CalcObjectBuffs();
        if (legacy) {
            // The old tab's own rows (weapon and set buffs, typed bonuses)
            // are kept by their old names: a new team loads them into its
            // legacy source (Legacy/Team.loadLegacyTeam).
            result.legacyTeam = {party: [], settings: {}, buffs: {}, dropped: []};
            const settings = result.deserializeConditions(input, legacyConditions(LEGACY_BUFF_DATA));
            if (!settings) return null;
            const own = {};
            for (const [name, value] of Object.entries(settings)) {
                if (isTeamSetting(name)) {
                    result.legacyTeam.settings[name] = value;
                } else if (name == 'common.char_status_shield') {
                    result.legacyTeam.settings.on_field_shield = value;
                } else if (name.startsWith('custom_buffs.')) {
                    own[name] = value;
                } else {
                    result.legacyTeam.buffs[name] = value;
                }
            }
            result.setSettings(own);
            return result;
        }
        // Party toggles saved with a member before they were team state
        // still decode, and are dropped: a member holds none, and a team
        // made from an old build starts with the defaults.
        const party = DB.Buffs.getList().filter((item) => item.isParty()).flatMap((item) => item.getConditions());
        const settings = result.deserializeConditions(input, result.getConditions().concat(party, LEGACY_BUFF_CONDITIONS));
        if (!settings) return null;
        result.setSettings(Object.fromEntries(Object.entries(settings).filter(([name]) => !isTeamSetting(name))));
        return result;
    }
}
