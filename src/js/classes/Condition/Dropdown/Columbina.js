import { ConditionDropdownElement } from "./Element";

export class ConditionDropdownColumbina extends ConditionDropdownElement {
    getData(settings) {
        let result = super.getData(settings);

        if (this.checkSubconditions(settings) && this.params.baseStats) {
            result.stats.concat(this.params.baseStats);
        }

        return result;
    }
}
