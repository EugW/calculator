import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionNumberZibaiC6 } from "../../classes/Condition/Number/Zibai";
import { ConditionElementsCount } from "../../classes/Condition/ElementsCount";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionStaticZibaiA4 } from "../../classes/Condition/Static/ZibaiA4";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { ConditionBooleanZibaiC2 } from "../../classes/Condition/Boolean/ZibaiC2";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureReactionLunarCrystallizeLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/CrystallizeLike";
import { PostEffectStatsDef } from "../../classes/PostEffect/Stats/Def";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Zibai.s1_id,
        title: 'talent_name.zibai_golden_blades_petaled_touch',
        description: 'talent_descr.zibai_golden_blades_petaled_touch',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Zibai.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Zibai.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Zibai.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Zibai.s1.p5),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Zibai.s1.p6),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Zibai.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Zibai.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Zibai.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Zibai.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Zibai.s2_id,
        title: 'talent_name.zibai_heaven_and_earth_made_manifest',
        description: 'talent_descr.zibai_heaven_and_earth_made_manifest',
        items: [
            {
                table: new StatTable('zibai_lunar_phase_shift_hit_1', charTalentTables.Zibai.s2.p6),
            },
            {
                table: new StatTable('zibai_lunar_phase_shift_hit_2', charTalentTables.Zibai.s2.p7),
            },
            {
                table: new StatTable('zibai_lunar_phase_shift_hit_3', charTalentTables.Zibai.s2.p8),
            },
            {
                table: new StatTable('zibai_lunar_phase_shift_hit_4', charTalentTables.Zibai.s2.p10),
            },
            {
                table: new StatTable('zibai_lunar_phase_shift_charged', charTalentTables.Zibai.s2.p11),
            },
            {
                table: new StatTable('zibai_spirit_steed_hit_1', charTalentTables.Zibai.s2.p1),
            },
            {
                table: new StatTable('zibai_spirit_steed_hit_2', charTalentTables.Zibai.s2.p2),
            },
            {
                table: new StatTable('zibai_lunar_phase_shift_4th_additional', charTalentTables.Zibai.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('zibai_lunar_phase_shift_duration', charTalentTables.Zibai.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Zibai.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Zibai.s3_id,
        title: 'talent_name.zibai_tri_sphere_eminence',
        description: 'talent_descr.zibai_tri_sphere_eminence',
        items: [
            {
                table: new StatTable('zibai_burst_hit_1', charTalentTables.Zibai.s3.p1),
            },
            {
                table: new StatTable('zibai_burst_hit_2', charTalentTables.Zibai.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Zibai.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Zibai.s3.p4),
            },
        ],
    },
});

// Passive scaling constants
const PassiveLunarScale = 0.7;
const PassiveLunarScaleCap = 14;
const A1DefBonus = 60;

// Constellation constants
const C1ReactionBonus = 220;
const C2PartyLunarCrystallize = 30;
const C2DefBonus = 550; // C2 bonus stacks with A1's 60%
const C4Multiplier = 1.5; // Additional 150% to make total 250% of original
const C6ElevatePercent = 1.6;

// Lunar-Crystallize base bonus post effect based on DEF (utility passive)
// Always active - C2's 30% reaction bonus stacks with this
const lunarCrystallizePost = new PostEffectStatsDef({
    percent: new StatTable('lunarcrystallize_multi', [PassiveLunarScale / 100]),
    statCap: new ValueTable([PassiveLunarScaleCap]),
});

export const Zibai = new DbObjectChar({
    name: 'zibai',
    serializeId: 116,
    gameId: 10000126,
    iconClass: 'char-icon-zibai',
    rarity: 5,
    element: 'geo',
    weapon: 'sword',
    origin: 'nodkrai',
    talents: Talents,
    statTable: charTables.Zibai,
    features: [
        // Normal attacks (Physical, ATK scaling)
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3',
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        // Charged Attack (Physical, ATK scaling, 2 hits)
        new FeatureDamageCharged({
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        // Plunge attacks
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
        // Lunar Phase Shift Normal Attacks (DEF scaling, Geo)
        new FeatureDamageSkill({
            name: 'zibai_lunar_phase_shift_hit_1',
            element: 'geo',
            dmgStats: ['dmg_normal'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.zibai_lunar_phase_shift_hit_1'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'zibai_lunar_phase_shift_hit_2',
            element: 'geo',
            dmgStats: ['dmg_normal'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.zibai_lunar_phase_shift_hit_2'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'zibai_lunar_phase_shift_hit_3',
            element: 'geo',
            dmgStats: ['dmg_normal'],
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.zibai_lunar_phase_shift_hit_3'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'zibai_lunar_phase_shift_hit_4',
            element: 'geo',
            dmgStats: ['dmg_normal'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.zibai_lunar_phase_shift_hit_4'),
                }),
            ],
        }),
        // Lunar Phase Shift Charged Attack (DEF scaling, Geo)
        new FeatureDamageSkill({
            name: 'zibai_lunar_phase_shift_charged',
            element: 'geo',
            dmgStats: ['dmg_charged'],
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.zibai_lunar_phase_shift_charged'),
                }),
            ],
        }),
        // Lunar Phase Shift 4th Hit Additional DMG (Lunar-Crystallize)
        // C4: When Scattermoon Splendor is active, deals 250% of original (base + 150% bonus)
        new FeatureReactionLunarCrystallizeLike({
            name: 'zibai_lunar_phase_shift_4th_additional',
            element: 'geo',
            category: 'skill',
            dmgStats: ['dmg_normal'],
            multipliers: [
                // Base multiplier
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarcrystallize_multi',
                    scalingSource: 'lunarcrystallize_multi',
                    values: Talents.get('skill.zibai_lunar_phase_shift_4th_additional'),
                }),
                // C4: +150% of base (total 250% of original)
                new FeatureMultiplier({
                    scaling: 'def*',
                    source: 'constellation4',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarcrystallize_multi',
                    scalingSource: 'lunarcrystallize_multi',
                    values: Talents.getMulti({
                        name: 'zibai_c4_4th_bonus',
                        from: 'skill.zibai_lunar_phase_shift_4th_additional',
                        multi: C4Multiplier,
                    }),
                    condition: new ConditionAnd([
                        new ConditionConstellation({constellation: 4}),
                        new ConditionBoolean({name: 'zibai_c4_scattermoon'}),
                    ]),
                }),
            ],
        }),
        // Spirit Steed's Stride 1st Hit (DEF scaling, Geo)
        new FeatureDamageSkill({
            name: 'zibai_spirit_steed_hit_1',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.zibai_spirit_steed_hit_1'),
                }),
            ],
        }),
        // Spirit Steed's Stride 2nd Hit (Lunar-Crystallize, DEF scaling)
        // C1 reaction bonus only applies to this feature via reactionBonuses
        // A1/C2 DEF bonuses are added via global multipliers with reaction_flat
        new FeatureReactionLunarCrystallizeLike({
            name: 'zibai_spirit_steed_hit_2',
            element: 'geo',
            category: 'skill',
            tags: ['zibai_spirit_steed'],
            reactionBonuses: ['dmg_reaction_zibai_spirit_steed_c1'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarcrystallize_multi',
                    scalingSource: 'lunarcrystallize_multi',
                    values: Talents.get('skill.zibai_spirit_steed_hit_2'),
                }),
            ],
        }),
        // Burst 1st Hit (DEF scaling, Geo)
        new FeatureDamageBurst({
            name: 'zibai_burst_hit_1',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.zibai_burst_hit_1'),
                }),
            ],
        }),
        // Burst 2nd Hit (Lunar-Crystallize, DEF scaling)
        new FeatureReactionLunarCrystallizeLike({
            name: 'zibai_burst_hit_2',
            element: 'geo',
            category: 'burst',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_burst',
                    scalingMultiplier: 'lunarcrystallize_multi',
                    scalingSource: 'lunarcrystallize_multi',
                    values: Talents.get('burst.zibai_burst_hit_2'),
                }),
            ],
        }),
        // Post effect display for utility passive
        new FeaturePostEffectValue({
            category: 'other',
            name: 'zibai_lunar_bonus',
            postEffect: lunarCrystallizePost,
            format: 'percent',
        }),
    ],
    conditions: [
        // Enable Lunar-Crystallize reactions
        new Condition({
            settings: {
                allowed_lunarcrystallize: 1,
            },
        }),
        // A1: The Selenic Adeptus Descends - Moonfall effect (4s after E or Moondrift Harmony)
        new ConditionBoolean({
            name: 'zibai_a1_moonfall',
            serializeId: 1,
            title: 'talent_name.zibai_the_selenic_adeptus_descends',
            description: 'talent_descr.zibai_the_selenic_adeptus_descends',
            info: {ascension: 1},
            rotation: 'self',
            hideInactive: true,
            stats: {
                text_percent: A1DefBonus,
            },
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        // A4: Layered Peaks Pierce the Clouds (auto-detected)
        new ConditionStaticZibaiA4({
            title: 'talent_name.zibai_layered_peaks_pierce_the_clouds',
            description: 'talent_descr.zibai_layered_peaks_pierce_the_clouds',
            info: {ascension: 4},
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        // Utility Passive: Moonsign Benediction
        new ConditionStatic({
            title: 'talent_name.zibai_moonsign_benediction',
            description: 'talent_descr.zibai_moonsign_benediction',
            stats: {
                text_percent: PassiveLunarScale,
                text_percent_max: PassiveLunarScaleCap,
            },
        }),
    ],
    postEffects: [
        lunarCrystallizePost,
    ],
    multipliers: [
        // A1: +60% DEF flat bonus to Spirit Steed's Stride 2nd Hit (always active when A1 toggle is on)
        new FeatureMultiplier({
            scaling: 'def*',
            source: 'ascension1',
            values: new StatTable('zibai_a1_def_bonus', [A1DefBonus]),
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                new ConditionBoolean({name: 'zibai_a1_moonfall'}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['zibai_spirit_steed'],
                options: ['reaction_flat'],
            }),
        }),
        // C2: +550% DEF flat bonus to Spirit Steed's Stride 2nd Hit (stacks with A1, requires moonsign >= 2)
        new FeatureMultiplier({
            scaling: 'def*',
            source: 'constellation2',
            values: new StatTable('zibai_c2_def_bonus', [C2DefBonus]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 2}),
                new ConditionBooleanValue({
                    setting: 'party_moonsign',
                    cond: 'ge',
                    value: 2,
                }),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['zibai_spirit_steed'],
                options: ['reaction_flat'],
            }),
        }),
    ],
    constellation: new DbObjectConstellation([
        // C1: Burst Forth With Vigor, But Enter in Silence
        {
            conditions: [
                // C1: First Spirit Steed's Stride 2nd hit bonus toggle
                new ConditionBoolean({
                    name: 'zibai_c1_first_spirit_steed',
                    serializeId: 2,
                    title: 'talent_name.zibai_burst_forth_with_vigor_but_enter_in_silence',
                    description: 'talent_descr.zibai_burst_forth_with_vigor_but_enter_in_silence',
                    stats: {
                        'dmg_reaction_zibai_spirit_steed_c1': C1ReactionBonus,
                        'text_percent': C1ReactionBonus,
                    },
                }),
            ],
        },
        // C2: At Birth Are Souls Born, and in Death Leave But Husks
        {
            conditions: [
                new ConditionBooleanZibaiC2({
                    name: 'zibai_c2_party_lunar_crystallize',
                    serializeId: 4,
                    title: 'talent_name.zibai_at_birth_are_souls_born_and_in_death_leave_but_husks',
                    description: 'talent_descr.zibai_at_birth_are_souls_born_and_in_death_leave_but_husks',
                    stats: {
                        dmg_reaction_lunarcrystallize: C2PartyLunarCrystallize,
                        text_percent: C2PartyLunarCrystallize,
                    },
                    baseStats: {
                        text_percent: C2DefBonus,
                    },
                }),
            ],
        },
        // C3: Free From Constraints and Worldly Ties
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_elemental_bonus: 3,
                    },
                }),
            ],
        },
        // C4: The Spirit Passes, Then Form Follows
        {
            conditions: [
                new ConditionBoolean({
                    name: 'zibai_c4_scattermoon',
                    serializeId: 5,
                    title: 'talent_name.zibai_the_spirit_passes_then_form_follows',
                    description: 'talent_descr.zibai_the_spirit_passes_then_form_follows',
                    stats: {
                        text_percent: 250,
                    },
                }),
            ],
        },
        // C5: Perceive the Worthless and Debate It Not
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_burst_bonus: 3,
                    },
                }),
            ],
        },
        // C6: The World, A Journey in Passing
        {
            conditions: [
                // C6: Elevation bonus based on radiance consumed
                // Formula: (radiance - 70) × 1.6% elevation per point
                // Range: 70-100 radiance → 0-48% elevation (radiance cap is 100)
                new ConditionNumberZibaiC6({
                    name: 'zibai_c6_radiance_consumed',
                    serializeId: 3,
                    title: 'talent_name.zibai_the_world_a_journey_in_passing',
                    description: 'talent_descr.zibai_the_world_a_journey_in_passing',
                    noStat: true,
                    min: 70,
                    max: 100,
                    default: 100,
                    elevatePerPoint: C6ElevatePercent,
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['def_total'],
        },
        conditions: [
            new Condition({settings: {allowed_lunarcrystallize: 1}}),
            new ConditionNumber({
                name: 'zibai_def_total',
                title: 'talent_name.stats_total_def',
                partyStat: 'def_total',
                serializeId: 1,
                rotation: 'party',
                max: 5000,
            }),
            new ConditionStatic({
                title: 'talent_name.zibai_moonsign_benediction',
                description: 'talent_descr.zibai_moonsign_benediction',
                stats: {
                    text_percent: PassiveLunarScale,
                    text_percent_max: PassiveLunarScaleCap,
                },
            }),
            // C2: +30% Lunar-Crystallize Reaction DMG (party-wide buff)
            new ConditionBoolean({
                name: 'party.zibai_c2_party_lunar_crystallize',
                serializeId: 2,
                title: 'talent_name.zibai_at_birth_are_souls_born_and_in_death_leave_but_husks',
                description: 'talent_descr.zibai_at_birth_are_souls_born_and_in_death_leave_but_husks',
                info: {constellation: 2},
                rotation: 'party',
                stats: {
                    dmg_reaction_lunarcrystallize: C2PartyLunarCrystallize,
                    text_percent: C2PartyLunarCrystallize,
                },
            }),
        ],
        postEffects: [
            // Passive: lunarcrystallize_multi bonus from DEF (always active)
            new PostEffectStatsDef({
                from: 'zibai_def_total',
                percent: new StatTable('lunarcrystallize_multi', [PassiveLunarScale / 100]),
                statCap: new ValueTable([PassiveLunarScaleCap]),
            }),
        ],
    },
});
