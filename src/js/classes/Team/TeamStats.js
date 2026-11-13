import { makeStatItem, makeStatPremodItem, makeStatTotalItem } from "../Feature2/Compile/Helpers";
import { PROGRAM } from "./Scope";

/**
 * Reads of a stat total on every team member, for a tree that combines them
 * (Nahida's A1 uses the highest Elemental Mastery in the team). Each read is
 * addressed to its member's namespace in the program and marked
 * `scope: 'team'`, so renaming a delivered tree leaves it alone; its value,
 * used when a read is folded into a constant, is that member's. Like every
 * post-effect read, it sees the stats as they were before the post-effect's
 * own priority.
 *
 * Without a team program (a BuildData built directly) the result reads only
 * the data's own stats.
 *
 * @param {string} stat total to read, such as 'mastery'
 * @param {BuildData} data data the tree is built from
 * @param {boolean} [premod] read each member's premod total (PostEffect/Channels)
 * @returns {Array.<CItem|CBlock>}
 */
export function teamStatTotalItems(stat, data, premod = false) {
    return memberStatItems(stat, data, premod ? makeStatPremodItem : makeStatTotalItem);
}

/** Reads one plain stat, such as burst_energy_cost, from every member. */
export function teamStatItems(stat, data) {
    return memberStatItems(stat, data, makeStatItem);
}

function memberStatItems(stat, data, makeItem) {
    let program = data.settings ? data.settings[PROGRAM] : undefined;
    if (!program) {
        return [makeItem(stat, data.stats)];
    }

    return program.members().map((member) => {
        let item = makeItem(stat, member.stats);
        markTeamRead(item, member.prefix);
        if (item.walk) {
            item.walk((node) => markTeamRead(node, member.prefix));
        }
        return item;
    });
}

function markTeamRead(node, prefix) {
    if (!['item_stat', 'item_stat_total'].includes(node.getType())) {
        return;
    }
    node.stat = prefix + node.stat;
    node.scope = 'team';
}
