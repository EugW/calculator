import { ConditionBoolean } from "../Boolean";
import { assumed } from "../../Team/Scope";

export class ConditionBooleanNightSoul extends ConditionBoolean {
    isActive(settings) {
        let result = this.checkSubconditions(settings);

        if (!result) {
            return false;
        }

        if (settings.char_origin == 'natlan' || settings.char_id == 100) {
            return true;
        }

        // A floating set has no wearer: the check is met (Team/Legacy).
        return assumed(settings, 'wielder');
    }
}
