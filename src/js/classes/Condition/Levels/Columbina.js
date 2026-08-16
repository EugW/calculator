import { ConditionLevels } from "../Levels";
import { getSkillLevelByName } from "../../Build/Settings";

export class ConditionLevelsColumbina extends ConditionLevels {
    getLevel(settings) {
        let level = getSkillLevelByName(this.params.levelSetting, settings);

        // C5: Burst level +3
        if (settings['party.columbina_constellation'] >= 5) {
            level += 3;
        }

        return level;
    }
}
