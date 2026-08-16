import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBooleanDropdownValue } from "../../../classes/Condition/Boolean/DropdownValue";
import { ConditionDropdown } from "../../../classes/Condition/Dropdown";
import { ConditionHexereiResonance } from "../../../classes/Condition/HexereiResonance";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { ConditionWitchHomework } from "../../../classes/Condition/WitchHomework";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { PostEffectStatsAtk } from "../../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

const activePathfindersLight = new PostEffectStatsAtk({
    levelSetting: 'weapon_refine',
    percent: new StatTable('dmg_all', [0.01, 0.013, 0.016, 0.019, 0.022]),
    statCap: new StatTable('', [26, 34, 42, 50, 58]),
    conditions: [
        new ConditionBooleanDropdownValue({
            name: 'weapon_angelos_heptades',
            value: 'active',
            defaultValue: '-',
        }),
    ],
});

const offFieldHexereiPathfindersLight = new PostEffectStatsAtk({
    levelSetting: 'weapon_refine',
    percent: new StatTable('dmg_all', [0.005, 0.0065, 0.008, 0.0095, 0.011]),
    statCap: new StatTable('', [13, 17, 21, 25, 29]),
    conditions: [
        new ConditionBooleanDropdownValue({
            name: 'weapon_angelos_heptades',
            value: 'off_field_hexerei',
        }),
        new ConditionWitchHomework({}),
        new ConditionHexereiResonance({}),
    ],
});

export const AngelosHeptades = new DbObjectWeapon({
    name: 'angelos_heptades',
    serializeId: 244,
    gameId: 14523,
    iconClass: "weapon-icon-catalyst-angelos-heptades",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.AngelosHeptades,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_angelos_heptades',
            description: 'talent_descr.weapon_angelos_heptades_calc',
            stats: [
                new StatTable('atk_percent', [12, 15, 18, 21, 24]),
                new StatTable('text_percent', [10, 13, 16, 19, 22]),
                new StatTable('text_percent_max', [26, 34, 42, 50, 58]),
                new StatTable('text_energy', [14, 15, 16, 17, 18]),
            ],
        }),
        new ConditionDropdown({
            name: 'weapon_angelos_heptades',
            serializeId: 1,
            title: 'talent_name.weapon_angelos_heptades_2',
            description: 'talent_descr.weapon_angelos_heptades_mode',
            dropdownClass: 'medium-text',
            separateControlLine: true,
            hideEmpty: true,
            defaultValue: '-',
            values: [
                {
                    title: '-',
                    value: '-',
                    serializeId: 3,
                    conditions: [
                        new ConditionStaticRefine({
                            stats: [
                                new StatTable('text_percent', [10, 13, 16, 19, 22]),
                                new StatTable('text_percent_max', [26, 34, 42, 50, 58]),
                                new StatTable('text_percent_hexerei', [5, 6.5, 8, 9.5, 11]),
                                new StatTable('text_percent_max_hexerei', [13, 17, 21, 25, 29]),
                            ],
                        }),
                    ],
                },
                {
                    title_str: 'talent_name.weapon_angelos_heptades_active',
                    value: 'active',
                    serializeId: 1,
                    conditions: [
                        new ConditionStaticRefine({
                            stats: [
                                new StatTable('text_percent', [10, 13, 16, 19, 22]),
                                new StatTable('text_percent_max', [26, 34, 42, 50, 58]),
                                new StatTable('text_percent_hexerei', [5, 6.5, 8, 9.5, 11]),
                                new StatTable('text_percent_max_hexerei', [13, 17, 21, 25, 29]),
                            ],
                        }),
                    ],
                },
                {
                    title_str: 'talent_name.weapon_angelos_heptades_off_field_hexerei',
                    value: 'off_field_hexerei',
                    serializeId: 2,
                    conditions: [
                        new ConditionStaticRefine({
                            stats: [
                                new StatTable('text_percent', [10, 13, 16, 19, 22]),
                                new StatTable('text_percent_max', [26, 34, 42, 50, 58]),
                                new StatTable('text_percent_hexerei', [5, 6.5, 8, 9.5, 11]),
                                new StatTable('text_percent_max_hexerei', [13, 17, 21, 25, 29]),
                            ],
                        }),
                    ],
                },
            ],
        }),
    ],
    postEffects: [
        activePathfindersLight,
        offFieldHexereiPathfindersLight,
    ],
    features: [
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'dmg_bonus',
            postEffect: activePathfindersLight,
            condition: new ConditionBooleanDropdownValue({
                name: 'weapon_angelos_heptades',
                value: 'active',
                defaultValue: '-',
            }),
            format: 'percent',
        }),
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'dmg_bonus',
            postEffect: offFieldHexereiPathfindersLight,
            condition: new ConditionAnd([
                new ConditionBooleanDropdownValue({
                    name: 'weapon_angelos_heptades',
                    value: 'off_field_hexerei',
                }),
                new ConditionWitchHomework({}),
                new ConditionHexereiResonance({}),
            ]),
            format: 'percent',
        }),
    ],
});
