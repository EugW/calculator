import { Condition } from "../../classes/Condition";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { StatTable } from "../../classes/StatTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Aino.s1_id,
        title: 'talent_name.aino_bish_bash_bosh_repair',
        description: 'talent_descr.aino_bish_bash_bosh_repair',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Aino.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Aino.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Aino.s1.p3),
            },
            {
                table: new StatTable('charged_hit_loop', charTalentTables.Aino.s1.p4),
            },
            {
                table: new StatTable('charged_hit_final', charTalentTables.Aino.s1.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Aino.s1.p6),
            },
            {
                table: new StatTable('plunge', charTalentTables.Aino.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Aino.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Aino.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Aino.s2_id,
        title: 'talent_name.aino_musecatcher',
        description: 'talent_descr.aino_musecatcher',
        items: [
            {
                table: new StatTable('aino_stage_1_dmg', charTalentTables.Aino.s2.p1),
            },
            {
                table: new StatTable('aino_stage_2_dmg', charTalentTables.Aino.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Aino.s2.p3),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Aino.s3_id,
        title: 'talent_name.aino_precision_hydronic_cooler',
        description: 'talent_descr.aino_precision_hydronic_cooler',
        items: [
            {
                table: new StatTable('aino_water_ball_dmg', charTalentTables.Aino.s3.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('aino_duration', charTalentTables.Aino.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Aino.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Aino.s3.p4),
            },
        ],
    },
});

const A4EmScale = 50;
const C1Em = 80;
const C2AtkScale = 25;
const C2EmScale = 100;
const C6DmgBonus = 15;
const C6DmgBonusAscendant = 20;



export const Aino = new DbObjectChar({
    name: 'aino',
    serializeId: 109,
    gameId: 10000121,
    iconClass: 'char-icon-aino',
    rarity: 4,
    element: 'hydro',
    weapon: 'claymore',
    origin: 'nodkrai',
    talents: Talents,
    statTable: charTables.Aino,
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
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit_loop',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_loop'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit_final',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_final'),
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
            name: 'aino_stage_1_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.aino_stage_1_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'aino_stage_2_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.aino_stage_2_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'aino_water_ball_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.aino_water_ball_dmg'),
                }),
                new FeatureMultiplier({
                    source: 'talent_passive_2',
                    scaling: 'mastery*',
                    values: new StatTable('aino_a4_flat_dmg', [A4EmScale]),
                    condition: new ConditionAscensionChar({ascension: 4}),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'aino_c2_water_ball_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation2',
                    scaling: 'atk*',
                    values: new StatTable('aino_c2_atk_dmg', [C2AtkScale]),
                }),
                new FeatureMultiplier({
                    source: 'constellation2',
                    scaling: 'mastery*',
                    values: new StatTable('aino_c2_em_dmg', [C2EmScale]),
                }),
                new FeatureMultiplier({
                    source: 'talent_passive_2',
                    scaling: 'mastery*',
                    values: new StatTable('aino_a4_flat_dmg', [A4EmScale]),
                    condition: new ConditionAscensionChar({ascension: 4}),
                }),
            ],
            condition: new ConditionConstellation({constellation: 2}),
        }),

    ],
    conditions: [
        new Condition({
            settings: {
                allowed_lunarbloom: 1,
            },
        }),
        new ConditionCalcMoonsign(),
        new ConditionStatic({
            title: 'talent_name.aino_modular_efficiency_protocol',
            description: 'talent_descr.aino_modular_efficiency_protocol',
            info: {ascension: 1},
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.aino_structured_power_booster',
            description: 'talent_descr.aino_structured_power_booster',
            info: {ascension: 4},
            stats: {
                text_percent: A4EmScale,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionStatic({
            title: 'talent_name.aino_force_limit_analysis',
            description: 'talent_descr.aino_force_limit_analysis',
        }),
    ],
    postEffects: [

    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'aino_the_theory_of_ashfield_equilibrium',
                    serializeId: 1,
                    title: 'talent_name.aino_the_theory_of_ashfield_equilibrium',
                    description: 'talent_descr.aino_the_theory_of_ashfield_equilibrium',
                    stats: {
                        mastery: C1Em,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.aino_the_principle_of_transference_in_gear_differentials',
                    description: 'talent_descr.aino_the_principle_of_transference_in_gear_differentials',
                    stats: {
                        text_percent_atk: C2AtkScale,
                        text_percent_em: C2EmScale,
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
                    title: 'talent_name.aino_butter_and_cats_and_the_law_of_energy_supply',
                    description: 'talent_descr.aino_butter_and_cats_and_the_law_of_energy_supply',
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
                new ConditionBooleanLevels({
                    name: 'aino_the_burden_of_creative_genius',
                    serializeId: 2,
                    title: 'talent_name.aino_the_burden_of_creative_genius',
                    description: 'talent_descr.aino_the_burden_of_creative_genius',
                    levelSetting: 'party_moonsign',
                    stats: [
                        new StatTable('dmg_reaction_lunarbloom', [C6DmgBonus, C6DmgBonus + C6DmgBonusAscendant]),
                        new StatTable('dmg_reaction_lunarcharged', [C6DmgBonus, C6DmgBonus + C6DmgBonusAscendant]),
                        new StatTable('dmg_reaction_bloom', [C6DmgBonus, C6DmgBonus + C6DmgBonusAscendant]),
                        new StatTable('dmg_reaction_electrocharged', [C6DmgBonus, C6DmgBonus + C6DmgBonusAscendant]),
                        new StatTable('dmg_reaction_lunarcrystallize', [C6DmgBonus, C6DmgBonus + C6DmgBonusAscendant]),
                    ],
                }),
            ],
        },
    ]),
    partyData: {
        conditions: [
            new Condition({settings: {allowed_lunarbloom: 1}}),
            new ConditionBoolean({
                name: 'party.aino_the_theory_of_ashfield_equilibrium',
                serializeId: 1,
                title: 'talent_name.aino_the_theory_of_ashfield_equilibrium',
                description: 'talent_descr.aino_the_theory_of_ashfield_equilibrium',
                info: {constellation: 1},
                rotation: 'party',
                stats: {
                    mastery: C1Em,
                },
            }),
            new ConditionCalcMoonsign(),
            new ConditionBooleanLevels({
                name: 'party_aino_c6_burst',
                serializeId: 2,
                title: 'talent_name.aino_the_burden_of_creative_genius',
                description: 'talent_descr.aino_the_burden_of_creative_genius',
                info: {constellation: 6},
                rotation: 'party',
                levelSetting: 'party_moonsign',
                stats: [
                     new StatTable('dmg_reaction_lunarbloom', [C6DmgBonus, C6DmgBonus + C6DmgBonusAscendant]),
                     new StatTable('dmg_reaction_lunarcharged', [C6DmgBonus, C6DmgBonus + C6DmgBonusAscendant]),
                     new StatTable('dmg_reaction_bloom', [C6DmgBonus, C6DmgBonus + C6DmgBonusAscendant]),
                     new StatTable('dmg_reaction_electrocharged', [C6DmgBonus, C6DmgBonus + C6DmgBonusAscendant]),
                     new StatTable('dmg_reaction_lunarcrystallize', [C6DmgBonus, C6DmgBonus + C6DmgBonusAscendant]),
                ],
            }),
        ],
    },
});
