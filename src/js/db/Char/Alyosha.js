import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNumberTalent } from "../../classes/Condition/Number/Talent";
import { ConditionStacksLevels } from "../../classes/Condition/Stacks/Levels";
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
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

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

const A1ActiveHeal = 120;
const A4SkillBurstPerEnergyRecharge = 35;
const A4SkillBurstBonusCap = 70;
const PassiveStellarConductBonus = 20;
const C1Energy = 15;
const C1Cooldown = 18;
const C2BurstDurationExtension = 6;
const C4LowestHpHeal = 60;
const C6Mastery = 100;

const a4SkillBurstPost = new PostEffectStatsRecharge({
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

const precisionMastery = () => new StatTable('mastery', [0, C6Mastery]);

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
        new ConditionStacksLevels({
            name: 'alyosha_hunters_precision',
            serializeId: 1,
            title: 'talent_name.alyosha_hunters_precision',
            description: 'talent_descr.alyosha_hunters_precision',
            rotation: 'self',
            levelSetting: 'char_skill_elemental',
            maxStacks: settings => settings.char_constellation >= 6 ? 2 : 1,
            stats: precisionStats(),
            realStats: precisionMastery(),
        }),
        new ConditionBoolean({
            name: 'alyosha_radiance_stellarconduct',
            serializeId: 2,
            title: 'talent_name.alyosha_into_the_fray',
            description: 'talent_descr.alyosha_into_the_fray',
            info: {special: true},
            rotation: 'self',
            settings: {
                allowed_stellarconduct: 1,
            },
            subConditions: [
                new ConditionBoolean({name: 'polestar_field'}),
            ],
        }),
        new ConditionStaticLevel({
            isHidden: true,
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
                new ConditionBoolean({name: 'polestar_field'}),
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
                text_percent: 0.35,
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
    partyData: {
        loadStats: {
            settings: ['char_skill_elemental'],
        },
        conditions: [
            new ConditionNumberTalent({
                name: 'alyosha_char_skill_elemental',
                title: 'talent_name.stats_level_skill',
                partySetting: 'char_skill_elemental',
                serializeId: 1,
            }),
            new ConditionBoolean({
                name: 'party.alyosha_constellation_3',
                serializeId: 5,
                title: 'talent_name.alyosha_friendly_call',
                description: 'talent_descr.char_constellation_skill',
                info: {constellation: 3},
                settings: {
                    alyosha_char_skill_elemental_bonus: 3,
                },
            }),
            new ConditionStacksLevels({
                name: 'party.alyosha_hunters_precision',
                serializeId: 2,
                title: 'talent_name.alyosha_hunters_precision',
                description: 'talent_descr.alyosha_hunters_precision',
                rotation: 'party',
                levelSetting: 'alyosha_char_skill_elemental',
                maxStacks: settings => settings['party.alyosha_standard_reclaimed'] ? 2 : 1,
                stats: precisionStats(),
                realStats: precisionMastery(),
            }),
            new ConditionBoolean({
                name: 'party.alyosha_radiance_stellarconduct',
                serializeId: 3,
                title: 'talent_name.alyosha_into_the_fray',
                description: 'talent_descr.alyosha_into_the_fray',
                info: {special: true},
                rotation: 'party',
                subConditions: [
                    new ConditionBoolean({name: 'polestar_field'}),
                ],
            }),
            new ConditionBoolean({
                name: 'party.alyosha_standard_reclaimed',
                serializeId: 4,
                title: 'talent_name.alyosha_standard_reclaimed',
                description: 'talent_descr.alyosha_standard_reclaimed',
                info: {constellation: 6},
                rotation: 'party',
            }),
            new ConditionStaticLevel({
                isHidden: true,
                levelSetting: 'party.alyosha_hunters_precision',
                stats: [
                    new StatTable('dmg_stellarconduct', [PassiveStellarConductBonus, PassiveStellarConductBonus * 2]),
                ],
                condition: new ConditionAnd([
                    new ConditionBooleanValue({
                        setting: 'party.alyosha_hunters_precision',
                        cond: 'gt',
                        value: 0,
                    }),
                    new ConditionBoolean({name: 'party.alyosha_radiance_stellarconduct'}),
                    new ConditionBoolean({name: 'polestar_field'}),
                ]),
            }),
        ],
    },
});
