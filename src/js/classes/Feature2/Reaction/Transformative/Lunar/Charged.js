import { FeatureReactionLunar } from "../Lunar";

export class FeatureReactionLunarCharged extends FeatureReactionLunar {
    constructor(params) {
        params.tags = params.tags || [];
        if (!params.tags.includes('lunarcharged_reaction')) {
            params.tags.push('lunarcharged_reaction');
        }
        super(params);
    }

    getReactionRate() { return 3; }
    getReactionPenalty() { return 1; }
    getScalingStat(data) { return 'lunarcharged_multi'; }

    /**
     * @returns {Array.<string>}
     */
    getStatsReactionBonus() {
        let result = super.getStatsReactionBonus();
        result.push('dmg_reaction_lunarcharged');
        return result;
    }

    /**
     * @returns {Array.<string>}
     */
    getStatsCritRate() {
        let result = super.getStatsCritRate();
        result.push('crit_rate_lunarcharged');
        return result;
    }

    /**
     * @returns {Array.<string>}
     */
    getStatsCritDamage() {
        let result = super.getStatsCritDamage();
        result.push('crit_dmg_lunarcharged');
        return result;
    }
}
