import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SacrificialGreatsword = new DbObjectWeapon({
    name: 'sacrificial_greatsword',
    serializeId: 73,
    gameId: 12403,
    iconClass: "weapon-icon-claymore-sacrificial-greatsword",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.SacrificialGreatsword,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_sacrificial_passive',
            description: 'talent_descr.weapon_sacrificial_passive',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.SacrificialGreatsword.p1)),
                new StatTable('text_cooldown', weaponPassiveTables.SacrificialGreatsword.p2),
            ],
        }),
    ],
});
