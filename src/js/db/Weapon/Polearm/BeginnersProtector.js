import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const BeginnersProtector = new DbObjectWeapon({
    name: 'beginners_protector',
    serializeId: 266,
    gameId: 13101,
    iconClass: "weapon-icon-polearm-beginners-protector",
    rarity: 1,
    weapon: 'polearm',
    maxLevel: 70,
    maxAscension: 4,
    maxRefinement: 1,
    statTable: weaponStatTables.BeginnersProtector,
});
