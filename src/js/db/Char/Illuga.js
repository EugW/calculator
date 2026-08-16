import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionCalcElementsIlluga } from "../../classes/Condition/CalcElementsIlluga";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionNumberTalent } from "../../classes/Condition/Number/Talent";
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
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { StatTable } from "../../classes/StatTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Illuga.s1_id,
        title: 'talent_name.illuga_oathkeepers_spear',
        description: 'talent_descr.illuga_oathkeepers_spear',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Illuga.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Illuga.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Illuga.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Illuga.s1.p5),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Illuga.s1.p6),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Illuga.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Illuga.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Illuga.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Illuga.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Illuga.s2_id,
        title: 'talent_name.illuga_dawnbearing_songbird',
        description: 'talent_descr.illuga_dawnbearing_songbird',
        items: [
            {
                table: new StatTable('illuga_skill_tap_em', charTalentTables.Illuga.s2.p1),
            },
            {
                table: new StatTable('illuga_skill_tap_def', charTalentTables.Illuga.s2.p2),
            },
            {
                table: new StatTable('illuga_skill_hold_em', charTalentTables.Illuga.s2.p3),
            },
            {
                table: new StatTable('illuga_skill_hold_def', charTalentTables.Illuga.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Illuga.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Illuga.s3_id,
        title: 'talent_name.illuga_shadowless_reflection',
        description: 'talent_descr.illuga_shadowless_reflection',
        items: [
            {
                table: new StatTable('illuga_burst_em', charTalentTables.Illuga.s3.p1),
            },
            {
                table: new StatTable('illuga_burst_def', charTalentTables.Illuga.s3.p2),
            },
            {
                table: new StatTable('illuga_geo_dmg_bonus', charTalentTables.Illuga.s3.p3),
            },
            {
                table: new StatTable('illuga_lunar_crystallize_bonus', charTalentTables.Illuga.s3.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('illuga_nightingale_stacks', charTalentTables.Illuga.s3.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('illuga_nightingale_stacks_geo', charTalentTables.Illuga.s3.p6),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Illuga.s3.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Illuga.s3.p8),
            },
            {
                unit: 'unit',
                table: new StatTable('energy_cost', charTalentTables.Illuga.s3.p9),
            },
        ],
    },
});

// A1 Lightkeeper's Oath bonuses
const A1CritRate = 5;
const A1CritDmg = 10;
const A1MoonsignEM = 50;

// C6 enhanced Lightkeeper's Oath bonuses
const C6CritRate = 10;
const C6CritDmg = 30;
const C6MoonsignEM = 80;

// C2 Aedon scaling
const C2AedonEM = 400;
const C2AedonDEF = 200;

// C4 DEF bonus
const C4DefBonus = 200;

// A4 party scaling (1/2/3 Hydro or Geo)
const A4GeoDmgScale = [7, 14, 24];
const A4LunarScale = [48, 96, 160];

export const Illuga = new DbObjectChar({
    name: 'illuga',
    serializeId: 117,
    gameId: 10000127,
    birthday: '12/23',
    iconClass: 'char-icon-illuga',
    rarity: 4,
    weapon: 'polearm',
    element: 'geo',
    origin: 'nodkrai',
    talentMaterialId: 133, // Placeholder
    statTable: charTables.Illuga,
    talents: Talents,
    features: [
        // Normal Attacks
        new FeatureDamageNormal({
            name: 'illuga_normal_1',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'illuga_normal_2',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'illuga_normal_3',
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'illuga_normal_4',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        // Charged Attack
        new FeatureDamageCharged({
            name: 'illuga_charged',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        // Plunge Attacks
        new FeatureDamagePlungeCollision({
            name: 'illuga_plunge_collision',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'illuga_plunge_low',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'illuga_plunge_high',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        // Elemental Skill - Tap (EM + DEF scaling)
        new FeatureDamageSkill({
            name: 'illuga_skill_tap',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.illuga_skill_tap_em'),
                }),
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.illuga_skill_tap_def'),
                }),
            ],
        }),
        // Elemental Skill - Hold (EM + DEF scaling)
        new FeatureDamageSkill({
            name: 'illuga_skill_hold',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.illuga_skill_hold_em'),
                }),
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.illuga_skill_hold_def'),
                }),
            ],
        }),
        // Elemental Burst - Initial hit (EM + DEF scaling)
        new FeatureDamageBurst({
            name: 'illuga_burst',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.illuga_burst_em'),
                }),
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.illuga_burst_def'),
                }),
            ],
        }),
        // C2 Aedon summon (Burst DMG, EM + DEF scaling)
        new FeatureDamageBurst({
            name: 'illuga_c2_aedon',
            element: 'geo',
            condition: new ConditionConstellation({constellation: 2}),
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation2',
                    values: new StatTable('illuga_c2_aedon_em', [C2AedonEM]),
                }),
                new FeatureMultiplier({
                    scaling: 'def*',
                    source: 'constellation2',
                    values: new StatTable('illuga_c2_aedon_def', [C2AedonDEF]),
                }),
            ],
        }),
    ],
    conditions: [
        // A1: Lightkeeper's Oath - self buff after Skill/Burst (Geo CRIT Rate/DMG + Moonsign EM)
        new ConditionBoolean({
            name: 'illuga_lightkeepers_oath',
            serializeId: 1,
            title: 'talent_name.illuga_torchforgers_covenant',
            description: 'talent_descr.illuga_torchforgers_covenant',
            info: {ascension: 1},
            rotation: 'self',
            hideInactive: true,
            stats: {
                crit_rate_geo: A1CritRate,
                crit_dmg_geo: A1CritDmg,
                mastery: A1MoonsignEM,
            },
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                new ConditionNot([new ConditionConstellation({constellation: 6})]),
            ]),
        }),
        // Burst: Nightingale's Song active
        new ConditionBoolean({
            name: 'illuga_nightingales_song',
            serializeId: 2,
            title: 'talent_name.illuga_shadowless_reflection',
            description: 'talent_descr.n11270001',
            info: {burst: true},
            rotation: 'self',
            stats: {},
        }),
        // A4: Demonhunter's Dusk - party element count for scaling
        new ConditionCalcElementsIlluga({
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        // A4: Demonhunter's Dusk - display condition
        new ConditionBooleanLevels({
            name: 'illuga_demonhunters_dusk',
            serializeId: 3,
            title: 'talent_name.illuga_demonhunters_dusk',
            description: 'talent_descr.illuga_demonhunters_dusk',
            levelSetting: 'illuga_hydro_geo_count',
            stats: [
                new StatTable('text_number', [0, 1, 2, 3]),
                new StatTable('text_percent_em', [0, ...A4GeoDmgScale]),
            ],
            info: {ascension: 4},
            hideInactive: true,
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
                new ConditionBoolean({name: 'illuga_nightingales_song'}),
            ],
        }),
    ],
    partyConditions: [],
    constellation: new DbObjectConstellation([
        // C1: Gullinkambi - Energy restoration (passive, not calculated)
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.illuga_vigilant_sentinel',
                    description: 'talent_descr.illuga_vigilant_sentinel',
                }),
            ],
        },
        // C2: Eikþyrnir - Aedon summon (featured above)
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.illuga_elk_with_fanged_antlers',
                    description: 'talent_descr.illuga_elk_with_fanged_antlers',
                    stats: {
                        text_percent_em: C2AedonEM,
                        text_percent_def: C2AedonDEF,
                    },
                }),
            ],
        },
        // C3: Bergelmir - Burst +3
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_burst_bonus: 3,
                    },
                }),
            ],
        },
        // C4: Skoll - DEF bonus (applied via partyData)
        {},
        // C5: Svadilfari - Skill +3
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_elemental_bonus: 3,
                    },
                }),
            ],
        },
        // C6: Nightmare Orioles - Enhanced Lightkeeper's Oath (applied via toggleable condition)
        {
            conditions: [
                new ConditionBoolean({
                    name: 'illuga_lightkeepers_oath_c6',
                    serializeId: 6,
                    title: 'talent_name.illuga_nightmare_orioles',
                    description: 'talent_descr.illuga_nightmare_orioles',
                    rotation: 'self',
                    hideInactive: true,
                    stats: {
                        crit_rate_geo: C6CritRate,
                        crit_dmg_geo: C6CritDmg,
                        mastery: C6MoonsignEM,
                    },
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['mastery'],
            settings: ['char_skill_burst'],
        },
        conditions: [
            // Illuga's EM input
            new ConditionNumber({
                name: 'illuga_mastery',
                title: 'talent_name.stats_total_mastery',
                partyStat: 'mastery',
                serializeId: 1,
                rotation: 'party',
                max: 1500,
            }),
            // A1: Lightkeeper's Oath party toggle
            new ConditionBoolean({
                name: 'party.illuga_lightkeepers_oath',
                serializeId: 4,
                title: 'talent_name.illuga_torchforgers_covenant',
                description: 'talent_descr.illuga_torchforgers_covenant',
                info: {ascension: 1},
                rotation: 'party',
                stats: {
                    text_crit_rate_geo: A1CritRate,
                    text_crit_dmg_geo: A1CritDmg,
                    text_mastery: A1MoonsignEM,
                },
            }),
            // C6: Enhanced Lightkeeper's Oath (sub-toggle under A1)
            new ConditionBoolean({
                name: 'party.illuga_lightkeepers_oath_c6',
                serializeId: 9,
                title: 'talent_name.illuga_nightmare_orioles',
                description: 'talent_descr.illuga_nightmare_orioles',
                info: {constellation: 6},
                rotation: 'party',
                stats: {
                    text_crit_rate_geo: C6CritRate,
                    text_crit_dmg_geo: C6CritDmg,
                    text_mastery: C6MoonsignEM,
                },
                subConditions: [
                    new ConditionBoolean({name: 'party.illuga_lightkeepers_oath'}),
                ],
            }),
            // A1 stats (applied when A1 is ON and C6 is OFF)
            new Condition({
                stats: {
                    crit_rate_geo: A1CritRate,
                    crit_dmg_geo: A1CritDmg,
                    mastery: A1MoonsignEM,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.illuga_lightkeepers_oath'}),
                    new ConditionNot([new ConditionBoolean({name: 'party.illuga_lightkeepers_oath_c6'})]),
                ]),
            }),
            // C6 stats (applied when both A1 and C6 are ON)
            new Condition({
                stats: {
                    crit_rate_geo: C6CritRate,
                    crit_dmg_geo: C6CritDmg,
                    mastery: C6MoonsignEM,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.illuga_lightkeepers_oath'}),
                    new ConditionBoolean({name: 'party.illuga_lightkeepers_oath_c6'}),
                ]),
            }),
            // C4: Party DEF bonus
            new ConditionBoolean({
                name: 'party.illuga_c4_def',
                serializeId: 6,
                title: 'talent_name.illuga_solarhunting_wolf',
                description: 'talent_descr.illuga_solarhunting_wolf',
                info: {constellation: 4},
                rotation: 'party',
                stats: {
                    def: C4DefBonus,
                },
            }),
            // Burst level input for Nightingale's Song scaling
            new ConditionNumberTalent({
                name: 'illuga_char_skill_burst',
                serializeId: 8,
                title: 'talent_name.stats_level_burst',
                partySetting: 'char_skill_burst',
            }),
            // C3: Burst level +3
            new ConditionBoolean({
                name: 'party.illuga_constellation_3',
                serializeId: 10,
                title: 'talent_name.illuga_earthshaking_maw',
                description: 'talent_descr.char_constellation_burst',
                info: {constellation: 3},
                settings: {
                    illuga_char_skill_burst_bonus: 3,
                },
            }),
            // Nightingale's Song toggle (Geo DMG bonus based on EM)
            new ConditionBoolean({
                name: 'party.illuga_nightingales_song',
                serializeId: 7,
                title: 'talent_name.illuga_shadowless_reflection',
                description: 'talent_descr.illuga_shadowless_reflection',
                rotation: 'party',
            }),
            // A4: Demonhunter's Dusk - party element count
            new ConditionCalcElementsIlluga({}),
            // A4: Demonhunter's Dusk toggle
            new ConditionBooleanLevels({
                name: 'party.illuga_demonhunters_dusk',
                serializeId: 11,
                title: 'talent_name.illuga_demonhunters_dusk',
                description: 'talent_descr.illuga_demonhunters_dusk',
                info: {ascension: 4},
                rotation: 'party',
                levelSetting: 'illuga_hydro_geo_count',
                stats: [
                    new StatTable('text_number', [0, 1, 2, 3]),
                    new StatTable('text_percent_em', [0, ...A4GeoDmgScale]),
                ],
                subConditions: [
                    new ConditionBoolean({name: 'party.illuga_nightingales_song'}),
                ],
            }),
        ],
        multipliers: [
            // Nightingale's Song: Geo DMG flat bonus based on EM
            // Formula: EM × (71.4% at L13) = EM × 0.714 → 1071 flat damage at 1500 EM
            new FeatureMultiplier({
                scaling: 'illuga_mastery',
                leveling: 'illuga_char_skill_burst',
                source: 'illuga_nightingales_song',
                values: Talents.get('burst.illuga_geo_dmg_bonus'),
                target: new FeatureMultiplierTarget({
                    damageElements: ['geo'],
                    tagsExclude: ['lunarcrystallize_reaction'],
                }),
                condition: new ConditionBoolean({name: 'party.illuga_nightingales_song'}),
            }),
            // Nightingale's Song: Lunar-Crystallize flat bonus based on EM
            // Formula: EM × (480.1% at L13) = EM × 4.801 → 7201 flat damage at 1500 EM
            new FeatureMultiplier({
                scaling: 'illuga_mastery',
                leveling: 'illuga_char_skill_burst',
                source: 'illuga_nightingales_song',
                values: Talents.get('burst.illuga_lunar_crystallize_bonus'),
                target: new FeatureMultiplierTarget({
                    tags: ['lunarcrystallize_reaction'],
                }),
                condition: new ConditionBoolean({name: 'party.illuga_nightingales_song'}),
            }),
            // A4: Demonhunter's Dusk - Geo DMG flat bonus based on EM and party count
            // Formula: EM × (7%/14%/24%) for 1/2/3 Hydro or Geo party members
            new FeatureMultiplier({
                scaling: 'illuga_mastery',
                leveling: 'illuga_hydro_geo_count',
                source: 'illuga_demonhunters_dusk',
                values: new StatTable('illuga_a4_geo_dmg_bonus', [0, ...A4GeoDmgScale]),
                target: new FeatureMultiplierTarget({
                    damageElements: ['geo'],
                    tagsExclude: ['lunarcrystallize_reaction'],
                }),
                condition: new ConditionBoolean({name: 'party.illuga_demonhunters_dusk'}),
            }),
            // A4: Demonhunter's Dusk - Lunar-Crystallize flat bonus based on EM and party count
            // Formula: EM × (48%/96%/160%) for 1/2/3 Hydro or Geo party members
            new FeatureMultiplier({
                scaling: 'illuga_mastery',
                leveling: 'illuga_hydro_geo_count',
                source: 'illuga_demonhunters_dusk',
                values: new StatTable('illuga_a4_lunar_crystallize_bonus', [0, ...A4LunarScale]),
                target: new FeatureMultiplierTarget({
                    tags: ['lunarcrystallize_reaction'],
                }),
                condition: new ConditionBoolean({name: 'party.illuga_demonhunters_dusk'}),
            }),
        ],
    },
});
