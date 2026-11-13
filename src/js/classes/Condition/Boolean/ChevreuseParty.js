import { teamElements } from "../../Team/Party";
import { assumed } from "../../Team/Scope";
import { ConditionBoolean } from "../Boolean";

export class ConditionBooleanChevreuseParty extends ConditionBoolean {
    isActive(settings) {
        let result = this.checkSubconditions(settings);
        if (!result) {
            return false;
        }

        // A virtual character outside the party's composition: its own party
        // restriction is taken as met (Team/Scope.assumed).
        if (assumed(settings, 'composition')) {
            return true;
        }

        let hasHydro = false;
        let hasPyro = false;
        let hasOther = false;

        for (const element of teamElements(settings)) {
            if (element == 'pyro') {
                hasPyro = true;
            } else if (element == 'electro') {
                hasHydro = true;
            } else {
                hasOther = true;
            }
        }

        return hasHydro && hasPyro && !hasOther;
    }
}
