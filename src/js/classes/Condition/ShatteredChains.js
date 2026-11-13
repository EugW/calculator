import { Condition } from "../Condition";
import { Stats } from "../Stats";
import { partyView } from "../Team/Party";

export class ConditionShatteredChains extends Condition {
    getType() {
        return '';
    }

    getData(settings) {
        let view = partyView(settings);
        let stacks = 0;
        if (view.self.origin == 'natlan') {
            ++stacks;
        }

        for (const char of view.others) {
            if (char.origin == 'natlan') {
                ++stacks;
            } else if (char.element != view.self.element) {
                ++stacks;
            }
        }

        return {
            settings: {weapon_shattered_chains_stacks: stacks},
            stats: new Stats({weapon_shattered_chains_stacks: stacks}),
        };
    }
}
