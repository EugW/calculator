import { Stats } from "../../Stats";
import { teamElements } from "../../Team/Party";
import { ConditionStatic } from "../Static";

export class ConditionStaticZibaiA4 extends ConditionStatic {
    getStats(settings) {
        let stats = new Stats();

        let geoCount = 0;
        let hydroCount = 0;

        for (const element of teamElements(settings)) {
            if (element === 'geo') {
                geoCount++;
            } else if (element === 'hydro') {
                hydroCount++;
            }
        }

        let otherGeoCount = Math.max(0, geoCount - 1);

        if (otherGeoCount > 0) {
            stats.add('def_percent', otherGeoCount * 15);
        }

        if (hydroCount > 0) {
            stats.add('mastery', hydroCount * 60);
        }

        return stats;
    }
}
