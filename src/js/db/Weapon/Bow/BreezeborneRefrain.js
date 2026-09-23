import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const partyDmgBoost = [24, 30, 36, 42, 48];

export const BreezeborneRefrain = new DbObjectWeapon({
    name: 'breezeborne_refrain',
    serializeId: 263,
    gameId: 15437,
    iconClass: 'weapon-icon-bow-breezeborne-refrain',
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.BreezeborneRefrain,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_breezeborne_refrain',
            description: 'talent_descr.weapon_breezeborne_refrain_base',
            stats: [
                new StatTable('recharge', [20, 25, 30, 35, 40]),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_breezeborne_refrain_points',
            serializeId: 1,
            title: 'talent_name.weapon_breezeborne_refrain_points',
            description: 'talent_descr.weapon_breezeborne_refrain_points',
            maxStacks: 3,
        }),
        new ConditionBooleanValue({
            title: 'talent_name.weapon_breezeborne_refrain',
            description: 'talent_descr.weapon_breezeborne_refrain_party',
            cond: 'ge',
            value: 3,
            setting: 'weapon_breezeborne_refrain_points',
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_stellarconduct', partyDmgBoost),
                new StatTable('dmg_stellarswirl', partyDmgBoost),
            ],
        }),
    ],
});
