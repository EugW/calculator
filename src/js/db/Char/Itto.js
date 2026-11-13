import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { PostEffectStatsDef } from "../../classes/PostEffect/Stats/Def";
import { PostEffectStatsHP } from "../../classes/PostEffect/Stats/HP";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Itto.s1_id,
        title: 'talent_name.arataki_itto_fight_club_legend',
        description: 'talent_descr.arataki_itto_fight_club_legend',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Itto.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Itto.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Itto.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Itto.s1.p4),
            },
            {
                table: new StatTable('itto_kesagiri_combo_slash_dmg', charTalentTables.Itto.s1.p6),
            },
            {
                table: new StatTable('itto_kesagiri_final_slash_dmg', charTalentTables.Itto.s1.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('itto_duration_strength', charTalentTables.Itto.s1.p12),
            },
            {
                table: new StatTable('itto_saichimonji_slash_dmg', charTalentTables.Itto.s1.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('itto_stamina_cost', charTalentTables.Itto.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Itto.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Itto.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Itto.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Itto.s2_id,
        title: 'talent_name.arataki_itto_akaushi_burst',
        description: 'talent_descr.arataki_itto_akaushi_burst',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.Itto.s2.p1),
            },
            {
                table: new StatTable('itto_hurls_ushi_hp', charTalentTables.Itto.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Itto.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Itto.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Itto.s3_id,
        title: 'talent_name.arataki_itto_behold_itto_the_evil',
        description: 'talent_descr.arataki_itto_behold_itto_the_evil',
        items: [
            {
                unit: 'def',
                table: new StatTable('itto_atk_bonus', charTalentTables.Itto.s3.p2),
            },
            {
                table: new StatTable('itto_atk_speed_bonus', charTalentTables.Itto.s3.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Itto.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Itto.s3.p5),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Itto.s3.p6),
            },
        ],
    },
});

const TalentValues = {
    BurstAtkSpeed: 10,
    BurstResistance: -20,
    A1AtkSpeed: 10,
    A1AtkSpeedCap: 30,
    A4ChargedDefBonus: percent(charTalentTables.Itto.a4.p1),
    C4AtkPercent: percent(charTalentTables.Itto.c4.p2),
    C4DefPercent: percent(charTalentTables.Itto.c4.p1),
    C6CritDmg: percent(charTalentTables.Itto.c6.p1),
};

// Burst: DEF -> ATK for Itto himself while Raging Oni King lasts.
// Game data: Avatar_Itto_ElementalBurst UNIQUE_Avatar_Itto_ElementalBurst_Buff
// writes Actor_AttackExtraDelta from FIGHT_PROP_NONEXTRA_DEFENSE x
// Defence_Ratio (103.68% at burst 10), so the default premod read and extra
// write are confirmed. GO reads input.total.def (total); the game reads
// premod, and the same number either way while nothing writes extra DEF.
// KQM snapshots Husk/Whiteblind/Gorou flat DEF into the burst. Premod DEF
// writers (Columbina C2, Itto C4) count; see test/buffChainsItto.test.js and
// the Itto__with_Columbina correction in teamConversionCharsBatch5a.
const atkBuffPost = new PostEffectStatsDef({
    percent: Talents.getMulti({
        name: 'atk',
        from: 'burst.itto_atk_bonus',
        multi: 0.01,
    }),
    levelSetting: 'char_skill_burst',
    conditions: [
        new ConditionBoolean({name: 'itto_royal_descent'}),
    ],
});

export const Itto = new DbObjectChar({
    name: 'arataki_itto',
    serializeId: 46,
    gameId: 10000057,
    iconClass: "char-icon-arataki-itto",
    rarity: 5,
    element: 'geo',
    weapon: 'claymore',
    origin: 'inazuma',
    talents: Talents,
    statTable: charTables.Itto,
    // Every plain damage multiplier below scales on ATK and reads the total:
    // the game computes these hits from FIGHT_PROP_CUR_ATTACK. atk* is
    // already total, so no params. The A4 Kesagiri bonus (multipliers, not a
    // hit) is covered where it is declared.
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
            name: 'itto_kesagiri_combo_slash_dmg',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.itto_kesagiri_combo_slash_dmg'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'itto_kesagiri_final_slash_dmg',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.itto_kesagiri_final_slash_dmg'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'itto_saichimonji_slash_dmg',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.itto_saichimonji_slash_dmg'),
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
        // Ushi's inherited HP display (100% of Max HP at every skill level).
        // The game data names no premod/total read for it (the Oni Bull
        // gadget carries Actor_MaxHPRatio, engine-internal inheritance); GO
        // reads input.total.hp. Default kept; the same number either way
        // while nothing writes extra HP (md/buff_chains.md).
        new FeaturePostEffectValue({
            category: 'skill',
            name: 'itto_hurls_ushi_hp',
            postEffect: new PostEffectStatsHP({
                levelSetting: 'char_skill_elemental',
                percent: Talents.getMulti({
                    name: 'itto_hurls_ushi_hp',
                    from: 'skill.itto_hurls_ushi_hp',
                    multi: 0.01,
                }),
            }),
        }),
        new FeaturePostEffectValue({
            category: 'burst',
            name: 'atk_bonus',
            postEffect: atkBuffPost,
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'itto_royal_descent',
            serializeId: 1,
            title: 'talent_name.itto_royal_descent',
            description: 'talent_descr.itto_royal_descent',
            stats: {
                atk_speed_normal: TalentValues.BurstAtkSpeed,
                res_pyro: TalentValues.BurstResistance,
                res_electro: TalentValues.BurstResistance,
                res_hydro: TalentValues.BurstResistance,
                res_cryo: TalentValues.BurstResistance,
                res_anemo: TalentValues.BurstResistance,
                res_geo: TalentValues.BurstResistance,
                res_dendro: TalentValues.BurstResistance,
                res_phys: TalentValues.BurstResistance,
            },
            settings: {
                attack_infusion: 'geo',
            },
        }),
        new ConditionStacks({
            name: 'itto_arataki_ichiban',
            serializeId: 3,
            title: 'talent_name.arataki_itto_arataki_ichiban',
            description: 'talent_descr.arataki_itto_arataki_ichiban',
            maxStacks: 3,
            stats: [
                new StatTable('atk_speed_charged', [TalentValues.A1AtkSpeed]),
                new StatTable('text_percent_max', [TalentValues.A1AtkSpeedCap]),
            ],
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.arataki_itto_bloodline_of_the_crimson_oni',
            description: 'talent_descr.arataki_itto_bloodline_of_the_crimson_oni',
            stats: {
                text_percent: TalentValues.A4ChargedDefBonus,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    multipliers: [
        // A4 Bloodline of the Crimson Oni: Kesagiri damage +35% of DEF.
        // Game data: Avatar_Itto_PermanentSkill_2 Avatar_Itto_ExtraAttack_DamageUp
        // is a ModifyDamageMixin with damageExtra [FIGHT_PROP_CUR_DEFENSE
        // (total) x Defence_Ratio]. scaling: 'def*' already reads the total,
        // so no params. GO reads input.premod.def; the game reads total, and
        // the same number either way while nothing writes extra DEF.
        new FeatureMultiplier({
            scaling: 'def*',
            source: 'ascension4',
            values: new ValueTable([TalentValues.A4ChargedDefBonus]),
            condition: new ConditionAscensionChar({ascension: 4}),
            target: new FeatureMultiplierTarget({
                damageTypes: ['charged'],
            }),
        }),
    ],
    postEffects: [
        atkBuffPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.arataki_itto_stay_a_while_and_listen_up',
                    description: 'talent_descr.arataki_itto_stay_a_while_and_listen_up',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.arataki_itto_gather_round_its_a_brawl',
                    description: 'talent_descr.arataki_itto_gather_round_its_a_brawl',
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
                // When Raging Oni King ends: all nearby party members, Itto included.
                // Game data: Avatar_Itto_Constellation_4
                // UNIQUE_Itto_Constellation_4_DefAndAtkBuff writes
                // Actor_AttackRatio and Actor_DefenceRatio (both premod, no
                // Extra). Conditions write premod by construction: default
                // confirmed, no params.
                new ConditionBoolean({
                    name: 'itto_jailhouse_bread_and_butter',
                    serializeId: 2,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.arataki_itto_jailhouse_bread_and_butter',
                    description: 'talent_descr.arataki_itto_jailhouse_bread_and_butter',
                    stats: {
                        def_percent: TalentValues.C4DefPercent,
                        atk_percent: TalentValues.C4AtkPercent,
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
                // C6 flat +70% charged crit DMG (game: ModifyDamageMixin
                // bonusCriticalHurt in Avatar_Itto_Constellation_6, no stat
                // read): needs nothing.
                new ConditionStatic({
                    title: 'talent_name.arataki_itto_arataki_itto_present',
                    description: 'talent_descr.arataki_itto_arataki_itto_present',
                    stats: {
                        crit_dmg_charged: TalentValues.C6CritDmg,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'checkbox']],
});
