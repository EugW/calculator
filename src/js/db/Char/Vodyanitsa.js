import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionOr } from "../../classes/Condition/Or";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStacks } from "../../classes/Condition/Stacks";
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
import { PostEffectStatsHP } from "../../classes/PostEffect/Stats/HP";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent, times } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Vodyanitsa.s1_id,
        title: 'talent_name.vodyanitsa_psyshkhwe_arietta',
        description: 'talent_descr.vodyanitsa_psyshkhwe_arietta',
        items: [
            {table: new StatTable('normal_hit_1', charTalentTables.Vodyanitsa.s1.p1)},
            {table: new StatTable('normal_hit_2', charTalentTables.Vodyanitsa.s1.p2)},
            {table: new StatTable('normal_hit_3', charTalentTables.Vodyanitsa.s1.p3)},
            {table: new StatTable('normal_hit_4', charTalentTables.Vodyanitsa.s1.p4)},
            {table: new StatTable('charged_hit', charTalentTables.Vodyanitsa.s1.p5)},
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Vodyanitsa.s1.p6),
            },
            {table: new StatTable('plunge', charTalentTables.Vodyanitsa.s1.p7)},
            {table: new StatTable('plunge_low', charTalentTables.Vodyanitsa.s1.p8)},
            {table: new StatTable('plunge_high', charTalentTables.Vodyanitsa.s1.p9)},
        ],
    },
    skill: {
        gameId: charTalentTables.Vodyanitsa.s2_id,
        title: 'talent_name.vodyanitsa_sonorous_dawn',
        description: 'talent_descr.vodyanitsa_sonorous_dawn',
        items: [
            {
                table: new StatTable(
                    'vodyanitsa_sonorous_dawn_initial_dmg',
                    charTalentTables.Vodyanitsa.s2.p1,
                ),
            },
            {
                unit: 'sec',
                table: new StatTable(
                    'vodyanitsa_song_of_ages_past_duration',
                    charTalentTables.Vodyanitsa.s2.p2,
                ),
            },
            {
                unit: 'sec',
                table: new StatTable(
                    'vodyanitsa_horn_of_springs_call_attack_interval',
                    charTalentTables.Vodyanitsa.s2.p3,
                ),
            },
            {
                table: new StatTable(
                    'vodyanitsa_horn_of_springs_call_dmg',
                    charTalentTables.Vodyanitsa.s2.p4,
                ),
            },
            {
                unit: 'hp',
                table: [
                    new StatTable(
                        'vodyanitsa_song_of_ages_past_heal',
                        charTalentTables.Vodyanitsa.s2.p6,
                    ),
                    new StatTable('', charTalentTables.Vodyanitsa.s2.p5),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable(
                    'vodyanitsa_song_of_ages_past_heal_interval',
                    charTalentTables.Vodyanitsa.s2.p7,
                ),
            },
            {
                table: new StatTable(
                    'vodyanitsa_hydro_cryo_res_reduction',
                    charTalentTables.Vodyanitsa.s2.p8,
                ),
            },
            {
                unit: 'sec',
                table: new StatTable(
                    'vodyanitsa_res_reduction_duration',
                    charTalentTables.Vodyanitsa.s2.p9,
                ),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Vodyanitsa.s2.p10),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Vodyanitsa.s3_id,
        title: 'talent_name.vodyanitsa_sink_with_thee',
        description: 'talent_descr.vodyanitsa_sink_with_thee',
        items: [
            {
                table: new StatTable(
                    'vodyanitsa_sink_with_thee_dmg',
                    charTalentTables.Vodyanitsa.s3.p1,
                ),
            },
            {
                table: new StatTable(
                    'vodyanitsa_song_of_ages_past_dmg_bonus',
                    charTalentTables.Vodyanitsa.s3.p2,
                ),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Vodyanitsa.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Vodyanitsa.s3.p4),
            },
        ],
    },
});

const A1AnemoResistance = -percent(charTalentTables.Vodyanitsa.a1.p1);
const A4LeadVocalStacks = charTalentTables.Vodyanitsa.a4.p1;
const A4ChorusStacks = charTalentTables.Vodyanitsa.a4.p2;
const A4HpThreshold = charTalentTables.Vodyanitsa.a4.p3;
const A4HydroCryoFlatPerHp = times(charTalentTables.Vodyanitsa.a4.p5, 0.001);
const A4HydroCryoFlatCap = charTalentTables.Vodyanitsa.a4.p7;
const A4StellarSwirlFlatPerHp = times(charTalentTables.Vodyanitsa.a4.p4, 0.001);
const A4StellarSwirlFlatCap = charTalentTables.Vodyanitsa.a4.p6;
const C1AtkPerHp = charTalentTables.Vodyanitsa.c1.p1;
const C2HydroCryoCritDmg = percent(charTalentTables.Vodyanitsa.c2.p1);
const C2StellarSwirlCritDmg = percent(charTalentTables.Vodyanitsa.c2.p2);
const C4HealingIncrease = percent(charTalentTables.Vodyanitsa.c4.p2);
const C4HpPercent = percent(charTalentTables.Vodyanitsa.c4.p3);
const C4HpStacks = charTalentTables.Vodyanitsa.c4.p5;
const C6StellarSwirlElevation = percent(charTalentTables.Vodyanitsa.c6.p1);
const C6HydroCryoDmg = percent(charTalentTables.Vodyanitsa.c6.p2);

const hydroCryoDirectTarget = () => new FeatureMultiplierTarget({
    damageElements: ['hydro', 'cryo'],
    damageTypes: ['normal', 'charged', 'plunge', 'skill', 'burst'],
});

const stellarSwirlFlatTarget = () => new FeatureMultiplierTarget({
    damageTypes: ['stellarswirl'],
    options: ['stellarswirl_flat'],
});

const localWanderingVortexState = () => new ConditionBoolean({name: 'vodyanitsa_wandering_vortex'});

class FeatureMultiplierVodyanitsaBurst extends FeatureMultiplier {
    getScalingMultiplier(data) {
        return data.settings.vodyanitsa_song_of_ages_past
            ? 1 + Talents.get('burst.vodyanitsa_song_of_ages_past_dmg_bonus').getValue(this.getLevel(data)) / 100
            : 1;
    }
}

class ConditionVodyanitsaSkillResistance extends ConditionBooleanLevels {
    getLevel(settings) {
        // Character conditions run before constellation settings are applied.
        return super.getLevel({
            ...settings,
            char_skill_elemental_bonus: Math.max(
                settings.char_skill_elemental_bonus || 0,
                settings.char_constellation >= 3 ? 3 : 0,
            ),
        });
    }
}

const skillResistanceStats = () => [
    Talents.getMulti({
        name: 'enemy_res_hydro',
        from: 'skill.vodyanitsa_hydro_cryo_res_reduction',
        multi: -1,
    }),
    Talents.getMulti({
        name: 'enemy_res_cryo',
        from: 'skill.vodyanitsa_hydro_cryo_res_reduction',
        multi: -1,
    }),
];

const c1AtkPost = new PostEffectStatsHP({
    receivers: RECEIVERS.TEAM,
    // Game data: UNIQUE_Avatar_Vodyanitsa_Constellation_1_Handler properties
    // Actor_AttackExtraDelta = [FIGHT_PROP_MAX_HP,
    // Vodyanitsa_Constellation_1_AttackUpRatio, MUL] (total HP read, extra ATK
    // write, the default). FIGHT_PROP_MAX_HP is the total marker
    // (md/buff_chains.md), as for Hu Tao/Baizhu/Candace/Chevreuse/Columbina;
    // the same number as premod while no ability writes extra HP. Declared
    // reads: TOTAL. No GO sheet and no KQM buff-chain test for Vodyanitsa.
    // Game formula: 0.8% of Max HP (talent 1401 paramList[0]).
    reads: CHANNELS.TOTAL,
    percent: new StatTable('atk', [C1AtkPerHp]),
    condition: new ConditionAnd([
        new ConditionConstellation({constellation: 1}),
        new ConditionBoolean({name: 'vodyanitsa_c1_healing'}),
    ]),
});

export const Vodyanitsa = new DbObjectChar({
    name: 'vodyanitsa',
    serializeId: 127,
    gameId: 10000140,
    iconClass: 'char-icon-vodyanitsa',
    rarity: 5,
    element: 'hydro',
    weapon: 'catalyst',
    origin: 'snezhnaya',
    talents: Talents,
    statTable: charTables.Vodyanitsa,
    // Talent hits (skill initial / Horn of Spring's Call / burst) scale with
    // FIGHT_PROP_MAX_HP (total) in damageExtra
    // (Avatar_Vodyanitsa_ElementalArt onAbilityStart,
    // Bullet_Vodyanitsa_ElementalArt onRemoved,
    // Avatar_Vodyanitsa_ElementalBurst_Attack onRemoved) and the skill heal
    // uses HealHP amountByCasterMaxHPRatio (total); scaling 'hp*' reads the
    // total by construction and needs nothing. C2/C6 are ModifyDamageMixin
    // hit bonuses with no stat read (flat conditions, always premod, need
    // nothing); C4 HP is Actor_MaxHPRatio (premod HP%, talent 1404 paramList
    // [0.4, 0.5, 0.2, 6, 3]) and a ConditionStacks hp_percent is premod by
    // construction. A1 and the skill RES shred read no stat.
    features: [
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_low',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'vodyanitsa_sonorous_dawn_initial_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.vodyanitsa_sonorous_dawn_initial_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'vodyanitsa_horn_of_springs_call_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.vodyanitsa_horn_of_springs_call_dmg'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'skill',
            name: 'vodyanitsa_song_of_ages_past_heal',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.vodyanitsa_song_of_ages_past_heal'),
                    scalingSource: 'constellation4',
                    scalingMultiplier: 1 + C4HealingIncrease / 100,
                    scalingMultiplierCondition: new ConditionAnd([
                        new ConditionConstellation({constellation: 4}),
                        new ConditionBoolean({name: 'vodyanitsa_c4_target_below_40'}),
                    ]),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'vodyanitsa_sink_with_thee_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplierVodyanitsaBurst({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.vodyanitsa_sink_with_thee_dmg'),
                    scalingSource: 'vodyanitsa_song_of_ages_past',
                }),
            ],
        }),
    ],
    conditions: [
        new ConditionBoolean({
            // Retain the removed control's ID so existing builds still load.
            name: 'vodyanitsa_off_field',
            serializeId: 8,
            isHidden: true,
        }),
        new ConditionVodyanitsaSkillResistance({
            name: 'vodyanitsa_song_of_ages_past',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.vodyanitsa_song_of_ages_past',
            description: 'talent_descr.vodyanitsa_song_of_ages_past',
            levelSetting: 'char_skill_elemental',
            rotation: 'self',
            stats: skillResistanceStats(),
        }),
        new ConditionBoolean({
            name: 'vodyanitsa_wandering_vortex',
            serializeId: 2,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.vodyanitsa_the_last_djeguako_songstress',
            description: 'talent_descr.vodyanitsa_the_last_djeguako_songstress',
            info: {ascension: 1},
            rotation: 'self',
            stats: {
                enemy_res_anemo: A1AnemoResistance,
            },
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStacks({
            name: 'vodyanitsa_lead_vocal',
            serializeId: 3,
            title: 'talent_name.n11400001',
            description: 'talent_descr.n11400001',
            info: {ascension: 4},
            rotation: 'self',
            maxStacks: A4LeadVocalStacks,
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        // Chorus is consumed by hits of off-field and other (not the active)
        // party members; Lead Vocal above is consumed by the active
        // character's hits. Both counts live on Vodyanitsa.
        new ConditionStacks({
            name: 'vodyanitsa_chorus',
            serializeId: 11,
            title: 'talent_name.n11400002',
            description: 'talent_descr.n11400002',
            info: {ascension: 4},
            rotation: 'self',
            maxStacks: A4ChorusStacks,
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    multipliers: [
        // A4 (Lead Vocal / Chorus flat damage): the game computes
        // Vodyanitsa_Concerto_DamageExtra_IceWater/_StarSwirl from
        // FIGHT_PROP_MAX_HP (total) in
        // UNIQUE_Avatar_Vodyanitsa_Concerto_GrandHandler (and the
        // Concerto_Pre/ExtraPreHandlers) and applies it as damageExtra via
        // ModifyDamageCountMixin (hit-level, no extra lane). Talent 14022
        // paramList [25, 10, 40000, 260, 140, 6500, 3500]: 25 Lead Vocal / 10
        // Chorus stacks, 40000 HP threshold, 0.26/0.14 per HP over threshold,
        // 6500/3500 caps. Scaling 'hp*' in a FeatureMultiplier reads the
        // total by construction and needs nothing. No GO sheet and no KQM
        // buff-chain test for Vodyanitsa.
        // The active member's qualifying hits consume Lead Vocal; other
        // members' hits consume Chorus instead. The Wandering Vortex switches
        // both counts from Hydro/Cryo to Stellar Swirl, as on the source.
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'hp*',
            source: 'ascension4',
            values: new ValueTable([A4HydroCryoFlatPerHp * 100]),
            exceedStatValue: A4HpThreshold,
            capValue: new ValueTable([A4HydroCryoFlatCap]),
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                new ConditionStacks({name: 'vodyanitsa_lead_vocal', maxStacks: A4LeadVocalStacks}),
                new ConditionNot([localWanderingVortexState()]),
                new ConditionReceiver({
                    condition: new ConditionOnField(),
                }),
            ]),
            target: hydroCryoDirectTarget(),
        }),
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'hp*',
            source: 'ascension4',
            values: new ValueTable([A4StellarSwirlFlatPerHp * 100]),
            exceedStatValue: A4HpThreshold,
            capValue: new ValueTable([A4StellarSwirlFlatCap]),
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                new ConditionStacks({name: 'vodyanitsa_lead_vocal', maxStacks: A4LeadVocalStacks}),
                localWanderingVortexState(),
                new ConditionReceiver({
                    condition: new ConditionOnField(),
                }),
            ]),
            target: stellarSwirlFlatTarget(),
        }),
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'hp*',
            source: 'ascension4',
            values: new ValueTable([A4HydroCryoFlatPerHp * 100]),
            exceedStatValue: A4HpThreshold,
            capValue: new ValueTable([A4HydroCryoFlatCap]),
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                new ConditionStacks({name: 'vodyanitsa_chorus', maxStacks: A4ChorusStacks}),
                new ConditionNot([localWanderingVortexState()]),
                new ConditionReceiver({
                    condition: new ConditionOnField({invert: true}),
                }),
            ]),
            target: hydroCryoDirectTarget(),
        }),
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'hp*',
            source: 'ascension4',
            values: new ValueTable([A4StellarSwirlFlatPerHp * 100]),
            exceedStatValue: A4HpThreshold,
            capValue: new ValueTable([A4StellarSwirlFlatCap]),
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                new ConditionStacks({name: 'vodyanitsa_chorus', maxStacks: A4ChorusStacks}),
                localWanderingVortexState(),
                new ConditionReceiver({
                    condition: new ConditionOnField({invert: true}),
                }),
            ]),
            target: stellarSwirlFlatTarget(),
        }),
    ],
    postEffects: [
        c1AtkPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'vodyanitsa_c1_healing',
                    serializeId: 4,
                    title: 'talent_name.vodyanitsa_waters_in_full_splendor',
                    description: 'talent_descr.vodyanitsa_waters_in_full_splendor',
                    rotation: 'self',
                }),
            ],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'vodyanitsa_c2_horn_hit',
                    serializeId: 5,
                    title: 'talent_name.vodyanitsa_echoes_that_pierce_the_snow',
                    description: 'talent_descr.vodyanitsa_echoes_that_pierce_the_snow',
                    rotation: 'self',
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        crit_dmg_hydro: C2HydroCryoCritDmg,
                        crit_dmg_cryo: C2HydroCryoCritDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'vodyanitsa_c2_horn_hit'}),
                        new ConditionNot([localWanderingVortexState()]),
                        // Two Voices in Black and White reaches the currently
                        // active party member; C6 extends it to all members.
                        new ConditionOr([
                            new ConditionConstellation({constellation: 6}),
                            new ConditionReceiver({
                                condition: new ConditionOnField(),
                            }),
                        ]),
                    ]),
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        crit_dmg_stellarswirl: C2StellarSwirlCritDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'vodyanitsa_c2_horn_hit'}),
                        localWanderingVortexState(),
                        new ConditionOr([
                            new ConditionConstellation({constellation: 6}),
                            new ConditionReceiver({
                                condition: new ConditionOnField(),
                            }),
                        ]),
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
                new ConditionBoolean({
                    name: 'vodyanitsa_c4_target_below_40',
                    serializeId: 6,
                    title: 'talent_name.vodyanitsa_melancholic_voice_upon_the_gentle_waters',
                    description: 'talent_descr.vodyanitsa_melancholic_voice_upon_the_gentle_waters_1',
                    rotation: 'self',
                    stats: {
                        text_percent_healing: C4HealingIncrease,
                    },
                }),
                new ConditionStacks({
                    name: 'vodyanitsa_c4_hp_stacks',
                    serializeId: 7,
                    title: 'talent_name.vodyanitsa_melancholic_voice_upon_the_gentle_waters',
                    description: 'talent_descr.vodyanitsa_melancholic_voice_upon_the_gentle_waters_2',
                    rotation: 'self',
                    maxStacks: C4HpStacks,
                    stats: [
                        new StatTable('hp_percent', [C4HpPercent]),
                    ],
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
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.vodyanitsa_neverending_song_of_revelry',
                    description: 'talent_descr.vodyanitsa_neverending_song_of_revelry',
                    stats: {
                        dmg_stellarswirl_special: C6StellarSwirlElevation,
                        dmg_hydro: C6HydroCryoDmg,
                        dmg_cryo: C6HydroCryoDmg,
                    },
                    condition: new ConditionBoolean({name: 'vodyanitsa_song_of_ages_past'}),
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'number'], [3, 'checkbox'], [4, 'checkbox'], [5, 'stacks'], [6, 'checkbox'], [7, 'checkbox'], [8, 'checkbox'], [9, 'checkbox'], [10, 'checkbox']],
});
