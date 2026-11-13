import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const Halberd = new DbObjectWeapon({
    name: 'halberd',
    serializeId: 83,
    gameId: 13302,
    iconClass: "weapon-icon-polearm-halberd",
    rarity: 3,
    weapon: 'polearm',
    statTable: weaponStatTables.Halberd,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_halberd',
            description: 'talent_descr.weapon_halberd',
            stats: [
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.Halberd.p1)),
            ]
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('halberd_dmg', percent(weaponPassiveTables.Halberd.p1)),
                }),
            ],
        }),
    ],
});

