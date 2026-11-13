import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

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
                new StatTable('dmg_normal', percent(weaponPassiveTables.TheDaybreakChronicles.p4)),
                new StatTable('dmg_skill', percent(weaponPassiveTables.TheDaybreakChronicles.p4)),
                new StatTable('dmg_burst', percent(weaponPassiveTables.TheDaybreakChronicles.p4)),
                new StatTable('text_percent_max', percent(weaponPassiveTables.TheDaybreakChronicles.p2)),
                new StatTable('text_percent_decay', percent(weaponPassiveTables.TheDaybreakChronicles.p3)),
                new StatTable('text_percent_hexerei', percent(weaponPassiveTables.TheDaybreakChronicles.p6)),
            ],
        }),
        // Consume the removed Hexerei checkbox (ID only) when loading old builds.
        new ConditionStatic({
            serializeId: 2,
            isHidden: true,
        }),
    ],
});
