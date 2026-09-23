import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
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
import { FeatureReactionLunarChargedLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/ChargedLike";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Flins.s1_id,
        title: 'talent_name.flins_pocztowy_demonspear',
        description: 'talent_descr.flins_pocztowy_demonspear',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Flins.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Flins.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Flins.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Flins.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Flins.s1.p5),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Flins.s1.p6),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Flins.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Flins.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Flins.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Flins.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Flins.s2_id,
        title: 'talent_name.flins_arcane_light',
        description: 'talent_descr.flins_arcane_light',
        items: [
            {
                table: new StatTable('flins_manifest_hit_1', charTalentTables.Flins.s2.p1),
            },
            {
                table: new StatTable('flins_manifest_hit_2', charTalentTables.Flins.s2.p2),
            },
            {
                table: new StatTable('flins_manifest_hit_3', charTalentTables.Flins.s2.p3),
            },
            {
                table: new StatTable('flins_manifest_hit_4', charTalentTables.Flins.s2.p4),
            },
            {
                table: new StatTable('flins_manifest_hit_5', charTalentTables.Flins.s2.p5),
            },
            {
                table: new StatTable('flins_manifest_charged', charTalentTables.Flins.s2.p6),
            },
            {
                table: new StatTable('flins_northland_spearstorm_dmg', charTalentTables.Flins.s2.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('flins_spearstorm_cd', charTalentTables.Flins.s2.p8),
            },
            {
                unit: 'sec',
                table: new StatTable('flins_manifest_duration', charTalentTables.Flins.s2.p9),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Flins.s2.p10),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Flins.s3_id,
        title: 'talent_name.flins_cometh_the_night',
        description: 'talent_descr.flins_cometh_the_night',
        items: [
            {
                table: new StatTable('flins_initial_dmg', charTalentTables.Flins.s3.p1),
            },
            {
                table: new StatTable('flins_middle_phase_dmg', charTalentTables.Flins.s3.p2),
            },
            {
                table: new StatTable('flins_final_phase_dmg', charTalentTables.Flins.s3.p3),
            },
            {
                table: new StatTable('flins_thunderous_symphony_dmg', charTalentTables.Flins.s3.p6),
            },
            {
                table: new StatTable('flins_thunderous_additional_dmg', charTalentTables.Flins.s3.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Flins.s3.p5),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Flins.s3.p4),
            },
        ],
    },
});

// Passive scaling constants
const PassiveLunarScale = 0.7;
const PassiveLunarScaleCap = 14;
const A1LunarChargedDmg = 20;
const A4EmScale = 8;
const A4EmCap = 160;

// Constellation constants
const C2AtkScale = 50;
const C2ResShred = 25;
const C4AtkBonus = 20;
const C4EmScale = 10;
const C4EmCap = 220;
const C6LunarChargedElevate = 35;
const C6PartyElevate = 10;

// Lunar-Charged base bonus post effect based on ATK
const lunarChargedPost = new PostEffectStatsAtk({
    percent: new StatTable('lunarcharged_multi', [PassiveLunarScale / 100]),
    statCap: new ValueTable([PassiveLunarScaleCap]),
});

// A4 EM from ATK post effect (disabled at C4 where it's replaced by enhanced version)
const a4EmPost = new PostEffectStatsAtk({
    percent: new StatTable('mastery', [A4EmScale / 100]),
    statCap: new ValueTable([A4EmCap]),
    condition: new ConditionAnd([
        new ConditionAscensionChar({ascension: 4}),
        new ConditionNot([new ConditionConstellation({constellation: 4})]),
    ]),
});

// C4 enhanced EM from ATK post effect (replaces A4 passive)
const c4EmPost = new PostEffectStatsAtk({
    percent: new StatTable('mastery', [C4EmScale / 100]),
    statCap: new ValueTable([C4EmCap]),
    condition: new ConditionConstellation({constellation: 4}),
});

export const Flins = new DbObjectChar({
    name: 'flins',
    serializeId: 111,
    gameId: 10000120,
    iconClass: 'char-icon-flins',
    rarity: 5,
    element: 'electro',
    weapon: 'polearm',
    origin: 'nodkrai',
    talents: Talents,
    statTable: charTables.Flins,
    features: [
        // Normal attacks
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
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
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
        // Manifest Flame attacks
        new FeatureDamageSkill({
            name: 'flins_manifest_hit_1',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_hit_1'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_manifest_hit_2',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_hit_2'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_manifest_hit_3',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_hit_3'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_manifest_hit_4',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_hit_4'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_manifest_hit_5',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_hit_5'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_manifest_charged',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_charged'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_northland_spearstorm_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_northland_spearstorm_dmg'),
                }),
            ],
        }),
        // Burst
        new FeatureDamageBurst({
            name: 'flins_initial_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.flins_initial_dmg'),
                }),
            ],
        }),
        // Middle Phase - Lunar-Charged DMG (NOT affected by Electro DMG% or Burst DMG%)
        new FeatureReactionLunarChargedLike({
            name: 'flins_middle_phase_dmg',
            element: 'electro',
            category: 'burst',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: Talents.get('burst.flins_middle_phase_dmg'),
                }),
            ],
        }),
        // Final Phase - Lunar-Charged DMG (NOT affected by Electro DMG% or Burst DMG%)
        new FeatureReactionLunarChargedLike({
            name: 'flins_final_phase_dmg',
            element: 'electro',
            category: 'burst',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: Talents.get('burst.flins_final_phase_dmg'),
                }),
            ],
        }),
        // Thunderous Symphony - Also Lunar-Charged DMG (transformed burst)
        new FeatureReactionLunarChargedLike({
            name: 'flins_thunderous_symphony_dmg',
            element: 'electro',
            category: 'burst',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: Talents.get('burst.flins_thunderous_symphony_dmg'),
                }),
            ],
        }),
        // Thunderous Symphony Additional - Also Lunar-Charged DMG
        new FeatureReactionLunarChargedLike({
            name: 'flins_thunderous_additional_dmg',
            element: 'electro',
            category: 'burst',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: Talents.get('burst.flins_thunderous_additional_dmg'),
                }),
            ],
        }),
        // C2 Lunar-Charged damage after Spearstorm
        new FeatureReactionLunarChargedLike({
            element: 'electro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation2',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: new StatTable('flins_c2_lunar_dmg', [C2AtkScale]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 2}),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'flins_lunar_bonus',
            postEffect: lunarChargedPost,
            format: 'percent',
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'flins_em_from_atk',
            postEffect: a4EmPost,
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                new ConditionNot([new ConditionConstellation({constellation: 4})]),
            ]),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'flins_em_from_atk',
            postEffect: c4EmPost,
            condition: new ConditionConstellation({constellation: 4}),
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                allowed_lunarcharged: 1,
            },
        }),
        new ConditionCalcMoonsign(),
        new ConditionBooleanLevels({
            name: 'flins_symphony_of_winter',
            serializeId: 1,
            title: 'talent_name.flins_symphony_of_winter',
            description: 'talent_descr.flins_symphony_of_winter',
            info: {ascension: 1},
            levelSetting: 'party_moonsign',
            stats: [
                new StatTable('dmg_reaction_lunarcharged', [0, A1LunarChargedDmg]),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.flins_whispering_flame',
            description: 'talent_descr.flins_whispering_flame',
            info: {ascension: 4},
            stats: {
                text_percent: A4EmScale,
                text_max: A4EmCap,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionStatic({
            title: 'talent_name.flins_old_world_secrets',
            description: 'talent_descr.flins_old_world_secrets',
            stats: {
                text_percent: PassiveLunarScale,
                text_percent_max: PassiveLunarScaleCap,
            },
        }),
    ],
    postEffects: [
        lunarChargedPost,
        a4EmPost,
        c4EmPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.flins_part_the_veil_of_snow',
                    description: 'talent_descr.flins_part_the_veil_of_snow',
                }),
            ],
        },
        {
            conditions: [
                new ConditionBooleanLevels({
                    name: 'flins_the_devils_wall',
                    serializeId: 2,
                    title: 'talent_name.flins_the_devils_wall',
                    description: 'talent_descr.flins_the_devils_wall',
                    levelSetting: 'party_moonsign',
                    stats: [
                        new StatTable('text_percent_dmg', [C2AtkScale, C2AtkScale]),
                        new StatTable('enemy_res_electro', [0, -C2ResShred]),
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
                    title: 'talent_name.flins_night_on_bald_mountain',
                    description: 'talent_descr.flins_night_on_bald_mountain',
                    stats: {
                        atk_percent: C4AtkBonus,
                        text_percent: C4EmScale,
                        text_max: C4EmCap,
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
                    name: 'flins_songs_and_dances_of_death',
                    serializeId: 4,
                    title: 'talent_name.flins_songs_and_dances_of_death',
                    description: 'talent_descr.flins_songs_and_dances_of_death',
                    stats: {
                        'dmg_lunarcharged_special': C6LunarChargedElevate,
                    },
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['atk_total'],
        },
        conditions: [
            new Condition({settings: {allowed_lunarcharged: 1}}),
            new ConditionCalcMoonsign(),
            new ConditionNumber({
                name: 'flins_atk_total',
                title: 'talent_name.stats_total_atk',
                partyStat: 'atk_total',
                serializeId: 1,
                rotation: 'party',
                max: 5000,
            }),
            new ConditionStatic({
                title: 'talent_name.flins_old_world_secrets',
                description: 'talent_descr.flins_old_world_secrets',
                stats: {
                    text_percent: PassiveLunarScale,
                    text_percent_max: PassiveLunarScaleCap,
                },
            }),
            // Legacy placeholder for removed party A1 (self-only passive).
            // Keeps old serializeId 2 deserializable without applying any buff.
            new ConditionStatic({
                serializeId: 2,
                isHidden: true,
            }),
            new ConditionBooleanLevels({
                name: 'party.flins_songs_and_dances_of_death',
                serializeId: 3,
                title: 'talent_name.flins_songs_and_dances_of_death',
                description: 'talent_descr.flins_songs_and_dances_of_death',
                info: {constellation: 6},
                rotation: 'party',
                levelSetting: 'party_moonsign',
                stats: [
                    new StatTable('dmg_lunarcharged_special', [0, C6PartyElevate]),
                ],
            }),
        ],
        postEffects: [
            new PostEffectStats({
                from: 'flins_atk_total',
                percent: new StatTable('lunarcharged_multi', [PassiveLunarScale / 100]),
                statCap: new ValueTable([PassiveLunarScaleCap]),
            }),
        ],
    },
});
