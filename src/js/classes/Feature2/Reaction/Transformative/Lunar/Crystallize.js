import { FeatureReactionLunar } from "../Lunar";

export class FeatureReactionLunarCrystallize extends FeatureReactionLunar {
    constructor(params) {
        params.tags = params.tags || [];
        if (!params.tags.includes('lunarcrystallize_reaction')) {
            params.tags.push('lunarcrystallize_reaction');
        }
        super(params);
    }

    getReactionRate() { return 1.6; }
    getReactionPenalty() { return 1; }
    getScalingStat(data) { return 'lunarcrystallize_multi'; }

    /**
     * @returns {Array.<string>}
     */
    getStatsReactionBonus() {
        let result = super.getStatsReactionBonus();
        result.push('dmg_reaction_lunarcrystallize');
        return result;
    }

    /**
     * @returns {Array.<string>}
     */
    getStatsCritRate() {
        let result = super.getStatsCritRate();
        result.push('crit_rate_lunarcrystallize');
        return result;
    }

    /**
     * @returns {Array.<string>}
     */
    getStatsCritDamage() {
        let result = super.getStatsCritDamage();
        result.push('crit_dmg_lunarcrystallize');
        return result;
    }
}
