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

export const DragonspineSpear = new DbObjectWeapon({
    name: 'dragonspine_spear',
    serializeId: 92,
    gameId: 13409,
    iconClass: "weapon-icon-polearm-dragonspine-spear",
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.DragonspineSpear,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_frost_burial',
            description: 'talent_descr.weapon_frost_burial_passive',
            stats: [
                new StatTable('text_percent_chance', percent(weaponPassiveTables.DragonspineSpear.p1)),
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.DragonspineSpear.p2)),
            ],
        }),
        new ConditionStaticRefine({
            serializeId: 1,
            title: 'talent_name.weapon_frost_burial',
            description: 'talent_descr.weapon_frost_burial',
            stats: [
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.DragonspineSpear.p3)),
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
                    values: new StatTable('everfrost', percent(weaponPassiveTables.DragonspineSpear.p2)),
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
                    values: new StatTable('everfrost', percent(weaponPassiveTables.DragonspineSpear.p3)),
                }),
            ],
            condition: new ConditionEnemyStatus({status: ['cryo']}),
        }),
    ],
});

