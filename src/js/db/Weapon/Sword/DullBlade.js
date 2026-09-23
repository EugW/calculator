import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const DullBlade = new DbObjectWeapon({
    name: 'dull_blade',
    serializeId: 264,
    gameId: 11101,
    iconClass: "weapon-icon-sword-dull-blade",
    rarity: 1,
    weapon: 'sword',
    maxLevel: 70,
    maxAscension: 4,
    maxRefinement: 1,
    statTable: weaponStatTables.DullBlade,
});
