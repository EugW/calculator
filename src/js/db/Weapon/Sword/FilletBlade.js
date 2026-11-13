import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const FilletBlade = new DbObjectWeapon({
    name: 'fillet_blade',
    serializeId: 9,
    gameId: 11305,
    iconClass: "weapon-icon-sword-fillet-blade",
    rarity: 3,
    weapon: 'sword',
    statTable: weaponStatTables.FilletBlade,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_fillet_blade',
            description: 'talent_descr.weapon_fillet_blade',
            stats: [
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.FilletBlade.p2)),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('weapon_additional_dmg', percent(weaponPassiveTables.FilletBlade.p2)),
                }),
            ],
        }),
    ],
});
