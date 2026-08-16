import { Condition } from "../Condition";
import { countHexereiInParty } from "./Hexerei";

/**
 * Condition that checks if Hexerei resonance is active (2+ characters with Witch's Homework enabled).
 * Checks the actual witch homework toggle settings for main character and party members.
 */
export class ConditionHexereiResonance extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        let result = super.isActive(settings);
        if (!result) {
            return false;
        }

        // Hexerei resonance: active when 2+ characters have Witch's Homework enabled
        result = countHexereiInParty(settings) >= 2;

        return this.params.invert ? !result : result;
    }
}
