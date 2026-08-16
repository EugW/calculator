import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionOr } from "../../classes/Condition/Or";
import { ConditionRadianceStellarGlimmer, RADIANCE_STELLARCONDUCT, RADIANCE_STELLARSWIRL } from "../../classes/Condition/RadianceStellarGlimmer";
import { ConditionStacks } from "../../classes/Condition/Stacks";
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
import { FeatureDamageStellarConduct } from "../../classes/Feature2/Damage/StellarConduct";
import { FeatureDamageStellarSwirl } from "../../classes/Feature2/Damage/StellarSwirl";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Sandrone.s1_id,
        title: 'talent_name.sandrone_self_evident_proposition',
        description: 'talent_descr.sandrone_self_evident_proposition',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Sandrone.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Sandrone.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Sandrone.s1.p3),
            },
            {
                table: new StatTable('sandrone_sweeping_fire', charTalentTables.Sandrone.s1.p4),
            },
            {
                table: new StatTable('sandrone_condensed_beam', charTalentTables.Sandrone.s1.p5),
            },
            {
                table: new StatTable('sandrone_condensed_beam_stellarconduct', charTalentTables.Sandrone.s1.p6),
            },
            {
                table: new StatTable('sandrone_condensed_beam_stellarswirl', charTalentTables.Sandrone.s1.p11),
            },
            {
                table: new StatTable('sandrone_power_overdrive', charTalentTables.Sandrone.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Sandrone.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Sandrone.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Sandrone.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Sandrone.s2_id,
        title: 'talent_name.sandrone_differential_analysis',
        description: 'talent_descr.sandrone_differential_analysis',
        items: [
            {
                table: new StatTable('sandrone_prism_shot', charTalentTables.Sandrone.s2.p1),
            },
            {
                table: new StatTable('sandrone_prism_shot_stellarconduct', charTalentTables.Sandrone.s2.p2),
            },
            {
                table: new StatTable('sandrone_prism_shot_stellarswirl', charTalentTables.Sandrone.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Sandrone.s2.p3),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Sandrone.s3_id,
        title: 'talent_name.sandrone_q_e_d',
        description: 'talent_descr.sandrone_q_e_d',
        items: [
            {
                table: new StatTable('sandrone_bombardment', charTalentTables.Sandrone.s3.p1),
            },
            {
                table: new StatTable('sandrone_convective_inhibition_ray', charTalentTables.Sandrone.s3.p2),
            },
            {
                table: new StatTable('sandrone_convective_inhibition_ray_stellarconduct', charTalentTables.Sandrone.s3.p3),
            },
            {
                table: new StatTable('sandrone_convective_inhibition_ray_stellarswirl', charTalentTables.Sandrone.s3.p6),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Sandrone.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Sandrone.s3.p5),
            },
        ],
    },
    links: [11330001, 11330002, 11330003],
});

const A1RefinedPrismMultiplier = 4;
const A1RefinedTacticsPerStack = 10;
const A4EmScale = 8;
const A4EmCap = 160;
const LightBaseScale = 0.7;
const LightBaseCap = 14;
const C1StellarGlimmerDmg = 30;
const C2CondensedBeamCritDmg = 40;
const C2CondensedBeamCritDmgStack = 20;
const C4CannonDmg = 125;
const C4CannonSwirlDmg = 187.5;
const C6ClusterDmg = 100;
const C6ClusterConductDmg = 80;
const C6ClusterSwirlDmg = 120;
const C6StellarGlimmerElevation = 20;

const radianceConductName = 'sandrone_radiance_stellarconduct';
const radianceSwirlName = 'sandrone_radiance_stellarswirl';
const radianceConductCondition = new ConditionRadianceStellarGlimmer({
    conductName: radianceConductName,
    swirlName: radianceSwirlName,
    mode: RADIANCE_STELLARCONDUCT,
});
const radianceSwirlCondition = new ConditionRadianceStellarGlimmer({
    conductName: radianceConductName,
    swirlName: radianceSwirlName,
    mode: RADIANCE_STELLARSWIRL,
});
const anyRadianceCondition = new ConditionOr([
    radianceConductCondition,
    radianceSwirlCondition,
]);
const decodingCondition = new ConditionBoolean({name: 'sandrone_decoding'});
const decodingPowerAbove50 = new ConditionBooleanValue({setting: 'sandrone_decoding_power', cond: 'gt', value: 50});
const a1RefinedPrismConductCondition = new ConditionAnd([
    new ConditionAscensionChar({ascension: 1}),
    radianceConductCondition,
    decodingPowerAbove50,
]);
const a1RefinedPrismSwirlCondition = new ConditionAnd([
    new ConditionAscensionChar({ascension: 1}),
    radianceSwirlCondition,
    decodingPowerAbove50,
]);

const a4EmPost = new PostEffectStatsAtk({
    percent: new StatTable('mastery', [A4EmScale / 100]),
    statCap: new ValueTable([A4EmCap]),
    condition: new ConditionAscensionChar({ascension: 4}),
});

const lightBasePost = new PostEffectStatsAtk({
    percent: new StatTable('stellarglimmer_multi', [LightBaseScale / 100]),
    statCap: new ValueTable([LightBaseCap]),
});

export const Sandrone = new DbObjectChar({
    name: 'sandrone',
    serializeId: 123,
    gameId: 10000133,
    iconClass: 'char-icon-sandrone',
    rarity: 5,
    element: 'cryo',
    weapon: 'claymore',
    origin: 'snezhnaya',
    talents: Talents,
    statTable: charTables.Sandrone,
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
            name: 'sandrone_sweeping_fire',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.sandrone_sweeping_fire'),
                }),
            ],
            condition: decodingCondition,
        }),
        new FeatureDamageCharged({
            name: 'sandrone_condensed_beam',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.sandrone_condensed_beam'),
                }),
            ],
            condition: new ConditionAnd([
                decodingCondition,
                new ConditionNot([anyRadianceCondition]),
            ]),
        }),
        new FeatureDamageStellarConduct({
            category: 'attack',
            name: 'sandrone_condensed_beam_stellarconduct',
            element: 'cryo',
            tags: ['sandrone_condensed_beam'],
            critDamageBonuses: ['crit_dmg_sandrone_condensed_beam'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.sandrone_condensed_beam_stellarconduct'),
                }),
            ],
            condition: new ConditionAnd([
                decodingCondition,
                radianceConductCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'attack',
            name: 'sandrone_condensed_beam_stellarswirl',
            element: 'cryo',
            tags: ['sandrone_condensed_beam'],
            critDamageBonuses: ['crit_dmg_sandrone_condensed_beam'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.sandrone_condensed_beam_stellarswirl'),
                }),
            ],
            condition: new ConditionAnd([
                decodingCondition,
                radianceSwirlCondition,
            ]),
        }),
        new FeatureDamageCharged({
            name: 'sandrone_power_overdrive',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.sandrone_power_overdrive'),
                }),
            ],
            condition: new ConditionBoolean({name: 'sandrone_power_overdrive'}),
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
            name: 'plunge_high',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'sandrone_prism_shot_1',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.sandrone_prism_shot'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'sandrone_prism_shot_2',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.sandrone_prism_shot'),
                }),
            ],
            condition: new ConditionNot([anyRadianceCondition]),
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'sandrone_prism_shot_stellarconduct',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.sandrone_prism_shot_stellarconduct'),
                }),
            ],
            condition: new ConditionAnd([
                radianceConductCondition,
                new ConditionNot([a1RefinedPrismConductCondition]),
            ]),
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'sandrone_refined_prism_shot_stellarconduct',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: A1RefinedPrismMultiplier,
                    scalingSource: 'ascension1',
                    values: Talents.get('skill.sandrone_prism_shot_stellarconduct'),
                }),
            ],
            condition: a1RefinedPrismConductCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'sandrone_prism_shot_stellarswirl',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.sandrone_prism_shot_stellarswirl'),
                }),
            ],
            condition: new ConditionAnd([
                radianceSwirlCondition,
                new ConditionNot([a1RefinedPrismSwirlCondition]),
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'sandrone_refined_prism_shot_stellarswirl',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: A1RefinedPrismMultiplier,
                    scalingSource: 'ascension1',
                    values: Talents.get('skill.sandrone_prism_shot_stellarswirl'),
                }),
            ],
            condition: a1RefinedPrismSwirlCondition,
        }),
        new FeatureDamageBurst({
            name: 'sandrone_bombardment',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.sandrone_bombardment'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'sandrone_convective_inhibition_ray',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.sandrone_convective_inhibition_ray'),
                }),
            ],
            condition: new ConditionNot([anyRadianceCondition]),
        }),
        new FeatureDamageStellarConduct({
            category: 'burst',
            name: 'sandrone_convective_inhibition_ray_stellarconduct',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.sandrone_convective_inhibition_ray_stellarconduct'),
                }),
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    source: 'ascension1',
                    scalingMultiplier: A1RefinedTacticsPerStack / 100,
                    scalingSource: 'sandrone_refined_tactics',
                    stacksLeveling: 'sandrone_refined_tactics',
                    maxStacks: 10,
                    values: Talents.get('burst.sandrone_convective_inhibition_ray_stellarconduct'),
                }),
            ],
            condition: radianceConductCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'burst',
            name: 'sandrone_convective_inhibition_ray_stellarswirl',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.sandrone_convective_inhibition_ray_stellarswirl'),
                }),
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    source: 'ascension1',
                    scalingMultiplier: A1RefinedTacticsPerStack / 100,
                    scalingSource: 'sandrone_refined_tactics',
                    stacksLeveling: 'sandrone_refined_tactics',
                    maxStacks: 10,
                    values: Talents.get('burst.sandrone_convective_inhibition_ray_stellarswirl'),
                }),
            ],
            condition: radianceSwirlCondition,
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'sandrone_a_ladys_code_of_conduct',
            postEffect: a4EmPost,
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'sandrone_light_of_rationalisme',
            postEffect: lightBasePost,
            format: 'percent',
        }),
        new FeatureDamageStellarConduct({
            category: 'other',
            name: 'sandrone_prismatic_resonance_cannon_stellarconduct',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new StatTable('sandrone_prismatic_resonance_cannon_stellarconduct', [C4CannonDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                radianceConductCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'other',
            name: 'sandrone_prismatic_resonance_cannon_stellarswirl',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new StatTable('sandrone_prismatic_resonance_cannon_stellarswirl', [C4CannonSwirlDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                radianceSwirlCondition,
            ]),
        }),
        new FeatureDamageCharged({
            name: 'sandrone_condensed_cluster_beam',
            element: 'cryo',
            hits: 4,
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation6',
                    values: new StatTable('sandrone_condensed_cluster_beam', [C6ClusterDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                decodingCondition,
                new ConditionNot([anyRadianceCondition]),
            ]),
        }),
        new FeatureDamageStellarConduct({
            category: 'attack',
            name: 'sandrone_condensed_cluster_beam_stellarconduct',
            element: 'cryo',
            hits: 4,
            tags: ['sandrone_condensed_beam'],
            critDamageBonuses: ['crit_dmg_sandrone_condensed_beam'],
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation6',
                    values: new StatTable('sandrone_condensed_cluster_beam_stellarconduct', [C6ClusterConductDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                decodingCondition,
                radianceConductCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'attack',
            name: 'sandrone_condensed_cluster_beam_stellarswirl',
            element: 'cryo',
            hits: 4,
            tags: ['sandrone_condensed_beam'],
            critDamageBonuses: ['crit_dmg_sandrone_condensed_beam'],
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation6',
                    values: new StatTable('sandrone_condensed_cluster_beam_stellarswirl', [C6ClusterSwirlDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                decodingCondition,
                radianceSwirlCondition,
            ]),
        }),
    ],
    conditions: [
        new Condition({settings: {
            allowed_stellarconduct: 1,
            allowed_stellarswirl: 1,
        }}),
        new ConditionBoolean({
            name: 'sandrone_decoding',
            serializeId: 1,
            title: 'talent_name.n11330001',
            description: 'talent_descr.n11330001',
        }),
        new ConditionNumber({
            name: 'sandrone_decoding_power',
            serializeId: 2,
            title: 'talent_name.n11330002',
            description: 'talent_descr.n11330002',
            max: 100,
            allowMinZero: true,
            noStat: true,
        }),
        new ConditionBoolean({
            name: 'sandrone_power_overdrive',
            serializeId: 3,
            title: 'talent_name.sandrone_power_overdrive',
            description: 'talent_descr.n11330002',
        }),
        new ConditionBoolean({
            name: radianceConductName,
            serializeId: 4,
            title: 'talent_name.sandrone_light_of_rationalisme',
            description: 'talent_descr.sandrone_light_of_rationalisme',
            stats: {
                text_percent: LightBaseScale,
                text_percent_max: LightBaseCap,
            },
            condition: new ConditionBoolean({name: 'polestar_field'}),
        }),
        new ConditionBoolean({
            name: radianceSwirlName,
            serializeId: 9,
            title: 'talent_name.sandrone_light_of_rationalisme',
            description: 'talent_descr.sandrone_light_of_rationalisme',
            stats: {
                text_percent: LightBaseScale,
                text_percent_max: LightBaseCap,
            },
            condition: new ConditionNot([
                new ConditionBoolean({name: radianceConductName}),
            ]),
        }),
        new ConditionStatic({
            title: 'talent_name.sandrone_eternal_speculation_engine',
            description: 'talent_descr.sandrone_eternal_speculation_engine',
            info: {ascension: 1},
            stats: {
                text_percent: A1RefinedTacticsPerStack,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStacks({
            name: 'sandrone_refined_tactics',
            serializeId: 5,
            title: 'talent_name.sandrone_eternal_speculation_engine',
            description: 'talent_descr.sandrone_eternal_speculation_engine',
            maxStacks: 10,
            noStat: true,
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
                anyRadianceCondition,
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.sandrone_a_ladys_code_of_conduct',
            description: 'talent_descr.sandrone_a_ladys_code_of_conduct',
            info: {ascension: 4},
            stats: {
                text_percent: A4EmScale,
                text_value: A4EmCap,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'sandrone_morrow_after_the_golden_dusk',
                    serializeId: 6,
                    title: 'talent_name.sandrone_morrow_after_the_golden_dusk',
                    description: 'talent_descr.sandrone_morrow_after_the_golden_dusk',
                    stats: {
                        dmg_stellarglimmer: C1StellarGlimmerDmg,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'sandrone_an_heiress_gazed_into_the_looking_glass',
                    serializeId: 7,
                    title: 'talent_name.sandrone_an_heiress_gazed_into_the_looking_glass',
                    description: 'talent_descr.sandrone_an_heiress_gazed_into_the_looking_glass',
                    stats: {
                        crit_dmg_sandrone_condensed_beam: C2CondensedBeamCritDmg,
                    },
                    subConditions: [
                        anyRadianceCondition,
                    ],
                }),
                new ConditionStacks({
                    name: 'sandrone_condensed_beam_crit_stacks',
                    serializeId: 8,
                    title: 'talent_name.sandrone_an_heiress_gazed_into_the_looking_glass',
                    description: 'talent_descr.sandrone_an_heiress_gazed_into_the_looking_glass',
                    maxStacks: 3,
                    stats: [
                        new StatTable('crit_dmg_sandrone_condensed_beam', [C2CondensedBeamCritDmgStack]),
                    ],
                    subConditions: [
                        new ConditionBoolean({name: 'sandrone_an_heiress_gazed_into_the_looking_glass'}),
                    ],
                }),
            ],
        },
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_attack_bonus: 3,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.sandrone_in_knowledge_lies_the_worlds_true_ground',
                    description: 'talent_descr.sandrone_in_knowledge_lies_the_worlds_true_ground',
                    stats: {
                        text_percent: C4CannonDmg,
                        text_percent_dmg_2: C4CannonSwirlDmg,
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
                    title: 'talent_name.sandrone_narcissus_wakes_her_eyes_upon_the_dawn',
                    description: 'talent_descr.sandrone_narcissus_wakes_her_eyes_upon_the_dawn',
                    stats: {
                        dmg_stellarglimmer_special: C6StellarGlimmerElevation,
                        text_percent_dmg_1: C6ClusterDmg,
                        text_percent_dmg_2: C6ClusterConductDmg,
                    },
                }),
            ],
        },
    ]),
    postEffects: [
        a4EmPost,
        lightBasePost,
    ],
    partyData: {
        loadStats: {
            stats: ['atk_total'],
        },
        conditions: [
            new Condition({settings: {
                allowed_stellarconduct: 1,
                allowed_stellarswirl: 1,
            }}),
            new ConditionNumber({
                name: 'sandrone_atk_total',
                title: 'talent_name.stats_total_atk',
                partyStat: 'atk_total',
                serializeId: 1,
                rotation: 'party',
                max: 10000,
            }),
            new ConditionStatic({
                title: 'talent_name.sandrone_light_of_rationalisme',
                description: 'talent_descr.sandrone_light_of_rationalisme',
                stats: {
                    text_percent: LightBaseScale,
                    text_percent_max: LightBaseCap,
                },
            }),
            new ConditionBoolean({
                name: 'party.sandrone_morrow_after_the_golden_dusk',
                serializeId: 2,
                title: 'talent_name.sandrone_morrow_after_the_golden_dusk',
                description: 'talent_descr.sandrone_morrow_after_the_golden_dusk',
                info: {constellation: 1},
                rotation: 'party',
                stats: {
                    dmg_stellarglimmer: C1StellarGlimmerDmg,
                },
            }),
        ],
        postEffects: [
            new PostEffectStats({
                from: 'sandrone_atk_total',
                percent: new StatTable('stellarglimmer_multi', [LightBaseScale / 100]),
                statCap: new ValueTable([LightBaseCap]),
            }),
        ],
    },
});
