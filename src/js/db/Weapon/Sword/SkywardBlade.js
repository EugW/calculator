import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SkywardBlade = new DbObjectWeapon({
    name: 'skyward_blade',
    serializeId: 19,
    gameId: 11502,
    iconClass: "weapon-icon-sword-skyward-blade",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.SkywardBlade,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_skyward_blade',
            description: 'talent_descr.bonus_crit_rate',
            stats: [
                new StatTable('crit_rate', weaponPassiveTables.SkywardBlade.crit_rate),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_skyward_blade',
            serializeId: 1,
            title: 'talent_name.weapon_skyward_blade',
            description: 'talent_descr.weapon_skyward_blade',
            stats: [
                new StatTable('atk_speed_normal', [percent(weaponPassiveTables.SkywardBlade.p3[0])]),
                new StatTable('move_speed', [percent(weaponPassiveTables.SkywardBlade.p2[0])]),
                new StatTable('text_percent', percent(weaponPassiveTables.SkywardBlade.p4)),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('skyward_blade_dmg', percent(weaponPassiveTables.SkywardBlade.p4)),
                }),
            ],
            // condition: new ConditionBooleanRefine({name: 'weapon_skyward_blade'}),
        }),
    ],
});
