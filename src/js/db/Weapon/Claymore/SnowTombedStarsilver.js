import { ConditionEnemyStatus } from "../../../classes/Condition/Boolean/EnemyStatus";
import { ConditionNot } from "../../../classes/Condition/Not";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SnowTombedStarsilver = new DbObjectWeapon({
    name: 'snow_tombed_starsilver',
    serializeId: 74,
    gameId: 12411,
    iconClass: "weapon-icon-claymore-snow-tombed-starsilver",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.SnowTombedStarsilver,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_frost_burial',
            description: 'talent_descr.weapon_frost_burial_passive',
            stats: [
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.SnowTombedStarsilver.p2)),
                new StatTable('text_percent_chance', percent(weaponPassiveTables.SnowTombedStarsilver.p1)),
            ],
        }),
        new ConditionStaticRefine({
            serializeId: 1,
            title: 'talent_name.weapon_frost_burial',
            description: 'talent_descr.weapon_frost_burial',
            stats: [
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.SnowTombedStarsilver.p3)),
            ],
            subConditions: [
                new ConditionEnemyStatus({
                    status: ['cryo'],
                }),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('everfrost', percent(weaponPassiveTables.SnowTombedStarsilver.p2)),
                }),
            ],
            condition: new ConditionNot([
                new ConditionEnemyStatus({status: ['cryo']}),
            ]),
        }),
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('everfrost', percent(weaponPassiveTables.SnowTombedStarsilver.p3)),
                }),
            ],
            condition: new ConditionEnemyStatus({status: ['cryo']}),
        }),
    ],
});
