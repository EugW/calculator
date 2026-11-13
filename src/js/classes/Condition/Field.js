import { Condition } from "../Condition";
import { assumed, teamSettings, teamState } from "../Team/Scope";

/**
 * Field state is the team's: one member is on field, and only that member
 * can be protected by the team's on-field shield (Team/Settings). A member
 * reads it for itself; wrapped in ConditionReceiver it is read for the
 * member receiving an effect. A build on its own is on field.
 *
 * A virtual character (Team/Legacy) has no field state: what its own
 * effects require of it ("while Kaveh is on the field", "while off-field")
 * is taken as met, in either form. Its controls say whether the effect
 * applies, as the released party rows did.
 */

/**
 * @param {Object} settings a member's settings
 * @returns {boolean}
 */
function isOnField(settings) {
    let state = teamState(settings);
    // A condition shown outside an evaluation: the member is on field.
    return state ? state.isOnField(Number(settings.char_id)) : true;
}

/**
 * Whether the member is the team's on-field member.
 *
 * new ConditionOnField()
 * new ConditionOnField({invert: true}): off field
 */
export class ConditionOnField extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        if (assumed(settings, 'field')) {
            return true;
        }
        let result = isOnField(settings);
        return this.params.invert ? !result : result;
    }
}

/**
 * Whether the member is protected by a shield: it is on field and the team
 * has its on-field shield.
 *
 * new ConditionShielded()
 * new ConditionShielded({invert: true}): not shielded
 */
export class ConditionShielded extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        if (assumed(settings, 'field')) {
            return true;
        }
        let result = isOnField(settings) && !!teamSettings(settings).on_field_shield;
        return this.params.invert ? !result : result;
    }
}
