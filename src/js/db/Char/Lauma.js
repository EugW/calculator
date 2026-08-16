import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionNumberTalent } from "../../classes/Condition/Number/Talent";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionLevels } from "../../classes/Condition/Levels";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureReactionLunarBloomLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/BloomLike";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsMastery } from "../../classes/PostEffect/Stats/Mastery";
import { StatTable } from "../../classes/StatTable";
import { StatTableAscensionScale } from "../../classes/StatTable/Ascension/Scale";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Lauma.s1_id,
        title: 'talent_name.lauma_peregrination_of_linnunrata',
        description: 'talent_descr.lauma_peregrination_of_linnunrata',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Lauma.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Lauma.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Lauma.s1.p3),
            },
            {
                table: new StatTable('lauma_spiritcall_prayer_dmg', charTalentTables.Lauma.s1.p9),
            },
            {
                table: new StatTable('plunge', charTalentTables.Lauma.s1.p10),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Lauma.s1.p11),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Lauma.s1.p12),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Lauma.s2_id,
        title: 'talent_name.lauma_dawnless_rest_of_karsikko',
        description: 'talent_descr.lauma_dawnless_rest_of_karsikko',
        items: [
            {
                table: new StatTable('lauma_press_dmg', charTalentTables.Lauma.s2.p1),
            },
            {
                table: new StatTable('lauma_hold_1_dmg', charTalentTables.Lauma.s2.p2),
            },
            {
                table: new StatTable('lauma_hold_2_dmg', charTalentTables.Lauma.s2.p3),
            },
            {
                table: new StatTable('lauma_sanctuary_dmg', charTalentTables.Lauma.s2.p4),
            },
            {
                table: new StatTable('lauma_sanctuary_enhanced_dmg', charTalentTables.Lauma.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('lauma_sanctuary_duration', charTalentTables.Lauma.s2.p6),
            },
            {
                unit: 'percent',
                table: new StatTable('lauma_res_decrease', charTalentTables.Lauma.s2.p8),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Lauma.s2.p10),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Lauma.s3_id,
        title: 'talent_name.lauma_all_hearts_become_the_beating_moon',
        description: 'talent_descr.lauma_all_hearts_become_the_beating_moon',
        items: [
            {
                unit: '',
                table: new StatTable('lauma_pale_hymn_stacks', charTalentTables.Lauma.s3.p1),
            },
            {
                table: new StatTable('lauma_bloom_dmg_increase', charTalentTables.Lauma.s3.p3),
            },
            {
                table: new StatTable('lauma_lunarbloom_dmg_increase', charTalentTables.Lauma.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('lauma_pale_hymn_duration', charTalentTables.Lauma.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Lauma.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Lauma.s3.p7),
            },
        ],
    },
});

// Passive scaling constants
const PassiveLunarScale = 0.0175;
const PassiveLunarScaleCap = 14;
const A1BloomCritRate = 15;
const A1BloomCritDmg = 100;
const A1LunarBloomCritRate = 10;
const A1LunarBloomCritDmg = 20;
const A4SkillDmgScale = 0.04;
const A4SkillDmgCap = 32;

// Skill constants
const MaxVerdantDew = 3;

// Constellation constants
const C1HealScale = 500;
const C2BloomEmScale = 500;
const C2LunarBloomEmScale = 400;
const C2LunarBloomDmg = 40;
const C6SanctuaryEmScale = 185;
const C6NormalEmScale = 150;
const C6LunarBloomElevate = 25;

// Lunar-Bloom base bonus post effect (scales from EM)
const lunarBloomPost = new PostEffectStatsMastery({
    percent: new StatTable('lunarbloom_multi', [PassiveLunarScale]),
    statCap: new ValueTable([PassiveLunarScaleCap]),
});

// A4 Skill damage bonus based on EM
const a4SkillDmgPost = new PostEffectStatsMastery({
    percent: new StatTable('dmg_skill', [A4SkillDmgScale]),
    statCap: new ValueTable([A4SkillDmgCap]),
    condition: new ConditionAscensionChar({ascension: 4}),
});

export const Lauma = new DbObjectChar({
    name: 'lauma',
    serializeId: 110,
    gameId: 10000119,
    iconClass: 'char-icon-lauma',
    rarity: 5,
    element: 'dendro',
    weapon: 'catalyst',
    origin: 'nodkrai',
    talents: Talents,
    statTable: [
        ...charTables.Lauma,
        new StatTableAscensionScale({
            stat: 'mastery_base',
            base: 200,
        }),
    ],
    features: [
        new FeatureDamageNormal({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'lauma_spiritcall_prayer_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.lauma_spiritcall_prayer_dmg'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'lauma_press_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lauma_press_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'lauma_hold_1_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lauma_hold_1_dmg'),
                }),
            ],
        }),
        new FeatureReactionLunarBloomLike({
            name: 'lauma_hold_2_dmg',
            element: 'dendro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    stacksLeveling: 'lauma_verdant_dew_consumed',
                    maxStacks: MaxVerdantDew,
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: Talents.get('skill.lauma_hold_2_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'lauma_sanctuary_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lauma_sanctuary_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'lauma_sanctuary_enhanced_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lauma_sanctuary_enhanced_dmg'),
                }),
            ],
        }),
        // C6 Sanctuary Lunar-Bloom damage
        new FeatureReactionLunarBloomLike({
            element: 'dendro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation6',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: new StatTable('lauma_c6_sanctuary_dmg', [C6SanctuaryEmScale]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
        // C6 Normal Attack Lunar-Bloom damage
        new FeatureReactionLunarBloomLike({
            element: 'dendro',
            category: 'attack',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation6',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: new StatTable('lauma_c6_normal_dmg', [C6NormalEmScale]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'lauma_lunarbloom_bonus',
            postEffect: lunarBloomPost,
            format: 'percent',
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'lauma_skill_em_bonus',
            postEffect: a4SkillDmgPost,
            format: 'percent',
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                allowed_lunarbloom: 1,
            },
        }),
        new ConditionCalcMoonsign(),
        // C5: Skill level +3 (must be in main conditions for ConditionLevels to see it)
        new Condition({
            settings: {
                char_skill_elemental_bonus: 3,
            },
            subConditions: [
                new ConditionConstellation({constellation: 5}),
            ],
        }),
        new ConditionBooleanLevels({
            name: 'lauma_light_for_the_frosty_night',
            serializeId: 1,
            title: 'talent_name.lauma_light_for_the_frosty_night',
            description: 'talent_descr.lauma_light_for_the_frosty_night',
            info: {ascension: 1},
            levelSetting: 'party_moonsign',
            stats: [
                new StatTable('crit_rate_bloom', [A1BloomCritRate, 0]),
                new StatTable('crit_dmg_bloom', [A1BloomCritDmg, 0]),
                new StatTable('crit_rate_lunarbloom', [0, A1LunarBloomCritRate]),
                new StatTable('crit_dmg_lunarbloom', [0, A1LunarBloomCritDmg]),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.lauma_cleansing_for_the_spring',
            description: 'talent_descr.lauma_cleansing_for_the_spring',
            info: {ascension: 4},
            stats: {
                text_percent: A4SkillDmgScale,
                text_percent_max: A4SkillDmgCap,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionStatic({
            title: 'talent_name.lauma_natures_chorus',
            description: 'talent_descr.lauma_natures_chorus',
            stats: {
                text_percent: PassiveLunarScale * 100,
                text_percent_max: PassiveLunarScaleCap,
            },
        }),
        new ConditionBoolean({
            name: 'lauma_res_shred',
            serializeId: 3,
            title: 'talent_name.lauma_dawnless_rest_of_karsikko',
            description: 'talent_descr.lauma_dawnless_rest_of_karsikko',
            rotation: 'self',
        }),
        new ConditionLevels({
            levelSetting: 'char_skill_elemental',
            stats: [
                Talents.getMulti({
                    name: 'enemy_res_dendro',
                    from: 'skill.lauma_res_decrease',
                    multi: -1,
                }),
                Talents.getMulti({
                    name: 'enemy_res_hydro',
                    from: 'skill.lauma_res_decrease',
                    multi: -1,
                }),
            ],
            subConditions: [
                new ConditionBoolean({name: 'lauma_res_shred'}),
            ],
        }),
        new ConditionNumber({
            name: 'lauma_verdant_dew_consumed',
            serializeId: 6,
            title: 'talent_name.n11190008',
            description: 'talent_descr.n11190008',
            max: MaxVerdantDew,
            default: MaxVerdantDew,
        }),
        // Burst: Pale Hymn self-buff toggle
        new ConditionBoolean({
            name: 'lauma_pale_hymn',
            serializeId: 7,
            title: 'talent_name.n11190003',
            description: 'talent_descr.n11190003',
            rotation: 'self',
        }),
    ],
    postEffects: [
        lunarBloomPost,
        a4SkillDmgPost,
    ],
    multipliers: [
        // Pale Hymn self-buff: Bloom/Hyperbloom/Burgeon DMG Increase
        new FeatureMultiplier({
            scaling: 'mastery*',
            leveling: 'char_skill_burst',
            source: 'lauma_pale_hymn',
            values: Talents.get('burst.lauma_bloom_dmg_increase'),
            condition: new ConditionBoolean({name: 'lauma_pale_hymn'}),
            target: new FeatureMultiplierTarget({
                tags: ['bloom_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        // Pale Hymn self-buff: Lunar-Bloom DMG Increase
        new FeatureMultiplier({
            scaling: 'mastery*',
            leveling: 'char_skill_burst',
            source: 'lauma_pale_hymn',
            values: Talents.get('burst.lauma_lunarbloom_dmg_increase'),
            condition: new ConditionBoolean({name: 'lauma_pale_hymn'}),
            target: new FeatureMultiplierTarget({
                tags: ['lunarbloom_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        // C2 Pale Hymn: Additional Bloom/Hyperbloom/Burgeon DMG Increase (+500% EM)
        new FeatureMultiplier({
            scaling: 'mastery*',
            source: 'constellation2',
            values: new StatTable('lauma_c2_bloom_dmg_increase', [C2BloomEmScale]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'lauma_pale_hymn'}),
                new ConditionConstellation({constellation: 2}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['bloom_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        // C2 Pale Hymn: Additional Lunar-Bloom DMG Increase (+400% EM)
        new FeatureMultiplier({
            scaling: 'mastery*',
            source: 'constellation2',
            values: new StatTable('lauma_c2_lunarbloom_dmg_increase', [C2LunarBloomEmScale]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'lauma_pale_hymn'}),
                new ConditionConstellation({constellation: 2}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['lunarbloom_reaction'],
                options: ['reaction_flat'],
            }),
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.lauma_o_lips_weave_me_songs_and_psalms',
                    description: 'talent_descr.lauma_o_lips_weave_me_songs_and_psalms',
                    stats: {
                        text_percent_heal: C1HealScale,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'lauma_twine_warnings_and_tales_from_the_north',
                    serializeId: 4,
                    title: 'talent_name.lauma_twine_warnings_and_tales_from_the_north',
                    description: 'talent_descr.lauma_twine_warnings_and_tales_from_the_north',
                    stats: {
                        'dmg_reaction_lunarbloom': C2LunarBloomDmg,
                    },
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
                    title: 'talent_name.lauma_nor_yearn_for_the_great_bears_might',
                    description: 'talent_descr.lauma_nor_yearn_for_the_great_bears_might',
                }),
            ],
        },
        {},
        {
            conditions: [
                new ConditionBoolean({
                    name: 'lauma_i_offer_blood_and_tears_to_the_moonlight',
                    serializeId: 5,
                    title: 'talent_name.lauma_i_offer_blood_and_tears_to_the_moonlight',
                    description: 'talent_descr.lauma_i_offer_blood_and_tears_to_the_moonlight',
                    stats: {
                        text_percent_dmg: C6SanctuaryEmScale,
                        text_percent_dmg_2: C6NormalEmScale,
                        'dmg_lunarbloom_special': C6LunarBloomElevate,
                    },
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['mastery_total'],
            settings: ['char_skill_elemental', 'char_skill_burst'],
        },
        conditions: [
            new Condition({settings: {allowed_lunarbloom: 1}}),
            new ConditionCalcMoonsign(),
            new ConditionNumber({
                name: 'lauma_mastery_total',
                title: 'talent_name.stats_total_mastery',
                partyStat: 'mastery_total',
                serializeId: 1,
                rotation: 'party',
                max: 2000,
            }),
            new ConditionStatic({
                title: 'talent_name.lauma_natures_chorus',
                description: 'talent_descr.lauma_natures_chorus',
                stats: {
                    text_percent: PassiveLunarScale * 100,
                    text_percent_max: PassiveLunarScaleCap,
                },
            }),
            // Skill level input for RES shred scaling
            new ConditionNumberTalent({
                name: 'lauma_char_skill_elemental',
                serializeId: 9,
                title: 'talent_name.stats_level_skill',
                partySetting: 'char_skill_elemental',
            }),
            // C5: Skill level +3
            new ConditionBoolean({
                name: 'party.lauma_constellation_5',
                serializeId: 10,
                title: 'talent_name.lauma_if_truth_may_be_subject_to_witness',
                description: 'talent_descr.char_constellation_skill',
                info: {constellation: 5},
                settings: {
                    lauma_char_skill_elemental_bonus: 3,
                },
            }),
            // Skill RES shred (Sanctuary debuff on enemies)
            new ConditionBoolean({
                name: 'party.lauma_res_shred',
                serializeId: 5,
                title: 'talent_name.lauma_dawnless_rest_of_karsikko',
                description: 'talent_descr.lauma_dawnless_rest_of_karsikko',
                rotation: 'party',
            }),
            new ConditionLevels({
                levelSetting: 'lauma_char_skill_elemental',
                stats: [
                    Talents.getMulti({
                        name: 'enemy_res_dendro',
                        from: 'skill.lauma_res_decrease',
                        multi: -1,
                    }),
                    Talents.getMulti({
                        name: 'enemy_res_hydro',
                        from: 'skill.lauma_res_decrease',
                        multi: -1,
                    }),
                ],
                subConditions: [
                    new ConditionBoolean({name: 'party.lauma_res_shred'}),
                ],
            }),
            // A1: Bloom/Hyperbloom/Burgeon crit
            new ConditionBooleanLevels({
                name: 'party.lauma_light_for_the_frosty_night',
                serializeId: 2,
                title: 'talent_name.lauma_light_for_the_frosty_night',
                description: 'talent_descr.lauma_light_for_the_frosty_night',
                info: {ascension: 1},
                rotation: 'party',
                levelSetting: 'party_moonsign',
                stats: [
                    new StatTable('crit_rate_bloom', [A1BloomCritRate, 0]),
                    new StatTable('crit_dmg_bloom', [A1BloomCritDmg, 0]),
                    new StatTable('crit_rate_lunarbloom', [0, A1LunarBloomCritRate]),
                    new StatTable('crit_dmg_lunarbloom', [0, A1LunarBloomCritDmg]),
                ],
            }),
            // C2: Lunar-Bloom DMG bonus
            new ConditionBoolean({
                name: 'party.lauma_twine_warnings_and_tales_from_the_north',
                serializeId: 4,
                title: 'talent_name.lauma_twine_warnings_and_tales_from_the_north',
                description: 'talent_descr.lauma_twine_warnings_and_tales_from_the_north',
                info: {constellation: 2},
                rotation: 'party',
                stats: {
                    'dmg_reaction_lunarbloom': C2LunarBloomDmg,
                },
            }),
            // C6: Lunar-Bloom elevation
            new ConditionBoolean({
                name: 'party.lauma_i_offer_blood_and_tears_to_the_moonlight',
                serializeId: 6,
                title: 'talent_name.lauma_i_offer_blood_and_tears_to_the_moonlight',
                description: 'talent_descr.lauma_i_offer_blood_and_tears_to_the_moonlight',
                info: {constellation: 6},
                rotation: 'party',
                stats: {
                    'dmg_lunarbloom_special': C6LunarBloomElevate,
                },
            }),
            // Burst: Pale Hymn burst level
            new ConditionNumberTalent({
                name: 'lauma_char_skill_burst',
                serializeId: 7,
                title: 'talent_name.stats_level_burst',
                partySetting: 'char_skill_burst',
            }),
            // C3: Burst level +3
            new ConditionBoolean({
                name: 'party.lauma_constellation_3',
                serializeId: 11,
                title: 'talent_name.lauma_seek_not_to_tread_the_sly_foxs_path',
                description: 'talent_descr.char_constellation_burst',
                info: {constellation: 3},
                settings: {
                    lauma_char_skill_burst_bonus: 3,
                },
            }),
            // Burst: Pale Hymn toggle
            new ConditionBoolean({
                name: 'party.lauma_pale_hymn',
                serializeId: 8,
                title: 'talent_name.n11190003',
                description: 'talent_descr.n11190003',
                rotation: 'party',
            }),
        ],
        postEffects: [
            new PostEffectStats({
                from: 'lauma_mastery_total',
                percent: new StatTable('lunarbloom_multi', [PassiveLunarScale]),
                statCap: new ValueTable([PassiveLunarScaleCap]),
            }),
        ],
        multipliers: [
            // Pale Hymn: Bloom/Hyperbloom/Burgeon DMG Increase
            new FeatureMultiplier({
                scaling: 'lauma_mastery_total',
                leveling: 'lauma_char_skill_burst',
                source: 'lauma_pale_hymn',
                values: Talents.get('burst.lauma_bloom_dmg_increase'),
                condition: new ConditionBoolean({name: 'party.lauma_pale_hymn'}),
                target: new FeatureMultiplierTarget({
                    tags: ['bloom_reaction'],
                    options: ['reaction_flat'],
                }),
            }),
            // Pale Hymn: Lunar-Bloom DMG Increase
            new FeatureMultiplier({
                scaling: 'lauma_mastery_total',
                leveling: 'lauma_char_skill_burst',
                source: 'lauma_pale_hymn',
                values: Talents.get('burst.lauma_lunarbloom_dmg_increase'),
                condition: new ConditionBoolean({name: 'party.lauma_pale_hymn'}),
                target: new FeatureMultiplierTarget({
                    tags: ['lunarbloom_reaction'],
                    options: ['reaction_flat'],
                }),
            }),
            // C2 Pale Hymn: Additional Bloom/Hyperbloom/Burgeon DMG Increase (+500% EM)
            new FeatureMultiplier({
                scaling: 'lauma_mastery_total',
                source: 'constellation2',
                values: new StatTable('lauma_c2_bloom_dmg_increase', [C2BloomEmScale]),
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.lauma_pale_hymn'}),
                    new ConditionBoolean({name: 'party.lauma_twine_warnings_and_tales_from_the_north'}),
                ]),
                target: new FeatureMultiplierTarget({
                    tags: ['bloom_reaction'],
                    options: ['reaction_flat'],
                }),
            }),
            // C2 Pale Hymn: Additional Lunar-Bloom DMG Increase (+400% EM)
            new FeatureMultiplier({
                scaling: 'lauma_mastery_total',
                source: 'constellation2',
                values: new StatTable('lauma_c2_lunarbloom_dmg_increase', [C2LunarBloomEmScale]),
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.lauma_pale_hymn'}),
                    new ConditionBoolean({name: 'party.lauma_twine_warnings_and_tales_from_the_north'}),
                ]),
                target: new FeatureMultiplierTarget({
                    tags: ['lunarbloom_reaction'],
                    options: ['reaction_flat'],
                }),
            }),
        ],
    },
});
