import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const FlowerWreathedFeathers = new DbObjectWeapon({
    name: 'flower_wreathed_feathers',
    serializeId: 189,
    gameId: 15430,
    iconClass: "weapon-icon-bow-flower-wreathed-feathers",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.FlowerWreathedFeathers,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.flower_wreathed_feathers',
            description: 'talent_descr.flower_wreathed_feathers_1',
            stats: [
                new StatTable('text_percent', [percent(weaponPassiveTables.FlowerWreathedFeathers.p1[0])]),
            ],
        }),
        new ConditionStacks({
            name: 'flower_wreathed_feathers',
            serializeId: 1,
            title: 'talent_name.flower_wreathed_feathers',
            description: 'talent_descr.flower_wreathed_feathers_2',
            maxStacks: weaponPassiveTables.FlowerWreathedFeathers.p4[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_charged', percent(weaponPassiveTables.FlowerWreathedFeathers.p3)),
            ],
        }),
    ],
});

