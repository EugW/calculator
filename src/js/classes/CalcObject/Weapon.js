import {CalcObject} from "../CalcObject";

export class CalcObjectWeapon extends CalcObject {
    constructor() {
        super();
        this.levels = {
            level: 1,
            ascension: 0,
            refine: 1,
        };
    }

    set(data) {
        super.set(data);
        this.setLevels(this.levels);
    }

    setLevels(data) {
        let maxLevel = this.object ? this.object.getMaxLevel() : 90;
        let maxAscension = this.object ? this.object.getMaxAscension() : 6;
        let maxRefinement = this.object ? this.object.getMaxRefinement() : 5;

        this.levels.level = Math.min(maxLevel, Math.max(1, data.level));
        this.levels.ascension = Math.min(maxAscension, Math.max(0, data.ascension));
        this.levels.refine = Math.min(maxRefinement, Math.max(1, data.refine));
    }

    getStats() {
        const result = super.getStats();

        if (this.object && this.object.refineTable) {
            for (let stat of this.object.refineTable) {
                result.stats.add(stat.getName(), stat.getValue(this.levels.refine));
            }
        }

        return result;
    }

    getSettings() {
        let result = super.getSettings();

        let weaponSettings = {
            weapon_level: this.levels.level,
            weapon_ascension: this.levels.ascension,
            weapon_refine: this.levels.refine,
        };

        if (this.object) {
            weaponSettings.weapon_id = this.object.getId();
            weaponSettings.weapon_type = this.object.weapon;
        }

        result = Object.assign(result, weaponSettings);

        return result;
    }

    getId() {
        if (this.object) {
            return this.object.getId();
        }

        return 0;
    }

    getName() {
        if (this.object) {
            return this.object.getName();
        }

        return '';
    }

    getConditions() {
        let result = super.getConditions();
        result = result.concat(DB.Conditions.Weapon);
        return result;
    }

    serialize(settings) {
        let result = [];

        if (!this.object) {
            return null;
        }

        result.push(this.object.getId());
        result.push(this.levels.level, this.levels.ascension, this.levels.refine);

        let condData = this.serializeConditions(settings);

        return result.concat(condData);
    }

    static deserialize(input) {
        let weapon = DB.Weapons.getById(input.shift());
        if (!weapon) return null;

        let level = input.shift();
        if (level < 1 || level > weapon.getMaxLevel()) return null;

        let ascension = input.shift();
        if (ascension < 0 || ascension > weapon.getMaxAscension()) return null;

        let refine = input.shift();
        if (refine < 0 || refine > weapon.getMaxRefinement()) return null;

        let result = new CalcObjectWeapon();
        result.set(weapon);

        result.setLevels({
            level: level,
            ascension: ascension,
            refine: refine || 1,
        });

        let settings = result.deserializeConditions(input);
        if (!settings) return null;

        result.setSettings(settings);

        return result;
    }
}
