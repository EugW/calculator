import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SacrificialJade = new DbObjectWeapon({
    name: 'sacrificial_jade',
    serializeId: 153,
    gameId: 14424,
    iconClass: 'weapon-icon-catalyst-sacrificial-jade',
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.SacrificialJade,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_sacrificial_jade',
            serializeId: 1,
            title: 'talent_name.weapon_sacrificial_jade',
            description: 'talent_descr.weapon_sacrificial_jade',
            stats: [
                new StatTable('hp_percent', percent(weaponPassiveTables.SacrificialJade.p3)),
                new StatTable('mastery', weaponPassiveTables.SacrificialJade.p4),
            ],
        }),
    ],
});

