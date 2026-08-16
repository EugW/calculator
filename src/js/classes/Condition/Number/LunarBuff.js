import { ConditionNumber } from "../Number";

/**
 * A specialized ConditionNumber that applies the input value to
 * dmg_reaction_lunar (umbrella stat for all lunar reactions).
 * Used for Ascendant Gleam non-Moonsign character buff.
 */
export class ConditionNumberLunarBuff extends ConditionNumber {
    getStats(settings) {
        let stats = new (require("../../Stats").Stats)();

        // Check subconditions (e.g., party_moonsign >= 2) before applying stats
        // This is needed because ConditionNumber.getData() doesn't check isActive()
        if (!this.checkSubconditions(settings)) {
            return stats;
        }

        let value = this.getValue(settings);
        if (value > 0) {
            stats.add('dmg_reaction_lunar', value);
        }

        return stats;
    }
}
