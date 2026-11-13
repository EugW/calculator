import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const CashflowSupervision = new DbObjectWeapon({
    name: 'cashflow_supervision',
    serializeId: 163,
    gameId: 14513,
    iconClass: "weapon-icon-catalyst-cashflow-supervision",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.CashflowSupervision,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_cashflow_supervision',
            description: 'talent_descr.weapon_cashflow_supervision_1',
            stats: [
                new StatTable('atk_percent', weaponPassiveTables.CashflowSupervision.atk_percent),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_cashflow_supervision',
            serializeId: 1,
            title: 'talent_name.weapon_cashflow_supervision',
            description: 'talent_descr.weapon_cashflow_supervision_2',
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.CashflowSupervision.p3)),
                new StatTable('dmg_charged', percent(weaponPassiveTables.CashflowSupervision.p4)),
                new StatTable('dmg_stellarconduct', percent(weaponPassiveTables.CashflowSupervision.p6)),
            ],
        }),
        new ConditionBooleanValue({
            title: 'talent_name.weapon_cashflow_supervision',
            description: 'talent_descr.weapon_cashflow_supervision_3',
            levelSetting: 'weapon_refine',
            cond: 'ge',
            value: 3,
            setting: 'weapon_cashflow_supervision',
            stats: [
                new StatTable('atk_speed_normal', percent(weaponPassiveTables.CashflowSupervision.p5)),
            ],
        }),
    ],
});

