import { Condition } from "../Condition";

export const RADIANCE_STELLARCONDUCT = 'stellarconduct';
export const RADIANCE_STELLARSWIRL = 'stellarswirl';

export function getRadianceStellarGlimmerMode(settings, conductName, swirlName) {
    if (settings[conductName]) {
        return RADIANCE_STELLARCONDUCT;
    }
    if (settings[swirlName]) {
        return RADIANCE_STELLARSWIRL;
    }
    return '';
}

/**
 * Non-serializable gate for the two exclusive Radiance: Stellar Glimmer modes.
 * Existing character checkboxes keep their own names/serialize IDs; this helper
 * resolves them with the game rule that Stellar-Conduct has priority.
 */
export class ConditionRadianceStellarGlimmer extends Condition {
    constructor(params) {
        super(params);
        this.conductName = params.conductName;
        this.swirlName = params.swirlName;
        this.mode = params.mode;
    }

    isActive(settings) {
        if (!this.checkSubconditions(settings)) {
            return false;
        }

        return getRadianceStellarGlimmerMode(
            settings,
            this.conductName,
            this.swirlName,
        ) == this.mode;
    }
}
