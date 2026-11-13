import {ConditionBoolean} from "../Boolean";
import { assumed } from "../../Team/Scope";

export class ConditionBooleanCharElement extends ConditionBoolean {
    isActive(settings) {
        let result = this.checkSubconditions(settings);

        if (!result) {
            return false;
        }

        if (this.params.element && Array.isArray(this.params.element)) {
            // A floating weapon or set has no wielder: its element is the one
            // the effect asks for, unless the entry states one (Team/Legacy).
            result = assumed(settings, 'element') || this.params.element.includes(settings.char_element);
        } else {
            return false;
        }

        return this.params.invert ? !result : result;
    }
}
