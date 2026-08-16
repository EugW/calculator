import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const Fajian = new DbObjectWeapon({
    name: 'fajian',
    serializeId: 259,
    gameId: 11438,
    iconClass: 'weapon-icon-sword-fajian',
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.Fajian,
    beta: true,
    conditions: [
        new ConditionStacks({
            name: 'weapon_fajian_stacks',
            serializeId: 1,
            title: 'talent_name.weapon_fajian',
            description: 'talent_descr.weapon_fajian',
            maxStacks: 2,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('mastery', [52, 65, 78, 91, 104]),
            ],
        }),
    ],
});
