import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { Stats } from "../../../classes/Stats";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const TulaytullahsRemembrance = new DbObjectWeapon({
    name: 'tulaytullahs_remembrance',
    serializeId: 139,
    gameId: 14512,
    iconClass: "weapon-icon-catalyst-tulaytullahs-remembrance",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.TulaytullahsRemembrance,
    conditions: [
        new ConditionStaticRefine({
            name: 'weapon_tulaytullahs_remembrance',
            serializeId: 1,
            title: 'talent_name.weapon_tulaytullahs_remembrance',
            description: 'talent_descr.weapon_tulaytullahs_remembrance_1',
            stats: [
                new StatTable('atk_speed_normal', percent(weaponPassiveTables.TulaytullahsRemembrance.p1)),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_tulaytullahs_remembrance_2',
            serializeId: 2,
            title: 'talent_name.weapon_tulaytullahs_remembrance',
            description: 'talent_descr.weapon_tulaytullahs_remembrance_2',
            maxStacks: weaponPassiveTables.TulaytullahsRemembrance.p7[0],
            levelSetting: 'weapon_refine',
            dropdownClass: 'stack-percent',
            titleFunc: function(value, stats) {
                if (value) {
                    return Stats.format('dmg_normal', stats.get('dmg_normal'));
                }
            },
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.TulaytullahsRemembrance.p2)),
                new StatTable('text_percent_1', [4.8*2, 6*2, 7.2*2, 8.4*2, 9.6*2]),
                new StatTable('text_percent_2', [4.8*10, 6*10, 7.2*10, 8.4*10, 9.6*10]),
            ],
        }),
    ],
});

