import { Condition } from "../Condition";
import { isEnemySetting } from "../CalcObject/Enemy";
import { isTeamSetting } from "./Settings";
import { reachesOthers } from "./Receivers";
import { isFloatingId } from "./SourceId";

const OBJECTS = {char: 1, weapon: 2, artifacts: 3};
const CONTROL_TYPES = ['checkbox', 'stacks', 'number', 'dropdown', 'dropdown_multiple'];
const catalogs = new WeakMap();

/** A saved input, as opposed to an effect or a shared team/enemy control. */
export function isMemberControl(cond) {
    return !!cond.getName() && !!cond.getId() && !cond.isRetired?.()
        && CONTROL_TYPES.includes(cond.getType())
        && !isTeamSetting(cond.getName()) && !isEnemySetting(cond.getName());
}

/**
 * Stable addresses of controls, including unequipped weapons and sets. A
 * choice survives removing its source or equipment and is inactive until
 * they return. Names are unique within the source's settings namespace;
 * the wire address also records the sheet (object and item ID).
 */
function definitions(sourceId) {
    let catalog = catalogs.get(DB);
    if (!catalog) {
        catalog = new Map();
        catalogs.set(DB, catalog);
    }
    // A floating weapon or set of the legacy source has no character: its
    // controls are a weapon's or a set's, shared by every such entry.
    if (isFloatingId(sourceId)) {
        sourceId = 0;
    }
    if (!catalog.has(sourceId)) {
        const result = [];
        const add = (object, itemId, conditions) => {
            for (const cond of Condition.unwrap(conditions)) {
                if (isMemberControl(cond)) result.push({object, itemId, cond});
            }
        };
        const char = DB.Chars.getById(sourceId);
        if (char) add('char', sourceId, char.getAllConditions().concat(DB.Conditions.Character));
        for (const weapon of DB.Weapons.getList(true)) {
            add('weapon', weapon.getId(), weapon.getConditions().concat(DB.Conditions.Weapon));
        }
        for (const set of DB.Artifacts.Sets.getList(true)) add('artifacts', set.getId(), set.getConditions(5));
        catalog.set(sourceId, result);
    }
    return catalog.get(sourceId);
}

export function conditionDefinition(sourceId, name) {
    return definitions(sourceId).find((item) => item.cond.getName() === name);
}

/**
 * @param {number} sourceId
 * @returns {boolean} whether it can name a source of a team: a character,
 *     or a floating entry of a legacy source (Team/SourceId)
 */
export function isSourceId(sourceId) {
    return !!DB.Chars.getById(sourceId) || isFloatingId(sourceId);
}

/** Only controls of the current build take effect; stored choices stay put. */
export function activeConditionValues(member, receiverId, values) {
    const inputs = values[member.getSourceId()]?.[receiverId];
    if (!inputs) return {};
    const names = new Set(Condition.unwrap(member.getConditions({objects: ['char', 'weapon', 'artifacts']}))
        .filter(isMemberControl).map((cond) => cond.getName()));
    return Object.fromEntries(Object.entries(inputs).filter(([name]) => names.has(name)));
}

/**
 * Controls used by deliveries, including a control whose derived setting
 * gates a hidden effect. Read the declarations, not a separate list of
 * character names. The same list serves the calculator and rotation UI.
 */
export function deliveredControlNames(member) {
    const conditions = member.getConditions({objects: ['char', 'weapon', 'artifacts']});
    const effects = [].concat(conditions, member.getPostEffects());
    for (const object of ['char', 'weapon', 'artifacts']) {
        // An entry of the legacy source has one of them.
        if (!member[object]) continue;
        effects.push(...member[object].getMultipliers(), ...member[object].getFeatures());
    }
    const names = new Set();
    const collect = (value, seen = new Set()) => {
        if (typeof value === 'string') names.add(value);
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        for (const [key, item] of Object.entries(value)) {
            names.add(key);
            collect(item, seen);
        }
    };
    for (const effect of effects) {
        if (reachesOthers(effect)) collect(effect.params || effect);
    }
    const controls = Condition.unwrap(conditions);
    let previousSize;
    do {
        previousSize = names.size;
        for (const cond of controls) {
            if (Object.keys(cond.params.settings || {}).some((name) => names.has(name))) collect(cond.params);
        }
    } while (names.size !== previousSize);
    return new Set(controls.filter((cond) => isMemberControl(cond) && names.has(cond.getName()))
        .map((cond) => cond.getName()));
}

/** Encode a value even when it is explicitly false, zero or empty. */
function encodeValue(cond, value) {
    const type = cond.getType();
    if (type === 'checkbox') return value ? 1 : 0;
    if (type === 'dropdown' || type === 'dropdown_multiple') {
        return cond.getSelectedId({[cond.getName()]: value}) || 0;
    }
    return Math.round(Number(value) * (cond.params.format === 'decimal' ? 10 : 1));
}

function decodeValue(cond, value) {
    if (cond.getType() === 'checkbox') return !!value;
    if (cond.getType() === 'dropdown' || cond.getType() === 'dropdown_multiple') return cond.getValueById(value) || '';
    return value / (cond.params.format === 'decimal' ? 10 : 1);
}

export function normalizeConditionValue(cond, value) {
    const encoded = encodeValue(cond, value);
    if (!Number.isSafeInteger(encoded) || encoded < 0) throw new Error('Invalid condition value');
    return decodeValue(cond, encoded);
}

/** [count, ...[source char, receiver char, object, item, control, value]]. */
export function serializeConditionValues(values) {
    const entries = [];
    for (const [sourceId, receivers] of Object.entries(values)) {
        for (const [receiverId, settings] of Object.entries(receivers)) {
            for (const [name, value] of Object.entries(settings)) {
                const definition = conditionDefinition(Number(sourceId), name);
                if (!definition) return null;
                const {object, itemId, cond} = definition;
                entries.push([Number(sourceId), Number(receiverId), OBJECTS[object], itemId, cond.getId(), encodeValue(cond, value)]);
            }
        }
    }
    entries.sort((a, b) => {
        for (let i = 0; i < 5; ++i) if (a[i] !== b[i]) return a[i] - b[i];
        return 0;
    });
    return [entries.length, ...entries.flat()];
}

export function deserializeConditionValues(input) {
    const count = input.shift();
    if (!Number.isInteger(count) || count < 0 || count > input.length / 6) return null;
    const result = {};
    for (let i = 0; i < count; ++i) {
        const [sourceId, receiverId, object, itemId, conditionId, value] = input.splice(0, 6);
        if (![sourceId, receiverId, object, itemId, conditionId, value].every((v) => Number.isSafeInteger(v) && v >= 0)
            || !isSourceId(sourceId) || !DB.Chars.getById(receiverId)) return null;
        const definition = definitions(sourceId).find((item) => OBJECTS[item.object] === object
            && item.itemId === itemId && item.cond.getId() === conditionId);
        if (!definition) return null;
        const {cond} = definition;
        const decoded = decodeValue(cond, value);
        if (encodeValue(cond, decoded) !== value) return null;
        const settings = (result[sourceId] ||= {})[receiverId] ||= {};
        if (Object.prototype.hasOwnProperty.call(settings, cond.getName())) return null;
        settings[cond.getName()] = decoded;
    }
    return result;
}
