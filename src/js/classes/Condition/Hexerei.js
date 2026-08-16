/**
 * Shared utilities for Hexerei-related conditions.
 * Hexerei characters are those with the "Witch's Homework" passive.
 */

// List of Hexerei-capable characters (those with Witch's Homework passive)
export const HEXEREI_CAPABLE_CHARS = [
    'durin', 'venti', 'albedo', 'mona', 'klee', 'sucrose', 'razor', 'fischl', 'varka',
    'lohen', 'nicole', 'prune',
];

/**
 * Checks if the main character has Witch's Homework enabled.
 * @param {Object} settings - Build settings
 * @returns {boolean}
 */
export function isMainCharHexerei(settings) {
    const charName = settings?.char_name;
    if (!charName || !HEXEREI_CAPABLE_CHARS.includes(charName)) {
        return false;
    }
    return !!settings[charName + '_witch_homework'];
}

/**
 * Counts how many characters in the party have Witch's Homework enabled.
 * Includes both main character and party members.
 * @param {Object} settings - Build settings
 * @returns {number}
 */
export function countHexereiInParty(settings) {
    let count = 0;

    // Check main character
    if (isMainCharHexerei(settings)) {
        ++count;
    }

    // Check party characters
    for (let i = 1; i <= 3; ++i) {
        const charId = settings['party_char_' + i];
        if (!charId) continue;

        const char = DB.Chars.getById(charId);
        if (!char) continue;

        const partyCharName = char.name;
        if (HEXEREI_CAPABLE_CHARS.includes(partyCharName)) {
            const partyWitchHomeworkSetting = 'party.' + partyCharName + '_witch_homework';
            if (settings[partyWitchHomeworkSetting]) {
                ++count;
            }
        }
    }

    return count;
}
