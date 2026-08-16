import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const ClashOfKings = new DbObjectWeapon({
    name: 'clash_of_kings',
    serializeId: 254,
    gameId: 14435,
    iconClass: 'weapon-icon-catalyst-clash-of-kings',
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.ClashOfKings,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_clash_of_kings',
            serializeId: 1,
            title: 'talent_name.weapon_clash_of_kings',
            description: 'talent_descr.weapon_clash_of_kings',
            stats: [
                new StatTable('atk_percent', [20, 25, 30, 35, 40]),
                new StatTable('mastery', [100, 125, 150, 175, 200]),
            ],
        }),
    ],
});
