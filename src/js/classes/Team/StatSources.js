/**
 * Where a member's stage 0 stats come from, for showing a feature's damage
 * graph. A traced team evaluation (TeamEvaluation.traced) records one entry
 * every time it adds stats to a member or to the enemy: an object's own stats
 * (character, weapon, artifacts...), a condition of the member or of a
 * teammate, a party condition, the enemy's conditions. The entries of a
 * member add up to its stage 0 stats exactly; post-effects come later, on
 * programs (see DamageGraph/Contributions).
 *
 * Evaluations for results never record: only a traced evaluation has
 * sources.
 */
export const SOURCE_KINDS = {
    OBJECT: 'object',
    CONDITION: 'condition',
    PARTY: 'party',
    ENEMY: 'enemy',
};

export class StatSources {
    constructor() {
        /**
         * @type {Array.<{kind: string, source: (CalcSet|null), object: (string|null), item: (Object|null), stats: Object}>}
         */
        this.entries = [];
    }

    /**
     * @param {string} kind SOURCE_KINDS
     * @param {CalcSet|null} source member the stats come from, null for the party and the enemy
     * @param {string|null} object member object holding the item ('char', 'weapon', ...), if known
     * @param {Object|null} item condition, null for an object's own stats
     * @param {Object} stats added stats; numbers only are kept
     */
    add(kind, source, object, item, stats) {
        let values = {};
        for (let [stat, value] of Object.entries(stats || {})) {
            if (typeof value == 'number' && value) values[stat] = value;
        }
        if (Object.keys(values).length) {
            this.entries.push({kind, source, object, item, stats: values});
        }
    }

    /**
     * A stat derived from another as a copy (dmg_own counts as the member's
     * element DMG): every entry that adds `from` adds as much to `to`.
     *
     * @param {string} from
     * @param {string} to
     */
    alias(from, to) {
        for (let entry of this.entries) {
            if (entry.stats[from]) {
                entry.stats[to] = (entry.stats[to] || 0) + entry.stats[from];
            }
        }
    }

    /**
     * @returns {Object} stat -> sum of every entry
     */
    total() {
        let result = {};
        for (let entry of this.entries) {
            for (let [stat, value] of Object.entries(entry.stats)) {
                result[stat] = (result[stat] || 0) + value;
            }
        }
        return result;
    }
}
