import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const ApprenticesNotes = new DbObjectWeapon({
    name: 'apprentices_notes',
    serializeId: 267,
    gameId: 14101,
    iconClass: "weapon-icon-catalyst-apprentices-notes",
    rarity: 1,
    weapon: 'catalyst',
    maxLevel: 70,
    maxAscension: 4,
    maxRefinement: 1,
    statTable: weaponStatTables.ApprenticesNotes,
});
