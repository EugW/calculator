import { Condition } from "../Condition";
import { assumed } from "../Team/Scope";
import { isMainCharHexerei } from "./Hexerei";

/**
 * Condition that checks if the equipping character has completed Witch's Homework.
 * Returns true if the current character is a Hexerei-capable character and has
 * their witch homework toggle enabled.
 */
export class ConditionWitchHomework extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        let result = super.isActive(settings);
        if (!result) {
            return false;
        }

        // A floating weapon or set has no wielder: the check is met (Team/Legacy).
        result = assumed(settings, 'wielder') || isMainCharHexerei(settings);

        return this.params.invert ? !result : result;
    }
}
