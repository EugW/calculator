import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionEnemy } from "../../classes/Condition/Enemy";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamage } from "../../classes/Feature2/Damage";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";
import { CHANNELS } from "../../classes/PostEffect/Channels";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Emilie.s1_id,
        title: 'talent_name.emilie_shadow_hunting_spear_custom',
        description: 'talent_descr.emilie_shadow_hunting_spear_custom',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Emilie.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Emilie.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Emilie.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Emilie.s1.p4),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Emilie.s1.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Emilie.s1.p6),
            },
            {
                table: new StatTable('plunge', charTalentTables.Emilie.s1.p7),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Emilie.s1.p8),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Emilie.s1.p9),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Emilie.s2_id,
        title: 'talent_name.emilie_fragrance_extraction',
        description: 'talent_descr.emilie_fragrance_extraction',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.Emilie.s2.p1),
            },
            {
                table: new StatTable('emilie_lumidouce_case_1_dmg', charTalentTables.Emilie.s2.p2),
            },
            {
                type: 'multihit',
                hits: 2,
                table: new StatTable('emilie_lumidouce_case_2_dmg', charTalentTables.Emilie.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('emilie_lumidouce_case_duration', charTalentTables.Emilie.s2.p4),
            },
            {
                table: new StatTable('spiritbreath_thorn_dmg', charTalentTables.Emilie.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('spiritbreath_thorn_interval', charTalentTables.Emilie.s2.p6),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Emilie.s2.p7),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Emilie.s3_id,
        title: 'talent_name.emilie_aromatic_explication',
        description: 'talent_descr.emilie_aromatic_explication',
        items: [
            {
                table: new StatTable('emilie_lumidouce_case_3_dmg', charTalentTables.Emilie.s3.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('emilie_lumidouce_case_3_duration', charTalentTables.Emilie.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Emilie.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Emilie.s3.p4),
            },
        ],
    },
});

const TalentValues = {
    A1Dmg: percent(charTalentTables.Emilie.a1.p1),
    A4DamageBonus: percent(charTalentTables.Emilie.a4.p1),
    A4DamageBonusMax: percent(charTalentTables.Emilie.a4.p2),
    PassiveBurningRes: percent(charTalentTables.Emilie.a0.p1),
    C1SkillBonus: percent(charTalentTables.Emilie.c1.p2),
    C2DendroRes: -percent(charTalentTables.Emilie.c2.p1),
    C6DamageBonus: percent(charTalentTables.Emilie.c6.p3),
};

// A4 Rectification: +15% DMG per 1000 ATK vs Burning opponents, cap 36%.
// Game data: Avatar_Emilie_PermanentSkill_2
// (Avatar_Emilie_PermanentSkill_2_Attack_Handler onThinkInterval
// SetOverrideMapValue [FIGHT_PROP_CUR_ATTACK x Ratio x 0.001, max MaxRatio]
// into Emilie_PermanentSkill_2_Ratio; ProudSkill Emilie_PermanentSkill_2 =
// [0.15, 0.36]) reads FIGHT_PROP_CUR_ATTACK (total). GO reads
// input.total.atk into all_dmg_. Writes dmg_all, which has no extra lane,
// so no writes param is needed. KQM Emilie page has no ATK-interaction test.
// Game text ("increased DMG to Burning opponents") and GO's all_dmg_ agree
// the generic dmg_all target is right.
const atkBuffPost = new PostEffectStatsAtk({
    reads: CHANNELS.TOTAL,
    percent: new StatTable('dmg_all', [TalentValues.A4DamageBonus / 1000]),
    statCap: new ValueTable([TalentValues.A4DamageBonusMax]),
    conditions: [
        new ConditionEnemy({condition: new ConditionBoolean({name: 'enemy_burning'})}),
        new ConditionAscensionChar({ascension: 4}),
    ],
});

export const Emilie = new DbObjectChar({
    name: 'emilie',
    serializeId: 89,
    gameId: 10000099,
    iconClass: 'char-icon-emilie',
    rarity: 5,
    element: 'dendro',
    weapon: 'polearm',
    origin: 'fontaine',
    talents: Talents,
    statTable: charTables.Emilie,
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
        new FeatureDamageCharged({
            name: 'charged_hit',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
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
            element: 'dendro',
            damageBonuses: ['dmg_skill_emilie'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'emilie_lumidouce_case_1_dmg',
            element: 'dendro',
            damageBonuses: ['dmg_skill_emilie'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.emilie_lumidouce_case_1_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'emilie_lumidouce_case_2_dmg',
            element: 'dendro',
            damageBonuses: ['dmg_skill_emilie'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.emilie_lumidouce_case_2_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'spiritbreath_thorn_dmg',
            element: 'dendro',
            damageBonuses: ['dmg_skill_emilie'],
            cannotReact: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.spiritbreath_thorn_dmg'),
                }),
            ],
        }),
        // A1 Lingering Fragrance: Cleardew Cologne, 600% of ATK. Game data:
        // Avatar_Emilie_Talent1 (ModifyDamageMixin damagePercentageRatio =
        // Ratio; ProudSkill Emilie_PermanentSkill_1 = [6]) sets a 600%
        // damage ratio with no stat read; the ATK scaling is the damage
        // formula itself. GO reads input.total.atk. Damage hits read the
        // total and need nothing.
        new FeatureDamage({
            name: 'emilie_cleardew_cologne_dmg',
            category: 'skill',
            element: 'dendro',
            damageBonuses: ['dmg_skill_emilie'],
            multipliers: [
                new FeatureMultiplier({
                    source: 'ascension1',
                    values: new ValueTable([TalentValues.A1Dmg]),
                }),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new FeatureDamageBurst({
            name: 'emilie_lumidouce_case_3_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.emilie_lumidouce_case_3_dmg'),
                }),
            ],
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'emilie_dmg_bonus',
            postEffect: atkBuffPost,
            format: 'percent',
        }),

    ],
    conditions: [
        new ConditionStatic({
            title: 'talent_name.emilie_lingering_fragrance',
            description: 'talent_descr.emilie_lingering_fragrance',
            info: {ascension: 1},
            stats: {
                text_percent_dmg: TalentValues.A1Dmg,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.emilie_rectification',
            description: 'talent_descr.emilie_rectification',
            info: {ascension: 4},
            stats: {
                text_percent_dmg: TalentValues.A4DamageBonus,
                text_percent_max: TalentValues.A4DamageBonusMax,
            },
            subConditions: [
                new ConditionEnemy({condition: new ConditionBoolean({name: 'enemy_burning'})}),
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.emilie_headspace_capture',
            description: 'talent_descr.emilie_headspace_capture',
            stats: {
                text_percent_res: TalentValues.PassiveBurningRes,
            },
        }),
    ],
    // C6 Marcotte Sillage: Normal/Charged hits deal +300% of ATK as Dendro.
    // Game data: Avatar_Emilie_Talent6 (ModifyDamageMixin damageExtra
    // [FIGHT_PROP_CUR_ATTACK x Talent6Ratio]; AvatarTalent Emilie_Constellation_6
    // paramList [5, 4, 3, 12], dmg = 3) reads FIGHT_PROP_CUR_ATTACK (total).
    // GO reads input.total.atk. Damage flat bonuses read the total by
    // construction (FeatureMultiplier scaling atk*), so no params are needed.
    // KQM Emilie page has no ATK-interaction test.
    multipliers: [
        new FeatureMultiplier({
            scaling: 'atk*',
            source: 'constellation6',
            values: new ValueTable([TalentValues.C6DamageBonus]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'emilie_marcotte_sillage'}),
                new ConditionConstellation({constellation: 6}),
            ]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal', 'charged'],
            }),
        }),
    ],
    postEffects: [atkBuffPost],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                // C1 Light Fragrance Leaching: +20% skill/Cologne DMG. Game
                // data: Avatar_Emilie_Talent1 (AvatarTalent
                // Emilie_Constellation_1 paramList [2.9, 0.2]) applies a flat
                // damage ratio with no stat read. Flat conditions (premod)
                // need nothing.
                new ConditionStatic({
                    title: 'talent_name.emilie_light_fragrance_leaching',
                    description: 'talent_descr.emilie_light_fragrance_leaching',
                    stats: {
                        dmg_skill_emilie: TalentValues.C1SkillBonus,
                    }
                }),
            ],
        },
        {
            conditions: [
                // C2 Lakelight Top Note: -30% Dendro RES. Game data:
                // Avatar_Emilie_Talent2
                // (UNIQUE_Avatar_Emilie_Talent2_GrassDown properties
                // Actor_GrassSubHurtDelta; AvatarTalent Emilie_Constellation_2
                // paramList [0.3, 10]) writes enemy RES with no stat read.
                // No channel applies.
                new ConditionBoolean({
                    name: 'emilie_lakelight_top_note',
                    serializeId: 1,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.emilie_lakelight_top_note',
                    description: 'talent_descr.emilie_lakelight_top_note',
                    stats: {
                        enemy_res_dendro: TalentValues.C2DendroRes,
                    }
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
                    title: 'talent_name.emilie_lumidouce_heart_note',
                    description: 'talent_descr.emilie_lumidouce_heart_note',
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
                    name: 'emilie_marcotte_sillage',
                    serializeId: 2,
                    title: 'talent_name.emilie_marcotte_sillage',
                    description: 'talent_descr.emilie_marcotte_sillage',
                    settings: {
                        attack_infusion: 'dendro',
                    },
                    stats: {
                        text_percent_dmg: TalentValues.C6DamageBonus,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'checkbox']],
});
