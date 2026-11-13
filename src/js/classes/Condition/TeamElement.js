import { Condition } from "../Condition";
import { teamState } from "../Team/Scope";

/**
 * Whether a team member has the element: any member, or with `onField` the
 * on-field member. A standalone build is a team of one, on-field.
 *
 * Example: Nicole's C2 shreds the RES of each Guidance of Theosis holder's
 * element; the on-field member is a holder.
 * new ConditionTeamElement({element: 'hydro', onField: true})
 */
export class ConditionTeamElement extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        let team = teamState(settings);
        let members = team ? team.members : [];
        if (this.params.onField) {
            members = members.filter((member) => team.isOnField(member.charId));
        }

        let result = members.some((member) => member.element == this.params.element);
        return this.params.invert ? !result : result;
    }
}
