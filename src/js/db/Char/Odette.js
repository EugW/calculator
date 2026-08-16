import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionNumberTalent } from "../../classes/Condition/Number/Talent";
import { ConditionOr } from "../../classes/Condition/Or";
import {
    ConditionRadianceStellarGlimmer,
    RADIANCE_STELLARCONDUCT,
    RADIANCE_STELLARSWIRL,
} from "../../classes/Condition/RadianceStellarGlimmer";
import { ConditionStacks } from "../../classes/Condition/Stacks";
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
import { FeatureDamageStellarConduct } from "../../classes/Feature2/Damage/StellarConduct";
import { FeatureDamageStellarSwirl } from "../../classes/Feature2/Damage/StellarSwirl";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../classes/StatTable";
import { StatTableConditions } from "../../classes/StatTable/Condition";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Odette.s1_id,
        title: 'talent_name.odette_snow_swan_variation',
        description: 'talent_descr.odette_snow_swan_variation',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Odette.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Odette.s1.p2),
            },
            {
                type: 'hits',
                name: 'normal_hit_3',
                table: [
                    new StatTable('normal_hit_3_1', charTalentTables.Odette.s1.p3),
                    new StatTable('normal_hit_3_2', charTalentTables.Odette.s1.p4),
                ],
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Odette.s1.p5),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Odette.s1.p6),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Odette.s1.p7),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Odette.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Odette.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Odette.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Odette.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Odette.s2_id,
        title: 'talent_name.odette_phantom_night_dancers',
        description: 'talent_descr.odette_phantom_night_dancers',
        items: [
            {
                table: new StatTable('odette_phantom_night_dancers', charTalentTables.Odette.s2.p1),
            },
            {
                table: new StatTable('odette_coda_dot', charTalentTables.Odette.s2.p2),
            },
            {
                table: new StatTable('odette_coda_stellarconduct', charTalentTables.Odette.s2.p3),
            },
            {
                table: new StatTable('odette_coda_stellarswirl', charTalentTables.Odette.s2.p4),
            },
            {
                table: new StatTable('odette_plume', charTalentTables.Odette.s2.p5),
            },
            {
                table: new StatTable('odette_plume_stellarconduct', charTalentTables.Odette.s2.p6),
            },
            {
                table: new StatTable('odette_plume_stellarswirl', charTalentTables.Odette.s2.p7),
            },
            {
                table: new StatTable('odette_wing', charTalentTables.Odette.s2.p8),
            },
            {
                table: new StatTable('odette_wing_stellarconduct', charTalentTables.Odette.s2.p9),
            },
            {
                table: new StatTable('odette_wing_stellarswirl', charTalentTables.Odette.s2.p10),
            },
            {
                unit: 'sec',
                table: new StatTable('odette_solo_dance_double_duration', charTalentTables.Odette.s2.p11),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Odette.s2.p12),
            },
            {
                unit: 'sec',
                table: new StatTable('odette_coda_cooldown', charTalentTables.Odette.s2.p13),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Odette.s3_id,
        title: 'talent_name.odette_bluebird_finale',
        description: 'talent_descr.odette_bluebird_finale',
        items: [
            {
                table: new StatTable('odette_bluebird_slash', charTalentTables.Odette.s3.p1),
            },
            {
                table: new StatTable('odette_bluebird_final_slash', charTalentTables.Odette.s3.p2),
            },
            {
                table: new StatTable('odette_snow_swans_dream_bonus', charTalentTables.Odette.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('odette_snow_swans_dream_duration', charTalentTables.Odette.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('odette_solo_dance_double_duration', charTalentTables.Odette.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Odette.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Odette.s3.p7),
            },
        ],
    },
    links: [11500001, 11500002, 11500003, 11500004],
});

const CodaAvailabilityDuration = 6;
const MarvelousSplendorBaseStacks = 4;
const C1AdditionalSplendorStacks = 2;
const MarvelousSplendorDmg = 15;
const A4BaseScalePer100Atk = 1.5;
const A4BaseScaleCap = 30;
const RadianceBaseScalePer100Atk = 0.7;
const RadianceBaseScaleCap = 14;
const RadianceSwirlDuration = 8;
const C1CodaConductDmg = 300;
const C1CodaSwirlDmg = 450;
const C2AtkPerStack = 7;
const C2ElementalRes = -20;
const C4PartySnowSwanRatio = 0.5;
const C4CoordinatedConductDmg = 66;
const C4CoordinatedSwirlDmg = 99;
const C4CoordinatedCooldown = 3.5;
const C6SplendorElevation = 25;
const C6OdetteElevation = 20;

const doubleName = 'odette_solo_dance_double';
const codaName = 'odette_coda_at_dawns_tolling';
const splendorName = 'odette_marvelous_splendor';
const radianceConductName = 'odette_radiance_stellarconduct';
const radianceSwirlName = 'odette_radiance_stellarswirl';

const doubleCondition = new ConditionBoolean({name: doubleName});
const codaCondition = new ConditionAnd([
    doubleCondition,
    new ConditionBoolean({name: codaName}),
]);
const radianceConductCondition = new ConditionRadianceStellarGlimmer({
    conductName: radianceConductName,
    swirlName: radianceSwirlName,
    mode: RADIANCE_STELLARCONDUCT,
    condition: new ConditionBoolean({name: 'polestar_field'}),
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
const conductOrNoRadianceCondition = new ConditionNot([
    radianceSwirlCondition,
]);

const partyDoubleName = 'party.odette_solo_dance_double';
const partySplendorName = 'party.odette_marvelous_splendor';
const partyRadianceConductName = 'party.odette_radiance_stellarconduct';
const partyRadianceSwirlName = 'party.odette_radiance_stellarswirl';
const partyRadianceConductCondition = new ConditionRadianceStellarGlimmer({
    conductName: partyRadianceConductName,
    swirlName: partyRadianceSwirlName,
    mode: RADIANCE_STELLARCONDUCT,
    condition: new ConditionBoolean({name: 'polestar_field'}),
});
const partyRadianceSwirlCondition = new ConditionRadianceStellarGlimmer({
    conductName: partyRadianceConductName,
    swirlName: partyRadianceSwirlName,
    mode: RADIANCE_STELLARSWIRL,
});
const partyAnyRadianceCondition = new ConditionOr([
    partyRadianceConductCondition,
    partyRadianceSwirlCondition,
]);

const a4BasePost = new PostEffectStatsAtk({
    percent: new StatTable('stellarglimmer_multi', [A4BaseScalePer100Atk / 100]),
    exceed: 1000,
    statCap: new ValueTable([A4BaseScaleCap]),
    condition: new ConditionAscensionChar({ascension: 4}),
});
const radianceBasePost = new PostEffectStatsAtk({
    percent: new StatTable('stellarglimmer_multi', [RadianceBaseScalePer100Atk / 100]),
    statCap: new ValueTable([RadianceBaseScaleCap]),
    condition: anyRadianceCondition,
});
const partyRadianceBasePost = new PostEffectStats({
    from: 'odette_atk_total',
    percent: new StatTable('stellarglimmer_multi', [RadianceBaseScalePer100Atk / 100]),
    statCap: new ValueTable([RadianceBaseScaleCap]),
    condition: partyAnyRadianceCondition,
});

function attackMultiplier(name) {
    return new FeatureMultiplier({
        leveling: 'char_skill_attack',
        values: Talents.get('attack.' + name),
    });
}

function skillMultiplier(name) {
    return new FeatureMultiplier({
        leveling: 'char_skill_elemental',
        values: Talents.get('skill.' + name),
    });
}

function burstMultiplier(name) {
    return new FeatureMultiplier({
        leveling: 'char_skill_burst',
        values: Talents.get('burst.' + name),
    });
}

export const Odette = new DbObjectChar({
    name: 'odette',
    serializeId: 126,
    gameId: 10000150,
    iconClass: 'char-icon-odette',
    rarity: 5,
    element: 'cryo',
    weapon: 'sword',
    origin: 'snezhnaya',
    talents: Talents,
    statTable: charTables.Odette,
    features: [
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            multipliers: [attackMultiplier('normal_hit_1')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            multipliers: [attackMultiplier('normal_hit_2')],
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_3',
            allowInfusion: true,
            items: [
                {multipliers: [attackMultiplier('normal_hit_3_1')]},
                {multipliers: [attackMultiplier('normal_hit_3_2')]},
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3_1',
            isChild: true,
            multipliers: [attackMultiplier('normal_hit_3_1')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3_2',
            isChild: true,
            multipliers: [attackMultiplier('normal_hit_3_2')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4',
            multipliers: [attackMultiplier('normal_hit_4')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5',
            multipliers: [attackMultiplier('normal_hit_5')],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit',
            multipliers: [attackMultiplier('charged_hit')],
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
            multipliers: [attackMultiplier('plunge')],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_low',
            multipliers: [attackMultiplier('plunge_low')],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            multipliers: [attackMultiplier('plunge_high')],
        }),
        new FeatureDamageSkill({
            name: 'odette_phantom_night_dancers',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_phantom_night_dancers')],
        }),
        new FeatureDamageSkill({
            name: 'odette_coda_dot',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_coda_dot')],
            condition: codaCondition,
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'odette_coda_stellarconduct',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_coda_stellarconduct')],
            condition: new ConditionAnd([
                codaCondition,
                conductOrNoRadianceCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'odette_coda_stellarswirl',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_coda_stellarswirl')],
            condition: new ConditionAnd([
                codaCondition,
                radianceSwirlCondition,
            ]),
        }),
        new FeatureDamageSkill({
            name: 'odette_plume',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_plume')],
            condition: doubleCondition,
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'odette_plume_stellarconduct',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_plume_stellarconduct')],
            condition: new ConditionAnd([
                codaCondition,
                radianceConductCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'odette_plume_stellarswirl',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_plume_stellarswirl')],
            condition: new ConditionAnd([
                codaCondition,
                radianceSwirlCondition,
            ]),
        }),
        new FeatureDamageSkill({
            name: 'odette_wing',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_wing')],
            condition: doubleCondition,
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'odette_wing_stellarconduct',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_wing_stellarconduct')],
            condition: new ConditionAnd([
                codaCondition,
                radianceConductCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'odette_wing_stellarswirl',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_wing_stellarswirl')],
            condition: new ConditionAnd([
                codaCondition,
                radianceSwirlCondition,
            ]),
        }),
        new FeatureDamageBurst({
            name: 'odette_bluebird_slash',
            element: 'cryo',
            multipliers: [burstMultiplier('odette_bluebird_slash')],
        }),
        new FeatureDamageBurst({
            name: 'odette_bluebird_final_slash',
            element: 'cryo',
            multipliers: [burstMultiplier('odette_bluebird_final_slash')],
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'odette_c1_coda_stellarconduct',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation1',
                    values: new ValueTable([C1CodaConductDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 1}),
                codaCondition,
                conductOrNoRadianceCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'odette_c1_coda_stellarswirl',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation1',
                    values: new ValueTable([C1CodaSwirlDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 1}),
                codaCondition,
                radianceSwirlCondition,
            ]),
        }),
        new FeatureDamageStellarConduct({
            category: 'other',
            name: 'odette_c4_coordinated_stellarconduct',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new ValueTable([C4CoordinatedConductDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                conductOrNoRadianceCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'other',
            name: 'odette_c4_coordinated_stellarswirl',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new ValueTable([C4CoordinatedSwirlDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                radianceSwirlCondition,
            ]),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'odette_pathetique_base_bonus',
            postEffect: a4BasePost,
            format: 'percent',
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'odette_radiance_base_bonus',
            postEffect: radianceBasePost,
            format: 'percent',
            condition: anyRadianceCondition,
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                allowed_stellarconduct: 1,
                allowed_stellarswirl: 1,
            },
        }),
        new ConditionBoolean({
            name: doubleName,
            serializeId: 1,
            title: 'talent_name.n11500001',
            description: 'talent_descr.n11500001',
            rotation: 'self',
        }),
        new ConditionBoolean({
            name: codaName,
            serializeId: 2,
            title: 'talent_name.n11500002',
            description: 'talent_descr.n11500002',
            rotation: 'self',
            stats: {
                text_duration: CodaAvailabilityDuration,
            },
            subConditions: [doubleCondition],
        }),
        new ConditionBooleanLevels({
            name: 'odette_snow_swans_dream',
            serializeId: 3,
            title: 'talent_name.odette_snow_swans_dream',
            description: 'talent_descr.odette_snow_swans_dream',
            rotation: 'self',
            levelSetting: 'char_skill_burst',
            stats: [
                Talents.getAlias('burst.odette_snow_swans_dream_bonus', 'dmg_stellarglimmer'),
            ],
        }),
        new ConditionStacks({
            name: splendorName,
            serializeId: 4,
            title: 'talent_name.n11500003',
            description: 'talent_descr.n11500003',
            info: {ascension: 1},
            rotation: 'self',
            maxStacks: settings => settings.char_constellation >= 1
                ? MarvelousSplendorBaseStacks + C1AdditionalSplendorStacks
                : MarvelousSplendorBaseStacks,
            stats: [
                new StatTable('dmg_stellarglimmer', [MarvelousSplendorDmg]),
                new StatTableConditions('atk_percent', [C2AtkPerStack], [
                    new ConditionConstellation({constellation: 2}),
                ]),
            ],
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionBoolean({
            name: radianceConductName,
            serializeId: 5,
            title: 'talent_name.radiance_stellarconduct',
            description: 'talent_descr.odette_dance_of_aurore_1',
            info: {special: true},
            rotation: 'self',
            condition: new ConditionBoolean({name: 'polestar_field'}),
        }),
        new ConditionBoolean({
            name: radianceSwirlName,
            serializeId: 6,
            title: 'talent_name.radiance_stellarswirl',
            description: 'talent_descr.odette_dance_of_aurore_2',
            info: {special: true},
            rotation: 'self',
            stats: {
                text_duration: RadianceSwirlDuration,
            },
            condition: new ConditionNot([
                new ConditionBoolean({name: radianceConductName}),
            ]),
        }),
        new ConditionStatic({
            title: 'talent_name.odette_dance_of_aurore',
            description: 'talent_descr.odette_dance_of_aurore_3',
            info: {special: true},
            stats: {
                text_percent: RadianceBaseScalePer100Atk,
                text_percent_max: RadianceBaseScaleCap,
            },
        }),
        new ConditionStatic({
            title: 'talent_name.odette_spring_rite_of_the_chosen_one',
            description: 'talent_descr.odette_spring_rite_of_the_chosen_one',
            info: {ascension: 1},
            stats: {
                text_value: MarvelousSplendorBaseStacks,
                text_percent: MarvelousSplendorDmg,
            },
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.odette_pathetique_of_pateticheskaya',
            description: 'talent_descr.odette_pathetique_of_pateticheskaya',
            info: {ascension: 4},
            stats: {
                text_percent: A4BaseScalePer100Atk,
                text_percent_max: A4BaseScaleCap,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionStatic({
            title: 'talent_name.n11500004',
            description: 'talent_descr.n11500004',
        }),
    ],
    postEffects: [
        a4BasePost,
        radianceBasePost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.odette_on_this_danceless_morn_she_gazes_at_her_reflection',
                    description: 'talent_descr.odette_on_this_danceless_morn_she_gazes_at_her_reflection_1',
                    stats: {
                        text_percent_dmg_1: C1CodaConductDmg,
                        text_percent_dmg_2: C1CodaSwirlDmg,
                    },
                }),
                new ConditionStatic({
                    title: 'talent_name.odette_on_this_danceless_morn_she_gazes_at_her_reflection',
                    description: 'talent_descr.odette_on_this_danceless_morn_she_gazes_at_her_reflection_2',
                    stats: {
                        text_value: C1AdditionalSplendorStacks,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.odette_i_must_see_the_snow_swans_unseen_dream_for_myself_she_thought',
                    description: 'talent_descr.odette_i_must_see_the_snow_swans_unseen_dream_for_myself_she_thought',
                    stats: {
                        text_percent_atk: C2AtkPerStack,
                        text_percent: Math.abs(C2ElementalRes),
                    },
                }),
                new Condition({
                    isHidden: true,
                    stats: {
                        enemy_res_cryo: C2ElementalRes,
                        enemy_res_electro: C2ElementalRes,
                    },
                    condition: new ConditionAnd([
                        new ConditionConstellation({constellation: 2}),
                        doubleCondition,
                        radianceConductCondition,
                    ]),
                }),
                new Condition({
                    isHidden: true,
                    stats: {
                        enemy_res_cryo: C2ElementalRes,
                        enemy_res_anemo: C2ElementalRes,
                    },
                    condition: new ConditionAnd([
                        new ConditionConstellation({constellation: 2}),
                        doubleCondition,
                        radianceSwirlCondition,
                    ]),
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
                    title: 'talent_name.odette_up_up_the_long_delirious_burning_blue',
                    description: 'talent_descr.odette_up_up_the_long_delirious_burning_blue',
                    stats: {
                        text_percent: C4PartySnowSwanRatio * 100,
                        text_percent_dmg_1: C4CoordinatedConductDmg,
                        text_percent_dmg_2: C4CoordinatedSwirlDmg,
                        text_duration: C4CoordinatedCooldown,
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
                new ConditionBoolean({
                    name: 'odette_all_party_marvelous_splendor',
                    serializeId: 8,
                    title: 'talent_name.odette_put_out_my_hand_and_touched_the_face_of_the_divine',
                    description: 'talent_descr.odette_put_out_my_hand_and_touched_the_face_of_the_divine_1',
                    rotation: 'self',
                }),
                new ConditionStatic({
                    title: 'talent_name.odette_put_out_my_hand_and_touched_the_face_of_the_divine',
                    description: 'talent_descr.odette_put_out_my_hand_and_touched_the_face_of_the_divine_3',
                    stats: {
                        dmg_stellarglimmer_special: C6OdetteElevation,
                        text_percent: C6OdetteElevation,
                    },
                }),
                new Condition({
                    isHidden: true,
                    stats: {
                        dmg_stellarglimmer_special: C6SplendorElevation,
                    },
                    condition: new ConditionAnd([
                        new ConditionConstellation({constellation: 6}),
                        new ConditionBooleanValue({
                            setting: splendorName,
                            cond: 'gt',
                            value: 0,
                        }),
                    ]),
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['atk_total'],
            settings: ['char_skill_burst'],
        },
        conditions: [
            new Condition({
                settings: {
                    allowed_stellarconduct: 1,
                    allowed_stellarswirl: 1,
                },
            }),
            new ConditionNumber({
                name: 'odette_atk_total',
                title: 'talent_name.stats_total_atk',
                partyStat: 'atk_total',
                serializeId: 1,
                rotation: 'party',
                max: 10000,
            }),
            new ConditionNumberTalent({
                name: 'odette_char_skill_burst',
                title: 'talent_name.stats_level_burst',
                partySetting: 'char_skill_burst',
                serializeId: 2,
            }),
            new ConditionBoolean({
                name: 'party.odette_constellation_5',
                serializeId: 12,
                title: 'talent_name.odette_oh_i_have_slipped_the_surly_bonds_of_earth',
                description: 'talent_descr.char_constellation_burst',
                info: {constellation: 5},
                settings: {
                    odette_char_skill_burst_bonus: 3,
                },
            }),
            new ConditionBoolean({
                name: partyDoubleName,
                serializeId: 3,
                title: 'talent_name.n11500001',
                description: 'talent_descr.n11500001',
                rotation: 'party',
            }),
            new ConditionStacks({
                name: partySplendorName,
                serializeId: 4,
                title: 'talent_name.n11500003',
                description: 'talent_descr.n11500003',
                info: {ascension: 1},
                rotation: 'party',
                maxStacks: settings => settings['party.odette_c1_splendor']
                    ? MarvelousSplendorBaseStacks + C1AdditionalSplendorStacks
                    : MarvelousSplendorBaseStacks,
                stats: [
                    new StatTable('dmg_stellarglimmer', [MarvelousSplendorDmg]),
                    new StatTableConditions('atk_percent', [C2AtkPerStack], [
                        new ConditionBoolean({name: 'party.odette_c2_splendor'}),
                    ]),
                ],
            }),
            new ConditionBoolean({
                name: partyRadianceConductName,
                serializeId: 5,
                title: 'talent_name.radiance_stellarconduct',
                description: 'talent_descr.odette_dance_of_aurore_1',
                info: {special: true},
                rotation: 'party',
                condition: new ConditionBoolean({name: 'polestar_field'}),
            }),
            new ConditionBoolean({
                name: partyRadianceSwirlName,
                serializeId: 6,
                title: 'talent_name.radiance_stellarswirl',
                description: 'talent_descr.odette_dance_of_aurore_2',
                info: {special: true},
                rotation: 'party',
                stats: {
                    text_duration: RadianceSwirlDuration,
                },
                condition: new ConditionNot([
                    new ConditionBoolean({name: partyRadianceConductName}),
                ]),
            }),
            new ConditionStatic({
                title: 'talent_name.odette_dance_of_aurore',
                description: 'talent_descr.odette_dance_of_aurore_3',
                info: {special: true},
                stats: {
                    text_percent: RadianceBaseScalePer100Atk,
                    text_percent_max: RadianceBaseScaleCap,
                },
            }),
            new ConditionBoolean({
                name: 'party.odette_c1_splendor',
                serializeId: 8,
                title: 'talent_name.odette_on_this_danceless_morn_she_gazes_at_her_reflection',
                description: 'talent_descr.odette_on_this_danceless_morn_she_gazes_at_her_reflection_2',
                info: {constellation: 1},
                rotation: 'party',
                stats: {
                    text_value: C1AdditionalSplendorStacks,
                },
            }),
            new ConditionBoolean({
                name: 'party.odette_c2_splendor',
                serializeId: 9,
                title: 'talent_name.odette_i_must_see_the_snow_swans_unseen_dream_for_myself_she_thought',
                description: 'talent_descr.odette_i_must_see_the_snow_swans_unseen_dream_for_myself_she_thought',
                info: {constellation: 2},
                rotation: 'party',
            }),
            new ConditionBooleanLevels({
                name: 'party.odette_snow_swans_dream',
                serializeId: 10,
                title: 'talent_name.odette_snow_swans_dream',
                description: 'talent_descr.odette_snow_swans_dream',
                info: {constellation: 4},
                rotation: 'party',
                levelSetting: 'odette_char_skill_burst',
                stats: [
                    Talents.getMulti({
                        name: 'dmg_stellarglimmer',
                        from: 'burst.odette_snow_swans_dream_bonus',
                        multi: C4PartySnowSwanRatio,
                    }),
                ],
            }),
            new ConditionBoolean({
                name: 'party.odette_c6_splendor',
                serializeId: 11,
                title: 'talent_name.odette_put_out_my_hand_and_touched_the_face_of_the_divine',
                description: 'talent_descr.odette_put_out_my_hand_and_touched_the_face_of_the_divine_2',
                info: {constellation: 6},
                rotation: 'party',
                stats: {
                    text_percent: C6SplendorElevation,
                },
            }),
            new Condition({
                isHidden: true,
                stats: {
                    enemy_res_cryo: C2ElementalRes,
                    enemy_res_electro: C2ElementalRes,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.odette_c2_splendor'}),
                    new ConditionBoolean({name: partyDoubleName}),
                    partyRadianceConductCondition,
                ]),
            }),
            new Condition({
                isHidden: true,
                stats: {
                    enemy_res_cryo: C2ElementalRes,
                    enemy_res_anemo: C2ElementalRes,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.odette_c2_splendor'}),
                    new ConditionBoolean({name: partyDoubleName}),
                    partyRadianceSwirlCondition,
                ]),
            }),
            new Condition({
                isHidden: true,
                stats: {
                    dmg_stellarglimmer_special: C6SplendorElevation,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.odette_c6_splendor'}),
                    new ConditionBooleanValue({
                        setting: partySplendorName,
                        cond: 'gt',
                        value: 0,
                    }),
                ]),
            }),
        ],
        postEffects: [
            partyRadianceBasePost,
        ],
    },
});
