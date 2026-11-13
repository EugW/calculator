import { Condition } from "../Condition";
import { teamState } from "../Team/Scope";

/**
 * Whether a team member has the origin: any member, or with `onField` the
 * on-field member. A standalone build is a team of one, on-field.
 *
 * Example: Linnea's A4 raises her own Elemental Mastery unless the active
 * character is a Moonsign character.
 * new ConditionTeamOrigin({origin: 'nodkrai', onField: true, invert: true})
 */
export class ConditionTeamOrigin extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        let team = teamState(settings);
        let members = team ? team.members : [];
        if (this.params.onField) {
            members = members.filter((member) => team.isOnField(member.charId));
        }

        let result = members.some((member) => member.origin == this.params.origin);
        return this.params.invert ? !result : result;
    }
}
