import { stackKeyById, stackKeyId } from "../db/StackKeys";
import { CalcObjectEnemy, defaultEnemy, isEnemySetting } from "./CalcObject/Enemy";
import { CalcSet } from "./CalcSet";
import { TeamEvaluation } from "./Team/Evaluation";
import { TeamView } from "./TeamView";
import { splitStackClaim, stackClaim, StackLedger } from "./Team/Stacking";
import { Rotation } from "./Rotation";
import { loadLegacyTeam } from "./Legacy/Team";
import { conditionDefinition, deserializeConditionValues, isSourceId, normalizeConditionValue, serializeConditionValues } from "./Team/ConditionValues";
import { isTeamSetting, teamSettingDefinitions, teamSettingsValues } from "./Team/Settings";
import { LEGACY_KINDS, LegacySource } from "./Team/Legacy";

export const TEAM_SIZE = 4;

/**
 * First number of a serialized team; a character build starts with 1 or 3
 * (CalcSet.BUILD_FORMAT). 4 to 8 were this model's formats before it was
 * released: they are not read.
 */
export const TEAM_FORMAT = 9;

/**
 * @param {number} value first number of a serialized team or build
 * @returns {boolean} whether it is a team
 */
export function isTeamFormat(value) {
    return value == TEAM_FORMAT;
}

/**
 * A team of up to four members. Each member is a complete build (a CalcSet)
 * and any member can be viewed; no member is special in the data.
 *
 * The team owns the enemy, the team toggles, the rotation and the chosen
 * sources of non-stacking effects, plus condition values per source and
 * receiver. Composition (elements, origins and so on)
 * is derived from the members when a team is evaluated.
 *
 * Effects from outside the four members (a weapon or a set with no wielder
 * in the team) are the team's legacy source (Team/Legacy): its entries
 * deliver to the members and are nothing else.
 */
export class Team {
    constructor() {
        /** @type {Array.<CalcSet|null>} */
        this.slots = new Array(TEAM_SIZE).fill(null);
        this.enemy = new CalcObjectEnemy();
        this.settings = {};
        /** @type {Rotation} hits and steps of the whole team, see Rotation */
        this.rotation = new Rotation();
        /**
         * The source the user chose for a non-stacking effect, by claim
         * (Team/Stacking.stackClaim): a character ID, or 0 for nobody.
         * Claims without a choice go to the earliest slot.
         * @type {Object.<string, number>}
         */
        this.stackChoices = {};
        /** @type {Object} source char -> receiver char -> control name -> value */
        this.conditionValues = {};
        /** @type {LegacySource} effects from outside the members */
        this.legacy = new LegacySource();
    }

    /**
     * @returns {Rotation}
     */
    getRotation() {
        return this.rotation;
    }

    /**
     * @param {Rotation|null} rotation
     */
    setRotation(rotation) {
        this.rotation = rotation || new Rotation();
    }

    /**
     * A new evaluation of the team as it is now. The team is the only thing
     * that is evaluated: every member's data is read from an evaluation of
     * its team (TeamEvaluation.member). Nothing is cached: whoever reads the
     * same state repeatedly holds on to a view (the app keeps one per
     * refresh, see App.teamView).
     *
     * @returns {TeamEvaluation}
     */
    evaluate() {
        return TeamEvaluation.resolve(this.getSlots(), this.getSettings(), this.enemy, this.stackChoices, this.conditionValues,
            this.legacy.active(this.getMembers()));
    }

    /**
     * @returns {TeamView} a new view of the team as it is now
     */
    view() {
        return new TeamView(this);
    }

    /**
     * A team whose first member is the given standalone build. A released
     * format-1 build also brings its enemy, its team toggles and its Buffs
     * tab: the party rows as virtual characters, the weapon and set rows as
     * floating entries of the legacy source (Legacy/Team.loadLegacyTeam).
     * New character builds stand alone.
     *
     * @param {CalcSet} member
     * @param {CalcObjectEnemy} [enemy] the default enemy by default
     * @returns {Team}
     */
    static fromMember(member, enemy) {
        let team = new Team();
        team.enemy = enemy || (member.legacyTeam ? cloneEnemy(member.legacyTeam.enemy) : defaultEnemy());
        team.setMember(0, member);
        if (member.legacyTeam) {
            team.migration = loadLegacyTeam(team, member.legacyTeam);
        }
        return team;
    }

    /**
     * A build to show or compare on its own (a saved build, an import), as a
     * member of a team: the build itself when it is a member, otherwise a copy
     * of it in a new team of one. The build is not changed.
     *
     * @param {CalcSet} build
     * @returns {CalcSet} a member of a team
     */
    static solo(build) {
        if (build.team) return build;
        const copy = build.characterBuild();
        copy.legacyTeam = build.legacyTeam;
        return Team.fromMember(copy).getMember(0);
    }

    /**
     * @returns {Array.<CalcSet|null>} members by slot
     */
    getSlots() {
        return [].concat(this.slots);
    }

    /**
     * @returns {Array.<CalcSet>} occupied slots in slot order
     */
    getMembers() {
        return this.slots.filter((member) => !!member);
    }

    /**
     * @returns {Array.<CalcSet|LegacyEntry>} everything that delivers
     *     effects in the team: its members in slot order, then the entries
     *     of its legacy source that take effect
     */
    getSources() {
        let members = this.getMembers();
        return members.concat(this.legacy.active(members));
    }

    /**
     * @returns {boolean} whether a member or an entry of the legacy source is beta content
     */
    hasBetaContent() {
        return this.getMembers().some((member) => member.hasBetaContent())
            || this.legacy.getEntries().some((entry) => entry.isBeta());
    }

    /**
     * Add an entry to the team's legacy source (Team/Legacy). A character
     * is in the team once: as a member or as a virtual character.
     *
     * @param {LegacyEntry} entry
     * @returns {LegacyEntry} entry
     */
    addLegacy(entry) {
        if (entry.kind == LEGACY_KINDS.CHAR) {
            this.checkCharacter(null, entry.getSourceId());
        }
        return this.legacy.add(entry);
    }

    /**
     * @param {number} slot
     * @returns {CalcSet|null}
     */
    getMember(slot) {
        return this.slots[slot] || null;
    }

    /**
     * @param {CalcSet} member
     * @returns {number} slot, or -1
     */
    slotOf(member) {
        return this.slots.indexOf(member);
    }

    getSettings() {
        return teamSettingsValues(this.settings);
    }

    /**
     * Replace the team toggles. They never change a member's own settings:
     * a toggle that overrides one (Polestar Field turns off Mizuki's and
     * Vesna's Swirl) does so in evaluations only.
     *
     * @param {Object} settings
     */
    setSettings(settings) {
        this.settings = teamSettingsValues(settings);
    }

    /**
     * @param {Object} data team toggles to change
     */
    modifySettings(data) {
        this.setSettings(Object.assign(this.getSettings(), data));
    }

    /**
     * Override one source's control for one receiver. Missing entries inherit
     * the source's saved input; false, zero and empty strings are explicit.
     * Null/undefined restores inheritance. Absent members keep their inputs.
     */
    setConditionValue(sourceId, receiverId, name, value) {
        if (!isSourceId(sourceId) || !DB.Chars.getById(receiverId)) throw new Error('Unknown condition source or receiver');
        if (value === null || value === undefined) {
            const receivers = this.conditionValues[sourceId];
            const settings = receivers?.[receiverId];
            if (settings) {
                delete settings[name];
                if (!Object.keys(settings).length) delete receivers[receiverId];
                if (!Object.keys(receivers).length) delete this.conditionValues[sourceId];
            }
            return;
        }
        const definition = conditionDefinition(sourceId, name);
        if (!definition) throw new Error('Unknown member control: ' + name);
        const settings = (this.conditionValues[sourceId] ||= {})[receiverId] ||= {};
        settings[name] = normalizeConditionValue(definition.cond, value);
    }

    getConditionValues(sourceId, receiverId) {
        return Object.assign({}, this.conditionValues[sourceId]?.[receiverId]);
    }

    /**
     * Split settings that span owners (a weapon scenario against an enemy
     * affected by Hydro, a rotation step) by their owner: the team's toggles,
     * the enemy's settings and a member's own. Each part is changed on its
     * owner.
     *
     * @param {Object} data
     * @returns {{team: Object, enemy: Object, member: Object}}
     */
    static splitSettings(data) {
        let result = {team: {}, enemy: {}, member: {}};
        for (const [name, value] of Object.entries(data || {})) {
            let owner = isTeamSetting(name) ? 'team' : isEnemySetting(name) ? 'enemy' : 'member';
            result[owner][name] = value;
        }
        return result;
    }

    /**
     * Change the team's and its enemy's parts of settings that span owners
     * (splitSettings).
     *
     * @param {Object} data
     * @returns {Object} the member's part, for the caller to set on the member
     */
    applyShared(data) {
        let {team, enemy, member} = Team.splitSettings(data);
        if (Object.keys(team).length) this.modifySettings(team);
        if (Object.keys(enemy).length) this.enemy.modifySettings(enemy);
        return member;
    }

    /**
     * @returns {CalcSet|null} the chosen on-field member, or the first member
     *     while the chosen one is not in the team (as Team/State reads it)
     */
    getOnFieldMember() {
        let members = this.getMembers();
        return members.find((member) => member.char.getId() === this.settings.on_field_char) || members[0] || null;
    }

    setOnFieldMember(member) {
        if (!member || this.slotOf(member) < 0) throw new Error('The on-field character must belong to the team');
        this.settings.on_field_char = member.char.getId();
    }

    swapMembers(first, second) {
        this.checkSlot(first);
        this.checkSlot(second);
        [this.slots[first], this.slots[second]] = [this.slots[second], this.slots[first]];
    }

    /**
     * Put a standalone build into a slot, replacing the build there. Filling
     * a slot never changes the existing members.
     *
     * @param {number} slot
     * @param {CalcSet} member
     */
    setMember(slot, member) {
        this.checkSlot(slot);

        if (member.team && member.team !== this) {
            throw new Error('The build is already a member of another team');
        }
        if (this.slotOf(member) >= 0 && this.slotOf(member) != slot) {
            throw new Error('The build is already in another slot of this team');
        }

        let previous = this.slots[slot];
        this.checkCharacter(previous, member.char.getId());

        if (previous && previous !== member) {
            this.detach(previous);
        }

        member.team = this;
        this.slots[slot] = member;
        this.adoptRotation(member);
    }

    /**
     * A build saved with a rotation (its part of a team's rotation, or a
     * rotation saved before rotations belonged to teams) brings it into a
     * team whose rotation is empty. A member holds no rotation of its own.
     *
     * @param {CalcSet} member
     */
    adoptRotation(member) {
        if (member.savedRotation && this.rotation.getItems().length == 0) {
            this.rotation = member.savedRotation;
        }
        member.savedRotation = null;
    }

    /**
     * @param {CalcSet|null} member member that gets the character, or null for a new member
     * @param {number} charId
     */
    checkCharacter(member, charId) {
        for (let other of this.getMembers()) {
            if (other !== member && other.char.getId() == charId) {
                throw new Error('The character is already in the team');
            }
        }
    }

    /**
     * Fill a slot from any build (a link, a saved build or an import): only
     * the character build is taken. Its old party, party settings and enemy
     * are dropped; the member uses the team's enemy.
     *
     * @param {number} slot
     * @param {CalcSet} build
     * @returns {CalcSet} the member
     */
    importMember(slot, build) {
        let member = build.characterBuild();
        this.setMember(slot, member);
        return member;
    }

    /**
     * Take a member out of the team. It becomes a standalone build.
     *
     * @param {number} slot
     * @returns {CalcSet|null} the removed member
     */
    removeMember(slot) {
        this.checkSlot(slot);

        let member = this.slots[slot];
        if (!member) {
            return null;
        }

        this.slots[slot] = null;
        this.detach(member);

        return member;
    }

    /**
     * Choose the source of a non-stacking effect (Team/Stacking), or nobody
     * to turn it off. The choice is the team's: while its source is not
     * eligible, the earliest slot supplies the effect.
     *
     * @param {string} key
     * @param {CalcSet|LegacyEntry|null} member an eligible source (a member
     *     or an entry of the legacy source), or null for nobody
     * @param {CalcSet|null} receiver required for a recipient-scoped key
     */
    setStackSource(key, member, receiver = null) {
        if ((member && !this.getSources().includes(member)) || (receiver && this.slotOf(receiver) < 0)) {
            throw new Error('Stack sources and recipients must belong to the team');
        }
        const receiverId = receiver ? receiver.char.getId() : 0;

        if (member) {
            let ledger = this.stackSources();
            if (!ledger.getSources(key, receiverId).has(member) && !ledger.getYielded(key, receiverId).has(member)) {
                throw new Error('The member is not an eligible source for this stack key and recipient');
            }
        }
        this.stackChoices[stackClaim(key, receiverId)] = member ? member.getSourceId() : 0;
    }

    /**
     * Sources of every stack key in the team as it is now: the sources that
     * apply and the eligible ones that yield.
     *
     * @returns {StackLedger}
     */
    stackSources() {
        if (this.getMembers().length == 0) {
            return new StackLedger();
        }

        // Claims belong to the whole team, whichever member is viewed.
        return this.evaluate().collectStackSources();
    }

    /**
     * @returns {Array.<StackGroup>} non-stacking effects with a choice to
     *     make, and who supplies each (Team/Stacking)
     */
    stackGroups() {
        return this.getMembers().length ? this.evaluate().stackGroups() : [];
    }

    /**
     * Copy of the team with every member copied, keeping artifact settings
     * exactly (member state the format keeps only when set included), as
     * rotation evaluation needs.
     *
     * @returns {Team}
     */
    cloneWithArtifactSettings() {
        return this.copyWith((member) => member.characterBuild({artifactSettings: true, rotation: false}));
    }

    /**
     * Copy of the team with every member copied.
     *
     * @returns {Team}
     */
    clone() {
        return this.copyWith((member) => member.characterBuild({rotation: false}));
    }

    /**
     * A copy of the team with one of its members alone, in the first slot:
     * the member with what the team holds besides its members (the enemy,
     * the team toggles, the legacy source) and their part of the rotation.
     * Choices that name the other members go with them. A character is
     * saved this way with its additional buffs (App.buildToSave).
     *
     * @param {CalcSet} member a member of this team
     * @returns {Team}
     */
    withOnly(member) {
        const slot = this.slotOf(member);
        if (slot < 0) throw new Error('The member is not in the team');

        const memberId = member.char.getId();
        const entryIds = this.legacy.getEntries().map((entry) => entry.getSourceId());
        const kept = new Set([memberId].concat(entryIds));

        const copy = this.clone();
        copy.slots.forEach((other, index) => {
            if (other && index != slot) copy.removeMember(index);
        });
        copy.swapMembers(0, slot);
        copy.rotation = this.rotation.memberPart(memberId, entryIds);

        if (copy.settings.on_field_char != memberId) copy.settings.on_field_char = 0;
        for (const [claim, sourceId] of Object.entries(copy.stackChoices)) {
            const {receiverId} = splitStackClaim(claim);
            if ((receiverId && receiverId != memberId) || (sourceId && !kept.has(sourceId))) delete copy.stackChoices[claim];
        }
        copy.conditionValues = {};
        for (const sourceId of kept) {
            const values = this.conditionValues[sourceId]?.[memberId];
            if (values) copy.conditionValues[sourceId] = {[memberId]: structuredClone(values)};
        }

        return copy;
    }

    /**
     * @param {function(CalcSet): CalcSet} copyMember standalone copy of a member
     * @returns {Team}
     */
    copyWith(copyMember) {
        let copy = new Team();
        copy.enemy = cloneEnemy(this.enemy);
        copy.settings = this.getSettings();
        copy.rotation = this.rotation.clone();
        copy.stackChoices = Object.assign({}, this.stackChoices);
        copy.conditionValues = structuredClone(this.conditionValues);
        copy.legacy = this.legacy.clone();
        if (this.migration) copy.migration = structuredClone(this.migration);

        this.slots.forEach((member, slot) => {
            if (member) {
                let memberCopy = copyMember(member);
                memberCopy.team = copy;
                copy.slots[slot] = memberCopy;
            }
        });

        return copy;
    }

    /**
     * Team format 9: [TEAM_FORMAT, enemy, team settings, 4 slots, stack
     * choices, condition values, legacy source, rotation]. A slot is 0 when
     * empty, or 1 and the member (CalcSet.serializeMember, without a
     * rotation). Stack choices are [count, ...[stack key ID, recipient char
     * ID, source ID]]: recipient zero is a team-wide claim, source zero is
     * nobody; a source is a member's character or a legacy entry
     * (LegacyEntry.getSourceId). The legacy source is LegacySource.serialize.
     *
     * @param {Object} [opts] {artifacts: Map.<CalcSet, CalcObjectArtifacts>}
     *     members saved with other artifacts than they wear: the key of a
     *     search's program leaves out what its candidate's pieces add
     *     (ArtifactCandidateEvaluator)
     * @returns {Array.<number>|null}
     */
    serialize(opts) {
        let result = [TEAM_FORMAT];

        let enemy = this.enemy.serialize(this.enemy.getSettings());
        if (!enemy) return null;
        result = result.concat(enemy);

        const settings = this.getSettings();
        const entries = Object.entries(teamSettingDefinitions()).filter(([name]) => settings[name]);
        result.push(entries.length);
        for (const [name, definition] of entries) result.push(definition.id, Number(settings[name]));

        for (let member of this.slots) {
            if (!member) {
                result.push(0);
                continue;
            }

            let body = member.serializeMember({rotation: false, artifacts: opts && opts.artifacts && opts.artifacts.get(member)});
            if (!body) return null;

            result.push(1);
            result = result.concat(body);
        }

        let choices = Object.entries(this.stackChoices).map(([claim, charId]) => {
            const {key, receiverId} = splitStackClaim(claim);
            return [stackKeyId(key), receiverId, charId];
        }).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        result = result.concat([choices.length], choices.flat());

        const values = serializeConditionValues(this.conditionValues);
        if (!values) return null;
        return result.concat(values, this.legacy.serialize(), this.rotation.serialize());
    }

    /**
     * @param {Array.<number>} input consumed from the front
     * @returns {Team|null}
     */
    static deserialize(input) {
        if (!isTeamFormat(input.shift())) return null;

        let team = new Team();

        team.enemy = CalcObjectEnemy.deserialize(input);
        if (!team.enemy) return null;

        let settingsCount = input.shift();
        if (!Number.isInteger(settingsCount) || settingsCount < 0 || settingsCount > Object.keys(teamSettingDefinitions()).length) return null;
        const seenSettings = new Set();
        for (let i = 0; i < settingsCount; ++i) {
            const id = input.shift();
            const value = input.shift();
            const entry = Object.entries(teamSettingDefinitions()).find(([, definition]) => definition.id === id);
            if (!entry || seenSettings.has(id) || !Number.isInteger(value) || value < 0) return null;
            const [name, definition] = entry;
            if (value > (definition.boolean ? 1 : definition.max ?? Infinity)) return null;
            seenSettings.add(id);
            team.settings[name] = definition.boolean ? !!value : value;
        }

        let charIds = new Set();
        for (let slot = 0; slot < TEAM_SIZE; ++slot) {
            let flag = input.shift();
            if (flag === 0) continue;
            if (flag !== 1) return null;

            let member = CalcSet.deserializeMember(input);
            if (!member) return null;
            // A member holds no rotation: the team's follows the slots.
            member.savedRotation = null;

            let charId = member.char.getId();
            if (charIds.has(charId)) return null;
            charIds.add(charId);

            member.team = team;
            team.slots[slot] = member;
        }

        let count = input.shift();
        if (!Number.isInteger(count) || count < 0) return null;
        for (let i = 0; i < count; ++i) {
            let key = stackKeyById(input.shift());
            let receiverId = input.shift();
            let charId = input.shift();
            if (!key || !Number.isInteger(receiverId) || receiverId < 0 || !Number.isInteger(charId) || charId < 0) return null;
            team.stackChoices[stackClaim(key, receiverId)] = charId;
        }

        team.conditionValues = deserializeConditionValues(input);
        if (!team.conditionValues) return null;

        team.legacy = LegacySource.deserialize(input);
        if (!team.legacy) return null;

        let rotation = Rotation.deserialize(input);
        if (!rotation) return null;
        team.rotation = rotation;

        return team;
    }

    detach(member) {
        member.team = null;
    }

    checkSlot(slot) {
        if (!Number.isInteger(slot) || slot < 0 || slot >= TEAM_SIZE) {
            throw new Error(`Invalid team slot ${slot}`);
        }
    }
}

/**
 * A member as sent to a worker: its whole team and its slot, so the worker
 * evaluates it with its teammates and their enemy.
 *
 * @param {CalcSet} member a member of a team
 * @returns {Object}
 */
export function serializeWorkerMember(member) {
    if (!member.team) {
        throw new Error('A build is sent to a worker with its team');
    }
    return {team: member.team.serialize(), slot: member.team.slotOf(member)};
}

/**
 * @param {Object} data from serializeWorkerMember
 * @returns {CalcSet|null}
 */
export function deserializeWorkerMember(data) {
    let team = data && data.team ? Team.deserialize(data.team.slice()) : null;
    return team ? team.getMember(data.slot) : null;
}

function cloneEnemy(enemy) {
    let copy = CalcObjectEnemy.deserialize(enemy.serialize({}));
    if (!copy) {
        throw new Error('Cannot copy the team enemy');
    }
    copy.setSettings(enemy.settings);
    return copy;
}
