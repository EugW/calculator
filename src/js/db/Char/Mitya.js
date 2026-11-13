import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanDropdownValue } from "../../classes/Condition/Boolean/DropdownValue";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdown } from "../../classes/Condition/Dropdown";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionStaticLevel } from "../../classes/Condition/Static/Level";
import { ConditionTeam } from "../../classes/Condition/Team";
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
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsMastery } from "../../classes/PostEffect/Stats/Mastery";
import { PostEffectStatsStatic } from "../../classes/PostEffect/Stats/Static";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent, plus } from "../Params";

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

// Passive and constellation values. Typed where the game data has no
// position: the Gradient Beacon limits (4, 5 at C1) and A4's 4 stacks are
// fixed inside the abilities.
const BeaconMax = 4;
const C1BeaconMax = 5;
const A1SteadyMasteryPerBeacon = charTalentTables.Mitya.a1.p1;
const A4CritRatePerStack = percent(charTalentTables.Mitya.a4.p1);
const A4MaxStacks = 4;
const JubileeBasePerMastery = percent(charTalentTables.Mitya.a0.p1);
const JubileeBaseCap = percent(charTalentTables.Mitya.a0.p2);
const C1CritDmg = percent(charTalentTables.Mitya.c1.p1);
const C2ResistanceReduction = -percent(charTalentTables.Mitya.c2.p1);
const C2SteadyMastery = charTalentTables.Mitya.c2.p2;
const C2OverloadedMastery = charTalentTables.Mitya.c2.p3;
const C4MasteryDmg = percent(charTalentTables.Mitya.c4.p1);
const C6StellarConductElevation = percent(charTalentTables.Mitya.c6.p2);
const C6SteadyCoreDmgMultiplier = plus(1, charTalentTables.Mitya.c6.p3);

const coreName = 'mitya_detection_core';
const beaconsName = 'mitya_gradient_beacons';
const a4StacksName = 'mitya_safe_limits_exceeded';

const maxBeacons = (settings) => (settings.char_constellation || 0) >= 1 ? C1BeaconMax : BeaconMax;

const corePresent = () => new ConditionBoolean({name: coreName});
const steadyCore = () => new ConditionBooleanDropdownValue({name: coreName, value: 'steady'});
const overloadedCore = () => new ConditionBooleanDropdownValue({name: coreName, value: 'overloaded'});
const hasBeacon = () => new ConditionBooleanValue({setting: beaconsName, cond: 'ge', value: 1});
// "Your own active character": the team's on-field member, Mitya included.
const activeRecipient = () => new ConditionReceiver({condition: new ConditionOnField()});
const inPolestarField = () => new ConditionTeam({condition: new ConditionBoolean({name: 'polestar_field'})});

// Detection Core: Steady State damage is 115% of its original DMG at C6.
const c6SteadyCore = () => new ConditionAnd([
    new ConditionConstellation({constellation: 6}),
    steadyCore(),
]);

const a1MasteryTable = () => new StatTable(
    'mastery',
    [0, 1, 2, 3, 4, 5].map((beacons) => beacons * A1SteadyMasteryPerBeacon),
);

// A4 Explosive Reagent: Safe Limits Exceeded: "Mitya's CRIT Rate increases
// by 5% ... This effect can stack up to 4 times." Game data:
// Avatar_Mitya_PermanentSkill_2, Mitya_T2_CritBuff writes
// Actor_CriticalExtraDelta: a flat bonus in the extra part, so it is a
// post-effect (a condition's stats are always premod; md/buff_chains.md).
const a4CritPost = new PostEffectStatsStatic({
    percent: new StatTable('crit_rate', [A4CritRatePerStack]),
    stacksSetting: a4StacksName,
    conditions: [
        new ConditionAscensionChar({ascension: 4}),
        new ConditionBooleanValue({setting: a4StacksName, cond: 'ge', value: 1}),
    ],
});

// Stellar Jubilee: Top-Secret Protocol: "the Base Stellar-Conduct DMG dealt
// by all nearby party members will be increased based on Mitya's Elemental
// Mastery: Every point ... by 0.028%. The maximum ... is 14%." Game data:
// Avatar_Mitya_PermanentSkill_3 sets it with
// SetNewElementReactionBaseDamageRatioParam (propType Mastery;
// AS_AttackTransferRatio, AS_MaxTransRatio), which names no premod or total
// read. The same call reads the total stat in game (Ineffa's Benediction,
// in-game test: md/buff_chains.md): extra Elemental Mastery counts.
const jubileeBasePost = new PostEffectStatsMastery({
    receivers: RECEIVERS.TEAM,
    reads: CHANNELS.TOTAL,
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
        // One instance for every five Beacons consumed while a core is on
        // the field. The core deals it, so C6's Steady State bonus ("Detection
        // Core deals 115% of its original DMG") applies. Game data:
        // Avatar_Mitya_Constellation_4, Mitya_C4_ExtraAttack multiplies the
        // hit by AS_Constellation_6_StableDamageUp in the core's Steady
        // State (ability_channels.txt: c4.p1, c6.p3). The released
        // calculator leaves the 115% out.
        new FeatureDamageStellarConduct({
            category: 'other',
            name: 'mitya_the_isotopes_born_of_decay_stellarconduct',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation4',
                    values: new ValueTable([C4MasteryDmg]),
                    scalingMultiplier: C6SteadyCoreDmgMultiplier,
                    scalingSource: 'constellation6',
                    scalingMultiplierCondition: c6SteadyCore(),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                corePresent(),
            ]),
        }),
    ],
    conditions: [
        // "When party members trigger Superconduct, it will be changed to
        // Stellar-Conduct."
        new Condition({
            receivers: RECEIVERS.TEAM,
            settings: {
                allowed_stellarconduct: 1,
            },
        }),
        new ConditionDropdown({
            name: coreName,
            serializeId: 1,
            title: 'talent_name.n11360002',
            description: 'talent_descr.n11360002',
            rotation: 'self',
            dropdownClass: 'medium-text',
            separateControlLine: true,
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
        }),
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
        // A1 Baseline Stress Test: "Steady State: All nearby party members
        // gain 30 Elemental Mastery for each Gradient Beacon Mitya has."
        // Game data: Avatar_Mitya_PermanentSkill_1,
        // UNIQUE_Mitya_PS1_TeamMasteryBuff writes Actor_ElemMasteryDelta
        // (premod), no stat read: a flat condition needs nothing.
        new ConditionStaticLevel({
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            levelSetting: beaconsName,
            fromZero: true,
            stats: [a1MasteryTable()],
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                steadyCore(),
            ]),
        }),
        // Its CRIT Rate is a4CritPost.
        new ConditionStacks({
            name: a4StacksName,
            serializeId: 3,
            title: 'talent_name.mitya_safe_limits_exceeded',
            description: 'talent_descr.mitya_safe_limits_exceeded',
            info: {ascension: 4},
            rotation: 'self',
            maxStacks: A4MaxStacks,
            displayStats: [
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
        a4CritPost,
        jubileeBasePost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                // C1: "While the Detection Core is present, your own active
                // character's CRIT DMG is increased by 40%." Game data:
                // Avatar_Mitya_Constellation_1,
                // UNIQUE_Mitya_C1_FrontCritHurt_Effect writes
                // Actor_CriticalHurtDelta (premod), no stat read.
                new ConditionBoolean({
                    name: 'mitya_the_observer_seeking_what_is_missing',
                    serializeId: 4,
                    title: 'talent_name.mitya_the_observer_seeking_what_is_missing',
                    description: 'talent_descr.mitya_the_observer_seeking_what_is_missing',
                    rotation: 'self',
                    displayStats: {
                        crit_dmg: C1CritDmg,
                    },
                    condition: corePresent(),
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        crit_dmg: C1CritDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'mitya_the_observer_seeking_what_is_missing'}),
                        corePresent(),
                        activeRecipient(),
                    ]),
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.mitya_the_matter_that_slumbers_beyond_inertness',
                    description: 'talent_descr.mitya_the_matter_that_slumbers_beyond_inertness',
                }),
                // "While the Detection Core is present, all opponents within
                // the Polestar Field have their Cryo RES and Electro RES
                // decreased by 20%": the enemy's, for the whole team.
                new Condition({
                    isHidden: true,
                    stats: {
                        enemy_res_cryo: C2ResistanceReduction,
                        enemy_res_electro: C2ResistanceReduction,
                    },
                    condition: new ConditionAnd([
                        corePresent(),
                        inPolestarField(),
                    ]),
                }),
                // "Steady State: All nearby party members gain 123 Elemental
                // Mastery." Game data: Avatar_Mitya_Constellation_2,
                // UNIQUE_Mitya_C2_TeamMasteryBuff and
                // UNIQUE_Mitya_C2_FrontMastery_Effect write
                // Actor_ElemMasteryDelta (premod), no stat read.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        mastery: C2SteadyMastery,
                    },
                    condition: steadyCore(),
                }),
                // "Overloaded: Your own active character gains 234 Elemental
                // Mastery."
                new ConditionBoolean({
                    name: 'mitya_the_matter_that_slumbers_beyond_inertness',
                    serializeId: 5,
                    title: 'talent_name.mitya_the_matter_that_slumbers_beyond_inertness',
                    rotation: 'self',
                    displayStats: {
                        mastery: C2OverloadedMastery,
                    },
                    condition: overloadedCore(),
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        mastery: C2OverloadedMastery,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'mitya_the_matter_that_slumbers_beyond_inertness'}),
                        overloadedCore(),
                        activeRecipient(),
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
                // "Stellar-Conduct reaction DMG dealt by all nearby party
                // members is Elevated by 20%."
                new ConditionStatic({
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.mitya_elemental_transition_at_the_gate_of_reason',
                    description: 'talent_descr.mitya_elemental_transition_at_the_gate_of_reason',
                    stats: {
                        dmg_stellarconduct_special: C6StellarConductElevation,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'dropdown'], [3, 'number'], [4, 'checkbox'], [5, 'checkbox'], [6, 'checkbox']],
});
