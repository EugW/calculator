import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
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
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Rosaria.s1_id,
        title: 'talent_name.rosaria_spear_of_the_church',
        description: 'talent_descr.rosaria_spear_of_the_church',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Rosaria.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Rosaria.s1.p2),
            },
            {
                type: 'multihit',
                hits: 2,
                table: new StatTable('normal_hit_3', charTalentTables.Rosaria.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Rosaria.s1.p4),
            },
            {
                type: 'hits',
                name: 'normal_hit_5',
                table: [
                    new StatTable('normal_hit_5_1', charTalentTables.Rosaria.s1.p5),
                    new StatTable('normal_hit_5_2', charTalentTables.Rosaria.s1.p6),
                ],
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Rosaria.s1.p7),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Rosaria.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Rosaria.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Rosaria.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Rosaria.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Rosaria.s2_id,
        title: 'talent_name.rosaria_ravaging_confession',
        description: 'talent_descr.rosaria_ravaging_confession',
        items: [
            {
                type: 'hits',
                name: 'skill_dmg',
                table: [
                    new StatTable('rosaria_stab_dmg', charTalentTables.Rosaria.s2.p1),
                    new StatTable('rosaria_slash_dmg', charTalentTables.Rosaria.s2.p2),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Rosaria.s2.p3),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Rosaria.s3_id,
        title: 'talent_name.rosaria_rites_of_termination',
        description: 'talent_descr.rosaria_rites_of_termination',
        items: [
            {
                type: 'hits',
                name: 'burst_dmg',
                table: [
                    new StatTable('rosaria_swing_dmg', charTalentTables.Rosaria.s3.p1),
                    new StatTable('rosaria_burst_lance_dmg', charTalentTables.Rosaria.s3.p2),
                ],
            },
            {
                table: new StatTable('rosaria_ice_lance', charTalentTables.Rosaria.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Rosaria.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Rosaria.s3.p5),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Rosaria.s3.p6),
            },
        ],
    },
});

const A1CritRate = percent(charTalentTables.Rosaria.a1.p1);
const A4CritRate = percent(charTalentTables.Rosaria.a4.p1);
const A4CritRateMax = percent(charTalentTables.Rosaria.a4.p3);
const C1AtkSpeed = percent(charTalentTables.Rosaria.c1.p1);
const C1NormalDmg = percent(charTalentTables.Rosaria.c1.p2);
const C6PhysRes = -percent(charTalentTables.Rosaria.c6.p1);

export const Rosaria = new DbObjectChar({
    name: 'rosaria',
    serializeId: 32,
    gameId: 10000045,
    iconClass: "char-icon-rosaria",
    rarity: 4,
    element: 'cryo',
    weapon: 'polearm',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Rosaria,
    // Talent damage hits read the total ATK like every talent hit and need
    // nothing: the game scales Rosaria's Normal/Charged/Plunge/Skill/Burst hits
    // from the final ATK (plain damage, no stat conversion). Her only stat
    // conversion is the A4 CRIT share below.
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
            name: 'normal_hit_4',
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
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_5_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_5_2'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5_1',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5_2',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5_2'),
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
        new FeatureDamageMultihit({
            name: 'skill_dmg',
            category: 'skill',
            damageType: 'skill',
            element: 'cryo',
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_elemental',
                            values: Talents.get('skill.rosaria_stab_dmg'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_elemental',
                            values: Talents.get('skill.rosaria_slash_dmg'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageSkill({
            name: 'rosaria_stab_dmg',
            element: 'cryo',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.rosaria_stab_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'rosaria_slash_dmg',
            element: 'cryo',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.rosaria_slash_dmg'),
                }),
            ],
        }),
        new FeatureDamageMultihit({
            name: 'burst_dmg',
            category: 'burst',
            damageType: 'burst',
            element: 'cryo',
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_burst',
                            values: Talents.get('burst.rosaria_swing_dmg'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_burst',
                            values: Talents.get('burst.rosaria_burst_lance_dmg'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageBurst({
            name: 'rosaria_swing_dmg',
            element: 'cryo',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.rosaria_swing_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'rosaria_burst_lance_dmg',
            element: 'cryo',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.rosaria_burst_lance_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'rosaria_ice_lance',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.rosaria_ice_lance'),
                }),
            ],
        }),
        // Display of the A4 share below (15% of Rosaria's CRIT Rate, cap 15):
        // follows its post-effect's channels, needs nothing.
        new FeaturePostEffectValue({
            category: 'burst',
            name: 'rosaria_crit_dmg_buff',
            postEffect: new PostEffectStats({
                from: 'crit_rate*',
                percent: new StatTable('crit_rate', [A4CritRate]),
                statCap: new ValueTable([A4CritRateMax]),
            }),
            format: 'percent',
        }),
    ],
    conditions: [
        // Regina Probationum (A1): flat +12% self CRIT Rate for 5s on a behind
        // strike. Game data: Avatar_Rosaria_ElementalArt (Extra_Critcal) writes
        // Actor_CriticalDelta (premod, no stat read; ProudSkill
        // Rosaria_PermanentSkill_1 = [0.12, 5]). Flat conditions write premod,
        // so the default is confirmed (no params); being premod, it counts for
        // the A4 premod read below (KQM: A1 included in A4 sharing). GO writes
        // it under premod.
        new ConditionBoolean({
            name: 'rosaria_regina_probationum',
            serializeId: 1,
            title: 'talent_name.rosaria_regina_probationum',
            description: 'talent_descr.rosaria_regina_probationum',
            stats: {
                crit_rate: A1CritRate,
            },
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        // Casting Rites of Termination increases CRIT Rate of all nearby
        // party members (except Rosaria herself).
        // The toggle itself writes only a display stat; the delivery is the
        // post-effect below.
        new ConditionBoolean({
            name: 'rosaria_shadow_samaritan',
            serializeId: 4,
            title: 'talent_name.rosaria_shadow_samaritan',
            description: 'talent_descr.rosaria_shadow_samaritan',
            stats: {
                text_percent: A4CritRate,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    postEffects: [
        // Shadow Samaritan (A4): 15% of Rosaria's CRIT Rate to others, cap 15.
        // Game data: Avatar_Rosaria_ElementalBurst_Strike_01 computes
        // _ABILITY_Rosaria_Talent_TeamCriticRate from
        // FIGHT_PROP_NONEXTRA_CRITICAL (premod) x TalentPercent and writes
        // Actor_CriticalExtraDelta (extra) via
        // UNIQUE_Rosaria_Talent_TeamCriticUp (ProudSkill Rosaria_PermanentSkill_2
        // = [0.15, 10, 0.15]), so the default premod read and extra write are
        // confirmed (no params). GO reads input.premod.critRate_ into
        // teamBuff.total.critRate_. KQM: her A1 flat CRIT is included, and the
        // share stacks with external flat CRIT (Hu Tao A1, Geo MC C1).
        new PostEffectStats({
            receivers: RECEIVERS.OTHERS,
            from: 'crit_rate*',
            percent: new StatTable('crit_rate', [A4CritRate]),
            statCap: new ValueTable([A4CritRateMax]),
            conditions: [
                new ConditionBoolean({name: 'rosaria_shadow_samaritan'}),
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                // Unholy Revelation (C1): flat +10% ATK SPD and +10% Normal
                // Attack DMG for 4s on a CRIT hit. Game data:
                // Avatar_Rosaria_Talent_CritEnhanceAtkSpeed
                // (UNIQUE_Rosaria_Talent_CritEnhanceAtkSpeed_Buff writes
                // Animator_AttackSpeedRatio plus a Normal-tag ModifyDamageMixin;
                // Rosaria_Constellation_1 = [0.1, 0.1, 4], no stat read). Flat
                // conditions (premod) need nothing.
                new ConditionBoolean({
                    name: 'rosaria_unholy_revelation',
                    serializeId: 2,
                    title: 'talent_name.rosaria_unholy_revelation',
                    description: 'talent_descr.rosaria_unholy_revelation',
                    stats: {
                        atk_speed_normal: C1AtkSpeed,
                        dmg_normal: C1NormalDmg,
                    },
                }),
            ],
        },
        {
            conditions: [
                // Land Without Promise (C2): +4s Ice Lance duration
                // (Rosaria_Constellation_2 = [4]). No stat read, needs nothing.
                new ConditionStatic({
                    title: 'talent_name.rosaria_land_without_promise',
                    description: 'talent_descr.rosaria_land_without_promise',
                }),
            ],
        },
        {
            conditions: [
                // The Wages of Sin (C3): +3 skill level. No stat read.
                new Condition({
                    settings: {
                        char_skill_elemental_bonus: 3,
                    },
                }),
            ],
        },
        {
            conditions: [
                // Painful Grace (C4): Ravaging Confession CRITs restore 5 energy
                // (once per cast; game: Talent_ReviveEnergy ReviveElemEnergy =
                // ReviveEnergy). Flat energy, no stat read, needs nothing.
                new ConditionStatic({
                    title: 'talent_name.rosaria_painful_grace',
                    description: 'talent_descr.rosaria_painful_grace',
                }),
            ],
        },
        {
            conditions: [
                // Last Rites (C5): +3 burst level. No stat read.
                new Condition({
                    settings: {
                        char_skill_burst_bonus: 3,
                    },
                }),
            ],
        },
        {
            conditions: [
                // Divine Retribution (C6): burst hits shred enemy Physical RES
                // 20% for 10s. Game data:
                // Avatar_Rosaria_Talent_ElementalBurst_PhyResistDown
                // (UNIQUE_Rosaria_Talent_ElementalBurst_PhyResistDown writes
                // Actor_PhysicalSubHurtDelta; Rosaria_Constellation_6 =
                // [0.2, 10], no stat read). Flat TEAM enemy debuff, needs
                // nothing.
                new ConditionBoolean({
                    name: 'rosaria_divine_retribution',
                    serializeId: 3,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.rosaria_divine_retribution',
                    description: 'talent_descr.rosaria_divine_retribution',
                    stats: {
                        enemy_res_phys: C6PhysRes,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox']],
});
