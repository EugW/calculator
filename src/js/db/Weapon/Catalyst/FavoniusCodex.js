import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const FavoniusCodex = new DbObjectWeapon({
    name: 'favonius_codex',
    serializeId: 55,
    gameId: 14401,
    iconClass: "weapon-icon-catalyst-favonius-codex",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.FavoniusCodex,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_favonoius_passive',
            description: 'talent_descr.weapon_favonoius_passive',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.FavoniusCodex.p1)),
                new StatTable('text_cooldown', weaponPassiveTables.FavoniusCodex.p2),
            ],
        }),
    ],
});
