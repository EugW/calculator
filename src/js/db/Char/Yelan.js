import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionStaticLevel } from "../../classes/Condition/Static/Level";
import { ConditionCalcElements} from "../../classes/Condition/CalcElements";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent, plus, times } from "../Params";
import { Stats } from "../../classes/Stats";
import { ConditionLevels } from "../../classes/Condition/Levels";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamageChargedAimed } from "../../classes/Feature2/Damage/Charged/Aimed";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Yelan.s1_id,
        title: 'talent_name.yelan_stealthy_bowshot',
        description: 'talent_descr.yelan_stealthy_bowshot',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Yelan.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Yelan.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Yelan.s1.p3),
            },
            {
                type: 'multihit',
                hits: 3,
                table: new StatTable('normal_hit_4', charTalentTables.Yelan.s1.p4),
            },
            {
                table: new StatTable('aimed', charTalentTables.Yelan.s1.p5),
            },
            {
                table: new StatTable('charged_aimed', charTalentTables.Yelan.s1.p6),
            },
            {
                unit: 'hp',
                table: new StatTable('yelan_breakthrough_barb_dmg', charTalentTables.Yelan.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Yelan.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Yelan.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Yelan.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Yelan.s2_id,
        title: 'talent_name.yelan_lingering_lifeline',
        description: 'talent_descr.yelan_lingering_lifeline',
        items: [
            {
                unit: 'hp',
                table: new StatTable('skill_dmg', charTalentTables.Yelan.s2.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('yelan_duration', charTalentTables.Yelan.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Yelan.s2.p4),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Yelan.s3_id,
        title: 'talent_name.yelan_depth_clarion_dice',
        description: 'talent_descr.yelan_depth_clarion_dice',
        items: [
            {
                unit: 'hp',
                table: new StatTable('burst_dmg', charTalentTables.Yelan.s3.p1),
            },
            {
                type: 'multihit',
                hits: 3,
                table: new StatTable('yelan_exquisite_throw_dmg', charTalentTables.Yelan.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Yelan.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Yelan.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Yelan.s3.p5),
            },
        ],
    },
});

export const buffValues = percent(plus(charTalentTables.Yelan.a4.p1, times(charTalentTables.Yelan.a4.p2, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])));

const A1HpPercent = [percent(charTalentTables.Yelan.a1.p1), percent(charTalentTables.Yelan.a1.p2), percent(charTalentTables.Yelan.a1.p3), percent(charTalentTables.Yelan.a1.p4)];
const C2Dmg = percent(charTalentTables.Yelan.c2.p1);
const C4HpPercent = percent(charTalentTables.Yelan.c4.p1);
const C4HpPercentMax = percent(times(charTalentTables.Yelan.c4.p1, charTalentTables.Yelan.c4.p3));
const C6BarbDmg = percent(charTalentTables.Yelan.c6.p3);

export const Yelan = new DbObjectChar({
    name: 'yelan',
    serializeId: 51,
    gameId: 10000060,
    iconClass: "char-icon-yelan",
    rarity: 5,
    element: 'hydro',
    weapon: 'bow',
    origin: 'liyue',
    talents: Talents,
    statTable: charTables.Yelan,
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
        new FeatureDamageChargedAimed({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.aimed'),
                }),
            ],
        }),
        new FeatureDamageChargedAimed({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_aimed'),
                }),
            ],
        }),
        new FeatureDamageChargedAimed({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.yelan_breakthrough_barb_dmg'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'yelan_breakthrough_barb_c6_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    scalingSource: 'constellation6',
                    scalingMultiplier: C6BarbDmg / 100,
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.yelan_breakthrough_barb_dmg'),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
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
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.yelan_exquisite_throw_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    source: 'constellation2',
                    values: new StatTable('yelan_taking_all_comers_dmg', [C2Dmg]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 2}),
        }),
    ],
    conditions: [
        new ConditionCalcElements({
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        new ConditionStaticLevel({
            title: 'talent_name.yelan_turn_control',
            description: 'talent_descr.yelan_turn_control',
            levelSetting: 'party_elements_count_level',
            stats: [
                new StatTable('text_number', [1, 2, 3, 4]),
                new StatTable('hp_percent', A1HpPercent),
            ],
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStacks({
            name: 'yelan_adapt_with_ease',
            serializeId: 1,
            title: 'talent_name.yelan_adapt_with_ease',
            description: 'talent_descr.yelan_adapt_with_ease',
            maxStacks: 15,
            dropdownClass: 'stack-percent',
            titleFunc: function(value) {
                if (value) {
                    return {
                        values: new Stats({text_percent: buffValues[value-1]}),
                        str: 'talent_tooltip.yelan_dmg_bonus',
                    };
                } else {
                    return {
                        str: 'talent_tooltip.sayu_egress_prep_none',
                    };
                }
            },
            stats: [],
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        new ConditionLevels({
            levelSetting: 'yelan_adapt_with_ease',
            receivers: RECEIVERS.TEAM,
            stats: [
                new StatTable('dmg_all', buffValues),
            ],
            subConditions: [
                new ConditionBooleanValue({
                    setting: 'yelan_adapt_with_ease',
                    cond: 'ge',
                    value: 1,
                }),
                new ConditionAscensionChar({ascension: 4}),
                // Exquisite Throw buffs your own active character.
                new ConditionReceiver({
                    condition: new ConditionOnField(),
                }),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.yelan_enter_the_plotters',
                    description: 'talent_descr.yelan_enter_the_plotters',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.yelan_taking_all_comers',
                    description: 'talent_descr.yelan_taking_all_comers',
                    stats: {
                        text_percent: C2Dmg,
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
                new ConditionStacks({
                    name: 'yelan_bait_and_switch',
                    serializeId: 2,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.yelan_bait_and_switch',
                    description: 'talent_descr.yelan_bait_and_switch',
                    maxStacks: 4,
                    stats: [
                        new StatTable('hp_percent', [C4HpPercent]),
                        new StatTable('text_percent_max', [C4HpPercentMax]),
                    ],
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
                    name: 'yelan_winner_takes_all',
                    title: 'talent_name.yelan_winner_takes_all',
                    description: 'talent_descr.yelan_winner_takes_all',
                    stats: {
                        text_percent: C6BarbDmg,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'stacks'], [2, 'stacks']],
});
