import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionNumberNefer } from "../../classes/Condition/Number/Nefer";
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
        gameId: charTalentTables.Nefer.s1_id,
        title: 'talent_name.nefer_striking_serpent',
        description: 'talent_descr.nefer_striking_serpent',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Nefer.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Nefer.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Nefer.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Nefer.s1.p4),
            },
            {
                table: new StatTable('nefer_charged_dmg', charTalentTables.Nefer.s1.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Nefer.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Nefer.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Nefer.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Nefer.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Nefer.s2_id,
        title: 'talent_name.nefer_dance_of_a_thousand_nights',
        description: 'talent_descr.nefer_dance_of_a_thousand_nights',
        items: [
            {
                table: new StatTable('nefer_skill_dmg', charTalentTables.Nefer.s2.p1),
            },
            {
                unit: 'mastery',
                table: new StatTable('nefer_skill_dmg_mastery', charTalentTables.Nefer.s2.p2),
            },
            {
                table: new StatTable('nefer_phantasm_hit_1', charTalentTables.Nefer.s2.p5),
            },
            {
                unit: 'mastery',
                table: new StatTable('nefer_phantasm_hit_1_mastery', charTalentTables.Nefer.s2.p6),
            },
            {
                table: new StatTable('nefer_phantasm_hit_2', charTalentTables.Nefer.s2.p7),
            },
            {
                unit: 'mastery',
                table: new StatTable('nefer_phantasm_hit_2_mastery', charTalentTables.Nefer.s2.p8),
            },
            {
                unit: 'mastery',
                table: new StatTable('nefer_phantasm_shade_hit_1', charTalentTables.Nefer.s2.p9),
            },
            {
                unit: 'mastery',
                table: new StatTable('nefer_phantasm_shade_hit_3', charTalentTables.Nefer.s2.p11),
            },
            {
                unit: 'sec',
                table: new StatTable('nefer_shadow_dance_duration', charTalentTables.Nefer.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Nefer.s2.p12),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Nefer.s3_id,
        title: 'talent_name.nefer_true_eyes_phantasm',
        description: 'talent_descr.nefer_true_eyes_phantasm',
        items: [
            {
                table: new StatTable('nefer_burst_hit_1', charTalentTables.Nefer.s3.p1),
            },
            {
                unit: 'mastery',
                table: new StatTable('nefer_burst_hit_1_mastery', charTalentTables.Nefer.s3.p2),
            },
            {
                table: new StatTable('nefer_burst_hit_2', charTalentTables.Nefer.s3.p3),
            },
            {
                unit: 'mastery',
                table: new StatTable('nefer_burst_hit_2_mastery', charTalentTables.Nefer.s3.p4),
            },
            {
                unit: 'percent',
                table: new StatTable('nefer_veil_bonus', charTalentTables.Nefer.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Nefer.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Nefer.s3.p7),
            },
        ],
    },
});

// Passive scaling constants
const PassiveLunarScale = 0.0175;
const PassiveLunarScaleCap = 14;
const A1EmBonus = 100;
const A1VeilMaxStacks = 3;
const C2VeilStackBonus = 2;
const C2EmBonus = 200;
const A4VerdantDewScale = 10;
const A4VerdantDewCap = 50;
const C1LunarBloomEmScale = 60;
const C2VeilDuration = 5;
const C2VeilStackLimit = 5;
const C2PhantasmDmgMax = 140;
const C4VerdantDewBonus = 25;
const C4ResShred = 20;
const C6PhantasmStage2EmScale = 85;
const C6PhantasmEndEmScale = 120;
const C6LunarBloomElevate = 15;

// Lunar-Bloom base bonus post effect (scales from EM)
const lunarBloomPost = new PostEffectStatsMastery({
    percent: new StatTable('lunarbloom_multi', [PassiveLunarScale]),
    statCap: new ValueTable([PassiveLunarScaleCap]),
});

export const Nefer = new DbObjectChar({
    name: 'nefer',
    serializeId: 112,
    gameId: 10000122,
    iconClass: 'char-icon-nefer',
    rarity: 5,
    element: 'dendro',
    weapon: 'catalyst',
    origin: 'nodkrai',
    talents: Talents,
    statTable: [
        ...charTables.Nefer,
        new StatTableAscensionScale({
            stat: 'mastery_base',
            base: 100,
        }),
    ],
    features: [
        // Normal attacks
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
        new FeatureDamageNormal({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'nefer_charged_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.nefer_charged_dmg'),
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
        // Skill damage (ATK% + EM% dual scaling)
        new FeatureDamageSkill({
            name: 'nefer_skill_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.nefer_skill_dmg'),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.nefer_skill_dmg_mastery'),
                }),
            ],
        }),
        // Phantasm Performance hits (ATK% + EM% dual scaling)
        new FeatureDamageSkill({
            name: 'nefer_phantasm_hit_1',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.nefer_phantasm_hit_1'),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.nefer_phantasm_hit_1_mastery'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'nefer_phantasm_hit_2',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.nefer_phantasm_hit_2'),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.nefer_phantasm_hit_2_mastery'),
                }),
            ],
        }),
        // Phantasm Performance Shade hits (Lunar-Bloom damage, EM scaling)
        // C1 adds 60% EM bonus to each shade hit
        new FeatureReactionLunarBloomLike({
            name: 'nefer_phantasm_shade_hit_1',
            element: 'dendro',
            category: 'skill',
            dmgStats: ['dmg_nefer_phantasm'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: Talents.get('skill.nefer_phantasm_shade_hit_1'),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation1',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: new StatTable('nefer_c1_lunarbloom_bonus', [C1LunarBloomEmScale]),
                    condition: new ConditionConstellation({constellation: 1}),
                }),
            ],
        }),
        new FeatureReactionLunarBloomLike({
            name: 'nefer_phantasm_shade_hit_2',
            element: 'dendro',
            category: 'skill',
            dmgStats: ['dmg_nefer_phantasm'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: Talents.get('skill.nefer_phantasm_shade_hit_1'),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation1',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: new StatTable('nefer_c1_lunarbloom_bonus', [C1LunarBloomEmScale]),
                    condition: new ConditionConstellation({constellation: 1}),
                }),
            ],
        }),
        new FeatureReactionLunarBloomLike({
            name: 'nefer_phantasm_shade_hit_3',
            element: 'dendro',
            category: 'skill',
            dmgStats: ['dmg_nefer_phantasm'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: Talents.get('skill.nefer_phantasm_shade_hit_3'),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation1',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: new StatTable('nefer_c1_lunarbloom_bonus', [C1LunarBloomEmScale]),
                    condition: new ConditionConstellation({constellation: 1}),
                }),
            ],
        }),
        // Burst 1-Hit (ATK% + EM% dual scaling)
        new FeatureDamageBurst({
            name: 'nefer_burst_hit_1',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.nefer_burst_hit_1'),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.nefer_burst_hit_1_mastery'),
                }),
            ],
        }),
        // Burst 2-Hit (ATK% + EM% dual scaling)
        new FeatureDamageBurst({
            name: 'nefer_burst_hit_2',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.nefer_burst_hit_2'),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.nefer_burst_hit_2_mastery'),
                }),
            ],
        }),
        // C6 Phantasm Performance Stage 2 Lunar-Bloom damage (85% EM)
        new FeatureReactionLunarBloomLike({
            name: 'nefer_c6_phantasm_stage2',
            element: 'dendro',
            category: 'skill',
            dmgStats: ['dmg_nefer_phantasm'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation6',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: new StatTable('nefer_c6_phantasm_stage2', [C6PhantasmStage2EmScale]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
        // C6 Phantasm Performance End Lunar-Bloom damage (120% EM)
        new FeatureReactionLunarBloomLike({
            name: 'nefer_c6_phantasm_end',
            element: 'dendro',
            category: 'skill',
            dmgStats: ['dmg_nefer_phantasm'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation6',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: new StatTable('nefer_c6_phantasm_end', [C6PhantasmEndEmScale]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'nefer_lunarbloom_bonus',
            postEffect: lunarBloomPost,
            format: 'percent',
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                allowed_lunarbloom: 1,
            },
        }),
        new ConditionCalcMoonsign(),
        // Veil of Falsehood stacks (max 3 base, max 5 at C2+)
        // Each stack gives 8% Phantasm Performance DMG
        // Also includes A1 Ascendant Gleam EM bonus via party_moonsign level check.
        // Uses both dmg_skill (for regular hits) and dmg_nefer_phantasm (for Lunar-Bloom hits)
        new ConditionNumberNefer({
            name: 'nefer_veil_stacks',
            serializeId: 2,
            title: 'talent_name.nefer_a_wager_of_moonlight',
            description: 'talent_descr.nefer_a_wager_of_moonlight',
            rotation: 'self',
            unit: '',
            max: A1VeilMaxStacks,
            c2bonus: C2VeilStackBonus,
            default: 0,
            stats: [
                new StatTable('dmg_skill', [8]),
                new StatTable('dmg_nefer_phantasm', [8]),
            ],
            ascendantMinStacks: A1VeilMaxStacks,
            ascendantMaxConstellation: 1,
            ascendantLevelSetting: 'party_moonsign',
            ascendantStats: [
                new StatTable('mastery', [0, A1EmBonus]),
            ],
            c2MinStacks: A1VeilMaxStacks + C2VeilStackBonus,
            c2MinConstellation: 2,
            c2Stats: [
                new StatTable('mastery', [C2EmBonus]),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        // Legacy serialize id placeholder for removed standalone A1 toggle condition
        new ConditionStatic({
            serializeId: 1,
            isHidden: true,
        }),
        new ConditionStatic({
            title: 'talent_name.nefer_daughter_of_the_dust_and_sand',
            description: 'talent_descr.nefer_daughter_of_the_dust_and_sand',
            info: {ascension: 4},
            stats: {
                text_percent: A4VerdantDewScale,
                text_percent_max: A4VerdantDewCap,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionStatic({
            title: 'talent_name.nefer_dusklit_eaves',
            description: 'talent_descr.nefer_dusklit_eaves',
            stats: {
                text_percent: PassiveLunarScale * 100,
                text_percent_max: PassiveLunarScaleCap,
            },
        }),
    ],
    postEffects: [
        lunarBloomPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'nefer_planning_breeds_success',
                    serializeId: 3,
                    title: 'talent_name.nefer_planning_breeds_success',
                    description: 'talent_descr.nefer_planning_breeds_success',
                    stats: {
                        text_percent_dmg: C1LunarBloomEmScale,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.nefer_observation_feeds_strategy',
                    description: 'talent_descr.nefer_observation_feeds_strategy',
                    stats: {
                        text_duration: C2VeilDuration,
                        text_limit: C2VeilStackLimit,
                        text_percent_dmg: C2PhantasmDmgMax,
                        text_em: C2EmBonus,
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
                    name: 'nefer_delusion_ensnares_reason_res_shred',
                    serializeId: 4,
                    title: 'talent_name.nefer_delusion_ensnares_reason',
                    description: 'talent_descr.nefer_delusion_ensnares_reason',
                    stats: {
                        enemy_res_dendro: -C4ResShred,
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
                new ConditionBoolean({
                    name: 'nefer_victory_flows_from_the_turning_of_tides',
                    serializeId: 5,
                    title: 'talent_name.nefer_victory_flows_from_the_turning_of_tides',
                    description: 'talent_descr.nefer_victory_flows_from_the_turning_of_tides',
                    stats: {
                        text_percent_dmg_1: C6PhantasmStage2EmScale,
                        text_percent_dmg_2: C6PhantasmEndEmScale,
                        'dmg_lunarbloom_special': C6LunarBloomElevate,
                    },
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['mastery_total'],
        },
        conditions: [
            new Condition({settings: {allowed_lunarbloom: 1}}),
            new ConditionNumber({
                name: 'nefer_mastery_total',
                title: 'talent_name.stats_total_mastery',
                partyStat: 'mastery_total',
                serializeId: 1,
                rotation: 'party',
                max: 2000,
            }),
            new ConditionStatic({
                title: 'talent_name.nefer_dusklit_eaves',
                description: 'talent_descr.nefer_dusklit_eaves',
                stats: {
                    text_percent: PassiveLunarScale * 100,
                    text_percent_max: PassiveLunarScaleCap,
                },
            }),
            new ConditionBoolean({
                name: 'party.nefer_victory_flows_from_the_turning_of_tides',
                serializeId: 2,
                title: 'talent_name.nefer_victory_flows_from_the_turning_of_tides',
                description: 'talent_descr.nefer_victory_flows_from_the_turning_of_tides',
                info: {constellation: 6},
                rotation: 'party',
                stats: {
                    'dmg_lunarbloom_special': C6LunarBloomElevate,
                },
            }),
        ],
        postEffects: [
            new PostEffectStats({
                from: 'nefer_mastery_total',
                percent: new StatTable('lunarbloom_multi', [PassiveLunarScale]),
                statCap: new ValueTable([PassiveLunarScaleCap]),
            }),
        ],
    },
});
