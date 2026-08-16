import { ConditionBoolean } from "../Boolean";

export class ConditionBooleanDropdownValue extends ConditionBoolean {
    isActive(settings) {
        let result = this.checkSubconditions(settings);
        if (!result) {
            return false;
        }

        let values = (settings[this.getName()] || this.params.defaultValue || '').split(';');
        return values.includes(this.params.value);
    }
}
