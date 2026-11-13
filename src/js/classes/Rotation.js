import { Condition } from "./Condition";
import { Serializer } from "./Serializer";
import { Stats } from "./Stats";

export const MAX_DEPTH = 3;

const VERSION = 5;
/** The last version of one member's rotation; 4 was never released and is not read. */
const LAST_OWNER_VERSION = 3;

const ITEM_TYPE_FEATURE = 1;
const ITEM_TYPE_CONDITION = 2;
const ITEM_TYPE_REPEAT = 3;
const ITEM_TYPE_UPTIME = 4;
const ITEM_TYPE_ACTION = 5;

const ACTION_IDS = {
    switch: 2,
};
// Action 1 turned off a member's 5-piece set effects until set effects came
// from the member's set-bonus profile. It is read and dropped; never reuse it.
const RETIRED_ACTION_IDS = [1];

// Condition steps by type ID. A step on a member's object names the member
// (subtype 'member'); versions 1 to 3 wrote the owner's own objects without
// it (1-3).
const STEP_CHAR = 1;
const STEP_WEAPON = 2;
const STEP_ARTIFACTS = 3;
const STEP_ENEMY = 4;
const STEP_PARTY = 5;
const STEP_BUFFS = 6;
const STEP_MEMBER = 7;

const MEMBER_OBJECTS = {char: 1, weapon: 2, artifacts: 3};
const MEMBER_OBJECT_NAMES = {1: 'char', 2: 'weapon', 3: 'artifacts'};

/**
 * A team's rotation: hits and steps in order. Every hit and every step on a
 * member's object names its member by character ID (`charId`); steps on the
 * enemy and on the team's toggles name no member.
 *
 * Items:
 * - {type: 'feature', charId, feature, count, reaction}
 * - {type: 'condition', subtype: 'member', charId, object, itemId, conditionId, value, receiverId?}
 *   (object: char, weapon or artifacts; itemId: the character, weapon or set)
 * - {type: 'condition', subtype: 'enemy', itemId, conditionId, value}
 * - {type: 'condition', subtype: 'buffs', itemId: 0, conditionId, value}: a party condition
 * - {type: 'action', action, charId}: 'switch' puts the member on field
 * - {type: 'repeat', count, items}
 * - {type: 'uptime', percent, conditions, features}
 *
 * A rotation saved before rotations belonged to teams has no members
 * (charId 0): it is given to one (assignOwner).
 */
export class Rotation {
    constructor(data) {
        this.name = data && data.name || '';
        this.items = data && data.items || [];
    }

    addItem(item) {
        this.items.push(item);
    }

    getItems() {
        return this.items;
    }

    getfeaturesNames() {
        let result = getfeaturesRecursive(this.items);
        return Object.keys(result);
    }

    /**
     * @returns {boolean} whether the rotation has hits
     */
    hasFeatures() {
        return this.getfeaturesNames().length > 0;
    }

    getItem(id) {
        return searchItemRecursive(id, this.items);
    }

    replaceItem(id, newItem) {
        let item = this.getItem(id);
        if (!item) return;

        for (let prop of Object.getOwnPropertyNames(item)) {
            if (prop == 'id') continue;

            delete item[prop];
        }

        for (let prop of Object.getOwnPropertyNames(newItem)) {
            item[prop] = newItem[prop];
        }
    }

    deleteItem(id) {
        let delItem = this.getItem(id);
        if (!delItem) return;

        deleteItemRecursive(delItem, this.items);
    }

    clone() {
        return Rotation.deserialize(this.serialize());
    }

    getHash() {
        return Serializer.pack(this);
    }

    /**
     * Give the items that name no member (a rotation saved before rotations
     * belonged to teams, or a link to one) to a member.
     *
     * @param {number} charId
     * @returns {Rotation} this
     */
    assignOwner(charId) {
        walkItems(this.items, (item) => {
            if (isMemberItem(item) && !item.charId) {
                item.charId = charId;
            }
        });
        return this;
    }

    /**
     * The part of the rotation that is a member's own, as a character build
     * saves it: the member's hits and steps, and the steps on the enemy and
     * the team. Blocks left without items are dropped.
     *
     * @param {number} charId
     * @param {Array.<number>} [sourceIds] other sources whose steps stay: the
     *     entries of the legacy source a member is saved with (Team.withOnly)
     * @returns {Rotation} a new rotation
     */
    memberPart(charId, sourceIds = []) {
        const kept = new Set([charId].concat(sourceIds));
        return new Rotation({items: filterItems(this.clone().getItems(), (item) => !isMemberItem(item) || kept.has(item.charId))});
    }

    serialize() {
        let result = serializeItems(this.getItems());
        result.unshift(0); // reserved for properties
        result.unshift(VERSION);

        return result;
    }

    static deserialize(input) {
        let version = input.shift();
        let result = null;

        if ((version >= 1 && version <= LAST_OWNER_VERSION) || version == VERSION) {
            if (version >= 2) {
                input.shift(); // reserved for properties
            }
            let counter = {value: 0};
            let items = deserializeItems(input, counter, version);
            if (!items) return null;
            result = new Rotation({items: items});
        }

        return result;
    }

    /**
     * What a condition step changes: the condition, its owner and whether it
     * applies in a team. With a receiver, only that source/receiver pair
     * changes; otherwise the step changes the source's default input.
     *
     * @param {Object} item a condition step
     * @param {Team} [team] the team the step applies in
     * @returns {Object} {cond, typeId, icon, object ('char', 'weapon', 'artifacts',
     *     'enemy' or 'party'), dbObject, member (the member in team), invalid}
     */
    static getConditionData(item, team) {
        if (item.subtype == 'member') {
            return memberConditionData(item, team);
        }

        let result = {
            cond: null,
            typeId: 0,
            icon: '',
            object: '',
            dbObject: null,
            member: null,
            invalid: true,
        };

        let conditions = [];
        let validConditions = [];

        if (item.subtype == 'enemy') {
            conditions = conditions.concat(DB.Conditions.Enemy);
            result.typeId = STEP_ENEMY;
            result.object = 'enemy';

            if (item.itemId) {
                let enemy = DB.Enemies.getById(item.itemId);
                if (enemy) {
                    result.icon = 'sprite-enemy '+ enemy.getImage();
                    conditions = conditions.concat(enemy.getConditions());
                    validConditions = conditions;
                }
            }
        } else if (item.subtype == 'buffs') {
            // The party's conditions: their settings are the team's.
            let items = [];
            let selected;

            for (const buff of DB.Buffs.getList()) {
                items = items.concat(buff.getConditions());
            }

            for (let cond of Condition.unwrap(items)) {
                if (cond.getId() == item.conditionId) {
                    selected = cond;
                    break;
                }
            }

            if (selected) {
                result.typeId = STEP_BUFFS;
                result.object = 'party';
                result.icon   = selected.getIcon();
                conditions    = [selected];
                validConditions = conditions;
            }
        }

        for (const condItem of conditions) {
            if (condItem.getId() == item.conditionId) {
                result.cond = condItem;
                break;
            }
        }

        for (const condItem of validConditions) {
            if (condItem.getId() == item.conditionId) {
                result.invalid = false;
                break;
            }
        }

        return result;
    }

    static getArtSetByCondition(condId) {
        for (const set of DB.Artifacts.Sets.getList()) {
            for (const cond of set.getConditions(5)) {
                if (cond.getId() == condId) {
                    return set.getId();
                }
            }
        }

        return 0;
    }

    static getEnemyByCondition(condId) {
        for (const enemy of DB.Enemies.getList()) {
            for (const cond of enemy.getConditions()) {
                if (cond.getId() == condId) {
                    return enemy.getId();
                }
            }
        }

        return 0;
    }
}

/**
 * @param {Object} item
 * @returns {boolean} whether the item belongs to a member
 */
function isMemberItem(item) {
    return item.type == 'feature' || item.type == 'action' || (item.type == 'condition' && item.subtype == 'member');
}

function walkItems(items, callback) {
    for (const item of items) {
        callback(item);
        for (let key of ['items', 'conditions', 'features']) {
            if (Array.isArray(item[key])) {
                walkItems(item[key], callback);
            }
        }
    }
}

function filterItems(items, keep) {
    let result = [];
    for (const item of items) {
        if (item.type == 'repeat') {
            let subItems = filterItems(item.items, keep);
            if (subItems.length) result.push(Object.assign(item, {items: subItems}));
        } else if (item.type == 'uptime') {
            let conditions = filterItems(item.conditions, keep);
            let features = filterItems(item.features, keep);
            if (features.length) result.push(Object.assign(item, {conditions, features}));
        } else if (keep(item)) {
            result.push(item);
        }
    }
    return result;
}

/**
 * A step on a member's object: item {charId, object, itemId (character,
 * weapon or set ID), conditionId}. It applies when its member is in the team
 * and has that object: its character, its weapon, or artifacts with the
 * condition.
 *
 * @param {Object} item
 * @param {Team} [team]
 * @returns {Object} condition data, see Rotation.getConditionData
 */
function memberConditionData(item, team) {
    let result = {
        cond: null,
        typeId: STEP_MEMBER,
        icon: '',
        charIcon: '',
        object: item.object,
        dbObject: null,
        member: null,
        invalid: true,
    };

    let conditions = [];
    if (item.object == 'char') {
        let char = DB.Chars.getById(item.itemId);
        if (char) {
            result.dbObject = char;
            result.icon = 'sprite-char '+ char.getIcon();
            conditions = char.getAllConditions().concat(DB.Conditions.Character);
        }
    } else if (item.object == 'weapon') {
        let weapon = DB.Weapons.getById(item.itemId);
        conditions = [].concat(DB.Conditions.Weapon);
        if (weapon) {
            result.dbObject = weapon;
            result.icon = 'sprite-weapon-'+ weapon.weapon +' '+ weapon.getIcon();
            conditions = conditions.concat(weapon.getConditions());
        }
    } else if (item.object == 'artifacts') {
        let artifactSet = DB.Artifacts.Sets.getById(item.itemId);
        if (artifactSet) {
            result.dbObject = artifactSet;
            result.icon = 'sprite-artifact '+ artifactSet.getImage() +' flower';
            conditions = artifactSet.getConditions(5);
        }
    }

    result.cond = Condition.unwrap(conditions).find((cond) => cond.getId() == item.conditionId) || null;

    let char = DB.Chars.getById(item.charId);
    if (char) {
        result.charIcon = 'sprite-char ' + char.getIcon();
    }

    // The step's owner: a member, or an entry of the team's legacy source
    // (Team/Legacy), named as every source of effects is (getSourceId).
    let member = team ? team.getSources().find((other) => other.getSourceId() == item.charId) : null;
    if (member && result.cond) {
        result.member = member;
        if (item.object == 'char') {
            result.invalid = !member.char || member.char.getId() != item.itemId;
        } else if (item.object == 'weapon') {
            result.invalid = !member.weapon || !member.weapon.object || member.weapon.object.getId() != item.itemId;
        } else {
            result.invalid = !Condition.unwrap(member.getConditions({objects: [item.object]}))
                .some((cond) => cond.getId() == item.conditionId);
        }
    }

    if (team && item.receiverId) {
        result.receiver = team.getMembers().find((other) => other.char.getId() == item.receiverId) || null;
        if (!result.receiver) result.invalid = true;
    }
    return result;
}

function serializeItems(items) {
    let result = [];
    let count = 0;

    for (const item of items) {
        if (!item) continue;

        const start = result.length;
        const previousCount = count;
        result.push(item.disabled ? 1 : 0);
        result.push(item.collapsed ? 1 : 0);

        if (item.type == 'feature') {
            let id = DB.Features.Rotation.getByName(item.feature);

            if (id) {
                ++count;
                result.push(ITEM_TYPE_FEATURE);
                result.push(item.charId || 0);
                result.push(id);
                result.push(Math.max(1, item.count));
                result.push(item.reaction || 0); // reaction
            }
        } else if (item.type == 'condition') {
            let data = Rotation.getConditionData(item);

            if (data.cond) {
                ++count;
                result.push(ITEM_TYPE_CONDITION);
                result.push(data.typeId);
                if (item.subtype == 'member') {
                    result.push(item.charId || 0);
                    result.push(MEMBER_OBJECTS[item.object]);
                    result.push(item.receiverId || 0);
                }
                result.push(item.itemId);
                result.push(data.cond.params.serializeId);

                let value;
                if (data.cond.params.format == 'decimal') {
                    value = Math.floor(parseFloat(item.value) * 10);
                } else {
                    value = +item.value;
                }

                result.push(value || 0);
            }
        } else if (item.type == 'repeat') {
            ++count;
            result.push(ITEM_TYPE_REPEAT);
            result.push(Math.max(1, item.count));

            let subResult = serializeItems(item.items);
            result = result.concat(subResult);
        } else if (item.type == 'uptime') {
            ++count;
            result.push(ITEM_TYPE_UPTIME);
            result.push(1); // TODO type
            result.push(Math.min(100, Math.max(0, item.percent)));

            let subItems = [].concat(item.conditions, item.features);
            let subResult = serializeItems(subItems);
            result = result.concat(subResult);
        } else if (item.type == 'action') {
            ++count;
            result.push(ITEM_TYPE_ACTION);
            result.push(ACTION_IDS[item.action] || 0);
            result.push(item.charId || 0);
        }

        // An omitted step must not leave flags in the serialized stream.
        if (count === previousCount) result.length = start;
    }

    result.unshift(count);
    return result;
}

function deserializeItems(input, counter, version) {
    let count = input.shift();
    if (!Number.isInteger(count) || count < 0 || count > input.length) return null;
    let result = [];

    for (let i = 0; i < count; ++i) {
        let item = {disabled: false};

        if (version >= 2) {
            item.disabled = !!input.shift();
        }

        if (version >= 3) {
            item.collapsed = !!input.shift();
        }

        let type = input.shift();
        item.id = ++counter.value;

        if (type == ITEM_TYPE_FEATURE) {
            item.type = 'feature';
            // Up to version 3 a rotation was one member's: its hits name no one.
            item.charId = version > LAST_OWNER_VERSION ? input.shift() : 0;

            let featId = input.shift();
            item.feature = DB.Features.Rotation.getById(featId);

            if (!item.feature) return null;

            item.count = Math.max(1, input.shift());
            item.reaction = input.shift();
        } else if (type == ITEM_TYPE_CONDITION) {
            item.type = 'condition';
            let typeId = input.shift();

            if (typeId == STEP_CHAR || typeId == STEP_WEAPON || typeId == STEP_ARTIFACTS) {
                // A step on the rotation owner's own object (versions 1 to 3).
                item.subtype = 'member';
                item.object = MEMBER_OBJECT_NAMES[typeId];
            } else if (typeId == STEP_ENEMY) {
                item.subtype = 'enemy';
            } else if (typeId == STEP_PARTY) {
                item.subtype = 'party';
            } else if (typeId == STEP_BUFFS) {
                item.subtype = 'buffs';
            } else if (typeId == STEP_MEMBER) {
                item.subtype = 'member';
                item.charId = input.shift();
                item.object = MEMBER_OBJECT_NAMES[input.shift()];
                if (!item.object) return null;
                const receiverId = input.shift();
                if (!Number.isInteger(receiverId) || receiverId < 0 || (receiverId && !DB.Chars.getById(receiverId))) return null;
                if (receiverId) item.receiverId = receiverId;
            } else {
                return null;
            }

            item.itemId = input.shift();
            item.conditionId = input.shift();
            if (item.subtype == 'member' && item.charId === undefined) {
                // A character step names its character; the owner of a
                // weapon or artifacts step is assigned later.
                item.charId = item.object == 'char' ? item.itemId : 0;
            }

            let data = Rotation.getConditionData(item);
            let value = input.shift();
            if (data && data.cond && data.cond.params.format == 'decimal') {
                value = Stats.format('text_decimal', value / 10, {no_decimal_zero: true});
            }
            item.value = value;
        } else if (type == ITEM_TYPE_REPEAT) {
            item.type = 'repeat';
            item.count = Math.max(1, input.shift());
            item.items = deserializeItems(input, counter, version);
            if (!item.items) return null;
        } else if (type == ITEM_TYPE_UPTIME) {
            item.type = 'uptime';
            item.typeId = input.shift();
            item.percent = Math.min(100, Math.max(0, input.shift()));
            item.conditions = [];
            item.features = [];

            let subItems = deserializeItems(input, counter, version);
            if (!subItems) return null;

            for (let subItem of subItems) {
                if (subItem.type == 'condition') {
                    item.conditions.push(subItem);
                } else {
                    item.features.push(subItem);
                }
            }
        } else if (type == ITEM_TYPE_ACTION) {
            let actionType = input.shift();
            let charId = version > LAST_OWNER_VERSION ? input.shift() : 0;
            if (RETIRED_ACTION_IDS.includes(actionType)) {
                continue;
            }
            item.type = 'action';
            item.action = Object.keys(ACTION_IDS).find((name) => ACTION_IDS[name] === actionType) || 'unknown';
            item.charId = charId;
        } else {
            return null;
        }

        result.push(item);
    }

    return result;
}

function getfeaturesRecursive(items) {
    let result = {};

    for (const item of items) {
        if (item.type == 'feature') {
            result[item.feature] = 1;
        }

        for (let key of ['items', 'conditions', 'features']) {
            if (item.hasOwnProperty(key)) {
                let subResult = getfeaturesRecursive(item[key]);
                result = Object.assign(result, subResult);
            }
        }
    }
    return result;
}

function searchItemRecursive(id, items) {
    for (let item of items) {
        if (item.id == id) {
            return item;
        }


        for (let key of ['items', 'conditions', 'features']) {
            if (item.hasOwnProperty(key)) {
                let subResult = searchItemRecursive(id, item[key]);
                if (subResult) {
                    return subResult;
                }
            }
        }
    }

    return null;
}

function deleteItemRecursive(delItem, items) {
    let index = items.indexOf(delItem);
    if (index >= 0) {
        items.splice(index, 1);
        return 1;
    }

    for (let item of items) {
        for (let key of ['items', 'conditions', 'features']) {
            if (item.hasOwnProperty(key)) {
                let deleted = deleteItemRecursive(delItem, item[key]);
                if (deleted) return 1;
            }
        }
    }

    return 0;
}
