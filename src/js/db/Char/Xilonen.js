import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanCharElement } from "../../classes/Condition/Boolean/CharElement";
import { ConditionBooleanXilonen } from "../../classes/Condition/Boolean/Xilonen";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionLevels } from "../../classes/Condition/Levels";
import { ConditionNot } from "../../classes/Condition/Not";
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
import { FeatureHeal } from "../../classes/Feature2/Heal";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Xilonen.s1_id,
        title: 'talent_name.xilonen_ehecatls_roar',
        description: 'talent_descr.xilonen_ehecatls_roar',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Xilonen.s1.p1),
            },
            {
                type: 'hits',
                name: 'normal_hit_2',
                table: [
                    new StatTable('normal_hit_2_1', charTalentTables.Xilonen.s1.p2),
                    new StatTable('normal_hit_2_2', charTalentTables.Xilonen.s1.p3),
                ],
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Xilonen.s1.p4),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Xilonen.s1.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Xilonen.s1.p6),
            },
            {
                unit: 'def',
                table: new StatTable('plunge', charTalentTables.Xilonen.s1.p7),
            },
            {
                unit: 'def',
                table: new StatTable('plunge_low', charTalentTables.Xilonen.s1.p8),
            },
            {
                unit: 'def',
                table: new StatTable('plunge_high', charTalentTables.Xilonen.s1.p9),
            },
            {
                unit: 'def',
                table: new StatTable('xilonen_roller_1_dmg', charTalentTables.Xilonen.s1.p10),
            },
            {
                unit: 'def',
                table: new StatTable('xilonen_roller_2_dmg', charTalentTables.Xilonen.s1.p11),
            },
            {
                unit: 'def',
                table: new StatTable('xilonen_roller_3_dmg', charTalentTables.Xilonen.s1.p12),
            },
            {
                unit: 'def',
                table: new StatTable('xilonen_roller_4_dmg', charTalentTables.Xilonen.s1.p13),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Xilonen.s2_id,
        title: 'talent_name.xilonen_yohuals_scratch',
        description: 'talent_descr.xilonen_yohuals_scratch',
        items: [
            {
                unit: 'def',
                table: new StatTable('xilonen_rush_dmg', charTalentTables.Xilonen.s2.p1),
            },
            {
                table: new StatTable('xilonen_res_decrease', charTalentTables.Xilonen.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('xilonen_sample_duration', charTalentTables.Xilonen.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('xilonen_blessing_duration', charTalentTables.Xilonen.s2.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('xilonen_nightsoul', charTalentTables.Xilonen.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Xilonen.s2.p6),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Xilonen.s3_id,
        title: 'talent_name.xilonen_ocelotlicue_point',
        description: 'talent_descr.xilonen_ocelotlicue_point',
        items: [
            {
                unit: 'def',
                table: new StatTable('burst_dmg', charTalentTables.Xilonen.s3.p1),
            },
            {
                type: 'shield',
                unit: 'def',
                table: [
                    new StatTable('heal_dot', charTalentTables.Xilonen.s3.p2),
                    new StatTable('', charTalentTables.Xilonen.s3.p3),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('xilonen_duration', charTalentTables.Xilonen.s3.p4),
            },
            {
                unit: 'def',
                table: new StatTable('xilonen_beat_dmg', charTalentTables.Xilonen.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Xilonen.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Xilonen.s3.p7),
            },
        ],
    },
});

const A1AttackBonus = percent(charTalentTables.Xilonen.a1.p2);
const A4DefBonus = percent(charTalentTables.Xilonen.a4.p2);
const C2GeoBonus = percent(charTalentTables.Xilonen.c2.p4);
const C2PyroAtkPercent = percent(charTalentTables.Xilonen.c2.p1);
const C2HydroHpPercent = percent(charTalentTables.Xilonen.c2.p2);
const C2CryoCritDmg = percent(charTalentTables.Xilonen.c2.p3);
const C4DefDmgBonus = percent(charTalentTables.Xilonen.c4.p1);
const C6DefHeal = percent(charTalentTables.Xilonen.c6.p4);
const C6DefDmgBonus = percent(charTalentTables.Xilonen.c6.p2);

export const Xilonen = new DbObjectChar({
    name: 'xilonen',
    serializeId: 93,
    gameId: 10000103,
    iconClass: 'char-icon-xilonen',
    rarity: 5,
    element: 'geo',
    weapon: 'sword',
    origin: 'natlan',
    talents: Talents,
    statTable: charTables.Xilonen,
    features: [
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
            ]),
        }),
        new FeatureDamageMultihit({
            name: 'normal_hit_2',
            category: 'attack',
            damageType: 'normal',
            allowInfusion: true,
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_2_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_2_2'),
                        }),
                    ],
                },
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
            ]),
        }),
        new FeatureDamageNormal({
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2_1'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
            ])
        }),
        new FeatureDamageNormal({
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2_2'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
            ])
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
            ]),
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.xilonen_roller_1_dmg'),
                }),
            ],
            condition: new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.xilonen_roller_2_dmg'),
                }),
            ],
            condition: new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.xilonen_roller_3_dmg'),
                }),
            ],
            condition: new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.xilonen_roller_4_dmg'),
                }),
            ],
            condition: new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
        }),
        new FeatureDamageCharged({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
            ]),
        }),
        new FeatureDamagePlungeCollision({
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.xilonen_rush_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.xilonen_beat_dmg'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'burst',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'def*',
                    leveling: 'char_skill_burst',
                    values: Talents.getList('burst.heal_dot'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'other',
            partyHeal: true,
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_burst',
                    values: new StatTable('xilonen_heal_on_hit', [C6DefHeal]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
    ],
    multipliers: [
        new FeatureMultiplier({
            // Blooming Blessing raises all nearby party members' Normal,
            // Charged and Plunging Attack DMG from Xilonen's live DEF.
            receivers: RECEIVERS.TEAM,
            scaling: 'def*',
            source: 'constellation4',
            values: new ValueTable([C4DefDmgBonus]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'xilonen_suchitls_trance'}),
                new ConditionConstellation({constellation: 4}),
            ]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal', 'charged', 'plunge'],
            }),
        }),
        new FeatureMultiplier({
            scaling: 'def*',
            source: 'constellation6',
            values: new ValueTable([C6DefDmgBonus]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
                new ConditionConstellation({constellation: 6}),
            ]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal', 'plunge'],
            }),
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                xilonen_active_sampler_geo: 1,
            },
            subConditions: [
                new ConditionConstellation({constellation: 2}),
            ],
        }),
        new Condition({
            settings: {
                char_skill_elemental_bonus: 3,
            },
            subConditions: [
                new ConditionConstellation({constellation: 3}),
            ],
        }),
        new ConditionBoolean({
            // name: 'xilonen_blessing_state',
            name: 'common.nightsoul_blessing_state',
            serializeId: 1,
            title: 'talent_name.nightsoul_blessing_state',
            settings: {
                attack_infusion: 'geo',
                xilonen_active_sampler_geo: 1,
            },
        }),
        new ConditionBooleanXilonen({
            name: 'xilonen_samplers',
            serializeId: 2,
            title: 'talent_name.xilonen_samplers',
            description: 'talent_descr.xilonen_samplers',
        }),
        new ConditionStatic({
            title: 'talent_name.xilonen_netotiliztlis_echoes',
            description: 'talent_descr.xilonen_netotiliztlis_echoes_1',
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
                new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
                new ConditionBoolean({name: 'xilonen_support_mode'}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.xilonen_netotiliztlis_echoes',
            description: 'talent_descr.xilonen_netotiliztlis_echoes_2',
            info: {ascension: 1},
            stats: {
                dmg_normal: A1AttackBonus,
                dmg_plunge: A1AttackBonus,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
                new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
                new ConditionBoolean({name: 'xilonen_damage_mode'}),
            ],
        }),
        new ConditionBoolean({
            name: 'xilonen_portable_armored_sheath',
            serializeId: 3,
            title: 'talent_name.xilonen_portable_armored_sheath',
            description: 'talent_descr.xilonen_portable_armored_sheath',
            info: {ascension: 4},
            stats: {
                def_percent: A4DefBonus,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        new ConditionLevels({
            levelSetting: 'char_skill_elemental',
            // Source Samples lower nearby opponents' corresponding RES.
            receivers: RECEIVERS.TEAM,
            stats: [
                Talents.getMulti({
                    name: 'enemy_res_geo',
                    from: 'skill.xilonen_res_decrease',
                    multi: -1,
                }),
            ],
            subConditions: [
                new ConditionBoolean({name: 'xilonen_sampler_geo'}),
                new ConditionBoolean({name: 'xilonen_active_sampler_geo'}),
            ]
        }),
        new ConditionLevels({
            levelSetting: 'char_skill_elemental',
            // Source Samples lower nearby opponents' corresponding RES.
            receivers: RECEIVERS.TEAM,
            stats: [
                Talents.getMulti({
                    name: 'enemy_res_pyro',
                    from: 'skill.xilonen_res_decrease',
                    multi: -1,
                }),
            ],
            subConditions: [
                new ConditionBoolean({name: 'xilonen_sampler_pyro'}),
                new ConditionBoolean({name: 'xilonen_active_sampler_pyro'}),
            ]
        }),
        new ConditionLevels({
            levelSetting: 'char_skill_elemental',
            // Source Samples lower nearby opponents' corresponding RES.
            receivers: RECEIVERS.TEAM,
            stats: [
                Talents.getMulti({
                    name: 'enemy_res_hydro',
                    from: 'skill.xilonen_res_decrease',
                    multi: -1,
                }),
            ],
            subConditions: [
                new ConditionBoolean({name: 'xilonen_sampler_hydro'}),
                new ConditionBoolean({name: 'xilonen_active_sampler_hydro'}),
            ]
        }),
        new ConditionLevels({
            levelSetting: 'char_skill_elemental',
            // Source Samples lower nearby opponents' corresponding RES.
            receivers: RECEIVERS.TEAM,
            stats: [
                Talents.getMulti({
                    name: 'enemy_res_cryo',
                    from: 'skill.xilonen_res_decrease',
                    multi: -1,
                }),
            ],
            subConditions: [
                new ConditionBoolean({name: 'xilonen_sampler_cryo'}),
                new ConditionBoolean({name: 'xilonen_active_sampler_cryo'}),
            ]
        }),
        new ConditionLevels({
            levelSetting: 'char_skill_elemental',
            // Source Samples lower nearby opponents' corresponding RES.
            receivers: RECEIVERS.TEAM,
            stats: [
                Talents.getMulti({
                    name: 'enemy_res_electro',
                    from: 'skill.xilonen_res_decrease',
                    multi: -1,
                }),
            ],
            subConditions: [
                new ConditionBoolean({name: 'xilonen_sampler_electro'}),
                new ConditionBoolean({name: 'xilonen_active_sampler_electro'}),
            ]
        }),

    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.xilonen_sabbatical_phrase',
                    description: 'talent_descr.xilonen_sabbatical_phrase',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.xilonen_chiucue_mix',
                    description: 'talent_descr.xilonen_chiucue_mix',
                    stats: {
                        text_percent_geo: C2GeoBonus,
                        text_percent_pyro: C2PyroAtkPercent,
                        text_percent_hydro: C2HydroHpPercent,
                        text_percent_cryo: C2CryoCritDmg,
                    },
                }),
                new Condition({
                    stats: {
                        dmg_all: C2GeoBonus,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'xilonen_sampler_geo'}),
                        new ConditionBoolean({name: 'xilonen_active_sampler_geo'}),
                    ]),
                }),
                // Chiucue Mix reaches matching teammates; Xilonen keeps her
                // own copy above.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        dmg_all: C2GeoBonus,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'xilonen_sampler_geo'}),
                        new ConditionBoolean({name: 'xilonen_active_sampler_geo'}),
                        new ConditionReceiver({
                            condition: new ConditionBooleanCharElement({element: ['geo']}),
                        }),
                    ]),
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        atk_percent: C2PyroAtkPercent,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'xilonen_sampler_pyro'}),
                        new ConditionBoolean({name: 'xilonen_active_sampler_pyro'}),
                        new ConditionReceiver({
                            condition: new ConditionBooleanCharElement({element: ['pyro']}),
                        }),
                    ]),
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        hp_percent: C2HydroHpPercent,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'xilonen_sampler_hydro'}),
                        new ConditionBoolean({name: 'xilonen_active_sampler_hydro'}),
                        new ConditionReceiver({
                            condition: new ConditionBooleanCharElement({element: ['hydro']}),
                        }),
                    ]),
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        crit_dmg: C2CryoCritDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'xilonen_sampler_cryo'}),
                        new ConditionBoolean({name: 'xilonen_active_sampler_cryo'}),
                        new ConditionReceiver({
                            condition: new ConditionBooleanCharElement({element: ['cryo']}),
                        }),
                    ]),
                }),
            ],
        },
        {},
        {
            conditions: [
                new ConditionBoolean({
                    name: 'xilonen_suchitls_trance',
                    serializeId: 4,
                    title: 'talent_name.xilonen_suchitls_trance',
                    description: 'talent_descr.xilonen_suchitls_trance',
                    stats: {
                        text_percent_dmg: C4DefDmgBonus,
                        normal_base_def_percent: C4DefDmgBonus,
                        plunge_base_def_percent: C4DefDmgBonus,
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
                    title: 'talent_name.xilonen_imperishable_night_carnival',
                    description: 'talent_descr.xilonen_imperishable_night_carnival',
                    stats: {
                        normal_base_def_percent: C6DefDmgBonus,
                        plunge_base_def_percent: C6DefDmgBonus,
                        text_percent_heal: C6DefHeal,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
                    ],
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox'], [4, 'checkbox'], [5, 'checkbox'], [6, 'checkbox'], [7, 'number']],
});
