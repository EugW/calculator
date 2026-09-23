import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanNightSoul } from "../../classes/Condition/Boolean/NightSoul";
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
        gameId: charTalentTables.TravelerPyro.s1_id,
        title: 'talent_name.traveler_foreign_blaze',
        description: 'talent_descr.traveler_foreign_blaze',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.TravelerPyro.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.TravelerPyro.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.TravelerPyro.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.TravelerPyro.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.TravelerPyro.s1.p5),
            },
            {
                type: 'hits',
                name: 'charged_hit_total',
                table: [
                    new StatTable('charged_hit_1', charTalentTables.TravelerPyro.s1.p6),
                    new StatTable('charged_hit_2', charTalentTables.TravelerPyro.s1.p7),
                ],
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.TravelerPyro.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.TravelerPyro.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.TravelerPyro.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.TravelerPyro.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.TravelerPyro.s2_id,
        title: 'talent_name.traveler_flowfire_blade',
        description: 'talent_descr.traveler_flowfire_blade',
        items: [
            {
                table: new StatTable('traveler_blazing_threshold_dmg', charTalentTables.TravelerPyro.s2.p1),
            },
            {
                table: new StatTable('hold_dmg', charTalentTables.TravelerPyro.s2.p2),
            },
            {
                table: new StatTable('traveler_scorching_threshold_dmg', charTalentTables.TravelerPyro.s2.p3),
            },
            {
                unit: '',
                table: new StatTable('xilonen_nightsoul', charTalentTables.TravelerPyro.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.TravelerPyro.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.TravelerPyro.s3_id,
        title: 'talent_name.traveler_plains_scorcher',
        description: 'talent_descr.traveler_plains_scorcher',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.TravelerPyro.s3.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.TravelerPyro.s3.p2),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.TravelerPyro.s3.p3),
            },
        ],
    },
});

const C1DmgBonus = 6;
const C1DmgBonusNightsoul = 9;
const C4PyroDmg = 20;
const C6CritDmg = 40;
const ForeignStarfireBonus = 200;
const ForeignStarfireCooldown = 15;


const condTravelerAether = new ConditionBoolean({name: 'traveler_aether'});
const condLumineDefault = new ConditionNot([condTravelerAether]);

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
                charTalentTables.TravelerPyro.s1_boy.p7,
            ),
            condition: condTravelerAether,
        }),
    ];
}

const bladeMaxCondition = new ConditionBooleanValue({
    setting: 'traveler_pyro_blade_sacred_flame',
    cond: 'ge',
    value: 2,
});
export const TravelerPyro = new DbObjectChar({
    name: 'traveler_pyro',
    serializeId: 100,
    gameId: [10000005, 10000007],
    depotIds: [502, 702],
    iconClass: 'char-icon-traveler-girl',
    rarity: 5,
    element: 'pyro',
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
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.traveler_blazing_threshold_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.hold_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.traveler_scorching_threshold_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'charged',
            name: 'traveler_pyro_inferno',
            element: 'pyro',
            allowInfusion: true,
            items: [
                {multipliers: [
                    new FeatureMultiplier({
                        leveling: 'char_skill_attack',
                        values: Talents.get('attack.charged_hit_1'),
                    }),
                    new FeatureMultiplier({
                        source: 'foreign_starfire',
                        values: new ValueTable([ForeignStarfireBonus]),
                    }),
                ]},
                {multipliers: [
                    ...makeChargedHit2Multipliers(),
                    new FeatureMultiplier({
                        source: 'foreign_starfire',
                        values: new ValueTable([ForeignStarfireBonus]),
                    }),
                ]},
            ],
            condition: bladeMaxCondition,
        }),
        new FeatureDamageCharged({
            name: 'traveler_pyro_inferno_1',
            isChild: true,
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_1'),
                }),
                new FeatureMultiplier({
                    source: 'foreign_starfire',
                    values: new ValueTable([ForeignStarfireBonus]),
                }),
            ],
            condition: bladeMaxCondition,
        }),
        new FeatureDamageCharged({
            name: 'traveler_pyro_inferno_2',
            isChild: true,
            element: 'pyro',
            multipliers: [
                ...makeChargedHit2Multipliers(),
                new FeatureMultiplier({
                    source: 'foreign_starfire',
                    values: new ValueTable([ForeignStarfireBonus]),
                }),
            ],
            condition: bladeMaxCondition,
        }),
        new FeatureStatic({
            category: 'other',
            name: 'traveler_pyro_inferno_cooldown',
            format: 'decimal',
            multipliers: [
                new FeatureMultiplierStatic({
                    source: 'foreign_starfire',
                    values: new ValueTable([ForeignStarfireCooldown]),
                }),
            ],
            condition: bladeMaxCondition,
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'traveler_aether',
            serializeId: 7,
            title: 'talent_name.traveler_twin_aether',
            description: 'talent_descr.traveler_twin_aether',
            rotation: 'self',
        }),
        new ConditionBoolean({
            name: 'common.nightsoul_blessing_state',
            serializeId: 1,
            title: 'talent_name.nightsoul_blessing_state',
        }),
        new ConditionStatic({
            title: 'talent_name.traveler_true_flame_of_incineration',
            description: 'talent_descr.traveler_true_flame_of_incineration',
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.traveler_embers_unspent',
            description: 'talent_descr.traveler_embers_unspent',
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        new ConditionBoolean({
            name: 'traveler_swordfighting_techniques',
            serializeId: 5,
            title: 'talent_name.traveler_swordfighting_techniques',
            description: 'talent_descr.traveler_swordfighting_techniques',
            stats: {
                atk_base: 3,
            },
        }),
        new ConditionBoolean({
            name: 'traveler_special_training',
            serializeId: 6,
            title: 'talent_name.traveler_special_training',
            description: 'talent_descr.traveler_special_training',
            stats: {
                atk_base: 7,
                mastery: 15,
                hp_base: 50,
            },
        }),
        new ConditionDropdownTravelerResonated({
            name: 'traveler_pyro_resonated_elements',
            serializeId: 8,
        }),
        new ConditionStacks({
            name: 'traveler_pyro_blade_sacred_flame',
            serializeId: 9,
            title: 'talent_name.traveler_foreign_starfire',
            description: 'talent_descr.traveler_foreign_starfire',
            maxStacks: 2,
            noStat: true,
            rotation: 'self',
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'traveler_pyro_starfires_flowing_light',
                    serializeId: 2,
                    title: 'talent_name.traveler_starfires_flowing_light',
                    description: 'talent_descr.traveler_starfires_flowing_light_1',
                    stats: {
                        dmg_all: C1DmgBonus
                    },
                }),
                new ConditionStatic({
                    title: 'talent_name.traveler_starfires_flowing_light',
                    description: 'talent_descr.traveler_starfires_flowing_light_2',
                    stats: {
                        dmg_all: C1DmgBonusNightsoul,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'traveler_pyro_starfires_flowing_light'}),
                        new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
                    ],
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.traveler_ever_lit_candle',
                    description: 'talent_descr.traveler_ever_lit_candle',
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
                    name: 'traveler_ravaging_flame',
                    serializeId: 3,
                    title: 'talent_name.traveler_ravaging_flame',
                    description: 'talent_descr.traveler_ravaging_flame',
                    stats: {
                        dmg_pyro: C4PyroDmg,
                        text_duration: 9,
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
                    name: 'traveler_pyro_the_sacred_flame_imperishable',
                    serializeId: 4,
                    title: 'talent_name.traveler_the_sacred_flame_imperishable',
                    description: 'talent_descr.traveler_the_sacred_flame_imperishable',
                    stats: {
                        crit_dmg_normal: C6CritDmg,
                        crit_dmg_charged: C6CritDmg,
                        crit_dmg_plunge: C6CritDmg,
                    },
                    settings: {
                        attack_infusion: 'pyro',
                    },
                }),
            ],
        },
    ]),
    partyData: {
        conditions: [
            new ConditionBoolean({
                name: 'party.traveler_pyro_starfires_flowing_light',
                serializeId: 1,
                title: 'talent_name.traveler_starfires_flowing_light',
                description: 'talent_descr.traveler_starfires_flowing_light_1',
                rotation: 'party',
                stats: {
                    dmg_all: C1DmgBonus,
                },
            }),
            new ConditionBoolean({
                name: 'party.traveler_pyro_starfires_flowing_light_2',
                serializeId: 2,
                title: 'talent_name.traveler_starfires_flowing_light',
                description: 'talent_descr.traveler_starfires_flowing_light_2',
                rotation: 'party',
                stats: {
                    dmg_all: C1DmgBonusNightsoul,
                },
                subConditions: [
                    new ConditionBoolean({name: 'party.traveler_pyro_starfires_flowing_light'}),
                    new ConditionBooleanNightSoul(),
                ],
            }),
        ],
    },
});
