import { CConst } from "../Compile/Types/Item";
import { FeatureMultiplierStellarGlimmer } from "./StellarGlimmer";

export class FeatureMultiplierStellarSwirl extends FeatureMultiplierStellarGlimmer {
    static getSubtype() {
        return 'stellarswirl';
    }

    static baseMultiplier() {
        return new CConst({
            value: 1,
            percent: true,
            comment: 'stellarswirl_base',
        });
    }

    static getVortexTriggerCount(data) {
        let settings = data.settings || data;
        let value = settings.getNumber
            ? settings.getNumber('stellarswirl_vortex_triggers')
            : settings.stellarswirl_vortex_triggers || 0;
        return Math.max(0, Math.min(6, value));
    }

    static getVortexLevel(triggerCount) {
        return Number(triggerCount) >= 3 ? 2 : 1;
    }

    static getVortexCoefficient(triggerCount) {
        return this.getVortexLevel(triggerCount) == 2 ? 3 : 2;
    }

    static shouldBurstVortex(triggerCount) {
        return Number(triggerCount) >= 6;
    }
}
