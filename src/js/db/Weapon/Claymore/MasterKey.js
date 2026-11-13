import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionCalcMoonsign } from "../../../classes/Condition/CalcMoonsign";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";

export const MasterKey = new DbObjectWeapon({
    name: 'master_key',
    serializeId: 227,
    gameId: 12433,
    iconClass: "weapon-icon-claymore-master-key",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.MasterKey,
    conditions: [
        // Calculate moonsign level from party composition
        new ConditionCalcMoonsign({}),
        new ConditionBooleanRefine({
            name: 'weapon_master_key',
            serializeId: 1,
            title: 'talent_name.weapon_master_key',
            description: 'talent_descr.weapon_master_key_1',
            stats: [
                new StatTable('mastery', weaponPassiveTables.MasterKey.p1),
            ],
        }),
        // Additional Elemental Mastery when Moonsign level >= 2 (Ascendant Gleam)
        new ConditionStaticRefine({
            title: 'talent_name.weapon_master_key',
            description: 'talent_descr.weapon_master_key_2',
            stats: [
                new StatTable('mastery', weaponPassiveTables.MasterKey.p3),
            ],
            subConditions: [
                new ConditionBooleanRefine({name: 'weapon_master_key'}),
                new ConditionBooleanValue({
                    setting: 'party_moonsign',
                    cond: 'ge',
                    value: 2,
                }),
            ],
        }),
    ],
});
