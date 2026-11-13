import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const FavoniusGreatsword = new DbObjectWeapon({
    name: 'favonius_greatsword',
    serializeId: 66,
    gameId: 12401,
    iconClass: "weapon-icon-claymore-favonius-greatsword",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.FavoniusGreatsword,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_favonoius_passive',
            description: 'talent_descr.weapon_favonoius_passive',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.FavoniusGreatsword.p1)),
                new StatTable('text_cooldown', weaponPassiveTables.FavoniusGreatsword.p2),
            ],
        }),
    ],
});
