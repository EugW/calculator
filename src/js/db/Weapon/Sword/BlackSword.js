import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureHeal } from "../../../classes/Feature2/Heal";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const BlackSword = new DbObjectWeapon({
    name: 'the_black_sword',
    serializeId: 4,
    gameId: 11409,
    iconClass: "weapon-icon-sword-the-black-sword",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.BlackSword,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_black_sword',
            description: 'talent_descr.weapon_black_sword',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.BlackSword.p1)),
                new StatTable('dmg_charged', percent(weaponPassiveTables.BlackSword.p1)),
                new StatTable('text_percent', percent(weaponPassiveTables.BlackSword.p2)),
            ],
        }),
    ],
    features: [
        new FeatureHeal({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('black_sword_heal', percent(weaponPassiveTables.BlackSword.p2)),
                }),
            ],
        }),
    ],
});
