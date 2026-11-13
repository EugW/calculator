import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../../classes/Feature2/Multiplier/Target";
import { StatTable } from "../../../classes/StatTable";
import { ValueTable } from "../../../classes/ValueTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const RedhornStonethresher = new DbObjectWeapon({
    name: 'redhorn_stonethresher',
    serializeId: 117,
    gameId: 12510,
    iconClass: "weapon-icon-claymore-redhorn-stonethresher",
    rarity: 5,
    weapon: 'claymore',
    statTable: weaponStatTables.RedhornStonethresher,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_redhorn_stonethresher',
            description: 'talent_descr.weapon_redhorn_stonethresher',
            stats: [
                new StatTable('def_percent', weaponPassiveTables.RedhornStonethresher.def_percent),
                new StatTable('normal_base_def_percent', percent(weaponPassiveTables.RedhornStonethresher.p2)),
                new StatTable('charged_base_def_percent', percent(weaponPassiveTables.RedhornStonethresher.p2)),
            ],
        }),
    ],
    multipliers: [
        new FeatureMultiplier({
            scaling: 'def*',
            source: 'weapon',
            leveling: 'weapon_refine',
            values: new ValueTable(percent(weaponPassiveTables.RedhornStonethresher.p2)),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal', 'charged'],
            }),
        }),
    ],
});
