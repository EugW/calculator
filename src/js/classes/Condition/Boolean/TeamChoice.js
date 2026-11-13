import { ConditionBoolean } from "../Boolean";
import { teamSettings } from "../../Team/Scope";

/**
 * Whether this member is the one a team's member selection chose: the team
 * setting holds a character ID, see ConditionDropdownTeamMember.
 *
 * new ConditionBooleanTeamChoice({setting: 'ascendant_gleam_source'})
 */
export class ConditionBooleanTeamChoice extends ConditionBoolean {
    getType() {
        return '';
    }

    isActive(settings) {
        const id = Number(teamSettings(settings)[this.params.setting]) || 0;
        const result = id > 0 && id === Number(settings.char_id) && this.checkSubconditions(settings);
        return this.params.invert ? !result : result;
    }
}
