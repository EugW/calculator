import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStatic } from "../../classes/Condition/Static";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamage } from "../../classes/Feature2/Damage";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageChargedAimed } from "../../classes/Feature2/Damage/Charged/Aimed";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureHeal } from "../../classes/Feature2/Heal";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Fischl.s1_id,
        title: 'talent_name.fischl_bolts_of_downfall',
        description: 'talent_descr.fischl_bolts_of_downfall',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Fischl.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Fischl.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Fischl.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Fischl.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Fischl.s1.p5),
            },
            {
                table: new StatTable('aimed', charTalentTables.Fischl.s1.p6),
            },
            {
                table: new StatTable('charged_aimed', charTalentTables.Fischl.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Fischl.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Fischl.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Fischl.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Fischl.s2_id,
        title: 'talent_name.fischl_nightrider',
        description: 'talent_descr.fischl_nightrider',
        items: [
            {
                table: new StatTable('fischl_oz_dmg', charTalentTables.Fischl.s2.p1),
            },
            {
                table: new StatTable('skill_dmg', charTalentTables.Fischl.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('fischl_oz_duration', charTalentTables.Fischl.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Fischl.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Fischl.s3_id,
        title: 'talent_name.fischl_midnight_phantasmagoria',
        description: 'talent_descr.fischl_midnight_phantasmagoria',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Fischl.s3.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Fischl.s3.p5),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Fischl.s3.p6),
            },
        ],
    },
});

const TalentValues = {
    A1ChargedDmg: percent(charTalentTables.Fischl.a1.p1),
    A4OzDmg: percent(charTalentTables.Fischl.a4.p1),
    C1OzDmg: percent(charTalentTables.Fischl.c1.p1),
    C2SkillDmg: percent(charTalentTables.Fischl.c2.p1),
    C4BurstDmg: percent(charTalentTables.Fischl.c4.p1),
    C4BurstHeal: percent(charTalentTables.Fischl.c4.p2),
    C6OzDmg: percent(charTalentTables.Fischl.c6.p1),
    SpAtk: percent(charTalentTables.Fischl.sp.p2),
    SpMastery: charTalentTables.Fischl.sp.p4,
};

const condWitchHomeworkOn  = new ConditionBoolean({name: 'fischl_witch_homework'});
const condWitchHomeworkOff = new ConditionNot([condWitchHomeworkOn]);
const condHexereiResonance = new ConditionHexereiResonance({});
// Phantasmal Nocturne also raises other nearby active party members;
// Fischl herself keeps the amounts from her own toggles above.
const condActiveReceiver = new ConditionReceiver({
    condition: new ConditionOnField(),
});

export const Fischl = new DbObjectChar({
    name: 'fischl',
    serializeId: 9,
    gameId: 10000031,
    iconClass: "char-icon-fischl",
    rarity: 4,
    element: 'electro',
    weapon: 'bow',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Fischl,
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
        new FeatureDamageNormal({
            name: 'normal_hit_5',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'fischl_gaze_of_the_deep',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation1',
                    values: new ValueTable([TalentValues.C1OzDmg]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 1}),
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
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_aimed'),
                }),
            ],
        }),

        new FeatureDamageChargedAimed({
            name: 'fischl_stellar_predator',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    scalingSource: 'ascension1',
                    scalingMultiplier: TalentValues.A1ChargedDmg / 100,
                    values: Talents.get('attack.charged_aimed'),
                }),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
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
            name: 'fischl_oz_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.fischl_oz_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'skill_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
                new FeatureMultiplier({
                    values: new ValueTable([TalentValues.C2SkillDmg]),
                    source: 'constellation2',
                    condition: new ConditionConstellation({constellation: 2}),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'fischl_undone',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    source: 'ascension4',
                    values: new ValueTable([TalentValues.A4OzDmg]),
                }),
            ],
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new FeatureDamageSkill({
            name: 'fischl_evernight_raven',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation6',
                    values: new ValueTable([TalentValues.C6OzDmg]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamage({
            name: 'fischl_her_pilgrimage_of_bleak',
            category: 'burst',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new ValueTable([TalentValues.C4BurstDmg]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 4}),
        }),
        new FeatureHeal({
            category: 'burst',
            name: 'fischl_her_pilgrimage_of_bleak_heal',
            partyHeal: 1,
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    source: 'constellation4',
                    values: new ValueTable([TalentValues.C4BurstHeal]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'fischl_witch_homework',
            serializeId: 1,
            title: 'talent_name.fischl_phantasmal_nocturne',
            description: 'talent_descr.fischl_phantasmal_nocturne',
            info: {hexerei: true},
        }),
        new ConditionBoolean({
            name: 'fischl_overloaded_buff',
            serializeId: 3,
            title: 'talent_name.fischl_overloaded_buff',
            hideCondition: [
                new ConditionNot([
                    new ConditionAnd([
                        condWitchHomeworkOn,
                        condHexereiResonance
                    ])
                ])
            ],
            condition: new ConditionAnd([
                condWitchHomeworkOn,
                condHexereiResonance
            ]),
            stats: {
                atk_percent: TalentValues.SpAtk,
            },
        }),
        new ConditionBoolean({
            name: 'fischl_electrocharged_buff',
            serializeId: 4,
            title: 'talent_name.fischl_electrocharged_buff',
            hideCondition: [
                new ConditionNot([
                    new ConditionAnd([
                        condWitchHomeworkOn,
                        condHexereiResonance
                    ])
                ])
            ],
            condition: new ConditionAnd([
                condWitchHomeworkOn,
                condHexereiResonance
            ]),
            stats: {
                mastery: TalentValues.SpMastery,
            },
        }),
        new Condition({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            condition: new ConditionAnd([
                condWitchHomeworkOn,
                condHexereiResonance,
                new ConditionBoolean({name: 'fischl_overloaded_buff'}),
                condActiveReceiver,
            ]),
            stats: {
                atk_percent: TalentValues.SpAtk,
            },
        }),
        new Condition({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            condition: new ConditionAnd([
                condWitchHomeworkOn,
                condHexereiResonance,
                new ConditionBoolean({name: 'fischl_electrocharged_buff'}),
                condActiveReceiver,
            ]),
            stats: {
                mastery: TalentValues.SpMastery,
            },
        }),
        new ConditionStatic({
            title: 'talent_name.fischl_stellar_predator',
            description: 'talent_descr.fischl_stellar_predator',
            stats: {
                text_percent_dmg: TalentValues.A1ChargedDmg,
            },
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.fischl_undone_be_thy_sinful_hex',
            description: 'talent_descr.fischl_undone_be_thy_sinful_hex',
            stats: {
                text_percent_dmg: TalentValues.A4OzDmg,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.fischl_gaze_of_the_deep',
                    description: 'talent_descr.fischl_gaze_of_the_deep',
                    stats: {
                        text_percent_dmg: TalentValues.C1OzDmg,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.fischl_devourer_of_all_sins',
                    description: 'talent_descr.fischl_devourer_of_all_sins',
                    stats: {
                        text_percent_dmg: TalentValues.C2SkillDmg,
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
                    title: 'talent_name.fischl_her_pilgrimage_of_bleak',
                    description: 'talent_descr.fischl_her_pilgrimage_of_bleak',
                    stats: {
                        text_percent_dmg: TalentValues.C4BurstDmg,
                        text_percent_hp: TalentValues.C4BurstHeal,
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
                    title: 'talent_name.fischl_evernight_raven',
                    description: 'talent_descr.fischl_evernight_raven',
                    hideCondition: [condWitchHomeworkOn],
                    stats: {
                        text_percent_dmg: TalentValues.C6OzDmg,
                    },
                }),
                new ConditionBoolean({
                    name: 'fischl_evernight_raven',
                    serializeId: 2,
                    title: 'talent_name.fischl_evernight_raven',
                    description: 'talent_descr.fischl_evernight_raven_buffed',
                    hideCondition: [condWitchHomeworkOff],
                    condition: condWitchHomeworkOn,
                    stats: {
                        text_percent_dmg: TalentValues.C6OzDmg,
                    },
                    info: {constellation: 6},
                }),
                new Condition({
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        condHexereiResonance,
                        new ConditionBoolean({name: 'fischl_evernight_raven'}),
                        new ConditionBoolean({name: 'fischl_overloaded_buff'}),
                    ]),
                    stats: { atk_percent: TalentValues.SpAtk },
                    info: {constellation: 6},
                }),
                new Condition({
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        condHexereiResonance,
                        new ConditionBoolean({name: 'fischl_evernight_raven'}),
                        new ConditionBoolean({name: 'fischl_electrocharged_buff'}),
                    ]),
                    stats: { mastery: TalentValues.SpMastery },
                    info: {constellation: 6},
                }),
                // Evernight Raven doubles the Phantasmal Nocturne effects
                // for other nearby active party members as well.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        condHexereiResonance,
                        new ConditionBoolean({name: 'fischl_evernight_raven'}),
                        new ConditionBoolean({name: 'fischl_overloaded_buff'}),
                        condActiveReceiver,
                    ]),
                    stats: { atk_percent: TalentValues.SpAtk },
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    condition: new ConditionAnd([
                        condWitchHomeworkOn,
                        condHexereiResonance,
                        new ConditionBoolean({name: 'fischl_evernight_raven'}),
                        new ConditionBoolean({name: 'fischl_electrocharged_buff'}),
                        condActiveReceiver,
                    ]),
                    stats: { mastery: TalentValues.SpMastery },
                }),
            ],
        },
    ]),
    retiredParty: [[3, 'checkbox'], [4, 'checkbox'], [5, 'checkbox'], [6, 'checkbox']],
});
