import { Condition } from "../Condition";
import { teamSettings } from "../Team/Scope";

/**
 * Evaluates its condition against the team's settings instead of the member
 * it belongs to: for a condition on one of the team's toggles (Team/Settings).
 *
 * Example: a bonus while the team is in a Polestar Field.
 * new ConditionTeam({
 *     condition: new ConditionBoolean({name: 'polestar_field'}),
 * })
 */
export class ConditionTeam extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        return this.params.condition.isActive(teamSettings(settings));
    }
}
