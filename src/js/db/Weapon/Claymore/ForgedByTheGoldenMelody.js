import { ConditionDropdown } from "../../../classes/Condition/Dropdown";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

function goldenMelodyModes() {
    return [
        {
            title_str: 'talent_name.weapon_forged_by_the_golden_melody_atk',
            value: 'atk',
            serializeId: 1,
            conditions: [
                new ConditionStaticRefine({
                    stats: [new StatTable('atk_percent', [18, 22.5, 27, 31.5, 36])],
                }),
            ],
        },
        {
            title_str: 'talent_name.weapon_forged_by_the_golden_melody_mastery',
            value: 'mastery',
            serializeId: 2,
            conditions: [
                new ConditionStaticRefine({
                    stats: [new StatTable('mastery', [120, 150, 180, 210, 240])],
                }),
            ],
        },
        {
            title_str: 'talent_name.weapon_forged_by_the_golden_melody_stellarglimmer',
            value: 'stellarglimmer',
            serializeId: 3,
            conditions: [
                new ConditionStaticRefine({
                    stats: [new StatTable('dmg_stellarglimmer', [28, 35, 42, 49, 56])],
                }),
            ],
        },
    ];
}

export const ForgedByTheGoldenMelody = new DbObjectWeapon({
    name: 'forged_by_the_golden_melody',
    serializeId: 250,
    gameId: 12435,
    iconClass: "weapon-icon-claymore-forged-by-the-golden-melody",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.ForgedByTheGoldenMelody,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_forged_by_the_golden_melody',
            description: 'talent_descr.weapon_forged_by_the_golden_melody',
            stats: [
                new StatTable('text_percent_1', [18, 22.5, 27, 31.5, 36]),
                new StatTable('text_number_2', [120, 150, 180, 210, 240]),
                new StatTable('text_percent_3', [28, 35, 42, 49, 56]),
            ],
        }),
        new ConditionDropdown({
            name: 'weapon_forged_by_the_golden_melody_active',
            serializeId: 1,
            title: 'talent_name.weapon_forged_by_the_golden_melody_active',
            description: 'talent_descr.weapon_forged_by_the_golden_melody_active',
            hideEmpty: true,
            defaultValue: 'atk',
            values: goldenMelodyModes(),
        }),
        new ConditionDropdown({
            name: 'weapon_forged_by_the_golden_melody_copied',
            serializeId: 2,
            title: 'talent_name.weapon_forged_by_the_golden_melody_copied',
            description: 'talent_descr.weapon_forged_by_the_golden_melody_copied',
            suggesterValue: 'atk',
            values: goldenMelodyModes(),
        }),
    ],
});
