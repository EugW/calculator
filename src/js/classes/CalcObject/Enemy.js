import {CalcObject} from '../CalcObject';
import {Stats} from '../Stats';

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

    getStats() {
        return {
            stats: new Stats(),
            settings: {},
        };
    }

    getSettings() {
        let result = super.getSettings();

        let resistances = this.getResistances();

        result = Object.assign(result, {
            enemy_level: this.levels.level,
            enemy_res_phys: resistances.phys || 0,
            enemy_res_anemo: resistances.anemo || 0,
            enemy_res_cryo: resistances.cryo || 0,
            enemy_res_geo: resistances.geo || 0,
            enemy_res_hydro: resistances.hydro || 0,
            enemy_res_pyro: resistances.pyro || 0,
            enemy_res_electro: resistances.electro || 0,
            enemy_res_dendro: resistances.dendro || 0,
        });

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
