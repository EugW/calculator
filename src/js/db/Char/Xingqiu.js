import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
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
import { FeatureHeal } from "../../classes/Feature2/Heal";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Xingqiu.s1_id,
        title: 'talent_name.xingqiu_guhua_style',
        description: 'talent_descr.xingqiu_guhua_style',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Xingqiu.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Xingqiu.s1.p2),
            },
            {
                type: 'multihit_sum',
                hits: 2,
                table: new StatTable('normal_hit_3', charTalentTables.Xingqiu.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Xingqiu.s1.p5),
            },
            {
                type: 'multihit_sum',
                hits: 2,
                table: new StatTable('normal_hit_5', charTalentTables.Xingqiu.s1.p6),
            },
            {
                type: 'hits',
                name: 'charged_hit_total',
                table: [
                    new StatTable('charged_hit_1', charTalentTables.Xingqiu.s1.p8),
                    new StatTable('charged_hit_2', charTalentTables.Xingqiu.s1.p9),
                ],
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Xingqiu.s1.p10),
            },
            {
                table: new StatTable('plunge', charTalentTables.Xingqiu.s1.p11),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Xingqiu.s1.p12),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Xingqiu.s1.p13),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Xingqiu.s2_id,
        title: 'talent_name.xingqiu_fatal_rainscreen',
        description: 'talent_descr.xingqiu_fatal_rainscreen',
        items: [
            {
                type: 'hits',
                name: 'skill_dmg',
                table: [
                    new StatTable('xingqiu_skill_1_dmg', charTalentTables.Xingqiu.s2.p1),
                    new StatTable('xingqiu_skill_2_dmg', charTalentTables.Xingqiu.s2.p2),
                ],
            },
            {
                table: new StatTable('dmg_reduction', charTalentTables.Xingqiu.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Xingqiu.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Xingqiu.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Xingqiu.s3_id,
        title: 'talent_name.xingqiu_raincutter',
        description: 'talent_descr.xingqiu_raincutter',
        items: [
            {
                table: new StatTable('xingqiu_rain_sword', charTalentTables.Xingqiu.s3.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Xingqiu.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Xingqiu.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Xingqiu.s3.p4),
            },
        ],
    },
});

export const Xingqiu = new DbObjectChar({
    name: 'xingqiu',
    serializeId: 29,
    gameId: 10000025,
    iconClass: "char-icon-xingqiu",
    rarity: 4,
    element: 'hydro',
    weapon: 'sword',
    origin: 'liyue',
    talents: Talents,
    statTable: charTables.Xingqiu,
    // Talent hits (normal/charged/plunge, skill, burst) are plain ATK-scaled
    // damage with no FIGHT_PROP stat read: damage multipliers read the total
    // by construction and need nothing. GO uses dmgNode('atk', ...) for all
    // of them. C4's 1.5x is a scalingMultiplier on the skill hits, not a stat
    // input. KQM has no EM/ATK/HP/ER buff-chain test for his hits.
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
            name: 'normal_hit_3',
            category: 'attack',
            damageType: 'normal',
            allowInfusion: true,
            items: [
                {
                    hits: 2,
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_3'),
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
                    values: Talents.get('attack.normal_hit_3'),
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
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_5',
            allowInfusion: true,
            items: [
                {
                    hits: 2,
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_5'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5_1',
            isChild: true,
            hits: 2,
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
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_1'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_2'),
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
        new FeatureDamageMultihit({
            name: 'skill_dmg',
            element: 'hydro',
            category: 'skill',
            damageType: 'skill',
            allowInfusion: true,
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_elemental',
                            values: Talents.get('skill.xingqiu_skill_1_dmg'),
                            scalingSource: 'constellation4',
                            scalingMultiplier: 1.5,
                            scalingMultiplierCondition: new ConditionAnd([
                                new ConditionConstellation({constellation: 4}),
                                new ConditionBoolean({name: 'xingqiu_evilsoother'}),
                            ]),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_elemental',
                            values: Talents.get('skill.xingqiu_skill_2_dmg'),
                            scalingSource: 'constellation4',
                            scalingMultiplier: 1.5,
                            scalingMultiplierCondition: new ConditionAnd([
                                new ConditionConstellation({constellation: 4}),
                                new ConditionBoolean({name: 'xingqiu_evilsoother'}),
                            ]),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageSkill({
            element: 'hydro',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.xingqiu_skill_1_dmg'),
                    scalingSource: 'constellation4',
                    scalingMultiplier: 1.5,
                    scalingMultiplierCondition: new ConditionAnd([
                        new ConditionConstellation({constellation: 4}),
                        new ConditionBoolean({name: 'xingqiu_evilsoother'}),
                    ]),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'hydro',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.xingqiu_skill_2_dmg'),
                    scalingSource: 'constellation4',
                    scalingMultiplier: 1.5,
                    scalingMultiplierCondition: new ConditionAnd([
                        new ConditionConstellation({constellation: 4}),
                        new ConditionBoolean({name: 'xingqiu_evilsoother'}),
                    ]),
                }),
            ],
        }),
        // Rain-Sword damage reduction display: game data
        // (Avatar_Xingqiu_PhantomShield onAbilityStart) computes the
        // Hydro-derived part as FIGHT_PROP_NONEXTRA_WATER_ADD_HURT (premod)
        // x WaterAddHurt2SubHurtRatio (0.2), plus BaseSubHurtDelta (talent).
        // KQM: it does not count Kazuha's A4 (extra Hydro DMG). GO reads
        // input.premod.hydro_dmg_. Premod read: 'dmg_hydro~' (the default
        // reads is premod, so no params).
        new FeaturePostEffectValue({
            category: 'skill',
            name: 'dmg_reduction',
            format: 'percent',
            postEffect: new PostEffectStats({
                from: 'dmg_hydro~',
                percent: new StatTable('', [0.2]),
                levelSetting: 'char_skill_elemental',
                flatBonus: Talents.getMulti({
                    name: '',
                    from: 'skill.dmg_reduction',
                    multi: 0.01,
                }),
            }),
        }),
        // A1 Hydropathic heal: game data (UNIQUE_Xingqiu_PhantomShield_*
        // HealHP) restores amountByCasterMaxHPRatio HealOnShieldBreak (6% of
        // Max HP; engine-internal, no NONEXTRA/CUR marker). Talent heals read
        // the total, and GO prods input.total.hp: scaling 'hp*' already reads
        // the total by construction, no params. KQM has no buff-chain test
        // for it.
        new FeatureHeal({
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    source: 'ascension1',
                    values: new StatTable('xingqiu_hydropathic', [6]),
                }),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new FeatureDamageBurst({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.xingqiu_rain_sword'),
                }),
            ],
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                char_skill_elemental_bonus: 3,
            },
            subConditions: [
                new ConditionConstellation({constellation: 5}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.xingqiu_hydropathic',
            description: 'talent_descr.xingqiu_hydropathic',
            stats: {
                text_percent_hp: 6,
            },
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        // A4 Blades Amidst Raindrops: flat +20% Hydro DMG (game text). Flat
        // conditions are always premod: default confirmed, no params. GO
        // writes it under premod.
        new ConditionStatic({
            title: 'talent_name.xingqiu_blades_amidst_raindrops',
            description: 'talent_descr.xingqiu_blades_amidst_raindrops',
            stats: {
                dmg_hydro: 20,
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
                    title: 'talent_name.xingqiu_the_scent_remained',
                    description: 'talent_descr.xingqiu_the_scent_remained',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.xingqiu_rainbow_upon_the_azure_sky',
                    description: 'talent_descr.xingqiu_rainbow_upon_the_azure_sky_1',
                }),
                new ConditionBoolean({
                    name: 'xingqiu_rainbow_upon_the_azure_sky',
                    serializeId: 1,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.xingqiu_rainbow_upon_the_azure_sky',
                    description: 'talent_descr.xingqiu_rainbow_upon_the_azure_sky_2',
                    stats: {
                        enemy_res_hydro: -15,
                    },
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
                    name: 'xingqiu_evilsoother',
                    serializeId: 2,
                    title: 'talent_name.xingqiu_evilsoother',
                    description: 'talent_descr.xingqiu_evilsoother',
                    stats: {
                        text_percent: 50,
                    },
                }),
            ],
        },
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.xingqiu_hence_call_them_my_own_verses',
                    description: 'talent_descr.xingqiu_hence_call_them_my_own_verses',
                }),
            ],
        }
    ]),
    retiredParty: [[1, 'checkbox']],
});
