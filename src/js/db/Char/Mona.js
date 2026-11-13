import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionWitchHomework } from "../../classes/Condition/WitchHomework";
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
import { PostEffectStatsRecharge } from "../../classes/PostEffect/Stats/Recharge";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Mona.s1_id,
        title: 'talent_name.mona_ripple_of_fate',
        description: 'talent_descr.mona_ripple_of_fate',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Mona.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Mona.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Mona.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Mona.s1.p4),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Mona.s1.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Mona.s1.p6),
            },
            {
                table: new StatTable('plunge', charTalentTables.Mona.s1.p7),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Mona.s1.p8),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Mona.s1.p9),

            },
        ],
    },
    skill: {
        gameId: charTalentTables.Mona.s2_id,
        title: 'talent_name.mona_mirror_reflection_of_doom',
        description: 'talent_descr.mona_mirror_reflection_of_doom',
        items: [
            {
                table: new StatTable('dot_dmg', charTalentTables.Mona.s2.p1),
            },
            {
                table: new StatTable('explosion_dmg', charTalentTables.Mona.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Mona.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Mona.s4_id,
        title: 'talent_name.mona_stellaris_phantasm',
        description: 'talent_descr.mona_stellaris_phantasm',
        items: [
            {
                unit: 'sec',
                table: new StatTable('mona_buble_duration', charTalentTables.Mona.s4.p1),
            },
            {
                table: new StatTable('mona_buble_dmg', charTalentTables.Mona.s4.p2),
            },
            {
                table: new StatTable('mona_dmg_bonus', charTalentTables.Mona.s4.p10),
            },
            {
                unit: 'sec',
                table: new StatTable('mona_omen_duration', charTalentTables.Mona.s4.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Mona.s4.p5),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Mona.s4.p6),
            },
        ],
    },
    other: {
        maxLevel: 1,
        title: 'talent_name.mona_illusory_torrent',
        description: 'talent_descr.mona_illusory_torrent',
        items: [
            {
                unit: 'sec',
                table: new StatTable('sprint_activation_cost', charTalentTables.Mona.s3.p1),
            },
            {
                unit: 'per_sec',
                table: new StatTable('sprint_stamina_drain', charTalentTables.Mona.s3.p2),
            },
        ],
    },
});

const A1SkillDmg = percent(charTalentTables.Mona.a1.p3);
const A4HydroDmgRatio = percent(charTalentTables.Mona.a4.p2);
const C1ReactionBonus = percent(charTalentTables.Mona.c1.p1);
const C2ChargedProb = percent(charTalentTables.Mona.c2.p1);
const C4CritRate = -percent(charTalentTables.Mona.c4.p1);
const C6ChargedDmg = percent(charTalentTables.Mona.c6.p2);
const SpAstralGlow = percent(charTalentTables.Mona.sp.p3);
const C1OffFieldRatio = charTalentTables.Mona.c1.p7;
const C2Mastery = charTalentTables.Mona.c2.p5;
const C4CritDmg = percent(charTalentTables.Mona.c4.p2);

// Game data: Avatar_Mona_Talent_ChargeEfficiencyToWaterAddHurt reads
// FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY (premod ER) and writes
// Actor_WaterAddHurtExtraDelta (extra Hydro DMG%): the defaults. KQM
// (Electro Traveler evidence): the amulet ER does not affect Mona's A4.
const hydroDmgPost = new PostEffectStatsRecharge({
    percent: new StatTable('dmg_hydro', [A4HydroDmgRatio]),
    conditions: [
        new ConditionAscensionChar({ascension: 4}),
    ],
});

const condWitchHomeworkOn = new ConditionBoolean({name: 'mona_witch_homework'});
const condWitchHomeworkOff = new ConditionNot([condWitchHomeworkOn]);

export const Mona = new DbObjectChar({
    name: 'mona',
    serializeId: 17,
    gameId: 10000041,
    iconClass: "char-icon-mona",
    rarity: 5,
    element: 'hydro',
    weapon: 'catalyst',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Mona,
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
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionConstellation({constellation: 6}),
                        new ConditionBoolean({name: 'mona_omen'}),
                    ]),
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'mona_charged_hit',
            element: 'hydro',
            rotationHitCount: C2ChargedProb / 100,
            rotationHitDescription: 'talent_activation_chance',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionConstellation({constellation: 6}),
                        new ConditionBoolean({name: 'mona_omen'}),
                    ]),
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
            condition: new ConditionConstellation({constellation: 2}),
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
            name: 'dot_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.dot_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'explosion_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.explosion_dmg'),
                }),
            ],
        }),
        // A1: a damage hit (50% of Mirror Reflection of Doom). Damage
        // hits read the total and need nothing.
        new FeatureDamageSkill({
            name: 'mona_phantom_explosion_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scalingSource: 'ascension1',
                    scalingMultiplier: A1SkillDmg / 100,
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.explosion_dmg'),
                }),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.mona_buble_dmg'),
                }),
            ],
        }),
        // Display of hydroDmgPost above; not a separate stat read.
        new FeaturePostEffectValue({
            category: 'other',
            name: 'hydro_dmg_bonus',
            postEffect: hydroDmgPost,
            format: 'percent',
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'mona_witch_homework',
            serializeId: 9,
            title: 'talent_name.mona_genesis_of_starsigns',
            description: 'talent_descr.mona_genesis_of_starsigns',
            info: {hexerei: true},
        }),
        new ConditionConstellation({
            constellation: 3,
            settings: {
                char_skill_burst_bonus: 3,
            },
        }),
        // Omen: a talent-scaled team DMG bonus, no stat read.
        new ConditionBooleanLevels({
            name: 'mona_omen',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.mona_omen',
            description: 'talent_descr.mona_omen',
            levelSetting: 'char_skill_burst',
            stats: [
                Talents.getAlias('burst.mona_dmg_bonus', 'dmg_all'),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.mona_come_n_get_me_hag',
            description: 'talent_descr.mona_come_n_get_me_hag',
            stats: {
                text_percent_dmg: A1SkillDmg,
            },
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.mona_waterborne_destiny',
            description: 'talent_descr.mona_waterborne_destiny',
            stats: {
                text_percent: A4HydroDmgRatio,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        // Astral Glow of Mercury: when other party members trigger Vaporize,
        // the consumed stacks raise that reaction's DMG by 5% each.
        new ConditionStacks({
            name: 'mona_astral_glow',
            serializeId: 7,
            receivers: RECEIVERS.OTHERS,
            title: 'talent_name.mona_genesis_of_starsigns',
            description: 'talent_descr.mona_genesis_of_starsigns',
            maxStacks: 3,
            hideCondition: [new ConditionNot([new ConditionHexereiResonance({})])],
            condition: new ConditionAnd([
                condWitchHomeworkOn,
                new ConditionHexereiResonance({}),
            ]),
            stats: [
                new StatTable('dmg_reaction_vaporize', [SpAstralGlow]),
            ],
            info: {hexerei: true},
        }),
    ],
    postEffects: [
        hydroDmgPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                // C1: flat reaction bonuses, no stat read. Conditions are
                // always premod, which is right for flat buffs.
                new ConditionBoolean({
                    name: 'mona_prophecy_of_submersion',
                    serializeId: 4,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.mona_prophecy_of_submersion',
                    description: 'talent_descr.mona_prophecy_of_submersion',
                    hideCondition: [condWitchHomeworkOn],
                    condition: condWitchHomeworkOff,
                    stats: {
                        dmg_reaction_electrocharged: C1ReactionBonus,
                        dmg_reaction_vaporize: C1ReactionBonus,
                        dmg_reaction_swirl_hydro: C1ReactionBonus,
                        duration_frozen: C1ReactionBonus,
                        dmg_reaction_lunarcharged: C1ReactionBonus,
                        dmg_reaction_lunarcrystallize: C1ReactionBonus,
                    },
                }),
                new ConditionBoolean({
                    name: 'mona_prophecy_of_submersion',
                    serializeId: 4,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.mona_prophecy_of_submersion',
                    description: 'talent_descr.mona_prophecy_of_submersion_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    stats: {
                        dmg_reaction_electrocharged: C1ReactionBonus,
                        dmg_reaction_vaporize: C1ReactionBonus,
                        dmg_reaction_swirl_hydro: C1ReactionBonus,
                        duration_frozen: C1ReactionBonus,
                        dmg_reaction_lunarcharged: C1ReactionBonus,
                        dmg_reaction_lunarcrystallize: C1ReactionBonus,
                    },
                }),
                new ConditionBoolean({
                    name: 'mona_prophecy_of_submersion_off_field',
                    serializeId: 5,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.mona_prophecy_of_submersion',
                    hideCondition: [condWitchHomeworkOff],
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        new ConditionBoolean({name: 'mona_prophecy_of_submersion'}),
                    ]),
                    stats: {
                        dmg_reaction_electrocharged: C1ReactionBonus * C1OffFieldRatio,
                        dmg_reaction_vaporize: C1ReactionBonus * C1OffFieldRatio,
                        dmg_reaction_swirl_hydro: C1ReactionBonus * C1OffFieldRatio,
                        duration_frozen: C1ReactionBonus * C1OffFieldRatio,
                        dmg_reaction_lunarcharged: C1ReactionBonus * C1OffFieldRatio,
                        dmg_reaction_lunarcrystallize: C1ReactionBonus * C1OffFieldRatio,
                    },
                }),
            ],
        },
        {
            conditions: [
                // C2: a charged-attack proc chance plus flat team EM (80 in
                // the Hexerei variant). No stat read; the flat EM is premod,
                // so premod EM readers count it.
                new ConditionStatic({
                    title: 'talent_name.mona_lunar_chain',
                    description: 'talent_descr.mona_lunar_chain',
                    hideCondition: [condWitchHomeworkOn],
                    stats: {
                        text_percent_chance: C2ChargedProb,
                    },
                }),
                new ConditionBoolean({
                    name: 'mona_lunar_chain_buff',
                    serializeId: 6,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.mona_lunar_chain',
                    description: 'talent_descr.mona_lunar_chain_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    stats: {
                        text_percent_chance: C2ChargedProb,
                        mastery: C2Mastery,
                    },
                }),
            ],
        },
        {},
        {
            conditions: [
                // C4: CRIT Rate against an opponent affected by an Omen (plus
                // CRIT DMG for Hexerei receivers). Game data: the Omen
                // (Avatar_Mona_StarChart, UNIQUE_Debuff_HurtUp and
                // UNIQUE_Debuff_Bubble_RemoveDamage) writes
                // Actor_AntiCriticalDelta on the opponent, so it is not a CRIT
                // Rate stat of the member: crit_rate_enemy, as Blizzard
                // Strayer's (Rosaria's A4 does not share it). The description
                // quotes it as crit_rate.
                new ConditionBoolean({
                    name: 'mona_prophecy_of_oblivion',
                    serializeId: 2,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.mona_prophecy_of_oblivion',
                    description: 'talent_descr.mona_prophecy_of_oblivion',
                    hideCondition: [condWitchHomeworkOn],
                    condition: condWitchHomeworkOff,
                    stats: {
                        crit_rate_enemy: C4CritRate,
                    },
                    displayStats: {crit_rate: C4CritRate},
                }),
                new ConditionBoolean({
                    name: 'mona_prophecy_of_oblivion',
                    serializeId: 2,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.mona_prophecy_of_oblivion',
                    description: 'talent_descr.mona_prophecy_of_oblivion_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    stats: {
                        crit_rate_enemy: C4CritRate,
                    },
                    displayStats: {crit_rate: C4CritRate},
                }),
                // The C4 toggle assumes an Omen-affected target independently
                // of the Omen DMG bonus toggle. Hexerei receivers also gain CD.
                new Condition({
                    receivers: RECEIVERS.TEAM,
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'mona_prophecy_of_oblivion'}),
                        condWitchHomeworkOn,
                        new ConditionReceiver({
                            condition: new ConditionWitchHomework({}),
                        }),
                    ]),
                    stats: {crit_dmg: C4CritDmg},
                }),
            ]
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
                // C6: hit-level Charged DMG bonuses (the Hexerei variant's
                // extra charged multiplier vs Omen included). Damage
                // multipliers read the total and need nothing. (Game:
                // Avatar_Mona_Hexenzirkel_Constellation_6 damageExtra reads
                // FIGHT_PROP_CUR_ATTACK, total.)
                new ConditionStacks({
                    name: 'mona_rhetorics_of_calamitas',
                    serializeId: 3,
                    title: 'talent_name.mona_rhetorics_of_calamitas',
                    description: 'talent_descr.mona_rhetorics_of_calamitas',
                    hideCondition: [condWitchHomeworkOn],
                    condition: condWitchHomeworkOff,
                    maxStacks: 3,
                    stats: [
                        new StatTable('dmg_charged', [C6ChargedDmg]),
                    ],
                }),
                new ConditionStacks({
                    name: 'mona_rhetorics_of_calamitas',
                    serializeId: 3,
                    title: 'talent_name.mona_rhetorics_of_calamitas',
                    description: 'talent_descr.mona_rhetorics_of_calamitas_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    maxStacks: 3,
                    stats: [
                        new StatTable('dmg_charged', [C6ChargedDmg]),
                    ],
                }),
            ],
        },
    ]),
    retiredParty: [[10, 'checkbox'], [9, 'stacks'], [1, 'number'], [2, 'checkbox'], [3, 'checkbox'], [4, 'checkbox'], [6, 'checkbox'], [7, 'checkbox'], [5, 'checkbox']],
});
