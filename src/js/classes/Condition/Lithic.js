import { Condition } from "../Condition";
import { Stats } from "../Stats";
import { partyView } from "../Team/Party";

export class ConditionLithic extends Condition {
    getType() {
        return '';
    }

    getData(settings) {
        let view = partyView(settings);
        let stacks = [view.self, ...view.others].filter((member) => member.origin == 'liyue').length;

        return {
            settings: {weapon_lithic_stacks: stacks},
            stats: new Stats({}),
        };
    }
}
