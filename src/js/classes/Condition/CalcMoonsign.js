import { Stats } from "../Stats";
import { Condition } from "../Condition";
import { partyView } from "../Team/Party";

export class ConditionCalcMoonsign extends Condition {
    getData(settings) {
        let moonsign_count = 0;

        if (this.isActive(settings) && settings && settings.char_id) {
            let view = partyView(settings);
            for (const member of [view.self, ...view.others]) {
                if (member.origin === 'nodkrai') {
                    ++moonsign_count;
                }
            }
        }

        // Moonsign level: 0 = none, 1 = Nascent Gleam (1 char), 2 = Ascendant Gleam (2+ chars)
        let moonsign_level = moonsign_count >= 2 ? 2 : moonsign_count;

        return {
            settings: {
                party_moonsign_count: moonsign_count,
                party_moonsign: moonsign_level,
            },
            stats: new Stats(),
        };
    }

    getAllConditionsOn(settings) {
        return this.getData(settings || {}).settings;
    }

    getStats(settings) {
        return new Stats();
    }
}
