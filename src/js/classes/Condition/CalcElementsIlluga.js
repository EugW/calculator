import { Stats } from "../Stats";
import { Condition } from "../Condition";

export class ConditionCalcElementsIlluga extends Condition {
    getData(settings) {
        let count = 0;

        if (this.isActive(settings)) {
            for (const name of ['char_element', 'resonance_element_1', 'resonance_element_2', 'resonance_element_3']) {
                const element = settings[name] || '';
                if (!element) continue;

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
