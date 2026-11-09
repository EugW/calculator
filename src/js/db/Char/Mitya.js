import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanDropdownValue } from "../../classes/Condition/Boolean/DropdownValue";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdown } from "../../classes/Condition/Dropdown";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionStaticLevel } from "../../classes/Condition/Static/Level";
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
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsMastery } from "../../classes/PostEffect/Stats/Mastery";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Mitya.s1_id,
        title: 'talent_name.mitya_chain_reaction',
        description: 'talent_descr.mitya_chain_reaction',
        items: [
            {table: new StatTable('normal_hit_1', charTalentTables.Mitya.s1.p1)},
            {table: new StatTable('normal_hit_2', charTalentTables.Mitya.s1.p2)},
            {table: new StatTable('normal_hit_3', charTalentTables.Mitya.s1.p3)},
            {table: new StatTable('charged_hit', charTalentTables.Mitya.s1.p4)},
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Mitya.s1.p5),
            },
            {table: new StatTable('plunge', charTalentTables.Mitya.s1.p6)},
            {table: new StatTable('plunge_low', charTalentTables.Mitya.s1.p7)},
            {table: new StatTable('plunge_high', charTalentTables.Mitya.s1.p8)},
            {table: new StatTable('mitya_gradient_detonation', charTalentTables.Mitya.s1.p9)},
            {
                unit: 'mastery',
                table: new StatTable('mitya_gradient_detonation_stellarconduct', charTalentTables.Mitya.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Mitya.s2_id,
        title: 'talent_name.mitya_variable_detection',
        description: 'talent_descr.mitya_variable_detection',
        items: [
            {table: new StatTable('press_dmg', charTalentTables.Mitya.s2.p1)},
            {table: new StatTable('hold_dmg', charTalentTables.Mitya.s2.p2)},
            {table: new StatTable('mitya_steady_state_core', charTalentTables.Mitya.s2.p3)},
            {
                unit: 'mastery',
                table: new StatTable('mitya_steady_state_core_beacon_stellarconduct', charTalentTables.Mitya.s2.p4),
            },
            {
                unit: 'mastery',
                table: new StatTable('mitya_steady_state_core_detonation_stellarconduct', charTalentTables.Mitya.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Mitya.s2.p6),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Mitya.s2.p7),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Mitya.s3_id,
        title: 'talent_name.mitya_gradient_theory',
        description: 'talent_descr.mitya_gradient_theory',
        items: [
            {
                type: 'multivalue',
                separator: ' + ',
                units: ['atk', 'mastery'],
                table: [
                    new StatTable('burst_dmg', charTalentTables.Mitya.s3.p1),
                    new StatTable('mitya_gradient_theory_mastery', charTalentTables.Mitya.s3.p2),
                ],
            },
            {
                unit: '',
                table: new StatTable('mitya_gradient_beacons_generated', charTalentTables.Mitya.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Mitya.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Mitya.s3.p5),
            },
        ],
    },
    links: [11360001, 11360002, 11330003, 11190007],
});

const BeaconMax = 4;
const C1BeaconMax = 5;
const A1SteadyMasteryPerBeacon = 30;
const A4CritRatePerStack = 5;
const A4MaxStacks = 4;
const JubileeBasePerMastery = 0.028;
const JubileeBaseCap = 14;
const C1CritDmg = 40;
const C2ResistanceReduction = -20;
const C2SteadyMastery = 123;
const C2OverloadedMastery = 234;
const C4MasteryDmg = 300;
const C6SteadyCoreDmgMultiplier = 1.15;
const C6StellarConductElevation = 20;

const coreName = 'mitya_detection_core';
const beaconsName = 'mitya_gradient_beacons';
const partyCoreName = 'party.mitya_detection_core';
const partyBeaconsName = 'party.mitya_gradient_beacons';

const maxBeacons = (settings) => (settings.char_constellation || 0) >= 1 ? C1BeaconMax : BeaconMax;

function coreDropdown(name, serializeId, rotation) {
    return new ConditionDropdown({
        name: name,
        serializeId: serializeId,
        title: 'talent_name.n11360002',
        description: 'talent_descr.n11360002',
        rotation: rotation,
        values: [
            {
                title_str: 'talent_name.mitya_detection_core_steady',
                value: 'steady',
                serializeId: 1,
                conditions: [],
            },
            {
                title_str: 'talent_name.mitya_detection_core_overloaded',
                value: 'overloaded',
                serializeId: 2,
                conditions: [],
            },
        ],
    });
}

const corePresent = () => new ConditionBoolean({name: coreName});
const steadyCore = () => new ConditionBooleanDropdownValue({name: coreName, value: 'steady'});
const overloadedCore = () => new ConditionBooleanDropdownValue({name: coreName, value: 'overloaded'});
const partyCorePresent = () => new ConditionBoolean({name: partyCoreName});
const partySteadyCore = () => new ConditionBooleanDropdownValue({name: partyCoreName, value: 'steady'});
const partyOverloadedCore = () => new ConditionBooleanDropdownValue({name: partyCoreName, value: 'overloaded'});
const hasBeacon = () => new ConditionBooleanValue({setting: beaconsName, cond: 'ge', value: 1});

// Detection Core: Steady State damage is 115% of its original DMG at C6.
const c6SteadyCore = () => new ConditionAnd([
    new ConditionConstellation({constellation: 6}),
    steadyCore(),
]);

const a1MasteryTable = () => new StatTable(
    'mastery',
    [0, 1, 2, 3, 4, 5].map((beacons) => beacons * A1SteadyMasteryPerBeacon),
);

const jubileeBasePost = new PostEffectStatsMastery({
    percent: new StatTable('stellarconduct_multi', [JubileeBasePerMastery]),
    statCap: new ValueTable([JubileeBaseCap]),
});

function attackMultiplier(name, scaling) {
    return new FeatureMultiplier({
        scaling: scaling,
        leveling: 'char_skill_attack',
        values: Talents.get('attack.' + name),
    });
}

function skillMultiplier(name, scaling, steadyCoreDamage = false) {
    return new FeatureMultiplier({
        scaling: scaling,
        leveling: 'char_skill_elemental',
        values: Talents.get('skill.' + name),
        scalingMultiplier: steadyCoreDamage ? C6SteadyCoreDmgMultiplier : 1,
        scalingSource: steadyCoreDamage ? 'constellation6' : '',
        scalingMultiplierCondition: steadyCoreDamage ? c6SteadyCore() : undefined,
    });
}

export const Mitya = new DbObjectChar({
    name: 'mitya',
    serializeId: 129,
    gameId: 10000136,
    iconClass: 'char-icon-mitya',
    rarity: 5,
    element: 'electro',
    weapon: 'catalyst',
    origin: 'snezhnaya',
    talents: Talents,
    statTable: charTables.Mitya,
    features: [
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            element: 'electro',
            multipliers: [attackMultiplier('normal_hit_1')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            element: 'electro',
            multipliers: [attackMultiplier('normal_hit_2')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3',
            element: 'electro',
            multipliers: [attackMultiplier('normal_hit_3')],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit',
            element: 'electro',
            multipliers: [attackMultiplier('charged_hit')],
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
            element: 'electro',
            multipliers: [attackMultiplier('plunge')],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_low',
            element: 'electro',
            multipliers: [attackMultiplier('plunge_low')],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            element: 'electro',
            multipliers: [attackMultiplier('plunge_high')],
        }),
        // Gradient Detonation needs an Overloaded core and at least one Beacon.
        new FeatureDamageCharged({
            name: 'mitya_gradient_detonation',
            element: 'electro',
            multipliers: [attackMultiplier('mitya_gradient_detonation')],
            condition: new ConditionAnd([overloadedCore(), hasBeacon()]),
        }),
        // One instance per consumed Gradient Beacon.
        new FeatureDamageStellarConduct({
            category: 'attack',
            name: 'mitya_gradient_detonation_stellarconduct',
            element: 'electro',
            multipliers: [attackMultiplier('mitya_gradient_detonation_stellarconduct', 'mastery*')],
            condition: new ConditionAnd([overloadedCore(), hasBeacon()]),
        }),
        new FeatureDamageSkill({
            name: 'press_dmg',
            element: 'electro',
            multipliers: [skillMultiplier('press_dmg')],
        }),
        new FeatureDamageSkill({
            name: 'hold_dmg',
            element: 'electro',
            multipliers: [skillMultiplier('hold_dmg')],
        }),
        new FeatureDamageSkill({
            name: 'mitya_steady_state_core',
            element: 'electro',
            multipliers: [skillMultiplier('mitya_steady_state_core', undefined, true)],
            condition: steadyCore(),
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'mitya_steady_state_core_beacon_stellarconduct',
            element: 'electro',
            multipliers: [skillMultiplier('mitya_steady_state_core_beacon_stellarconduct', 'mastery*', true)],
            condition: steadyCore(),
        }),
        // The final detonation consumes every Beacon Mitya has.
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'mitya_steady_state_core_detonation_stellarconduct',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    stacksLeveling: beaconsName,
                    maxStacks: maxBeacons,
                    values: Talents.get('skill.mitya_steady_state_core_detonation_stellarconduct'),
                    scalingMultiplier: C6SteadyCoreDmgMultiplier,
                    scalingSource: 'constellation6',
                    scalingMultiplierCondition: c6SteadyCore(),
                }),
            ],
            condition: new ConditionAnd([steadyCore(), hasBeacon()]),
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.mitya_gradient_theory_mastery'),
                }),
            ],
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'mitya_top_secret_protocol',
            postEffect: jubileeBasePost,
            format: 'percent',
        }),
        // One instance for every five Beacons consumed while a core is on the field.
        new FeatureDamageStellarConduct({
            category: 'other',
            name: 'mitya_the_isotopes_born_of_decay_stellarconduct',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation4',
                    values: new ValueTable([C4MasteryDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                corePresent(),
            ]),
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                allowed_stellarconduct: 1,
            },
        }),
        coreDropdown(coreName, 1, 'self'),
        new ConditionNumber({
            name: beaconsName,
            serializeId: 2,
            title: 'talent_name.n11360001',
            description: 'talent_descr.n11360001',
            rotation: 'self',
            min: 0,
            max: maxBeacons,
            allowMinZero: true,
            forceSettings: true,
            noStat: true,
        }),
        new ConditionStatic({
            title: 'talent_name.mitya_baseline_stress_test',
            description: 'talent_descr.mitya_baseline_stress_test',
            info: {ascension: 1},
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStaticLevel({
            isHidden: true,
            levelSetting: beaconsName,
            fromZero: true,
            stats: [a1MasteryTable()],
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                steadyCore(),
            ]),
        }),
        new ConditionStacks({
            name: 'mitya_safe_limits_exceeded',
            serializeId: 3,
            title: 'talent_name.mitya_safe_limits_exceeded',
            description: 'talent_descr.mitya_safe_limits_exceeded',
            info: {ascension: 4},
            rotation: 'self',
            maxStacks: A4MaxStacks,
            stats: [
                new StatTable('crit_rate', [A4CritRatePerStack]),
            ],
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionStatic({
            title: 'talent_name.mitya_top_secret_protocol',
            description: 'talent_descr.mitya_top_secret_protocol',
        }),
    ],
    postEffects: [
        jubileeBasePost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'mitya_the_observer_seeking_what_is_missing',
                    serializeId: 4,
                    title: 'talent_name.mitya_the_observer_seeking_what_is_missing',
                    description: 'talent_descr.mitya_the_observer_seeking_what_is_missing',
                    rotation: 'self',
                    stats: {
                        crit_dmg: C1CritDmg,
                    },
                    condition: corePresent(),
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.mitya_the_matter_that_slumbers_beyond_inertness',
                    description: 'talent_descr.mitya_the_matter_that_slumbers_beyond_inertness',
                }),
                new Condition({
                    isHidden: true,
                    stats: {
                        enemy_res_cryo: C2ResistanceReduction,
                        enemy_res_electro: C2ResistanceReduction,
                    },
                    condition: new ConditionAnd([
                        corePresent(),
                        new ConditionBoolean({name: 'polestar_field'}),
                    ]),
                }),
                new Condition({
                    isHidden: true,
                    stats: {
                        mastery: C2SteadyMastery,
                    },
                    condition: steadyCore(),
                }),
                // Overloaded only buffs your own active character.
                new ConditionBoolean({
                    name: 'mitya_the_matter_that_slumbers_beyond_inertness',
                    serializeId: 5,
                    title: 'talent_name.mitya_the_matter_that_slumbers_beyond_inertness',
                    rotation: 'self',
                    stats: {
                        mastery: C2OverloadedMastery,
                    },
                    condition: overloadedCore(),
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
                    title: 'talent_name.mitya_the_isotopes_born_of_decay',
                    description: 'talent_descr.mitya_the_isotopes_born_of_decay',
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
                    title: 'talent_name.mitya_elemental_transition_at_the_gate_of_reason',
                    description: 'talent_descr.mitya_elemental_transition_at_the_gate_of_reason',
                    stats: {
                        dmg_stellarconduct_special: C6StellarConductElevation,
                    },
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['mastery_total'],
        },
        conditions: [
            new Condition({
                settings: {
                    allowed_stellarconduct: 1,
                },
            }),
            new ConditionNumber({
                name: 'mitya_mastery_total',
                serializeId: 1,
                title: 'talent_name.stats_total_mastery',
                partyStat: 'mastery_total',
                max: 10000,
            }),
            new ConditionStatic({
                title: 'talent_name.mitya_top_secret_protocol',
                description: 'talent_descr.mitya_top_secret_protocol',
            }),
            coreDropdown(partyCoreName, 2, 'party'),
            new ConditionNumber({
                name: partyBeaconsName,
                serializeId: 3,
                title: 'talent_name.mitya_baseline_stress_test',
                description: 'talent_descr.mitya_baseline_stress_test',
                info: {ascension: 1},
                rotation: 'party',
                min: 0,
                max: C1BeaconMax,
                allowMinZero: true,
                forceSettings: true,
                noStat: true,
                condition: partySteadyCore(),
            }),
            new ConditionStaticLevel({
                isHidden: true,
                levelSetting: partyBeaconsName,
                fromZero: true,
                stats: [a1MasteryTable()],
                condition: partySteadyCore(),
            }),
            new ConditionBoolean({
                name: 'party.mitya_the_observer_seeking_what_is_missing',
                serializeId: 4,
                title: 'talent_name.mitya_the_observer_seeking_what_is_missing',
                description: 'talent_descr.mitya_the_observer_seeking_what_is_missing',
                info: {constellation: 1},
                rotation: 'party',
                stats: {
                    crit_dmg: C1CritDmg,
                },
                condition: partyCorePresent(),
            }),
            new ConditionBoolean({
                name: 'party.mitya_the_matter_that_slumbers_beyond_inertness',
                serializeId: 5,
                title: 'talent_name.mitya_the_matter_that_slumbers_beyond_inertness',
                description: 'talent_descr.mitya_the_matter_that_slumbers_beyond_inertness',
                info: {constellation: 2},
                rotation: 'party',
                condition: partyCorePresent(),
            }),
            new Condition({
                isHidden: true,
                stats: {
                    enemy_res_cryo: C2ResistanceReduction,
                    enemy_res_electro: C2ResistanceReduction,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.mitya_the_matter_that_slumbers_beyond_inertness'}),
                    partyCorePresent(),
                    new ConditionBoolean({name: 'polestar_field'}),
                ]),
            }),
            new Condition({
                isHidden: true,
                stats: {
                    mastery: C2SteadyMastery,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.mitya_the_matter_that_slumbers_beyond_inertness'}),
                    partySteadyCore(),
                ]),
            }),
            new Condition({
                isHidden: true,
                stats: {
                    mastery: C2OverloadedMastery,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.mitya_the_matter_that_slumbers_beyond_inertness'}),
                    partyOverloadedCore(),
                ]),
            }),
            new ConditionBoolean({
                name: 'party.mitya_elemental_transition_at_the_gate_of_reason',
                serializeId: 6,
                title: 'talent_name.mitya_elemental_transition_at_the_gate_of_reason',
                description: 'talent_descr.mitya_elemental_transition_at_the_gate_of_reason',
                info: {constellation: 6},
                rotation: 'party',
                stats: {
                    dmg_stellarconduct_special: C6StellarConductElevation,
                },
            }),
        ],
        postEffects: [
            new PostEffectStats({
                from: 'mitya_mastery_total',
                percent: new StatTable('stellarconduct_multi', [JubileeBasePerMastery]),
                statCap: new ValueTable([JubileeBaseCap]),
            }),
        ],
    },
});
