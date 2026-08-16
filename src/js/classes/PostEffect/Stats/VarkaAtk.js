import { StatTable } from "../../StatTable";
import { PostEffectStatsAtk } from "./Atk";

export class PostEffectStatsVarkaAtk extends PostEffectStatsAtk {
    getPercents(data) {
        let element = data.settings.party_varka_priority_element_str;
        let percents = [];
        if (element && element !== '') {
            percents.push(new StatTable('dmg_anemo', [0.01]));
            percents.push(new StatTable('dmg_' + element, [0.01]));
        }
        return percents;
    }
}
