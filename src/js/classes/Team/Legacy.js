import { Artifact } from "../Artifact";
import { deserializeProfile, patchProfile, resolveArtifactSetSettings, serializeProfile } from "../ArtifactSetProfile";
import { CalcObjectBuffs } from "../CalcObject/Buffs";
import { CalcObjectCharacter } from "../CalcObject/Character";
import { CalcObjectWeapon } from "../CalcObject/Weapon";
import { ConditionBooleanCharElement } from "../Condition/Boolean/CharElement";
import { ConditionReceiver } from "../Condition/Receiver";
import { statKind } from "../PostEffect/Channels";
import { Stats } from "../Stats";
import { OVERRIDE_STATS, applyStatOverrides, deserializeStatOverrides, serializeStatOverrides, statOverrideName,
    statOverrides, statsReadByEffects } from "./Overrides";
import { reachesOthers } from "./Receivers";
import { FLOATING_ID_BASE } from "./SourceId";

/**
 * The legacy source of a team: effects that come from outside its four
 * members, as the released Buffs tab had them. Its entries are sources only:
 * they deliver to the members, never receive, are never on field and have no
 * hits. Each entry is its own scope (its refinement, its controls), declared
 * by the same weapon, set or character file as for a member.
 *
 * - A virtual character: a character, its constellation, talent levels and
 *   controls, with no build.
 * - A floating weapon: a weapon, its refinement and its controls, with no
 *   wielder.
 * - A floating set: a set's full bonus and its controls, with no pieces and
 *   no wearer.
 *
 * An entry has no build, so it has no stats but the ones it states
 * (Team/Overrides: `stat_override.<kind>`, final): a virtual
 * Bennett states his Base ATK, a floating Key of Khaj-Nisut the wielder's
 * Max HP. What an entry cannot have is taken as met (Team/Scope.assumed): a
 * floating item's checks of its wielder, whose element can be stated where an
 * effect depends on it, and a virtual character's own field state.
 *
 * The first three virtual characters fill the team's free slots, for its
 * composition only (compositionFillers): elements, origins, party size and
 * what follows from them (resonances, Moonsign, Hexerei). A member takes
 * precedence over a virtual character of the same character, which is kept
 * and has no effect while the member is in the team.
 *
 * Sources are identified by a number: a member and a virtual character by
 * their character, a floating entry by FLOATING_ID_BASE plus its `uid`, which
 * it keeps for as long as it is in the team (stack choices, condition values
 * and rotation steps name it).
 */

export const LEGACY_KINDS = {
    CHAR: 'char',
    WEAPON: 'weapon',
    SET: 'set',
};

/** Kinds as saved; an ID is never reused or changed. */
const KIND_IDS = {
    [LEGACY_KINDS.CHAR]: 1,
    [LEGACY_KINDS.WEAPON]: 2,
    [LEGACY_KINDS.SET]: 3,
};

/** Virtual characters that can fill free slots: a team's other three. */
const FILL_CANDIDATES = 3;

/**
 * A character's own stats that are facts about the character, not about a
 * build: a virtual character has them without stating them.
 */
const CHARACTER_FACTS = ['burst_energy_cost'];

export { FLOATING_ID_BASE };

/** A floating set is its full bonus. */
const FLOATING_SET_PIECES = 4;

/** Elements a floating entry's wielder can be stated to have, as saved. */
const ELEMENT_IDS = {pyro: 1, hydro: 2, electro: 3, cryo: 4, anemo: 5, geo: 6, dendro: 7};

/**
 * @param {Object} source a member or a legacy entry
 * @returns {boolean}
 */
export function isLegacySource(source) {
    return !!(source && source.isLegacy);
}

/**
 * @param {Condition} cond
 * @returns {boolean} whether the condition, or one it depends on, checks the
 *     element of the member it belongs to (not of the receiver)
 */
function checksOwnElement(cond) {
    if (!cond || cond instanceof ConditionReceiver) return false;
    if (cond instanceof ConditionBooleanCharElement) return true;

    const params = cond.params || {};
    return [].concat(cond.items || [], params.condition || [], params.subConditions || [], params.conditions || [])
        .some((item) => checksOwnElement(item));
}

/**
 * @param {string} stat a stat as a member names it (atk, atk_percent, mastery_base)
 * @returns {boolean} whether it is one of the stats a build makes and an
 *     entry can only state (Team/Overrides.OVERRIDE_STATS)
 */
function isBuildStat(stat) {
    return !!OVERRIDE_STATS[statKind(stat)] || !!OVERRIDE_STATS[statKind(stat.replace(/_base$/, ''))];
}

class LegacyEntry {
    constructor() {
        /** @type {number} its number in its legacy source, see LegacySource.add */
        this.uid = 0;
        /** @type {Object.<string, number>} stated stats by kind (Team/Overrides.OVERRIDE_STATS) */
        this.stated = {};
        /** @type {string} the wielder's element, where stated */
        this.element = '';
        this.isLegacy = true;
    }

    /**
     * @returns {number} the number sources are identified by
     */
    getSourceId() {
        return FLOATING_ID_BASE + this.uid;
    }

    /**
     * @returns {Array.<string>} its objects, as a member names its own
     *     (Team/Evaluation.MEMBER_OBJECTS), the one with its controls first
     */
    objectNames() {
        return [this.kind == LEGACY_KINDS.SET ? 'artifacts' : this.kind];
    }

    /**
     * @returns {Object} the object that holds its controls
     */
    object() {
        return this[this.objectNames()[0]];
    }

    /**
     * State a stat of the wielder instead of leaving it at zero.
     *
     * @param {string} kind a key of Team/Overrides.OVERRIDE_STATS
     * @param {number|null} value null removes it
     */
    setStated(kind, value) {
        if (!OVERRIDE_STATS[kind]) {
            throw new Error(`"${kind}" cannot be stated`);
        }
        if (value === null || value === undefined || value === '') {
            delete this.stated[kind];
        } else {
            this.stated[kind] = Number(value);
        }
    }

    /**
     * @returns {Object} the stated stats as override settings
     */
    statedSettings() {
        let result = {};
        for (const [kind, value] of Object.entries(this.stated)) {
            result[statOverrideName(kind)] = value;
        }
        return result;
    }

    /**
     * @param {string} element '' for no stated element
     */
    setElement(element) {
        if (element && !ELEMENT_IDS[element]) {
            throw new Error(`Unknown element "${element}"`);
        }
        this.element = element || '';
    }

    /**
     * @returns {Object} its controls, its levels and what it states
     */
    getSettings() {
        let result = {};
        for (const name of this.objectNames()) {
            Object.assign(result, this[name].getSettings());
        }
        Object.assign(result, this.statedSettings());
        if (this.element) {
            result.char_element = this.element;
        }
        return result;
    }

    /**
     * @param {Object} data its controls, replaced
     */
    setSettings(data) {
        this.object().setSettings(data);
    }

    /**
     * @param {Object} data controls to change
     */
    modifySettings(data) {
        this.object().modifySettings(data);
    }

    /**
     * @param {Object} [options] {objects} as CalcSet.getConditions
     * @returns {Array.<Condition>}
     */
    getConditions(options) {
        let result = [];
        for (const name of this.objectNames()) {
            if (options && options.objects && !options.objects.includes(name)) continue;
            result = result.concat(this[name].getConditions());
        }
        return result;
    }

    getPostEffects() {
        let result = [];
        for (const name of this.objectNames()) {
            result = result.concat(this[name].getPostEffects());
        }
        return result;
    }

    /**
     * @returns {boolean} whether its character, weapon or set is beta content
     */
    isBeta() {
        return this.objectNames().some((name) => !!this[name].isBeta && !!this[name].isBeta());
    }

    /**
     * @returns {boolean} whether an effect it delivers checks its wielder's
     *     element, which the entry can state (setElement)
     */
    readsWielderElement() {
        return this.kind != LEGACY_KINDS.CHAR && this.getConditions().some((cond) => {
            return reachesOthers(cond) && checksOwnElement(cond);
        });
    }

    /**
     * @param {boolean} filling whether it fills a slot of the team's composition
     * @returns {Object} what is taken as met about it (Team/Scope.assumed)
     */
    assumptions(filling) {
        return {wielder: true, element: !this.element};
    }

    /**
     * Its stage 0 stats. An entry has no build: of the stats a build makes
     * (ATK, HP, DEF, Elemental Mastery, Energy Recharge, CRIT) it has the
     * ones it states and nothing else, whatever its own effects would add.
     * What its controls give stays: a counter one of its effects reads
     * (Furina's Fanfare, the healing Song of Days Past recorded).
     *
     * @param {Object} settings its resolved settings
     * @param {Stats} [own] what its own conditions give, unprocessed
     * @returns {Stats} unprocessed
     */
    statedStats(settings, own = new Stats()) {
        let stats = new Stats();
        for (const [stat, value] of Object.entries(own)) {
            if (!isBuildStat(stat)) stats.set(stat, value);
        }
        applyStatOverrides(stats, settings);
        return stats;
    }

    /**
     * The stat kinds its delivered effects read: the ones worth stating.
     * They come from the declarations of its character, weapon or set,
     * switched on or not; what every member's own buffs give (the Ascendant
     * Gleam bonus of the team's chosen source) counts only while it applies.
     *
     * @param {Object} [settings] its resolved settings in its team
     * @returns {Set.<string>} kinds of Team/Overrides.OVERRIDE_STATS
     */
    statsRead(settings) {
        let effects = [];
        let multipliers = [];
        for (const name of this.objectNames()) {
            let own = this[name].getPostEffects();
            effects = effects.concat(name == 'buffs' ? own.filter((effect) => !!settings && effect.isActive(settings)) : own);
            multipliers = multipliers.concat(this[name].getMultipliers());
        }
        return statsReadByEffects(effects, multipliers);
    }

    /**
     * @returns {LegacyEntry} a copy with the same uid
     */
    clone() {
        let copy = deserializeEntry(this.serialize());
        if (!copy) {
            throw new Error('Cannot copy a legacy entry');
        }
        return copy;
    }

    /**
     * [kind ID, uid, ...its body, stated stats ([count, ...[stat ID, value]]),
     * element ID].
     *
     * @returns {Array.<number>}
     */
    serialize() {
        return [KIND_IDS[this.kind], this.uid].concat(
            this.serializeBody(),
            serializeStatOverrides(this.statedSettings()),
            [ELEMENT_IDS[this.element] || 0],
        );
    }

    /**
     * @param {Array.<number>} input consumed from the front
     * @returns {boolean} whether the stated stats and the element were valid
     */
    deserializeTail(input) {
        let stated = deserializeStatOverrides(input);
        if (!stated) return false;
        this.stated = statOverrides(stated);

        let element = input.shift();
        if (!Number.isInteger(element) || element < 0) return false;
        this.element = Object.keys(ELEMENT_IDS).find((name) => ELEMENT_IDS[name] === element) || '';
        return element === 0 || !!this.element;
    }
}

/**
 * A character's team effects without its build: the character, its
 * constellation, talent levels and controls. It is level 90 and fully
 * ascended, which only unlocks its passives and talent levels.
 */
export class VirtualCharacter extends LegacyEntry {
    /**
     * @param {DbObjectChar} char
     */
    constructor(char) {
        super();
        this.kind = LEGACY_KINDS.CHAR;
        this.char = new CalcObjectCharacter();
        this.char.set(char);
        this.char.setLevels({level: 90, ascension: 6, constellation: 0});
        // What every member's own buffs give: the Ascendant Gleam bonus,
        // when the team chose this character as its source.
        this.buffs = new CalcObjectBuffs();
    }

    getSourceId() {
        return this.char.getId();
    }

    getName() {
        return this.char.getName();
    }

    objectNames() {
        return ['char', 'buffs'];
    }

    /**
     * @param {number} constellation
     */
    setConstellation(constellation) {
        this.char.setLevels({level: 90, ascension: 6, constellation: Math.max(0, Math.min(6, constellation))});
        this.char.removeInvalidSettings();
    }

    getConstellation() {
        return this.char.getLevels().constellation;
    }

    /**
     * @param {{attack: number, elemental: number, burst: number}} skills talent levels, 1 to 10
     */
    setSkills(skills) {
        this.char.setSkills(Object.assign(this.char.getSkills(), skills));
    }

    getSkills() {
        return this.char.getSkills();
    }

    assumptions(filling) {
        return {field: true, composition: !filling};
    }

    /**
     * Its stage 0 stats: as any entry's, with the facts about its character.
     */
    statedStats(settings, own = new Stats()) {
        let facts = new Stats(own);
        let table = this.char.getStats().stats;
        for (const stat of CHARACTER_FACTS) {
            if (table.get(stat)) facts.set(stat, table.get(stat));
        }
        return super.statedStats(settings, facts);
    }

    serializeBody() {
        return this.char.serialize(this.char.getSettings());
    }

    static deserializeBody(input) {
        let char = CalcObjectCharacter.deserialize(input);
        if (!char) return null;

        let result = new VirtualCharacter(char.object);
        result.setConstellation(char.getLevels().constellation);
        result.setSkills(char.getSkills());
        result.char.setSettings(char.settings);
        return result;
    }
}

/**
 * A weapon's party effects without its wielder.
 */
export class FloatingWeapon extends LegacyEntry {
    /**
     * @param {DbObjectWeapon} weapon
     * @param {number} [refine]
     */
    constructor(weapon, refine = 1) {
        super();
        this.kind = LEGACY_KINDS.WEAPON;
        this.weapon = new CalcObjectWeapon();
        this.weapon.set(weapon);
        this.setRefine(refine);
    }

    getName() {
        return this.weapon.getName();
    }

    /**
     * @param {number} refine
     */
    setRefine(refine) {
        // Level and ascension only unlock the passive; a floating weapon has no stats.
        this.weapon.setLevels({level: 90, ascension: 6, refine});
    }

    getRefine() {
        return this.weapon.getLevels().refine;
    }

    serializeBody() {
        return [this.weapon.getId(), this.getRefine()].concat(this.weapon.serializeConditions(this.weapon.getSettings()));
    }

    static deserializeBody(input) {
        let weapon = DB.Weapons.getById(input.shift());
        let refine = input.shift();
        if (!weapon || !Number.isInteger(refine) || refine < 1 || refine > weapon.getMaxRefinement()) return null;

        let result = new FloatingWeapon(weapon, refine);
        let settings = result.weapon.deserializeConditions(input);
        if (!settings) return null;
        result.weapon.setSettings(settings);
        return result;
    }
}

/**
 * A set's full bonus without its wearer. Its controls are a set-bonus
 * profile of its own (ArtifactSetProfile): every control is on until changed.
 */
class FloatingSetBonus {
    /**
     * @param {string} set key in DB.Artifacts.Sets
     */
    constructor(set) {
        this.set = set;
        this.profile = {};
    }

    data() {
        return DB.Artifacts.Sets.get(this.set);
    }

    getConditions() {
        return this.data().getConditions(FLOATING_SET_PIECES);
    }

    getMultipliers() {
        return this.data().getMultipliers(FLOATING_SET_PIECES);
    }

    getPostEffects() {
        return this.data().getPostEffects();
    }

    getFeatures() {
        return this.data().getFeatures(FLOATING_SET_PIECES);
    }

    getStats() {
        return {stats: new Stats(), settings: {}};
    }

    isBeta() {
        return this.data().isBeta();
    }

    getSettings() {
        let result = resolveArtifactSetSettings(this.profile, {[this.set]: FLOATING_SET_PIECES});
        result[Artifact.settingName(this.set)] = FLOATING_SET_PIECES;
        return result;
    }

    setSettings(data) {
        this.profile = patchProfile({}, data);
    }

    modifySettings(data) {
        this.profile = patchProfile(this.profile, data);
    }
}

export class FloatingSet extends LegacyEntry {
    /**
     * @param {string} set key in DB.Artifacts.Sets
     */
    constructor(set) {
        super();
        if (!DB.Artifacts.Sets.get(set)) {
            throw new Error(`Unknown artifact set "${set}"`);
        }
        this.kind = LEGACY_KINDS.SET;
        this.artifacts = new FloatingSetBonus(set);
    }

    getName() {
        return this.artifacts.data().getName();
    }

    getSet() {
        return this.artifacts.set;
    }

    serializeBody() {
        return [this.artifacts.data().getId()].concat(serializeProfile(this.artifacts.profile));
    }

    static deserializeBody(input) {
        let id = input.shift();
        let set = DB.Artifacts.Sets.getKeys(true).find((key) => DB.Artifacts.Sets.get(key).getId() === id);
        if (!set) return null;

        let result = new FloatingSet(set);
        let profile = deserializeProfile(input);
        if (!profile) return null;
        result.artifacts.profile = profile;
        return result;
    }
}

const ENTRY_CLASSES = {
    [KIND_IDS[LEGACY_KINDS.CHAR]]: VirtualCharacter,
    [KIND_IDS[LEGACY_KINDS.WEAPON]]: FloatingWeapon,
    [KIND_IDS[LEGACY_KINDS.SET]]: FloatingSet,
};

/**
 * The virtual characters that fill a team's free slots, for its composition
 * only: the first three, in order, as many as there are free slots.
 *
 * @param {Array.<LegacyEntry>} entries the entries in effect
 * @param {number} freeSlots
 * @returns {Array.<VirtualCharacter>}
 */
export function compositionFillers(entries, freeSlots) {
    return entries.filter((entry) => entry.kind == LEGACY_KINDS.CHAR)
        .slice(0, FILL_CANDIDATES).slice(0, Math.max(0, freeSlots));
}

/**
 * @param {Array.<number>} input consumed from the front
 * @returns {LegacyEntry|null}
 */
function deserializeEntry(input) {
    let EntryClass = ENTRY_CLASSES[input.shift()];
    let uid = input.shift();
    if (!EntryClass || !Number.isInteger(uid) || uid < 1) return null;

    let result = EntryClass.deserializeBody(input);
    if (!result || !result.deserializeTail(input)) return null;
    result.uid = uid;
    return result;
}

/**
 * The entries of a team's legacy source, in the order they deliver and are
 * chosen for a non-stacking effect: after the members, first entry first.
 */
export class LegacySource {
    constructor() {
        /** @type {Array.<LegacyEntry>} */
        this.entries = [];
    }

    /**
     * @returns {Array.<LegacyEntry>}
     */
    getEntries() {
        return [].concat(this.entries);
    }

    /**
     * @param {number} sourceId
     * @returns {LegacyEntry|null}
     */
    getBySourceId(sourceId) {
        return this.entries.find((entry) => entry.getSourceId() === sourceId) || null;
    }

    /**
     * @param {LegacyEntry} entry a new entry; it gets the next free uid
     * @returns {LegacyEntry} entry
     */
    add(entry) {
        if (this.entries.includes(entry)) {
            throw new Error('The entry is already in the legacy source');
        }
        // A character's effects have no stack keys: a character is in a
        // team once.
        if (entry.kind == LEGACY_KINDS.CHAR && this.getBySourceId(entry.getSourceId())) {
            throw new Error('The character is already a virtual character of the team');
        }
        entry.uid = this.entries.reduce((max, item) => Math.max(max, item.uid), 0) + 1;
        this.entries.push(entry);
        return entry;
    }

    /**
     * @param {LegacyEntry} entry
     */
    remove(entry) {
        this.entries = this.entries.filter((item) => item !== entry);
    }

    /**
     * Put the entries in a new order. The order decides which virtual
     * characters fill the party (the first three) and which entry supplies
     * a non-stacking effect by default (the earliest).
     *
     * @param {Array.<number>} uids the uid of every entry, in the new order
     */
    reorder(uids) {
        let byUid = new Map(this.entries.map((entry) => [entry.uid, entry]));
        if (uids.length != byUid.size || new Set(uids).size != byUid.size || !uids.every((uid) => byUid.has(uid))) {
            throw new Error('A new order names every entry of the legacy source once');
        }
        this.entries = uids.map((uid) => byUid.get(uid));
    }

    /**
     * The entries that take effect in a team: a virtual character whose
     * character is a member is not one of them (team over legacy).
     *
     * @param {Array.<CalcSet>} [members] the team's members
     * @returns {Array.<LegacyEntry>}
     */
    active(members = []) {
        let taken = new Set(members.map((member) => member.char.getId()));
        return this.entries.filter((entry) => entry.kind != LEGACY_KINDS.CHAR || !taken.has(entry.getSourceId()));
    }

    /**
     * @returns {LegacySource} a copy with every entry copied
     */
    clone() {
        let copy = new LegacySource();
        copy.entries = this.entries.map((entry) => entry.clone());
        return copy;
    }

    /**
     * [count, ...entries (LegacyEntry.serialize)].
     *
     * @returns {Array.<number>}
     */
    serialize() {
        return [this.entries.length].concat(...this.entries.map((entry) => entry.serialize()));
    }

    /**
     * @param {Array.<number>} input consumed from the front
     * @returns {LegacySource|null}
     */
    static deserialize(input) {
        let count = input.shift();
        if (!Number.isInteger(count) || count < 0 || count > input.length) return null;

        let result = new LegacySource();
        let uids = new Set();
        for (let i = 0; i < count; ++i) {
            let entry = deserializeEntry(input);
            if (!entry || uids.has(entry.uid)) return null;
            if (entry.kind == LEGACY_KINDS.CHAR && result.getBySourceId(entry.getSourceId())) return null;
            uids.add(entry.uid);
            result.entries.push(entry);
        }
        return result;
    }
}
