import {DbObject} from "../DbObject";

export class DbObjectWeapon extends DbObject {
    constructor(data) {
        super(data);
        this.gameId = data.gameId;
        this.maxAscension = data.maxAscension || 6;
        this.maxLevel = data.maxLevel || 90;
        this.maxRefinement = data.maxRefinement || 5;
        this.refineTable = data.refineTable || [];
        this.weapon = data.weapon;
        this.settingsSets = data.settingsSets || [];
    }

    getName() {
        return 'weapon_name.'+ this.name;
    }

    getType() {
        return this.weapon;
    }

    getGameId() {
        return this.gameId;
    }

    getMaxAscension() {
        return this.maxAscension;
    }

    getMaxLevel() {
        return this.maxLevel;
    }

    getMaxRefinement() {
        return this.maxRefinement;
    }

    getSuggesterSettings() {
        return this.settingsSets;
    }
}
