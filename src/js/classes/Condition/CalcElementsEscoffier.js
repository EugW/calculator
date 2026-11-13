import { Condition } from "../Condition";
import { Stats } from "../Stats";
import { teamElements } from "../Team/Party";

export class ConditionCalcElementsEscoffier extends Condition {
    getData(settings) {
        let chars = 0;
        let onlycryohydro = 1;

        if (this.isActive(settings)) {
            for (const element of teamElements(settings)) {
                if (['hydro', 'cryo'].includes(element)) {
                    ++chars;
                } else {
                    onlycryohydro = 0;
                }
            }
        }

        return {
            settings: {
                escoffier_chars_count: chars,
                escoffier_chars_only: onlycryohydro,
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
