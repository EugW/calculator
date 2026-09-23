import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const SilverLight = new DbObjectWeapon({
    name: 'silver_light',
    serializeId: 259,
    gameId: 11438,
    iconClass: 'weapon-icon-sword-silver-light',
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.SilverLight,
    conditions: [
        new ConditionStacks({
            name: 'weapon_silver_light_stacks',
            serializeId: 1,
            title: 'talent_name.weapon_silver_light',
            description: 'talent_descr.weapon_silver_light',
            maxStacks: 2,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('mastery', [52, 65, 78, 91, 104]),
            ],
        }),
    ],
});
