import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../../classes/Feature2/Multiplier/Target";
import { StatTable } from "../../../classes/StatTable";
import { ValueTable } from "../../../classes/ValueTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const HuntersPath = new DbObjectWeapon({
    name: 'hunters_path',
    serializeId: 125,
    gameId: 15511,
    iconClass: "weapon-icon-bow-hunters-path",
    rarity: 5,
    weapon: 'bow',
    statTable: weaponStatTables.HuntersPath,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.at_the_end_of_the_beast_paths',
            description: 'talent_descr.at_the_end_of_the_beast_paths_1',
            stats: [
                new StatTable('dmg_anemo', percent(weaponPassiveTables.HuntersPath.p1)),
                new StatTable('dmg_geo', percent(weaponPassiveTables.HuntersPath.p1)),
                new StatTable('dmg_pyro', percent(weaponPassiveTables.HuntersPath.p1)),
                new StatTable('dmg_electro', percent(weaponPassiveTables.HuntersPath.p1)),
                new StatTable('dmg_hydro', percent(weaponPassiveTables.HuntersPath.p1)),
                new StatTable('dmg_cryo', percent(weaponPassiveTables.HuntersPath.p1)),
                new StatTable('dmg_dendro', percent(weaponPassiveTables.HuntersPath.p1)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_hunters_path',
            serializeId: 1,
            title: 'talent_name.at_the_end_of_the_beast_paths',
            description: 'talent_descr.at_the_end_of_the_beast_paths_2',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.HuntersPath.p2)),
            ],
        }),
    ],
    multipliers: [
        new FeatureMultiplier({
            scaling: 'mastery*',
            leveling: 'weapon_refine',
            source: 'weapon',
            values: new ValueTable(percent(weaponPassiveTables.HuntersPath.p2)),
            condition: new ConditionBoolean({name: 'weapon_hunters_path'}),
            target: new FeatureMultiplierTarget({
                damageTypes: ['charged'],
            }),
        }),
    ],
});
