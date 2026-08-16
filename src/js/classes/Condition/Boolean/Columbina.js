import { ConditionBoolean } from "../Boolean";

export class ConditionBooleanColumbina extends ConditionBoolean {
    getData(settings) {
        let result = super.getData(settings);

        if (this.checkSubconditions(settings) && this.params.baseStats) {
            result.stats.concat(this.params.baseStats);
        }

        return result;
    }
}
