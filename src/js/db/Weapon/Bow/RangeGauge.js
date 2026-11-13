import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const RangeGauge = new DbObjectWeapon({
    name: 'range_gauge',
    serializeId: 161,
    gameId: 15427,
    iconClass: 'weapon-icon-bow-range-gauge',
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.RangeGauge,
    conditions: [
        new ConditionStacks({
            name: 'weapon_masons_ditty',
            serializeId: 1,
            title: 'talent_name.weapon_masons_ditty',
            description: 'talent_descr.weapon_masons_ditty',
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.RangeGauge.p4)),
                new StatTable('dmg_anemo', percent(weaponPassiveTables.RangeGauge.p5)),
                new StatTable('dmg_geo', percent(weaponPassiveTables.RangeGauge.p5)),
                new StatTable('dmg_pyro', percent(weaponPassiveTables.RangeGauge.p5)),
                new StatTable('dmg_electro', percent(weaponPassiveTables.RangeGauge.p5)),
                new StatTable('dmg_hydro', percent(weaponPassiveTables.RangeGauge.p5)),
                new StatTable('dmg_cryo', percent(weaponPassiveTables.RangeGauge.p5)),
                new StatTable('dmg_dendro', percent(weaponPassiveTables.RangeGauge.p5)),
            ],
        }),
    ],
});
