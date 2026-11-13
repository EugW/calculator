import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const WolfFang = new DbObjectWeapon({
    name: 'wolf_fang',
    serializeId: 146,
    gameId: 11424,
    iconClass: 'weapon-icon-sword-wolf-fang',
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.WolfFang,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_wolf_fang',
            description: 'talent_descr.weapon_wolf_fang_1',
            stats: [
                new StatTable('dmg_skill', percent(weaponPassiveTables.WolfFang.p1)),
                new StatTable('dmg_burst', percent(weaponPassiveTables.WolfFang.p1)),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_wolf_fang_1',
            serializeId: 1,
            title: 'talent_name.weapon_wolf_fang_2',
            description: 'talent_descr.weapon_wolf_fang_2',
            maxStacks: weaponPassiveTables.WolfFang.p3[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('crit_rate_skill', percent(weaponPassiveTables.WolfFang.p4)),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_wolf_fang_2',
            serializeId: 2,
            title: 'talent_name.weapon_wolf_fang_3',
            description: 'talent_descr.weapon_wolf_fang_3',
            maxStacks: weaponPassiveTables.WolfFang.p6[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('crit_rate_burst', percent(weaponPassiveTables.WolfFang.p7)),
            ],
        }),
    ],
});
