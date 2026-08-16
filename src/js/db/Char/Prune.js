import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdown } from "../../classes/Condition/Dropdown";
import { ConditionDropdownElement } from "../../classes/Condition/Dropdown/Element";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionWitchHomework } from "../../classes/Condition/WitchHomework";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamage } from "../../classes/Feature2/Damage";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageBurstPeriodic } from "../../classes/Feature2/Damage/Burst/Periodic";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Prune.s1_id,
        title: 'talent_name.prune_badaboom_hexbuster_hammer',
        description: 'talent_descr.prune_badaboom_hexbuster_hammer',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Prune.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Prune.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Prune.s1.p3),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Prune.s1.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Prune.s1.p5),
            },
            {
                table: new StatTable('plunge', charTalentTables.Prune.s1.p6),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Prune.s1.p7),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Prune.s1.p8),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Prune.s2_id,
        title: 'talent_name.prune_ring_a_ding_ding_hexhunter_chime',
        description: 'talent_descr.prune_ring_a_ding_ding_hexhunter_chime',
        items: [
            {
                table: new StatTable('prune_skill_1_hit_dmg', charTalentTables.Prune.s2.p1),
            },
            {
                table: new StatTable('prune_skill_2_hit_dmg', charTalentTables.Prune.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Prune.s2.p3),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Prune.s3_id,
        title: 'talent_name.prune_the_bell_tolls_the_hunt_is_on',
        description: 'talent_descr.prune_the_bell_tolls_the_hunt_is_on',
        items: [
            {
                table: new StatTable('prune_burst_dmg', charTalentTables.Prune.s3.p1),
            },
            {
                table: new StatTable('prune_witchlure_bell_dmg', charTalentTables.Prune.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('prune_hunter_seeker_mode_duration', charTalentTables.Prune.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Prune.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Prune.s3.p5),
            },
        ],
    },
});

const A1BanehunterOathhammerDmg = 150;
const A4TollingRallyScale = 0.025;
const A4TollingRallyCap = 50;
const A4TollingRallyAtkThreshold = 2000;
const WitchPruneAtkBonus = 60;
const WitchSwirlAtkBonus = 30;
const C2HuntTheWitchAtkBonus = 10;
const C2HuntTheWitchStackBonus = 5;
const C2HuntTheWitchMaxStacks = 6;
const C4RicochetDmg = 80;
const C6AtkBonus = 350;

const condWitchHomework = new ConditionBoolean({name: 'prune_witch_homework'});
const condPartyWitchHomework = new ConditionBoolean({name: 'party.prune_witch_homework'});
const condHexereiResonance = new ConditionHexereiResonance({});
const condTollingRally = new ConditionBoolean({name: 'party.prune_tolling_synchronicity'});

const partyTollingRallyPost = new PostEffectStats({
    from: 'prune_atk_total',
    percent: new StatTable('dmg_all', [A4TollingRallyScale]),
    exceed: A4TollingRallyAtkThreshold,
    statCap: new ValueTable([A4TollingRallyCap]),
    condition: condTollingRally,
});

export const Prune = new DbObjectChar({
    name: 'prune',
    serializeId: 122,
    gameId: 10000132,
    iconClass: 'char-icon-prune',
    rarity: 4,
    element: 'anemo',
    weapon: 'catalyst',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Prune,
    features: [
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_low',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'prune_skill_1_hit_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.prune_skill_1_hit_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'prune_skill_2_hit_dmg',
            elementSetting: 'prune_banehunter_oathhammer_element_str',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.prune_skill_2_hit_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'prune_burst_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.prune_burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurstPeriodic({
            name: 'prune_witchlure_bell_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.prune_witchlure_bell_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'prune_banehunter_oathhammer',
            elementSetting: 'prune_banehunter_oathhammer_element_str',
            condition: new ConditionAscensionChar({ascension: 1}),
            multipliers: [
                new FeatureMultiplier({
                    source: 'ascension1',
                    values: new StatTable('prune_banehunter_oathhammer', [A1BanehunterOathhammerDmg]),
                }),
            ],
        }),
        new FeatureDamage({
            category: 'other',
            name: 'prune_banehunter_ricochet',
            elementSetting: 'prune_banehunter_oathhammer_element_str',
            condition: new ConditionConstellation({constellation: 4}),
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new StatTable('prune_banehunter_ricochet', [C4RicochetDmg]),
                }),
            ],
        }),
    ],
    conditions: [
        new ConditionDropdownElement({
            name: 'prune_banehunter_oathhammer_element',
            serializeId: 1,
            title: 'talent_name.n11320001',
            description: 'talent_descr.n11320001',
            hideEmpty: true,
            defaultValue: 'pyro',
            values: [
                { value: 'pyro', serializeId: 1, conditions: [new Condition({settings: {prune_banehunter_oathhammer_element_str: 'pyro'}})] },
                { value: 'hydro', serializeId: 2, conditions: [new Condition({settings: {prune_banehunter_oathhammer_element_str: 'hydro'}})] },
                { value: 'electro', serializeId: 3, conditions: [new Condition({settings: {prune_banehunter_oathhammer_element_str: 'electro'}})] },
                { value: 'cryo', serializeId: 4, conditions: [new Condition({settings: {prune_banehunter_oathhammer_element_str: 'cryo'}})] },
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.prune_verdict_and_punishment',
            description: 'talent_descr.prune_verdict_and_punishment',
            info: {ascension: 1},
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.prune_tolling_synchronicity',
            description: 'talent_descr.prune_tolling_synchronicity',
            info: {ascension: 4},
            stats: {
                text_percent: A4TollingRallyScale,
                text_percent_max: A4TollingRallyCap,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionBoolean({
            name: 'prune_witch_homework',
            serializeId: 2,
            title: 'talent_name.prune_witchseekers_vow',
            description: 'talent_descr.prune_witchseekers_vow',
            info: {hexerei: true},
        }),
        new ConditionBoolean({
            name: 'prune_witchseekers_vow',
            serializeId: 3,
            title: 'talent_name.prune_witchseekers_vow_reaction',
            description: 'talent_descr.prune_witchseekers_vow_reaction',
            hideInactive: true,
            stats: {
                atk_percent: WitchPruneAtkBonus,
            },
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                condWitchHomework,
                condHexereiResonance,
            ]),
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.prune_with_a_vow_to_rescue_the_journey_begins',
                    description: 'talent_descr.prune_with_a_vow_to_rescue_the_journey_begins',
                }),
            ],
        },
        {
            conditions: [
                new ConditionDropdown({
                    name: 'prune_useful_for_cleaning_messy_baggage_elemental_powers_are_indeed',
                    serializeId: 4,
                    title: 'talent_name.prune_useful_for_cleaning_messy_baggage_elemental_powers_are_indeed',
                    description: 'talent_descr.prune_useful_for_cleaning_messy_baggage_elemental_powers_are_indeed',
                    values: Array.from({length: C2HuntTheWitchMaxStacks + 1}, (_, stacks) => ({
                        title: ''+ stacks,
                        value: ''+ stacks,
                        serializeId: stacks + 1,
                        conditions: [
                            new Condition({
                                stats: {
                                    atk_percent: C2HuntTheWitchAtkBonus + C2HuntTheWitchStackBonus * stacks,
                                },
                            }),
                        ],
                    })),
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
                    title: 'talent_name.prune_looking_back_following_the_wind_ones_shadow_still_halved',
                    description: 'talent_descr.prune_looking_back_following_the_wind_ones_shadow_still_halved',
                    stats: {
                        text_percent_dmg: C4RicochetDmg,
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
                new ConditionBoolean({
                    name: 'prune_and_thats_the_story_share_it_with_your_friends',
                    serializeId: 6,
                    title: 'talent_name.prune_and_thats_the_story_share_it_with_your_friends',
                    description: 'talent_descr.prune_and_thats_the_story_share_it_with_your_friends',
                    stats: {
                        atk: C6AtkBonus,
                    },
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['atk_total'],
        },
        conditions: [
            new ConditionNumber({
                name: 'prune_atk_total',
                title: 'talent_name.stats_total_atk',
                partyStat: 'atk_total',
                serializeId: 1,
                rotation: 'party',
                max: 10000,
            }),
            new ConditionBoolean({
                name: 'party.prune_tolling_synchronicity',
                serializeId: 2,
                rotation: 'party',
                title: 'talent_name.prune_tolling_synchronicity',
                description: 'talent_descr.prune_tolling_synchronicity',
                info: {ascension: 4},
                stats: {
                    text_percent: A4TollingRallyScale,
                    text_percent_max: A4TollingRallyCap,
                },
            }),
            new ConditionBoolean({
                name: 'party.prune_witch_homework',
                serializeId: 3,
                rotation: 'party',
                title: 'talent_name.prune_witchseekers_vow',
                description: 'talent_descr.prune_witchseekers_vow',
                info: {hexerei: true},
            }),
            new ConditionBoolean({
                name: 'party.prune_witchseekers_vow_swirl',
                serializeId: 4,
                rotation: 'party',
                title: 'talent_name.prune_witchseekers_vow_swirl',
                description: 'talent_descr.prune_witchseekers_vow_swirl',
                hideInactive: true,
                stats: {
                    atk_percent: WitchSwirlAtkBonus,
                },
                condition: new ConditionAnd([
                    condPartyWitchHomework,
                    condHexereiResonance,
                    condTollingRally,
                    new ConditionWitchHomework({}),
                ]),
            }),
            new ConditionBoolean({
                name: 'party.prune_and_thats_the_story_share_it_with_your_friends',
                serializeId: 5,
                rotation: 'party',
                title: 'talent_name.prune_and_thats_the_story_share_it_with_your_friends',
                description: 'talent_descr.prune_and_thats_the_story_share_it_with_your_friends',
                info: {constellation: 6},
                stats: {
                    atk: C6AtkBonus,
                },
                condition: condTollingRally,
            }),
        ],
        postEffects: [
            partyTollingRallyPost,
        ],
    },
});
