/**
 * Checks for content converted from the old party model to delivered effects.
 *
 * A recorded scenario (test/baseline, recorded by the engine before the team
 * refactor) gave the receiver a party buff through typed-in settings. The
 * converted form is a real team with a carrier teammate.
 *
 * Items (buffs.json: party weapons and sets): any suitable character carries
 * the item. The check compares
 * - stat changes: (team with the effect on) - (same team with it off)
 *   against (recorded scenario) - (recorded receiver without party), so the
 *   carrier's unrelated contributions cancel out;
 * - features: the receiver's features with the effect on against the
 *   recorded ones, after checking that the carrier alone leaves the
 *   receiver's features unchanged.
 *
 * Characters (party.json): the carrier is the party character itself, whose
 * presence (resonance, energy cost) is part of the recording. The check
 * compares the receiver's stats and features with the recorded ones
 * directly, except the old model's typed-in input stats (`ignoreStats`).
 */
import { setControlsOff } from "../../src/js/classes/ArtifactSetProfile";
import { isExtraStat } from "../../src/js/classes/PostEffect/Channels";
import { CalcObjectStatic } from "../../src/js/classes/CalcObject/Static";
import { Condition } from "../../src/js/classes/Condition";
import { LEGACY_PARTY_DATA } from "../../src/js/classes/Legacy/PartyData";
import { loadLegacyTeam } from "../../src/js/classes/Legacy/Team";
import { Team } from "../../src/js/classes/Team";
import { VirtualCharacter } from "../../src/js/classes/Team/Legacy";
import { isTeamSetting } from "../../src/js/classes/Team/Settings";
import {
    compareScenario,
    computeScenarioResults,
    excludedPostEffect,
    getCharKeys,
    loadRecorded,
    makeBaseBuild,
    makeSetArtifacts,
    numbersClose,
    ZERO_THRESHOLD,
} from "./baseline";

const recordedCache = {};

export function recorded(fileName) {
    recordedCache[fileName] ||= loadRecorded(fileName);
    if (!recordedCache[fileName]) {
        throw new Error('Missing test/baseline/' + fileName);
    }
    return recordedCache[fileName];
}

// Base stats cannot be changed through custom buffs; tests set them with a
// test-only stage 0 condition on the carrier.
const BASE_STATS = ['atk_base', 'hp_base', 'def_base'];

const FLAT_FOR_TOTAL = {
    hp_total: 'hp',
    atk_total: 'atk',
    def_total: 'def',
    mastery_total: 'mastery',
    crit_rate_total: 'crit_rate',
};

function totalOf(stats, total) {
    let stat = total.replace(/_total$/, '');
    if (stat == 'mastery') {
        return stats.get('mastery_base') + stats.get('mastery');
    }
    if (stat == 'crit_rate') {
        return (stats.get('crit_rate_base') + stats.get('crit_rate')) * 100;
    }
    return stats.getTotalPercent(stat);
}

function finalStats(build, excludePostEffects) {
    let data = build.getBuildData();
    let excluded = excludedPostEffect(excludePostEffects);
    data.postEffects = data.postEffects.filter((effect) => !excluded(effect));
    data.applyPostEffects();
    return data.stats;
}

/**
 * Give the carrier exact totals (for example the holder HP a buff scales on)
 * through its custom buffs, as the old model's typed-in value did.
 *
 * @param {CalcSet} carrier
 * @param {Object} totals {hp_total: 30000, ...}
 * @param {Array|Function} [excludePostEffects] see computeScenarioResults
 * @returns {Object} the custom buff settings given to the carrier
 */
export function matchCarrierTotals(carrier, totals, excludePostEffects) {
    let custom = {};
    if (!totals) {
        return custom;
    }

    let base = {};
    for (let [stat, target] of Object.entries(totals)) {
        if (BASE_STATS.includes(stat)) {
            base[stat] = target - carrier.getBuildData().stats.get(stat);
        }
    }
    if (Object.keys(base).length) {
        carrier.static = new TestBaseStats(base);
    }

    for (let [total, target] of Object.entries(totals)) {
        if (BASE_STATS.includes(total)) continue;
        let flat = FLAT_FOR_TOTAL[total];
        if (!flat) {
            throw new Error('Cannot match carrier total ' + total);
        }
        carrier.modifyBuffsSettings({['custom_buffs.' + flat]: 0});
        let current = totalOf(finalStats(carrier, excludePostEffects), total);
        custom['custom_buffs.' + flat] = target - current;
    }
    if (Object.keys(custom).length) {
        carrier.modifyBuffsSettings(custom);
    }
    return custom;
}

/**
 * Whether a stat is compared. Teammates' stats (prefixed with their slot in
 * the receiver's program) are not part of a recorded receiver, and `text_*`
 * stats only fill in description texts: the old party rows added them to the
 * receiver, the converted effects show them on their source.
 */
function isCompared(key, ignore) {
    return key !== 'party_burst_energy_cost' && !/^m\d+__/.test(key) && !/^text_/.test(key) && !isExtraStat(key) && !(ignore || []).includes(key);
}

/**
 * The carrier's `static` object with extra base stats, for tests only.
 */
class TestBaseStats extends CalcObjectStatic {
    constructor(stats) {
        super();
        this.condition = new Condition({stats: stats});
    }

    getConditions() {
        return [this.condition];
    }
}

function statDelta(on, off, ignore) {
    let result = {};
    for (let key of new Set([...Object.keys(on), ...Object.keys(off)])) {
        if (!isCompared(key, ignore)) continue;
        let value = (on[key] || 0) - (off[key] || 0);
        if (Math.abs(value) >= ZERO_THRESHOLD) {
            result[key] = value;
        }
    }
    return result;
}

function compareStats(id, actual, expected, ignore) {
    let mismatches = [];
    for (let key of new Set([...Object.keys(actual), ...Object.keys(expected)])) {
        if (!isCompared(key, ignore)) continue;
        let a = actual[key] || 0;
        let e = expected[key] || 0;
        if (!numbersClose(a, e)) {
            mismatches.push(id + ' | stat ' + key + ' expected=' + e + ' actual=' + a);
        }
    }
    return mismatches;
}

function compareDeltas(id, actual, expected) {
    let mismatches = [];
    for (let key of new Set([...Object.keys(actual), ...Object.keys(expected)])) {
        let a = actual[key] || 0;
        let e = expected[key] || 0;
        if (!numbersClose(a, e)) {
            mismatches.push(id + ' | stat change ' + key + ' expected=' + e + ' actual=' + a);
        }
    }
    return mismatches;
}

function featuresEqual(id, actual, expected) {
    return compareScenario(id, {stats: {}, features: actual}, {stats: {}, features: expected});
}

/**
 * Candidate carriers, in registry order: characters that can hold the item
 * and pass the item's own requirement (`filter`, for example an Anemo
 * wearer for Viridescent Venerer). Characters of the receiver's element come
 * last, since a shared element can start a resonance.
 */
function carrierCandidates(receiverKey, weaponType, filter) {
    let receiver = DB.Chars.get(receiverKey);
    let keys = getCharKeys().filter((key) => {
        let char = DB.Chars.get(key);
        return key != receiverKey &&
            (!weaponType || char.weapon == weaponType) &&
            (!filter || filter(char));
    });
    let sameElement = (key) => DB.Chars.get(key).element == receiver.element;
    return keys.filter((key) => !sameElement(key)).concat(keys.filter(sameElement));
}

/**
 * Check one recorded scenario against its converted team form.
 *
 * @param {Object} opts
 * @param {string} opts.file recorded file ('buffs.json' or 'party.json')
 * @param {string} opts.scenario scenario id in that file
 * @param {string} [opts.weaponType] weapon type the carrier needs
 * @param {string} [opts.carrier] carrier character key, instead of choosing one
 * @param {function(DbObjectChar): boolean} [opts.carrierFilter] requirement on the carrier
 * @param {function(CalcSet)} opts.equip give the carrier the item, effect off
 * @param {function(CalcSet)} opts.switchOn switch the carrier's effect on
 * @param {Object} [opts.carrierTotals] exact carrier totals, see matchCarrierTotals
 * @param {number} [opts.constellation] carrier constellation
 * @param {Array.<string>} [opts.ignoreStats] the old model's typed-in input stats
 * @param {Object} [opts.expectedFeatures] an explicit recorded reference for a character's game-text correction
 * @param {Array|Function} [opts.excludePostEffects] post-effects the recording had at zero because of an old bug
 * @param {Array.<Object>} [opts.corrections] {scenarios, stats, featureFactors}:
 *     recorded values a later model change corrects, derived from the recording
 *     and the game formula (test/support/buffChains.js)
 * @param {boolean|string} [opts.virtual] party.json only: the character as a
 *     virtual character of the team's legacy source instead of a carrier
 *     teammate; 'link' for the one the link importer makes of the recorded
 *     row (Legacy/Team.loadLegacyTeam) instead of one set up by the test
 * @param {Object} [opts.stated] stats the virtual character states besides
 *     its carrierTotals, by kind (Team/Overrides)
 * @returns {{carrier: string, mismatches: Array.<string>}}
 */
export function checkConversion(opts) {
    let scenario = recorded(opts.file).scenarios[opts.scenario];
    if (!scenario) {
        throw new Error('No recorded scenario ' + opts.scenario);
    }
    scenario = correctedScenario(scenario, opts.scenario, opts.corrections);
    let receiverKey = scenario.inputs.receiver;
    let none = recorded('party.json').scenarios[receiverKey + '__none'];

    let candidates = opts.carrier ? [opts.carrier] : carrierCandidates(receiverKey, opts.weaponType, opts.carrierFilter);
    let rejected = [];

    if (opts.file == 'party.json') {
        return checkMember(opts, scenario);
    }

    for (let carrierKey of candidates) {
        let build = (on) => {
            let receiver = makeBaseBuild(receiverKey, 0);
            let carrier = makeBaseBuild(carrierKey, opts.constellation || 0);
            opts.equip(carrier);

            let team = Team.fromMember(receiver);
            team.setMember(1, carrier);
            if (on) {
                opts.switchOn(carrier, receiver);
            }
            return {receiver, carrier};
        };

        // The typed-in value of the old model was the teammate's stat while
        // its effect was on, so totals are matched in that state; the team
        // with the effect off gets the same custom buffs.
        let teamOn = build(true);
        let custom = matchCarrierTotals(teamOn.carrier, opts.carrierTotals);
        let teamOff = build(false);
        if (Object.keys(custom).length) {
            teamOff.carrier.modifyBuffsSettings(custom);
        }

        let off = computeScenarioResults(teamOff.receiver);
        let neutral = featuresEqual(opts.scenario + ' (carrier ' + carrierKey + ', effect off)', off.features, none.features);
        if (neutral.length) {
            rejected.push(carrierKey);
            continue;
        }

        let on = computeScenarioResults(teamOn.receiver);

        let mismatches = compareDeltas(
            opts.scenario,
            statDelta(on.stats, off.stats, opts.ignoreStats),
            statDelta(scenario.stats, none.stats, opts.ignoreStats),
        );
        mismatches = mismatches.concat(featuresEqual(opts.scenario, on.features, scenario.features));

        return {carrier: carrierKey, mismatches: mismatches};
    }

    throw new Error('No neutral carrier for ' + opts.scenario + '; rejected: ' + rejected.join(', '));
}

/**
 * Check one recorded party buff scenario with the item as a floating entry
 * of the team's legacy source (Team/Legacy) instead of on a carrier
 * teammate: the receiver alone, then with the entry. There is no carrier
 * whose own contributions could differ, so the receiver alone must equal the
 * recorded receiver without a party.
 *
 * @param {Object} opts
 * @param {string} opts.scenario scenario id in buffs.json
 * @param {function(Team, CalcSet)} opts.add add the entry, switched on
 * @param {Array.<string>} [opts.ignoreStats] the old model's typed-in input stats
 * @param {Array.<Object>} [opts.corrections] as checkConversion
 * @returns {{mismatches: Array.<string>}}
 */
export function checkFloating(opts) {
    let scenario = recorded('buffs.json').scenarios[opts.scenario];
    if (!scenario) {
        throw new Error('No recorded scenario ' + opts.scenario);
    }
    scenario = correctedScenario(scenario, opts.scenario, opts.corrections);
    let receiverKey = scenario.inputs.receiver;
    let none = recorded('party.json').scenarios[receiverKey + '__none'];

    let receiver = makeBaseBuild(receiverKey, 0);
    let team = Team.fromMember(receiver);
    let off = computeScenarioResults(receiver);
    let mismatches = featuresEqual(opts.scenario + ' (no entry)', off.features, none.features);

    opts.add(team, receiver);
    let on = computeScenarioResults(receiver);
    mismatches = mismatches.concat(compareDeltas(
        opts.scenario,
        statDelta(on.stats, off.stats, opts.ignoreStats),
        statDelta(scenario.stats, none.stats, opts.ignoreStats),
    ));
    return {mismatches: mismatches.concat(featuresEqual(opts.scenario, on.features, scenario.features))};
}

function correctedScenario(scenario, id, corrections) {
    for (const entry of corrections || []) {
        if (!entry.scenarios.includes(id)) continue;
        const features = Object.assign({}, scenario.features);
        for (const [name, factor] of Object.entries(entry.featureFactors || {})) {
            if (!features[name]) throw new Error('No recorded feature ' + name + ' in ' + id);
            features[name] = Object.fromEntries(Object.entries(features[name]).map(([field, value]) => {
                return [field, value === null ? null : value * factor];
            }));
        }
        scenario = Object.assign({}, scenario, {
            stats: Object.assign({}, scenario.stats, entry.stats || {}),
            features,
        });
    }
    return scenario;
}

/** A recorded typed-in stat as the kind a legacy entry states (Team/Overrides). */
const STATED_KINDS = {
    atk_base: 'atk_base',
    hp_base: 'hp_base',
    def_base: 'def_base',
    atk_total: 'atk',
    hp_total: 'hp',
    def_total: 'def',
    mastery_total: 'mastery',
    crit_rate_total: 'crit_rate',
};

/**
 * @param {Object} totals a row's carrierTotals
 * @returns {Object} the same values as stated stats of a legacy entry
 */
export function statedFromTotals(totals) {
    return Object.fromEntries(Object.entries(totals || {}).map(([total, value]) => {
        if (!STATED_KINDS[total]) throw new Error('Cannot state ' + total);
        return [STATED_KINDS[total], value];
    }));
}

/**
 * A recorded party scenario as a released link holds it (format 1, decoded:
 * CalcObjectBuffs.deserialize): the party row's controls by their old names,
 * the team toggles, and the rest of the old tab's rows.
 *
 * @param {Object} inputs a recorded scenario's inputs
 * @param {string} charKey the party row's character
 * @returns {Object} {party, buffs, settings, dropped}
 */
export function legacyContext(inputs, charKey) {
    const charId = DB.Chars.get(charKey).getId();
    const names = new Set((LEGACY_PARTY_DATA[charId] || []).map(([, , name]) => name));
    const context = {party: [{charId, settings: {}}], buffs: {}, settings: {}, dropped: []};
    for (const [name, value] of Object.entries(inputs.buffsSettings || {})) {
        if (names.has(name)) {
            context.party[0].settings[name] = value;
        } else if (isTeamSetting(name)) {
            context.settings[name] = value;
        } else {
            context.buffs[name] = value;
        }
    }
    return context;
}

function checkMember(opts, scenario) {
    let receiver = makeBaseBuild(scenario.inputs.receiver, 0);
    let team = Team.fromMember(receiver);
    let carrier;
    let report;

    if (opts.virtual == 'link') {
        // The party row as a released link loads it: nothing is set by hand.
        report = loadLegacyTeam(team, legacyContext(scenario.inputs, opts.carrier));
        carrier = team.legacy.getBySourceId(DB.Chars.get(opts.carrier).getId());
    } else if (opts.virtual) {
        // The party row as it was: the character with its constellation,
        // talent levels, controls and typed stats, and no build.
        carrier = team.addLegacy(new VirtualCharacter(DB.Chars.get(opts.carrier)));
        carrier.setConstellation(opts.constellation || 0);
        carrier.setSkills({attack: 10, elemental: 10, burst: 10});
        opts.switchOn(carrier, receiver);
        for (const [kind, value] of Object.entries(Object.assign(statedFromTotals(opts.carrierTotals), opts.stated))) {
            carrier.setStated(kind, value);
        }
    } else {
        carrier = makeBaseBuild(opts.carrier, opts.constellation || 0);
        opts.equip(carrier);
        team.setMember(1, carrier);
        opts.switchOn(carrier, receiver);
        matchCarrierTotals(carrier, opts.carrierTotals, opts.excludePostEffects);
    }

    let on = computeScenarioResults(receiver, {excludePostEffects: opts.excludePostEffects});
    let mismatches = compareStats(opts.scenario, on.stats, scenario.stats, opts.ignoreStats);
    mismatches = mismatches.concat(featuresEqual(opts.scenario, on.features, opts.expectedFeatures || scenario.features));

    return {carrier: opts.carrier, receiver: receiver, mismatches: mismatches, entry: carrier, report: report};
}

/**
 * Receivers recorded in a file for a buff condition name.
 *
 * @param {string} conditionName
 * @returns {Array.<string>} scenario ids
 */
export function buffScenarios(conditionName) {
    return Object.keys(recorded('buffs.json').scenarios).filter((id) => {
        return id.split('::')[1] == conditionName;
    });
}

/**
 * @param {string} weaponKey key in DB.Weapons.get(type)
 * @param {string} type weapon type
 * @param {number} refine
 * @returns {function(CalcSet)}
 */
export function equipWeapon(type, weaponKey, refine) {
    return (carrier) => {
        let weapon = DB.Weapons.get(type).get(weaponKey);
        if (!weapon) {
            throw new Error('No weapon ' + type + '/' + weaponKey);
        }
        carrier.setWeapon(weapon);
        carrier.setWeaponLevels({level: 90, ascension: 6, refine: refine});
    };
}

/**
 * @param {string} setId
 * @param {number} pieces
 * @returns {function(CalcSet)}
 */
export function equipSet(setId, pieces) {
    return (carrier) => {
        carrier.replaceArtifacts(makeSetArtifacts(setId).slice(0, pieces));
        // Its effects off: a profile starts with every control on.
        carrier.setArtifactsSettings(setControlsOff(setId));
    };
}
