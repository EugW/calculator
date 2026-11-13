import { Condition } from "../../classes/Condition";
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
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsHP } from "../../classes/PostEffect/Stats/HP";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Hutao.s1_id,
        title: 'talent_name.hu_tao_secret_spear_of_wangsheng',
        description: 'talent_descr.hu_tao_secret_spear_of_wangsheng',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Hutao.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Hutao.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Hutao.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Hutao.s1.p4),
            },
            {
                type: 'hits',
                name: 'normal_hit_5',
                table: [
                    new StatTable('normal_hit_5_1', charTalentTables.Hutao.s1.p5),
                    new StatTable('normal_hit_5_2', charTalentTables.Hutao.s1.p6),
                ],
            },
            {
                table: new StatTable('normal_hit_6', charTalentTables.Hutao.s1.p7),
            },

            {
                table: new StatTable('charged_hit', charTalentTables.Hutao.s1.p8),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Hutao.s1.p9),
            },
            {
                table: new StatTable('plunge', charTalentTables.Hutao.s1.p10),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Hutao.s1.p11),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Hutao.s1.p12),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Hutao.s2_id,
        title: 'talent_name.hu_tao_guide_to_afterlife',
        description: 'talent_descr.hu_tao_guide_to_afterlife',
        items: [
            {
                unit: 'current_hp',
                table: new StatTable('hutao_skill_cost', charTalentTables.Hutao.s2.p1),
            },
            {
                table: new StatTable('hutao_atk_bonus', charTalentTables.Hutao.s2.p2),
            },
            {
                table: new StatTable('hutao_blood_blossom', charTalentTables.Hutao.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('hutao_blossom_duration', charTalentTables.Hutao.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Hutao.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Hutao.s2.p6),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Hutao.s3_id,
        title: 'talent_name.hu_tao_spirit_soother',
        description: 'talent_descr.hu_tao_spirit_soother',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Hutao.s3.p1),
            },
            {
                table: new StatTable('hutao_burst_dmg_lowhp', charTalentTables.Hutao.s3.p2),
            },
            {
                unit: 'hp',
                table: new StatTable('heal', charTalentTables.Hutao.s3.p3),
            },
            {
                unit: 'hp',
                table: new StatTable('hutao_heal_lowhp', charTalentTables.Hutao.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Hutao.s3.p5),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Hutao.s3.p6),
            },
        ],
    },
});

const TalentValues = {
    SkillMaxBonus: 400,
    A1CritRate: percent(charTalentTables.Hutao.a1.p1),
    A4PyroDmg: percent(charTalentTables.Hutao.a4.p2),
    C2SkillHpBonus: percent(charTalentTables.Hutao.c2.p1),
    C4CritRate: percent(charTalentTables.Hutao.c4.p1),
    C6CritRate: percent(charTalentTables.Hutao.c6.p4),
    C6Resistance: percent(charTalentTables.Hutao.c6.p3),
};

const atkBuffPost = new PostEffectStatsHP({
    // Game data: Avatar_Hutao_CrimsonPlum onAbilityStart sets
    // _ABILITY_Hutao_CrimsonPlum_AttackDelta as [FIGHT_PROP_MAX_HP,
    // CrimsonPlum_MAXHP_To_AttackDelta_Factor, MUL] (total), capped by
    // [FIGHT_PROP_BASE_ATTACK, CrimsonPlum_MAX_AttackDelta_Factor, MUL]
    // (base); UNIQUE_Hutao_CrimsonPlum_Main_Handler writes
    // Actor_AttackExtraDelta (extra, default). FIGHT_PROP_MAX_HP is the
    // total marker (md/buff_chains.md), as for Baizhu/Candace/Chevreuse/
    // Columbina; same number as premod while no ability writes extra HP.
    // GO reads input.premod.hp here (supporting evidence only; the data
    // says total). KQM Hu Tao has no EM/ATK/HP/ER buff-chain test.
    reads: CHANNELS.TOTAL,
    percent: Talents.getMulti({
        name: 'atk',
        from: 'skill.hutao_atk_bonus',
        multi: 0.01,
    }),
    levelSetting: 'char_skill_elemental',
    conditions: [
        new ConditionBoolean({name: 'hutao_paramita_papilio'}),
    ],
    statCapPost: new PostEffectStats({
        // Cap reads FIGHT_PROP_BASE_ATTACK (base); from 'atk_base' needs
        // nothing.
        from: 'atk_base',
        percent: new StatTable('atk_percent', [TalentValues.SkillMaxBonus]),
    }),
});

export const Hutao = new DbObjectChar({
    name: 'hu_tao',
    serializeId: 11,
    gameId: 10000046,
    iconClass: "char-icon-hu-tao",
    rarity: 5,
    element: 'pyro',
    weapon: 'polearm',
    origin: 'liyue',
    talents: Talents,
    statTable: charTables.Hutao,
    // Talent hits (normal/charged/plunge/skill Blood Blossom/burst) read the
    // total by construction: the game uses plain damagePercentage with no
    // FIGHT_PROP read (Avatar_Hutao_CrimsonPlum, Avatar_Hutao_VermilionBite);
    // scaling 'atk*'/'hp*' in a FeatureMultiplier reads the total and needs
    // nothing. The burst heals (FeatureHeal scaling 'hp*') read the total by
    // construction; the game heals with HealHP amountByCasterMaxHPRatio
    // VermilionBite_HPRestore(/LowHP) in
    // UNIQUE_Hutao_VermilionBite_LifeRestore_Count. GO uses dmgNode('atk', ...)
    // and customHealNode(prod(input.total.hp, ...)) (total) for all of these.
    // KQM Hu Tao has no buff-chain test.
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
        new FeatureDamageMultihit({
            name: 'normal_hit_5',
            category: 'attack',
            damageType: 'normal',
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
        new FeatureDamageNormal({
            name: 'normal_hit_6',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_6'),
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
            name: 'hutao_blood_blossom',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.hutao_blood_blossom'),
                }),
            ],
        }),
        // Display of the skill ATK post-effect above; it follows that
        // post-effect's channels and needs nothing of its own.
        new FeaturePostEffectValue({
            category: 'skill',
            name: 'hutao_atk_bonus',
            postEffect: atkBuffPost,
        }),
        // Display of the cap point (HP at which 400% base ATK binds); the
        // post-effect reads atk_base only and needs nothing.
        new FeaturePostEffectValue({
            category: 'skill',
            name: 'hutao_max_hp_bonus',
            postEffect: new PostEffectStats({
                from: 'atk_base',
                levelSetting: 'char_skill_elemental',
                percent: Talents.getDivide({
                    name: 'hutao_max_hp_bonus',
                    from: 'skill.hutao_atk_bonus',
                    multi: TalentValues.SkillMaxBonus,
                }),
            }),
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'hutao_burst_dmg_lowhp',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.hutao_burst_dmg_lowhp'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'burst',
            name: 'heal',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.heal'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'burst',
            name: 'hutao_heal_lowhp',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.hutao_heal_lowhp'),
                }),
            ],
        }),
    ],
    postEffects: [
        atkBuffPost,
    ],
    // A1 (Flutter By) and A4 (Sanguine Rouge) are flat toggles: the game
    // writes Actor_CriticalDelta (UNIQUE_Hutao_CrimsonPlum_PermanentSkill_
    // CriticalUp, gated by Avatar_Hutao_PermanentSkill_1) and
    // Actor_FireAddHurtDelta (Hutao_PermanentSkill_2_FireAddHurtUp, gated by
    // the HP-ratio threshold Hutao_PermanentSkill_2_HPRatio) from flat
    // specials, with no stat read. Flat conditions are always premod and
    // need nothing.
    conditions: [
        new ConditionConstellation({
            constellation: 3,
            settings: {
                char_skill_elemental_bonus: 3,
            }
        }),
        new ConditionBoolean({
            name: 'hutao_paramita_papilio',
            serializeId: 1,
            title: 'talent_name.hutao_paramita_papilio',
            description: 'talent_descr.hutao_paramita_papilio',
            stats: {
                text_percent_hp: TalentValues.SkillMaxBonus,
            },
            settings: {
                attack_infusion: 'pyro',
            },
        }),
        new ConditionStatic({
            isHidden: true,
            title: 'talent_name.hu_tao_flutter_by',
            description: 'talent_descr.hu_tao_flutter_by',
            stats: {
                text_percent: TalentValues.A1CritRate,
            },
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        // When Paramita Papilio ends, all allies except Hu Tao gain CRIT.
        new ConditionBoolean({
            name: 'hu_tao_flutter_by',
            serializeId: 4,
            receivers: RECEIVERS.OTHERS,
            title: 'talent_name.hu_tao_flutter_by',
            description: 'talent_descr.hu_tao_flutter_by',
            stats: {
                text_percent: TalentValues.A1CritRate,
                crit_rate: TalentValues.A1CritRate,
            },
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionBoolean({
            name: 'hu_tao_sanguine_rouge',
            serializeId: 2,
            title: 'talent_name.hu_tao_sanguine_rouge',
            description: 'talent_descr.hu_tao_sanguine_rouge',
            stats: {
                dmg_pyro: TalentValues.A4PyroDmg,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    multipliers: [
        // C2 Ominous Rainfall: Blood Blossom DMG +10% Max HP. Game data:
        // UNIQUE_Hutao_CrimsonPlum_Debuff onThinkInterval attackProperty
        // damageExtra [FIGHT_PROP_MAX_HP,
        // CrimsonPlum_Debuff_Constellation_LifeBonus_Factor, MUL] (total;
        // Talent Hutao_Constellation_2 paramList [0.1]). A hit component with
        // scaling 'hp*' reads the total by construction and needs nothing.
        // GO computes prod(input.total.hp, ...) (total) for it.
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'constellation2',
            values: new ValueTable([TalentValues.C2SkillHpBonus]),
            condition: new ConditionConstellation({constellation: 2}),
            target: new FeatureMultiplierTarget({
                damageTypes: ['skill'],
            }),
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            // C1 Crimson Bouquet (charged attacks cost no stamina in Paramita
            // Papilio): no stat read, needs nothing.
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.hu_tao_crimson_bouquet',
                    description: 'talent_descr.hu_tao_crimson_bouquet',
                    subConditions: [
                        new ConditionBoolean({name: 'hutao_paramita_papilio'}),
                    ],
                }),
            ],
        },
        {
            conditions: [
                // C2 display only (10% Max HP Blood Blossom): the real bonus
                // is the multipliers entry above (game: damageExtra x
                // FIGHT_PROP_MAX_HP, total). text_percent has no extra lane
                // and needs nothing. C2 also lets the burst apply Blood
                // Blossom (CrimsonPlum_Constellation_LifeBonus_Handler):
                // no stat read.
                new ConditionStatic({
                    title: 'talent_name.hu_tao_ominous_rainfall',
                    description: 'talent_descr.hu_tao_ominous_rainfall',
                    stats: {
                        text_percent: TalentValues.C2SkillHpBonus,
                    },
                }),
            ],
        },
        {},
        {
            conditions: [
                // C4 Garden of Eternal Rest: defeating a Blood-Blossomed enemy
                // grants 12% CRIT to nearby allies (Hu Tao excluded). Game
                // data: UNIQUE_Hutao_CrimsonPlum_Debuff_Constellation_2 writes
                // Actor_CriticalDelta from the flat
                // CrimsonPlum_Debuff_Constellation_Kill_Critical_Delta
                // (Talent Hutao_Constellation_4 paramList [0.12, 15]), gated
                // by Avatar_Hutao_Constellation_Kill. Flat conditions are
                // always premod and need nothing.
                new ConditionStatic({
                    isHidden: true,
                    title: 'talent_name.hu_tao_garden_of_eternal_rest',
                    description: 'talent_descr.hu_tao_garden_of_eternal_rest',
                    stats: {
                        text_percent: TalentValues.C4CritRate,
                    },
                }),
                // Defeating a Blood-Blossomed enemy raises nearby allies'
                // CRIT, Hu Tao excluded.
                new ConditionBoolean({
                    name: 'hu_tao_garden_of_eternal_rest',
                    serializeId: 5,
                    receivers: RECEIVERS.OTHERS,
                    title: 'talent_name.hu_tao_garden_of_eternal_rest',
                    description: 'talent_descr.hu_tao_garden_of_eternal_rest',
                    stats: {
                        text_percent: TalentValues.C4CritRate,
                        crit_rate: TalentValues.C4CritRate,
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
                // C6 Butterfly's Embrace: flat +100% CRIT and +200% all RES at
                // low HP. Game data: Avatar_Hutao_Constellation_Limbo_Trigger
                // (UNIQUE_Hutao_Constellation_Limbo_Trigger_Handler) writes
                // Actor_CriticalDelta and Actor_*SubHurtDelta from flat
                // specials (Talent Hutao_Constellation_6 paramList
                // [0.25, 10, 2, 1]), triggered by the HP-ratio threshold
                // Hutao_Constellation_Limbo_HPRatio. Flat conditions are
                // always premod and need nothing.
                new ConditionBoolean({
                    name: 'hu_tao_butterflys_embrace',
                    serializeId: 3,
                    title: 'talent_name.hu_tao_butterflys_embrace',
                    description: 'talent_descr.hu_tao_butterflys_embrace',
                    stats: {
                        res_phys: TalentValues.C6Resistance,
                        res_anemo: TalentValues.C6Resistance,
                        res_geo: TalentValues.C6Resistance,
                        res_pyro: TalentValues.C6Resistance,
                        res_electro: TalentValues.C6Resistance,
                        res_hydro: TalentValues.C6Resistance,
                        res_cryo: TalentValues.C6Resistance,
                        res_dendro: TalentValues.C6Resistance,
                        crit_rate: TalentValues.C6CritRate,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'checkbox'], [2, 'checkbox']],
});

