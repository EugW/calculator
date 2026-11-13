import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionTeam } from "../../classes/Condition/Team";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionOr } from "../../classes/Condition/Or";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageStellarConduct } from "../../classes/Feature2/Damage/StellarConduct";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageMultihit } from "../../classes/Feature2/Damage/Multihit";
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
        gameId: charTalentTables.Cyno.s1_id,
        title: 'talent_name.cyno_invokers_spear',
        description: 'talent_descr.cyno_invokers_spear',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Cyno.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Cyno.s1.p2),
            },
            {
                type: 'multihit',
                hits: 2,
                table: new StatTable('normal_hit_3', charTalentTables.Cyno.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Cyno.s1.p5),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Cyno.s1.p6),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Cyno.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Cyno.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Cyno.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Cyno.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Cyno.s2_id,
        title: 'talent_name.cyno_chasmic_soulfarer',
        description: 'talent_descr.cyno_chasmic_soulfarer',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.Cyno.s2.p1),
            },
            {
                table: new StatTable('cyno_mortuary_rite_dmg', charTalentTables.Cyno.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cyno_duration_bonus', charTalentTables.Cyno.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Cyno.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cyno_cd', charTalentTables.Cyno.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Cyno.s3_id,
        title: 'talent_name.cyno_wolfs_swiftness',
        description: 'talent_descr.cyno_wolfs_swiftness',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Cyno.s3.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Cyno.s3.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Cyno.s3.p3),
            },
            {
                type: 'multihit',
                hits: 2,
                table: new StatTable('normal_hit_4', charTalentTables.Cyno.s3.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Cyno.s3.p6),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Cyno.s3.p7),
            },
            {
                unit: 'per_sec',
                table: new StatTable('stamina_cost', charTalentTables.Cyno.s3.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Cyno.s3.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Cyno.s3.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Cyno.s3.p11),
            },
            {
                unit: '',
                table: new StatTable('cyno_mastery_bonus', charTalentTables.Cyno.s3.p12),
            },
            {
                unit: 'sec',
                table: new StatTable('cyno_duration', charTalentTables.Cyno.s3.p13),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Cyno.s3.p14),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Cyno.s3.p15),
            },
        ],
    },
});

const TalentValues = {
    BurstMastery: 100,
    A1SkillDmgBonus: percent(charTalentTables.Cyno.a1.p1),
    A1DustStalkerDmg: percent(charTalentTables.Cyno.a1.p2),
    A1StarsameDmg: percent(charTalentTables.Cyno.a1.p3),
    A4NormalMasteryDmg: percent(charTalentTables.Cyno.a4.p1),
    A4DustStalkerMasteryDmg: percent(charTalentTables.Cyno.a4.p2),
    A4StarsameMasteryDmg: percent(charTalentTables.Cyno.a4.p3),
    C1AtkSpeed: percent(charTalentTables.Cyno.c1.p1),
    C1Mastery: charTalentTables.Cyno.c1.p3,
    C2ElectroDmg: percent(charTalentTables.Cyno.c2.p1),
    C2StellarConductDmg: percent(charTalentTables.Cyno.c2.p5),
    C2MaxStacks: charTalentTables.Cyno.c2.p3,
};

// Together We Rise passes to the incoming active character when switching
// from Cyno on the field.
const activeReceiver = new ConditionReceiver({
    condition: new ConditionOnField(),
});

export const Cyno = new DbObjectChar({
    name: 'cyno',
    serializeId: 59,
    gameId: 10000071,
    iconClass: "char-icon-cyno",
    rarity: 5,
    element: 'electro',
    weapon: 'polearm',
    origin: 'sumeru',
    talents: Talents,
    statTable: charTables.Cyno,
    features: [
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
            ]),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
            ]),
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_3',
            allowInfusion: true,
            items: [
                {
                    hits: 2,
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_3'),
                        }),
                    ],
                },
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
            ]),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3_1',
            isChild: true,
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
            ]),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
            ]),
        }),
        new FeatureDamageCharged({
            name: 'charged_hit',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
            ]),
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
            ]),
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_low',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
            ]),
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
            ]),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.normal_hit_1'),
                }),
            ],
            condition: new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.normal_hit_2'),
                }),
            ],
            condition: new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.normal_hit_3'),
                }),
            ],
            condition: new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
        }),
        new FeatureDamageMultihit({
            name: 'normal_hit_4',
            category: 'attack',
            element: 'electro',
            damageType: 'normal',
            allowInfusion: true,
            items: [
                {
                    hits: 2,
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_burst',
                            values: Talents.get('burst.normal_hit_4'),
                        }),
                    ],
                },
            ],
            condition: new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4_1',
            element: 'electro',
            isChild: true,
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.normal_hit_4'),
                }),
            ],
            condition: new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.normal_hit_5'),
                }),
            ],
            condition: new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
        }),
        new FeatureDamageCharged({
            name: 'charged_hit',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.charged_hit'),
                }),
            ],
            condition: new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.plunge'),
                }),
            ],
            condition: new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_low',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.plunge_low'),
                }),
            ],
            condition: new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.plunge_high'),
                }),
            ],
            condition: new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
        }),
        new FeatureDamageSkill({
            name: 'skill_dmg',
            element: 'electro',
            damageBonuses: ['dmg_skill_cyno'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'cyno_mortuary_rite_dmg',
            element: 'electro',
            damageBonuses: ['dmg_skill_cyno'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.cyno_mortuary_rite_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'cyno_duststalker_bolt_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    source: 'ascension1',
                    values: new ValueTable([TalentValues.A1DustStalkerDmg]),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'ascension4',
                    values: new ValueTable([TalentValues.A4DustStalkerMasteryDmg]),
                    condition: new ConditionAscensionChar({ascension: 4}),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
                new ConditionAscensionChar({ascension: 1}),
            ]),
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'cyno_duststalker_bolt_starsame',
            element: 'electro',
            hits: 3,
            tags: ['cyno_duststalker_bolt_starsame'],
            multipliers: [
                new FeatureMultiplier({
                    source: 'ascension1',
                    values: new ValueTable([TalentValues.A1StarsameDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
                new ConditionAscensionChar({ascension: 1}),
                new ConditionOr([
                    new ConditionBoolean({name: 'cyno_radiance_stellarconduct'}),
                    new ConditionAnd([
                        new ConditionConstellation({constellation: 6}),
                        new ConditionBoolean({name: 'cyno_together_we_rise'}),
                    ]),
                ]),
            ]),
        }),
    ],
    multipliers: [
        new FeatureMultiplier({
            scaling: 'mastery*',
            source: 'ascension4',
            values: new ValueTable([TalentValues.A4NormalMasteryDmg]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
                new ConditionAscensionChar({ascension: 4}),
            ]),
            target: new FeatureMultiplierTarget({
                damageElements: ['electro'],
                damageTypes: ['normal'],
            }),
        }),
        new FeatureMultiplier({
            scaling: 'mastery*',
            source: 'ascension4',
            values: new ValueTable([TalentValues.A4StarsameMasteryDmg]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
                new ConditionAscensionChar({ascension: 4}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['cyno_duststalker_bolt_starsame'],
                options: ['stellarconduct_flat'],
            }),
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'cyno_wolfs_swiftness',
            serializeId: 1,
            title: 'talent_name.cyno_pactsworn_pathclearer',
            description: 'talent_descr.cyno_pactsworn_pathclearer',
            stats: {
                mastery: TalentValues.BurstMastery,
            },
        }),
        new ConditionBoolean({
            name: 'cyno_featherfall_judgment',
            serializeId: 2,
            title: 'talent_name.cyno_featherfall_judgment',
            description: 'talent_descr.cyno_featherfall_judgment_buffed',
            info: {ascension: 1},
            stats: {
                dmg_skill_cyno: TalentValues.A1SkillDmgBonus,
                text_percent_dmg: TalentValues.A1DustStalkerDmg,
                text_percent_dmg2: TalentValues.A1StarsameDmg,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.cyno_authority_over_the_nine_bows',
            description: 'talent_descr.cyno_authority_over_the_nine_bows_buffed',
            info: {ascension: 4},
            stats: {
                text_percent_dmg: TalentValues.A4NormalMasteryDmg,
                text_percent_dmg2: TalentValues.A4DustStalkerMasteryDmg,
                text_percent_dmg3: TalentValues.A4StarsameMasteryDmg,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
                new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
            ],
        }),
        new ConditionBoolean({
            name: 'cyno_radiance_stellarconduct',
            serializeId: 4,
            title: 'talent_name.cyno_a_star_with_which_to_start_the_journey',
            description: 'talent_descr.cyno_a_star_with_which_to_start_the_journey',
            subConditions: [
                new ConditionTeam({condition: new ConditionBoolean({name: 'polestar_field'})}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.cyno_unceasing_vigil',
                    description: 'talent_descr.cyno_unceasing_vigil_buffed',
                    stats: {
                        atk_speed_normal: TalentValues.C1AtkSpeed,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'cyno_wolfs_swiftness'}),
                        new ConditionBoolean({name: 'cyno_featherfall_judgment'}),
                        new ConditionAscensionChar({ascension: 1}),
                    ],
                }),
                new ConditionBoolean({
                    name: 'cyno_together_we_rise',
                    serializeId: 5,
                    title: 'talent_name.cyno_unceasing_vigil',
                    description: 'talent_descr.cyno_unceasing_vigil_buffed',
                    stats: {
                        mastery: TalentValues.C1Mastery,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'cyno_radiance_stellarconduct'}),
                    ],
                }),
                // The incoming active character takes on Together We Rise;
                // Cyno keeps his own copy above.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        mastery: TalentValues.C1Mastery,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'cyno_together_we_rise'}),
                        new ConditionBoolean({name: 'cyno_radiance_stellarconduct'}),
                        new ConditionTeam({condition: new ConditionBoolean({name: 'polestar_field'})}),
                        activeReceiver,
                    ]),
                }),
            ],
        },
        {
            conditions: [
                new ConditionStacks({
                    name: 'cyno_homecoming_of_spirits',
                    serializeId: 3,
                    title: 'talent_name.cyno_homecoming_of_spirits',
                    description: 'talent_descr.cyno_homecoming_of_spirits_buffed',
                    maxStacks: TalentValues.C2MaxStacks,
                    stats: [
                        new StatTable('dmg_electro', [TalentValues.C2ElectroDmg]),
                    ],
                }),
                new ConditionStacks({
                    name: 'cyno_homecoming_of_spirits_stellarconduct',
                    serializeId: 6,
                    title: 'talent_name.cyno_homecoming_of_spirits',
                    description: 'talent_descr.cyno_homecoming_of_spirits_buffed',
                    maxStacks: TalentValues.C2MaxStacks,
                    stats: [
                        new StatTable('dmg_stellarconduct', [TalentValues.C2StellarConductDmg]),
                    ],
                    subConditions: [
                        new ConditionBoolean({name: 'cyno_together_we_rise'}),
                    ],
                }),
                // Characters affected by Together We Rise raise their
                // Stellar-Conduct DMG, one hidden copy per stack; Cyno keeps
                // his own copy above.
                ...[1, 2, 3, 4, 5].map((level) => new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        dmg_stellarconduct: TalentValues.C2StellarConductDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionBooleanValue({
                            setting: 'cyno_homecoming_of_spirits_stellarconduct',
                            cond: 'ge',
                            value: level,
                        }),
                        new ConditionBoolean({name: 'cyno_together_we_rise'}),
                        new ConditionBoolean({name: 'cyno_radiance_stellarconduct'}),
                        new ConditionTeam({condition: new ConditionBoolean({name: 'polestar_field'})}),
                        activeReceiver,
                    ]),
                })),
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
                    title: 'talent_name.cyno_forbidding_guard',
                    description: 'talent_descr.cyno_forbidding_guard_buffed',
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
                    title: 'talent_name.cyno_just_scales',
                    description: 'talent_descr.cyno_just_scales_buffed',
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'checkbox'], [2, 'stacks']],
});
