import { Condition } from '../../../classes/Condition';
import { getStackKey } from '../../../classes/Team/Stacking';
import { Lang } from '../../Lang';

const WEAPON_TYPES = ['sword', 'claymore', 'polearm', 'bow', 'catalyst'];

let lang = new Lang();
let names = null;

/**
 * A readable name of a stack key. A part of an effect (one of the
 * Millennial Movement buffs, one element of Viridescent Venerer) has its own
 * string, `stack_key.<key>`; any other key is named after the weapon, set,
 * character or buff that declares it.
 *
 * @param {Team} team
 * @param {string} key
 * @returns {string}
 */
export function stackKeyTitle(team, key) {
    let part = lang.get('stack_key.' + key);
    if (part != 'stack_key.' + key) {
        return part;
    }

    let name = declaringNames()[key];
    return name ? lang.get(name) : key;
}

/**
 * @returns {Object} stack key => lang key of what declares it
 */
function declaringNames() {
    if (names) {
        return names;
    }

    names = {};
    let add = (items, name) => {
        for (let item of items) {
            let key = getStackKey(item);
            if (key && !names[key]) {
                names[key] = name || (item.params && item.params.title);
            }
        }
    };
    let itemsOf = (object, arg) => {
        return Condition.unwrap(object.getConditions(arg) || [])
            .concat(object.getPostEffects ? object.getPostEffects(arg) || [] : [])
            .concat(object.getMultipliers ? object.getMultipliers(arg) || [] : []);
    };

    for (let type of WEAPON_TYPES) {
        for (let weapon of DB.Weapons.get(type).getList(true)) {
            add(itemsOf(weapon), weapon.getName());
        }
    }
    for (let set of DB.Artifacts.Sets.getList(true)) {
        add(itemsOf(set, 5), set.getName());
    }
    for (let char of DB.Chars.getList(true)) {
        add(itemsOf(char), char.getName());
    }
    for (let buff of DB.Buffs.getList()) {
        add(itemsOf(buff), '');
    }

    return names;
}
