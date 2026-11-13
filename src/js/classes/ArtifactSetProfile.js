import { Condition } from "./Condition";
import { isMemberControl } from "./Team/ConditionValues";

/**
 * A member's set-bonus profile: the value of every editable effect control
 * (toggle, stacks, dropdown, number) of every artifact set, worn or not. It
 * is the only source of these values. A worn set's effects read them, the
 * optimizer reads them for every set it tries, and a rotation step changes
 * one only from its point on.
 *
 * A profile is sparse: it holds only values that differ from the control's
 * default, its "all on" value (Condition.allConditionsOn). `false`, `0` and
 * an empty selection are values like any other.
 *
 * Member state that a set happens to declare (a `common.*` control such as
 * Nightsoul's Blessing) is not a set effect and not part of a profile: it
 * belongs to the member, as it does for the character and the weapon that
 * declare it.
 */

const catalogs = new WeakMap();

/**
 * @param {Condition} cond
 * @returns {boolean} whether the condition is an editable set effect control
 */
function isArtifactControl(cond) {
    return isMemberControl(cond) && !/^common\./.test(cond.getName());
}

/**
 * Every set's controls, by name, by serialize ID and by set. Names and IDs
 * are unique across all sets: a profile holds all of them at once.
 */
function catalog() {
    let result = catalogs.get(DB);
    if (result) {
        return result;
    }

    result = {byName: new Map(), byId: new Map(), retiredById: new Map(), bySet: new Map()};
    for (const setId of DB.Artifacts.Sets.getKeys(true)) {
        const controls = [];
        DB.Artifacts.Sets.get(setId).getConditionsByPieces().forEach((conditions, pieces) => {
            for (const cond of Condition.unwrap(conditions || [])) {
                if (cond.isRetired?.()) {
                    result.retiredById.set(cond.getId(), cond);
                    continue;
                }
                if (!isArtifactControl(cond)) continue;

                const entry = {setId, pieces, cond, name: cond.getName(), id: cond.getId()};
                if (result.byName.has(entry.name) || result.byId.has(entry.id)) {
                    throw new Error(`Artifact set control "${entry.name}" (${entry.id}) is declared twice`);
                }
                result.byName.set(entry.name, entry);
                result.byId.set(entry.id, entry);
                controls.push(entry);
            }
        });
        result.bySet.set(setId, controls);
    }

    catalogs.set(DB, result);
    return result;
}

/**
 * @param {string} name
 * @returns {boolean} whether the setting is a set effect control of a profile
 */
export function isProfileControl(name) {
    return catalog().byName.has(name);
}

/**
 * @param {string} setId
 * @returns {Array.<{setId: string, pieces: number, cond: Condition, name: string, id: number}>}
 *     the set's controls, fewest pieces first
 */
export function setProfileControls(setId) {
    return [].concat(catalog().bySet.get(setId) || []);
}

/**
 * @param {Condition} cond a profile control
 * @returns {*} its "all on" value
 */
export function controlDefault(cond) {
    let value = Condition.allConditionsOn([cond])[cond.getName()];
    if (value !== undefined) {
        return value;
    }
    if (cond.getType() == 'dropdown_multiple') {
        return (cond.params.values || []).map((item) => item.value).join(';');
    }
    return '';
}

/**
 * @param {Condition} cond
 * @param {*} value
 * @returns {*} the value in its stored form
 */
function canonicalValue(cond, value) {
    switch (cond.getType()) {
    case 'checkbox':
        return !!value;
    case 'stacks':
        return Math.max(0, Math.min(cond.getMaxStacks(), parseInt(value, 10) || 0));
    case 'number':
        return Number(value) || 0;
    case 'dropdown_multiple': {
        let selected = ('' + value).split(';');
        return (cond.params.values || []).map((item) => '' + item.value)
            .filter((item) => selected.includes(item)).join(';');
    }
    default:
        return value === undefined || value === null ? '' : '' + value;
    }
}

/**
 * @param {Condition} cond
 * @param {*} a
 * @param {*} b
 * @returns {boolean} whether both values have the same effect
 */
function sameValue(cond, a, b) {
    let type = cond.getType();
    if (type == 'dropdown' || type == 'dropdown_multiple') {
        // An empty selection falls back to the dropdown's default value.
        let selected = (value) => cond.getSelectedValues({[cond.getName()]: value}).join(';');
        return selected(a) === selected(b);
    }
    return canonicalValue(cond, a) === canonicalValue(cond, b);
}

/**
 * @param {Object} input any settings
 * @returns {Object} a new sparse profile: the set effect controls of the
 *     input whose values differ from their defaults
 */
export function normalizeProfile(input) {
    let result = {};
    for (const [name, value] of Object.entries(input || {})) {
        const entry = catalog().byName.get(name);
        if (!entry || value === undefined || value === null) continue;

        const stored = canonicalValue(entry.cond, value);
        if (!sameValue(entry.cond, stored, controlDefault(entry.cond))) {
            result[name] = stored;
        }
    }
    return result;
}

/**
 * @param {Object} profile
 * @param {Object} changes settings; `undefined` or `null` resets a control
 *     to its default, anything that is not a set effect control is ignored
 * @returns {Object} a new profile
 */
export function patchProfile(profile, changes) {
    let result = Object.assign({}, profile);
    for (const [name, value] of Object.entries(changes || {})) {
        if (!isProfileControl(name)) continue;

        if (value === undefined || value === null) {
            delete result[name];
        } else {
            result[name] = value;
        }
    }
    return normalizeProfile(result);
}

/**
 * The values the effects of worn sets read.
 *
 * @param {Object} profile
 * @param {Object.<string, number>} setPieces pieces by set
 * @returns {Object} the controls of every set up to its pieces, from the
 *     profile or their defaults
 */
export function resolveArtifactSetSettings(profile, setPieces) {
    let result = {};
    for (const [setId, pieces] of Object.entries(setPieces || {})) {
        for (const entry of catalog().bySet.get(setId) || []) {
            if (entry.pieces > pieces) continue;
            result[entry.name] = Object.prototype.hasOwnProperty.call(profile, entry.name)
                ? profile[entry.name] : controlDefault(entry.cond);
        }
    }
    return result;
}

/**
 * Settings saved before profiles (the released character format 1) held
 * only the worn set's controls, and a control they did not hold was off.
 * Those controls keep what the build showed; every other control takes its
 * default.
 *
 * @param {Object} decoded the controls the old format held
 * @param {Object.<string, number>} setPieces pieces by worn set
 * @returns {Object} a profile
 */
export function migrateLegacyProfile(decoded, setPieces) {
    let result = {};
    for (const [setId, pieces] of Object.entries(setPieces || {})) {
        for (const entry of catalog().bySet.get(setId) || []) {
            if (entry.pieces > pieces) continue;
            result[entry.name] = Object.prototype.hasOwnProperty.call(decoded, entry.name)
                ? decoded[entry.name] : legacyValue(entry.cond);
        }
    }
    return normalizeProfile(result);
}

/**
 * @param {string} setId
 * @returns {Object} every control of the set switched off: unchecked, no
 *     stacks, zero, nothing selected
 */
export function setControlsOff(setId) {
    let result = {};
    for (const entry of catalog().bySet.get(setId) || []) {
        result[entry.name] = legacyValue(entry.cond);
    }
    return result;
}

function legacyValue(cond) {
    switch (cond.getType()) {
    case 'checkbox':
        return false;
    case 'stacks':
    case 'number':
        return 0;
    default:
        return '';
    }
}

/**
 * [count, ...[serialize ID, value]], sorted by ID. Checkboxes are 0 or 1,
 * dropdowns their selection IDs (a bit mask for multiple selection, 0 for
 * none), numbers their integer or tenths.
 *
 * @param {Object} profile
 * @returns {Array.<number>}
 */
export function serializeProfile(profile) {
    let normalized = normalizeProfile(profile);
    let entries = Object.keys(normalized).map((name) => catalog().byName.get(name))
        .sort((a, b) => a.id - b.id);

    let result = [entries.length];
    for (const entry of entries) {
        result.push(entry.id, encodeValue(entry.cond, normalized[entry.name]));
    }
    return result;
}

function encodeValue(cond, value) {
    switch (cond.getType()) {
    case 'checkbox':
        return value ? 1 : 0;
    case 'stacks':
        return canonicalValue(cond, value);
    case 'number':
        return Math.max(0, cond.params.format == 'decimal'
            ? Math.round(Number(value) * 10) : Math.round(Number(value)));
    default:
        return cond.getSelectedId({[cond.getName()]: value});
    }
}

/**
 * @param {Array.<number>} input consumed from the front
 * @returns {Object|null} the profile, or null for invalid data
 */
export function deserializeProfile(input) {
    let count = input.shift();
    if (!Number.isInteger(count) || count < 0 || count * 2 > input.length) {
        return null;
    }

    let result = {};
    for (let i = 0; i < count; ++i) {
        let id = input.shift();
        let raw = input.shift();
        if (!Number.isInteger(raw) || raw < 0) return null;

        // A retired control's value is read and dropped.
        if (catalog().retiredById.has(id)) continue;

        let entry = catalog().byId.get(id);
        if (!entry) return null;
        result[entry.name] = decodeValue(entry.cond, raw);
    }
    return normalizeProfile(result);
}

function decodeValue(cond, raw) {
    switch (cond.getType()) {
    case 'checkbox':
        return raw > 0;
    case 'stacks':
        return Math.min(raw, cond.getMaxStacks());
    case 'number':
        return cond.params.format == 'decimal' ? raw / 10 : raw;
    default:
        return cond.getValueById(raw);
    }
}
