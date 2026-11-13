import { baseStatName } from "../Feature2/Compile/Stats";

/**
 * The game keeps two parts of an attribute: a non-extra part ("premod",
 * GO's name) and an extra part. The total is their sum. An effect reads
 * either the premod value (`FIGHT_PROP_NONEXTRA_*` in the game's ability
 * configs) or the total one, and writes either part (`Actor_*Delta` or
 * `Actor_*ExtraDelta`). Most stat conversions read premod and write extra,
 * so they never see each other: md/buff_chains.md.
 *
 * In a program the total stays under the stat's own name (`mastery`), so
 * every total read is unchanged. An extra write also adds to the stat's extra
 * lane (`mastery_extra`); a premod read subtracts it.
 */
export const CHANNELS = {
    PREMOD: 'premod',
    TOTAL: 'total',
};

export const EXTRA_SUFFIX = '_extra';

/**
 * Attributes the game splits into premod and extra; writes to other stats
 * (a talent's own DMG bonus, reaction bonuses, counters) have no extra lane,
 * so reading them is always reading their total.
 */
const SPLIT_STATS = /^(atk|atk_percent|hp|hp_percent|def|def_percent|mastery|recharge|crit_rate|crit_dmg|dmg_(anemo|cryo|geo|hydro|pyro|electro|dendro|phys))$/;

/**
 * @param {string} stat a program stat, possibly addressed (m2__mastery) or
 *     renamed by a rotation state (mastery_3)
 * @returns {boolean} whether an extra write to it keeps an extra lane
 */
export function hasExtraLane(stat) {
    return SPLIT_STATS.test(unaddressed(baseStatName(stat)));
}

/**
 * @param {string} stat a program stat, possibly addressed or renamed
 * @returns {string} its extra lane: the stat's base name, addressed as the
 *     stat is, never renamed by a rotation state (a state block reverts its
 *     writes, so the lane is back to zero after it)
 */
export function extraStatName(stat) {
    return baseStatName(stat) + EXTRA_SUFFIX;
}

/**
 * @param {string} stat a program stat
 * @returns {boolean} whether it is an extra lane: bookkeeping for premod
 *     reads, not a stat of its own (its value is already in the stat)
 */
export function isExtraStat(stat) {
    return stat.endsWith(EXTRA_SUFFIX) && hasExtraLane(stat.slice(0, -EXTRA_SUFFIX.length));
}

/**
 * @param {string} stat
 * @returns {string} the stat without its member or enemy address
 */
function unaddressed(stat) {
    return stat.replace(/^(m\d+|enemy)__/, '');
}

/**
 * @param {string} stat a stat an effect reads or writes (atk_percent, atk*,
 *     atk~, mastery)
 * @returns {string} the attribute it belongs to, for ordering effects: a
 *     write of atk_percent and a read of atk* are both 'atk'
 */
export function statKind(stat) {
    return stat.replace(/[*~]$/, '').replace(/_percent$/, '');
}
