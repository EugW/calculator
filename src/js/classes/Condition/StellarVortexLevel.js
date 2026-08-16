import { Condition } from "../Condition";
import { FeatureMultiplierStellarSwirl } from "../Feature2/Multiplier/StellarSwirl";

/** Select the active Stellar Vortex coefficient from its accumulated triggers. */
export class ConditionStellarVortexLevel extends Condition {
    constructor(params) {
        super(params);
        this.level = params.level;
    }

    isActive(settings) {
        if (!this.checkSubconditions(settings)) {
            return false;
        }

        let triggerCount = FeatureMultiplierStellarSwirl.getVortexTriggerCount(settings);
        return FeatureMultiplierStellarSwirl.getVortexLevel(triggerCount) == this.level;
    }
}
