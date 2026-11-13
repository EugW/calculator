import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const ViridescentHunt = new DbObjectWeapon({
    name: 'the_viridescent_hunt',
    serializeId: 40,
    gameId: 15409,
    iconClass: "weapon-icon-bow-the-viridescent-hunt",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.ViridescentHunt,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_viridescent_hunt',
            description: 'talent_descr.weapon_viridescent_hunt',
            stats: [
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.ViridescentHunt.p2)),
                new StatTable('text_percent_chance', [percent(weaponPassiveTables.ViridescentHunt.p1[0])]),
                new StatTable('text_number_cd', weaponPassiveTables.ViridescentHunt.p5),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('viridescent_hunt_whirl', percent(weaponPassiveTables.ViridescentHunt.p2)),
                }),
            ],
        }),
    ],
});
