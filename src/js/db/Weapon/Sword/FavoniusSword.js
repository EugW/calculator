import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const FavoniusSword = new DbObjectWeapon({
    name: 'favonius_sword',
    serializeId: 7,
    gameId: 11401,
    iconClass: "weapon-icon-sword-favonius-sword",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.FavoniusSword,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_favonoius_passive',
            description: 'talent_descr.weapon_favonoius_passive',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.FavoniusSword.p1)),
                new StatTable('text_cooldown', weaponPassiveTables.FavoniusSword.p2),
            ],
        }),
    ],
});
