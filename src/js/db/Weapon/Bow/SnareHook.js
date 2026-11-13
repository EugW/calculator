import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionCalcMoonsign } from "../../../classes/Condition/CalcMoonsign";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";

export const SnareHook = new DbObjectWeapon({
    name: 'snare_hook',
    serializeId: 237,
    gameId: 15433,
    iconClass: "weapon-icon-bow-snare-hook",
    rarity: 4,
    weapon: 'bow',
    statTable: weaponStatTables.SnareHook,
    conditions: [
        // Calculate moonsign level from party composition
        new ConditionCalcMoonsign({}),
        new ConditionBooleanRefine({
            name: 'weapon_snare_hook',
            serializeId: 1,
            title: 'talent_name.weapon_snare_hook',
            description: 'talent_descr.weapon_snare_hook_1',
            stats: [
                new StatTable('mastery', weaponPassiveTables.SnareHook.p1),
            ],
        }),
        // Additional Elemental Mastery when Moonsign level >= 2 (Ascendant Gleam)
        new ConditionStaticRefine({
            title: 'talent_name.weapon_snare_hook',
            description: 'talent_descr.weapon_snare_hook_2',
            stats: [
                new StatTable('mastery', weaponPassiveTables.SnareHook.p3),
            ],
            subConditions: [
                new ConditionBooleanRefine({name: 'weapon_snare_hook'}),
                new ConditionBooleanValue({
                    setting: 'party_moonsign',
                    cond: 'ge',
                    value: 2,
                }),
            ],
        }),
    ],
});
