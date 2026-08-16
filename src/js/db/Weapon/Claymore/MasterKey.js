import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const MasterKey = new DbObjectWeapon({
    name: 'master_key',
    serializeId: 227,
    gameId: 12433,
    iconClass: "weapon-icon-claymore-master-key",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.MasterKey,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_master_key',
            serializeId: 1,
            title: 'talent_name.weapon_master_key',
            description: 'talent_descr.weapon_master_key',
            stats: [
                new StatTable('mastery', [60, 75, 90, 105, 120]),
            ],
        }),
    ],
});
