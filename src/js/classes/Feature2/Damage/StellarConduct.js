import { FeatureDamageStellarGlimmer } from "./StellarGlimmer";
import { FeatureMultiplierStellarConduct } from "../Multiplier/StellarConduct";

export class FeatureDamageStellarConduct extends FeatureDamageStellarGlimmer {
    constructor(params) {
        params.damageType ||= 'stellarconduct';
        super(params);
    }

    getStellarMultiplierClass() {
        return FeatureMultiplierStellarConduct;
    }
}
