import { Stats } from "../../Stats";
import { ConditionNumber } from "../Number";

export class ConditionNumberNefer extends ConditionNumber {
    getMaxValue(settings) {
        let value = super.getMaxValue(settings);

        if (settings.char_constellation >= 2) {
            value += this.params.c2bonus;
        }

        return value;
    }

    getStats(settings) {
        let stats = new Stats();

        let stacksCnt = this.getValue(settings);
        if (stacksCnt <= 0) {
            return stats;
        }

        const constellation = (settings && settings.char_constellation) || 0;

        // Handle StatTable array format (multiply stat value by stack count)
        if (Array.isArray(this.params.stats)) {
            for (const stat of this.params.stats) {
                stats.add(stat.getName(), stat.getValue(1) * stacksCnt);
            }
        }

        // Ascendant Gleam integration:
        // Apply additional level-based stats directly from Veil stacks condition
        // (e.g. mastery +100 at 3 stacks when party_moonsign is Ascendant Gleam).
        if (Array.isArray(this.params.ascendantStats)) {
            const minStacks = this.params.ascendantMinStacks || 0;
            const maxConstellation = this.params.ascendantMaxConstellation || 0;
            const levelSetting = this.params.ascendantLevelSetting || '';
            const settingValue = (settings && levelSetting) ? (settings[levelSetting] || 0) : 0;
            const level = settingValue >= 2 ? 2 : 1;

            if (stacksCnt >= minStacks && constellation <= maxConstellation) {
                for (const stat of this.params.ascendantStats) {
                    stats.add(stat.getName(), stat.getValue(level));
                }
            }
        }

        // C2 integration:
        // At 5 Veil stacks (C2+), apply additional mastery bonus automatically.
        if (Array.isArray(this.params.c2Stats)) {
            const minStacks = this.params.c2MinStacks || 0;
            const minConstellation = this.params.c2MinConstellation || 0;

            if (stacksCnt >= minStacks && constellation >= minConstellation) {
                for (const stat of this.params.c2Stats) {
                    stats.add(stat.getName(), stat.getValue(1));
                }
            }
        }

        return stats;
    }
}
