import { controlDefault, isProfileControl } from "./ArtifactSetProfile";
import { FeatureRotation } from "./Feature2/Rotation";
import { isTeamHit } from "./Feature2/Rotation/Tree";
import { Rotation } from "./Rotation";
import { isEnemySetting } from "./CalcObject/Enemy";
import { isLegacySource } from "./Team/Legacy";
import { isTeamSetting } from "./Team/Settings";

/** The whole team's damage in the rotation. */
export const ROTATION_TEAM = 'rotation.total';
/** The viewed member's own hits in the rotation. */
export const ROTATION_SELF = 'rotation_self.total';

/**
 * The team's rotation as a member's features: the whole team's damage
 * (ROTATION_TEAM) and, when the member has hits in it, its own
 * (ROTATION_SELF). Both read one walk of the rotation, which every member
 * of a team view shares (TeamView.compiledRotation); each is compiled into
 * the member's programs.
 *
 * @param {CalcSet} viewer a member of a team
 * @param {Object|null} [compiled] the team's compiled rotation
 *     (RotationCompiler.compile), compiled now when not given
 * @returns {Array.<FeatureRotation>}
 */
export function compileRotationFeatures(viewer, compiled) {
    if (compiled === undefined) {
        compiled = new RotationCompiler(viewer.team).compile();
    }
    if (!compiled) {
        return [];
    }

    let slot = viewer.team.slotOf(viewer);
    let result = [new FeatureRotation({name: ROTATION_TEAM, items: compiled.items, viewerSlot: slot})];
    if (compiled.ownSlots.has(slot)) {
        result.push(new FeatureRotation({name: ROTATION_SELF, items: compiled.items, viewerSlot: slot, onlySlot: slot}));
    }
    return result;
}

/**
 * Compiles a team's rotation: one walk for every member's programs.
 *
 * The rotation is walked on a copy of the team: steps change the copy, never
 * the team. Whenever steps change it, the compiler takes a state: the program
 * data of every member, from one evaluation of the copy, so the walk serves
 * whichever member views it. A state is complete: everything a hit or a
 * post-effect reads (stats, settings, multipliers, post-effects, the enemy,
 * the team's toggles, what teammates deliver) is the team's as it is at that
 * point, not a change replayed on the start.
 *
 * Every hit is compiled with its member's data in the current state (see
 * Feature2RotationTree): a teammate's hit is moved into the viewed member's
 * program namespace. A block (repeat, uptime) walks a copy of its own and
 * starts from the state it is entered in; what changes inside it does not
 * reach the items after it.
 */
export class RotationCompiler {
    /**
     * @param {Team} team
     * @param {Object} [opts] {keepTeams: every state keeps the team it was
     *     taken from, for the damage graph of a hit
     *     (DamageGraph/RotationStops); results never need it}
     */
    constructor(team, opts = {}) {
        this.team = team;
        this.rotation = team.getRotation();
        this.keepTeams = !!opts.keepTeams;
    }

    /**
     * @returns {{items: Array, ownSlots: Set.<number>}|null} the compiled
     *     items and the slots of the members with hits of their own (a hit
     *     the whole team deals is nobody's, see isTeamHit); null without hits
     */
    compile() {
        if (!this.rotation.hasFeatures()) {
            return null;
        }

        this.hitSlots = new Set();
        this.ownSlots = new Set();

        // The rotation's copy of the team, with the artifact settings the
        // members' controls set (they are not saved).
        let copy = this.team.cloneWithArtifactSettings();
        let items = this.processBlock(copy, this.rotation.getItems(), this.state(copy), false);
        if (this.hitSlots.size == 0) {
            return null;
        }

        return {items, ownSlots: this.ownSlots};
    }

    /**
     * The team at one point of the rotation: the program data of every
     * member, from one evaluation of the copy. The data are copies: later
     * steps do not change them.
     *
     * @param {Team} copy
     * @returns {{type: 'state', members: Map.<number, BuildData>, team: (Team|undefined)}}
     *     team: the team at this point, when the compiler keeps teams
     */
    state(copy) {
        let evaluation = copy.evaluate();
        let members = new Map();
        for (let member of copy.getMembers()) {
            members.set(copy.slotOf(member), evaluation.member(member).programData());
        }

        let state = {type: 'state', members};
        if (this.keepTeams) {
            // Later steps change the copy: the state keeps one of its own.
            state.team = copy.cloneWithArtifactSettings();
        }
        return state;
    }

    /**
     * @param {Team} copy the copy this block walks; its steps change it
     * @param {Array} items
     * @param {Object} entry the state the block is entered in
     * @param {boolean} insideBlock
     * @returns {Array} compiled items, starting with the entry state
     */
    processBlock(copy, items, entry, insideBlock) {
        let result = [entry];
        let state = entry;
        let pending = [];

        for (const item of items) {
            if (!item || item.disabled) continue;

            if (item.type == 'condition' || item.type == 'action') {
                pending.push(item);
                continue;
            }

            if (pending.length) {
                if (this.applySteps(copy, pending, state)) {
                    state = this.state(copy);
                    result.push(state);
                }
                pending = [];
            }

            if (item.type == 'feature') {
                let hit = this.compileHit(copy, item, state, insideBlock);
                result.push(hit);
                if (hit.type == 'feature') {
                    pending.push(...afterItems(hit, item, insideBlock));
                }
            } else if (item.type == 'repeat') {
                let block = this.processBlock(copy.cloneWithArtifactSettings(), item.items, state, true);
                result.push({type: 'repeat', count: item.count, items: block});
            } else if (item.type == 'uptime') {
                // The block's features with its conditions for the uptime,
                // without them for the rest.
                let on = this.processBlock(copy.cloneWithArtifactSettings(), [...item.conditions, ...item.features], state, true);
                let off = this.processBlock(copy.cloneWithArtifactSettings(), item.features, state, true);
                result.push({type: 'uptime', percent: item.percent, on, off});
            }
        }

        // Steps after the block's last hit change nothing it computes.
        return result;
    }

    /**
     * @param {Team} copy
     * @param {Object} item a feature item
     * @param {Object} state the current state
     * @param {boolean} insideBlock
     * @returns {Object} {type: 'feature', slot, charId, feature, featureName,
     *     count, reaction, state, insideBlock}, or {type: 'invalid'} when the
     *     member or the feature is missing
     */
    compileHit(copy, item, state, insideBlock) {
        let member = findMember(copy, item.charId);
        let features = member ? member.getAllFeaturesByName(item.feature, {ignoreRotation: true}) : [];
        if (!features.length) {
            return {type: 'invalid'};
        }

        let slot = copy.slotOf(member);
        this.hitSlots.add(slot);
        if (!isTeamHit(features)) {
            this.ownSlots.add(slot);
        }
        return {
            type: 'feature',
            slot: slot,
            charId: item.charId,
            feature: features,
            featureName: item.feature,
            count: item.count,
            reaction: item.reaction,
            state: state,
            insideBlock: insideBlock,
        };
    }

    /**
     * Condition steps that set a control to the value it already has at
     * their point of the rotation ("same state as before"), by rotation item
     * ID. The walk follows compile(): steps change a copy of the team, a
     * block walks a copy of its own from the state it is entered in, a hit's
     * own steps (Arlecchino's Bond of Life) apply after it, and steps after
     * the last hit count too. Disabled items and what they hold are skipped;
     * an uptime branch that never happens (0% or 100%) is not walked.
     *
     * The steps still run: a step repeating its receiver's inherited value
     * makes it the receiver's own, which matters after a later change of its
     * source.
     *
     * @returns {Object.<number, {branches: Array.<string>|null}>} every
     *     redundant step: branches null when it repeats the value wherever it
     *     is reached, otherwise the uptime branches ('on', 'off') where it does
     */
    diagnoseSteps() {
        let occurrences = new Map();
        this.walkSteps(this.team.cloneWithArtifactSettings(), this.rotation.getItems(), null, false, occurrences);

        let result = {};
        for (const [id, list] of occurrences) {
            let redundant = list.filter((item) => item.redundant);
            if (redundant.length == 0) continue;
            result[id] = {
                branches: redundant.length == list.length ? null
                    : [...new Set(redundant.map((item) => item.branch).filter(Boolean))],
            };
        }
        return result;
    }

    /**
     * @param {Team} copy the copy this block walks; its steps change it
     * @param {Array} items
     * @param {string|null} branch the uptime branch the items are in
     * @param {boolean} insideBlock
     * @param {Map.<number, Array>} occurrences by item ID
     */
    walkSteps(copy, items, branch, insideBlock, occurrences) {
        for (const item of items) {
            if (!item || item.disabled) continue;

            if (item.type == 'condition') {
                let redundant = isRedundantStep(copy, item);
                if (redundant !== null && item.id !== undefined) {
                    if (!occurrences.has(item.id)) occurrences.set(item.id, []);
                    occurrences.get(item.id).push({redundant, branch});
                }
                if (!this.applySteps(copy, [item], null)) {
                    applyUnwornSetStep(copy, item);
                }
            } else if (item.type == 'action') {
                this.applySteps(copy, [item], null);
            } else if (item.type == 'feature') {
                let member = findMember(copy, item.charId);
                let features = member ? member.getAllFeaturesByName(item.feature, {ignoreRotation: true}) : [];
                let steps = afterItems({feature: features, charId: item.charId}, item, insideBlock);
                if (steps.length) {
                    this.applySteps(copy, steps, stepState(copy, member));
                }
            } else if (item.type == 'repeat') {
                this.walkSteps(copy.cloneWithArtifactSettings(), item.items, branch, true, occurrences);
            } else if (item.type == 'uptime') {
                if (item.percent > 0) {
                    this.walkSteps(copy.cloneWithArtifactSettings(), [...item.conditions, ...item.features], 'on', true, occurrences);
                }
                if (item.percent < 100) {
                    this.walkSteps(copy.cloneWithArtifactSettings(), item.features, 'off', true, occurrences);
                }
            }
        }
    }

    /**
     * Apply steps to the copy, each to its owner: a member's object, the
     * enemy or the team.
     *
     * @param {Team} copy
     * @param {Array} steps
     * @param {Object} state the state before the steps
     * @returns {boolean} whether a step applied
     */
    applySteps(copy, steps, state) {
        let applied = false;

        for (const step of steps) {
            if (step.static) {
                // A step a hit adds after itself, on the hit's member.
                let member = findMember(copy, step.charId);
                let data = member && state.members.get(copy.slotOf(member));
                if (!member || !data) continue;
                applyMemberSettings(member, step.object, step.getSettings(data.settings));
                applied = true;
            } else if (step.type == 'action') {
                let member = findMember(copy, step.charId);
                if (!member) continue;

                if (step.action == 'switch') {
                    // The member goes on field: effects for the on-field
                    // member (and the on-field shield) reach it from here.
                    copy.modifySettings({on_field_char: member.char.getId()});
                } else {
                    continue;
                }
                applied = true;
            } else {
                let data = Rotation.getConditionData(step, copy);
                if (data.invalid || !data.cond || !data.cond.getName()) continue;

                let settings = {[data.cond.getName()]: stepValue(data.cond, step.value)};
                if (step.receiverId && data.member) {
                    copy.setConditionValue(data.member.getSourceId(), step.receiverId, data.cond.getName(), settings[data.cond.getName()]);
                } else if (data.object == 'enemy') {
                    copy.enemy.addSettings(settings);
                } else if (data.object == 'party') {
                    copy.applyShared(settings);
                } else {
                    applyMemberSettings(data.member, data.object, settings);
                }
                applied = true;
            }
        }

        return applied;
    }
}

/**
 * Change a member's object in the rotation's copy. Settings of the team's
 * (a party toggle) go to the team.
 *
 * @param {CalcSet} member
 * @param {string} object
 * @param {Object} settings
 */
function applyMemberSettings(member, object, settings) {
    // An entry of the legacy source has its own controls and nothing shared.
    if (isLegacySource(member)) {
        member.modifySettings(settings);
        return;
    }

    let own = member.team.applyShared(settings);
    member[object].addSettings(own);
    member.setCommonSettings(own);
    member.normalizeRadianceStellarGlimmerSettings();
}

/**
 * @param {Condition} cond
 * @param {*} value the step's value
 * @returns {*} the setting's value
 */
function stepValue(cond, value) {
    let type = cond.getType();
    return type == 'dropdown' || type == 'dropdown_multiple' ? cond.getValueById(value) : value;
}

/**
 * Steps a hit adds after itself (Arlecchino's Bond of Life), on its member.
 *
 * @param {Object} hit the compiled hit
 * @param {Object} item its rotation item
 * @param {boolean} insideBlock
 * @returns {Array}
 */
function afterItems(hit, item, insideBlock) {
    let result = [];
    for (let feature of hit.feature) {
        if (!feature.getRotationAfterItems) continue;
        for (let step of feature.getRotationAfterItems(item, {insideBlock})) {
            result.push(Object.assign({}, step, {charId: hit.charId}));
        }
    }
    return result;
}

/**
 * The state a hit's own steps read: its member's settings as the copy
 * resolves them now.
 *
 * @param {Team} copy
 * @param {CalcSet} member
 * @returns {{members: Map.<number, {settings: Object}>}}
 */
function stepState(copy, member) {
    let settings = copy.evaluate().member(member).settings();
    return {members: new Map([[copy.slotOf(member), {settings}]])};
}

/**
 * @param {Team} copy the rotation's copy before the step
 * @param {Object} step a condition step
 * @returns {boolean|null} whether the step sets the value its control
 *     already has; null for a step that does not apply
 */
function isRedundantStep(copy, step) {
    let data = Rotation.getConditionData(step, copy);
    if (!data.cond || !data.cond.getName() || (data.invalid && !isUnwornSetStep(step, data))) {
        return null;
    }

    let cond = data.cond;
    let name = cond.getName();
    let value = stepValue(cond, step.value);
    return sameControlValue(cond, currentControlValue(copy, step, data, name), value);
}

/**
 * A step on a set the member does not wear: it changes nothing now, but the
 * control is still the member's (its set-bonus profile), and the step
 * applies when the set is worn (a candidate of the optimizer).
 *
 * @returns {boolean}
 */
function isUnwornSetStep(step, data) {
    return data.object == 'artifacts' && !!data.member && !isLegacySource(data.member) && isProfileControl(data.cond.getName())
        && !(step.receiverId && !data.receiver);
}

/**
 * Keep a step on an unworn set in the copy's profile, so the steps after it
 * are compared with it.
 */
function applyUnwornSetStep(copy, step) {
    let data = Rotation.getConditionData(step, copy);
    if (data.cond && data.cond.getName() && data.invalid && isUnwornSetStep(step, data) && !step.receiverId) {
        applyMemberSettings(data.member, 'artifacts', {[data.cond.getName()]: stepValue(data.cond, step.value)});
    }
}

/**
 * The value a step's control has in the copy, read from the owner the
 * step writes to (RotationCompiler.applySteps).
 */
function currentControlValue(copy, step, data, name) {
    if (step.receiverId && data.member) {
        let values = copy.getConditionValues(data.member.getSourceId(), step.receiverId);
        if (Object.prototype.hasOwnProperty.call(values, name)) {
            return values[name];
        }
    }
    if (isLegacySource(data.member)) {
        return data.member.getSettings()[name];
    }

    if (data.object == 'enemy' || isEnemySetting(name)) {
        return copy.enemy.getSettings()[name];
    }
    if (data.object == 'party' || isTeamSetting(name)) {
        return copy.getSettings()[name];
    }

    let member = data.member;
    if (data.object == 'artifacts' && isProfileControl(name)) {
        let profile = member.artifacts.getProfileSettings();
        return Object.prototype.hasOwnProperty.call(profile, name) ? profile[name] : controlDefault(data.cond);
    }
    let own = member[data.object] ? member[data.object].getSettings() : {};
    return Object.prototype.hasOwnProperty.call(own, name) ? own[name] : member.getSettings()[name];
}

/**
 * @param {Condition} cond
 * @param {*} a
 * @param {*} b
 * @returns {boolean} whether both values are the same state of the control
 */
function sameControlValue(cond, a, b) {
    let type = cond.getType();
    if (type == 'dropdown' || type == 'dropdown_multiple') {
        let selected = (value) => cond.getSelectedValues({[cond.getName()]: value}).slice().sort().join(';');
        return selected(a) === selected(b);
    }
    if (type == 'checkbox') {
        return !!a === !!b;
    }
    return Number(a || 0) === Number(b || 0);
}

/**
 * @param {Team} team
 * @param {number} charId
 * @returns {CalcSet|undefined}
 */
function findMember(team, charId) {
    return team.getMembers().find((member) => member.char.getId() == charId);
}
