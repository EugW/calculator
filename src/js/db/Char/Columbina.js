import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanDropdownValue } from "../../classes/Condition/Boolean/DropdownValue";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdownElement } from "../../classes/Condition/Dropdown/Element";
import { ConditionLevels } from "../../classes/Condition/Levels";
import { ConditionLevelsColumbina } from "../../classes/Condition/Levels/Columbina";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionNumberTalent } from "../../classes/Condition/Number/Talent";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionBooleanColumbina } from "../../classes/Condition/Boolean/Columbina";
import { ConditionDropdownColumbina } from "../../classes/Condition/Dropdown/Columbina";
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
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureReactionLunarBloomLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/BloomLike";
import { FeatureReactionLunarChargedLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/ChargedLike";
import { FeatureReactionLunarCrystallizeLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/CrystallizeLike";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsHP } from "../../classes/PostEffect/Stats/HP";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Columbina.s1_id,
        title: 'talent_name.columbina_moondew_cascade',
        description: 'talent_descr.columbina_moondew_cascade',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Columbina.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Columbina.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Columbina.s1.p3),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Columbina.s1.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Columbina.s1.p5),
            },
            {
                table: new StatTable('columbina_moondew_cleanse_dmg', charTalentTables.Columbina.s1.p6),
            },
            {
                table: new StatTable('plunge', charTalentTables.Columbina.s1.p7),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Columbina.s1.p8),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Columbina.s1.p9),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Columbina.s2_id,
        title: 'talent_name.columbina_eternal_tides',
        description: 'talent_descr.columbina_eternal_tides',
        items: [
            {
                table: new StatTable('columbina_skill_dmg', charTalentTables.Columbina.s2.p1),
            },
            {
                table: new StatTable('columbina_gravity_ripple_dmg', charTalentTables.Columbina.s2.p2),
            },
            {
                table: new StatTable('columbina_lunar_charged_dmg', charTalentTables.Columbina.s2.p3),
            },
            {
                table: new StatTable('columbina_lunar_bloom_dmg', charTalentTables.Columbina.s2.p4),
            },
            {
                table: new StatTable('columbina_lunar_crystallize_dmg', charTalentTables.Columbina.s2.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('columbina_gravity_limit', charTalentTables.Columbina.s2.p8),
            },
            {
                unit: 'sec',
                table: new StatTable('columbina_gravity_ripple_duration', charTalentTables.Columbina.s2.p9),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Columbina.s2.p10),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Columbina.s3_id,
        title: 'talent_name.columbina_moonlit_melancholy',
        description: 'talent_descr.columbina_moonlit_melancholy',
        items: [
            {
                table: new StatTable('columbina_burst_dmg', charTalentTables.Columbina.s3.p1),
            },
            {
                unit: 'percent',
                table: new StatTable('columbina_lunar_reaction_bonus', charTalentTables.Columbina.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('columbina_lunar_domain_duration', charTalentTables.Columbina.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Columbina.s3.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('energy_cost', charTalentTables.Columbina.s3.p5),
            },
        ],
    },
});

// Passive scaling constants
const PassiveLunarHpScale = 0.2; // 0.2% per 1000 HP
const PassiveLunarHpScalePerHp = PassiveLunarHpScale / 1000;
const PassiveLunarHpCap = 7; // max 7%
const A1CritRate = 5; // +5% CRIT Rate per stack
const A1MaxStacks = 3; // max 3 stacks (15% total)

// Constellation constants
const C1Elevation = 1.5;
const C1ShieldHpScale = 12;
const C2GravityBonus = 34;
const C2HpBonus = 40;
const C2Elevation = 7;
const C2AtkHpScale = 1; // 1% of Max HP as ATK
const C2EmHpScale = 0.35; // 0.35% of Max HP as EM
const C2DefHpScale = 1; // 1% of Max HP as DEF
const C3Elevation = 1.5;
const C4Elevation = 1.5;
const C4LunarChargedHpScale = 12.5;
const C4LunarBloomHpScale = 2.5;
const C4LunarCrystallizeHpScale = 12.5;
const C5Elevation = 1.5;
const C6CritDmg = 80;
const C6Elevation = 7;

// Utility passive: Lunar reaction base DMG bonus from HP
// Adds to all three *_multi stats to integrate with existing lunar calculation
const lunarHpPostBloom = new PostEffectStatsHP({
    percent: new StatTable('lunarbloom_multi', [PassiveLunarHpScalePerHp]),
    statCap: new ValueTable([PassiveLunarHpCap]),
});
const lunarHpPostCharged = new PostEffectStatsHP({
    percent: new StatTable('lunarcharged_multi', [PassiveLunarHpScalePerHp]),
    statCap: new ValueTable([PassiveLunarHpCap]),
});
const lunarHpPostCrystallize = new PostEffectStatsHP({
    percent: new StatTable('lunarcrystallize_multi', [PassiveLunarHpScalePerHp]),
    statCap: new ValueTable([PassiveLunarHpCap]),
});

export const Columbina = new DbObjectChar({
    name: 'columbina',
    serializeId: 115,
    gameId: 10000125,
    iconClass: 'char-icon-columbina',
    rarity: 5,
    element: 'hydro',
    weapon: 'catalyst',
    origin: 'nodkrai',
    talents: Talents,
    statTable: charTables.Columbina,
    features: [
        // Normal attacks (ATK scaling, Hydro)
        new FeatureDamageNormal({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        // Charged Attack (ATK scaling, Hydro)
        new FeatureDamageCharged({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        // Moondew Cleanse (HP scaling, Dendro, Lunar-Bloom DMG ×3) - replaces Charged Attack
        new FeatureReactionLunarBloomLike({
            name: 'columbina_moondew_cleanse_dmg',
            element: 'dendro',
            category: 'attack',
            dmgStats: ['dmg_charged'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_attack',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: Talents.get('attack.columbina_moondew_cleanse_dmg'),
                }),
            ],
        }),
        // Plunge attacks (ATK scaling, Hydro)
        new FeatureDamagePlungeCollision({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        // Skill DMG (HP scaling, Hydro)
        new FeatureDamageSkill({
            name: 'columbina_skill_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.columbina_skill_dmg'),
                }),
            ],
        }),
        // Gravity Ripple DMG (HP scaling, Hydro)
        new FeatureDamageSkill({
            name: 'columbina_gravity_ripple_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.columbina_gravity_ripple_dmg'),
                }),
            ],
        }),
        // Gravity Interference: Lunar-Charged (HP scaling, Electro)
        new FeatureReactionLunarChargedLike({
            name: 'columbina_lunar_charged_dmg',
            element: 'electro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: Talents.get('skill.columbina_lunar_charged_dmg'),
                }),
            ],
        }),
        // Gravity Interference: Lunar-Bloom (HP scaling, Dendro, ×5)
        new FeatureReactionLunarBloomLike({
            name: 'columbina_lunar_bloom_dmg',
            element: 'dendro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: Talents.get('skill.columbina_lunar_bloom_dmg'),
                }),
            ],
        }),
        // Gravity Interference: Lunar-Crystallize (HP scaling, Geo)
        new FeatureReactionLunarCrystallizeLike({
            name: 'columbina_lunar_crystallize_dmg',
            element: 'geo',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarcrystallize_multi',
                    scalingSource: 'lunarcrystallize_multi',
                    values: Talents.get('skill.columbina_lunar_crystallize_dmg'),
                }),
            ],
        }),
        // Burst DMG (HP scaling, Hydro)
        new FeatureDamageBurst({
            name: 'columbina_burst_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.columbina_burst_dmg'),
                }),
            ],
        }),
        // Post effect display for utility passive (shows one, all three are same value)
        new FeaturePostEffectValue({
            category: 'other',
            name: 'columbina_lunar_hp_bonus',
            postEffect: lunarHpPostBloom,
            format: 'percent',
        }),
    ],
    conditions: [
        // Enable all Lunar reactions
        new Condition({
            settings: {
                allowed_lunarbloom: 1,
                allowed_lunarcharged: 1,
                allowed_lunarcrystallize: 1,
            },
        }),
        // A1: Lunacy's Lure - CRIT Rate stacks from Gravity Interference
        new ConditionStacks({
            name: 'columbina_lunacy_stacks',
            serializeId: 1,
            title: 'talent_name.columbina_lunacys_lure',
            description: 'talent_descr.columbina_lunacys_lure',
            info: {ascension: 1},
            rotation: 'self',
            maxStacks: A1MaxStacks,
            stats: [
                new StatTable('crit_rate', [A1CritRate]),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        // A4: Law of the New Moon (non-calculable effects, just description)
        new ConditionStatic({
            title: 'talent_name.columbina_law_of_the_new_moon',
            description: 'talent_descr.columbina_law_of_the_new_moon',
            info: {ascension: 4},
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        // Utility Passive: Moonsign Benediction
        new ConditionStatic({
            title: 'talent_name.columbina_moonsign_benediction',
            description: 'talent_descr.columbina_moonsign_benediction',
            stats: {
                text_percent: PassiveLunarHpScale,
                text_percent_max: PassiveLunarHpCap,
            },
        }),
        // C5: Burst +3 (must be before ConditionLevels to apply bonus)
        new Condition({
            settings: {
                char_skill_burst_bonus: 3,
            },
            condition: new ConditionConstellation({constellation: 5}),
        }),
        // Burst: Lunar Domain active toggle with level-scaling DMG bonus
        new ConditionBoolean({
            name: 'columbina_lunar_domain',
            serializeId: 2,
            title: 'talent_name.n11250002',
            description: 'talent_descr.n11250002',
            rotation: 'self',
        }),
        // Burst: Lunar Reaction DMG Bonus from Lunar Domain (level-scaling)
        new ConditionLevels({
            levelSetting: 'char_skill_burst',
            stats: [
                Talents.getAlias('burst.columbina_lunar_reaction_bonus', 'dmg_reaction_lunar'),
            ],
            subConditions: [
                new ConditionBoolean({name: 'columbina_lunar_domain'}),
            ],
        }),

    ],
    postEffects: [
        lunarHpPostBloom,
        lunarHpPostCharged,
        lunarHpPostCrystallize,
    ],
    multipliers: [
        // C4: Lunar-Charged DMG Increase (+12.5% HP as flat damage)
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'constellation4',
            values: new StatTable('columbina_c4_lunar_charged', [C4LunarChargedHpScale]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                new ConditionBoolean({name: 'columbina_c4_dmg_bonus'}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['lunarcharged_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        // C4: Lunar-Bloom DMG Increase (+2.5% HP as flat damage)
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'constellation4',
            values: new StatTable('columbina_c4_lunar_bloom', [C4LunarBloomHpScale]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                new ConditionBoolean({name: 'columbina_c4_dmg_bonus'}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['lunarbloom_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        // C4: Lunar-Crystallize DMG Increase (+12.5% HP as flat damage)
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'constellation4',
            values: new StatTable('columbina_c4_lunar_crystallize', [C4LunarCrystallizeHpScale]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                new ConditionBoolean({name: 'columbina_c4_dmg_bonus'}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['lunarcrystallize_reaction'],
                options: ['reaction_flat'],
            }),
        }),
    ],
    constellation: new DbObjectConstellation([
        // C1: Radiance Over Blossoms and Peaks
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.columbina_radiance_over_blossoms_and_peaks',
                    description: 'talent_descr.columbina_radiance_over_blossoms_and_peaks',
                    stats: {
                        text_percent_shield: C1ShieldHpScale,
                        'dmg_lunar_special': C1Elevation,
                    },
                }),
            ],
        },
        // C2: Not in Lone Splendor
        {
            conditions: [
                new ConditionBooleanColumbina({
                    name: 'columbina_lunar_brilliance',
                    serializeId: 3,
                    title: 'talent_name.columbina_not_in_lone_splendor',
                    description: 'talent_descr.columbina_not_in_lone_splendor',
                    rotation: 'self',
                    hideInactive: true,
                    baseStats: {
                        text_percent_gravity: C2GravityBonus,
                        text_percent_atk: C2AtkHpScale,
                        text_percent_em: C2EmHpScale,
                        text_percent_def: C2DefHpScale,
                        'dmg_lunar_special': C2Elevation,
                    },
                    stats: {
                        hp_percent: C2HpBonus,
                        text_percent: C2HpBonus,
                    },
                }),
            ],
        },
        // C3: Skill +3
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_elemental_bonus: 3,
                    },
                }),
                new ConditionStatic({
                    title: 'talent_name.columbina_dreamlike_glow_across_tranquil_waters',
                    description: 'talent_descr.char_constellation_skill',
                    stats: {
                        'dmg_lunar_special': C3Elevation,
                    },
                }),
            ],
        },
        // C4: Cloudveiled Ridges in Floral Mists
        {
            conditions: [
                new ConditionBooleanColumbina({
                    name: 'columbina_c4_dmg_bonus',
                    serializeId: 8,
                    title: 'talent_name.columbina_cloudveiled_ridges_in_floral_mists',
                    description: 'talent_descr.columbina_cloudveiled_ridges_in_floral_mists',
                    baseStats: {
                        'dmg_lunar_special': C4Elevation,
                    },
                    stats: {
                        text_percent_lunarcharged: C4LunarChargedHpScale,
                        text_percent_lunarbloom: C4LunarBloomHpScale,
                        text_percent_lunarcrystallize: C4LunarCrystallizeHpScale,
                    },
                }),
            ],
        },
        // C5: Burst +3 (setting moved to conditions array for proper ordering)
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.columbina_silence_tending_one_lone_song',
                    description: 'talent_descr.char_constellation_burst',
                    stats: {
                        'dmg_lunar_special': C5Elevation,
                    },
                }),
            ],
        },
        // C6: Through Darkness Led by Moonlight
        {
            conditions: [
                new ConditionDropdownColumbina({
                    name: 'columbina_c6_crit',
                    serializeId: 4,
                    multiple: true,
                    hideEmpty: true,
                    hideInactive: true,
                    dropdownClass: 'select-element-multiple',
                    title: 'talent_name.columbina_through_darkness_led_by_moonlight',
                    description: 'talent_descr.columbina_through_darkness_led_by_moonlight',
                    baseStats: {
                        'dmg_lunar_special': C6Elevation,
                    },
                    values: [
                        { value: 'hydro', serializeId: 1 },
                        { value: 'electro', serializeId: 2 },
                        { value: 'dendro', serializeId: 3 },
                        { value: 'geo', serializeId: 4 },
                    ],
                }),
                ...['hydro', 'electro', 'dendro', 'geo'].map((elem) => {
                    return new Condition({
                        stats: {
                            ['crit_dmg_' + elem]: C6CritDmg,
                        },
                        condition: new ConditionBooleanDropdownValue({name: 'columbina_c6_crit', value: elem}),
                    });
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['hp_total'],
            settings: ['char_skill_burst'],
        },
        conditions: [
            new Condition({
                settings: {
                    allowed_lunarbloom: 1,
                    allowed_lunarcharged: 1,
                    allowed_lunarcrystallize: 1,
                },
            }),
            new ConditionNumber({
                name: 'columbina_hp_total',
                title: 'talent_name.stats_total_hp',
                partyStat: 'hp_total',
                serializeId: 1,
                rotation: 'party',
                max: 80000,
            }),
            new ConditionStatic({
                title: 'talent_name.columbina_moonsign_benediction',
                description: 'talent_descr.columbina_moonsign_benediction',
                stats: {
                    text_percent: PassiveLunarHpScale,
                    text_percent_max: PassiveLunarHpCap,
                },
            }),
            new ConditionNumberTalent({
                name: 'columbina_char_skill_burst',
                serializeId: 2,
                title: 'talent_name.stats_level_burst',
                partySetting: 'char_skill_burst',
            }),
            // Lunar Domain party buff
            new ConditionBoolean({
                name: 'party.columbina_lunar_domain',
                serializeId: 3,
                title: 'talent_name.n11250002',
                description: 'talent_descr.n11250002',
                rotation: 'party',
            }),
            new ConditionLevelsColumbina({
                levelSetting: 'columbina_char_skill_burst',
                stats: [
                    Talents.getAlias('burst.columbina_lunar_reaction_bonus', 'dmg_reaction_lunar'),
                ],
                subConditions: [
                    new ConditionBoolean({name: 'party.columbina_lunar_domain'}),
                ],
            }),
            // Constellation selector for party elevation buffs (0-6)
            new ConditionNumber({
                name: 'party.columbina_constellation',
                serializeId: 5,
                title: 'talent_name.char_constellation',
                description: 'talent_descr.columbina_constellation_party',
                min: 0,
                max: 6,
                default: 0,
                allowMinZero: true,
                noStat: true,
            }),
            // C1: +1.5% elevation
            new ConditionBooleanValue({
                setting: 'party.columbina_constellation',
                cond: 'ge',
                value: 1,
                stats: [
                    new StatTable('dmg_lunar_special', [C1Elevation]),
                ],
            }),
            // C2: +7% elevation
            new ConditionBooleanValue({
                setting: 'party.columbina_constellation',
                cond: 'ge',
                value: 2,
                stats: [
                    new StatTable('dmg_lunar_special', [C2Elevation]),
                ],
            }),
            // C2: Ascendant Gleam - dominant Lunar type selector for ATK/EM/DEF buff
            // Uses element icons: electro=Lunar-Charged, dendro=Lunar-Bloom, geo=Lunar-Crystallize
            new ConditionDropdownElement({
                name: 'party.columbina_c2_dominant_lunar',
                serializeId: 6,
                title: 'talent_name.columbina_ascendant_gleam',
                description: 'talent_descr.columbina_ascendant_gleam',
                info: {constellation: 2},
                rotation: 'party',
                dropdownClass: 'select-element',
                values: [
                    { value: 'electro', serializeId: 1 },  // Lunar-Charged → ATK
                    { value: 'dendro', serializeId: 2 },   // Lunar-Bloom → EM
                    { value: 'geo', serializeId: 3 },      // Lunar-Crystallize → DEF
                ],
            }),
            // C3: +1.5% elevation
            new ConditionBooleanValue({
                setting: 'party.columbina_constellation',
                cond: 'ge',
                value: 3,
                stats: [
                    new StatTable('dmg_lunar_special', [C3Elevation]),
                ],
            }),
            // C4: +1.5% elevation
            new ConditionBooleanValue({
                setting: 'party.columbina_constellation',
                cond: 'ge',
                value: 4,
                stats: [
                    new StatTable('dmg_lunar_special', [C4Elevation]),
                ],
            }),
            // C5: +1.5% elevation (burst level +3 handled in ConditionLevelsColumbina)
            new ConditionBooleanValue({
                setting: 'party.columbina_constellation',
                cond: 'ge',
                value: 5,
                stats: [
                    new StatTable('dmg_lunar_special', [C5Elevation]),
                ],
            }),
            // C6: +7% elevation
            new ConditionBooleanValue({
                setting: 'party.columbina_constellation',
                cond: 'ge',
                value: 6,
                stats: [
                    new StatTable('dmg_lunar_special', [C6Elevation]),
                ],
            }),
            // C6 party CRIT DMG bonuses (multi-select dropdown)
            new ConditionDropdownElement({
                name: 'party.columbina_c6_crit',
                serializeId: 4,
                multiple: true,
                hideEmpty: true,
                dropdownClass: 'select-element-multiple',
                title: 'talent_name.columbina_through_darkness_led_by_moonlight',
                description: 'talent_descr.columbina_through_darkness_led_by_moonlight',
                info: {constellation: 6},
                rotation: 'party',
                values: [
                    { value: 'hydro', serializeId: 1 },
                    { value: 'electro', serializeId: 2 },
                    { value: 'dendro', serializeId: 3 },
                    { value: 'geo', serializeId: 4 },
                ],
            }),
            // C6: Apply CRIT DMG stats based on selected elements (party)
            ...['hydro', 'electro', 'dendro', 'geo'].map((elem) => {
                return new Condition({
                    stats: {
                        ['crit_dmg_' + elem]: C6CritDmg,
                    },
                    condition: new ConditionBooleanDropdownValue({name: 'party.columbina_c6_crit', value: elem}),
                });
            }),
        ],
        postEffects: [
            // Utility passive: Lunar reaction base DMG bonus from HP (party buff)
            // Adds to all three *_multi stats to integrate with existing lunar calculation
            new PostEffectStats({
                from: 'columbina_hp_total',
                percent: new StatTable('lunarbloom_multi', [PassiveLunarHpScalePerHp]),
                statCap: new ValueTable([PassiveLunarHpCap]),
            }),
            new PostEffectStats({
                from: 'columbina_hp_total',
                percent: new StatTable('lunarcharged_multi', [PassiveLunarHpScalePerHp]),
                statCap: new ValueTable([PassiveLunarHpCap]),
            }),
            new PostEffectStats({
                from: 'columbina_hp_total',
                percent: new StatTable('lunarcrystallize_multi', [PassiveLunarHpScalePerHp]),
                statCap: new ValueTable([PassiveLunarHpCap]),
            }),
            // C2 Ascendant Gleam: Lunar-Charged (electro) → ATK buff
            new PostEffectStats({
                from: 'columbina_hp_total',
                percent: new StatTable('atk', [C2AtkHpScale / 100]),
                conditions: [
                    new ConditionBooleanValue({
                        setting: 'party.columbina_constellation',
                        cond: 'ge',
                        value: 2,
                    }),
                    new ConditionBooleanDropdownValue({name: 'party.columbina_c2_dominant_lunar', value: 'electro'}),
                ],
            }),
            // C2 Ascendant Gleam: Lunar-Bloom (dendro) → EM buff
            new PostEffectStats({
                from: 'columbina_hp_total',
                percent: new StatTable('mastery', [C2EmHpScale / 100]),
                conditions: [
                    new ConditionBooleanValue({
                        setting: 'party.columbina_constellation',
                        cond: 'ge',
                        value: 2,
                    }),
                    new ConditionBooleanDropdownValue({name: 'party.columbina_c2_dominant_lunar', value: 'dendro'}),
                ],
            }),
            // C2 Ascendant Gleam: Lunar-Crystallize (geo) → DEF buff
            new PostEffectStats({
                from: 'columbina_hp_total',
                percent: new StatTable('def', [C2DefHpScale / 100]),
                conditions: [
                    new ConditionBooleanValue({
                        setting: 'party.columbina_constellation',
                        cond: 'ge',
                        value: 2,
                    }),
                    new ConditionBooleanDropdownValue({name: 'party.columbina_c2_dominant_lunar', value: 'geo'}),
                ],
            }),
        ],
    },
});
