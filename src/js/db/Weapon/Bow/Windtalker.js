import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const Windtalker = new DbObjectWeapon({
    name: 'windtalker',
    serializeId: 263,
    gameId: 15437,
    iconClass: 'weapon-icon-bow-windtalker',
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.Windtalker,
    beta: true,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_windtalker',
            description: 'talent_descr.weapon_windtalker_base',
            stats: [
                new StatTable('recharge', [20, 25, 30, 35, 40]),
                new StatTable('text_dmg_party', [24, 30, 36, 42, 48]),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_windtalker_points',
            serializeId: 1,
            title: 'talent_name.weapon_windtalker_points',
            description: 'talent_descr.weapon_windtalker_points',
            maxStacks: 3,
        }),
        new ConditionBooleanValue({
            title: 'talent_name.weapon_windtalker_party',
            description: 'talent_descr.weapon_windtalker_party',
            cond: 'ge',
            value: 3,
            setting: 'weapon_windtalker_points',
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_stellarconduct', [24, 30, 36, 42, 48]),
                new StatTable('dmg_stellarswirl', [24, 30, 36, 42, 48]),
            ],
        }),
    ],
});
