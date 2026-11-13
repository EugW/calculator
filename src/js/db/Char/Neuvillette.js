import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionStaticLevel } from "../../classes/Condition/Static/Level";
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
import { FeatureMultiplierNeuvilleteCharged } from "../../classes/Feature2/Multiplier/NeuvilleteCharged";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsNeuvillette } from "../../classes/PostEffect/Stats/Neuvillette";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { CHARACTER_MAX_POSSIBLE_HP } from "../Constants";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent, plus, times } from "../Params";


const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Neuvillette.s1_id,
        title: 'talent_name.neuvillette_as_water_seeks_equilibrium',
        description: 'talent_descr.neuvillette_as_water_seeks_equilibrium',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Neuvillette.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Neuvillette.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Neuvillette.s1.p3),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Neuvillette.s1.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Neuvillette.s1.p6),
            },
            {
                unit: 'hp',
                table: new StatTable('neuvillette_equitable_judgment_dmg', charTalentTables.Neuvillette.s1.p5),
            },
            {
                unit: 'hp_per_droplet',
                table: new StatTable('neuvillette_hp_restored', charTalentTables.Neuvillette.s1.p5),
            },
            {
                type: 'multivalue',
                separator: '/',
                units: [
                    'hp',
                    'sec',
                ],
                table: [
                    new StatTable('neuvillette_hp_loss', charTalentTables.Neuvillette.s1.p8),
                    new StatTable('neuvillette_hp_loss_interval', charTalentTables.Neuvillette.s1.p9),
                ],
            },
            {
                table: new StatTable('plunge', charTalentTables.Neuvillette.s1.p11),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Neuvillette.s1.p12),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Neuvillette.s1.p13),

            },
        ],
    },
    skill: {
        gameId: charTalentTables.Neuvillette.s2_id,
        title: 'talent_name.neuvillette_o_tears_i_shall_repay',
        description: 'talent_descr.neuvillette_o_tears_i_shall_repay',
        items: [
            {
                unit: 'hp',
                table: new StatTable('skill_dmg', charTalentTables.Neuvillette.s2.p1),
            },
            {
                table: new StatTable('spiritbreath_thorn_dmg', charTalentTables.Neuvillette.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('spiritbreath_thorn_interval', charTalentTables.Neuvillette.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('sourcewater_droplet_duration', charTalentTables.Neuvillette.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Neuvillette.s2.p4),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Neuvillette.s3_id,
        title: 'talent_name.neuvillette_o_tides_i_have_returned',
        description: 'talent_descr.neuvillette_o_tides_i_have_returned',
        items: [
            {
                unit: 'hp',
                table: new StatTable('burst_dmg', charTalentTables.Neuvillette.s3.p1),
            },
            {
                unit: 'hp',
                table: new StatTable('neuvillette_waterfall_dmg', charTalentTables.Neuvillette.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Neuvillette.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Neuvillette.s3.p4),
            },
        ],
    },
});

const A4HydroBonus = charTalentTables.Neuvillette.a4.p3;
const A4HydroBonusCap = percent(times(plus(charTalentTables.Neuvillette.a4.p2, times(charTalentTables.Neuvillette.a4.p1, -1)), charTalentTables.Neuvillette.a4.p3));
const A4HpThreshold = percent(charTalentTables.Neuvillette.a4.p1);
const C2CritDmg = percent(charTalentTables.Neuvillette.c2.p1);
const C6Dmg = percent(charTalentTables.Neuvillette.c6.p1);

export const Neuvillette = new DbObjectChar({
    name: 'neuvillette',
    serializeId: 77,
    gameId: 10000087,
    iconClass: 'char-icon-neuvillette',
    rarity: 5,
    element: 'hydro',
    weapon: 'catalyst',
    origin: 'fontaine',
    talents: Talents,
    statTable: charTables.Neuvillette,
    // Talent hits (normal/charged/skill/burst, several scaling 'hp*') read
    // the total by construction (FeatureDamage* multipliers; the game resolves
    // them from Max HP at hit time with no FIGHT_PROP read in ExtraAttack /
    // ElementalArt / ElementalBurst) and need nothing. A1 (Past Draconic
    // Glories, Avatar_Neuvillette_PermanentSkill_1) only sets the
    // _ABILITY_Neuvillette_Buff_Level / reaction counters (no Actor_* or
    // FIGHT_PROP in the ability); the stack multiplier below reads no stat.
    // GO models the hits from input.total.hp. The C6 extra current below is
    // the same kind of hit (Talent Neuvillette_Constellation_6 10% Max HP).
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
        new FeatureDamageCharged({
            name: 'neuvillette_equitable_judgment_dmg',
            element: 'hydro',
            critDamageBonuses: ['crit_dmg_neuvillette'],
            multipliers: [
                new FeatureMultiplierNeuvilleteCharged({
                    scaling: 'hp*',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.neuvillette_equitable_judgment_dmg'),
                    scalingSource: 'ascension1',
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'neuvillette_equitable_judgment_current_dmg',
            element: 'hydro',
            critDamageBonuses: ['crit_dmg_neuvillette'],
            multipliers: [
                new FeatureMultiplierNeuvilleteCharged({
                    scaling: 'hp*',
                    leveling: 'char_skill_attack',
                    source: 'constellation6',
                    scalingSource: 'ascension1',
                    values: new ValueTable([C6Dmg]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
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
            name: 'skill_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'spiritbreath_thorn_dmg',
            element: 'hydro',
            cannotReact: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.spiritbreath_thorn_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'neuvillette_waterfall_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.neuvillette_waterfall_dmg'),
                }),
            ],
        }),
    ],
    // A1 stacks are a reaction counter (no stat read; game:
    // Avatar_Neuvillette_PermanentSkill_1 has no Actor_*/FIGHT_PROP) and the
    // A4 number input is a current-HP counter stored as a stat by
    // ConditionNumber. Conditions are always premod, right for flat counters.
    conditions: [
        new ConditionStacks({
            name: 'neuvillette_ancient_seas_legacy',
            serializeId: 1,
            title: 'talent_name.neuvillette_heir_to_the_ancient_seas_authority',
            description: 'talent_descr.neuvillette_heir_to_the_ancient_seas_authority',
            maxStacks: 3,
            stats: [
                new StatTable('text_percent_dmg_1', [110]),
                new StatTable('text_percent_dmg_2', [125]),
                new StatTable('text_percent_dmg_3', [160]),
            ],
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionNumber({
            name: 'neuvillette_the_high_arbitrators_discipline',
            serializeId: 2,
            title: 'talent_name.neuvillette_discipline_of_the_supreme_arbitration',
            description: 'talent_descr.neuvillette_discipline_of_the_supreme_arbitration',
            max: CHARACTER_MAX_POSSIBLE_HP,
            class: "gi-inputs-5digit",
            stats: {
                text_percent_dmg: A4HydroBonus,
                text_percent_dmg_max: A4HydroBonusCap,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    postEffects: [
        // A4 Discipline of the Supreme Arbitration: Hydro DMG from the
        // current-HP ratio. Game data:
        // Avatar_Neuvillette_PermanentSkill_2_Calculator sets
        // _ABILITY_Neuvillette_PermanentSkill_Hp from FIGHT_PROP_CUR_HP /
        // FIGHT_PROP_MAX_HP (total markers) into HpMinus_Eff, and
        // Avatar_Neuvillette_PermanentSkill_2_Buff writes
        // Actor_WaterAddHurtExtraDelta (extra, the default write; GO's
        // premod: hydro_dmg_ is its guess). KQM Neuvillette has no
        // EM/ATK/HP/ER buff-chain test. An explicit total read is evidence
        // even though no ability writes extra HP today.
        new PostEffectStatsNeuvillette({
            from: 'neuvillette_the_high_arbitrators_discipline',
            reads: CHANNELS.TOTAL,
            percent: new StatTable('dmg_hydro', [A4HydroBonus]),
            exceed: A4HpThreshold,
            statCap: new ValueTable([A4HydroBonusCap]),
            conditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                // C1: +1 A1 stack on field + interruption resistance (game:
                // Avatar_Neuvillette_Constellation_1_EndureUp writes flat
                // Actor_EndureDelta). Flat, always premod, needs nothing.
                new ConditionStatic({
                    title: 'talent_name.neuvillette_venerable_institution',
                    description: 'talent_descr.neuvillette_venerable_institution',
                }),
            ],
        },
        {
            conditions: [
                // C2: +14% CRIT DMG per A1 stack on Equitable Judgment (game:
                // Avatar_Neuvillette_Constellation_2_Handler ModifyDamageMixin
                // bonusCriticalHurt = Critical_Ratio x Critical_Layer, Talent
                // Neuvillette_Constellation_2 param 0.14; no stat read, no
                // Actor channel, hit-level like Furina's Fanfare bonus).
                // Flat per-stack toggle into the hit's critDamageBonuses.
                new ConditionStaticLevel({
                    title: 'talent_name.neuvillette_juridical_exhortation',
                    description: 'talent_descr.neuvillette_juridical_exhortation',
                    levelSetting: 'neuvillette_ancient_seas_legacy',
                    fromZero: true,
                    stats: [
                        new StatTable('text_percent', [C2CritDmg]),
                        new StatTable('text_percent_max', [times(C2CritDmg, 3)]),
                        new StatTable('crit_dmg_neuvillette', times(C2CritDmg, [0, 1, 2, 3])),
                    ],
                }),
            ],
        },
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_attack_bonus: 3,
                    },
                }),
            ],
        },
        {
            conditions: [
                // C4: Sourcewater Droplet on heal (game:
                // Avatar_Neuvillette_Constellation_4_Handler onHeal, Talent
                // Neuvillette_Constellation_4 param 4s CD). No stat read.
                new ConditionStatic({
                    title: 'talent_name.neuvillette_crown_of_commiseration',
                    description: 'talent_descr.neuvillette_crown_of_commiseration',
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
                // C6: extra currents (10% Max HP hit above, total by
                // construction) + HealHP amountByTargetMaxHPRatio (game:
                // Avatar_Neuvillette_Constellation_6_Absorb; heals scale like
                // hits and need nothing; not modeled here).
                new ConditionStatic({
                    title: 'talent_name.neuvillette_wrathful_recompense',
                    description: 'talent_descr.neuvillette_wrathful_recompense',
                    stats: {
                        text_percent_dmg: C6Dmg,
                    },
                }),
            ],
        },
    ]),
});
