import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";

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
            maxStacks: weaponPassiveTables.SilverLight.p3[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('mastery', weaponPassiveTables.SilverLight.p1),
            ],
        }),
    ],
});
