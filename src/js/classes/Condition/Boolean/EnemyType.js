import {ConditionBoolean} from "../Boolean";
import { enemyScope } from "../../Team/Scope";

/**
 * Whether the team's enemy is of one of the given types.
 */
export class ConditionBooleanEnemyType extends ConditionBoolean {
    isActive(settings) {
        let result = this.checkSubconditions(settings);

        if (!result) {
            return false;
        }

        if (this.params.types && Array.isArray(this.params.types)) {
            result = this.params.types.includes(enemyScope(settings).enemy_type);
        } else {
            return false;
        }

        return result;
    }
}
