import { Condition } from "../Condition";
import { Stats } from "../Stats";
import { partyView } from "../Team/Party";

export class ConditionCalcElements extends Condition {
    getData(settings) {
        let elements = {};
        let same_elements = 0;
        let different_elements = 0;
        let different_chars = 0;

        if (this.isActive(settings)) {
            let view = partyView(settings);
            if (view.self.element) {
                elements[view.self.element] = 1;
            }

            for (const member of view.others) {
                const element = member.element;
                if (!element) continue;

                elements[element] = 1;
                ++different_chars;

                if (view.self.element == element) {
                    ++same_elements;
                } else {
                    ++different_elements;
                }
            }
        }

        return {
            settings: {
                party_elements_count_level: Object.keys(elements).length,
                party_elements_same: same_elements,
                party_elements_same_inc: same_elements + 1,
                party_elements_different: different_elements,
                party_elements_different_total: different_chars,
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
