import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const WhitelakeFrostfeather = new DbObjectWeapon({
    name: 'whitelake_frostfeather',
    serializeId: 248,
    gameId: 11520,
    iconClass: 'weapon-icon-sword-whitelake-frostfeather',
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.WhitelakeFrostfeather,
    conditions: [
        new ConditionStacks({
            name: 'weapon_whitelake_frostfeather',
            serializeId: 1,
            title: 'talent_name.weapon_whitelake_frostfeather',
            description: 'talent_descr.weapon_whitelake_frostfeather_1',
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', [8, 10, 12, 14, 16]),
            ],
        }),
        new ConditionBooleanValue({
            title: 'talent_name.weapon_whitelake_frostfeather',
            description: 'talent_descr.weapon_whitelake_frostfeather_2',
            levelSetting: 'weapon_refine',
            setting: 'weapon_whitelake_frostfeather',
            cond: 'ge',
            value: 3,
            stats: [
                new StatTable('crit_dmg_stellarglimmer', [50, 65, 80, 95, 110]),
                new StatTable('text_number_energy', [4, 4.5, 5, 5.5, 6]),
            ],
        }),
    ],
});
