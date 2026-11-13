import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const ProspectorsDrill = new DbObjectWeapon({
    name: 'prospectors_drill',
    serializeId: 160,
    gameId: 13427,
    iconClass: 'weapon-icon-polearm-prospectors-drill',
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.ProspectorsDrill,
    conditions: [
        new ConditionStacks({
            name: 'weapon_masons_ditty',
            serializeId: 1,
            title: 'talent_name.weapon_masons_ditty',
            description: 'talent_descr.weapon_masons_ditty',
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.ProspectorsDrill.p4)),
                new StatTable('dmg_anemo', percent(weaponPassiveTables.ProspectorsDrill.p5)),
                new StatTable('dmg_geo', percent(weaponPassiveTables.ProspectorsDrill.p5)),
                new StatTable('dmg_pyro', percent(weaponPassiveTables.ProspectorsDrill.p5)),
                new StatTable('dmg_electro', percent(weaponPassiveTables.ProspectorsDrill.p5)),
                new StatTable('dmg_hydro', percent(weaponPassiveTables.ProspectorsDrill.p5)),
                new StatTable('dmg_cryo', percent(weaponPassiveTables.ProspectorsDrill.p5)),
                new StatTable('dmg_dendro', percent(weaponPassiveTables.ProspectorsDrill.p5)),
            ],
        }),
    ],
});
