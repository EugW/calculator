import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SacrificialBow = new DbObjectWeapon({
    name: 'sacrificial_bow',
    serializeId: 35,
    gameId: 15403,
    iconClass: "weapon-icon-bow-sacrificial-bow",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.SacrificialBow,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_sacrificial_passive',
            description: 'talent_descr.weapon_sacrificial_passive',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.SacrificialBow.p1)),
                new StatTable('text_cooldown', weaponPassiveTables.SacrificialBow.p2),
            ],
        }),
    ],
});

