import { Condition } from "../Condition";
import { Stats } from "../Stats";
import { teammateElements } from "../Team/Party";

export class ConditionCalcElementsNavia extends Condition {
    getData(settings) {
        let chars = 0;

        if (this.isActive(settings)) {
            for (const element of teammateElements(settings)) {
                if (['pyro', 'hydro', 'electro', 'cryo'].includes(element)) {
                    ++chars;
                }
            }
        }

        return {
            settings: {
                navia_chars_count: chars,
            },
            stats: new Stats(),
        };
    }

    getAllConditionsOn(settings) {
        return this.getData(settings || {}).settings;
    }

    getStats(settings) {
        return new Stats();
    }
}
