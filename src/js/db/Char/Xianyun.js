import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStacksLevels } from "../../classes/Condition/Stacks/Levels";
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
import { FeatureHeal } from "../../classes/Feature2/Heal";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent, plus, times } from "../Params";


const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Xianyun.s1_id,
        title: 'talent_name.xianyun_word_of_wind_and_flower',
        description: 'talent_descr.xianyun_word_of_wind_and_flower',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Xianyun.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Xianyun.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Xianyun.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Xianyun.s1.p4),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Xianyun.s1.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Xianyun.s1.p6),
            },
            {
                table: new StatTable('plunge', charTalentTables.Xianyun.s1.p7),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Xianyun.s1.p8),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Xianyun.s1.p9),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Xianyun.s2_id,
        title: 'talent_name.xianyun_white_clouds_at_dawn',
        description: 'talent_descr.xianyun_white_clouds_at_dawn',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.Xianyun.s2.p1),
            },
            {
                type: 'separated',
                table: [
                    new StatTable('xianyun_driftcloud_wave_dmg', charTalentTables.Xianyun.s2.p2),
                    new StatTable('xianyun_driftcloud_wave_2_dmg', charTalentTables.Xianyun.s2.p3),
                    new StatTable('xianyun_driftcloud_wave_3_dmg', charTalentTables.Xianyun.s2.p4),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Xianyun.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Xianyun.s3_id,
        title: 'talent_name.xianyun_stars_gather_at_dusk',
        description: 'talent_descr.xianyun_stars_gather_at_dusk',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Xianyun.s3.p1),
            },
            {
                table: new StatTable('xianyun_starwicker_dmg', charTalentTables.Xianyun.s3.p2),
            },
            {
                type: 'shield',
                unit: 'atk',
                table: [
                    new StatTable('heal', charTalentTables.Xianyun.s3.p4),
                    new StatTable('', charTalentTables.Xianyun.s3.p3),
                ],
            },
            {
                type: 'shield',
                unit: 'atk',
                table: [
                    new StatTable('heal_dot', charTalentTables.Xianyun.s3.p6),
                    new StatTable('', charTalentTables.Xianyun.s3.p5),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Xianyun.s3.p9),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Xianyun.s3.p10),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Xianyun.s3.p11),
            },
        ],
    },
});

const A1CritRate1 = percent(charTalentTables.Xianyun.a1.p1);
const A1CritRate2 = percent(charTalentTables.Xianyun.a1.p2);
const A1CritRate3 = percent(charTalentTables.Xianyun.a1.p3);
const A1CritRate4 = percent(charTalentTables.Xianyun.a1.p4);
const A4AtkRatio = percent(charTalentTables.Xianyun.a4.p1);
const A4AtkRatioC2 = percent(times(charTalentTables.Xianyun.a4.p1, plus(1, charTalentTables.Xianyun.c2.p3)));
const A4DmgMax = times(charTalentTables.Xianyun.a4.p1, charTalentTables.Xianyun.a4.p2);
const A4DmgMaxC2 = times(charTalentTables.Xianyun.a4.p1, plus(1, charTalentTables.Xianyun.c2.p3), charTalentTables.Xianyun.a4.p2);
const C2Atk = percent(charTalentTables.Xianyun.c2.p1);
const C4Heal1 = percent(charTalentTables.Xianyun.c4.p1);
const C4Heal2 = percent(charTalentTables.Xianyun.c4.p2);
const C4Heal3 = percent(charTalentTables.Xianyun.c4.p3);
const C6CritDmg1 = percent(charTalentTables.Xianyun.c6.p1);
const C6CritDmg2 = percent(charTalentTables.Xianyun.c6.p2);
const C6CritDmg3 = percent(charTalentTables.Xianyun.c6.p3);

export const Xianyun = new DbObjectChar({
    name: 'xianyun',
    serializeId: 83,
    gameId: 10000093,
    iconClass: 'char-icon-xianyun',
    rarity: 5,
    element: 'anemo',
    weapon: 'catalyst',
    origin: 'liyue',
    talents: Talents,
    statTable: charTables.Xianyun,
    features: [
        new FeatureDamageNormal({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'xianyun_driftcloud_wave_1_dmg',
            element: 'anemo',
            category: 'skill',
            critDamageBonuses: ['crit_dmg_xianyun'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.xianyun_driftcloud_wave_dmg'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'anemo',
            category: 'skill',
            critDamageBonuses: ['crit_dmg_xianyun'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.xianyun_driftcloud_wave_2_dmg'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'anemo',
            category: 'skill',
            critDamageBonuses: ['crit_dmg_xianyun'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.xianyun_driftcloud_wave_3_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.xianyun_starwicker_dmg'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'burst',
            partyHeal: true,
            multipliers: [
                new FeatureMultiplierList({
                    leveling: 'char_skill_burst',
                    values: Talents.getList('burst.heal'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'burst',
            partyHeal: true,
            multipliers: [
                new FeatureMultiplierList({
                    leveling: 'char_skill_burst',
                    values: Talents.getList('burst.heal_dot'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'other',
            partyHeal: true,
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new StatTable('xianyun_mystery_1_heal', [C4Heal1]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 4}),
        }),
        new FeatureHeal({
            category: 'other',
            partyHeal: true,
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new StatTable('xianyun_mystery_2_heal', [C4Heal2]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 4}),
        }),
        new FeatureHeal({
            category: 'other',
            partyHeal: true,
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new StatTable('xianyun_mystery_3_heal', [C4Heal3]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 4}),
        }),
    ],
    multipliers: [
        // Consider, the Adeptus in Her Realm raises nearby active
        // characters' Plunging Attack shockwave DMG from Xianyun's live ATK.
        // The burst talent level and the C2 second level come from the source.
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            leveling: 'xianyun_a4_level',
            source: 'ascension4',
            values: new ValueTable([A4AtkRatio, A4AtkRatioC2]),
            capValue: new ValueTable([A4DmgMax, A4DmgMaxC2]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'xianyun_consider_the_adeptus_in_her_realm'}),
                new ConditionAscensionChar({ascension: 4}),
                new ConditionReceiver({
                    condition: new ConditionOnField(),
                }),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['plunge_shockwave'],
            }),
        }),
    ],
    conditions: [
        new ConditionStacksLevels({
            name: 'xianyun_galefeather_pursuit',
            serializeId: 1,
            // Storm Pinion reaches all nearby party members.
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.xianyun_galefeather_pursuit',
            description: 'talent_descr.xianyun_galefeather_pursuit',
            maxStacks: 4,
            stats: [
                new StatTable('text_percent_1', [A1CritRate1]),
                new StatTable('text_percent_2', [A1CritRate2]),
                new StatTable('text_percent_3', [A1CritRate3]),
                new StatTable('text_percent_4', [A1CritRate4]),
            ],
            realStats: new StatTable('crit_rate_plunge', [A1CritRate1, A1CritRate2, A1CritRate3, A1CritRate4]),
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionBoolean({
            name: 'xianyun_consider_the_adeptus_in_her_realm',
            serializeId: 2,
            title: 'talent_name.xianyun_consider_the_adeptus_in_her_realm',
            description: 'talent_descr.xianyun_consider_the_adeptus_in_her_realm',
            stats: {
                text_percent_atk: A4AtkRatio,
                text_value_max: A4DmgMax,
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
                    title: 'talent_name.xianyun_purifying_wind',
                    description: 'talent_descr.xianyun_purifying_wind',
                }),
            ],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'xianyun_aloof_from_the_world',
                    serializeId: 3,
                    title: 'talent_name.xianyun_aloof_from_the_world',
                    description: 'talent_descr.xianyun_aloof_from_the_world_1',
                    stats: {
                        atk_percent: C2Atk,
                    },
                }),
                new ConditionStatic({
                    title: 'talent_name.xianyun_aloof_from_the_world',
                    description: 'talent_descr.xianyun_aloof_from_the_world_2',
                    stats: {
                        text_percent_atk: A4AtkRatioC2,
                        text_value_max: A4DmgMaxC2,
                    },
                    settings: {
                        xianyun_a4_level: 2,
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
                    title: 'talent_name.xianyun_mystery_millet_gourmet',
                    description: 'talent_descr.xianyun_mystery_millet_gourmet',
                    stats: {
                        text_percent_1: C4Heal1,
                        text_percent_2: C4Heal2,
                        text_percent_3: C4Heal3,
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
                new ConditionStacksLevels({
                    name: 'xianyun_cloudkeepers_spirit',
                    serializeId: 4,
                    title: 'talent_name.xianyun_they_call_her_cloud_retainer',
                    description: 'talent_descr.xianyun_they_call_her_cloud_retainer',
                    maxStacks: 3,
                    stats: [
                        new StatTable('text_percent_1', [C6CritDmg1]),
                        new StatTable('text_percent_2', [C6CritDmg2]),
                        new StatTable('text_percent_3', [C6CritDmg3]),
                    ],
                    realStats: new StatTable('crit_dmg_xianyun', [C6CritDmg1, C6CritDmg2, C6CritDmg3]),
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'stacks'], [3, 'checkbox'], [4, 'checkbox']],
});
