import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const Messenger = new DbObjectWeapon({
    name: 'messenger',
    serializeId: 29,
    gameId: 15305,
    iconClass: "weapon-icon-bow-messenger",
    rarity: 3,
    weapon: 'bow',
    statTable: weaponStatTables.Messenger,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_messenger',
            description: 'talent_descr.weapon_messenger',
            stats: [
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.Messenger.p1)),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('messenger_aimed_hit', percent(weaponPassiveTables.Messenger.p1)),
                }),
            ],
        }),
    ],
});

