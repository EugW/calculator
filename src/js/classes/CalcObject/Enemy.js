import {CalcObject} from '../CalcObject';
import {Condition} from '../Condition';
import {Stats} from '../Stats';

/**
 * The enemy of a new team: the first enemy of the database.
 *
 * @returns {CalcObjectEnemy}
 */
export function defaultEnemy() {
    let enemy = new CalcObjectEnemy();
    enemy.set(DB.Enemies.getFirst().getFirst());
    return enemy;
}

const enemySettingRegistries = new WeakMap();

/**
 * @param {string} name
 * @returns {boolean} whether a setting belongs to an enemy: its level, its
 *     type or a condition of any enemy
 */
export function isEnemySetting(name) {
    let enemySettingNames = enemySettingRegistries.get(DB);
    if (!enemySettingNames) {
        let conditions = [...DB.Conditions.Enemy];
        for (let enemy of DB.Enemies.getList(true)) {
            conditions.push(...enemy.getConditions());
        }
        enemySettingNames = new Set(['enemy_level', 'enemy_type']);
        for (let cond of Condition.unwrap(conditions)) {
            if (cond.getName()) enemySettingNames.add(cond.getName());
        }
    }
    enemySettingRegistries.set(DB, enemySettingNames);
    return enemySettingNames.has(name);
}

const RAW_RESISTANCES = ['anemo', 'cryo', 'dendro', 'electro', 'geo', 'hydro', 'phys', 'pyro'];
const RAW_RESISTANCES_TYPE_LEGACY = 1;
const RAW_RESISTANCES_TYPE = 3;
const RAW_RESISTANCES_LEGACY_OFFSET = 100;
const RAW_RESISTANCES_OFFSET = 300;

export class CalcObjectEnemy extends CalcObject {
    constructor() {
        super();
        this.levels = {
            level : 1,
        };
        this.resistances = {
            phys: 0,
            anemo: 0,
            cryo: 0,
            geo: 0,
            hydro: 0,
            pyro: 0,
            electro: 0,
            dendro: 0,
        };
    }

    setLevels(data) {
        this.levels.level = data.level;
    }

    setResistances(data) {
        for (const res of RAW_RESISTANCES) {
            this.resistances[res] = parseInt(data[res]) || 0;
        }
    }

    getResistances() {
        if (this.object) {
            return this.object.getResistances();
        }

        return this.resistances;
    }

    /**
     * The enemy's base RES, as its stats: what changes its RES (a shred, a
     * shield state) adds to them, and the enemy's stats are its total RES
     * (see TeamEvaluation.enemyStats).
     *
     * @returns {{stats: Stats, settings: Object}}
     */
    getStats() {
        let stats = new Stats();
        let resistances = this.getResistances();
        for (const res of RAW_RESISTANCES) {
            stats.add('enemy_res_' + res, resistances[res] || 0);
        }

        return {
            stats: stats,
            settings: {},
        };
    }

    getSettings() {
        let result = super.getSettings();
        result.enemy_level = this.levels.level;

        if (this.object) {
            result.enemy_type = this.object.type;
            result = Object.assign(result, this.object.getSettings());
        }

        return result;
    }

    getConditions() {
        let result = super.getConditions();

        result = result.concat(DB.Conditions.Enemy);

        return result;
    }

    serialize(settings) {
        let result = [];

        result.push(this.levels.level);

        if (this.object) {
            result.push(2); // 2 - mob DB

            result.push(this.object.getId());
        } else {
            result.push(RAW_RESISTANCES_TYPE); // raw resists

            for (const res of RAW_RESISTANCES) {
                result.push(this.resistances[res] + RAW_RESISTANCES_OFFSET);
            }
        }

        let condData = this.serializeConditions(settings);
        return result.concat(condData);
    }

    static deserialize(input) {
        let level = input.shift();
        if (level < 1 || level > 110) return null;

        let type = input.shift();
        let result = new CalcObjectEnemy();
        result.setLevels({level: level});

        if (type == RAW_RESISTANCES_TYPE_LEGACY || type == RAW_RESISTANCES_TYPE) {
            let offset = type == RAW_RESISTANCES_TYPE_LEGACY
                ? RAW_RESISTANCES_LEGACY_OFFSET
                : RAW_RESISTANCES_OFFSET;
            let resists = {};

            for (const res of RAW_RESISTANCES) {
                let value = input.shift() - offset;
                if (value < -300 || value > 1000) return null;

                resists[res] = value;
            }

            result.setResistances(resists);
        } else if (type == 2) {
            let enemy = DB.Enemies.getById(input.shift());
            if (!enemy) return null;

            result.set(enemy);
        } else {
            return null;
        }

        let settings = result.deserializeConditions(input);
        if (!settings) return null;

        result.setSettings(settings);

        return result;
    }
}
