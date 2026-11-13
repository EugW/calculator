import { Condition } from "../Condition";
import { teamElements } from "../Team/Party";

export class ConditionResonance extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        let result = super.isActive(settings);
        if (!result) {
            return false;
        }

        result = false;

        let elementsCount = {};
        let isDuo = false;

        for (const element of teamElements(settings)) {
            if (!elementsCount[element]) {
                elementsCount[element] = 1;
            } else {
                ++elementsCount[element];
                isDuo = true;
            }
        }

        if (this.params.element && elementsCount[this.params.element] >= 2) {
            result = true;
        } else if (!this.params.element && !isDuo) {
            result = true;
        }

        return this.params.invert ? !result : result;
    }
}
