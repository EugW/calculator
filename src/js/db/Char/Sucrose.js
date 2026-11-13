import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanCharElement } from "../../classes/Condition/Boolean/CharElement";
import { ConditionDropdownElement } from "../../classes/Condition/Dropdown/Element";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionWitchHomework } from "../../classes/Condition/WitchHomework";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { PostEffectStatsMastery } from "../../classes/PostEffect/Stats/Mastery";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const condWitchHomeworkOn  = new ConditionBoolean({name: 'sucrose_witch_homework'});
const condWitchHomeworkOff = new ConditionNot([condWitchHomeworkOn]);

const condHexereiResonanceOn = new ConditionHexereiResonance({});

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Sucrose.s1_id,
        title: 'talent_name.sucrose_wind_spirit_creation',
        description: 'talent_descr.sucrose_wind_spirit_creation',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Sucrose.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Sucrose.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Sucrose.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Sucrose.s1.p4),
            },
            {
                table:  new StatTable('charged_hit', charTalentTables.Sucrose.s1.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Sucrose.s1.p6),
            },
            {
                table: new StatTable('plunge', charTalentTables.Sucrose.s1.p7),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Sucrose.s1.p8),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Sucrose.s1.p9),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Sucrose.s2_id,
        title: 'talent_name.sucrose_astable_anemohypostasis_creation_6308',
        description: 'talent_descr.sucrose_astable_anemohypostasis_creation_6308',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.Sucrose.s2.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Sucrose.s2.p2),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Sucrose.s3_id,
        title: 'talent_name.sucrose_forbidden_creation_isomer_75_type_ii',
        description: 'talent_descr.sucrose_forbidden_creation_isomer_75_type_ii',
        items: [
            {
                table: new StatTable('dot_dmg', charTalentTables.Sucrose.s3.p1),
            },
            {
                table: new StatTable('anemoskill_dmg', charTalentTables.Sucrose.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Sucrose.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Sucrose.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Sucrose.s3.p5),
            },
        ],
    },
});

const A1Mastery = charTalentTables.Sucrose.a1.p1;
const A4MasteryRatio = charTalentTables.Sucrose.a4.p1;
const A4MasteryPercent = percent(charTalentTables.Sucrose.a4.p1);
const C6DmgBonus = percent(charTalentTables.Sucrose.c6.p1);

export const Sucrose = new DbObjectChar({
    name: 'sucrose',
    serializeId: 22,
    gameId: 10000043,
    iconClass: "char-icon-sucrose",
    rarity: 4,
    element: 'anemo',
    weapon: 'catalyst',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Sucrose,
    features: [
        new FeatureDamageNormal({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
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
            ],
        }),
        new FeatureDamageBurst({
            name: 'anemoskill_pyro_dmg',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.anemoskill_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'anemoskill_hydro_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.anemoskill_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'anemoskill_cryo_dmg',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.anemoskill_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'anemoskill_electro_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.anemoskill_dmg'),
                }),
            ],
        }),
        // Display copy of A4 (Mollis Favonius): game data
        // (Avatar_Sucrose_PermanentSkill_NetherWind,
        // UNIQUE_Avatar_Sucrose_PermanentSkill_NetherWind_Buff) computes
        // Actor_ElemMasteryExtraDelta (extra) from
        // FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY (premod EM). Default confirmed,
        // no params; the value follows the team post-effect below.
        new FeaturePostEffectValue({
            category: 'other',
            name: 'sucrose_mastery_bonus',
            postEffect: new PostEffectStatsMastery({
                percent: new StatTable('mastery', [A4MasteryRatio]),
            }),
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'sucrose_witch_homework',
            serializeId: 3,
            title: 'talent_name.sucrose_sevenfold_transmutation',
            description: 'talent_descr.sucrose_sevenfold_transmutation',
            info: {hexerei: true},
        }),
        new ConditionBoolean({
            name: 'sucrose_small_wind_spirit',
            serializeId: 4,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.sucrose_small_wind_spirit',
            condition: new ConditionAnd([
                condHexereiResonanceOn,
                condWitchHomeworkOn,
            ]),
            hideCondition: [condWitchHomeworkOff],
            stats: {
                dmg_normal: 5.71428,
                dmg_charged: 5.71428,
                dmg_plunge: 5.71428,
                dmg_skill: 5.71428,
                dmg_burst: 5.71428,
            },
            info: {hexerei: true},
        }),
        new ConditionBoolean({
            name: 'sucrose_large_wind_spirit',
            serializeId: 5,
            title: 'talent_name.sucrose_large_wind_spirit',
            condition: new ConditionAnd([
                condHexereiResonanceOn,
                condWitchHomeworkOn,
            ]),
            hideCondition: [condWitchHomeworkOff],
            stats: {
                dmg_normal: 7.14285,
                dmg_charged: 7.14285,
                dmg_plunge: 7.14285,
                dmg_skill: 7.14285,
                dmg_burst: 7.14285,
            },
            info: {hexerei: true},
        }),
        // Large Wind Spirit blesses nearby Hexerei party members.
        new Condition({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            stats: {
                dmg_normal: 7.14285,
                dmg_charged: 7.14285,
                dmg_plunge: 7.14285,
                dmg_skill: 7.14285,
                dmg_burst: 7.14285,
            },
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'sucrose_large_wind_spirit'}),
                condHexereiResonanceOn,
                condWitchHomeworkOn,
                new ConditionReceiver({
                    condition: new ConditionWitchHomework({}),
                }),
            ]),
        }),
        new ConditionStatic({
            isHidden: true,
            title: 'talent_name.sucrose_catalyst_conversion',
            description: 'talent_descr.sucrose_catalyst_conversion',
            stats: {
                text_value: A1Mastery,
            },
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            isHidden: true,
            title: 'talent_name.sucrose_mollis_favonius',
            description: 'talent_descr.sucrose_mollis_favonius',
            stats: {
                text_percent: A4MasteryPercent,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        // Each selected Swirl element buffs only matching party members.
        // A1 Catalyst Conversion: game data
        // (Avatar_Sucrose_PermanentSkill_Catalysa,
        // UNIQUE_Avatar_Sucrose_PermanentSkill_Catalysa_{Fire,Water,Ice,Electric})
        // writes the flat +50 EM as Actor_ElemMasteryDelta (premod, no Extra),
        // with no stat read. Conditions write premod: default confirmed, no
        // params. GO writes it under premod.
        new ConditionDropdownElement({
            name: 'sucrose_catalyst_conversion',
            serializeId: 2,
            receivers: RECEIVERS.OTHERS,
            title: 'talent_name.sucrose_catalyst_conversion',
            description: 'talent_descr.sucrose_catalyst_conversion',
            displayStats: {text_value: A1Mastery},
            multiple: true,
            info: {ascension: 1},
            subConditions: [new ConditionAscensionChar({ascension: 1})],
            values: ['cryo', 'electro', 'hydro', 'pyro'].map((element, index) => ({
                value: element,
                serializeId: index + 1,
                conditions: [new Condition({
                    stats: {mastery: A1Mastery},
                    condition: new ConditionReceiver({
                        condition: new ConditionBooleanCharElement({element: [element]}),
                    }),
                })],
            })),
        }),
        // Skill hits share 20% of Sucrose's Mastery with other party members.
        new ConditionBoolean({
            name: 'sucrose_mollis_favonius',
            serializeId: 6,
            title: 'talent_name.sucrose_mollis_favonius',
            description: 'talent_descr.sucrose_mollis_favonius',
            info: {ascension: 4},
            displayStats: {text_percent: A4MasteryPercent},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    postEffects: [
        // A4 Mollis Favonius: game data
        // (Avatar_Sucrose_PermanentSkill_NetherWind,
        // UNIQUE_Avatar_Sucrose_PermanentSkill_NetherWind_Buff) computes
        // Actor_ElemMasteryExtraDelta (extra) from
        // FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY (premod EM). KQM: flat EM
        // (Albedo A4, Kazuha C2) counts; Nahida A1 and Key of Khaj-Nisut
        // extra EM do not. GO reads input.premod.eleMas into teamBuff.total.
        // Default confirmed, no params.
        new PostEffectStatsMastery({
            receivers: RECEIVERS.OTHERS,
            percent: new StatTable('mastery', [A4MasteryRatio]),
            conditions: [
                new ConditionBoolean({name: 'sucrose_mollis_favonius'}),
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.sucrose_clustered_vacuum_field',
                    description: 'talent_descr.sucrose_clustered_vacuum_field',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.sucrose_unbound_form',
                    description: 'talent_descr.sucrose_unbound_form',
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
                new ConditionStatic({
                    title: 'talent_name.sucrose_alchemania',
                    description: 'talent_descr.sucrose_alchemania',
                }),
            ],
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
                // C6 Chaotic Entropy: game data (UNIQUE_Hurricane_Mix_{Fire,
                // Water,Ice,Electric}_Enhancement[_Hexenzirkel]) writes the flat
                // 20% (+8.57142% Hexerei) bonus as Actor_*AddHurtDelta (premod,
                // no Extra), with no stat read. Conditions write premod:
                // default confirmed, no params.
                new ConditionDropdownElement({
                    name: 'sucrose_chaotic_entropy',
                    serializeId: 1,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.sucrose_chaotic_entropy',
                    description: 'talent_descr.sucrose_chaotic_entropy',
                    hideCondition: [condWitchHomeworkOn],
                    condition: condWitchHomeworkOff,
                    values: [
                        {
                            value: 'cryo',
                            serializeId: 1,
                            conditions: [
                                new Condition({stats: {dmg_cryo: C6DmgBonus}}),
                            ],
                        },
                        {
                            value: 'electro',
                            serializeId: 2,
                            conditions: [
                                new Condition({stats: {dmg_electro: C6DmgBonus}}),
                            ],
                        },
                        {
                            value: 'hydro',
                            serializeId: 3,
                            conditions: [
                                new Condition({stats: {dmg_hydro: C6DmgBonus}}),
                            ],
                        },
                        {
                            value: 'pyro',
                            serializeId: 4,
                            conditions: [
                                new Condition({stats: {dmg_pyro: C6DmgBonus}}),
                            ],
                        },
                    ],
                }),
                new ConditionDropdownElement({
                    name: 'sucrose_chaotic_entropy',
                    serializeId: 1,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.sucrose_chaotic_entropy',
                    description: 'talent_descr.sucrose_chaotic_entropy_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    values: [
                        {
                            value: 'cryo',
                            serializeId: 1,
                            conditions: [
                                new Condition({stats: {dmg_cryo: C6DmgBonus}}),
                                // Nearby Hexerei characters gain an additional
                                // 8.57142% Elemental DMG Bonus.
                                new Condition({
                                    stats: {dmg_cryo: 8.57142},
                                    condition: new ConditionReceiver({
                                        condition: new ConditionWitchHomework({}),
                                    }),
                                }),
                            ],
                        },
                        {
                            value: 'electro',
                            serializeId: 2,
                            conditions: [
                                new Condition({stats: {dmg_electro: C6DmgBonus}}),
                                new Condition({
                                    stats: {dmg_electro: 8.57142},
                                    condition: new ConditionReceiver({
                                        condition: new ConditionWitchHomework({}),
                                    }),
                                }),
                            ],
                        },
                        {
                            value: 'hydro',
                            serializeId: 3,
                            conditions: [
                                new Condition({stats: {dmg_hydro: C6DmgBonus}}),
                                new Condition({
                                    stats: {dmg_hydro: 8.57142},
                                    condition: new ConditionReceiver({
                                        condition: new ConditionWitchHomework({}),
                                    }),
                                }),
                            ],
                        },
                        {
                            value: 'pyro',
                            serializeId: 4,
                            conditions: [
                                new Condition({stats: {dmg_pyro: C6DmgBonus}}),
                                new Condition({
                                    stats: {dmg_pyro: 8.57142},
                                    condition: new ConditionReceiver({
                                        condition: new ConditionWitchHomework({}),
                                    }),
                                }),
                            ],
                        },
                    ],
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox'], [4, 'dropdown'], [8, 'checkbox'], [9, 'checkbox'], [10, 'checkbox']],
});
