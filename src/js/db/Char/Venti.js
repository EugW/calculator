import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdownElement } from "../../classes/Condition/Dropdown/Element";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageChargedAimed } from "../../classes/Feature2/Damage/Charged/Aimed";
import { FeatureDamageMultihit } from "../../classes/Feature2/Damage/Multihit";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierVentiWindsunder } from "../../classes/Feature2/Multiplier/VentiWindsunder";
import { StatTable } from "../../classes/StatTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Venti.s1_id,
        title: 'talent_name.venti_divine_marksmanship',
        description: 'talent_descr.venti_divine_marksmanship',
        items: [
            {
                type: 'multihit_sum',
                hits: 2,
                table: new StatTable('normal_hit_1', charTalentTables.Venti.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Venti.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Venti.s1.p3),
            },
            {
                type: 'multihit_sum',
                hits: 2,
                table: new StatTable('normal_hit_4', charTalentTables.Venti.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Venti.s1.p5),
            },
            {
                table: new StatTable('normal_hit_6', charTalentTables.Venti.s1.p6),
            },
            {
                table: new StatTable('aimed', charTalentTables.Venti.s1.p7),
            },
            {
                table: new StatTable('charged_aimed', charTalentTables.Venti.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Venti.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Venti.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Venti.s1.p11),
            },
            {
                table: new StatTable('windsunder_arrow', charTalentTables.Venti.s1.p12),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Venti.s2_id,
        title: 'talent_name.venti_skyward_sonnet',
        description: 'talent_descr.venti_skyward_sonnet',
        items: [
            {
                table: new StatTable('press_dmg', charTalentTables.Venti.s2.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('cd_press', charTalentTables.Venti.s2.p2),
            },
            {
                table: new StatTable('hold_dmg', charTalentTables.Venti.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd_hold', charTalentTables.Venti.s2.p4),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Venti.s3_id,
        title: 'talent_name.venti_winds_grand_ode',
        description: 'talent_descr.venti_winds_grand_ode',
        items: [
            {
                table: new StatTable('dot_dmg', charTalentTables.Venti.s3.p1),
            },
            {
                table: new StatTable('anemoskill_dmg', charTalentTables.Venti.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Venti.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Venti.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Venti.s3.p5),
            },
        ],
    },
});

const condWitchHomeworkOn = new ConditionBoolean({name: 'venti_witch_homework'});
const condWitchHomeworkOff = new ConditionNot([condWitchHomeworkOn]);
const condPartyWitchHomeworkOn = new ConditionBoolean({name: 'party.venti_witch_homework'});
const condPartyWitchHomeworkOff = new ConditionNot([condPartyWitchHomeworkOn]);
const condHexereiResonanceOn = new ConditionHexereiResonance({});

const condVentiWindsunderArrows = new ConditionBoolean({
    name: 'venti_windsunder_arrows',
    serializeId: 9,
    title: 'talent_name.venti_windsunder_arrows',
    hideCondition: [condWitchHomeworkOff],
    condition: new ConditionAnd([
        condWitchHomeworkOn,
        condHexereiResonanceOn,
    ]),
    settings: {
        venti_windsunder_arrows_str: 'anemo',
    },
    info: {hexerei: true},
});

export const Venti = new DbObjectChar({
    name: 'venti',
    serializeId: 26,
    gameId: 10000022,
    iconClass: "char-icon-venti",
    rarity: 5,
    element: 'anemo',
    weapon: 'bow',
    talents: Talents,
    origin: 'mondstadt',
    statTable: charTables.Venti,
    features: [
        new FeatureDamageMultihit({
            name: 'normal_hit_1',
            elementSetting: 'venti_windsunder_arrows_str',
            category: 'attack',
            damageType: 'normal',
            allowInfusion: true,
            items: [
                {
                    hits: 2,
                    multipliers: [
                        new FeatureMultiplierVentiWindsunder({
                            leveling: 'char_skill_attack',
                            windsunderValues: Talents.get('attack.windsunder_arrow'),
                            values: Talents.get('attack.normal_hit_1'),
                            scalingMultiplierCondition: condVentiWindsunderArrows,
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_1_1',
            hits: 2,
            isChild: true,
            elementSetting: 'venti_windsunder_arrows_str',
            multipliers: [
                new FeatureMultiplierVentiWindsunder({
                    leveling: 'char_skill_attack',
                    windsunderValues: Talents.get('attack.windsunder_arrow'),
                    values: Talents.get('attack.normal_hit_1'),
                    scalingMultiplierCondition: condVentiWindsunderArrows,
                }),
            ],
        }),
        new FeatureDamageNormal({
            elementSetting: 'venti_windsunder_arrows_str',
            multipliers: [
                new FeatureMultiplierVentiWindsunder({
                    leveling: 'char_skill_attack',
                    windsunderValues: Talents.get('attack.windsunder_arrow'),
                    values: Talents.get('attack.normal_hit_2'),
                    scalingMultiplierCondition: condVentiWindsunderArrows,
                }),
            ],
        }),
        new FeatureDamageNormal({
            elementSetting: 'venti_windsunder_arrows_str',
            multipliers: [
                new FeatureMultiplierVentiWindsunder({
                    leveling: 'char_skill_attack',
                    windsunderValues: Talents.get('attack.windsunder_arrow'),
                    values: Talents.get('attack.normal_hit_3'),
                    scalingMultiplierCondition: condVentiWindsunderArrows,
                }),
            ],
        }),
        new FeatureDamageMultihit({
            name: 'normal_hit_4',
            category: 'attack',
            damageType: 'normal',
            allowInfusion: true,
            elementSetting: 'venti_windsunder_arrows_str',
            items: [
                {
                    hits: 2,
                    multipliers: [
                        new FeatureMultiplierVentiWindsunder({
                            leveling: 'char_skill_attack',
                            windsunderValues: Talents.get('attack.windsunder_arrow'),
                            values: Talents.get('attack.normal_hit_4'),
                            scalingMultiplierCondition: condVentiWindsunderArrows,
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4_1',
            hits: 2,
            isChild: true,
            elementSetting: 'venti_windsunder_arrows_str',
            multipliers: [
                new FeatureMultiplierVentiWindsunder({
                    leveling: 'char_skill_attack',
                    windsunderValues: Talents.get('attack.windsunder_arrow'),
                    values: Talents.get('attack.normal_hit_4'),
                    scalingMultiplierCondition: condVentiWindsunderArrows,
                }),
            ],
        }),
        new FeatureDamageNormal({
            elementSetting: 'venti_windsunder_arrows_str',
            multipliers: [
                new FeatureMultiplierVentiWindsunder({
                    leveling: 'char_skill_attack',
                    windsunderValues: Talents.get('attack.windsunder_arrow'),
                    values: Talents.get('attack.normal_hit_5'),
                    scalingMultiplierCondition: condVentiWindsunderArrows,
                }),
            ],
        }),
        new FeatureDamageNormal({
            elementSetting: 'venti_windsunder_arrows_str',
            multipliers: [
                new FeatureMultiplierVentiWindsunder({
                    leveling: 'char_skill_attack',
                    windsunderValues: Talents.get('attack.windsunder_arrow'),
                    values: Talents.get('attack.normal_hit_6'),
                    scalingMultiplierCondition: condVentiWindsunderArrows,
                }),
            ],
        }),
        new FeatureDamageChargedAimed({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.aimed'),
                }),
            ],
        }),
        new FeatureDamageChargedAimed({
            name: 'second_aimed',
            multipliers: [
                new FeatureMultiplier({
                    scalingMultiplier: 0.33,
                    scalingSource: 'constellation1',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.aimed'),
                }),
            ],
            condition: new ConditionConstellation({constellation: 1}),
        }),
        new FeatureDamageChargedAimed({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_aimed'),
                }),
            ],
        }),
        new FeatureDamageChargedAimed({
            name: 'second_charged_aimed',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    scalingMultiplier: 0.33,
                    scalingSource: 'constellation1',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_aimed'),
                }),
            ],
            condition: new ConditionConstellation({constellation: 1}),
        }),
        new FeatureDamageChargedAimed({
            name: 'second_charged_aimed_homing',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    // Buffed C1: 2 homing arrows, each 20% of Windsunder Arrow DMG.
                    scalingMultiplier: 0.2,
                    scalingSource: 'constellation1_buffed',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_aimed'),
                }),
            ],
            condition: new ConditionAnd([
                condWitchHomeworkOn,
                new ConditionConstellation({constellation: 1}),
            ]),
        }),
        new FeatureDamagePlungeCollision({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'skill_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.press_dmg'),
                }),
                new FeatureMultiplier({
                    // Buffed C2 (Wherever a Breeze Blows): press Skill deals 300% of original DMG.
                    scalingMultiplier: 2,
                    scalingSource: 'constellation2_buffed',
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionConstellation({constellation: 2}),
                        new ConditionBoolean({name: 'venti_breeze'}),
                        new ConditionBoolean({name: 'venti_breeze_2'}),
                    ]),
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.press_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.hold_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.dot_dmg'),
                }),
                new FeatureMultiplier({
                    scalingMultiplier: 0.35,
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        condHexereiResonanceOn,
                        new ConditionBoolean({name: 'venti_secret_rite_4s'}),
                    ]),
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.dot_dmg'),
                }),
            ],
        }),
        ...['pyro', 'hydro', 'cryo', 'electro'].map((elem) => {
            return new FeatureDamageBurst({
                name: 'anemoskill_'+ elem +'_dmg',
                element: elem,
                multipliers: [
                    new FeatureMultiplier({
                        leveling: 'char_skill_burst',
                        values: Talents.get('burst.anemoskill_dmg'),
                    }),
                    new FeatureMultiplier({
                        scalingMultiplier: 0.35,
                        condition: new ConditionAnd([
                            condWitchHomeworkOn,
                            condHexereiResonanceOn,
                            new ConditionBoolean({name: 'venti_secret_rite_4s'}),
                        ]),
                        leveling: 'char_skill_burst',
                        values: Talents.get('burst.anemoskill_dmg'),
                    }),
                ],
            });
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'venti_witch_homework',
            serializeId: 7,
            title: 'talent_name.venti_temporal_winds_eulogy',
            description: 'talent_descr.venti_temporal_winds_eulogy',
            info: {hexerei: true},
        }),
        new ConditionBoolean({
            name: 'venti_secret_rite_4s',
            serializeId: 8,
            title: 'talent_name.venti_hexerei_secret_rite',
            hideCondition: [condWitchHomeworkOff],
            condition: new ConditionAnd([
                condWitchHomeworkOn,
                condHexereiResonanceOn,
            ]),
            stats: {
                dmg_all: 50,
            },
            info: {hexerei: true},
        }),
        condVentiWindsunderArrows,
        new ConditionStatic({
            title: 'talent_name.venti_embrace_of_winds',
            description: 'talent_descr.venti_embrace_of_winds',
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.venti_stormeye',
            description: 'talent_descr.venti_stormeye',
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.venti_splitting_gales',
                    description: 'talent_descr.venti_splitting_gales',
                    hideCondition: [condWitchHomeworkOn],
                    condition: condWitchHomeworkOff,
                    stats: {
                        text_percent_dmg: 33,
                    },
                }),
                new ConditionStatic({
                    title: 'talent_name.venti_splitting_gales',
                    description: 'talent_descr.venti_splitting_gales_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    stats: {
                        text_percent_dmg: 33,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'venti_breeze',
                    serializeId: 1,
                    title: 'talent_name.venti_breeze_of_reminiscence',
                    description: 'talent_descr.venti_breeze_of_reminiscence_1',
                    hideCondition: [condWitchHomeworkOn],
                    condition: condWitchHomeworkOff,
                    stats: {
                        enemy_res_anemo: -12,
                        enemy_res_phys: -12,
                    },
                }),
                new ConditionBoolean({
                    name: 'venti_breeze',
                    serializeId: 1,
                    title: 'talent_name.venti_breeze_of_reminiscence',
                    description: 'talent_descr.venti_breeze_of_reminiscence_1_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    stats: {
                        enemy_res_anemo: -24,
                        enemy_res_phys: -24,
                    },
                }),
                new ConditionBoolean({
                    name: 'venti_breeze_2',
                    serializeId: 2,
                    title: 'talent_name.venti_breeze_of_reminiscence',
                    description: 'talent_descr.venti_breeze_of_reminiscence_2',
                    hideCondition: [condWitchHomeworkOn],
                    condition: new ConditionAnd([
                        condWitchHomeworkOff,
                        new ConditionBoolean({name: 'venti_breeze'}),
                    ]),
                    stats: {
                        enemy_res_anemo: -12,
                        enemy_res_phys: -12,
                    },
                }),
                new ConditionBoolean({
                    name: 'venti_breeze_2',
                    serializeId: 2,
                    title: 'talent_name.venti_breeze_of_reminiscence',
                    description: 'talent_descr.venti_breeze_of_reminiscence_2_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionBoolean({name: 'venti_breeze'}),
                    ]),
                }),
            ]
        },
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_burst_bonus: 3,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'venti_hurricane',
                    serializeId: 3,
                    title: 'talent_name.venti_hurricane_of_freedom',
                    description: 'talent_descr.venti_hurricane_of_freedom',
                    hideCondition: [condWitchHomeworkOn],
                    condition: condWitchHomeworkOff,
                    stats: {
                        dmg_anemo: 25,
                    },
                }),
                new ConditionBoolean({
                    name: 'venti_hurricane',
                    serializeId: 3,
                    title: 'talent_name.venti_hurricane_of_freedom',
                    description: 'talent_descr.venti_hurricane_of_freedom_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    stats: {
                        dmg_anemo: 25,
                    },
                }),
            ],
        },
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_elemental_bonus: 3,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'venti_storm',
                    serializeId: 4,
                    title: 'talent_name.venti_storm_of_defiance',
                    description: 'talent_descr.venti_storm_of_defiance_1',
                    hideCondition: [condWitchHomeworkOn],
                    condition: condWitchHomeworkOff,
                    stats: {
                        enemy_res_anemo: -20,
                    },
                }),
                new ConditionBoolean({
                    name: 'venti_storm',
                    serializeId: 4,
                    title: 'talent_name.venti_storm_of_defiance',
                    description: 'talent_descr.venti_storm_of_defiance_1_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    stats: {
                        enemy_res_anemo: -20,
                    },
                }),
                new ConditionDropdownElement({
                    name: 'venti_storm_element',
                    serializeId: 5,
                    title: 'talent_name.venti_storm_of_defiance',
                    description: 'talent_descr.venti_storm_of_defiance_2',
                    hideCondition: [condWitchHomeworkOn],
                    condition: new ConditionAnd([
                        condWitchHomeworkOff,
                        new ConditionBoolean({name: 'venti_storm'}),
                    ]),
                    values: [
                        {
                            value: 'cryo',
                            serializeId: 1,
                            conditions: [
                                new Condition({stats: {enemy_res_cryo: -20}}),
                            ],
                        },
                        {
                            value: 'electro',
                            serializeId: 2,
                            conditions: [
                                new Condition({stats: {enemy_res_electro: -20}}),
                            ],
                        },
                        {
                            value: 'hydro',
                            serializeId: 3,
                            conditions: [
                                new Condition({stats: {enemy_res_hydro: -20}}),
                            ],
                        },
                        {
                            value: 'pyro',
                            serializeId: 4,
                            conditions: [
                                new Condition({stats: {enemy_res_pyro: -20}}),
                            ],
                        },
                    ],
                }),
                new ConditionDropdownElement({
                    name: 'venti_storm_element',
                    serializeId: 5,
                    title: 'talent_name.venti_storm_of_defiance',
                    description: 'talent_descr.venti_storm_of_defiance_2_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionBoolean({name: 'venti_storm'}),
                    ]),
                    values: [
                        {
                            value: 'cryo',
                            serializeId: 1,
                            conditions: [
                                new Condition({stats: {
                                    enemy_res_cryo: -20,
                                    crit_dmg: 100,
                                }}),
                            ],
                        },
                        {
                            value: 'electro',
                            serializeId: 2,
                            conditions: [
                                new Condition({stats: {
                                    enemy_res_electro: -20,
                                    crit_dmg: 100,
                                }}),
                            ],
                        },
                        {
                            value: 'hydro',
                            serializeId: 3,
                            conditions: [
                                new Condition({stats: {
                                    enemy_res_hydro: -20,
                                    crit_dmg: 100,
                                }}),
                            ],
                        },
                        {
                            value: 'pyro',
                            serializeId: 4,
                            conditions: [
                                new Condition({stats: {
                                    enemy_res_pyro: -20,
                                    crit_dmg: 100,
                                }}),
                            ],
                        },
                    ],
                }),
            ],
        },
    ]),
    partyData: {
        conditions: [
            new ConditionBoolean({
                name: 'party.venti_witch_homework',
                serializeId: 6,
                rotation: 'party',
                title: 'talent_name.venti_temporal_winds_eulogy',
                description: 'talent_descr.venti_temporal_winds_eulogy',
                info: {hexerei: true},
            }),
            new ConditionBoolean({
                name: 'party.venti_secret_rite_4s',
                serializeId: 7,
                rotation: 'party',
                title: 'talent_name.venti_hexerei_secret_rite',
                hideCondition: [condPartyWitchHomeworkOff],
                condition: new ConditionAnd([
                    condPartyWitchHomeworkOn,
                    condHexereiResonanceOn,
                ]),
                stats: {
                    dmg_all: 50,
                },
                info: {hexerei: true},
            }),
            new ConditionBoolean({
                name: 'party.venti_breeze',
                serializeId: 1,
                rotation: 'party',
                title: 'talent_name.venti_breeze_of_reminiscence',
                description: 'talent_descr.venti_breeze_of_reminiscence_1',
                hideCondition: [condPartyWitchHomeworkOn],
                condition: condPartyWitchHomeworkOff,
                stats: {
                    enemy_res_anemo: -12,
                    enemy_res_phys: -12,
                },
                info: {constellation: 2},
            }),
            new ConditionBoolean({
                name: 'party.venti_breeze',
                serializeId: 1,
                rotation: 'party',
                title: 'talent_name.venti_breeze_of_reminiscence',
                description: 'talent_descr.venti_breeze_of_reminiscence_1_buffed',
                hideCondition: [condPartyWitchHomeworkOff],
                condition: condPartyWitchHomeworkOn,
                stats: {
                    enemy_res_anemo: -24,
                    enemy_res_phys: -24,
                },
                info: {constellation: 2},
            }),
            new ConditionBoolean({
                name: 'party.venti_breeze_2',
                serializeId: 2,
                rotation: 'party',
                title: 'talent_name.venti_breeze_of_reminiscence',
                description: 'talent_descr.venti_breeze_of_reminiscence_2',
                hideCondition: [condPartyWitchHomeworkOn],
                condition: new ConditionAnd([
                    condPartyWitchHomeworkOff,
                    new ConditionBoolean({name: 'party.venti_breeze'}),
                ]),
                stats: {
                    enemy_res_anemo: -12,
                    enemy_res_phys: -12,
                },
                info: {constellation: 2},
            }),
            new ConditionBoolean({
                name: 'party.venti_hurricane',
                serializeId: 5,
                rotation: 'party',
                title: 'talent_name.venti_hurricane_of_freedom',
                description: 'talent_descr.venti_hurricane_of_freedom_buffed',
                hideCondition: [condPartyWitchHomeworkOff],
                condition: condPartyWitchHomeworkOn,
                stats: {
                    dmg_anemo: 25,
                },
                info: {constellation: 4},
            }),
            new ConditionBoolean({
                name: 'party.venti_storm',
                serializeId: 3,
                rotation: 'party',
                title: 'talent_name.venti_storm_of_defiance',
                description: 'talent_descr.venti_storm_of_defiance_1',
                hideCondition: [condPartyWitchHomeworkOn],
                condition: condPartyWitchHomeworkOff,
                info: {constellation: 6},
                stats: {
                    enemy_res_anemo: -20,
                },
            }),
            new ConditionBoolean({
                name: 'party.venti_storm',
                serializeId: 3,
                rotation: 'party',
                title: 'talent_name.venti_storm_of_defiance',
                description: 'talent_descr.venti_storm_of_defiance_1_buffed',
                hideCondition: [condPartyWitchHomeworkOff],
                condition: condPartyWitchHomeworkOn,
                info: {constellation: 6},
                stats: {
                    enemy_res_anemo: -20,
                },
            }),
            new ConditionDropdownElement({
                name: 'party.venti_storm_element',
                serializeId: 4,
                rotation: 'party',
                title: 'talent_name.venti_storm_of_defiance',
                description: 'talent_descr.venti_storm_of_defiance_2',
                hideCondition: [condPartyWitchHomeworkOn],
                condition: new ConditionAnd([
                    condPartyWitchHomeworkOff,
                    new ConditionBoolean({
                        name: 'party.venti_storm',
                    }),
                ]),
                values: [
                    {
                        value: 'cryo',
                        serializeId: 1,
                        conditions: [
                            new Condition({stats: {enemy_res_cryo: -20}}),
                        ],
                    },
                    {
                        value: 'electro',
                        serializeId: 2,
                        conditions: [
                            new Condition({stats: {enemy_res_electro: -20}}),
                        ],
                    },
                    {
                        value: 'hydro',
                        serializeId: 3,
                        conditions: [
                            new Condition({stats: {enemy_res_hydro: -20}}),
                        ],
                    },
                    {
                        value: 'pyro',
                        serializeId: 4,
                        conditions: [
                            new Condition({stats: {enemy_res_pyro: -20}}),
                        ],
                    },
                ],
                info: {
                    constellation: 6,
                },
            }),
            new ConditionDropdownElement({
                name: 'party.venti_storm_element',
                serializeId: 4,
                rotation: 'party',
                title: 'talent_name.venti_storm_of_defiance',
                description: 'talent_descr.venti_storm_of_defiance_2_buffed',
                hideCondition: [condPartyWitchHomeworkOff],
                condition: new ConditionAnd([
                    condPartyWitchHomeworkOn,
                    new ConditionBoolean({
                        name: 'party.venti_storm',
                    }),
                ]),
                values: [
                    {
                        value: 'cryo',
                        serializeId: 1,
                        conditions: [
                            new Condition({stats: {enemy_res_cryo: -20}}),
                        ],
                    },
                    {
                        value: 'electro',
                        serializeId: 2,
                        conditions: [
                            new Condition({stats: {enemy_res_electro: -20}}),
                        ],
                    },
                    {
                        value: 'hydro',
                        serializeId: 3,
                        conditions: [
                            new Condition({stats: {enemy_res_hydro: -20}}),
                        ],
                    },
                    {
                        value: 'pyro',
                        serializeId: 4,
                        conditions: [
                            new Condition({stats: {enemy_res_pyro: -20}}),
                        ],
                    },
                ],
                info: {
                    constellation: 6,
                },
            }),
        ],
    },
});
