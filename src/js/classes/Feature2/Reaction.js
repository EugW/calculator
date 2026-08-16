import { BuildData } from "../Build/Data";
import { makeStatItem } from "./Compile/Helpers";
import { CBlock, CItem } from "./Compile/Types";
import { CBaseDamage, CFlatDamage, CMulti, CMultiplierReaction, CMultiplierResistance, CReactionBase, CReactionBaseBonus, CSum } from "./Compile/Types/Block";
import { CDamage } from "./Compile/Types/Damage";
import { FeatureDamage } from "./Damage";

export class FeatureReaction extends FeatureDamage {
    constructor(params) {
        params.category ||= 'reaction';
        params.damageType ||= 'reaction';
        super(params);
        this.reactionBonuses = params.reactionBonuses || [];
    }

    /**
     * @returns {Array.<string>}
     */
    getStatsReactionBonus() {
        return [...this.reactionBonuses];
    }

    /**
     * @returns {Array.<string>}
     */
    getStatsCritRate() {return []; }

    /**
     * @returns {Array.<string>}
     */
    getStatsCritDamage() {return []; }

    getReactionMasteryBonus() {
        throw `Define getReactionMasteryBonus method for reaction feature!`;
    }

    getBaseMultiplier(data) {
        throw `Define getBaseMultiplier method for reaction feature!`;
    }

    getReactionBonusMultipliers(data) {
        let result = [];

        for (let item of data.multipliers) {
            if (!item.isMatchOption('reaction_flat')) continue;
            if (!item.isActive(data)) continue;
            if (!item.isMatchFeature(this, data)) continue;
            result.push(item);
        }

        return result;
    }

    /**
     * @param {BuildData} data
     * @returns {CItem}
     */
    getReactionBonuses(data) {
        return new CSum([
            ...this.getStatsReactionBonus().map((stat) => { return makeStatItem(stat, data.stats); })
        ]);
    }

    /**
     * @param {BuildData} data
     * @returns {Array.<CBlock>}
     */
    getMultiplierReaction(data) {
        return [
            new CMultiplierReaction([
                this.getReactionMasteryBonus(data),
                this.getReactionBonuses(data),
            ]),
        ];
    }

    /**
     * @param {BuildData} data
     * @returns {Array.<FeatureMultiplier>}
     */
    getReactionBaseMultipliers(data) {
        return [this.getBaseMultiplier(data)];
    }

    getFinalReactionBaseMultipliers(data) {
        return [];
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

        let base = new CReactionBase([
            new CBaseDamage(
                multipliers.map((i) => {return i.getTree(data);})
            ),
            ...this.getMultiplierReaction(data),
        ], {group: true});

        let bonusMulti = this.getReactionBonusMultipliers(data);
        if (bonusMulti.length) {
            base = new CReactionBaseBonus([
                base,
                new CFlatDamage(
                    bonusMulti.map((i) => {return i.getTree(data);})
                ),
            ], {group: true});
        }

        let finalBaseMultipliers = this.getFinalReactionBaseMultipliers(data);
        if (finalBaseMultipliers.length) {
            base = new CMulti([
                base,
                ...finalBaseMultipliers,
            ], {group: true});
        }

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
