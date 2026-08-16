import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const SnareHook = new DbObjectWeapon({
    name: 'snare_hook',
    serializeId: 237,
    gameId: 15433,
    iconClass: "weapon-icon-bow-snare-hook",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.SnareHook,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_snare_hook',
            serializeId: 1,
            title: 'talent_name.weapon_snare_hook',
            description: 'talent_descr.weapon_snare_hook',
            stats: [
                new StatTable('mastery', [60, 75, 90, 105, 120]),
            ],
        }),
    ],
});
