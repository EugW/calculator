import { Condition } from "../Condition";
import { enemyScope } from "../Team/Scope";

/**
 * Evaluates its condition against the team's enemy instead of the member it
 * belongs to: for a condition on one of the enemy's toggles.
 *
 * Example: a bonus against a burning enemy.
 * new ConditionEnemy({
 *     condition: new ConditionBoolean({name: 'enemy_burning'}),
 * })
 */
export class ConditionEnemy extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        return this.params.condition.isActive(enemyScope(settings));
    }
}
