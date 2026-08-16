import { BuildData } from "../../../Build/Data";
import { CConst } from "../../Compile/Types/Item";
import { FeatureMultiplierReactionLunarCharged } from "../../Multiplier/Reaction/LunarCharged";
import { FeatureReactionTransformative } from "../Transformative";

export class FeatureReactionLunar extends FeatureReactionTransformative {
    constructor(params) {
        params.damageType ||= 'lunarreaction';
        super(params);
        this.penalty = params.penalty || 1;
    }

    getReactionMasteryBonus(data) {
        return FeatureMultiplierReactionLunarCharged.masteryMultiplier(data);
    }

    getContributionWeight(data) {
        return this.penalty;
    }

    getFinalReactionBaseMultipliers(data) {
        let weight = this.getContributionWeight(data);
        if (!weight || weight == 1) {
            return [];
        }

        return [
            new CConst({value: weight, percent: true, comment: 'reaction_contribution'}),
        ];
    }

    /**
     * @returns {Array.<string>}
     */
    getStatsReactionBonus() {
        let result = super.getStatsReactionBonus();
        result.push('dmg_reaction_lunar');
        return result;
    }

    /**
     * @param {BuildData} data
     * @returns {Array.<string>}
     */
    getStatsCritRate(data) {
        let result = this.getDefaultStatsCritRate(data);
        result.push('crit_rate_lunar');
        return result;
    }

    /**
     * @param {BuildData} data
     * @returns {Array.<string>}
     */
    getStatsCritDamage(data) {
        let result = this.getDefaultStatsCritDamage(data);
        result.push('crit_dmg_lunar');
        return result;
    }
}
