import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageChargedAimed } from "../../classes/Feature2/Damage/Charged/Aimed";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureHeal } from "../../classes/Feature2/Heal";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureShield } from "../../classes/Feature2/Shield";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsHP } from "../../classes/PostEffect/Stats/HP";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";
import { CHANNELS } from "../../classes/PostEffect/Channels";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Sigewinne.s1_id,
        title: 'talent_name.sigewinne_targeted_treatment',
        description: 'talent_descr.sigewinne_targeted_treatment',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Sigewinne.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Sigewinne.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Sigewinne.s1.p3),
            },
            {
                table: new StatTable('aimed', charTalentTables.Sigewinne.s1.p7),
            },
            {
                table: new StatTable('charged_aimed', charTalentTables.Sigewinne.s1.p8),
            },
            {
                table: new StatTable('sigewinnne_mini_stration_bubble_dmg', charTalentTables.Sigewinne.s1.p9),
            },
            {
                table: new StatTable('plunge', charTalentTables.Sigewinne.s1.p4),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Sigewinne.s1.p5),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Sigewinne.s1.p6),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Sigewinne.s2_id,
        title: 'talent_name.sigewinne_rebound_hydrotherapy',
        description: 'talent_descr.sigewinne_rebound_hydrotherapy',
        items: [
            {
                unit: 'hp',
                table: new StatTable('sigewinne_bolstering_bubblebalm_dmg', charTalentTables.Sigewinne.s2.p1),
            },
            {
                type: 'shield',
                unit: 'hp',
                table: [
                    new StatTable('sigewinne_bolstering_bubblebalm_heal', charTalentTables.Sigewinne.s2.p2),
                    new StatTable('', charTalentTables.Sigewinne.s2.p3),
                ],
            },
            {
                unit: 'hp',
                table: new StatTable('sigewinne_bounce_end_heal', charTalentTables.Sigewinne.s2.p4),
            },
            {
                unit: 'hp',
                table: new StatTable('surging_blade_dmg', charTalentTables.Sigewinne.s2.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('surging_blade_interval', charTalentTables.Sigewinne.s2.p8),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Sigewinne.s2.p9),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Sigewinne.s3_id,
        title: 'talent_name.sigewinne_super_saturated_syringing',
        description: 'talent_descr.sigewinne_super_saturated_syringing',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Sigewinne.s3.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Sigewinne.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Sigewinne.s3.p2),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Sigewinne.s3.p3),
            },
        ],
    },
});

const A1HydroDmg = percent(charTalentTables.Sigewinne.a1.p4);
const A1MinHP = charTalentTables.Sigewinne.a1.p6;
const A1DmgBonus = charTalentTables.Sigewinne.a1.p1;
const A1DmgBonusMax = charTalentTables.Sigewinne.a1.p2;
const A4HealingBonus = percent(charTalentTables.Sigewinne.a4.p1);
const A4HealingBonusMax = percent(charTalentTables.Sigewinne.a4.p2);
const C1DmgBonus = charTalentTables.Sigewinne.a1.p1 + charTalentTables.Sigewinne.c1.p1;
const C1DmgBonusMax = charTalentTables.Sigewinne.a1.p2 + charTalentTables.Sigewinne.c1.p2;
const C2Shield = percent(charTalentTables.Sigewinne.c2.p1);
const C2HydroRes = -percent(charTalentTables.Sigewinne.c2.p2);
const C6CritRate = percent(charTalentTables.Sigewinne.c6.p1);
const C6CritRateMax = percent(charTalentTables.Sigewinne.c6.p4);
const C6CritDmg = percent(charTalentTables.Sigewinne.c6.p2);
const C6CritDmgMax = percent(charTalentTables.Sigewinne.c6.p5);

// Requires Appropriate Rest reaches nearby off-field party members other than Sigewinne.
// OTHERS already excludes her; the receiver must be off-field.
const offFieldOtherReceiver = new ConditionReceiver({
    condition: new ConditionOnField({invert: true}),
});

export const Sigewinne = new DbObjectChar({
    name: 'sigewinne',
    serializeId: 87,
    gameId: 10000095,
    iconClass: 'char-icon-sigewinne',
    rarity: 5,
    element: 'hydro',
    weapon: 'bow',
    origin: 'fontaine',
    talents: Talents,
    statTable: charTables.Sigewinne,
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
        new FeatureDamageCharged({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.sigewinnne_mini_stration_bubble_dmg'),
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
                    values: Talents.get('skill.sigewinne_bolstering_bubblebalm_dmg'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'skill',
            partyHeal: 1,
            noSelfHeal: 1,
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.sigewinne_bolstering_bubblebalm_heal'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.sigewinne_bounce_end_heal'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'hydro',
            cannotReact: true,
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.surging_blade_dmg'),
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
        // Game data: Avatar_Sigewinne_PermanentSkill_1 (Driver) reads FIGHT_PROP_MAX_HP
        // (total) into DamageUpRatioCache, applied as ModifyDamageCountMixin damageExtra.
        // KQM Sigewinne has no buff-chain test. GO reads input.total.hp. scaling 'hp*'
        // is the total by construction: default confirmed, no params.
        new FeaturePostEffectValue({
            category: 'other',
            name: 'sigewinne_hp_buff',
            postEffect: new PostEffectStatsHP({
                reads: CHANNELS.TOTAL,
                exceed: A1MinHP,
                levelSetting: 'sigewinne_buff_level',
                percent: new StatTable('', [A1DmgBonus / 1000, C1DmgBonus / 1000]),
                statCap: new ValueTable([A1DmgBonusMax, C1DmgBonusMax]),
            }),
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new FeatureShield({
            name: 'sigewinne_bubbly_shield',
            category: 'other',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    source: 'constellation2',
                    values: new ValueTable([C2Shield]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 2}),
        }),
    ],
    multipliers: [
        // Requires Appropriate Rest: Elemental Skills of nearby off-field members other than
        // Sigewinne gain flat DMG from her live Max HP above 30000 (80/1000, max 2800; C1
        // 100/1000, max 3500 via buff_level). Recorded HP is exactly 30000, so the bonus is 0.
        // Game data: Avatar_Sigewinne_PermanentSkill_1 (Driver) reads FIGHT_PROP_MAX_HP
        // (total); KQM has no chain test; GO reads input.total.hp. scaling 'hp*' is the
        // total by construction: default confirmed, no params.
        new FeatureMultiplier({
            receivers: RECEIVERS.OTHERS,
            leveling: 'sigewinne_buff_level',
            source: 'ascension1',
            scaling: 'hp*',
            values: new ValueTable([A1DmgBonus / 10, C1DmgBonus / 10]),
            capValue: new ValueTable([A1DmgBonusMax, C1DmgBonusMax]),
            exceedStatValue: A1MinHP,
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'sigewinne_requires_appropriate_rest'}),
                new ConditionAscensionChar({ascension: 1}),
                offFieldOtherReceiver,
            ]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['skill'],
            }),
        }),
    ],
    conditions: [
        // Game data: Avatar_Sigewinne_P1_Buff_On_Sigewinne writes Actor_WaterAddHurtDelta
        // (flat 8% Hydro DMG, no stat read). Flat conditions are always premod: no params.
        new ConditionBoolean({
            name: 'sigewinne_requires_appropriate_rest',
            serializeId: 1,
            title: 'talent_name.sigewinne_requires_appropriate_rest',
            description: 'talent_descr.sigewinne_requires_appropriate_rest_1',
            info: {ascension: 1},
            stats: {
                dmg_hydro: A1HydroDmg,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.sigewinne_requires_appropriate_rest',
            description: 'talent_descr.sigewinne_requires_appropriate_rest_2',
            info: {ascension: 1},
            stats: {
                text_value_hp: A1MinHP,
                text_value_dmg: A1DmgBonus,
                text_value_max: A1DmgBonusMax,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionNumber({
            name: 'sigewinne_detailed_diagnosis',
            serializeId: 3,
            title: 'talent_name.sigewinne_detailed_diagnosis_thorough_treatment',
            description: 'talent_descr.sigewinne_detailed_diagnosis_thorough_treatment',
            max: 10000,
            class: "gi-inputs-5digit",
            info: {ascension: 4},
            stats: {
                text_percent: A4HealingBonus,
                text_percent_max: A4HealingBonusMax,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    postEffects: [
        // Game data: Avatar_Sigewinne_PermanentSkill_2 (A4) reads the Bond of Life
        // (FIGHT_PROP_CUR_HP_DEBTS), not a split stat, and writes through a heal-up
        // mixin (no Actor channel). Default (extra write) confirmed, no params.
        new PostEffectStats({
            from: 'sigewinne_detailed_diagnosis',
            percent: new StatTable('healing', [A4HealingBonus / 1000]),
            statCap: new StatTable('', [A4HealingBonusMax]),
            conditions: [
                new ConditionBoolean({name: 'sigewinne_detailed_diagnosis'}),
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        // Game data: Avatar_Sigewinne_Talent_6 (Crit_Buff_Driver) reads FIGHT_PROP_MAX_HP
        // (total) into Critical_Rate_Cache, applied as ModifyDamageMixin bonusCritical
        // (burst only). KQM has no chain test. GO reads input.total.hp (burst-scoped).
        // Declared reads: TOTAL. The game writes a burst hit bonus, not an
        // attribute: crit_rate_burst reaches her burst hits only and has no
        // extra lane, so no write channel applies.
        new PostEffectStatsHP({
            reads: CHANNELS.TOTAL,
            percent: new StatTable('crit_rate_burst', [C6CritRate / 1000]),
            statCap: new StatTable('', [C6CritRateMax]),
            conditions: [
                new ConditionBoolean({name: 'sigewinne_would_the_most_radiant_of_spirits_pray_for_me'}),
                new ConditionConstellation({constellation: 6}),
            ],
        }),
        // Game data: same Avatar_Sigewinne_Talent_6 modifier reads FIGHT_PROP_MAX_HP
        // (total) into Critical_Damage_Cache (ModifyDamageMixin bonusCriticalHurt,
        // burst only); same evidence as crit_rate above. Declared reads: TOTAL.
        // Value fix: was C6CritDmgMax/10 (always at the 110% cap); the text and the
        // game give 2.2% per 1000 HP (C6CritDmg/1000, as Nilou's C6), capped at 110%.
        // (The crit_rate table above had the same /10-for-/1000 scale bug; fixed too.)
        new PostEffectStatsHP({
            reads: CHANNELS.TOTAL,
            percent: new StatTable('crit_dmg_burst', [C6CritDmg / 1000]),
            statCap: new StatTable('', [C6CritDmgMax]),
            conditions: [
                new ConditionBoolean({name: 'sigewinne_would_the_most_radiant_of_spirits_pray_for_me'}),
                new ConditionConstellation({constellation: 6}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.sigewinne_can_the_happiest_of_spirits_understand_anxiety',
                    description: 'talent_descr.sigewinne_can_the_happiest_of_spirits_understand_anxiety',
                    stats: {
                        text_value_hp: A1MinHP,
                        text_value_dmg: C1DmgBonus,
                        text_value_max: C1DmgBonusMax,
                    },
                    settings: {
                        sigewinne_buff_level: 2,
                    }
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.sigewinne_can_the_most_merciful_of_spirits_defeat_its_foes',
                    description: 'talent_descr.sigewinne_can_the_most_merciful_of_spirits_defeat_its_foes_1',
                    stats: {
                        text_percent: C2Shield,
                    }
                }),
                // Renamed from party.sigewinne_spirits_defeat_its_foes to the own scope;
                // the old party ID is retired. Enemy Hydro RES shred (TEAM).
                // Game data: UNIQUE_Sigewinne_Talent_2_Water_Subhurt writes
                // Actor_WaterSubHurtDelta (flat Hydro RES shred, no stat read).
                // Flat conditions are always premod: no params.
                new ConditionBoolean({
                    name: 'sigewinne_spirits_defeat_its_foes',
                    serializeId: 4,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.sigewinne_can_the_most_merciful_of_spirits_defeat_its_foes',
                    description: 'talent_descr.sigewinne_can_the_most_merciful_of_spirits_defeat_its_foes_2',
                    stats: {
                        enemy_res_hydro: C2HydroRes,
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
                    title: 'talent_name.sigewinne_can_the_loveliest_of_spirits_keep_decay_at_bay',
                    description: 'talent_descr.sigewinne_can_the_loveliest_of_spirits_keep_decay_at_bay',
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
                    name: 'sigewinne_would_the_most_radiant_of_spirits_pray_for_me',
                    serializeId: 5,
                    title: 'talent_name.sigewinne_can_the_most_radiant_of_spirits_pray_for_me',
                    description: 'talent_descr.sigewinne_can_the_most_radiant_of_spirits_pray_for_me',
                    stats: {
                        text_percent_1: C6CritRate,
                        text_percent_1_max: C6CritRateMax,
                        text_percent_2: C6CritDmg,
                        text_percent_2_max: C6CritDmgMax,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox'], [4, 'checkbox']],
});
