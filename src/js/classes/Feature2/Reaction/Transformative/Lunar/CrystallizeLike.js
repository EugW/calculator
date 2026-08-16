import { BuildData } from "../../../../Build/Data";
import { makeStatItem } from "../../../Compile/Helpers";
import { CBaseDamage, CFlatDamage, CMulti, CMultiplierAmplifying, CMultiplierResistance, CReactionBase, CReactionBaseBonus, CSumPlusOne } from "../../../Compile/Types/Block";
import { CDamage } from "../../../Compile/Types/Damage";
import { CConst } from "../../../Compile/Types/Item";
import { FeatureReactionLunarCrystallize } from "./Crystallize";

export class FeatureReactionLunarCrystallizeLike extends FeatureReactionLunarCrystallize {
    constructor(params) {
        params.icon = 'lunarcrystallize';
        params.damageType ||= 'lunardirect';
        params.cannotReact = true;
        params.tags = params.tags || [];
        params.tags.push('lunarcrystallize_reaction');
        super(params);
    }

    /**
     * @param {BuildData} data
     * @returns {Array.<CBlock>}
     */
    getMultiplierReaction(data) {
        let result = super.getMultiplierReaction(data);
        result.push(
            new CMultiplierAmplifying([new CConst({value: 1.6, comment: 'lunarcrystallize', percent: true})]),
        );
        return result;
    }

    /**
     * @param {BuildData} data
     * @returns {CBlock}
     */
    getReactionBaseMultipliers(data) {
        // Only return the feature's own multipliers, not data.multipliers
        // data.multipliers are handled separately in getTree()
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
        // Formula: (base × reaction + flat) × special × RES × CRIT
        // Note: Elevation (special) applies AFTER flat damage is added
        let base = new CReactionBase([
            new CBaseDamage(
                multipliers.map((i) => {return i.getTree(data);})
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

        // Apply Lunar-Crystallize Special DMG Bonus (elevation) AFTER flat damage
        // This ensures (base + flat) × elevation, not (base × elevation + flat)
        // Includes umbrella stat (dmg_lunar_special) + specific stat (dmg_lunarcrystallize_special)
        base = new CMulti([
            base,
            new CSumPlusOne([
                makeStatItem('dmg_lunar_special', data.stats),
                makeStatItem('dmg_lunarcrystallize_special', data.stats),
            ], {percent: true, comment: 'lunarcrystallize_special'}),
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
