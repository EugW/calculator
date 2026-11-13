import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionCalcElements } from "../../classes/Condition/CalcElements";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { PostEffectStatsDef } from "../../classes/PostEffect/Stats/Def";
import { StatTable } from "../../classes/StatTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";
import { ConditionStaticYunJin } from "../../classes/Condition/Static/YunJin";
import { ValueTable } from "../../classes/ValueTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamageMultihit } from "../../classes/Feature2/Damage/Multihit";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureShield } from "../../classes/Feature2/Shield";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { CHANNELS } from "../../classes/PostEffect/Channels";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.YunJin.s1_id,
        title: 'talent_name.yun_jin_cloud_grazing_strike',
        description: 'talent_descr.yun_jin_cloud_grazing_strike',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.YunJin.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.YunJin.s1.p2),
            },
            {
                type: 'hits',
                name: 'normal_hit_3',
                table: [
                    new StatTable('normal_hit_3_1', charTalentTables.YunJin.s1.p3),
                    new StatTable('normal_hit_3_2', charTalentTables.YunJin.s1.p4),
                ],
            },
            {
                type: 'hits',
                name: 'normal_hit_4',
                table: [
                    new StatTable('normal_hit_4_1', charTalentTables.YunJin.s1.p5),
                    new StatTable('normal_hit_4_2', charTalentTables.YunJin.s1.p6),
                ],
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.YunJin.s1.p7),
            },


            {
                table: new StatTable('charged_hit', charTalentTables.YunJin.s1.p8),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.YunJin.s1.p9),
            },
            {
                table: new StatTable('plunge', charTalentTables.YunJin.s1.p10),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.YunJin.s1.p11),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.YunJin.s1.p12),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.YunJin.s2_id,
        title: 'talent_name.yun_jin_opening_flourish',
        description: 'talent_descr.yun_jin_opening_flourish',
        items: [
            {
                unit: 'def',
                table: new StatTable('press_dmg', charTalentTables.YunJin.s2.p3),
            },
            {
                unit: 'def',
                table: new StatTable('yunjin_charge_1_dmg', charTalentTables.YunJin.s2.p4),
            },
            {
                unit: 'def',
                table: new StatTable('yunjin_charge_2_dmg', charTalentTables.YunJin.s2.p5),
            },
            {
                type: 'shield',
                unit: 'hp',
                table: [
                    new StatTable('shield', charTalentTables.YunJin.s2.p1),
                    new StatTable('', charTalentTables.YunJin.s2.p2),
                ]
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.YunJin.s2.p6),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.YunJin.s3_id,
        title: 'talent_name.yun_jin_cliffbreakers_banner',
        description: 'talent_descr.yun_jin_cliffbreakers_banner',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.YunJin.s3.p1),
            },
            {
                unit: 'def',
                table: new StatTable('yunjin_dmg_bonus', charTalentTables.YunJin.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.YunJin.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('yunjin_quota', charTalentTables.YunJin.s3.p6),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.YunJin.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.YunJin.s3.p5),
            },
        ],
    },
});

const A4Bonus1 = percent(charTalentTables.YunJin.a4.p1);
const A4Bonus2 = percent(charTalentTables.YunJin.a4.p2);
const A4Bonus3 = percent(charTalentTables.YunJin.a4.p3);
const A4Bonus4 = percent(charTalentTables.YunJin.a4.p4);
const C2NormalDmg = percent(charTalentTables.YunJin.c2.p1);
const C4Def = percent(charTalentTables.YunJin.c4.p1);
const C6AtkSpeed = percent(charTalentTables.YunJin.c6.p1);

export const YunJin = new DbObjectChar({
    name: 'yun_jin',
    serializeId: 47,
    gameId: 10000064,
    iconClass: "char-icon-yun-jin",
    rarity: 4,
    element: 'geo',
    weapon: 'polearm',
    origin: 'liyue',
    talents: Talents,
    statTable: charTables.YunJin,
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
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_3',
            allowInfusion: true,
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_3_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_3_2'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3_2'),
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
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_4_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_4_2'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            isChild: true,
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            isChild: true,
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4_2'),
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
        // Opening Flourish hits: game sizes them with damageExtra on
        // FIGHT_PROP_CUR_DEFENSE (total) in Avatar_Yunjin_ElementalArt_Strike.
        // Damage hits read the total by construction (scaling 'def*'), so no
        // params.
        new FeatureDamageSkill({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.press_dmg'),
                }),
            ],
        }),
        // Charged hits: same FIGHT_PROP_CUR_DEFENSE (total) damageExtra as the
        // press hit; scaling 'def*' reads the total by construction.
        new FeatureDamageSkill({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.yunjin_charge_1_dmg'),
                }),
            ],
        }),
        // Level-2 charged hit: same total-DEF damageExtra; needs nothing.
        new FeatureDamageSkill({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.yunjin_charge_2_dmg'),
                }),
            ],
        }),
        // Opening Flourish shield: game builds it in an EliteShieldMixin from
        // Yunjin_ElementalArt_Shield_HPRatio/Base (no FIGHT_PROP read); scaling
        // 'hp*' reads the total by construction, so no params.
        new FeatureShield({
            category: 'skill',
            element: 'geo',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.shield'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeaturePostEffectValue({
            category: 'burst',
            name: 'yunjin_dmg_bonus',
            postEffect: new PostEffectStatsDef({
                // Flying Cloud Flag Formation display value: Normal Attack DMG
                // bonus from Yun Jin's DEF. Game data sizes it with damageExtra
                // on FIGHT_PROP_CUR_DEFENSE (total) x
                // Yunjin_ElementalBurst_Buff_ExtraDamage_DefRatio, plus the A4
                // term on the same FIGHT_PROP_CUR_DEFENSE (total) x
                // Yunjin_ElementalBurst_Buff_ExtraDamage_ElementNum, in
                // Avatar_Yunjin_ElementalBurst_Buff
                // (UNIQUE_Avatar_Yunjin_ElementalBurst_Buff,
                // ModifyDamageCountMixin), so the total read is declared. GO
                // reads input.premod.def for the same bonus; the game data is
                // explicit (CUR, not NONEXTRA), so it wins. No ability writes
                // extra DEF, so premod and total DEF agree today. KQM Yun Jin
                // has no premod/total interaction test (burst does not
                // snapshot: live DEF counts). The write is a talent DMG bonus
                // (no extra lane), so no writes param.
                reads: CHANNELS.TOTAL,
                percent: Talents.getMulti({
                    name: '',
                    from: 'burst.yunjin_dmg_bonus',
                    multi: 0.01,
                }),
                levelSetting: 'char_skill_burst',
                percentBonus: new StatTable('', [A4Bonus1 / 100, A4Bonus2 / 100, A4Bonus3 / 100, A4Bonus4 / 100]),
                percentBonusLevel: 'yunjin_traditionalist_stacks',
            }),
        }),
    ],
    multipliers: [
        // Cliffbreaker's Banner: Normal Attack DMG bonus for the team from
        // Yun Jin's DEF and burst level, plus Breaking Conventions by element
        // count.
        // Delivered flat bonus: the game computes it from FIGHT_PROP_CUR_DEFENSE
        // (total) in Avatar_Yunjin_ElementalBurst_Buff (see the display value
        // above). scaling 'def*' already reads the total, so no params; GO
        // reads input.premod.def for the same bonus (game data wins).
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'def*',
            leveling: 'char_skill_burst',
            source: 'talent_burst',
            values: Talents.get('burst.yunjin_dmg_bonus'),
            bonusLeveling: 'yunjin_traditionalist_stacks',
            bonusValues: new ValueTable([A4Bonus1, A4Bonus2, A4Bonus3, A4Bonus4]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal'],
            }),
            condition: new ConditionBoolean({name: 'yunjin_flag'}),
        }),
    ],
    conditions: [
        new ConditionCalcElements({}),
        new ConditionBoolean({
            name: 'yunjin_flag',
            serializeId: 1,
            title: 'talent_name.yunjin_flag',
            description: 'talent_descr.yunjin_flag',
        }),
        // A1 True to Oneself: charged-form timing on being hit; reads no stat.
        new ConditionStatic({
            title: 'talent_name.yun_jin_true_to_oneself',
            description: 'talent_descr.yun_jin_true_to_oneself',
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        // A4 Breaking Conventions: extra bonus by party element count (the
        // Yunjin_ElementalBurst_Buff_ExtraDamage_ElementNum term, still scaled
        // on FIGHT_PROP_CUR_DEFENSE above); reads no stat itself.
        new ConditionStaticYunJin({
            title: 'talent_name.yun_jin_breaking_conventions',
            description: 'talent_descr.yun_jin_breaking_conventions',
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                // C1 Thespian Gallop: -18% skill CD; C3/C5 raise talent levels.
                // None reads a stat.
                new ConditionStatic({
                    title: 'talent_name.yun_jin_thespian_gallop',
                    description: 'talent_descr.yun_jin_thespian_gallop',
                }),
            ],
        },
        {
            conditions: [
                // C2 Myriad Mise-En-Scene: flat 15% Normal Attack DMG for the
                // team. Game data sets Yunjin_Constellation_2_Buff_DamagePercentageRatio
                // (talent paramList [0.15, 12]) with no stat read
                // (UNIQUE_Avatar_Yunjin_Constellation_2_Buff, ModifyDamageMixin).
                // Flat toggles write premod by construction; needs nothing.
                new ConditionBoolean({
                    name: 'yunjin_myriad',
                    serializeId: 2,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.yun_jin_myriad_mise_en_scene',
                    description: 'talent_descr.yun_jin_myriad_mise_en_scene',
                    stats: {
                        dmg_normal: C2NormalDmg,
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
                // C4 Flower and a Fighter: +20% DEF for 12s on Crystallize.
                // Game data writes Actor_DefenceRatio (no "Extra", i.e. premod)
                // in UNIQUE_Yunjin_CrystallizeAddDef (talent paramList [0.2, 12]);
                // GO puts it under premod. Conditions are always premod, so no
                // params. KQM notes the DEF does not apply to the triggering hit.
                new ConditionBoolean({
                    name: 'yunjin_flower',
                    serializeId: 3,
                    title: 'talent_name.yun_jin_flower_and_a_fighter',
                    description: 'talent_descr.yun_jin_flower_and_a_fighter',
                    stats: {
                        def_percent: C4Def,
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
                // C6 Decorous Harmony: +12% Normal ATK SPD under the banner.
                // Game data writes Animator_AttackSpeedRatio (talent paramList
                // [0.12]) with no stat read; flat toggle, needs nothing.
                new ConditionStatic({
                    title: 'talent_name.yun_jin_decorous_harmony',
                    description: 'talent_descr.yun_jin_decorous_harmony',
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        atk_speed_normal: C6AtkSpeed,
                        text_percent: C6AtkSpeed,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'yunjin_flag'}),
                    ],
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'number'], [3, 'checkbox'], [4, 'checkbox'], [5, 'checkbox'], [6, 'checkbox'], [7, 'checkbox']],
});
