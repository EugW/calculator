import { REAL_TOTAL } from "../../db/Constants";
import { statKind } from "../PostEffect/Channels";
import { reachesOthers } from "./Receivers";

/**
 * The stats an entry of a team's legacy source states (Team/Legacy). An
 * entry has no build: a virtual character or the wielder of a floating
 * weapon has the stats that are stated for it and no others. A member of
 * the team has a build and states nothing.
 *
 * A stated stat (`stat_override.atk`) is the final value of that stat on the
 * entry: every read of it by what the entry delivers (base, premod or total)
 * is that value. A base stat (`stat_override.atk_base`) is stated on its
 * own.
 */

export const STAT_OVERRIDE_PREFIX = 'stat_override.';

/**
 * Stats that can be stated, by kind (PostEffect/Channels.statKind), with the
 * IDs they are saved under. Percent stats are typed and saved in percent
 * points (60 is 60%).
 */
export const OVERRIDE_STATS = {
    atk: {serializeId: 1},
    hp: {serializeId: 2},
    def: {serializeId: 3},
    mastery: {serializeId: 4},
    recharge: {serializeId: 5, percent: true},
    crit_rate: {serializeId: 6, percent: true},
    crit_dmg: {serializeId: 7, percent: true},
    atk_base: {serializeId: 8, base: true},
    hp_base: {serializeId: 9, base: true},
    def_base: {serializeId: 10, base: true},
};

const STATS_BY_ID = {};
for (const [kind, data] of Object.entries(OVERRIDE_STATS)) {
    STATS_BY_ID[data.serializeId] = kind;
}

/**
 * @param {string} kind
 * @returns {string} the setting holding the stated value of a stat kind
 */
export function statOverrideName(kind) {
    return STAT_OVERRIDE_PREFIX + kind;
}

/**
 * @param {Object} settings an entry's settings
 * @returns {Object.<string, number>} stated stat kinds and their values; a
 *     kind without a value (undefined, null, empty) is not stated
 */
export function statOverrides(settings) {
    let result = {};
    for (const kind of Object.keys(OVERRIDE_STATS)) {
        const value = settings ? settings[statOverrideName(kind)] : undefined;
        if (value === undefined || value === null || value === '') continue;

        const number = Number(value);
        if (Number.isFinite(number) && number >= 0) {
            result[kind] = number;
        }
    }
    return result;
}

/**
 * Make an entry's stage 0 stats hold its stated values: a stated total
 * becomes its base plus a flat remainder with no percent part, so base,
 * premod and total reads agree.
 *
 * @param {Stats} stats unprocessed stage 0 stats, changed in place
 * @param {Object} settings the entry's settings
 */
export function applyStatOverrides(stats, settings) {
    const values = statOverrides(settings);
    const kinds = Object.keys(values);

    for (const kind of kinds) {
        if (OVERRIDE_STATS[kind].base) stats.set(kind, values[kind]);
    }
    for (const kind of kinds) {
        if (OVERRIDE_STATS[kind].base) continue;

        if (REAL_TOTAL.includes(kind)) stats.set(kind + '_percent', 0);
        stats.set(kind, values[kind] - stats.get(kind + '_base'));
    }
}

/**
 * @param {Object} settings an entry's settings
 * @returns {Array.<number>} its stated stats as saved: [count, ...[stat ID,
 *     value]], percent stats in tenths
 */
export function serializeStatOverrides(settings) {
    let result = [];
    for (const [kind, value] of Object.entries(statOverrides(settings))) {
        const data = OVERRIDE_STATS[kind];
        result.push(data.serializeId, Math.round(data.percent ? value * 10 : value));
    }
    return [result.length / 2].concat(result);
}

/**
 * @param {Array.<number>} input consumed from the front
 * @returns {Object|null} settings, or null for invalid data
 */
export function deserializeStatOverrides(input) {
    const count = input.shift();
    if (!Number.isInteger(count) || count < 0 || count * 2 > input.length) return null;

    let result = {};
    for (let i = 0; i < count; ++i) {
        const kind = STATS_BY_ID[input.shift()];
        const value = input.shift();
        if (!kind || !Number.isInteger(value) || value < 0) return null;

        result[statOverrideName(kind)] = OVERRIDE_STATS[kind].percent ? value / 10 : value;
    }
    return result;
}

/**
 * @param {Array.<PostEffect>} effects
 * @param {Array.<FeatureMultiplier>} multipliers
 * @returns {Set.<string>} the kinds of OVERRIDE_STATS that the delivered ones
 *     among them read on their source: the stats worth stating
 */
export function statsReadByEffects(effects, multipliers) {
    let reads = [];
    for (const effect of effects) {
        if (!reachesOthers(effect) || effect.params.fromScope === 'receiver') continue;
        reads = reads.concat(effect.getReadStats ? effect.getReadStats() : [], effect.params.from || []);
    }
    for (const item of multipliers) {
        if (reachesOthers(item) && item.scaling) reads.push(item.scaling);
    }
    return new Set(reads.map((stat) => statKind(stat)).filter((kind) => !!OVERRIDE_STATS[kind]));
}
