import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const KatsuragikiriNagamasa = new DbObjectWeapon({
    name: 'katsuragikiri_nagamasa',
    serializeId: 105,
    gameId: 12414,
    iconClass: "weapon-icon-claymore-katsuragikiri-nagamasa",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.KatsuragikiriNagamasa,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_samurai_conduct',
            description: 'talent_descr.weapon_samurai_conduct_1',
            stats: [
                new StatTable('dmg_skill', percent(weaponPassiveTables.KatsuragikiriNagamasa.p1)),
            ],
        }),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_samurai_conduct',
            description: 'talent_descr.weapon_samurai_conduct_2',
            stats: [
                new StatTable('text_decimal', weaponPassiveTables.KatsuragikiriNagamasa.p3),
            ],
        }),
    ],
});
