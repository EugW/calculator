import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

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
            maxStacks: weaponPassiveTables.WhitelakeFrostfeather.p4[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.WhitelakeFrostfeather.p2)),
            ],
        }),
        new ConditionBooleanValue({
            title: 'talent_name.weapon_whitelake_frostfeather',
            description: 'talent_descr.weapon_whitelake_frostfeather_2',
            levelSetting: 'weapon_refine',
            setting: 'weapon_whitelake_frostfeather',
            cond: 'ge',
            value: weaponPassiveTables.WhitelakeFrostfeather.p4[0],
            stats: [
                new StatTable('crit_dmg_stellarglimmer', percent(weaponPassiveTables.WhitelakeFrostfeather.p5)),
                new StatTable('text_number_energy', weaponPassiveTables.WhitelakeFrostfeather.p1),
            ],
        }),
    ],
});
