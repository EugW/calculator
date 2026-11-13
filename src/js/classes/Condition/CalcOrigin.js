import { Stats } from "../Stats";
import { Condition } from "../Condition";
import { partyView } from "../Team/Party";

export class ConditionCalcOrigin extends Condition {
    getData(settings) {
        let same_origin = 0;
        let other_origin = 0;

        if (this.isActive(settings) && settings && settings.char_id) {
            let view = partyView(settings);
            let origin = view.self.origin;

            for (const char of view.others) {
                if (origin == char.origin) {
                    ++same_origin;
                } else {
                    ++other_origin;
                }
            }
        }

        return {
            settings: {
                party_origin_same: same_origin,
                party_origin_same_inc: same_origin + 1,
                party_origin_different: other_origin,
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
