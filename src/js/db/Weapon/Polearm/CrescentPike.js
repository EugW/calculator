import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const CrescentPike = new DbObjectWeapon({
    name: 'crescent_pike',
    serializeId: 86,
    gameId: 13403,
    iconClass: "weapon-icon-polearm-crescent-pike",
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.CrescentPike,
    conditions: [
        new ConditionStaticRefine({
            name: 'weapon_crescent_pike',
            serializeId: 1,
            title: 'talent_name.weapon_crescent_pike',
            description: 'talent_descr.weapon_crescent_pike',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.CrescentPike.p1)),
            ]
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('weapon_additional_dmg', percent(weaponPassiveTables.CrescentPike.p1)),
                }),
            ],
        }),
    ],
});
