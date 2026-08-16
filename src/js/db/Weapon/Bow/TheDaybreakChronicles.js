import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const TheDaybreakChronicles = new DbObjectWeapon({
    name: 'the_daybreak_chronicles',
    serializeId: 236,
    gameId: 15515,
    iconClass: "weapon-icon-bow-the-daybreak-chronicles",
    rarity: 5,
    weapon: 'bow',
    statTable: weaponStatTables.TheDaybreakChronicles,
    settingsSets: [
        {
            name: 'stacks_1',
            settings: { "weapon_the_daybreak_chronicles": 1 },
        },
        {
            name: 'stacks_6',
            settings: { "weapon_the_daybreak_chronicles": 6 },
        },
    ],
    conditions: [
        new ConditionStacks({
            name: 'weapon_the_daybreak_chronicles',
            serializeId: 1,
            title: 'talent_name.weapon_the_daybreak_chronicles',
            description: 'talent_descr.weapon_the_daybreak_chronicles',
            maxStacks: 6,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_normal', [10, 12.5, 15, 17.5, 20]),
                new StatTable('dmg_skill', [10, 12.5, 15, 17.5, 20]),
                new StatTable('dmg_burst', [10, 12.5, 15, 17.5, 20]),
            ],
        }),
        // Hexerei: Additional DMG bonus when allies have Hexerei effects
        new ConditionBooleanRefine({
            name: 'weapon_the_daybreak_chronicles_hexerei',
            serializeId: 2,
            title: 'talent_name.weapon_the_daybreak_chronicles_hexerei',
            description: 'talent_descr.weapon_the_daybreak_chronicles_hexerei',
            stats: [
                new StatTable('dmg_normal', [20, 25, 30, 35, 40]),
                new StatTable('dmg_skill', [20, 25, 30, 35, 40]),
                new StatTable('dmg_burst', [20, 25, 30, 35, 40]),
            ],
            info: {hexerei: true},
        }),
    ],
});
