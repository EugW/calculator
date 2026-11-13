import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const WhiteIronGreatsword = new DbObjectWeapon({
    name: 'white_iron_greatsword',
    serializeId: 79,
    gameId: 12303,
    iconClass: "weapon-icon-claymore-white-iron-greatsword",
    rarity: 3,
    weapon: 'claymore',
    statTable: weaponStatTables.WhiteIronGreatsword,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_cull_the_weal',
            description: 'talent_descr.weapon_cull_the_weal',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.WhiteIronGreatsword.p1)),
            ],
        }),
    ],
});
