import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const DawningFrost = new DbObjectWeapon({
    name: 'dawning_frost',
    serializeId: 235,
    gameId: 14434,
    iconClass: "weapon-icon-catalyst-dawning-frost",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.DawningFrost,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_dawning_frost',
            serializeId: 1,
            title: 'talent_name.weapon_dawning_frost',
            description: 'talent_descr.weapon_dawning_frost_1',
            stats: [
                new StatTable('mastery', [72, 90, 108, 126, 144]),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_dawning_frost_2',
            serializeId: 2,
            title: 'talent_name.weapon_dawning_frost',
            description: 'talent_descr.weapon_dawning_frost_2',
            stats: [
                new StatTable('mastery', [48, 60, 72, 84, 96]),
            ],
        }),
    ],
});
