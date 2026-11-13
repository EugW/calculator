import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";


export const KitainCrossSpear = new DbObjectWeapon({
    name: 'kitain_cross_spear',
    serializeId: 103,
    gameId: 13414,
    iconClass: "weapon-icon-polearm-kitain-cross-spear",
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.KitainCrossSpear,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_samurai_conduct',
            description: 'talent_descr.weapon_samurai_conduct_1',
            stats: [
                new StatTable('dmg_skill', percent(weaponPassiveTables.KitainCrossSpear.p1)),
            ],
        }),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_samurai_conduct',
            description: 'talent_descr.weapon_samurai_conduct_2',
            stats: [
                new StatTable('text_decimal', weaponPassiveTables.KitainCrossSpear.p3),
            ],
        }),
    ],
});
