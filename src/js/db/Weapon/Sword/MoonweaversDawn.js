import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const MoonweaversDawn = new DbObjectWeapon({
    name: 'moonweavers_dawn',
    serializeId: 226,
    gameId: 11434,
    iconClass: "weapon-icon-sword-moonweavers-dawn",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.MoonweaversDawn,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_moonweavers_dawn',
            description: 'talent_descr.weapon_moonweavers_dawn',
            stats: [
                new StatTable('dmg_burst', [20, 25, 30, 35, 40]),
            ],
        }),
    ],
});
