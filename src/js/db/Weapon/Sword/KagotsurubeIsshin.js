import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const KagotsurubeIsshin = new DbObjectWeapon({
    name: 'kagotsurube_isshin',
    serializeId: 124,
    gameId: 11416,
    iconClass: "weapon-icon-sword-kagotsurube-isshin",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.KagotsurubeIsshin,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_kagotsurube_isshin',
            serializeId: 1,
            title: 'talent_name.weapon_kagotsurube_isshin',
            description: 'talent_descr.weapon_kagotsurube_isshin',
            stats: [
                new StatTable('text_percent', [percent(weaponPassiveTables.KagotsurubeIsshin.p1[0])]),
                new StatTable('atk_percent', [percent(weaponPassiveTables.KagotsurubeIsshin.p2[0])]),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('kagotsurube_isshin_dmg', [percent(weaponPassiveTables.KagotsurubeIsshin.p1[0])]),
                }),
            ],
        }),
    ],
});
