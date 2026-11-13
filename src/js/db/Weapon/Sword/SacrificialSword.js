import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SacrificialSword = new DbObjectWeapon({
    name: 'sacrificial_sword',
    serializeId: 17,
    gameId: 11403,
    iconClass: "weapon-icon-sword-sacrificial-sword",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.SacrificialSword,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_sacrificial_passive',
            description: 'talent_descr.weapon_sacrificial_passive',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.SacrificialSword.p1)),
                new StatTable('text_cooldown', weaponPassiveTables.SacrificialSword.p2),
            ],
        }),
    ],
});
