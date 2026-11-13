import { teamState } from "../Team/Scope";

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
 * Every member's own toggle counts (see TeamState).
 * @param {Object} settings - Build settings
 * @returns {number}
 */
export function countHexereiInParty(settings) {
    const team = teamState(settings);
    if (team) {
        return team.countHexerei();
    }

    return isMainCharHexerei(settings) ? 1 : 0;
}
