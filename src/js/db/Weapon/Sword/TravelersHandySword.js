import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const TravelersHandySword = new DbObjectWeapon({
    name: 'travelers_handy_sword',
    serializeId: 22,
    gameId: 11303,
    iconClass: "weapon-icon-sword-travelers-handy-sword",
    rarity: 3,
    weapon: 'sword',
    statTable: weaponStatTables.TravelersHandySword,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_travelers_handy_sword',
            description: 'talent_descr.weapon_travelers_handy_sword',
            stats: [
                new StatTable('text_percent_hp', percent(weaponPassiveTables.TravelersHandySword.p1)),
            ],
        }),
    ],
});
