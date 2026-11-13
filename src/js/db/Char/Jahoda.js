import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionBooleanCharOrigin } from "../../classes/Condition/Boolean/CharOrigin";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
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
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { PostEffectStatsStatic } from "../../classes/PostEffect/Stats/Static";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Jahoda.s1_id,
        title: 'talent_name.jahoda_strike_while_the_arrows_hot',
        description: 'talent_descr.jahoda_strike_while_the_arrows_hot',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Jahoda.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Jahoda.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Jahoda.s1.p3),
            },
            {
                table: new StatTable('jahoda_aimed_shot', charTalentTables.Jahoda.s1.p4),
            },
            {
                table: new StatTable('jahoda_fully_charged', charTalentTables.Jahoda.s1.p5),
            },
            {
                table: new StatTable('plunge', charTalentTables.Jahoda.s1.p6),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Jahoda.s1.p7),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Jahoda.s1.p8),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Jahoda.s2_id,
        title: 'talent_name.jahoda_splitting_the_spoils',
        description: 'talent_descr.jahoda_splitting_the_spoils',
        items: [
            {
                table: new StatTable('jahoda_smoke_bomb_dmg', charTalentTables.Jahoda.s2.p1),
            },
            {
                table: new StatTable('jahoda_unfilled_flask_dmg', charTalentTables.Jahoda.s2.p2),
            },
            {
                table: new StatTable('jahoda_filled_flask_dmg', charTalentTables.Jahoda.s2.p3),
            },
            {
                table: new StatTable('jahoda_meowball_dmg', charTalentTables.Jahoda.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Jahoda.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Jahoda.s2.p6),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Jahoda.s3_id,
        title: 'talent_name.jahoda_seven_tools_of_the_hunter',
        description: 'talent_descr.jahoda_seven_tools_of_the_hunter',
        items: [
            {
                table: new StatTable('jahoda_burst_dmg', charTalentTables.Jahoda.s3.p1),
            },
            {
                table: new StatTable('jahoda_robot_dmg', charTalentTables.Jahoda.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Jahoda.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Jahoda.s3.p8),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Jahoda.s3.p9),
            },
        ],
    },
});

// Passive and constellation values
const A1PyroBonus = percent(charTalentTables.Jahoda.a1.p1);
const A1HydroBonus = percent(charTalentTables.Jahoda.a1.p2);
const A1CryoSpeed = -percent(charTalentTables.Jahoda.a1.p3);
const A4EmBonus = charTalentTables.Jahoda.a4.p1;
const C6CritRate = percent(charTalentTables.Jahoda.c6.p1);
const C6CritDmg = percent(charTalentTables.Jahoda.c6.p2);

// C6 The Littlest Luck: CRIT of nearby Moonsign characters at Ascendant
// Gleam. Game data: Avatar_Jahoda_Constellation_6_buff writes
// Actor_CriticalExtraDelta and Actor_CriticalHurtExtraDelta: flat bonuses in
// the extra part, so they are post-effects (a condition's stats are always
// premod; md/buff_chains.md). Jahoda keeps her own copy; the delivery only
// reaches Nod-Krai (Moonsign) receivers.
const c6CritTables = [
    new StatTable('crit_rate', [0, C6CritRate]),
    new StatTable('crit_dmg', [0, C6CritDmg]),
];
const c6CritConditions = [
    new ConditionConstellation({constellation: 6}),
    new ConditionBoolean({name: 'jahoda_c6_crit_bonus'}),
];
const c6CritPost = new PostEffectStatsStatic({
    levelSetting: 'party_moonsign',
    percent: c6CritTables,
    conditions: c6CritConditions,
});
const c6CritPartyPost = new PostEffectStatsStatic({
    receivers: RECEIVERS.OTHERS,
    levelSetting: 'party_moonsign',
    percent: c6CritTables,
    conditions: [
        ...c6CritConditions,
        new ConditionReceiver({
            condition: new ConditionBooleanCharOrigin({
                origin: ['nodkrai'],
            }),
        }),
    ],
});

export const Jahoda = new DbObjectChar({
    name: 'jahoda',
    serializeId: 114,
    gameId: 10000124,
    iconClass: 'char-icon-jahoda',
    rarity: 4,
    element: 'anemo',
    weapon: 'bow',
    origin: 'nodkrai',
    talents: Talents,
    statTable: charTables.Jahoda,
    features: [
        // Normal attacks
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
        // Aimed Shot
        new FeatureDamageCharged({
            name: 'jahoda_aimed_shot',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.jahoda_aimed_shot'),
                }),
            ],
        }),
        // Fully-Charged Aimed Shot
        new FeatureDamageCharged({
            name: 'jahoda_fully_charged',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.jahoda_fully_charged'),
                }),
            ],
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
        // Skill - Smoke Bomb
        new FeatureDamageSkill({
            name: 'jahoda_smoke_bomb_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.jahoda_smoke_bomb_dmg'),
                }),
            ],
        }),
        // Skill - Unfilled Flask
        new FeatureDamageSkill({
            name: 'jahoda_unfilled_flask_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.jahoda_unfilled_flask_dmg'),
                }),
            ],
        }),
        // Skill - Filled Flask
        new FeatureDamageSkill({
            name: 'jahoda_filled_flask_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.jahoda_filled_flask_dmg'),
                }),
            ],
        }),
        // Skill - Fluffy Meowball
        new FeatureDamageSkill({
            name: 'jahoda_meowball_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.jahoda_meowball_dmg'),
                }),
            ],
        }),
        // Burst
        new FeatureDamageBurst({
            name: 'jahoda_burst_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.jahoda_burst_dmg'),
                }),
            ],
        }),
        // Robot DMG
        new FeatureDamageBurst({
            name: 'jahoda_robot_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.jahoda_robot_dmg'),
                }),
            ],
        }),
    ],
    conditions: [
        // Jahoda enables the generic Moonsign flag for the whole team
        // (merged with the old partyData copy).
        new Condition({
            receivers: RECEIVERS.TEAM,
            settings: {
                allowed_moonsign: 1,
            },
        }),
        // Moonsign level comes from the real team; every Moonsign member
        // delivers the same values, so this needs no stack key.
        new ConditionCalcMoonsign({receivers: RECEIVERS.TEAM}),
        // A1 - Plan to Get Paid
        new ConditionStatic({
            title: 'talent_name.jahoda_plan_to_get_paid',
            description: 'talent_descr.jahoda_plan_to_get_paid',
            info: {ascension: 1},
            stats: {
                text_pyro_bonus: A1PyroBonus,
                text_hydro_bonus: A1HydroBonus,
                text_cryo_speed: A1CryoSpeed,
            },
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        // A4 - Sweet Berry Bounty: the healed active member (HP above 70%)
        // gains 100 Mastery. Jahoda keeps her own copy; other members get it
        // while they are on-field. HP and healing are manual assumptions.
        new ConditionBoolean({
            name: 'jahoda_a1_em_bonus',
            serializeId: 1,
            title: 'talent_name.jahoda_sweet_berry_bounty',
            description: 'talent_descr.jahoda_sweet_berry_bounty',
            info: {ascension: 4},
            stats: {
                mastery: A4EmBonus,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new Condition({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            stats: {
                mastery: A4EmBonus,
            },
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'jahoda_a1_em_bonus'}),
                new ConditionAscensionChar({ascension: 4}),
                new ConditionReceiver({
                    condition: new ConditionOnField(),
                }),
            ]),
        }),
        // Moonsign Passive
        new ConditionStatic({
            title: 'talent_name.jahoda_rooftop_dash',
            description: 'talent_descr.jahoda_rooftop_dash',
        }),
    ],
    postEffects: [
        c6CritPost,
        c6CritPartyPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.jahoda_one_more_flask',
                    description: 'talent_descr.jahoda_one_more_flask',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.jahoda_rogues_quick_thinking',
                    description: 'talent_descr.jahoda_rogues_quick_thinking',
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
                    title: 'talent_name.jahoda_wild_berry_amid_the_dust',
                    description: 'talent_descr.jahoda_wild_berry_amid_the_dust',
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
                // The CRIT is c6CritPost and c6CritPartyPost (extra writes).
                new ConditionBoolean({
                    name: 'jahoda_c6_crit_bonus',
                    serializeId: 2,
                    title: 'talent_name.jahoda_the_littlest_luck',
                    description: 'talent_descr.jahoda_the_littlest_luck',
                }),
            ],
        },
    ]),
    retiredParty: [[3, 'checkbox'], [4, 'checkbox']],
});
