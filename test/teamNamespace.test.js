import { makeStatItem } from "../src/js/classes/Feature2/Compile/Helpers";
import { CStatIncrease } from "../src/js/classes/Feature2/Compile/Types/Block";
import { Stats } from "../src/js/classes/Stats";
import { addressTree, moveStat, moveTree } from "../src/js/classes/Team/Namespace";

// A tree reading its builder's ATK and the enemy's Pyro RES and writing DMG Bonus.
function tree() {
    const stats = new Stats({atk: 1, enemy__res_pyro: 0.1});
    return new CStatIncrease([makeStatItem('atk', stats), makeStatItem('enemy__res_pyro', stats)], {stat: 'dmg_all'});
}

function names(root) {
    const result = [root.stat];
    root.walk((node) => { if (node.stat) result.push(node.stat); });
    return result;
}

test("a stat keeps its address when it moves between views", () => {
    expect(moveStat('atk', 0, 1)).toBe('m1__atk');
    expect(moveStat('m2__atk', 0, 1)).toBe('atk');
    expect(moveStat('m3__atk', 0, 1)).toBe('m3__atk');
    expect(moveStat('enemy__res_pyro', 0, 1)).toBe('enemy__res_pyro');
    for (const stat of ['atk', 'm2__atk', 'm3__atk', 'enemy__res_pyro']) {
        expect(moveStat(moveStat(stat, 0, 2), 2, 0)).toBe(stat);
    }
});

test("a delivered tree reads its source and writes its receiver; the enemy stays", () => {
    // Built by slot 1 for slot 2, compiled in slot 0's view.
    expect(names(addressTree(tree(), {read: 1, receiver: 2, write: 2}, 0)))
        .toEqual(['m3__dmg_all', 'm2__atk', 'enemy__res_pyro']);
    // Compiled in the receiver's view.
    expect(names(addressTree(tree(), {read: 1, receiver: 2, write: 2}, 2)))
        .toEqual(['dmg_all', 'm2__atk', 'enemy__res_pyro']);
});

test("a hit moved into another view reads the same stats", () => {
    expect(names(moveTree(tree(), 1, 0))).toEqual(['m2__dmg_all', 'm2__atk', 'enemy__res_pyro']);
});
