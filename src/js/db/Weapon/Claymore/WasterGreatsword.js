import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const WasterGreatsword = new DbObjectWeapon({
    name: 'waster_greatsword',
    serializeId: 265,
    gameId: 12101,
    iconClass: "weapon-icon-claymore-waster-greatsword",
    rarity: 1,
    weapon: 'claymore',
    maxLevel: 70,
    maxAscension: 4,
    maxRefinement: 1,
    statTable: weaponStatTables.WasterGreatsword,
});
