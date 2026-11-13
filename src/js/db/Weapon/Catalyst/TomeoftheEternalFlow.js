import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const TomeoftheEternalFlow = new DbObjectWeapon({
    name: 'tome_of_the_eternal_flow',
    serializeId: 164,
    gameId: 14514,
    iconClass: "weapon-icon-catalyst-tome-of-the-eternal-flow",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.TomeoftheEternalFlow,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_tome_of_the_eternal_flow',
            description: 'talent_descr.weapon_tome_of_the_eternal_flow_1',
            stats: [
                new StatTable('hp_percent', weaponPassiveTables.TomeoftheEternalFlow.hp_percent),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_tome_of_the_eternal_flow',
            serializeId: 1,
            title: 'talent_name.weapon_tome_of_the_eternal_flow',
            description: 'talent_descr.weapon_tome_of_the_eternal_flow_2',
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_charged', percent(weaponPassiveTables.TomeoftheEternalFlow.p3)),
            ],
        }),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_tome_of_the_eternal_flow',
            description: 'talent_descr.weapon_tome_of_the_eternal_flow_3',
            stats: [
                new StatTable('text_value', weaponPassiveTables.TomeoftheEternalFlow.p4),
            ],
            subConditions: [
                new ConditionBooleanValue({
                    setting: 'weapon_tome_of_the_eternal_flow',
                    cond: 'ge',
                    value: 3,
                }),
            ],
        }),
    ],
});

