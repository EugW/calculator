import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const CovenantOfFrostAndSnow = new DbObjectWeapon({
    name: 'covenant_of_frost_and_snow',
    serializeId: 257,
    gameId: 15436,
    iconClass: 'weapon-icon-bow-covenant-of-frost-and-snow',
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.CovenantOfFrostAndSnow,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_covenant_of_frost_and_snow',
            serializeId: 1,
            title: 'talent_name.weapon_covenant_of_frost_and_snow',
            description: 'talent_descr.weapon_covenant_of_frost_and_snow',
            stats: [
                new StatTable('mastery', [120, 150, 180, 210, 240]),
            ],
        }),
    ],
});
