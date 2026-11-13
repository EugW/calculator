import { Stats } from "../Stats";

/**
 * Stats that describe the enemy, not an attacker: its RES and DEF
 * reductions. Whatever effect lowers them (a character's shred, a set, the
 * enemy's own state), the team has one enemy, so they are the enemy's stats:
 * each effect counts once, whichever members it reaches.
 *
 * DEF ignore (def_ignore, def_ignore_skill, ...) is a property of an attack:
 * an attacker stat.
 */
const ENEMY_STATS = /^enemy_(res_(phys|anemo|cryo|dendro|electro|geo|hydro|pyro)|def_reduce)$/;

/**
 * Prefix of the enemy's stats in a compiled program (a teammate's is
 * `m2__`, see Team/Namespace). In it a stat is named for what it is on the
 * enemy: effects write enemy_res_pyro, a program reads enemy__res_pyro.
 */
export const ENEMY_PREFIX = 'enemy__';

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isEnemyStat(name) {
    return ENEMY_STATS.test(name);
}

/**
 * @param {string} name an enemy stat, such as enemy_res_pyro
 * @returns {string} its name in a program, such as enemy__res_pyro
 */
export function enemyStatName(name) {
    return ENEMY_PREFIX + name.replace(/^enemy_/, '');
}

/**
 * @param {string} name a stat an effect writes, such as enemy_res_pyro or atk
 * @returns {string} its name in a program: the enemy's for an enemy stat
 */
export function programStatName(name) {
    return isEnemyStat(name) ? enemyStatName(name) : name;
}

/**
 * @param {string} name a stat of a program
 * @returns {string|null} the enemy stat it is (enemy__res_pyro: enemy_res_pyro), or null
 */
export function enemyStatOf(name) {
    return name.startsWith(ENEMY_PREFIX) ? 'enemy_' + name.slice(ENEMY_PREFIX.length) : null;
}

/**
 * @param {Stats} stats
 * @returns {{enemy: Stats, other: Stats}}
 */
export function splitEnemyStats(stats) {
    let enemy = new Stats();
    let other = new Stats();
    for (let name of Object.keys(stats || {})) {
        (isEnemyStat(name) ? enemy : other)[name] = stats[name];
    }
    return {enemy, other};
}
