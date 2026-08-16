import { BuildData } from "../../../../Build/Data";
import { makeStatItem } from "../../../Compile/Helpers";
import { CBaseDamage, CFlatDamage, CMulti, CMultiplierBonus, CMultiplierResistance, CReactionBase, CReactionBaseBonus, CSumPlusOne } from "../../../Compile/Types/Block";
import { CDamage } from "../../../Compile/Types/Damage";
import { FeatureReactionLunarBloom } from "./Bloom";

export class FeatureReactionLunarBloomLike extends FeatureReactionLunarBloom {
    constructor(params) {
        params.icon = 'lunarbloom';
        params.damageType ||= 'lunardirect';
        params.cannotReact = true;
        params.tags = params.tags || [];
        params.tags.push('lunarbloom_reaction');
        super(params);
        // Feature-specific DMG stats (not general category-based like dmg_skill)
        this.dmgStats = params.dmgStats || [];
    }

    /**
     * @param {BuildData} data
     * @returns {Array.<string>}
     */
    getStatsDmgBonus(data) {
        // Lunar-Bloom is NOT affected by element DMG%, dmg_all, or general category DMG%
        // Only feature-specific DMG stats (e.g., dmg_nefer_phantasm) are included
        return this.dmgStats;
    }

    /**
     * @param {BuildData} data
     * @returns {CBlock}
     */
    getReactionBaseMultipliers(data) {
        // Only return the feature's own multipliers, not data.multipliers
        // data.multipliers are handled separately:
        // - non-reaction_flat: added in getTree() loop
        // - reaction_flat: added as flat damage via getReactionBonusMultipliers()
        let multipliers = [];
        for (let item of this.multipliers) {
            if (!item.isActive(data)) continue;
            multipliers.push(item);
        }
        return multipliers;
    }

    /**
     * @param {BuildData} data
     * @returns {CItem}
     */
    getTree(data) {
        let multipliers = this.getReactionBaseMultipliers(data);

        for (let item of data.multipliers) {
            if (item.isMatchOption('reaction_flat')) continue;
            if (!item.isActive(data)) continue;
            if (!item.isMatchFeature(this, data)) continue;
            multipliers.push(item);
        }

        // Build base with all multipliers applied BEFORE flat damage
        // Formula: (base × category_dmg × reaction + flat) × special × RES × CRIT
        // Note: Lunar-Bloom is affected by category DMG% (e.g., dmg_skill) but NOT element DMG% or dmg_all
        // Note: Elevation (special) applies AFTER flat damage is added
        let base = new CReactionBase([
            new CBaseDamage(
                multipliers.map((i) => {return i.getTree(data);})
            ),
            // Category-based DMG% bonus (e.g., dmg_skill for skill category)
            new CMultiplierBonus(
                this.getStatsDmgBonus(data).map((stat) => { return makeStatItem(stat, data.stats); })
            ),
            ...this.getMultiplierReaction(data),
        ], {group: true});

        // Add flat damage AFTER reaction multipliers but BEFORE elevation
        let bonusMulti = this.getReactionBonusMultipliers(data);
        if (bonusMulti.length) {
            base = new CReactionBaseBonus([
                base,
                new CFlatDamage(
                    bonusMulti.map((i) => {return i.getTree(data);})
                ),
            ], {group: true});
        }

        // Apply Lunar-Bloom Special DMG Bonus (elevation) AFTER flat damage
        // This ensures (base + flat) × elevation, not (base × elevation + flat)
        // Includes umbrella stat (dmg_lunar_special) + specific stat (dmg_lunarbloom_special)
        base = new CMulti([
            base,
            new CSumPlusOne([
                makeStatItem('dmg_lunar_special', data.stats),
                makeStatItem('dmg_lunarbloom_special', data.stats),
            ], {percent: true, comment: 'lunarbloom_special'}),
        ], {group: true});

        let items = [
            base,
            new CMultiplierResistance([this.getResistanceMultiplier(data)]),
        ];

        let reactionItems = this.getReactionMultipliers(data);
        if (reactionItems.length) {
            for (let item of reactionItems) {
                items.push(item);
            }
        }

        return new CDamage(items, {
            critRate: this.getCritRateBlock(data),
            critDmg: this.getCritDmgBlock(data),
        });
    }
}
