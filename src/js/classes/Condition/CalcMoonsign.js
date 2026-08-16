import { Stats } from "../Stats";
import { Condition } from "../Condition";

export class ConditionCalcMoonsign extends Condition {
    getData(settings) {
        let moonsign_count = 0;

        if (this.isActive(settings) && settings && settings.char_id) {
            // Check current character
            let mainChar = DB.Chars.getById(settings.char_id);
            if (mainChar && mainChar.getOrigin() === 'nodkrai') {
                ++moonsign_count;
            }

            // Check party characters
            for (const name of ['party_char_1', 'party_char_2', 'party_char_3']) {
                const char_id = settings[name] || '';
                if (!char_id) continue;

                let char = DB.Chars.getById(char_id);
                if (!char) continue;

                if (char.getOrigin() === 'nodkrai') {
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
