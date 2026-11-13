import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanChar } from "../../../classes/Condition/Boolean/Char";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SwordofDescension = new DbObjectWeapon({
    name: 'sword_of_descension',
    serializeId: 21,
    gameId: 11412,
    iconClass: "weapon-icon-sword-sword-of-descension",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.SwordofDescension,
    conditions: [
        new ConditionBoolean({
            name: 'common.ps_network',
            serializeId: 1,
            title: 'talent_name.ps_network',
            description: 'talent_descr.ps_network',
        }),
        new ConditionStatic({
            title: 'talent_name.sword_of_descension',
            description: 'talent_descr.sword_of_descension_1',
            stats: {
                atk: weaponPassiveTables.SwordofDescension.p4[0],
            },
            subConditions: [
                new ConditionBooleanChar({
                    chars: ['traveler_anemo', 'traveler_geo', 'traveler_electro', 'taveler_dendro', 'traveler_hydro', 'traveler_pyro', 'traveler_cryo'],
                }),
                new ConditionBoolean({name: 'common.ps_network'}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.sword_of_descension',
            description: 'talent_descr.sword_of_descension_2',
            stats: {
                text_percent_chance: percent(weaponPassiveTables.SwordofDescension.p1[0]),
                text_percent_dmg: percent(weaponPassiveTables.SwordofDescension.p2[0]),
            },
            subConditions: [
                new ConditionBoolean({name: 'common.ps_network'}),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('sword_of_descension_dmg', [percent(weaponPassiveTables.SwordofDescension.p2[0])]),
                }),
            ],
            condition: new ConditionBoolean({name: 'common.ps_network'}),
        }),
    ],
});
