import { ConditionStacks } from "../Stacks"
import { getSkillLevelByName } from "../../Build/Settings";

export class ConditionStacksLevels extends ConditionStacks {
    getStacksLevel(settings) {
        if (!this.params.levelSetting) {
            return super.getStacksLevel(settings);
        }

        return getSkillLevelByName(this.params.levelSetting, settings);
    }

    getStats(settings, stacksCnt) {
        let result = super.getStats(settings, stacksCnt);

        if (stacksCnt) {
            let real = this.params.realStats;
            result.add(real.getName(), real.getValue(stacksCnt));
        }

        return result;
    }
}
