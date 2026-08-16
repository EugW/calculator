import { Stats } from "../../Stats";
import { ConditionStatic } from "../Static";

export class ConditionStaticZibaiA4 extends ConditionStatic {
    getStats(settings) {
        let stats = new Stats();

        let geoCount = 0;
        let hydroCount = 0;

        for (const name of ['char_element', 'resonance_element_1', 'resonance_element_2', 'resonance_element_3']) {
            const element = settings[name] || '';
            if (!element) continue;

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
