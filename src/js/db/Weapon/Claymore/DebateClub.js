import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const DebateClub = new DbObjectWeapon({
    name: 'debate_club',
    serializeId: 76,
    gameId: 12305,
    iconClass: "weapon-icon-claymore-debate-club",
    rarity: 3,
    weapon: 'claymore',
    statTable: weaponStatTables.DebateClub,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_debate_club',
            description: 'talent_descr.weapon_debate_club',
            stats: [
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.DebateClub.p1)),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('debate_club_aoe', percent(weaponPassiveTables.DebateClub.p1)),
                }),
            ],
        }),
    ],
});
