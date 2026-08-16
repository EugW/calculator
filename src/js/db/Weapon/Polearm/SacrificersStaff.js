import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const SacrificersStaff = new DbObjectWeapon({
    name: 'sacrificers_staff',
    serializeId: 230,
    gameId: 13434,
    iconClass: "weapon-icon-polearm-sacrificers-staff",
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.SacrificersStaff,
    conditions: [
        new ConditionStacks({
            name: 'weapon_sacrificers_staff',
            serializeId: 1,
            title: 'talent_name.weapon_sacrificers_staff',
            description: 'talent_descr.weapon_sacrificers_staff',
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', [8, 10, 12, 14, 16]),
                new StatTable('recharge', [6, 7.5, 9, 10.5, 12]),
            ],
        }),
    ],
});
