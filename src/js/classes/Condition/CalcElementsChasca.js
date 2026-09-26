import { Stats } from "../Stats";
import { Condition } from "../Condition";

export class ConditionCalcElementsChasca extends Condition {
    getData(settings) {
        let elements = {};
        if (this.isActive(settings)) {
            for (const name of ['resonance_element_1', 'resonance_element_2', 'resonance_element_3']) {
                const element = settings[name] || '';
                if (!element) continue;

                if (['pyro', 'hydro', 'electro', 'cryo'].includes(element)) {
                    elements[element] = 1;
                }
            }
        }

        let stacks = Object.keys(elements).length;

        // C2: When Chasca takes the field, she obtains 1 stack of
        // "Spirit of the Radiant Shadow" for free (requires A1 unlocked).
        // So 2 different PHEC elements already reach max (3 stacks -> 65%).
        if (((settings && settings.char_constellation) || 0) >= 2) {
            stacks += 1;
        }

        if (stacks > 3) {
            stacks = 3;
        }

        let stats = new Stats();

        if (stacks > 0) {
            stats.add(this.params.bonuses.getName(), this.params.bonuses.getValue(stacks));
        }

        return {
            stats: stats,
        };
    }

    getStats(settings) {
        return new Stats();
    }
}
