import { Condition } from "../Condition";
import { Stats } from "../Stats";
import { teamElements } from "../Team/Party";

export class ConditionCalcElementsIlluga extends Condition {
    getData(settings) {
        let count = 0;

        if (this.isActive(settings)) {
            for (const element of teamElements(settings)) {
                if (['hydro', 'geo'].includes(element)) {
                    ++count;
                }
            }
        }

        return {
            settings: {
                illuga_hydro_geo_count: count,
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
