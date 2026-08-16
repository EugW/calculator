import { Stats } from "../../Stats";
import { ConditionBoolean } from "../Boolean";

export class ConditionBooleanZibaiC2 extends ConditionBoolean {
    getData(settings) {
        let result = super.getData(settings);

        let moonsign = parseInt(settings.party_moonsign || 0);
        if (moonsign >= 2 && this.params.baseStats) {
            result.stats.concat(this.params.baseStats);
        }

        return result;
    }
}
