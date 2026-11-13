import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNumberShenhe } from "../../classes/Condition/Number/Shenhe";
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
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";
import { CHANNELS } from "../../classes/PostEffect/Channels";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Shenhe.s1_id,
        title: 'talent_name.shenhe_dawnstar_piercer',
        description: 'talent_descr.shenhe_dawnstar_piercer',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Shenhe.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Shenhe.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Shenhe.s1.p3),
            },
            {
                type: 'multihit',
                hits: 2,
                table: new StatTable('normal_hit_4', charTalentTables.Shenhe.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Shenhe.s1.p6),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Shenhe.s1.p7),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Shenhe.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Shenhe.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Shenhe.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Shenhe.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Shenhe.s2_id,
        title: 'talent_name.shenhe_spring_spirit_summoning',
        description: 'talent_descr.shenhe_spring_spirit_summoning',
        items: [
            {
                table: new StatTable('press_dmg', charTalentTables.Shenhe.s2.p1),
            },
            {
                table: new StatTable('hold_dmg', charTalentTables.Shenhe.s2.p2),
            },
            {
                table: new StatTable('shenhe_dmg_bonus', charTalentTables.Shenhe.s2.p3),
            },
            {
                type: 'separated',
                separator: ' / ',
                unit: 'sec',
                table: [
                    new StatTable('shenhe_duration', charTalentTables.Shenhe.s2.p4),
                    new StatTable('shenhe_duration', charTalentTables.Shenhe.s2.p5),
                ],
            },
            {
                type: 'separated',
                separator: ' / ',
                unit: '',
                table: [
                    new StatTable('shenhe_stacks', charTalentTables.Shenhe.s2.p6),
                    new StatTable('shenhe_stacks', charTalentTables.Shenhe.s2.p7),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('cd_press', charTalentTables.Shenhe.s2.p8),
            },
            {
                unit: 'sec',
                table: new StatTable('cd_hold', charTalentTables.Shenhe.s2.p9),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Shenhe.s3_id,
        title: 'talent_name.shenhe_divine_maidens_deliverance',
        description: 'talent_descr.shenhe_divine_maidens_deliverance',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Shenhe.s3.p1),
            },
            {
                table: new StatTable('shenhe_res_decrease', charTalentTables.Shenhe.s3.p2),
            },
            {
                table: new StatTable('dot_dmg', charTalentTables.Shenhe.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Shenhe.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Shenhe.s3.p5),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Shenhe.s3.p6),
            },
        ],
    },
});

const A1CryoDmg = percent(charTalentTables.Shenhe.a1.p1);
const A4PressDmg = percent(charTalentTables.Shenhe.a4.p1);
const A4HoldDmg = percent(charTalentTables.Shenhe.a4.p3);
const C4DmgBonus = percent(charTalentTables.Shenhe.c4.p1);
const C4MaxStacks = charTalentTables.Shenhe.c4.p2;

export const Shenhe = new DbObjectChar({
    name: 'shenhe',
    serializeId: 48,
    gameId: 10000063,
    iconClass: "char-icon-shenhe",
    rarity: 5,
    element: 'cryo',
    weapon: 'polearm',
    origin: 'liyue',
    talents: Talents,
    statTable: charTables.Shenhe,
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
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_4',
            allowInfusion: true,
            items: [
                {
                    hits: 2,
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_4'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4_1',
            isChild: true,
            hits: 2,
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
        new FeatureDamageSkill({
            element: 'cryo',
            damageBonuses: ['dmg_skill_shenhe'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.press_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'cryo',
            damageBonuses: ['dmg_skill_shenhe'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.hold_dmg'),
                }),
            ],
        }),
        new FeaturePostEffectValue({
            category: 'skill',
            name: 'shenhe_dmg_bonus',
            postEffect: new PostEffectStatsAtk({
                // Icy Quill display value: ATK x talent ratio. Game data:
                // Avatar_Shenhe_ElementalArt_Attack_L/H
                // (UNIQUE_Shenhe_ElementalArt_L/H_Buff and the C6 Talent_Buff
                // variants) size the bonus with damageExtra on
                // FIGHT_PROP_CUR_ATTACK (total) x Attack2ExtraRatio, so the
                // total read is declared. GO reads input.total.atk; KQM finds
                // quills dynamic (live ATK counts), with no premod/total test.
                reads: CHANNELS.TOTAL,
                levelSetting: 'char_skill_elemental',
                percent: Talents.getMulti({
                    name: '',
                    from: 'skill.shenhe_dmg_bonus',
                    multi: 0.01,
                }),
            }),
        }),
        new FeatureDamageBurst({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.dot_dmg'),
                }),
            ],
        }),
    ],
    multipliers: [
        // Icy Quill: all nearby party members. The delivered flat DMG bonus
        // reads Shenhe's total ATK: game data sizes it with damageExtra on
        // FIGHT_PROP_CUR_ATTACK (total) x Attack2ExtraRatio in
        // Avatar_Shenhe_ElementalArt_Attack_L/H (UNIQUE_Shenhe_ElementalArt_L/H_Buff
        // and the C6 Talent_Buff variants). The default 'atk*' scaling already
        // reads the total, so no params; GO reads input.total.atk. The write
        // is flat base DMG (no attribute, no extra lane). KQM: quills are
        // dynamic, with no premod/total interaction test.
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            leveling: 'char_skill_elemental',
            source: 'talent_elemental',
            values: Talents.get('skill.shenhe_dmg_bonus'),
            condition: new ConditionBoolean({name: 'shenhe_icy_quill'}),
            target: new FeatureMultiplierTarget({
                damageElements: ['cryo'],
                damageTypes: ['normal', 'charged', 'plunge', 'skill', 'burst'],
            }),
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                char_skill_burst_bonus: 3,
            },
            subConditions: [
                new ConditionConstellation({constellation: 5}),
            ],
        }),
        new ConditionBoolean({
            name: 'shenhe_icy_quill',
            serializeId: 1,
            title: 'talent_name.shenhe_icy_quill',
            description: 'talent_descr.shenhe_icy_quill',
        }),
        new ConditionBoolean({
            name: 'shenhe_spirit_field',
            serializeId: 3,
            title: 'talent_name.shenhe_spirit_field',
        }),
        new ConditionBooleanLevels({
            name: 'shenhe_talisman_spirit',
            serializeId: 2,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.shenhe_divine_maidens_deliverance',
            description: 'talent_descr.shenhe_talisman_spirit',
            levelSetting: 'char_skill_burst',
            stats: [
                Talents.getMulti({
                    name: 'enemy_res_phys',
                    from: 'burst.shenhe_res_decrease',
                    multi: -1,
                }),
                Talents.getMulti({
                    name: 'enemy_res_cryo',
                    from: 'burst.shenhe_res_decrease',
                    multi: -1,
                }),
            ],
        }),
        new ConditionStatic({
            name: 'shenhe_deific_embrace',
            serializeId: 4,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.shenhe_deific_embrace',
            description: 'talent_descr.shenhe_deific_embrace',
            stats: {
                dmg_cryo: A1CryoDmg,
            },
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
                new ConditionBoolean({name: 'shenhe_spirit_field'}),
            ],
        }),
        new ConditionBoolean({
            name: 'shenhe_spirit_seal_press',
            serializeId: 5,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.shenhe_spirit_seal_press',
            description: 'talent_descr.shenhe_spirit_communion_seal_1',
            stats: {
                dmg_skill: A4PressDmg,
                dmg_burst: A4PressDmg,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        new ConditionBoolean({
            name: 'shenhe_spirit_seal_hold',
            serializeId: 6,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.shenhe_spirit_seal_hold',
            description: 'talent_descr.shenhe_spirit_communion_seal_2',
            stats: {
                dmg_normal: A4HoldDmg,
                dmg_charged: A4HoldDmg,
                dmg_plunge: A4HoldDmg,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.shenhe_clarity_of_heart',
                    description: 'talent_descr.shenhe_clarity_of_heart',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.shenhe_centered_spirit',
                    description: 'talent_descr.shenhe_centered_spirit',
                    stats: {
                        crit_dmg_cryo: 15,
                    },
                    subConditions: [
                        new ConditionBoolean({
                            name: 'shenhe_spirit_field',
                        }),
                    ],
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
                new ConditionNumberShenhe({
                    name: 'shenhe_skyfrost_mantra',
                    serializeId: 7,
                    title: 'talent_name.shenhe_insight',
                    description: 'talent_descr.shenhe_insight',
                    max: C4MaxStacks,
                    stats: {
                        text_percent_dmg: C4DmgBonus,
                    },
                }),
            ],
        },
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.shenhe_mystical_abandon',
                    description: 'talent_descr.shenhe_mystical_abandon',
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'number'], [3, 'number'], [4, 'checkbox'], [5, 'checkbox'], [6, 'checkbox'], [7, 'checkbox'], [8, 'checkbox'], [9, 'checkbox'], [10, 'checkbox'], [11, 'checkbox'], [12, 'checkbox']],
});
