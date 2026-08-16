import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const SerenitysCall = new DbObjectWeapon({
    name: 'serenitys_call',
    serializeId: 225,
    gameId: 11433,
    iconClass: "weapon-icon-sword-serenitys-call",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.SerenitysCall,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_serenitys_call',
            serializeId: 1,
            title: 'talent_name.weapon_serenitys_call',
            description: 'talent_descr.weapon_serenitys_call',
            stats: [
                new StatTable('hp_percent', [16, 20, 24, 28, 32]),
            ],
        }),
    ],
});
