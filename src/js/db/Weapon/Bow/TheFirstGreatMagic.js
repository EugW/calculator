import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionCalcElements } from "../../../classes/Condition/CalcElements";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { ConditionStaticRefineFirstMagic } from "../../../classes/Condition/Static/Refine/FirstMagic";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

let atk_table_1 = percent(weaponPassiveTables.TheFirstGreatMagic.p2);
let atk_table_2 = percent(weaponPassiveTables.TheFirstGreatMagic.p3);
let atk_table_3 = percent(weaponPassiveTables.TheFirstGreatMagic.p4);

let ms_table_1 = percent(weaponPassiveTables.TheFirstGreatMagic.p5);
let ms_table_2 = percent(weaponPassiveTables.TheFirstGreatMagic.p6);
let ms_table_3 = percent(weaponPassiveTables.TheFirstGreatMagic.p7);

export const TheFirstGreatMagic = new DbObjectWeapon({
    name: 'the_first_great_magic',
    serializeId: 157,
    gameId: 15512,
    iconClass: 'weapon-icon-bow-the-first-great-magic',
    rarity: 5,
    weapon: 'bow',
    statTable: weaponStatTables.TheFirstGreatMagic,
    conditions: [
        new ConditionCalcElements({}),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_the_first_great_magic_1',
            description: 'talent_descr.weapon_the_first_great_magic_1',
            stats: [
                new StatTable('dmg_charged', percent(weaponPassiveTables.TheFirstGreatMagic.p1)),
            ],
        }),
        new ConditionStaticRefineFirstMagic({
            title: 'talent_name.weapon_the_first_great_magic_2',
            description: 'talent_descr.weapon_the_first_great_magic_2',
            levelSetting: 'weapon_refine',
            effectLevelSetting: 'party_elements_same_inc',
            stats: [
                new StatTable('text_number_1', atk_table_1),
                new StatTable('text_number_2', atk_table_2),
                new StatTable('text_number_3', atk_table_3),
            ],
            realStats: [
                new StatTable('', [
                    new StatTable('atk_percent', atk_table_1),
                    new StatTable('atk_percent', atk_table_2),
                    new StatTable('atk_percent', atk_table_3),
                ]),
            ],
        }),
        new ConditionStaticRefineFirstMagic({
            title: 'talent_name.weapon_the_first_great_magic_3',
            description: 'talent_descr.weapon_the_first_great_magic_3',
            levelSetting: 'weapon_refine',
            effectLevelSetting: 'party_elements_different',
            stats: [
                new StatTable('text_number_1', ms_table_1),
                new StatTable('text_number_2', ms_table_2),
                new StatTable('text_number_3', ms_table_3),
            ],
            realStats: [
                new StatTable('', [
                    new StatTable('move_speed', ms_table_1),
                    new StatTable('move_speed', ms_table_2),
                    new StatTable('move_speed', ms_table_3),
                ]),
            ],
            subConditions: [
                new ConditionBooleanValue({
                    setting: 'party_elements_different',
                    cond: 'ge',
                    value: 1,
                }),
            ],
        }),
    ],
});
