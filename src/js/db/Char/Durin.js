import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanDropdownValue } from "../../classes/Condition/Boolean/DropdownValue";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdownElement } from "../../classes/Condition/Dropdown/Element";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionOr } from "../../classes/Condition/Or";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageBurstPeriodic } from "../../classes/Feature2/Damage/Burst/Periodic";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../classes/StatTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Durin.s1_id,
        title: 'talent_name.durin_radiant_wingslash',
        description: 'talent_descr.durin_radiant_wingslash',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Durin.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Durin.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Durin.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Durin.s1.p5),
            },
            {
                table: new StatTable('durin_charged_dmg', charTalentTables.Durin.s1.p6),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Durin.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Durin.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Durin.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Durin.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Durin.s2_id,
        title: 'talent_name.durin_convergence_and_division',
        description: 'talent_descr.durin_convergence_and_division',
        items: [
            {
                table: new StatTable('durin_confirmation_dmg', charTalentTables.Durin.s2.p1),
            },
            {
                table: new StatTable('durin_denial_dmg_1', charTalentTables.Durin.s2.p2),
            },
            {
                table: new StatTable('durin_denial_dmg_2', charTalentTables.Durin.s2.p3),
            },
            {
                table: new StatTable('durin_denial_dmg_3', charTalentTables.Durin.s2.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('energy_regen', charTalentTables.Durin.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Durin.s2.p6),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Durin.s3_id,
        title: 'talent_name.durin_as_the_light_shifts',
        description: 'talent_descr.durin_as_the_light_shifts',
        items: [
            {
                table: new StatTable('durin_purity_dmg_1', charTalentTables.Durin.s3.p1),
            },
            {
                table: new StatTable('durin_purity_dmg_2', charTalentTables.Durin.s3.p2),
            },
            {
                table: new StatTable('durin_purity_dmg_3', charTalentTables.Durin.s3.p3),
            },
            {
                table: new StatTable('durin_darkness_dmg_1', charTalentTables.Durin.s3.p4),
            },
            {
                table: new StatTable('durin_darkness_dmg_2', charTalentTables.Durin.s3.p5),
            },
            {
                table: new StatTable('durin_darkness_dmg_3', charTalentTables.Durin.s3.p6),
            },
            {
                table: new StatTable('durin_white_flame_dmg', charTalentTables.Durin.s3.p7),
            },
            {
                table: new StatTable('durin_dark_decay_dmg', charTalentTables.Durin.s3.p8),
            },
            {
                unit: 'sec',
                table: new StatTable('durin_dragon_duration', charTalentTables.Durin.s3.p9),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Durin.s3.p11),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Durin.s3.p12),
            },
        ],
    },
});

// Passive and constellation values
const A1ResShred = 20;
const A1ResShredHexerei = 35; // 20% * 1.75 = 35%
const A1VaporizeMeltBonus = 40;
const A1VaporizeMeltBonusHexerei = 70; // 40% * 1.75 = 70%
const A4PrimordialMaxBonus = 75;
const A4PrimordialAtkScale = 3; // 3% per 100 ATK (PostEffect divides by 100 for percent stats)

// A4 - Primordial Fusion: Dragon attacks consume stack and gain DMG multiplier based on ATK
// This is a separate multiplicative layer, not additive DMG bonus
// Formula: 100% + min(3% * ATK / 100, 75%) = up to 175% multiplier
const a4PrimordialPost = new PostEffectStatsAtk({
    percent: new StatTable('dmg_burst_periodic_special', [A4PrimordialAtkScale]),
    statCap: new StatTable('', [A4PrimordialMaxBonus]),
    conditions: [
        new ConditionAscensionChar({ascension: 4}),
        new ConditionBoolean({name: 'durin_primordial_fusion'}),
    ],
});
const C1CycleAtkScale = 60;
const C1CycleSelfAtkScale = 150;
const C2PyroDmgBonus = 50;
const C4BurstDmgBonus = 40;
const C6DefIgnore = 30;
const C6DefShred = 30;
const C6DarknessDefIgnoreExtra = 40;

// Condition shortcuts for Dragon Form
// Toggle OFF (default) = Purity mode, Toggle ON = Darkness mode
const condDarknessMode = new ConditionBoolean({name: 'durin_darkness_mode'});
const condPurityMode = new ConditionNot([new ConditionBoolean({name: 'durin_darkness_mode'})]);

export const Durin = new DbObjectChar({
    name: 'durin',
    serializeId: 113,
    gameId: 10000123,
    iconClass: 'char-icon-durin',
    rarity: 5,
    element: 'pyro',
    weapon: 'sword',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Durin,
    features: [
        // Normal attacks
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'durin_charged_dmg',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.durin_charged_dmg'),
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
            name: 'plunge_low',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        // Skill - Confirmation of Purity
        new FeatureDamageSkill({
            name: 'durin_confirmation_dmg',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.durin_confirmation_dmg'),
                }),
            ],
        }),
        // Skill - Denial of Darkness (3 hits)
        new FeatureDamageSkill({
            name: 'durin_denial_dmg_1',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.durin_denial_dmg_1'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'durin_denial_dmg_2',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.durin_denial_dmg_2'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'durin_denial_dmg_3',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.durin_denial_dmg_3'),
                }),
            ],
        }),
        // Burst - Principle of Purity (3 hits) - only visible in Purity mode
        new FeatureDamageBurst({
            name: 'durin_purity_dmg_1',
            element: 'pyro',
            condition: condPurityMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_purity_dmg_1'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'durin_purity_dmg_2',
            element: 'pyro',
            condition: condPurityMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_purity_dmg_2'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'durin_purity_dmg_3',
            element: 'pyro',
            condition: condPurityMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_purity_dmg_3'),
                }),
            ],
        }),
        // Dragon of White Flame (periodic) - only visible in Purity mode
        new FeatureDamageBurstPeriodic({
            name: 'durin_white_flame_dmg',
            element: 'pyro',
            condition: condPurityMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_white_flame_dmg'),
                }),
            ],
        }),
        // Burst - Principle of Darkness (3 hits) - only visible in Darkness mode
        new FeatureDamageBurst({
            name: 'durin_darkness_dmg_1',
            element: 'pyro',
            condition: condDarknessMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_darkness_dmg_1'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'durin_darkness_dmg_2',
            element: 'pyro',
            condition: condDarknessMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_darkness_dmg_2'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'durin_darkness_dmg_3',
            element: 'pyro',
            condition: condDarknessMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_darkness_dmg_3'),
                }),
            ],
        }),
        // Dragon of Dark Decay (periodic) - only visible in Darkness mode
        new FeatureDamageBurstPeriodic({
            name: 'durin_dark_decay_dmg',
            element: 'pyro',
            condition: condDarknessMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_dark_decay_dmg'),
                }),
            ],
        }),
    ],
    // C1 - Dark form (Principle of Darkness): 150% ATK flat damage bonus to Burst
    multipliers: [
        new FeatureMultiplier({
            scaling: 'atk*',
            source: 'durin_c1',
            values: new StatTable('', [C1CycleSelfAtkScale]), // 150% of ATK
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 1}),
                new ConditionBoolean({name: 'durin_c1_cycle_self'}),
            ]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['burst'],
            }),
        }),
    ],
    conditions: [
        // Dragon Form selector - OFF (default) = Purity, ON = Darkness
        new ConditionBoolean({
            name: 'durin_darkness_mode',
            serializeId: 11,
            title: 'talent_name.durin_darkness_mode',
        }),
        // Witch Homework - Witch's Eve Rite: Ode to Ascension
        new ConditionBoolean({
            name: 'durin_witch_homework',
            serializeId: 8,
            title: 'talent_name.durin_ode_to_ascension',
            description: 'talent_descr.durin_ode_to_ascension',
            info: {hexerei: true},
        }),
        // A1 - Dragon of White Flame RES shred (multi-select for elements) - Purity mode only
        new ConditionDropdownElement({
            name: 'durin_res_shred',
            serializeId: 1,
            multiple: true,
            hideEmpty: true,
            hideInactive: true,
            dropdownClass: 'select-element-multiple',
            title: 'talent_name.durin_light_manifest_of_the_divine_calculus',
            description: 'talent_descr.durin_light_manifest_of_the_divine_calculus',
            info: {ascension: 1},
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                condPurityMode,
            ]),
            values: [
                { value: 'pyro', serializeId: 1 },
                { value: 'dendro', serializeId: 2 },
                { value: 'electro', serializeId: 3 },
                { value: 'anemo', serializeId: 4 },
                { value: 'geo', serializeId: 5 },
            ],
        }),
        // A1 - Dragon of White Flame RES shred effects (base, no Hexerei)
        ...['pyro', 'dendro', 'electro', 'anemo', 'geo'].map((elem) => {
            return new Condition({
                stats: {
                    ['enemy_res_' + elem]: -A1ResShred,
                },
                condition: new ConditionAnd([
                    new ConditionBooleanDropdownValue({name: 'durin_res_shred', value: elem}),
                    new ConditionNot([new ConditionHexereiResonance({})]),
                ]),
            });
        }),
        // A1 - Dragon of White Flame RES shred effects (Hexerei enhanced)
        ...['pyro', 'dendro', 'electro', 'anemo', 'geo'].map((elem) => {
            return new Condition({
                stats: {
                    ['enemy_res_' + elem]: -A1ResShredHexerei,
                },
                condition: new ConditionAnd([
                    new ConditionBooleanDropdownValue({name: 'durin_res_shred', value: elem}),
                    new ConditionHexereiResonance({}),
                ]),
            });
        }),
        // A1 - Dragon of Dark Decay Vaporize/Melt bonus - Darkness mode only
        new ConditionBoolean({
            name: 'durin_vaporize_melt_bonus',
            serializeId: 2,
            hideInactive: true,
            title: 'talent_name.durin_light_manifest_of_the_divine_calculus',
            description: 'talent_descr.durin_light_manifest_of_the_divine_calculus',
            info: {ascension: 1},
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                condDarknessMode,
            ]),
        }),
        // A1 - Vaporize/Melt bonus effects (base, no Hexerei)
        new Condition({
            stats: {
                dmg_reaction_vaporize: A1VaporizeMeltBonus,
                dmg_reaction_melt: A1VaporizeMeltBonus,
            },
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'durin_vaporize_melt_bonus'}),
                new ConditionNot([new ConditionHexereiResonance({})]),
            ]),
        }),
        // A1 - Vaporize/Melt bonus effects (Hexerei enhanced)
        new Condition({
            stats: {
                dmg_reaction_vaporize: A1VaporizeMeltBonusHexerei,
                dmg_reaction_melt: A1VaporizeMeltBonusHexerei,
            },
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'durin_vaporize_melt_bonus'}),
                new ConditionHexereiResonance({}),
            ]),
        }),
        // A4 - Primordial Fusion (toggle for consuming stack - DMG bonus calculated from ATK)
        new ConditionBoolean({
            name: 'durin_primordial_fusion',
            serializeId: 7,
            title: 'talent_name.durin_chaos_formed_like_the_night',
            description: 'talent_descr.durin_chaos_formed_like_the_night',
            info: {ascension: 4},
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    postEffects: [
        a4PrimordialPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                // C1 - Dark form (Principle of Darkness): Self burst flat damage bonus - Darkness mode only
                new ConditionBoolean({
                    name: 'durin_c1_cycle_self',
                    serializeId: 9,
                    hideInactive: true,
                    title: 'talent_name.durin_adamahs_redemption',
                    description: 'talent_descr.durin_adamahs_redemption',
                    stats: {
                        text_atk_percent: C1CycleSelfAtkScale,
                    },
                    condition: condDarknessMode,
                }),
            ],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'durin_c2_pyro_bonus',
                    serializeId: 3,
                    title: 'talent_name.durin_unground_visions',
                    description: 'talent_descr.durin_unground_visions',
                    stats: {
                        dmg_pyro: C2PyroDmgBonus,
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
                    name: 'durin_c4_burst_bonus',
                    title: 'talent_name.durin_emanares_source',
                    description: 'talent_descr.durin_emanares_source',
                    stats: {
                        dmg_burst: C4BurstDmgBonus,
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
                // Base C6: Burst ignores 30% DEF (always active at C6)
                new ConditionStatic({
                    name: 'durin_c6_def_ignore',
                    title: 'talent_name.durin_dual_birth',
                    description: 'talent_descr.durin_dual_birth',
                    stats: {
                        enemy_def_ignore_burst: C6DefIgnore,
                    },
                }),
                // Purity form: DEF shred 30% - Purity mode only
                new ConditionBoolean({
                    name: 'durin_c6_def_shred',
                    serializeId: 6,
                    hideInactive: true,
                    title: 'talent_name.durin_dual_birth',
                    description: 'talent_descr.durin_dual_birth',
                    stats: {
                        enemy_def_reduce: C6DefShred,
                    },
                    condition: condPurityMode,
                }),
                // Darkness form: Additional 40% DEF ignore - Darkness mode only, auto-active
                new Condition({
                    stats: {
                        enemy_def_ignore_burst: C6DarknessDefIgnoreExtra,
                    },
                    condition: condDarknessMode,
                }),
            ],
        },
    ]),
    // Party buffs
    partyData: {
        loadStats: {
            stats: ['atk_total'],
        },
        conditions: [
            new ConditionNumber({
                name: 'durin_atk_total',
                title: 'talent_name.stats_total_atk',
                partyStat: 'atk_total',
                serializeId: 1,
                rotation: 'party',
                max: 10000,
            }),
            // Dragon Form selector for party buffs - OFF (default) = Purity, ON = Darkness
            new ConditionBoolean({
                name: 'party.durin_darkness_mode',
                serializeId: 6,
                rotation: 'party',
                title: 'talent_name.durin_darkness_mode',
            }),
            // C1 - Light form party buff toggle - Purity mode only
            new ConditionBoolean({
                name: 'party.durin_c1_cycle_party',
                serializeId: 2,
                rotation: 'party',
                hideInactive: true,
                title: 'talent_name.durin_adamahs_redemption',
                description: 'talent_descr.durin_adamahs_redemption',
                stats: {
                    text_atk_percent: C1CycleAtkScale,
                },
                info: {constellation: 1},
                condition: new ConditionNot([new ConditionBoolean({name: 'party.durin_darkness_mode'})]),
            }),
            // A1 - Dragon of White Flame RES shred (party buff) - Purity mode only
            new ConditionDropdownElement({
                name: 'party.durin_res_shred',
                serializeId: 3,
                multiple: true,
                hideEmpty: true,
                hideInactive: true,
                dropdownClass: 'select-element-multiple',
                title: 'talent_name.durin_light_manifest_of_the_divine_calculus',
                description: 'talent_descr.durin_light_manifest_of_the_divine_calculus',
                info: {ascension: 1},
                condition: new ConditionNot([new ConditionBoolean({name: 'party.durin_darkness_mode'})]),
                values: [
                    { value: 'pyro', serializeId: 1 },
                    { value: 'dendro', serializeId: 2 },
                    { value: 'electro', serializeId: 3 },
                    { value: 'anemo', serializeId: 4 },
                    { value: 'geo', serializeId: 5 },
                ],
            }),
            // A1 - RES shred effects (base, no Hexerei) - party version
            ...['pyro', 'dendro', 'electro', 'anemo', 'geo'].map((elem) => {
                return new Condition({
                    stats: {
                        ['enemy_res_' + elem]: -A1ResShred,
                    },
                    condition: new ConditionAnd([
                        new ConditionBooleanDropdownValue({name: 'party.durin_res_shred', value: elem}),
                        new ConditionNot([new ConditionHexereiResonance({})]),
                    ]),
                });
            }),
            // A1 - RES shred effects (Hexerei enhanced) - party version
            ...['pyro', 'dendro', 'electro', 'anemo', 'geo'].map((elem) => {
                return new Condition({
                    stats: {
                        ['enemy_res_' + elem]: -A1ResShredHexerei,
                    },
                    condition: new ConditionAnd([
                        new ConditionBooleanDropdownValue({name: 'party.durin_res_shred', value: elem}),
                        new ConditionHexereiResonance({}),
                    ]),
                });
            }),
            // Witch Homework toggle for party (makes Durin count as Hexerei)
            new ConditionBoolean({
                name: 'party.durin_witch_homework',
                serializeId: 4,
                rotation: 'party',
                title: 'talent_name.durin_ode_to_ascension',
                description: 'talent_descr.durin_ode_to_ascension',
                info: {hexerei: true},
            }),
            // C2 - Unground Visions: 50% elemental DMG bonus (party buff)
            new ConditionDropdownElement({
                name: 'party.durin_c2_dmg_bonus',
                serializeId: 5,
                multiple: true,
                hideEmpty: true,
                dropdownClass: 'select-element-multiple',
                title: 'talent_name.durin_unground_visions',
                description: 'talent_descr.durin_unground_visions',
                info: {constellation: 2},
                values: [
                    { value: 'pyro', serializeId: 1 },
                    { value: 'hydro', serializeId: 2 },
                    { value: 'cryo', serializeId: 3 },
                    { value: 'dendro', serializeId: 4 },
                    { value: 'electro', serializeId: 5 },
                    { value: 'anemo', serializeId: 6 },
                    { value: 'geo', serializeId: 7 },
                ],
            }),
            // C2 - DMG bonus effects
            ...['pyro', 'hydro', 'cryo', 'dendro', 'electro', 'anemo', 'geo'].map((elem) => {
                return new Condition({
                    stats: {
                        ['dmg_' + elem]: C2PyroDmgBonus,
                    },
                    condition: new ConditionBooleanDropdownValue({name: 'party.durin_c2_dmg_bonus', value: elem}),
                });
            }),
            // C6 - Purity form: DEF shred 30% (party buff) - Purity mode only
            new ConditionBoolean({
                name: 'party.durin_c6_def_shred',
                serializeId: 7,
                rotation: 'party',
                hideInactive: true,
                title: 'talent_name.durin_dual_birth',
                description: 'talent_descr.durin_dual_birth',
                stats: {
                    enemy_def_reduce: C6DefShred,
                },
                info: {constellation: 6},
                condition: new ConditionNot([new ConditionBoolean({name: 'party.durin_darkness_mode'})]),
            }),
        ],
        multipliers: [
            // C1 Light form: 60% of Durin's ATK as flat damage for all damage types
            new FeatureMultiplier({
                scaling: 'durin_atk_total',
                source: 'durin_c1',
                values: new StatTable('', [C1CycleAtkScale]), // 60% of ATK
                condition: new ConditionBoolean({name: 'party.durin_c1_cycle_party'}),
                target: new FeatureMultiplierTarget({
                    damageTypes: ['normal', 'charged', 'plunge', 'skill', 'burst'],
                }),
            }),
        ],
    },
});
