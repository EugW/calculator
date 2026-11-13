import { Condition } from "../Condition";
import { teamElements } from "../Team/Party";

export class ConditionElementsCount extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        let result = super.isActive(settings);
        if (!result) {
            return false;
        }

        result = false;

        let elementsCount = 0;
        let target = this.params.element || '';
        let count  = this.params.count || 1;

        for (const element of teamElements(settings)) {
            if (target == element) {
                ++elementsCount;
            }
        }

        result = elementsCount >= count;

        return this.params.invert ? !result : result;
    }
}
