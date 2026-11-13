import { ENEMY_PREFIX } from "./EnemyStats";

/**
 * Member addresses of stats in a team's compiled programs.
 *
 * A member's stats are addressed by its slot: `m1__atk_base` … `m4__atk_base`
 * (memberAddress); the enemy's are `enemy__res_pyro` (Team/EnemyStats). A
 * program compiled for one member (MemberEvaluation) is that member's view
 * of the team: its own stats keep their plain names, so features,
 * multipliers and every existing tree read them unchanged, and every other
 * member's stats keep their addresses (viewStat).
 *
 * A tree built by one member for another (a post-effect or a multiplier
 * delivered by a teammate) reads plain names and is addressed into the view
 * once (addressTree): its plain reads go to the member it reads (the source,
 * or the receiver for a read marked `scope: 'receiver'`) and its plain writes
 * to the receiver. A tree built in one member's view moves to another's view
 * through the addresses (moveTree): a teammate's hit in a rotation.
 */

const READ_TYPES = ['item_stat', 'item_stat_total'];
const WRITE_TYPES = ['post_effect', 'stat_increase', 'stat_decrease', 'stat_set'];
const MEMBER_ADDRESS = /^m(\d+)__/;

/**
 * @param {number} slot team slot, 0-based
 * @returns {string} the prefix addressing the member's stats
 */
export function memberAddress(slot) {
    return 'm' + (slot + 1) + '__';
}

/**
 * @param {number} slot team slot, 0-based
 * @param {number} viewSlot slot of the view (the program's member)
 * @returns {string} the member's prefix in the view: none for its own
 */
export function memberPrefix(slot, viewSlot) {
    return slot == viewSlot ? '' : memberAddress(slot);
}

/**
 * @param {string} stat
 * @returns {boolean} whether the name carries a member's or the enemy's address
 */
function isAddressed(stat) {
    return stat.startsWith(ENEMY_PREFIX) || MEMBER_ADDRESS.test(stat);
}

/**
 * @param {string} stat a stat named in the view of viewSlot
 * @param {number} viewSlot
 * @returns {string} its address
 */
export function absoluteStat(stat, viewSlot) {
    return isAddressed(stat) ? stat : memberAddress(viewSlot) + stat;
}

/**
 * @param {string} stat an addressed stat
 * @param {number} viewSlot
 * @returns {string} its name in the view of viewSlot
 */
export function viewStat(stat, viewSlot) {
    let address = memberAddress(viewSlot);
    return stat.startsWith(address) ? stat.slice(address.length) : stat;
}

/**
 * @param {string} stat a stat named in the view of fromSlot
 * @param {number} fromSlot
 * @param {number} toSlot
 * @returns {string} its name in the view of toSlot
 */
export function moveStat(stat, fromSlot, toSlot) {
    return viewStat(absoluteStat(stat, fromSlot), toSlot);
}

/**
 * Address a tree a member built for another into a view, in place. Plain
 * reads go to `slots.read`, or to `slots.receiver` when marked `scope:
 * 'receiver'`; plain writes go to `slots.write`. Names already addressed (a
 * named member's read, Team/TeamStats, is built in the view; the enemy's)
 * stay.
 *
 * @param {CBlock|CItem} tree
 * @param {{read: number, receiver: number, write: number}} slots
 * @param {number} viewSlot
 * @returns {CBlock|CItem} tree
 */
export function addressTree(tree, slots, viewSlot) {
    return renameTree(tree, (stat, node, isWrite) => {
        if (isAddressed(stat) || (!isWrite && node.scope == 'team')) {
            return stat;
        }
        let slot = isWrite ? slots.write : node.scope == 'receiver' ? slots.receiver : slots.read;
        return memberPrefix(slot, viewSlot) + stat;
    });
}

/**
 * Move a tree built in one member's view into another's, in place: every
 * stat it reads or writes keeps its address.
 *
 * @param {CBlock|CItem} tree
 * @param {number} fromSlot slot of the view the tree was built in
 * @param {number} toSlot slot of the view it moves to
 * @returns {CBlock|CItem} tree
 */
export function moveTree(tree, fromSlot, toSlot) {
    if (fromSlot == toSlot) {
        return tree;
    }
    return renameTree(tree, (stat) => moveStat(stat, fromSlot, toSlot));
}

/**
 * @param {CBlock|CItem} tree
 * @param {function(string, Object, boolean): string} rename new name of a
 *     stat of a node, given whether the node writes it
 * @returns {CBlock|CItem} tree
 */
function renameTree(tree, rename) {
    renameNode(tree, rename);
    if (tree.walk) {
        tree.walk((item) => renameNode(item, rename));
    }
    return tree;
}

function renameNode(node, rename) {
    let type = node.getType();

    if (READ_TYPES.includes(type)) {
        node.stat = rename(node.stat, node, false);
        if (node.replace) {
            node.replace = Object.fromEntries(Object.entries(node.replace)
                .map(([from, to]) => [rename(from, node, false), rename(to, node, false)]));
        }
        return;
    }

    if (WRITE_TYPES.includes(type)) {
        if (node.stat) {
            node.stat = rename(node.stat, node, true);
        }
        if (node.newName) {
            node.newName = rename(node.newName, node, true);
        }
        return;
    }

    if (typeof node.stat == 'string') {
        throw new Error(`Cannot address stat "${node.stat}" of tree node type "${type}"`);
    }
}
