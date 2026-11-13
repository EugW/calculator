import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionTeam } from "../../classes/Condition/Team";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionStaticLevel } from "../../classes/Condition/Static/Level";
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
import { FeatureMultiplierStatic } from "../../classes/Feature2/Multiplier/Static";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureStatic } from "../../classes/Feature2/Static";
import { PostEffectStatsRecharge } from "../../classes/PostEffect/Stats/Recharge";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent, times } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Alyosha.s1_id,
        title: 'talent_name.alyosha_skirmishing_spear',
        description: 'talent_descr.alyosha_skirmishing_spear',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Alyosha.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Alyosha.s1.p2),
            },
            {
                type: 'hits',
                name: 'normal_hit_3',
                table: [
                    new StatTable('normal_hit_3_1', charTalentTables.Alyosha.s1.p3),
                    new StatTable('normal_hit_3_2', charTalentTables.Alyosha.s1.p4),
                ],
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Alyosha.s1.p5),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Alyosha.s1.p6),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Alyosha.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Alyosha.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Alyosha.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Alyosha.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Alyosha.s2_id,
        title: 'talent_name.alyosha_thunderbolt_strike',
        description: 'talent_descr.alyosha_thunderbolt_strike',
        items: [
            {
                table: new StatTable('alyosha_thunderbolt_strike_press', charTalentTables.Alyosha.s2.p1),
            },
            {
                table: new StatTable('alyosha_thunderbolt_strike_hold', charTalentTables.Alyosha.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Alyosha.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('alyosha_hunters_mark_duration', charTalentTables.Alyosha.s2.p4),
            },
            {
                table: new StatTable('alyosha_hunters_precision_atk_bonus', charTalentTables.Alyosha.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('alyosha_hunters_precision_duration', charTalentTables.Alyosha.s2.p6),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Alyosha.s3_id,
        title: 'talent_name.alyosha_hunters_advance',
        description: 'talent_descr.alyosha_hunters_advance',
        items: [
            {
                table: new StatTable('alyosha_fulgurite_hunting_field', charTalentTables.Alyosha.s3.p1),
            },
            {
                table: new StatTable('alyosha_tugarin', charTalentTables.Alyosha.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Alyosha.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Alyosha.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Alyosha.s3.p5),
            },
        ],
    },
});

const A1ActiveHeal = percent(charTalentTables.Alyosha.a1.p1);
const A4SkillBurstPerEnergyRecharge = times(percent(charTalentTables.Alyosha.a4.p1), 100);
const A4SkillBurstBonusCap = 70;
const A4SkillBurstPerEnergyRechargeText = percent(charTalentTables.Alyosha.a4.p1);
const PassiveStellarConductBonus = percent(charTalentTables.Alyosha.a0.p1);
const C1Energy = charTalentTables.Alyosha.c1.p1;
const C1Cooldown = charTalentTables.Alyosha.c1.p2;
const C2BurstDurationExtension = charTalentTables.Alyosha.c2.p1;
const C4LowestHpHeal = percent(charTalentTables.Alyosha.c4.p1);
const C6Mastery = charTalentTables.Alyosha.c6.p1;

const a4SkillBurstPost = new PostEffectStatsRecharge({
    // Game data: Avatar_Alyosha_PermanentSkill_2
    // (UNIQUE_Alyosha_PermanentSkill_2_Buff, ModifyDamageMixin) reads
    // FIGHT_PROP_CHARGE_EFFICIENCY (total), unlike Raiden's A4 which reads
    // FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY. GO reads input.total.enerRech_.
    // KQM has no Alyosha interaction test. No writes param: dmg_skill and
    // dmg_burst have no extra lane.
    reads: CHANNELS.TOTAL,
    percent: [
        new StatTable('dmg_skill', [A4SkillBurstPerEnergyRecharge]),
        new StatTable('dmg_burst', [A4SkillBurstPerEnergyRecharge]),
    ],
    statCap: new ValueTable([A4SkillBurstBonusCap]),
    condition: new ConditionAscensionChar({ascension: 4}),
});

const precisionStats = () => [
    Talents.getAlias('skill.alyosha_hunters_precision_atk_bonus', 'atk_percent'),
];

export const Alyosha = new DbObjectChar({
    name: 'alyosha',
    serializeId: 125,
    gameId: 10000148,
    iconClass: 'char-icon-alyosha',
    rarity: 4,
    element: 'electro',
    weapon: 'polearm',
    origin: 'snezhnaya',
    talents: Talents,
    statTable: charTables.Alyosha,
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
            name: 'alyosha_thunderbolt_strike_press',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.alyosha_thunderbolt_strike_press'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'alyosha_thunderbolt_strike_hold',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.alyosha_thunderbolt_strike_hold'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'alyosha_fulgurite_hunting_field',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.alyosha_fulgurite_hunting_field'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'alyosha_tugarin',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.alyosha_tugarin'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'other',
            name: 'alyosha_tugarin_active_heal',
            multipliers: [
                new FeatureMultiplier({
                    source: 'ascension1',
                    values: new ValueTable([A1ActiveHeal]),
                }),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new FeatureHeal({
            category: 'other',
            name: 'alyosha_tugarin_lowest_hp_heal',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new ValueTable([C4LowestHpHeal]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 4}),
        }),
        new FeatureStatic({
            category: 'other',
            name: 'alyosha_frostvale_energy',
            multipliers: [
                new FeatureMultiplierStatic({
                    source: 'constellation1',
                    values: new ValueTable([C1Energy]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 1}),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'alyosha_suffer_the_winter_wheat_will_bonus',
            postEffect: a4SkillBurstPost,
            format: 'percent',
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    conditions: [
        new ConditionStatic({
            title: 'talent_name.n11480001',
            description: 'talent_descr.n11480001',
        }),
        // Apply C3 before Hunter's Precision reads the Skill table. Constellation
        // conditions are otherwise appended after regular character conditions.
        new Condition({
            isHidden: true,
            settings: {
                char_skill_elemental_bonus: 3,
            },
            condition: new ConditionConstellation({constellation: 3}),
        }),
        new ConditionStacks({
            name: 'alyosha_hunters_precision',
            serializeId: 1,
            title: 'talent_name.alyosha_hunters_precision',
            description: 'talent_descr.alyosha_hunters_precision',
            rotation: 'self',
            maxStacks: settings => settings.char_constellation >= 6 ? 2 : 1,
        }),
        new ConditionBoolean({
            name: 'alyosha_radiance_stellarconduct',
            serializeId: 2,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.alyosha_into_the_fray',
            description: 'talent_descr.alyosha_into_the_fray',
            info: {special: true},
            rotation: 'self',
            settings: {
                allowed_stellarconduct: 1,
            },
            subConditions: [
                new ConditionTeam({condition: new ConditionBoolean({name: 'polestar_field'})}),
            ],
        }),
        // Hunter's Mark grants Precision to every member, including Alyosha,
        // but its bonuses apply only while that member is on the field.
        // Keep the saved stack control independent of the receiving member.
        new ConditionStaticLevel({
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            levelSetting: 'char_skill_elemental',
            stats: precisionStats(),
            condition: new ConditionAnd([
                new ConditionBooleanValue({
                    setting: 'alyosha_hunters_precision',
                    cond: 'eq',
                    value: 1,
                }),
                new ConditionReceiver({
                    condition: new ConditionOnField(),
                }),
            ]),
        }),
        new ConditionStaticLevel({
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            levelSetting: 'char_skill_elemental',
            stats: [
                Talents.getMulti({
                    name: 'atk_percent',
                    from: 'skill.alyosha_hunters_precision_atk_bonus',
                    multi: 2,
                }),
                new StatTable('mastery', [C6Mastery]),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                new ConditionBooleanValue({
                    setting: 'alyosha_hunters_precision',
                    cond: 'eq',
                    value: 2,
                }),
                new ConditionReceiver({
                    condition: new ConditionOnField(),
                }),
            ]),
        }),
        new ConditionStaticLevel({
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            levelSetting: 'alyosha_hunters_precision',
            stats: [
                new StatTable('dmg_stellarconduct', [PassiveStellarConductBonus, PassiveStellarConductBonus * 2]),
            ],
            condition: new ConditionAnd([
                new ConditionBooleanValue({
                    setting: 'alyosha_hunters_precision',
                    cond: 'gt',
                    value: 0,
                }),
                new ConditionBoolean({name: 'alyosha_radiance_stellarconduct'}),
                new ConditionTeam({condition: new ConditionBoolean({name: 'polestar_field'})}),
                new ConditionReceiver({
                    condition: new ConditionOnField(),
                }),
            ]),
        }),
        new ConditionStatic({
            title: 'talent_name.alyosha_awakened_by_the_baying_hounds',
            description: 'talent_descr.alyosha_awakened_by_the_baying_hounds',
            info: {ascension: 1},
            stats: {
                text_percent_atk: A1ActiveHeal,
            },
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.alyosha_suffer_the_winter_wheat_will',
            description: 'talent_descr.alyosha_suffer_the_winter_wheat_will',
            info: {ascension: 4},
            stats: {
                text_percent: A4SkillBurstPerEnergyRechargeText,
                text_percent_max: A4SkillBurstBonusCap,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    postEffects: [
        a4SkillBurstPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.alyosha_frostvale_thunderclap',
                    description: 'talent_descr.alyosha_frostvale_thunderclap',
                    stats: {
                        text_value: C1Energy,
                        text_duration: C1Cooldown,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.alyosha_howl_from_afar',
                    description: 'talent_descr.alyosha_howl_from_afar',
                    stats: {
                        text_duration: C2BurstDurationExtension,
                    },
                }),
            ],
        },
        {
            conditions: [],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.alyosha_harvest_the_spoils',
                    description: 'talent_descr.alyosha_harvest_the_spoils',
                    stats: {
                        text_percent_atk: C4LowestHpHeal,
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
                new ConditionStatic({
                    title: 'talent_name.alyosha_standard_reclaimed',
                    description: 'talent_descr.alyosha_standard_reclaimed',
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'stacks'], [3, 'checkbox'], [4, 'checkbox'], [5, 'checkbox']],
});
