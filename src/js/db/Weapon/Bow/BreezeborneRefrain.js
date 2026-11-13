import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const partyDmgBoost = percent(weaponPassiveTables.BreezeborneRefrain.p1);

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
                new StatTable('recharge', weaponPassiveTables.BreezeborneRefrain.recharge),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_breezeborne_refrain_points',
            serializeId: 1,
            title: 'talent_name.weapon_breezeborne_refrain_points',
            description: 'talent_descr.weapon_breezeborne_refrain_points',
            maxStacks: weaponPassiveTables.BreezeborneRefrain.p2[0],
        }),
        new ConditionBooleanValue({
            title: 'talent_name.weapon_breezeborne_refrain',
            description: 'talent_descr.weapon_breezeborne_refrain_party',
            cond: 'ge',
            value: weaponPassiveTables.BreezeborneRefrain.p2[0],
            setting: 'weapon_breezeborne_refrain_points',
            levelSetting: 'weapon_refine',
            receivers: RECEIVERS.TEAM,
            stack: 'breezeborne_refrain',
            stats: [
                new StatTable('dmg_stellarconduct', partyDmgBoost),
                new StatTable('dmg_stellarswirl', partyDmgBoost),
            ],
        }),
    ],
});
