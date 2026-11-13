import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageChargedAimed } from "../../classes/Feature2/Damage/Charged/Aimed";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Faruzan.s1_id,
        title: 'talent_name.faruzan_parthian_shot',
        description: 'talent_descr.faruzan_parthian_shot',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Faruzan.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Faruzan.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Faruzan.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Faruzan.s1.p4),
            },
            {
                table: new StatTable('aimed', charTalentTables.Faruzan.s1.p5),
            },
            {
                table: new StatTable('charged_aimed', charTalentTables.Faruzan.s1.p6),
            },
            {
                table: new StatTable('plunge', charTalentTables.Faruzan.s1.p7),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Faruzan.s1.p8),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Faruzan.s1.p9),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Faruzan.s2_id,
        title: 'talent_name.faruzan_wind_realm_of_nasamjnin',
        description: 'talent_descr.faruzan_wind_realm_of_nasamjnin',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.Faruzan.s2.p1),
            },
            {
                table: new StatTable('faruzan_pressurized_collapse_vortex_dmg', charTalentTables.Faruzan.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('faruzan_duration', charTalentTables.Faruzan.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Faruzan.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Faruzan.s3_id,
        title: 'talent_name.faruzan_the_winds_secret_ways',
        description: 'talent_descr.faruzan_the_winds_secret_ways',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Faruzan.s3.p1),
            },
            {
                table: new StatTable('faruzan_anemo_dmg_bonus', charTalentTables.Faruzan.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('faruzan_duration_1', charTalentTables.Faruzan.s3.p3),
            },
            {
                table: new StatTable('faruzan_anemo_res_decrease', charTalentTables.Faruzan.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('faruzan_duration_2', charTalentTables.Faruzan.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Faruzan.s3.p6),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Faruzan.s3.p7),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Faruzan.s3.p8),
            },
        ],
    },
});

const TalentValues = {
    A4AtkScale: percent(charTalentTables.Faruzan.a4.p1),
    C6CritDmgAnemo: percent(charTalentTables.Faruzan.c6.p1),
};

export const Faruzan = new DbObjectChar({
    name: 'faruzan',
    serializeId: 64,
    gameId: 10000076,
    iconClass: "char-icon-faruzan",
    rarity: 4,
    element: 'anemo',
    weapon: 'bow',
    talents: Talents,
    origin: 'sumeru',
    statTable: charTables.Faruzan,
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
        new FeatureDamageChargedAimed({
            name: 'aimed',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.aimed'),
                }),
            ],
        }),
        new FeatureDamageChargedAimed({
            name: 'charged_aimed',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_aimed'),
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
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'faruzan_pressurized_collapse_vortex_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.faruzan_pressurized_collapse_vortex_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                char_skill_burst_bonus: 3,
            },
            subConditions: [
                new ConditionConstellation({constellation: 5}),
            ],
        }),
        new ConditionBooleanLevels({
            name: 'faruzan_wind_bale',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.faruzan_wind_bale',
            description: 'talent_descr.faruzan_wind_bale',
            levelSetting: 'char_skill_burst',
            stats: [
                Talents.getMulti({
                    name: 'enemy_res_anemo',
                    from: 'burst.faruzan_anemo_res_decrease',
                    multi: -1,
                }),
            ],
        }),
        new ConditionBooleanLevels({
            name: 'faruzan_wind_benefit',
            serializeId: 2,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.faruzan_wind_benefit',
            description: 'talent_descr.faruzan_wind_benefit',
            levelSetting: 'char_skill_burst',
            stats: [
                Talents.getAlias('burst.faruzan_anemo_dmg_bonus', 'dmg_anemo'),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.faruzan_impetuous_flow',
            description: 'talent_descr.faruzan_impetuous_flow',
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionBoolean({
            name: 'faruzan_lost_wisdom_of_the_seven_caverns',
            serializeId: 3,
            title: 'talent_name.faruzan_lost_wisdom_of_the_seven_caverns',
            description: 'talent_descr.faruzan_lost_wisdom_of_the_seven_caverns',
            info: {ascension: 4},
            stats: {
                text_percent_dmg: TalentValues.A4AtkScale,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
                new ConditionBoolean({name: 'faruzan_wind_benefit'}),
            ],
        }),
    ],
    multipliers: [
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'atk_base',
            source: 'ascension4',
            values: new ValueTable([TalentValues.A4AtkScale]),
            condition: new ConditionBoolean({name: 'faruzan_lost_wisdom_of_the_seven_caverns'}),
            target: new FeatureMultiplierTarget({
                damageElements: ['anemo'],
            }),
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.faruzan_truth_by_any_means',
                    description: 'talent_descr.faruzan_truth_by_any_means',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.faruzan_overzealous_intellect',
                    description: 'talent_descr.faruzan_overzealous_intellect',
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
                    title: 'talent_name.faruzan_divine_comprehension',
                    description: 'talent_descr.faruzan_divine_comprehension',
                }),
            ],
        },
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.faruzan_the_wondrous_path_of_truth',
                    description: 'talent_descr.faruzan_the_wondrous_path_of_truth_1',
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        crit_dmg_anemo: TalentValues.C6CritDmgAnemo,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'faruzan_wind_benefit'}),
                    ],
                }),
                new ConditionStatic({
                    title: 'talent_name.faruzan_the_wondrous_path_of_truth',
                    description: 'talent_descr.faruzan_the_wondrous_path_of_truth_2',
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'number'], [3, 'checkbox'], [4, 'checkbox'], [5, 'checkbox'], [6, 'checkbox'], [7, 'checkbox']],
});
