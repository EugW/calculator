import { Condition } from "../Condition";
import { receiverSettings } from "../Team/Scope";

/**
 * Evaluates its condition in the receiver scope: against the settings of the
 * member receiving the effect instead of the member it comes from. For an
 * effect a member gives itself both are the same member.
 *
 * Example: a team buff that only characters of some element receive.
 * new ConditionReceiver({
 *     condition: new ConditionBooleanCharElement({element: ['pyro']}),
 * })
 */
export class ConditionReceiver extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        return this.params.condition.isActive(receiverSettings(settings));
    }
}
