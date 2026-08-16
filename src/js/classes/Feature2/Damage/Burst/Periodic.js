import { CBaseDamage, CMultiplierBonus, CMultiplierDefence, CMultiplierResistance, CMulti, CSum, CSumPlusOne } from "../../Compile/Types/Block";
import { CDamage } from "../../Compile/Types/Damage";
import { makeStatItem } from "../../Compile/Helpers";
import { FeatureDamageBurst } from "../Burst";

/**
 * Burst Periodic Damage feature class
 * Used for periodic burst damage that has a separate special multiplier layer
 * (e.g., Durin's Dragon of White Flame and Dragon of Dark Decay with A4 buff)
 *
 * The special multiplier only applies to base (leveling-based) damage,
 * not to flat damage bonuses (like C1's ATK-based flat damage).
 */
export class FeatureDamageBurstPeriodic extends FeatureDamageBurst {
    /**
     * Returns stats for Burst Periodic Special DMG multiplier (separate multiplicative layer)
     * This is used for effects like Durin A4 (up to +75% as separate multiplier)
     * @param {BuildData} data
     * @returns {Array.<string>}
     */
    getStatsSpecialMultiplier(data) {
        return ['dmg_burst_periodic_special'];
    }

    /**
     * Override getTree to apply special multiplier only to base damage,
     * not to flat damage bonuses.
     *
     * Correct formula: (base × special + flat) × bonus × res × def × crit
     * Where:
     *   - base = talent% × ATK (multipliers with leveling)
     *   - special = A4 special multiplier (up to 175%)
     *   - flat = C1 flat damage (multipliers without leveling, like 150% ATK)
     *
     * @param {BuildData} data
     * @returns {Function}
     */
    getTree(data) {
        let multipliers = this.getMultipliers(data);

        // Split multipliers into base (with leveling) and flat (without leveling)
        let baseMultipliers = [];
        let flatMultipliers = [];

        for (let multi of multipliers) {
            if (multi.leveling) {
                baseMultipliers.push(multi);
            } else {
                flatMultipliers.push(multi);
            }
        }

        // Build base damage with special multiplier
        let specialStats = this.getStatsSpecialMultiplier(data);
        let baseDamage;

        if (baseMultipliers.length) {
            baseDamage = new CBaseDamage(
                baseMultipliers.map((i) => { return i.getTree(data); })
            );

            // Apply special multiplier to base damage only
            if (specialStats.length) {
                baseDamage = new CMulti([
                    baseDamage,
                    new CSumPlusOne(
                        specialStats.map((stat) => { return makeStatItem(stat, data.stats); }),
                        {percent: true, comment: 'special_multiplier'}
                    ),
                ]);
            }
        }

        // Build flat damage (not affected by special multiplier)
        let flatDamage;
        if (flatMultipliers.length) {
            flatDamage = new CBaseDamage(
                flatMultipliers.map((i) => { return i.getTree(data); })
            );
        }

        // Combine: (base × special) + flat
        let totalBaseDamage;
        if (baseDamage && flatDamage) {
            totalBaseDamage = new CSum([baseDamage, flatDamage]);
        } else if (baseDamage) {
            totalBaseDamage = baseDamage;
        } else if (flatDamage) {
            totalBaseDamage = flatDamage;
        } else {
            // Fallback to empty base
            totalBaseDamage = new CBaseDamage([]);
        }

        let items = [
            totalBaseDamage,
            new CMultiplierBonus(
                this.getStatsDmgBonus(data).map((stat) => { return makeStatItem(stat, data.stats); })
            ),
            new CMultiplierResistance([this.getResistanceMultiplier(data)]),
            new CMultiplierDefence([this.getDefenceLevelMultiplier(data)], {
                percent: true,
            }),
        ];

        let reactionItems = this.getReactionMultipliers(data);
        if (reactionItems.length) {
            for (let item of reactionItems) {
                items.push(item);
            }
        }

        let dmgOpts = {
            critRate: this.getCritRateBlock(data),
            critDmg: this.getCritDmgBlock(data),
        };

        if (data.settings.weapon_royal_avg_crit_rate) {
            dmgOpts.royalCrit = makeStatItem('royal_crit_rate', data.stats);
        }

        return new CDamage(items, dmgOpts);
    }
}
