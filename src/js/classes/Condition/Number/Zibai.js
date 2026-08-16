import { ConditionNumber } from "../Number";

/**
 * Zibai C6: Radiance consumed provides Lunar-Crystallize elevation.
 * Formula: (radiance - 70) × 1.6% elevation per point above 70.
 * Input: 70-100 radiance consumed (radiance cap is 100)
 * Output: 0-48% dmg_lunarcrystallize_special
 */
export class ConditionNumberZibaiC6 extends ConditionNumber {
    getStats(settings) {
        let stats = new (require("../../Stats").Stats)();

        if (!this.checkSubconditions(settings)) {
            return stats;
        }

        let value = this.getValue(settings);
        if (value > 70) {
            const radianceAbove70 = value - 70;
            const elevationPercent = radianceAbove70 * this.params.elevatePerPoint;
            stats.add('dmg_lunarcrystallize_special', elevationPercent);
        }

        return stats;
    }
}
