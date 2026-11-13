import { Stats } from "../../../Stats";
import { teamElements } from "../../../Team/Party";
import { ConditionStaticRefine } from "../Refine";

export class ConditionStaticRefineWaveridingWhirl extends ConditionStaticRefine {
    isActive(settings) {
        return super.isActive(settings) && this.getElementsCount(settings);
    }

    getElementsCount(settings) {
        let level = 0;

        for (const element of teamElements(settings)) {
            if (element == 'hydro') {
                ++level;
            }
        }

        return Math.min(2, level);
    }

    getStats(settings) {
        let stats = super.getStats(settings);
        let level = this.getElementsCount(settings);

        if (!level) {
            stats.add('text_number_f', 0.0001);
            return stats;
        }

        stats.add('text_number_f', level);

        if (this.params.realStats) {
            for (const tables of this.params.realStats) {
                let stat = tables.getValue(level);
                stats.add(stat.getName(), stat.getValue(settings.weapon_refine));
            }
        }

        return stats;
    }
}
