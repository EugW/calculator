import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SkywardHarp = new DbObjectWeapon({
    name: 'skyward_harp',
    serializeId: 37,
    gameId: 15501,
    iconClass: "weapon-icon-bow-skyward-harp",
    rarity: 5,
    weapon: 'bow',
    statTable: weaponStatTables.SkywardHarp,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_skyward_harp',
            description: 'talent_descr.bonus_crit_dmg',
            stats: [
                new StatTable('crit_dmg', weaponPassiveTables.SkywardHarp.crit_dmg),
            ],
        }),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_skyward_harp',
            description: 'talent_descr.weapon_skyward_harp',
            stats: [
                new StatTable('text_percent_chance', percent(weaponPassiveTables.SkywardHarp.p2)),
                new StatTable('text_percent_dmg', [percent(weaponPassiveTables.SkywardHarp.p3[0])]),
                new StatTable('text_decimal_cd', weaponPassiveTables.SkywardHarp.p4),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('skyward_harp_aoe', [percent(weaponPassiveTables.SkywardHarp.p3[0])]),
                }),
            ],
        }),
    ]
});
