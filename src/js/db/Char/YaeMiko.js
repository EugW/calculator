import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionTeam } from "../../classes/Condition/Team";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
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
import { FeatureDamageStellarConduct } from "../../classes/Feature2/Damage/StellarConduct";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { PostEffectStatsMastery } from "../../classes/PostEffect/Stats/Mastery";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";
import { CHANNELS } from "../../classes/PostEffect/Channels";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.YaeMiko.s1_id,
        title: 'talent_name.yae_miko_spiritfox_sin_eater',
        description: 'talent_descr.yae_miko_spiritfox_sin_eater',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.YaeMiko.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.YaeMiko.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.YaeMiko.s1.p3),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.YaeMiko.s1.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.YaeMiko.s1.p5),
            },
            {
                table: new StatTable('plunge', charTalentTables.YaeMiko.s1.p6),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.YaeMiko.s1.p7),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.YaeMiko.s1.p8),

            },
        ],
    },
    skill: {
        gameId: charTalentTables.YaeMiko.s2_id,
        title: 'talent_name.yae_miko_sesshou_sakura',
        description: 'talent_descr.yae_miko_sesshou_sakura',
        items: [
            {
                table: new StatTable('miko_sesshou_sakura_1_dmg', charTalentTables.YaeMiko.s2.p1),
            },
            {
                table: new StatTable('miko_sesshou_sakura_2_dmg', charTalentTables.YaeMiko.s2.p2),
            },
            {
                table: new StatTable('miko_sesshou_sakura_3_dmg', charTalentTables.YaeMiko.s2.p3),
            },
            {
                table: new StatTable('miko_sesshou_sakura_4_dmg', charTalentTables.YaeMiko.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.YaeMiko.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.YaeMiko.s2.p6),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.YaeMiko.s3_id,
        title: 'talent_name.yae_miko_tenko_kenshin',
        description: 'talent_descr.yae_miko_tenko_kenshin',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.YaeMiko.s3.p1),
            },
            {
                table: new StatTable('miko_thunderbolt_dmg', charTalentTables.YaeMiko.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.YaeMiko.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.YaeMiko.s3.p4),
            },
        ],
    },
});

const TalentValues = {
    A1ThunderDmg: percent(charTalentTables.YaeMiko.a1.p1),
    A1RadianceDmg: percent(charTalentTables.YaeMiko.a1.p2),
    A4SkillDmg: percent(charTalentTables.YaeMiko.a4.p1),
    EdictDmg: percent(charTalentTables.YaeMiko.sp.p1),
    EdictRadianceDmg: percent(charTalentTables.YaeMiko.sp.p3),
    C1Dmg: percent(charTalentTables.YaeMiko.c1.p2),
    C2Mastery: [charTalentTables.YaeMiko.c2.p4, charTalentTables.YaeMiko.c2.p5, charTalentTables.YaeMiko.c2.p6, charTalentTables.YaeMiko.c2.p7],
    C4ElectroDmg: percent(charTalentTables.YaeMiko.c4.p1),
    C4BurstDmg: percent(charTalentTables.YaeMiko.c4.p5),
    C6DefIgnore: percent(charTalentTables.YaeMiko.c6.p1),
    C6StellarCritDmg: percent(charTalentTables.YaeMiko.c6.p2),
};

// A4 Enlightened Blessing: Sesshou Sakura DMG +0.15% per EM.
// Game data: Avatar_Yae_PermanentSkill_2 (ModifyDamageMixin on Elemental_Art) reads
// FIGHT_PROP_ELEMENT_MASTERY (total), ratio Yae_PermanentSkill_2_AttackUpRatio (ProudSkill 582201: 0.0015).
// KQM Yae: Sucrose A4 extra EM counts (also Kazuha C2 / Diona C6 flat EM); KQM Nahida lists
// Yae A4 among the bonuses counting Nahida A1 extra EM. GO reads input.total.eleMas,
// writes total skill_dmg_.
const skillDmgPost = new PostEffectStatsMastery({
    reads: CHANNELS.TOTAL,
    percent: new StatTable('dmg_skill_yaemiko', [TalentValues.A4SkillDmg]),
    conditions: [
        new ConditionAscensionChar({ascension: 4}),
    ],
});

function enhancedSesshouSakuraCondition(level) {
    let conditions = [
        new ConditionBoolean({name: 'yae_miko_edict_of_cleansing'}),
    ];

    if (level == 4) {
        conditions.push(new ConditionConstellation({constellation: 2}));
    }

    return conditions.length > 1 ? new ConditionAnd(conditions) : conditions[0];
}

function enhancedSesshouSakuraFeature(level) {
    // Edict of Cleansing enhanced lightning: game data Avatar_Yae_PermanentSkill_3
    // UNIQUE_Yae_EnhanceEAReady(_Star) damageExtra AS_Yae_PermanentSkill_3_AttackRatio *
    // FIGHT_PROP_CUR_ATTACK (total). Hits read the total; plain multipliers need nothing.
    return new FeatureDamageSkill({
        name: 'yae_miko_enhanced_sesshou_sakura_'+ level,
        element: 'electro',
        damageBonuses: ['dmg_skill_yaemiko'],
        multipliers: [
            new FeatureMultiplier({
                leveling: 'char_skill_elemental',
                values: Talents.get('skill.miko_sesshou_sakura_'+ level +'_dmg'),
            }),
            new FeatureMultiplier({
                source: 'special',
                values: new ValueTable([TalentValues.EdictDmg]),
            }),
        ],
        condition: enhancedSesshouSakuraCondition(level),
    });
}

export const YaeMiko = new DbObjectChar({
    name: 'yae_miko',
    serializeId: 49,
    gameId: 10000058,
    iconClass: "char-icon-yae-miko",
    rarity: 5,
    element: 'electro',
    weapon: 'catalyst',
    origin: 'inazuma',
    talents: Talents,
    statTable: charTables.YaeMiko,
    features: [
        new FeatureDamageNormal({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'electro',
            damageBonuses: ['dmg_skill_yaemiko'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.miko_sesshou_sakura_1_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'electro',
            damageBonuses: ['dmg_skill_yaemiko'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.miko_sesshou_sakura_2_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'electro',
            damageBonuses: ['dmg_skill_yaemiko'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.miko_sesshou_sakura_3_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'electro',
            damageBonuses: ['dmg_skill_yaemiko'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.miko_sesshou_sakura_4_dmg'),
                }),
            ],
            condition: new ConditionConstellation({constellation: 2}),
        }),
        enhancedSesshouSakuraFeature(1),
        enhancedSesshouSakuraFeature(2),
        enhancedSesshouSakuraFeature(3),
        enhancedSesshouSakuraFeature(4),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'yae_miko_radiance_sesshou_sakura_stellarconduct',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    source: 'special',
                    values: new ValueTable([TalentValues.EdictRadianceDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'yae_miko_edict_of_cleansing'}),
                new ConditionBoolean({name: 'yae_miko_radiance_stellarconduct'}),
            ]),
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'yae_miko_radiance_shrine_shade_stellarconduct',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    source: 'ascension1',
                    values: new ValueTable([TalentValues.A1RadianceDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                new ConditionBoolean({name: 'yae_miko_radiance_stellarconduct'}),
            ]),
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
        new FeatureDamageBurst({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.miko_thunderbolt_dmg'),
                }),
            ],
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'yae_miko_skill_bonus',
            postEffect: skillDmgPost,
            format: 'percent',
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    conditions: [
        // A1 The Shrine's Sacred Shade: game data Avatar_Yae_PermanentSkill_1 only applies
        // ModifyAvatarSkillCD on skill/burst hits (Yae_PermanentSkill_1_Handler); the extra
        // lightning is a plain ATK hit (40%/50% Radiance). No stat read, needs nothing.
        new ConditionStatic({
            title: 'talent_name.yae_miko_the_shrines_sacred_shade',
            description: 'talent_descr.yae_miko_the_shrines_sacred_shade_buffed',
            stats: {
                text_percent: TalentValues.A1ThunderDmg,
                text_percent_2: TalentValues.A1RadianceDmg,
            },
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.yae_miko_enlightened_blessing',
            description: 'talent_descr.yae_miko_enlightened_blessing',
            stats: {
                text_percent: TalentValues.A4SkillDmg,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        new ConditionBoolean({
            name: 'yae_miko_edict_of_cleansing',
            serializeId: 3,
            title: 'talent_name.yae_miko_edict_of_cleansing',
            description: 'talent_descr.yae_miko_edict_of_cleansing',
            stats: {
                text_percent: TalentValues.EdictDmg,
            },
        }),
        new ConditionBoolean({
            name: 'yae_miko_radiance_stellarconduct',
            serializeId: 2,
            title: 'talent_name.yae_miko_edict_of_cleansing',
            description: 'talent_descr.yae_miko_edict_of_cleansing',
            subConditions: [
                new ConditionTeam({condition: new ConditionBoolean({name: 'polestar_field'})}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                // C1: game data Avatar_Yae_PermanentSkill_3 UNIQUE_Yae_Constellation_1_Buff writes
                // Actor_ElecAddHurtDelta + Actor_ElemReactStarSConductElectricDelta/IceDelta
                // (premod, no Extra). GO writes premod electro/stellarconduct dmg. Conditions
                // write premod: default confirmed, no params.
                new ConditionStatic({
                    title: 'talent_name.yae_miko_yakan_offering',
                    description: 'talent_descr.yae_miko_yakan_offering_buffed',
                }),
                new ConditionBoolean({
                    name: 'yae_miko_yakan_offering_buff',
                    serializeId: 4,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.yae_miko_yakan_offering',
                    description: 'talent_descr.yae_miko_yakan_offering_buffed',
                    stats: {
                        dmg_electro: TalentValues.C1Dmg,
                        dmg_stellarconduct: TalentValues.C1Dmg,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionNumber({
                    name: 'yae_miko_sesshou_sakura_level',
                    serializeId: 5,
                    title: 'talent_name.yae_miko_foxs_mooncall',
                    description: 'talent_descr.yae_miko_foxs_mooncall_buffed',
                    max: 4,
                    noStat: true,
                }),
                // C2: game data Avatar_Yae_PermanentSkill_3
                // UNIQUE_Yae_Constellation2_FoxCountBuff_1..4 (+ LocalAvatar_Real) writes
                // Actor_ElemMasteryDelta (premod, no Extra) from AS_ElemMasteryDelta_1..4
                // (ProudSkill talent 582: 60/90/120/200). GO writes premod eleMas (teamBuff).
                // Conditions write premod: default confirmed, no params.
                new ConditionStaticLevel({
                    title: 'talent_name.yae_miko_foxs_mooncall',
                    description: 'talent_descr.yae_miko_foxs_mooncall_buffed',
                    levelSetting: 'yae_miko_sesshou_sakura_level',
                    stats: [
                        new StatTable('mastery', TalentValues.C2Mastery),
                    ],
                    subConditions: [
                        new ConditionBooleanValue({
                            setting: 'yae_miko_sesshou_sakura_level',
                            cond: 'ge',
                            value: 1,
                        }),
                    ],
                }),
                // Sesshou Sakura also raises the current active character's
                // Mastery; Yae herself keeps the static above.
                new ConditionStaticLevel({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    levelSetting: 'yae_miko_sesshou_sakura_level',
                    stats: [
                        new StatTable('mastery', TalentValues.C2Mastery),
                    ],
                    subConditions: [
                        new ConditionBooleanValue({
                            setting: 'yae_miko_sesshou_sakura_level',
                            cond: 'ge',
                            value: 1,
                        }),
                        new ConditionReceiver({
                            condition: new ConditionOnField(),
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
                // C4: game data Avatar_Yae_Constellation_4 UNIQUE_Yae_Constellation_ElecAddHurt writes
                // Actor_ElecAddHurtDelta (premod, no Extra); UNIQUE_Yae_Constellation_Permanent3_EB_Buff
                // is a flat ModifyDamageMixin on Elemental_Burst (no stat read) + flat energy.
                // GO writes premod electro_dmg_ / burst_dmg_. Conditions write premod:
                // default confirmed, no params.
                new ConditionBoolean({
                    name: 'miko_sakura_channeling',
                    serializeId: 1,
                    title: 'talent_name.yae_miko_sakura_channeling',
                    description: 'talent_descr.yae_miko_sakura_channeling_buffed',
                    stats: {
                        dmg_electro: TalentValues.C4ElectroDmg,
                        dmg_burst: TalentValues.C4BurstDmg,
                    },
                }),
                // Sesshou lightning raises all nearby party members' Electro
                // DMG; Yae keeps her own copy above (plus her Burst DMG).
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        dmg_electro: TalentValues.C4ElectroDmg,
                    },
                    condition: new ConditionBoolean({name: 'miko_sakura_channeling'}),
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
                // C6: game data Avatar_Yae_Constellation_6 ModifyDamageMixin DefenseIgnoreRatio on
                // Elemental_Art + StarCritcalDamageUp bonusCriticalHurt on Stellar-Conduct (both flat,
                // no stat read). GO writes premod defIgn_ / stellarconduct_critDMG_. Conditions
                // write premod: default confirmed, no params.
                new ConditionStatic({
                    title: 'talent_name.yae_miko_daisesshou',
                    description: 'talent_descr.yae_miko_daisesshou_buffed',
                    stats: {
                        def_ignore_skill: TalentValues.C6DefIgnore,
                        crit_dmg_stellarconduct: TalentValues.C6StellarCritDmg,
                    },
                }),
            ],
        },
    ]),
    postEffects: [
        skillDmgPost,
    ],
    retiredParty: [[1, 'checkbox'], [2, 'checkbox'], [3, 'number']],
});
