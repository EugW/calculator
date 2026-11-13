import { Team } from "../../src/js/classes/Team";
import { buildAllOnSettings, makeBaseBuild, makeSetArtifacts } from "./baseline";

/**
 * Support of the settle suites (teamSettleOwn, teamSettlePairs*,
 * teamSettleItems): members of the database with their controls on, and the
 * two states a team's result is compared with.
 */

const TOLERANCE = 1e-9;

/**
 * Teams of two, each checked as the settle suites check a team: it settles
 * (TeamEvaluation.isSettled), and no member kept something from an early
 * round (keptFromEarlyRounds). The members are builds on their own and are
 * left so.
 *
 * @param {Array.<Array>} pairs [label, first member, second member] each
 * @returns {{teams: number, unsettled: Array.<string>, kept: Object.<string, Array.<string>>}}
 *     the teams checked, the labels of those that did not settle, and what a
 *     member kept, by label and member
 */
export function checkPairs(pairs) {
    const unsettled = [];
    const kept = {};
    let teams = 0;

    for (const [label, first, second] of pairs) {
        const team = Team.fromMember(first);
        team.setMember(1, second);
        try {
            const evaluation = team.evaluate();
            ++teams;
            if (!evaluation.isSettled()) {
                // It kept its last round: there is no settled state to compare.
                unsettled.push(label);
                continue;
            }
            for (const member of [first, second]) {
                const names = keptFromEarlyRounds(evaluation, member);
                if (names.length) kept[`${label}: ${member.char.get().name}`] = names;
            }
        } finally {
            // The same builds are members of the next pairs.
            team.removeMember(1);
            team.removeMember(0);
        }
    }

    return {teams, unsettled, kept};
}

/**
 * A character at level 90 with its own controls on, as the recorded solo
 * scenarios set them (support/baseline.buildAllOnSettings).
 *
 * @param {string} charKey
 * @param {Object} [opts] {constellation: 6 by default, weapon: a weapon
 *     instead of the character's fixed one, at refinement 5, set: an artifact
 *     set to wear, controls: false leaves every control as a new build has it}
 * @returns {CalcSet} a build on its own
 */
export function allOnMember(charKey, opts = {}) {
    const build = makeBaseBuild(charKey, opts.constellation ?? 6);
    if (opts.weapon) {
        build.setWeapon(opts.weapon);
        build.setWeaponLevels({level: 90, ascension: 6, refine: 5});
    }
    if (opts.set) {
        // A set's controls are on unless changed (ArtifactSetProfile).
        build.replaceArtifacts(makeSetArtifacts(opts.set));
    }
    if (opts.controls !== false) {
        build.setCharSettings(buildAllOnSettings(build.getConditions({objects: ['char']}), build.getSettings()));
        build.setWeaponSettings(buildAllOnSettings(build.getConditions({objects: ['weapon']}), build.getSettings()));
    }
    return build;
}

/**
 * @param {Object} a settings or stats
 * @param {Object} b
 * @returns {Array.<string>} the names whose values differ, sorted
 */
export function differences(a, b) {
    const result = [];
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const x = a[name];
        const y = b[name];
        if (Object.is(x, y) || JSON.stringify(x) === JSON.stringify(y)) continue;
        if (typeof x == 'number' && typeof y == 'number' && Math.abs(x - y) <= TOLERANCE) continue;
        result.push(name);
    }
    return result.sort();
}

/**
 * What a member's settled state has that one pass over its conditions in
 * order does not (TeamEvaluation.resolveAlone): a condition that reads what
 * a later condition of the member derives. Teammates' deliveries are not
 * part of either.
 *
 * @param {CalcSet} member a member nobody delivers to
 * @returns {Array.<string>} the settings and stage 0 stats that differ
 */
export function orderDependent(member) {
    const evaluation = member.team.evaluate();
    const settled = evaluation.resolveFull(member);
    const once = evaluation.resolve(member);
    return differences(once.settings, settled.settings).concat(differences(once.stats, settled.stats));
}

/**
 * What a member's state in a team's evaluation has that the same member
 * resolved again does not: from its own inputs, in the rounds of
 * TeamEvaluation.resolveSettings, with every other source at its final
 * settings. A difference is something the member kept from an early round
 * after its cause was gone: an inactive condition gives no settings back, so
 * nothing removes a setting a round derived.
 *
 * @param {TeamEvaluation} evaluation
 * @param {CalcSet} member
 * @returns {Array.<string>} the settings and stage 0 stats that differ
 */
export function keptFromEarlyRounds(evaluation, member) {
    const final = (source) => evaluation.resolveFull(source).settings;
    let previous = evaluation.resolve(member, final);
    for (let round = 2; round <= 10; ++round) {
        const current = evaluation.resolve(member, final, previous.settings);
        const settled = differences(current.settings, previous.settings).length == 0;
        previous = current;
        if (settled) break;
    }

    const full = evaluation.resolveFull(member);
    return differences(full.settings, previous.settings).concat(differences(full.stats, previous.stats));
}
