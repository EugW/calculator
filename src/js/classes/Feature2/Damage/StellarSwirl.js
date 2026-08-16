import { FeatureDamageStellarGlimmer } from "./StellarGlimmer";
import { FeatureMultiplierStellarSwirl } from "../Multiplier/StellarSwirl";

export class FeatureDamageStellarSwirl extends FeatureDamageStellarGlimmer {
    constructor(params) {
        params.damageType ||= 'stellarswirl';
        super(params);
    }

    getStellarMultiplierClass() {
        return FeatureMultiplierStellarSwirl;
    }
}
