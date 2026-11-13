import { Condition } from "../Condition";
import { receiverSettings } from "../Team/Scope";

/** Compare the source's selected member with this delivery's recipient. */
export class ConditionSelectedReceiver extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        const selected = Number(settings[this.params.name]);
        return selected > 0 && selected === Number(receiverSettings(settings).char_id);
    }
}
