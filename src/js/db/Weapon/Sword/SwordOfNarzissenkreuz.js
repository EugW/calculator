import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SwordOfNarzissenkreuz = new DbObjectWeapon({
    name: 'sword_of_narzissenkreuz',
    serializeId: 166,
    gameId: 11428,
    iconClass: "weapon-icon-sword-sword-of-narzissenkreuz",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.SwordOfNarzissenkreuz,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_sword_of_narzissenkreuz',
            description: 'talent_descr.weapon_sword_of_narzissenkreuz',
            stats: [
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.SwordOfNarzissenkreuz.p1)),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('sword_of_narzissenkreuz_dmg', percent(weaponPassiveTables.SwordOfNarzissenkreuz.p1)),
                }),
            ],
        }),
    ],
});
