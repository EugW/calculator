import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionDropdownTravelerResonated } from "../../classes/Condition/Dropdown/TravelerResonated";
import { ConditionNot } from "../../classes/Condition/Not";
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
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierStatic } from "../../classes/Feature2/Multiplier/Static";
import { FeatureStatic } from "../../classes/Feature2/Static";
import { StatTable } from "../../classes/StatTable";
import { StatTableAscensionScale } from "../../classes/StatTable/Ascension/Scale";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.TravelerGeo.s1_id,
        title: 'talent_name.traveler_foreign_rockblade',
        description: 'talent_descr.traveler_foreign_rockblade',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.TravelerGeo.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.TravelerGeo.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.TravelerGeo.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.TravelerGeo.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.TravelerGeo.s1.p5),
            },
            {
                type: 'hits',
                name: 'charged_hit_total',
                table: [
                    new StatTable('charged_hit_1', charTalentTables.TravelerGeo.s1.p6),
                    new StatTable('charged_hit_2', charTalentTables.TravelerGeo.s1.p7),
                ],
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.TravelerGeo.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.TravelerGeo.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.TravelerGeo.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.TravelerGeo.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.TravelerGeo.s2_id,
        title: 'talent_name.traveler_starfell_sword',
        description: 'talent_descr.traveler_starfell_sword',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.TravelerGeo.s2.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('traveler_meteor_duration', charTalentTables.TravelerGeo.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.TravelerGeo.s2.p3),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.TravelerGeo.s3_id,
        title: 'talent_name.traveler_wake_of_earth',
        description: 'talent_descr.traveler_wake_of_earth',
        items: [
            {
                table: new StatTable('traveler_shockwave', charTalentTables.TravelerGeo.s3.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('traveler_shockwave_duration', charTalentTables.TravelerGeo.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.TravelerGeo.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.TravelerGeo.s3.p4),
            },
        ],
    },
});


const condTravelerAether = new ConditionBoolean({name: 'traveler_aether'});
const condLumineDefault = new ConditionNot([condTravelerAether]);

const ForeignRockfellBonus = 120;
const ForeignRockfellCooldown = 15;

const bladeReadyCondition = new ConditionBooleanValue({
    setting: 'traveler_geo_blade_archaic_petra',
    cond: 'ge',
    value: 3,
});

function makeChargedHit2Multipliers() {
    return [
        new FeatureMultiplier({
            leveling: 'char_skill_attack',
            values: Talents.get('attack.charged_hit_2'),
            condition: condLumineDefault,
        }),
        new FeatureMultiplier({
            leveling: 'char_skill_attack',
            values: new StatTable(
                'charged_hit_2',
                charTalentTables.TravelerGeo.s1_boy.p7,
            ),
            condition: condTravelerAether,
        }),
    ];
}
export const TravelerGeo = new DbObjectChar({
    name: 'traveler_geo',
    serializeId: 25,
    gameId: [10000005, 10000007],
    depotIds: [506, 706],
    iconClass: "char-icon-traveler-girl",
    rarity: 5,
    element: 'geo',
    weapon: 'sword',
    origin: 'foreign',
    talents: Talents,
    statTable: [
        ...charTables.Traveler,
        new StatTableAscensionScale({
			stat: 'burst_energy_cost',
			base: Talents.get('burst.energy_cost').getValue(1),
		}),
    ],
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
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'ascension4',
                    values: new StatTable('traveler_frenzied_rockslide', [60]),
                }),
            ],
            condition: new ConditionAscensionChar({ascension: 4}),
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
                    multipliers: makeChargedHit2Multipliers(),
                },
            ],
        }),
        new FeatureDamageCharged({
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_1'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            isChild: true,
            multipliers: makeChargedHit2Multipliers(),
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
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.traveler_shockwave'),
                }),
            ],
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'charged',
            name: 'traveler_geo_rockfell',
            element: 'geo',
            allowInfusion: true,
            items: [
                {multipliers: [
                    new FeatureMultiplier({
                        leveling: 'char_skill_attack',
                        values: Talents.get('attack.charged_hit_1'),
                    }),
                    new FeatureMultiplier({
                        source: 'foreign_adamantine',
                        values: new ValueTable([ForeignRockfellBonus]),
                    }),
                ]},
                {multipliers: [
                    ...makeChargedHit2Multipliers(),
                    new FeatureMultiplier({
                        source: 'foreign_adamantine',
                        values: new ValueTable([ForeignRockfellBonus]),
                    }),
                ]},
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureDamageCharged({
            name: 'traveler_geo_rockfell_1',
            isChild: true,
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_1'),
                }),
                new FeatureMultiplier({
                    source: 'foreign_adamantine',
                    values: new ValueTable([ForeignRockfellBonus]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureDamageCharged({
            name: 'traveler_geo_rockfell_2',
            isChild: true,
            element: 'geo',
            multipliers: [
                ...makeChargedHit2Multipliers(),
                new FeatureMultiplier({
                    source: 'foreign_adamantine',
                    values: new ValueTable([ForeignRockfellBonus]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureStatic({
            category: 'other',
            name: 'traveler_geo_rockfell_cooldown',
            format: 'decimal',
            multipliers: [
                new FeatureMultiplierStatic({
                    source: 'foreign_adamantine',
                    values: new ValueTable([ForeignRockfellCooldown]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'traveler_aether',
            serializeId: 4,
            title: 'talent_name.traveler_twin_aether',
            description: 'talent_descr.traveler_twin_aether',
            rotation: 'self',
        }),
        new ConditionStatic({
            title: 'talent_name.traveler_shattered_darkrock',
            description: 'talent_descr.traveler_shattered_darkrock',
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.traveler_frenzied_rockslide',
            description: 'talent_descr.traveler_frenzied_rockslide',
            stats: {
                text_percent_dmg: 60,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        new ConditionBoolean({
            name: 'traveler_swordfighting_techniques',
            serializeId: 2,
            title: 'talent_name.traveler_swordfighting_techniques',
            description: 'talent_descr.traveler_swordfighting_techniques',
            stats: {
                atk_base: 3,
            },
        }),
        new ConditionBoolean({
            name: 'traveler_special_training',
            serializeId: 3,
            title: 'talent_name.traveler_special_training',
            description: 'talent_descr.traveler_special_training',
            stats: {
                atk_base: 7,
                mastery: 15,
                hp_base: 50,
            },
        }),
        new ConditionDropdownTravelerResonated({
            name: 'traveler_geo_resonated_elements',
            serializeId: 6,
        }),
        new ConditionStacks({
            name: 'traveler_geo_blade_archaic_petra',
            serializeId: 7,
            title: 'talent_name.traveler_foreign_adamantine',
            description: 'talent_descr.traveler_foreign_adamantine',
            maxStacks: 3,
            noStat: true,
            rotation: 'self',
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'traveler_invincible_stonewall',
                    serializeId: 1,
                    title: 'talent_name.traveler_invincible_stonewall',
                    description: 'talent_descr.traveler_invincible_stonewall',
                    stats: {
                        crit_rate: 10,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.traveler_rockcore_meltdown',
                    description: 'talent_descr.traveler_rockcore_meltdown',
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
                    title: 'talent_name.traveler_reaction_force',
                    description: 'talent_descr.traveler_reaction_force',
                    stats: {
                        text_value: 5,
                        text_value_max: 25,
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
                    title: 'talent_name.traveler_everlasting_boulder',
                    description: 'talent_descr.traveler_everlasting_boulder',
                    stats: {
                        text_duration: 5,
                        text_duration_2: 10,
                    },
                }),
            ],
        },
    ]),
    partyData: {
        conditions: [
            new ConditionBoolean({
                name: 'party.traveler_invincible_stonewall',
                serializeId: 1,
                rotation: 'party',
                title: 'talent_name.traveler_invincible_stonewall',
                description: 'talent_descr.traveler_invincible_stonewall',
                info: {constellation: 1},
                stats: {
                    crit_rate: 10,
                },
            }),
        ],
    },
});
