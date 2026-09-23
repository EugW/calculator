import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionNumberTalent } from "../../classes/Condition/Number/Talent";
import { ConditionStacks } from "../../classes/Condition/Stacks";
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
import { FeatureHeal } from "../../classes/Feature2/Heal";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsHP } from "../../classes/PostEffect/Stats/HP";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { CHARACTER_MAX_POSSIBLE_HP } from "../Constants";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Vodyanitsa.s1_id,
        title: 'talent_name.vodyanitsa_psyshkhwe_arietta',
        description: 'talent_descr.vodyanitsa_psyshkhwe_arietta',
        items: [
            {table: new StatTable('normal_hit_1', charTalentTables.Vodyanitsa.s1.p1)},
            {table: new StatTable('normal_hit_2', charTalentTables.Vodyanitsa.s1.p2)},
            {table: new StatTable('normal_hit_3', charTalentTables.Vodyanitsa.s1.p3)},
            {table: new StatTable('normal_hit_4', charTalentTables.Vodyanitsa.s1.p4)},
            {table: new StatTable('charged_hit', charTalentTables.Vodyanitsa.s1.p5)},
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Vodyanitsa.s1.p6),
            },
            {table: new StatTable('plunge', charTalentTables.Vodyanitsa.s1.p7)},
            {table: new StatTable('plunge_low', charTalentTables.Vodyanitsa.s1.p8)},
            {table: new StatTable('plunge_high', charTalentTables.Vodyanitsa.s1.p9)},
        ],
    },
    skill: {
        gameId: charTalentTables.Vodyanitsa.s2_id,
        title: 'talent_name.vodyanitsa_sonorous_dawn',
        description: 'talent_descr.vodyanitsa_sonorous_dawn',
        items: [
            {
                table: new StatTable(
                    'vodyanitsa_sonorous_dawn_initial_dmg',
                    charTalentTables.Vodyanitsa.s2.p1,
                ),
            },
            {
                unit: 'sec',
                table: new StatTable(
                    'vodyanitsa_song_of_ages_past_duration',
                    charTalentTables.Vodyanitsa.s2.p2,
                ),
            },
            {
                unit: 'sec',
                table: new StatTable(
                    'vodyanitsa_horn_of_springs_call_attack_interval',
                    charTalentTables.Vodyanitsa.s2.p3,
                ),
            },
            {
                table: new StatTable(
                    'vodyanitsa_horn_of_springs_call_dmg',
                    charTalentTables.Vodyanitsa.s2.p4,
                ),
            },
            {
                unit: 'hp',
                table: [
                    new StatTable(
                        'vodyanitsa_song_of_ages_past_heal',
                        charTalentTables.Vodyanitsa.s2.p6,
                    ),
                    new StatTable('', charTalentTables.Vodyanitsa.s2.p5),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable(
                    'vodyanitsa_song_of_ages_past_heal_interval',
                    charTalentTables.Vodyanitsa.s2.p7,
                ),
            },
            {
                table: new StatTable(
                    'vodyanitsa_hydro_cryo_res_reduction',
                    charTalentTables.Vodyanitsa.s2.p8,
                ),
            },
            {
                unit: 'sec',
                table: new StatTable(
                    'vodyanitsa_res_reduction_duration',
                    charTalentTables.Vodyanitsa.s2.p9,
                ),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Vodyanitsa.s2.p10),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Vodyanitsa.s3_id,
        title: 'talent_name.vodyanitsa_sink_with_thee',
        description: 'talent_descr.vodyanitsa_sink_with_thee',
        items: [
            {
                table: new StatTable(
                    'vodyanitsa_sink_with_thee_dmg',
                    charTalentTables.Vodyanitsa.s3.p1,
                ),
            },
            {
                table: new StatTable(
                    'vodyanitsa_song_of_ages_past_dmg_bonus',
                    charTalentTables.Vodyanitsa.s3.p2,
                ),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Vodyanitsa.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Vodyanitsa.s3.p4),
            },
        ],
    },
});

const A1AnemoResistance = -35;
const A4LeadVocalStacks = 25;
const A4ChorusStacks = 10;
const A4HpThreshold = 40000;
const A4HydroCryoFlatPerHp = 0.14;
const A4HydroCryoFlatCap = 3500;
const A4StellarSwirlFlatPerHp = 0.26;
const A4StellarSwirlFlatCap = 6500;
const C1AtkPerHp = 0.008;
const C2HydroCryoCritDmg = 50;
const C2StellarSwirlCritDmg = 60;
const C4HealingIncrease = 50;
const C4HpPercent = 20;
const C4HpStacks = 3;
const C6StellarSwirlElevation = 25;
const C6HydroCryoDmg = 60;

const hydroCryoDirectTarget = () => new FeatureMultiplierTarget({
    damageElements: ['hydro', 'cryo'],
    damageTypes: ['normal', 'charged', 'plunge', 'skill', 'burst'],
});

const stellarSwirlFlatTarget = () => new FeatureMultiplierTarget({
    damageTypes: ['stellarswirl'],
    options: ['stellarswirl_flat'],
});

const localWanderingVortexState = () => new ConditionBoolean({name: 'vodyanitsa_wandering_vortex'});
const partyWanderingVortexState = () => new ConditionBoolean({name: 'party.vodyanitsa_wandering_vortex'});

class FeatureMultiplierVodyanitsaBurst extends FeatureMultiplier {
    getScalingMultiplier(data) {
        return data.settings.vodyanitsa_song_of_ages_past
            ? 1 + Talents.get('burst.vodyanitsa_song_of_ages_past_dmg_bonus').getValue(this.getLevel(data)) / 100
            : 1;
    }
}

class ConditionVodyanitsaSkillResistance extends ConditionBooleanLevels {
    getLevel(settings) {
        // Character conditions run before constellation settings are applied.
        return super.getLevel({
            ...settings,
            char_skill_elemental_bonus: Math.max(
                settings.char_skill_elemental_bonus || 0,
                settings.char_constellation >= 3 ? 3 : 0,
            ),
        });
    }
}

const skillResistanceStats = () => [
    Talents.getMulti({
        name: 'enemy_res_hydro',
        from: 'skill.vodyanitsa_hydro_cryo_res_reduction',
        multi: -1,
    }),
    Talents.getMulti({
        name: 'enemy_res_cryo',
        from: 'skill.vodyanitsa_hydro_cryo_res_reduction',
        multi: -1,
    }),
];

const c1AtkPost = new PostEffectStatsHP({
    percent: new StatTable('atk', [C1AtkPerHp]),
    condition: new ConditionAnd([
        new ConditionConstellation({constellation: 1}),
        new ConditionBoolean({name: 'vodyanitsa_c1_healing'}),
    ]),
});

export const Vodyanitsa = new DbObjectChar({
    name: 'vodyanitsa',
    serializeId: 127,
    gameId: 10000140,
    iconClass: 'char-icon-vodyanitsa',
    rarity: 5,
    element: 'hydro',
    weapon: 'catalyst',
    origin: 'snezhnaya',
    talents: Talents,
    statTable: charTables.Vodyanitsa,
    features: [
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_low',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'vodyanitsa_sonorous_dawn_initial_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.vodyanitsa_sonorous_dawn_initial_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'vodyanitsa_horn_of_springs_call_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.vodyanitsa_horn_of_springs_call_dmg'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'skill',
            name: 'vodyanitsa_song_of_ages_past_heal',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.vodyanitsa_song_of_ages_past_heal'),
                    scalingSource: 'constellation4',
                    scalingMultiplier: 1 + C4HealingIncrease / 100,
                    scalingMultiplierCondition: new ConditionAnd([
                        new ConditionConstellation({constellation: 4}),
                        new ConditionBoolean({name: 'vodyanitsa_c4_target_below_40'}),
                    ]),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'vodyanitsa_sink_with_thee_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplierVodyanitsaBurst({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.vodyanitsa_sink_with_thee_dmg'),
                    scalingSource: 'vodyanitsa_song_of_ages_past',
                }),
            ],
        }),
    ],
    conditions: [
        new ConditionBoolean({
            // Retain the removed control's ID so existing builds still load.
            name: 'vodyanitsa_off_field',
            serializeId: 8,
            isHidden: true,
        }),
        new ConditionVodyanitsaSkillResistance({
            name: 'vodyanitsa_song_of_ages_past',
            serializeId: 1,
            title: 'talent_name.vodyanitsa_song_of_ages_past',
            description: 'talent_descr.vodyanitsa_song_of_ages_past',
            levelSetting: 'char_skill_elemental',
            rotation: 'self',
            stats: skillResistanceStats(),
        }),
        new ConditionBoolean({
            name: 'vodyanitsa_wandering_vortex',
            serializeId: 2,
            title: 'talent_name.vodyanitsa_the_last_djeguako_songstress',
            description: 'talent_descr.vodyanitsa_the_last_djeguako_songstress',
            info: {ascension: 1},
            rotation: 'self',
            stats: {
                enemy_res_anemo: A1AnemoResistance,
            },
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStacks({
            name: 'vodyanitsa_lead_vocal',
            serializeId: 3,
            title: 'talent_name.n11400001',
            description: 'talent_descr.n11400001',
            info: {ascension: 4},
            rotation: 'self',
            maxStacks: A4LeadVocalStacks,
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    multipliers: [
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'ascension4',
            values: new ValueTable([A4HydroCryoFlatPerHp * 100]),
            exceedStatValue: A4HpThreshold,
            capValue: new ValueTable([A4HydroCryoFlatCap]),
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                new ConditionStacks({name: 'vodyanitsa_lead_vocal', maxStacks: A4LeadVocalStacks}),
                new ConditionNot([localWanderingVortexState()]),
            ]),
            target: hydroCryoDirectTarget(),
        }),
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'ascension4',
            values: new ValueTable([A4StellarSwirlFlatPerHp * 100]),
            exceedStatValue: A4HpThreshold,
            capValue: new ValueTable([A4StellarSwirlFlatCap]),
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                new ConditionStacks({name: 'vodyanitsa_lead_vocal', maxStacks: A4LeadVocalStacks}),
                localWanderingVortexState(),
            ]),
            target: stellarSwirlFlatTarget(),
        }),
    ],
    postEffects: [
        c1AtkPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'vodyanitsa_c1_healing',
                    serializeId: 4,
                    title: 'talent_name.vodyanitsa_waters_in_full_splendor',
                    description: 'talent_descr.vodyanitsa_waters_in_full_splendor',
                    rotation: 'self',
                }),
            ],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'vodyanitsa_c2_horn_hit',
                    serializeId: 5,
                    title: 'talent_name.vodyanitsa_echoes_that_pierce_the_snow',
                    description: 'talent_descr.vodyanitsa_echoes_that_pierce_the_snow',
                    rotation: 'self',
                }),
                new Condition({
                    isHidden: true,
                    stats: {
                        crit_dmg_hydro: C2HydroCryoCritDmg,
                        crit_dmg_cryo: C2HydroCryoCritDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'vodyanitsa_c2_horn_hit'}),
                        new ConditionNot([localWanderingVortexState()]),
                    ]),
                }),
                new Condition({
                    isHidden: true,
                    stats: {
                        crit_dmg_stellarswirl: C2StellarSwirlCritDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'vodyanitsa_c2_horn_hit'}),
                        localWanderingVortexState(),
                    ]),
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
                    name: 'vodyanitsa_c4_target_below_40',
                    serializeId: 6,
                    title: 'talent_name.vodyanitsa_melancholic_voice_upon_the_gentle_waters',
                    description: 'talent_descr.vodyanitsa_melancholic_voice_upon_the_gentle_waters_1',
                    rotation: 'self',
                    stats: {
                        text_percent_healing: C4HealingIncrease,
                    },
                }),
                new ConditionStacks({
                    name: 'vodyanitsa_c4_hp_stacks',
                    serializeId: 7,
                    title: 'talent_name.vodyanitsa_melancholic_voice_upon_the_gentle_waters',
                    description: 'talent_descr.vodyanitsa_melancholic_voice_upon_the_gentle_waters_2',
                    rotation: 'self',
                    maxStacks: C4HpStacks,
                    stats: [
                        new StatTable('hp_percent', [C4HpPercent]),
                    ],
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
                new ConditionStatic({
                    title: 'talent_name.vodyanitsa_neverending_song_of_revelry',
                    description: 'talent_descr.vodyanitsa_neverending_song_of_revelry',
                    stats: {
                        dmg_stellarswirl_special: C6StellarSwirlElevation,
                        dmg_hydro: C6HydroCryoDmg,
                        dmg_cryo: C6HydroCryoDmg,
                    },
                    condition: new ConditionBoolean({name: 'vodyanitsa_song_of_ages_past'}),
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['hp_total'],
            settings: ['char_skill_elemental'],
        },
        conditions: [
            new ConditionBoolean({
                // Retain the removed control's ID so existing builds still load.
                name: 'party.vodyanitsa_off_field',
                serializeId: 10,
                isHidden: true,
            }),
            new ConditionNumber({
                name: 'vodyanitsa_hp_total',
                serializeId: 1,
                title: 'talent_name.stats_total_hp',
                partyStat: 'hp_total',
                max: CHARACTER_MAX_POSSIBLE_HP,
            }),
            new ConditionNumberTalent({
                name: 'vodyanitsa_char_skill_elemental',
                serializeId: 2,
                title: 'talent_name.stats_level_skill',
                partySetting: 'char_skill_elemental',
            }),
            new ConditionBoolean({
                name: 'party.vodyanitsa_constellation_3',
                serializeId: 9,
                title: 'talent_name.vodyanitsa_song_lingering_on_a_spring_morning',
                description: 'talent_descr.char_constellation_skill',
                info: {constellation: 3},
                settings: {
                    vodyanitsa_char_skill_elemental_bonus: 3,
                },
            }),
            new ConditionBooleanLevels({
                name: 'party.vodyanitsa_song_of_ages_past',
                serializeId: 3,
                title: 'talent_name.vodyanitsa_song_of_ages_past',
                description: 'talent_descr.vodyanitsa_song_of_ages_past',
                levelSetting: 'vodyanitsa_char_skill_elemental',
                rotation: 'party',
                stats: skillResistanceStats(),
            }),
            new ConditionBoolean({
                name: 'party.vodyanitsa_wandering_vortex',
                serializeId: 4,
                title: 'talent_name.vodyanitsa_the_last_djeguako_songstress',
                description: 'talent_descr.vodyanitsa_the_last_djeguako_songstress',
                info: {ascension: 1},
                rotation: 'party',
                stats: {
                    enemy_res_anemo: A1AnemoResistance,
                },
            }),
            new ConditionStacks({
                name: 'party.vodyanitsa_chorus',
                serializeId: 5,
                title: 'talent_name.n11400002',
                description: 'talent_descr.n11400002',
                info: {ascension: 4},
                rotation: 'party',
                maxStacks: A4ChorusStacks,
            }),
            new ConditionBoolean({
                name: 'party.vodyanitsa_c1_healing',
                serializeId: 6,
                title: 'talent_name.vodyanitsa_waters_in_full_splendor',
                description: 'talent_descr.vodyanitsa_waters_in_full_splendor',
                info: {constellation: 1},
                rotation: 'party',
            }),
            new ConditionBoolean({
                name: 'party.vodyanitsa_c2_horn_hit',
                serializeId: 7,
                title: 'talent_name.vodyanitsa_echoes_that_pierce_the_snow',
                description: 'talent_descr.vodyanitsa_echoes_that_pierce_the_snow',
                info: {constellation: 2},
                rotation: 'party',
            }),
            new Condition({
                isHidden: true,
                stats: {
                    crit_dmg_hydro: C2HydroCryoCritDmg,
                    crit_dmg_cryo: C2HydroCryoCritDmg,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.vodyanitsa_c2_horn_hit'}),
                    new ConditionNot([partyWanderingVortexState()]),
                ]),
            }),
            new Condition({
                isHidden: true,
                stats: {
                    crit_dmg_stellarswirl: C2StellarSwirlCritDmg,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.vodyanitsa_c2_horn_hit'}),
                    partyWanderingVortexState(),
                ]),
            }),
            new ConditionBoolean({
                name: 'party.vodyanitsa_c6_song_of_ages_past',
                serializeId: 8,
                title: 'talent_name.vodyanitsa_neverending_song_of_revelry',
                description: 'talent_descr.vodyanitsa_neverending_song_of_revelry',
                info: {constellation: 6},
                rotation: 'party',
            }),
            new Condition({
                isHidden: true,
                stats: {
                    dmg_stellarswirl_special: C6StellarSwirlElevation,
                    dmg_hydro: C6HydroCryoDmg,
                    dmg_cryo: C6HydroCryoDmg,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.vodyanitsa_c6_song_of_ages_past'}),
                    new ConditionBoolean({name: 'party.vodyanitsa_song_of_ages_past'}),
                ]),
            }),
        ],
        multipliers: [
            new FeatureMultiplier({
                scaling: 'vodyanitsa_hp_total',
                source: 'vodyanitsa',
                values: new ValueTable([A4HydroCryoFlatPerHp * 100]),
                exceedStatValue: A4HpThreshold,
                capValue: new ValueTable([A4HydroCryoFlatCap]),
                condition: new ConditionAnd([
                    new ConditionStacks({
                        name: 'party.vodyanitsa_chorus',
                        maxStacks: A4ChorusStacks,
                    }),
                    new ConditionNot([partyWanderingVortexState()]),
                ]),
                target: hydroCryoDirectTarget(),
            }),
            new FeatureMultiplier({
                scaling: 'vodyanitsa_hp_total',
                source: 'vodyanitsa',
                values: new ValueTable([A4StellarSwirlFlatPerHp * 100]),
                exceedStatValue: A4HpThreshold,
                capValue: new ValueTable([A4StellarSwirlFlatCap]),
                condition: new ConditionAnd([
                    new ConditionStacks({
                        name: 'party.vodyanitsa_chorus',
                        maxStacks: A4ChorusStacks,
                    }),
                    partyWanderingVortexState(),
                ]),
                target: stellarSwirlFlatTarget(),
            }),
        ],
        postEffects: [
            new PostEffectStats({
                from: 'vodyanitsa_hp_total',
                percent: new StatTable('atk', [C1AtkPerHp]),
                condition: new ConditionBoolean({name: 'party.vodyanitsa_c1_healing'}),
            }),
        ],
    },
});
