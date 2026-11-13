import { teamSize } from "../../Team/Party";
import { teamSettings } from "../../Team/Scope";
import { ConditionBoolean } from "../Boolean";

export class ConditionBooleanResonanceEnabled extends ConditionBoolean {
    getType() {
        return '';
    }

    isActive(settings) {
        let result = true;
        if (teamSettings(settings)['buffs.only_full_party_resonance'] && teamSize(settings) < 4) {
            result = false;
        }
        return this.params.invert ? !result : result;
    }
}
