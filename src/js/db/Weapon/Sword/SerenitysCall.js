import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionCalcMoonsign } from "../../../classes/Condition/CalcMoonsign";
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
        new ConditionCalcMoonsign({}),
        new ConditionBooleanRefine({
            name: 'weapon_serenitys_call',
            serializeId: 1,
            title: 'talent_name.weapon_serenitys_call',
            description: 'talent_descr.weapon_serenitys_call_1',
            stats: [
                new StatTable('hp_percent', [16, 20, 24, 28, 32]),
            ],
        }),
        // Moonsign: Ascendant Gleam: the Max HP bonus is increased further.
        new ConditionStaticRefine({
            title: 'talent_name.weapon_serenitys_call',
            description: 'talent_descr.weapon_serenitys_call_2',
            stats: [
                new StatTable('hp_percent', [16, 20, 24, 28, 32]),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'weapon_serenitys_call'}),
                new ConditionBooleanValue({setting: 'party_moonsign', cond: 'ge', value: 2}),
            ]),
        }),
    ],
});
