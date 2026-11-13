import { Stats } from "../../Stats";
import { teamElements } from "../../Team/Party";
import { ConditionStatic } from "../Static";

export class ConditionDefendersWill extends ConditionStatic {

    getData(settings) {
        let result = {
            settings: {},
            stats: new Stats(),
        };

        if (this.isActive(settings)) {
            result.settings = this.params.settings || {};
            result.stats = this.getStats(settings);
        }

        return result;
    }

    getStats(settings) {
        settings ||= {};

        let stats = new Stats({
            text_percent: 30,
        });

        let elements = {};
        for (const element of teamElements(settings)) {
            if (!elements[element]) {
                elements[element] = 0;
            }
            ++elements[element];
        }

        for (let element of Object.keys(elements)) {
            if (elements[element] == 1) {
                stats.add('res_'+ element, 30);
            }
        }

        return stats;
    }
}
