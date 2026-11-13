import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionWitchHomework } from "../../classes/Condition/WitchHomework";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageMultihit } from "../../classes/Feature2/Damage/Multihit";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsDef } from "../../classes/PostEffect/Stats/Def";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";


const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Albedo.s1_id,
        title: 'talent_name.albedo_favonius_bladework_weiss',
        description: 'talent_descr.albedo_favonius_bladework_weiss',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Albedo.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Albedo.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Albedo.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Albedo.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Albedo.s1.p5),
            },
            {
                type: 'hits',
                name: 'charged_hit_total',
                table: [
                    new StatTable('charged_hit_1', charTalentTables.Albedo.s1.p6),
                    new StatTable('charged_hit_2', charTalentTables.Albedo.s1.p7),
                ],
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Albedo.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Albedo.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Albedo.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Albedo.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Albedo.s2_id,
        title: 'talent_name.albedo_solar_isotoma',
        description: 'talent_descr.albedo_solar_isotoma',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.Albedo.s2.p1),
            },
            {
                unit: 'def',
                table: new StatTable('albedo_blossom', charTalentTables.Albedo.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Albedo.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Albedo.s2.p4),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Albedo.s3_id,
        title: 'talent_name.albedo_tectonic_tide',
        description: 'talent_descr.albedo_tectonic_tide',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Albedo.s3.p1),
            },
            {
                table: new StatTable('albedo_fatal_blossom', charTalentTables.Albedo.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Albedo.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Albedo.s3.p4),
            },
        ],
    },
});

const TalentValues = {
    A1HpThreshold: percent(charTalentTables.Albedo.a1.p1),
    A1SkillBonus: percent(charTalentTables.Albedo.a1.p2),
    A1DefBonusBuffed: percent(charTalentTables.Albedo.a1.p3),
    A4Mastery: charTalentTables.Albedo.a4.p1,
    C1Energy: charTalentTables.Albedo.c1.p1,
    C1DefBonusBuffed: percent(charTalentTables.Albedo.c1.p2),
    C2DefBonus: percent(charTalentTables.Albedo.c2.p1),
    C2FatalBlossomBuffed: percent(charTalentTables.Albedo.c2.p2),
    C4PlungeDmg: percent(charTalentTables.Albedo.c4.p1),
    C4PlungeDmgBuffed: percent(charTalentTables.Albedo.c4.p3),
    C6ShieldDmg: 17,
    C6FatalBlossomBuffed: percent(charTalentTables.Albedo.c6.p2),
    SpSolarDmgMax: percent(charTalentTables.Albedo.sp.p2),
    SpSilverDmgMax: percent(charTalentTables.Albedo.sp.p4),
};

const condWitchHomeworkOn = new ConditionBoolean({name: 'albedo_witch_homework'});
const condWitchHomeworkOff = new ConditionNot([condWitchHomeworkOn]);
const condHexereiResonanceOn = new ConditionHexereiResonance({});
const condIsWitch = new ConditionWitchHomework({});
// Descent of Divinity and Dust of Purification affect active party members
// within the Solar Isotoma field.
const condActiveReceiver = new ConditionReceiver({
    condition: new ConditionOnField(),
});

export const Albedo = new DbObjectChar({
    name: 'albedo',
    serializeId: 1,
    gameId: 10000038,
    iconClass: "char-icon-albedo",
    rarity: 5,
    element: 'geo',
    weapon: 'sword',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Albedo,
    // Every `scaling: 'def*'` multiplier below reads the total DEF: the
    // game computes each of these hits from FIGHT_PROP_CUR_DEFENSE (total).
    // Skill blossoms: UNIQUE_Albedo_Monolith_Field_Attacker and
    // UNIQUE_Albedo_Monolith_Hexenzirkel_Field_Attacker (damageExtra
    // Damage_Art x CUR_DEFENSE); A1 Hexerei bonus:
    // UNIQUE_Albedo_AlchemyTrap_BloomAttackUp_Hexenzirkel (damageExtra
    // Ratio x CUR_DEFENSE); burst blossoms:
    // Albedo_AlchemicalBreakOut_FullBloom_OnSelf{1,2,3} and
    // Albedo_HexenzirkelSkill_AlchemicalBreakOut_FullBloom_OnTarget
    // (damageExtra Talent_2_Ratio x CUR_DEFENSE); C6 burst bonus:
    // UNIQUE_Albedo_Hexenzirkel_Burst_Talent_6 (damageExtra Talent_6_Ratio
    // x CUR_DEFENSE); C2 burst bonus: AlchemicalBreakOut_End sets
    // _ABILITY_Albedo_AlchemicalBreakOut_FullBloomExtraDmg from
    // CUR_DEFENSE x DEF2ATK_Ratio x BloomLevel. GO reads input.total.def
    // for all of them. def* is already total, so no params. KQM has no
    // Albedo stat-interaction test.
    features: [
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
        new FeatureDamageNormal({
            name: 'normal_hit_5',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5'),
                }),
            ],
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'charged',
            name: 'charged_hit_total',
            allowInfusion: true,
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.charged_hit_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.charged_hit_2'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit_1',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_1'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit_2',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_2'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
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
        new FeatureDamageSkill({
            name: 'skill_dmg',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'albedo_blossom',
            element: 'geo',
            damageBonuses: ['dmg_skill_albedo'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.albedo_blossom'),
                }),
                new FeatureMultiplier({
                    scaling: 'def*',
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionBoolean({name: 'albedo_calcite_might'}),
                    ]),
                    values: new ValueTable([TalentValues.A1DefBonusBuffed]),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'albedo_fatal_blossom',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.albedo_fatal_blossom'),
                }),
                new FeatureMultiplier({
                    scaling: 'def*',
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionBoolean({name: 'albedo_dust_of_purification_20s'}),
                    ]),
                    values: new ValueTable([TalentValues.C6FatalBlossomBuffed]),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'albedo_c2_fatal_blossom',
            element: 'geo',
            condition: new ConditionAnd([
                condWitchHomeworkOn,
                new ConditionBoolean({name: 'albedo_opening_of_hanerozoic'}),
            ]),
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    values: new ValueTable([TalentValues.C2FatalBlossomBuffed]),
                }),
            ],
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'albedo_witch_homework',
            serializeId: 13,
            title: 'talent_name.albedo_book_of_blinding_light',
            description: 'talent_descr.albedo_book_of_blinding_light',
            info: {hexerei: true},
        }),
        new ConditionBoolean({
            name: 'albedo_solar_isotoma_buff',
            serializeId: 6,
            title: 'talent_name.albedo_solar_isotoma_buff',
            description: 'talent_descr.albedo_solar_isotoma_buff',
            info: {hexerei: true},
        }),
        new ConditionBoolean({
            name: 'albedo_silver_isotoma_buff',
            serializeId: 8,
            title: 'talent_name.albedo_silver_isotoma_buff',
            description: 'talent_descr.albedo_silver_isotoma_buff',
            info: {hexerei: true},
        }),
        new ConditionBoolean({
            name: 'albedo_calcite_might',
            serializeId: 1,
            title: 'talent_name.albedo_calcite_might',
            description: 'talent_descr.albedo_calcite_might',
            hideCondition: [condWitchHomeworkOn],
            condition: new ConditionAnd([
                condWitchHomeworkOff,
                new ConditionAscensionChar({ascension: 1}),
            ]),
            stats: {
                text_percent_hp: TalentValues.A1HpThreshold,
                dmg_skill_albedo: TalentValues.A1SkillBonus,
            },
            info: {ascension: 1},
        }),
        new ConditionBoolean({
            name: 'albedo_calcite_might',
            serializeId: 1,
            title: 'talent_name.albedo_calcite_might',
            description: 'talent_descr.albedo_calcite_might_buffed',
            hideCondition: [condWitchHomeworkOff],
            condition: new ConditionAnd([
                condWitchHomeworkOn,
                new ConditionAscensionChar({ascension: 1}),
            ]),
            stats: {
                text_percent_hp: TalentValues.A1HpThreshold,
                dmg_skill_albedo: TalentValues.A1SkillBonus,
            },
            info: {ascension: 1},
        }),
        new ConditionBoolean({
            name: 'albedo_homuncular_nature',
            serializeId: 2,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.albedo_homuncular_nature',
            description: 'talent_descr.albedo_homuncular_nature',
            // Game data: UNIQUE_Albedo_AlchemicalBreakOut_ElemMasteryUp
            // writes the flat ElemMasteryDelta into Actor_ElemMasteryDelta
            // (no "Extra": a premod write) with no stat read. Conditions
            // write premod: default confirmed, no params. GO writes a flat
            // eleMas team buff. KQM (Sucrose evidence): flat EM buffs such
            // as Albedo's A4 count for Sucrose's A4.
            stats: {
                mastery: TalentValues.A4Mastery,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    postEffects: [
        // Solar Isotoma team DMG (Hexerei). Game data:
        // UNIQUE_Avatar_Albedo_HexenzirkelSkill_OG_BuffHandler_OnSelf
        // computes Defence_InCalc_OG from FIGHT_PROP_CUR_DEFENSE (total)
        // / 1000 x Ratio_OG, capped by Ratio_OG_Max, applied by
        // UNIQUE_Avatar_Albedo_HexenzirkelSkill_OG_Buff (ModifyDamageMixin
        // damagePercentageRatio on Normal/Charged/Falling/Skill/Burst).
        // GO reads input.total.def. No ability writes extra DEF, so the
        // number is the same either way today.
        new PostEffectStatsDef({
            reads: CHANNELS.TOTAL,
            receivers: RECEIVERS.TEAM,
            percent: ['normal', 'charged', 'plunge', 'skill', 'burst'].map(
                type => new StatTable('dmg_' + type, [4 / 1000]),
            ),
            statCap: new ValueTable([TalentValues.SpSolarDmgMax]),
            conditions: [
                condWitchHomeworkOn,
                condHexereiResonanceOn,
                new ConditionBoolean({name: 'albedo_solar_isotoma_buff'}),
            ],
        }),
        // Silver Isotoma team DMG (Hexerei, Hexerei receivers only). Game
        // data: UNIQUE_Avatar_Albedo_HexenzirkelSkill_NG_BuffHandler_OnSelf
        // computes Defence_InCalc_NG from FIGHT_PROP_CUR_DEFENSE (total)
        // / 1000 x Ratio_NG, capped by Ratio_NG_Max, applied by
        // UNIQUE_Avatar_Albedo_HexenzirkelSkill_NG_Buff. GO reads
        // input.total.def. No ability writes extra DEF, so the number is
        // the same either way today.
        new PostEffectStatsDef({
            reads: CHANNELS.TOTAL,
            receivers: RECEIVERS.TEAM,
            percent: ['normal', 'charged', 'plunge', 'skill', 'burst'].map(
                type => new StatTable('dmg_' + type, [10 / 1000]),
            ),
            statCap: new ValueTable([TalentValues.SpSilverDmgMax]),
            conditions: [
                condWitchHomeworkOn,
                condHexereiResonanceOn,
                new ConditionBoolean({name: 'albedo_silver_isotoma_buff'}),
                new ConditionReceiver({condition: condIsWitch}),
            ],
        }),
    ],
    multipliers: [
        // C2 Fatal Reckoning burst bonus: 30% of DEF per stack. Game data:
        // AlchemicalBreakOut_End sets
        // _ABILITY_Albedo_AlchemicalBreakOut_FullBloomExtraDmg from
        // FIGHT_PROP_CUR_DEFENSE (total) x DEF2ATK_Ratio x BloomLevel; GO
        // reads input.total.def. scaling 'def*' is already total:
        // confirmed, no params.
        new FeatureMultiplier({
            scaling: 'def*',
            source: 'constellation2',
            leveling: 'albedo_opening_of_hanerozoic',
            values: new ValueTable([
                TalentValues.C2DefBonus,
                TalentValues.C2DefBonus * 2,
                TalentValues.C2DefBonus * 3,
                TalentValues.C2DefBonus * 4,
            ]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 2}),
                new ConditionBoolean({name: 'albedo_opening_of_hanerozoic'}),
            ]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['burst'],
            }),
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.albedo_flower_of_eden',
                    description: 'talent_descr.albedo_flower_of_eden',
                    hideCondition: [condWitchHomeworkOn],
                    stats: {
                        text_decimal_energy: TalentValues.C1Energy,
                    },
                }),
                new ConditionBoolean({
                    name: 'albedo_flower_of_eden',
                    serializeId: 7,
                    title: 'talent_name.albedo_flower_of_eden',
                    description: 'talent_descr.albedo_flower_of_eden_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    // Game data: UNIQUE_Avatar_Albedo_Hexenzirkel_Talent_1
                    // writes DefenceRatio into Actor_DefenceRatio (no
                    // "Extra": a premod write) with no stat read.
                    // Conditions write premod: default confirmed, no params.
                    stats: {
                        text_decimal_energy: TalentValues.C1Energy,
                        def_percent: TalentValues.C1DefBonusBuffed,
                    },
                })
            ],
        },
        {
            conditions: [
                new ConditionStacks({
                    name: 'albedo_opening_of_hanerozoic',
                    serializeId: 3,
                    title: 'talent_name.albedo_opening_of_phanerozoic',
                    description: 'talent_descr.albedo_opening_of_phanerozoic',
                    hideCondition: [condWitchHomeworkOn],
                    condition: condWitchHomeworkOff,
                    maxStacks: 4,
                    stats: [
                        new StatTable('text_percent_dmg', [TalentValues.C2DefBonus]),
                    ],
                }),
                new ConditionStacks({
                    name: 'albedo_opening_of_hanerozoic',
                    serializeId: 3,
                    title: 'talent_name.albedo_opening_of_phanerozoic',
                    description: 'talent_descr.albedo_opening_of_phanerozoic_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    maxStacks: 4,
                    stats: [
                        new StatTable('text_percent_dmg', [TalentValues.C2DefBonus]),
                    ],
                }),
                // The stacks are consumed on trigger; the resulting EM buff
                // has its own duration and activation assumption. Flat 125
                // EM like the A4 above (same ElemMasteryDelta): a premod
                // write, default confirmed, no params.
                new ConditionBoolean({
                    name: 'albedo_opening_of_hanerozoic_buff',
                    serializeId: 14,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.albedo_homuncular_nature',
                    description: 'talent_descr.albedo_opening_of_phanerozoic_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionAscensionChar({ascension: 4}),
                    ]),
                    stats: {
                        mastery: TalentValues.A4Mastery,
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
                    name: 'albedo_descent_of_divinity',
                    serializeId: 4,
                    title: 'talent_name.albedo_descent_of_divinity',
                    description: 'talent_descr.albedo_descent_of_divinity',
                    displayStats: {dmg_plunge: TalentValues.C4PlungeDmg},
                    hideCondition: [condWitchHomeworkOn],
                    condition: condWitchHomeworkOff,
                }),
                new ConditionBoolean({
                    name: 'albedo_descent_of_divinity',
                    serializeId: 4,
                    title: 'talent_name.albedo_descent_of_divinity',
                    description: 'talent_descr.albedo_descent_of_divinity_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'albedo_descent_of_divinity'}),
                        condActiveReceiver,
                    ]),
                    stats: {dmg_plunge: TalentValues.C4PlungeDmg},
                }),
                new ConditionBoolean({
                    name: 'albedo_descent_of_divinity_3s',
                    serializeId: 11,
                    title: 'talent_name.albedo_descent_of_divinity',
                    hideCondition: [condWitchHomeworkOff],
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionBoolean({name: 'albedo_descent_of_divinity'}),
                    ]),
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionBoolean({name: 'albedo_descent_of_divinity'}),
                        new ConditionBoolean({name: 'albedo_descent_of_divinity_3s'}),
                        condActiveReceiver,
                    ]),
                    stats: {dmg_plunge: TalentValues.C4PlungeDmgBuffed},
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
                    name: 'albedo_dust_of_purification',
                    serializeId: 5,
                    title: 'talent_name.albedo_dust_of_purification',
                    description: 'talent_descr.albedo_dust_of_purification',
                    displayStats: {dmg_all: TalentValues.C6ShieldDmg},
                    hideCondition: [condWitchHomeworkOn],
                    condition: condWitchHomeworkOff,
                }),
                new ConditionBoolean({
                    name: 'albedo_dust_of_purification',
                    serializeId: 5,
                    title: 'talent_name.albedo_dust_of_purification',
                    description: 'talent_descr.albedo_dust_of_purification_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'albedo_dust_of_purification'}),
                        condActiveReceiver,
                    ]),
                    stats: {dmg_all: TalentValues.C6ShieldDmg},
                }),
                new ConditionBoolean({
                    name: 'albedo_dust_of_purification_20s',
                    serializeId: 12,
                    title: 'talent_name.albedo_dust_of_purification',
                    hideCondition: [condWitchHomeworkOff],
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionBoolean({name: 'albedo_dust_of_purification'}),
                    ]),
                }),
            ]
        },
    ]),
    retiredParty: [[8, 'checkbox'], [10, 'number'], [11, 'checkbox'], [12, 'checkbox'], [1, 'checkbox'], [2, 'checkbox'], [7, 'checkbox'], [5, 'checkbox'], [9, 'checkbox'], [3, 'checkbox']],
});

