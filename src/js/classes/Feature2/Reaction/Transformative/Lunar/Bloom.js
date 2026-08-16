import { FeatureReactionLunar } from "../Lunar";

export class FeatureReactionLunarBloom extends FeatureReactionLunar {
    constructor(params) {
        params.tags = params.tags || [];
        if (!params.tags.includes('lunarbloom_reaction')) {
            params.tags.push('lunarbloom_reaction');
        }
        super(params);
    }

    getReactionRate() { return 2; }
    getReactionPenalty() { return 1; }
    getScalingStat(data) { return 'lunarbloom_multi'; }

    /**
     * @returns {Array.<string>}
     */
    getStatsReactionBonus() {
        let result = super.getStatsReactionBonus();
        result.push('dmg_reaction_lunarbloom');
        return result;
    }

    /**
     * @returns {Array.<string>}
     */
    getStatsCritRate() {
        let result = super.getStatsCritRate();
        result.push('crit_rate_lunarbloom');
        return result;
    }

    /**
     * @returns {Array.<string>}
     */
    getStatsCritDamage() {
        let result = super.getStatsCritDamage();
        result.push('crit_dmg_lunarbloom');
        return result;
    }
}
