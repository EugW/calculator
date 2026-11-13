import { Condition } from "../../Condition";
import { enemyScope } from "../../Team/Scope";

/**
 * Whether the team's enemy is affected by one of the given elements.
 */
export class ConditionEnemyStatus extends Condition {
    isActive(settings) {
        let result = this.checkSubconditions(settings);

        if (!result) {
            return false;
        }

        let status = enemyScope(settings)['common.enemy_status'];

        if (status && this.params.status && Array.isArray(this.params.status)) {
            result = this.params.status.includes(status);
        } else {
            result = false;
        }

        return this.params.invert ? !result : result;
    }
}
