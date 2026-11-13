import { teamElements } from "../../Team/Party";
import { assumed } from "../../Team/Scope";
import { ConditionBoolean } from "../Boolean";

export class ConditionBooleanNilouParty extends ConditionBoolean {
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
        let hasDendro = false;
        let hasOther = false;

        for (const element of teamElements(settings)) {
            if (element == 'dendro') {
                hasDendro = true;
            } else if (element == 'hydro') {
                hasHydro = true;
            } else {
                hasOther = true;
            }
        }

        return hasHydro && hasDendro && !hasOther;
    }
}
