import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionCalcMoonsign } from "../../../classes/Condition/CalcMoonsign";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const MasterKey = new DbObjectWeapon({
    name: 'master_key',
    serializeId: 227,
    gameId: 12433,
    iconClass: "weapon-icon-claymore-master-key",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.MasterKey,
    conditions: [
        new ConditionCalcMoonsign({}),
        new ConditionBooleanRefine({
            name: 'weapon_master_key',
            serializeId: 1,
            title: 'talent_name.weapon_master_key',
            description: 'talent_descr.weapon_master_key_1',
            stats: [
                new StatTable('mastery', [60, 75, 90, 105, 120]),
            ],
        }),
        // Moonsign: Ascendant Gleam: the Elemental Mastery bonus is increased further.
        new ConditionStaticRefine({
            title: 'talent_name.weapon_master_key',
            description: 'talent_descr.weapon_master_key_2',
            stats: [
                new StatTable('mastery', [60, 75, 90, 105, 120]),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'weapon_master_key'}),
                new ConditionBooleanValue({setting: 'party_moonsign', cond: 'ge', value: 2}),
            ]),
        }),
    ],
});
