import { BuildData } from "../../../Build/Data";
import { reactionDamageValues } from "../../../../db/generated/ElementScale";
import { makeStatItem } from "../../Compile/Helpers";
import { CBaseDamage, CFlatDamage, CMulti, CMultiplierCustom, CMultiplierResistance, CSum } from "../../Compile/Types/Block";
import { CDamage } from "../../Compile/Types/Damage";
import { CConst } from "../../Compile/Types/Item";
import { FeatureMultiplierReaction } from "../../Multiplier/Reaction";
import { FeatureMultiplierStellarSwirl } from "../../Multiplier/StellarSwirl";
import { FeatureReaction } from "../../Reaction";

export class FeatureReactionStellarSwirl extends FeatureReaction {
    constructor(params) {
        params.damageType ||= 'stellarswirl';
        params.cannotReact = true;
        params.tags = params.tags || [];

        for (let tag of ['stellarglimmer_reaction', 'stellarswirl_reaction']) {
            if (!params.tags.includes(tag)) {
                params.tags.push(tag);
            }
        }

        super(params);
        this.reactionRate = params.reactionRate ?? 1;
        this.penalty = params.penalty ?? 1;
    }

    getReactionRate() {
        return this.reactionRate;
    }

    getContributionWeight() {
        return this.penalty;
    }

    /**
     * A row with a rank weight of its own is a member's contribution at that
     * rank. New hits are offered the team's row instead, which ranks the
     * contributions itself (Feature2/Reaction/Team).
     */
    isRotationChoice() {
        return this.getContributionWeight() == 1;
    }

    getBaseMultiplier(data) {
        return new FeatureMultiplierReaction({
            reactionRate: this.getReactionRate(),
            reactionValue: reactionDamageValues.getValue(data.settings.char_level),
        });
    }

    getReactionMasteryBonus(data) {
        return FeatureMultiplierStellarSwirl.masteryMultiplier(data);
    }

    getStatsReactionBonus() {
        return [
            'dmg_stellarglimmer',
            'dmg_stellarswirl',
            ...this.reactionBonuses,
        ];
    }

    getReactionBonuses(data) {
        return new CSum(
            this.getStatsReactionBonus().map((stat) => makeStatItem(stat, data.stats))
        );
    }

    getStatsCritRate(data) {
        let result = this.getDefaultStatsCritRate(data);
        result.push('crit_rate_stellarglimmer');
        return result;
    }

    getStatsCritDamage(data) {
        let result = this.getDefaultStatsCritDamage(data);
        result.push('crit_dmg_stellarglimmer');
        return result;
    }

    isFlatDamageMultiplier(item) {
        if (!item.target || !item.target.options.length) {
            return false;
        }

        return FeatureMultiplierStellarSwirl.flatOptions().some((option) => item.isMatchOption(option));
    }

    getFlatDamageMultipliers(data) {
        let result = [];
        for (let item of data.multipliers) {
            if (!this.isFlatDamageMultiplier(item)) continue;
            if (!item.isActive(data)) continue;
            if (!item.isMatchFeature(this, data)) continue;
            result.push(item);
        }
        return result;
    }

    /**
     * (level base * coefficient * base bonus * (EM + additive) + flat Quills)
     * * contribution * RES * elevation, with CRIT applied by CDamage. No DEF.
     * A rank row's weight is of everything the member deals, Quills included,
     * as the team's row weighs it (Feature2/Reaction/Team) and the Lunar rows do.
     *
     * @param {BuildData} data
     * @returns {CItem}
     */
    getTree(data) {
        let base = new CMulti([
            new CBaseDamage([this.getBaseMultiplier(data).getTree(data)]),
            FeatureMultiplierStellarSwirl.baseBonusMultiplier(data),
            FeatureMultiplierStellarSwirl.damageBonusMultiplier(data, this.reactionBonuses),
        ], {group: true});

        let flatMultipliers = this.getFlatDamageMultipliers(data);
        if (flatMultipliers.length) {
            base = new CSum([
                base,
                new CFlatDamage(
                    flatMultipliers.map((item) => item.getTree(data))
                ),
            ], {group: true});
        }

        let weight = this.getContributionWeight();
        base = new CMulti([
            base,
            ...(weight == 1 ? [] : [new CMultiplierCustom([
                new CConst({value: weight, percent: true, comment: 'reaction_contribution'}),
            ], {comment: 'reaction_contribution'})]),
            new CMultiplierResistance([this.getResistanceMultiplier(data)]),
            FeatureMultiplierStellarSwirl.elevationMultiplier(data),
        ], {group: true});

        return new CDamage([base], {
            critRate: this.getCritRateBlock(data),
            critDmg: this.getCritDmgBlock(data),
        });
    }
}
