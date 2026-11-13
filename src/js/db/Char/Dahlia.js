import { CHARACTER_MAX_POSSIBLE_HP } from "../Constants";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";
import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
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
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureShield } from "../../classes/Feature2/Shield";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsHP } from "../../classes/PostEffect/Stats/HP";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Dahlia.s1_id,
        title: 'talent_name.dahlia_favonius_bladework_ritual',
        description: 'talent_descr.dahlia_favonius_bladework_ritual',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Dahlia.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Dahlia.s1.p2),
            },
            {
                type: 'hits',
                name: 'normal_hit_3',
                table: [
                    new StatTable('normal_hit_3_1', charTalentTables.Dahlia.s1.p3),
                    new StatTable('normal_hit_3_2', charTalentTables.Dahlia.s1.p4),
                ],
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Dahlia.s1.p5),
            },
            {
                type: 'hits',
                name: 'charged_hit_total',
                table: [
                    new StatTable('charged_hit_1', charTalentTables.Dahlia.s1.p6),
                    new StatTable('charged_hit_2', charTalentTables.Dahlia.s1.p7),
                ],
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Dahlia.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Dahlia.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Dahlia.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Dahlia.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Dahlia.s2_id,
        title: 'talent_name.dahlia_immersive_ordinance',
        description: 'talent_descr.dahlia_immersive_ordinance',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.Dahlia.s2.p1),
            },

            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Dahlia.s2.p2),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Dahlia.s3_id,
        title: 'talent_name.dahlia_radiant_psalter',
        description: 'talent_descr.dahlia_radiant_psalter',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Dahlia.s3.p1),
            },
            {
                type: 'shield',
                unit: 'hp',
                table: [
                    new StatTable('dahlia_base_shield_dmg_absorption', charTalentTables.Dahlia.s3.p3),
                    new StatTable('', charTalentTables.Dahlia.s3.p2),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('dahlia_duration', charTalentTables.Dahlia.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Dahlia.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Dahlia.s3.p5),
            },
        ],
    },
});

const A4AtkSpd = percent(charTalentTables.Dahlia.a4.p1);
const A4AtkSpdCap = percent(charTalentTables.Dahlia.a4.p2);
const C2ShieldBonus = percent(charTalentTables.Dahlia.c2.p1);
const C6AtkSpeed = percent(charTalentTables.Dahlia.c6.p1);

// Prayer of Well-Wrought Joy raises the ATK SPD of the active affected
// member from Dahlia's Max HP.
const activeReceiver = new ConditionReceiver({
    condition: new ConditionOnField(),
});

const buffAtkSpeed = new PostEffectStatsHP({
    receivers: RECEIVERS.TEAM,
    // Game data: Avatar_Dahlia_PermanentSkill_2_OnCurAvatar computes
    // SetGlobalValue _ABILITY_Dahlia_AttackSpeedBuff as
    // [FIGHT_PROP_MAX_HP, HpToSpeed_Ratio, MUL] capped by MaxAttackSpeed
    // (ProudSkill 1152201 Dahlia_PermanentSkill_2 params [5e-06, 0.2]: 0.5%
    // per 1000 HP, cap 20%). FIGHT_PROP_MAX_HP is the total marker
    // (md/buff_chains.md), as for Baizhu/Candace/Chevreuse/Columbina; the same
    // number as premod while no ability writes extra HP. GO reads
    // input.total.hp. KQM Dahlia has no EM/ATK/HP/ER buff-chain test.
    // atk_speed has no extra lane, so the default extra (total) write is kept.
    reads: CHANNELS.TOTAL,
    percent: new StatTable('atk_speed', [A4AtkSpd]),
    statCap: new StatTable('', [A4AtkSpdCap]),
    conditions: [
        new ConditionAscensionChar({ascension: 4}),
        new ConditionBoolean({name: 'dahlia_prayer_of_well_wrought_joy'}),
        activeReceiver,
    ],
});

export const Dahlia = new DbObjectChar({
    name: 'dahlia',
    serializeId: 107,
    gameId: 10000115,
    iconClass: 'char-icon-dahlia',
    rarity: 4,
    element: 'hydro',
    weapon: 'sword',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Dahlia,
    // Talent hits read the total by construction (FeatureDamage* multipliers
    // with no stat input scale on ATK; the game uses ModifyDamageMixin with a
    // plain damagePercentage, no FIGHT_PROP read) and need nothing. The burst
    // shield (FeatureShield scaling 'hp*') reads the total HP by construction;
    // the game builds it in UNIQUE_Dahlia_ElementBurst_Shield_Team_A/B with
    // GlobalMainShieldMixin (Shield_HpValue, maxShieldByHPRatio
    // Shield_MaxHpRatio, no FIGHT_PROP marker). GO uses shieldNodeTalent('hp',
    // ...) (total) for it. A1 (Benison on Frozen, gated by
    // Dahlia_PermanentSkill_1) and A3 (movement speed, PermanentSkill_3) read
    // no stat. The FeaturePostEffectValue below only displays buffAtkSpeed.
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
            name: 'normal_hit_3_1',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3_2',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3_2'),
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
            name: 'charged_hit_1',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_1'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit_2',
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
        new FeatureDamageSkill({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureShield({
            category: 'burst',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.getList('burst.dahlia_base_shield_dmg_absorption'),
                }),
            ],
        }),
        new FeaturePostEffectValue({
            category: 'burst',
            name: 'dahlia_atk_speed_bonus',
            postEffect: buffAtkSpeed,
            format: 'percent',
        }),
    ],
    conditions: [
        new ConditionStatic({
            title: 'talent_name.dahlia_the_winds_gentle_grace',
            description: 'talent_descr.dahlia_the_winds_gentle_grace',
            info: {ascension: 1},
        }),
        new ConditionBoolean({
            name: 'dahlia_prayer_of_well_wrought_joy',
            serializeId: 1,
            title: 'talent_name.dahlia_prayer_of_well_wrought_joy',
            description: 'talent_descr.dahlia_prayer_of_well_wrought_joy',
            info: {ascension: 4},
            stats: {
                text_percent: A4AtkSpd * 1000,
                text_percent_max: A4AtkSpdCap,
            },
        }),
    ],
    postEffects: [
        buffAtkSpeed,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                // C1 restores flat energy (ReviveElemEnergy value EnergyValue,
                // Talent Dahlia_Constellation_1 paramList [2.5]): no stat read.
                new ConditionStatic({
                    title: 'talent_name.dahlia_infallible_procession',
                    description: 'talent_descr.dahlia_infallible_procession',
                }),
            ],
        },
        {
            conditions: [
                // C2 Shield Strength +25% (Avatar_Dahlia_Constellation_2 writes
                // Actor_ShieldCostMinusRatio from the flat ShieldMinusRatio,
                // Talent Dahlia_Constellation_2 params [0.25, 12]): a flat
                // toggle, always premod, needs nothing.
                new ConditionBoolean({
                    name: 'dahlia_revelation_of_mercy',
                    serializeId: 2,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.dahlia_revelation_of_mercy',
                    description: 'talent_descr.dahlia_revelation_of_mercy',
                    stats: {
                        shield: C2ShieldBonus,
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
                    title: 'talent_name.dahlia_collect_of_the_assembly',
                    description: 'talent_descr.dahlia_collect_of_the_assembly',
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
                // C6 flat +10% ATK SPD (Avatar_Dahlia_Constellation_6 writes
                // Animator_AttackSpeedRatio from the flat Extra_AtkSpeedRatio,
                // Talent Dahlia_Constellation_6 paramList [0.1]): flat toggles,
                // always premod, need nothing. atk_speed has no extra lane.
                new ConditionBoolean({
                    name: 'dahlia_you_shall_go_out_with_joy',
                    serializeId: 3,
                    title: 'talent_name.dahlia_you_shall_go_out_with_joy',
                    description: 'talent_descr.dahlia_you_shall_go_out_with_joy',
                    stats: {
                        atk_speed: C6AtkSpeed,
                    },
                }),
                // Favonian Favor raises the active affected character's ATK
                // SPD; Dahlia keeps his own copy above.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        atk_speed: C6AtkSpeed,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'dahlia_you_shall_go_out_with_joy'}),
                        activeReceiver,
                    ]),
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox'], [4, 'checkbox']],
});
