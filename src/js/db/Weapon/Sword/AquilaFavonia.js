import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureHeal } from "../../../classes/Feature2/Heal";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const AquilaFavonia = new DbObjectWeapon({
    name: 'aquila_favonia',
    serializeId: 2,
    gameId: 11501,
    iconClass: "weapon-icon-sword-aquila-favonia",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.AquilaFavonia,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_aquila_favonia',
            description: 'talent_descr.bonus_atk',
            stats: [
                new StatTable('atk_percent', weaponPassiveTables.AquilaFavonia.atk_percent),
            ],
        }),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_aquila_favonia',
            description: 'talent_descr.weapon_aquila_favonia',
            stats: [
                new StatTable('text_percent_hp', percent(weaponPassiveTables.AquilaFavonia.p2)),
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.AquilaFavonia.p3)),
            ],
        }),
    ],
    features: [
        new FeatureHeal({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('aquila_favonia_heal', percent(weaponPassiveTables.AquilaFavonia.p2)),
                }),
            ],
        }),
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('aquila_favonia_aoe', percent(weaponPassiveTables.AquilaFavonia.p3)),
                }),
            ],
        }),
    ],
});
