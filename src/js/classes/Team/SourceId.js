/**
 * Numbers that identify the sources of effects in a team (stack choices,
 * condition values per receiver, rotation steps): a member and a virtual
 * character by their character's ID, a floating weapon or set of the legacy
 * source (Team/Legacy) by FLOATING_ID_BASE plus its number there.
 */

/** Source IDs of floating entries start here: above every character ID. */
export const FLOATING_ID_BASE = 100000;

/**
 * @param {number} sourceId
 * @returns {boolean} whether it names a floating entry of a legacy source
 */
export function isFloatingId(sourceId) {
    return Number.isInteger(sourceId) && sourceId > FLOATING_ID_BASE;
}
