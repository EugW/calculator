import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const FavoniusWarbow = new DbObjectWeapon({
    name: 'favonius_warbow',
    serializeId: 28,
    gameId: 15401,
    iconClass: "weapon-icon-bow-favonius-warbow",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.FavoniusWarbow,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_favonoius_passive',
            description: 'talent_descr.weapon_favonoius_passive',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.FavoniusWarbow.p1)),
                new StatTable('text_cooldown', weaponPassiveTables.FavoniusWarbow.p2),
            ],
        }),
    ],
});


