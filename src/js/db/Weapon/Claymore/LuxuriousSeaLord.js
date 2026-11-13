import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const LuxuriousSeaLord = new DbObjectWeapon({
    name: 'luxurious_sea_lord',
    serializeId: 110,
    gameId: 12412,
    iconClass: "weapon-icon-claymore-luxurious-sea-lord",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.LuxuriousSeaLord,
    conditions: [
        new ConditionStaticRefine({
            // title: 'talent_name.weapon_luxurious_sea_lord',
            title: 'weapon_name.luxurious_sea_lord',
            description: 'talent_descr.weapon_luxurious_sea_lord',
            stats: [
                new StatTable('dmg_burst', percent(weaponPassiveTables.LuxuriousSeaLord.p1)),
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.LuxuriousSeaLord.p3)),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('titanic_tuna_dmg', percent(weaponPassiveTables.LuxuriousSeaLord.p3)),
                }),
            ],
        }),
    ],
});
