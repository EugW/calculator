import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const HuntersBow = new DbObjectWeapon({
    name: 'hunters_bow',
    serializeId: 268,
    gameId: 15101,
    iconClass: "weapon-icon-bow-hunters-bow",
    rarity: 1,
    weapon: 'bow',
    maxLevel: 70,
    maxAscension: 4,
    maxRefinement: 1,
    statTable: weaponStatTables.HuntersBow,
});
