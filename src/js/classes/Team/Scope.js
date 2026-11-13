/**
 * Evaluation scopes of a condition.
 *
 * A condition is evaluated for one delivery, from a source member to a
 * receiver member. The settings object it is given is the source scope: the
 * source member's own settings, so plain `settings[name]` reads keep meaning
 * "the owner's setting". The other two scopes are attached to that object
 * under symbol keys:
 * - RECEIVER: the receiving member's settings (element, weapon type, state),
 * - TEAM: the team state (composition and team toggles), see TeamState.
 *
 * Symbol keys are copied by Object.assign (so BuildSettings copies keep
 * them) and are invisible to Object.keys, for...in and JSON, so they never
 * leak into serialization or settings diffs.
 */
export const RECEIVER = Symbol('receiver');
export const TEAM = Symbol('team');
/**
 * On a receiver's final settings: the source scope of every teammate that
 * delivers features to it, by the teammate's character ID. A delivered
 * feature is compiled with the receiver's data and finds its source here.
 */
export const SOURCES = Symbol('sources');
/**
 * On the settings a member's program builds its trees with (its own, and the
 * scopes of the teammates' effects it receives): the members of that
 * program, `{members()}` returning `[{slot, charId, prefix, stats}]` with
 * each member's stat prefix in that program and its stage 0 processed stats.
 * Trees that read a stat on every member (the team's highest Elemental
 * Mastery) use it, see Team/TeamStats and MemberEvaluation.withProgram.
 */
export const PROGRAM = Symbol('program');
/**
 * On the settings of a legacy source (Team/Legacy): what is taken as met
 * about a source that has no build and no place in the team, `{wielder,
 * element, field, composition}`. See assumed().
 */
export const ASSUMED = Symbol('assumed');

/**
 * Whether a check of the source's own state is taken as met instead of read.
 * A legacy source's controls mean "this effect applies", as the released
 * party rows did:
 * - `wielder`: a floating weapon or set has no wielder, so its checks of the
 *   wielder's state (Nightsoul, Witch's Homework) are met;
 * - `element`: and so are its checks of the wielder's element, unless the
 *   entry states one;
 * - `field`: a virtual character is never a member on field, so its own
 *   field state gates ("while Kaveh is on field") are met;
 * - `composition`: a virtual character that fills no slot is not part of the
 *   party, so the party restrictions of its own effects are met.
 *
 * Only the source's own scope carries it: a check wrapped in
 * ConditionReceiver reads the receiving member as always.
 *
 * @param {Object} settings source scope
 * @param {string} what
 * @returns {boolean}
 */
export function assumed(settings, what) {
    let data = settings ? settings[ASSUMED] : undefined;
    return !!(data && data[what]);
}

/**
 * Settings of the member receiving the effect. Without an explicit receiver
 * the source receives its own effect.
 *
 * @param {Object} settings source scope
 * @returns {Object}
 */
export function receiverSettings(settings) {
    return (settings && settings[RECEIVER]) || settings;
}

/**
 * @param {Object} settings source scope
 * @returns {TeamState|undefined}
 */
export function teamState(settings) {
    return settings ? settings[TEAM] : undefined;
}

/**
 * The team's own settings as the evaluation resolved them: its toggles
 * (Team/Settings: Polestar, the on-field shield, the Ascendant Gleam source,
 * ...), what the composition gives (party size, Moonsign) and what the
 * party's conditions derive (TeamEvaluation.resolveParty). Members read team
 * state here; their own settings never hold a copy of it.
 *
 * Settings with no team attached (a condition shown outside an evaluation)
 * are their own team scope.
 *
 * @param {Object} settings any scope of an evaluation
 * @returns {Object}
 */
export function teamSettings(settings) {
    let state = teamState(settings);
    return (state && (state.party || state.settings)) || settings;
}

/**
 * The team's enemy as the evaluation resolved it: its level, resistances,
 * type and the state of its conditions (see TeamEvaluation.resolveEnemy).
 * The enemy is one for the whole team; members read it, never copy it.
 *
 * Settings with no team attached (a condition shown outside an evaluation,
 * or the enemy's own settings) are their own enemy scope.
 *
 * @param {Object} settings any scope of an evaluation
 * @returns {Object}
 */
export function enemyScope(settings) {
    let state = teamState(settings);
    return (state && state.enemy) || settings;
}

/**
 * @param {Object} settings receiver's final settings
 * @param {number} sourceId character ID of the delivering teammate
 * @returns {Object|undefined} source scope of that teammate's deliveries
 */
export function sourceScope(settings, sourceId) {
    let sources = settings ? settings[SOURCES] : undefined;
    return sources ? sources[sourceId] : undefined;
}

/**
 * Attach scopes to a settings object in place.
 *
 * A member receiving its own effect has no RECEIVER entry: the settings are
 * both scopes, and copies of them stay self-consistent.
 *
 * @param {Object} settings source scope
 * @param {Object|null} receiver receiver settings, or null for the source itself
 * @param {TeamState} team
 * @returns {Object} settings
 */
export function attachScopes(settings, receiver, team) {
    if (receiver && receiver !== settings) {
        settings[RECEIVER] = receiver;
    } else {
        delete settings[RECEIVER];
    }
    settings[TEAM] = team;
    return settings;
}
