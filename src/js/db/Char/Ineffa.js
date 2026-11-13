import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
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
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureReactionLunarChargedLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/ChargedLike";
import { FeatureShield } from "../../classes/Feature2/Shield";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Ineffa.s1_id,
        title: 'talent_name.ineffa_cyclonic_duster',
        description: 'talent_descr.ineffa_cyclonic_duster',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Ineffa.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Ineffa.s1.p2),
            },
            {
                type: 'hits',
                name: 'normal_hit_3',
                table: [
                    new StatTable('normal_hit_3_1', charTalentTables.Ineffa.s1.p3),
                    new StatTable('normal_hit_3_2', charTalentTables.Ineffa.s1.p4),
                ],
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Ineffa.s1.p5),
            },
            {
                table:  new StatTable('charged_hit', charTalentTables.Ineffa.s1.p6),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Ineffa.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Ineffa.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Ineffa.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Ineffa.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Ineffa.s2_id,
        title: 'talent_name.ineffa_carrier_frequency',
        description: 'talent_descr.ineffa_carrier_frequency',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.Ineffa.s2.p1),
            },
            {
                type: 'shield',
                unit: 'atk',
                table: [
                    new StatTable('ineffa_base_shield_dmg_absorption', charTalentTables.Ineffa.s2.p2),
                    new StatTable('', charTalentTables.Ineffa.s2.p3),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('ineffa_shield_duration', charTalentTables.Ineffa.s2.p6),
            },
            {
                table: new StatTable('ineffa_birgitta_dmg', charTalentTables.Ineffa.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('ineffa_birgitta_duration', charTalentTables.Ineffa.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Ineffa.s2.p7),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Ineffa.s3_id,
        title: 'talent_name.ineffa_cyclonic_exterminator',
        description: 'talent_descr.ineffa_cyclonic_exterminator',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Ineffa.s3.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Ineffa.s3.p2),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Ineffa.s3.p3),
            },
        ],
    },
    links: [11160001],
});

const PassiveLunarScale = percent(charTalentTables.Ineffa.a0.p1);
const PassiveLunarScaleCap = percent(charTalentTables.Ineffa.a0.p2);
const A1Dmg = percent(charTalentTables.Ineffa.a1.p1);
const A4EmScale = percent(charTalentTables.Ineffa.a4.p1);
const C1AtkScale = percent(charTalentTables.Ineffa.c1.p1);
const C1AtkScaleCap = percent(charTalentTables.Ineffa.c1.p2);
const C2Dmg = percent(charTalentTables.Ineffa.c2.p1);
const C6Dmg = percent(charTalentTables.Ineffa.c6.p1);

const emBuffPost = new PostEffectStatsAtk({
    // A4 Panoramic Permutation, self copy: 6% of Ineffa's live ATK as EM.
    // Game data: Avatar_Ineffa_PermanentSkill_2 (Ineffa_P1_Self) reads
    // FIGHT_PROP_NONEXTRA_ATTACK (premod) into AttackCache and writes
    // Actor_ElemMasteryExtraDelta (extra), so the default premod read and
    // extra write are confirmed. GO reads input.premod.atk; KQM has no
    // premod/total interaction test for Ineffa. Premod ATK writers
    // (Columbina C2, Chevreuse A4) count; extra ATK (Bennett burst) does not.
    percent: new StatTable('mastery', [A4EmScale / 100]),
    condition: new ConditionBoolean({name: 'ineffa_panoramic_permutation_protocol'}),
});

// Panoramic Permutation also raises the active member's Mastery from the
// source's live ATK. Ineffa keeps her own copy above, so the delivery
// excludes the source and only reaches members while they are on-field.
// It carries its own ascension gate; the saved source toggle stays clean.
const emBuffPostActive = new PostEffectStatsAtk({
    // Same A4 effect for the active member: 6% of Ineffa's live ATK as EM.
    // Game data: the same Avatar_Ineffa_PermanentSkill_2 ability
    // (Ineffa_P1_Other, re-applied from FIGHT_PROP_NONEXTRA_ATTACK by
    // Ineffa_P1_Other_Father) into Actor_ElemMasteryExtraDelta, so the
    // default premod read and extra write are confirmed.
    receivers: RECEIVERS.OTHERS,
    percent: new StatTable('mastery', [A4EmScale / 100]),
    conditions: [
        new ConditionBoolean({name: 'ineffa_panoramic_permutation_protocol'}),
        new ConditionAscensionChar({ascension: 4}),
        new ConditionReceiver({
            condition: new ConditionOnField(),
        }),
    ],
});

const lunarPost = new PostEffectStatsAtk({
    // Moonsign Benediction Assemblage Hub: live ATK feeds the Lunar-Charged
    // base damage ratio (0.7% per 100 ATK, cap 14%). Game data:
    // Avatar_Ineffa_ElementalBurst sets it with
    // SetNewElementReactionBaseDamageRatioParam (AttackTransferRatio x 0.01
    // for MoonShock, Ineffa_PermanentSkill_3 in ConfigTalent_Ineffa), which
    // names no premod/total read. In-game test (md/buff_chains.md): at 938
    // ATK a Lunar-Charged tick did 4,037, and 4,319 in Bennett's burst
    // (x 1.14 / 1.0657): it reads the total ATK, as GO does.
    receivers: RECEIVERS.TEAM,
    reads: CHANNELS.TOTAL,
    percent: new StatTable('lunarcharged_multi', [PassiveLunarScale / 100]),
    statCap: new ValueTable([PassiveLunarScaleCap]),
});

const lunarPost2 = new PostEffectStatsAtk({
    // C1 Rectifying Processor: 2.5% of live ATK as Lunar-Charged DMG
    // (cap 50%). Game data: Avatar_Ineffa_ElementalArt
    // (UNIQUE_Ineffa_Talent_1_Real_Caster) reads FIGHT_PROP_NONEXTRA_ATTACK
    // (premod) into AttackCache and scales ReactionUpCache by TransferRatio
    // (0.025 at C1 through Ineffa_Constellation_1 in ConfigTalent_Ineffa,
    // capped by MaxReactionUp) into Actor_ElemReactMoonShockDelta, so the
    // default premod read is confirmed (the write target has no extra lane).
    // GO reads input.total.atk, a supporting guess only; the traced game
    // expression is preferred. KQM has no test.
    receivers: RECEIVERS.TEAM,
    percent: new StatTable('dmg_reaction_lunarcharged', [C1AtkScale / 100]),
    statCap: new ValueTable([C1AtkScaleCap]),
    condition: new ConditionAnd([
        new ConditionConstellation({constellation: 1}),
        new ConditionBoolean({name: 'ineffa_rectifying_processor'}),
    ]),
});

export const Ineffa = new DbObjectChar({
    name: 'ineffa',
    serializeId: 108,
    gameId: 10000116,
    iconClass: 'char-icon-ineffa',
    rarity: 5,
    element: 'electro',
    weapon: 'polearm',
    origin: 'nodkrai',
    talents: Talents,
    statTable: charTables.Ineffa,
    // Every 'atk*' scaling below reads the total ATK: the game sizes
    // Birgitta's Discharge (AttackRatioP1 x FIGHT_PROP_CUR_ATTACK in
    // Avatar_Ineffa_ElementalArt_Relay_MoveController), the skill shield
    // (MasteryCache x MasteryTranferRatio from FIGHT_PROP_CUR_ATTACK in
    // Avatar_Ineffa_ElementalArt), C2 (T2AttackRatio x FIGHT_PROP_CUR_ATTACK
    // in Avatar_Ineffa_Burst_T2_Attacker) and C6 (T6AttackRatio x
    // FIGHT_PROP_CUR_ATTACK in Ineffa_Talent_6) from total ATK
    // (GO: dmgNode('atk', ...)). atk* is already total, so no params.
    features: [
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
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_3',
            allowInfusion: true,
            items: [
                {
                    hits: 2,
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_3_1'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3_1',
            isChild: true,
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3_1'),
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
        new FeatureDamageSkill({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureShield({
            category: 'skill',
            element: 'electro',
            multipliers: [
                new FeatureMultiplierList({
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.ineffa_base_shield_dmg_absorption'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.ineffa_birgitta_dmg'),
                }),
            ],
        }),
        new FeatureReactionLunarChargedLike({
            element: 'electro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    source: 'ascension1',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: new StatTable('ineffa_birgitta_coordinated_dmg', [A1Dmg]),
                }),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new FeatureDamageBurst({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureReactionLunarChargedLike({
            element: 'electro',
            category: 'burst',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation2',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: new StatTable('ineffa_punishment_edict_dmg', [C2Dmg]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 2}),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'mastery_bonus',
            postEffect: emBuffPost,
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'ineffa_lunar_bonus',
            postEffect: lunarPost,
            format: 'percent',
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'ineffa_lunar_bonus_2',
            postEffect: lunarPost2,
            format: 'percent',
            condition: new ConditionConstellation({constellation: 1}),
        }),
        new FeatureReactionLunarChargedLike({
            element: 'electro',
            category: 'other',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation6',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: new StatTable('ineffa_carrier_flow_composite_dmg', [C6Dmg]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
    ],
    conditions: [
        // Ineffa unlocks Lunar-Charged for the whole team (merged with the
        // old partyData copy).
        new Condition({
            receivers: RECEIVERS.TEAM,
            settings: {
                allowed_lunarcharged: 1,
            },
        }),
        new ConditionStatic({
            title: 'talent_name.ineffa_overclocking_circuit',
            description: 'talent_descr.ineffa_overclocking_circuit',
            info: {ascension: 1},
            stats: {
                text_percent_dmg: A1Dmg,
            },
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionBoolean({
            name: 'ineffa_panoramic_permutation_protocol',
            serializeId: 1,
            title: 'talent_name.ineffa_panoramic_permutation_protocol',
            description: 'talent_descr.ineffa_panoramic_permutation_protocol',
            info: {ascension: 4},
            stats: {
                text_percent: A4EmScale,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionStatic({
            title: 'talent_name.ineffa_assemblage_hub',
            description: 'talent_descr.ineffa_assemblage_hub',
            stats: {
                text_percent: PassiveLunarScale,
                text_percent_max: PassiveLunarScaleCap,
            },
        }),
    ],
    postEffects: [
        emBuffPost,
        emBuffPostActive,
        lunarPost,
        lunarPost2,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'ineffa_rectifying_processor',
                    serializeId: 2,
                    title: 'talent_name.ineffa_rectifying_processor',
                    description: 'talent_descr.ineffa_rectifying_processor',
                    stats: {
                        text_percent: C1AtkScale,
                        text_percent_max: C1AtkScaleCap,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.ineffa_support_cleaning_module',
                    description: 'talent_descr.ineffa_support_cleaning_module',
                    stats: {
                        text_percent_dmg: C2Dmg,
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
                new ConditionStatic({
                    title: 'talent_name.ineffa_the_edictless_path',
                    description: 'talent_descr.ineffa_the_edictless_path',
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
                    title: 'talent_name.ineffa_a_dawning_morn_for_you',
                    description: 'talent_descr.ineffa_a_dawning_morn_for_you',
                    stats: {
                        text_percent_dmg: C6Dmg,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox']],
});
