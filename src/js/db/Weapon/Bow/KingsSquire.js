import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const KingsSquire = new DbObjectWeapon({
    name: 'kings_squire',
    serializeId: 129,
    gameId: 15417,
    iconClass: "weapon-icon-bow-kings-squire",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.KingsSquire,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_kings_squire',
            serializeId: 1,
            title: 'talent_name.labyrinth_lords_instruction',
            description: 'talent_descr.labyrinth_lords_instruction',
            stats: [
                new StatTable('mastery', weaponPassiveTables.KingsSquire.p1),
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.KingsSquire.p3)),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('kings_squire_dmg', percent(weaponPassiveTables.KingsSquire.p3)),
                }),
            ],
        }),
    ],
});
