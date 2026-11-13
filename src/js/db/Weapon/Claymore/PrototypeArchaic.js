import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const PrototypeArchaic = new DbObjectWeapon({
    name: 'prototype_archaic',
    serializeId: 68,
    gameId: 12406,
    iconClass: "weapon-icon-claymore-prototype-archaic",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.PrototypeArchaic,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_prototype_archaic',
            description: 'talent_descr.weapon_prototype_archaic',
            stats: [
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.PrototypeArchaic.p2)),
                new StatTable('text_percent_chance', [percent(weaponPassiveTables.PrototypeArchaic.p1[0])]),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('prototype_archaic_aoe', percent(weaponPassiveTables.PrototypeArchaic.p2)),
                }),
            ],
        }),
    ],
});
