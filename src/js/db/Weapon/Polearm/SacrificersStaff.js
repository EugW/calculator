import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

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
            maxStacks: weaponPassiveTables.SacrificersStaff.p4[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.SacrificersStaff.p2)),
                new StatTable('recharge', percent(weaponPassiveTables.SacrificersStaff.p3)),
            ],
        }),
    ],
});
