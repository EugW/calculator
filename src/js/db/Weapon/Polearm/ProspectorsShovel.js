import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionCalcMoonsign } from "../../../classes/Condition/CalcMoonsign";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const ProspectorsShovel = new DbObjectWeapon({
    name: 'prospectors_shovel',
    serializeId: 229,
    gameId: 13433,
    iconClass: "weapon-icon-polearm-prospectors-shovel",
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.ProspectorsShovel,
    conditions: [
        // Calculate moonsign level from party composition
        new ConditionCalcMoonsign({}),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_prospectors_shovel',
            description: 'talent_descr.weapon_prospectors_shovel_1',
            stats: [
                new StatTable('dmg_reaction_electrocharged', percent(weaponPassiveTables.ProspectorsShovel.p1)),
                new StatTable('dmg_reaction_lunarcharged', percent(weaponPassiveTables.ProspectorsShovel.p2)),
            ],
        }),
        // Additional Lunar-Charged DMG when Moonsign level >= 2 (Ascendant Gleam)
        new ConditionStaticRefine({
            title: 'talent_name.weapon_prospectors_shovel',
            description: 'talent_descr.weapon_prospectors_shovel_2',
            stats: [
                new StatTable('dmg_reaction_lunarcharged', percent(weaponPassiveTables.ProspectorsShovel.p3)),
            ],
            subConditions: [
                new ConditionBooleanValue({
                    setting: 'party_moonsign',
                    cond: 'ge',
                    value: 2,
                }),
            ],
        }),
    ],
});
