import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionCalcElementsIlluga } from "../../classes/Condition/CalcElementsIlluga";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
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
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Illuga.s1_id,
        title: 'talent_name.illuga_oathkeepers_spear',
        description: 'talent_descr.illuga_oathkeepers_spear',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Illuga.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Illuga.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Illuga.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Illuga.s1.p5),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Illuga.s1.p6),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Illuga.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Illuga.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Illuga.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Illuga.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Illuga.s2_id,
        title: 'talent_name.illuga_dawnbearing_songbird',
        description: 'talent_descr.illuga_dawnbearing_songbird',
        items: [
            {
                table: new StatTable('illuga_skill_tap_em', charTalentTables.Illuga.s2.p1),
            },
            {
                table: new StatTable('illuga_skill_tap_def', charTalentTables.Illuga.s2.p2),
            },
            {
                table: new StatTable('illuga_skill_hold_em', charTalentTables.Illuga.s2.p3),
            },
            {
                table: new StatTable('illuga_skill_hold_def', charTalentTables.Illuga.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Illuga.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Illuga.s3_id,
        title: 'talent_name.illuga_shadowless_reflection',
        description: 'talent_descr.illuga_shadowless_reflection',
        items: [
            {
                table: new StatTable('illuga_burst_em', charTalentTables.Illuga.s3.p1),
            },
            {
                table: new StatTable('illuga_burst_def', charTalentTables.Illuga.s3.p2),
            },
            {
                table: new StatTable('illuga_geo_dmg_bonus', charTalentTables.Illuga.s3.p3),
            },
            {
                table: new StatTable('illuga_lunar_crystallize_bonus', charTalentTables.Illuga.s3.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('illuga_nightingale_stacks', charTalentTables.Illuga.s3.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('illuga_nightingale_stacks_geo', charTalentTables.Illuga.s3.p6),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Illuga.s3.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Illuga.s3.p8),
            },
            {
                unit: 'unit',
                table: new StatTable('energy_cost', charTalentTables.Illuga.s3.p9),
            },
        ],
    },
});

// A1 Lightkeeper's Oath bonuses
const A1CritRate = percent(charTalentTables.Illuga.a1.p1);
const A1CritDmg = percent(charTalentTables.Illuga.a1.p2);
const A1MoonsignEM = charTalentTables.Illuga.a1.p5;

// C6 enhanced Lightkeeper's Oath bonuses
const C6CritRate = percent(charTalentTables.Illuga.c6.p1);
const C6CritDmg = percent(charTalentTables.Illuga.c6.p2);
const C6MoonsignEM = charTalentTables.Illuga.c6.p5;

// C2 Aedon scaling
const C2AedonEM = percent(charTalentTables.Illuga.c2.p1);
const C2AedonDEF = percent(charTalentTables.Illuga.c2.p2);

// C4 DEF bonus
const C4DefBonus = charTalentTables.Illuga.c4.p1;

// A4 party scaling (1/2/3 Hydro or Geo)
const A4GeoDmgScale = [percent(charTalentTables.Illuga.a4.p1), percent(charTalentTables.Illuga.a4.p2), percent(charTalentTables.Illuga.a4.p3)];
const A4LunarScale = [percent(charTalentTables.Illuga.a4.p4), percent(charTalentTables.Illuga.a4.p5), percent(charTalentTables.Illuga.a4.p6)];

// "Other nearby party members" and "nearby active party members" exclude the
// source; the on-field member is a receiver field-state check on the hidden
// delivery, not a manual assumption.
const activeRecipient = new ConditionReceiver({
    condition: new ConditionOnField(),
});

/**
 * Moonsign: Ascendant Gleam, in the source's settings: the gate of the
 * Lightkeeper's Oath EM bonus. The old model applied it without the gate;
 * the recorded baseline checks force it open to reproduce that recording.
 */
export const illugaAscendantGleam = new ConditionBooleanValue({
    setting: 'party_moonsign',
    cond: 'ge',
    value: 2,
});

export const Illuga = new DbObjectChar({
    name: 'illuga',
    serializeId: 117,
    gameId: 10000127,
    birthday: '12/23',
    iconClass: 'char-icon-illuga',
    rarity: 4,
    weapon: 'polearm',
    element: 'geo',
    origin: 'nodkrai',
    talentMaterialId: 133, // Placeholder
    statTable: charTables.Illuga,
    talents: Talents,
    features: [
        // Normal Attacks
        new FeatureDamageNormal({
            name: 'illuga_normal_1',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'illuga_normal_2',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'illuga_normal_3',
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'illuga_normal_4',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        // Charged Attack
        new FeatureDamageCharged({
            name: 'illuga_charged',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        // Plunge Attacks
        new FeatureDamagePlungeCollision({
            name: 'illuga_plunge_collision',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'illuga_plunge_low',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'illuga_plunge_high',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'atk*',
                    leveling: 'char_skill_normal',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        // Elemental Skill - Tap (EM + DEF scaling)
        new FeatureDamageSkill({
            name: 'illuga_skill_tap',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.illuga_skill_tap_em'),
                }),
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.illuga_skill_tap_def'),
                }),
            ],
        }),
        // Elemental Skill - Hold (EM + DEF scaling)
        new FeatureDamageSkill({
            name: 'illuga_skill_hold',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.illuga_skill_hold_em'),
                }),
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.illuga_skill_hold_def'),
                }),
            ],
        }),
        // Elemental Burst - Initial hit (EM + DEF scaling)
        new FeatureDamageBurst({
            name: 'illuga_burst',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.illuga_burst_em'),
                }),
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.illuga_burst_def'),
                }),
            ],
        }),
        // C2 Aedon summon (Burst DMG, EM + DEF scaling)
        new FeatureDamageBurst({
            name: 'illuga_c2_aedon',
            element: 'geo',
            condition: new ConditionConstellation({constellation: 2}),
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation2',
                    values: new StatTable('illuga_c2_aedon_em', [C2AedonEM]),
                }),
                new FeatureMultiplier({
                    scaling: 'def*',
                    source: 'constellation2',
                    values: new StatTable('illuga_c2_aedon_def', [C2AedonDEF]),
                }),
            ],
        }),
    ],
    conditions: [
        // Moonsign level comes from the real team (gates the Oath EM bonus
        // below); every Moonsign member delivers the same values, so this
        // needs no stack key.
        new ConditionCalcMoonsign({receivers: RECEIVERS.TEAM}),
        // A1: Lightkeeper's Oath after Skill/Burst. "Other nearby party
        // members will gain the Lightkeeper's Oath effect": Illuga himself
        // does not (the old model gave it to him too). The hidden deliveries
        // below carry the effect; C6's toggle replaces this one.
        new ConditionBoolean({
            name: 'illuga_lightkeepers_oath',
            serializeId: 1,
            title: 'talent_name.illuga_torchforgers_covenant',
            description: 'talent_descr.illuga_torchforgers_covenant',
            info: {ascension: 1},
            rotation: 'self',
            hideInactive: true,
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                new ConditionNot([new ConditionConstellation({constellation: 6})]),
            ]),
        }),
        // A1: "other nearby party members will gain the Lightkeeper's Oath
        // effect ... For Geo DMG dealt to opponents, CRIT Rate increases by
        // 5% and CRIT DMG increases by 10%" (before C6).
        new Condition({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            stats: {
                crit_rate_geo: A1CritRate,
                crit_dmg_geo: A1CritDmg,
            },
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                new ConditionNot([new ConditionConstellation({constellation: 6})]),
                new ConditionBoolean({name: 'illuga_lightkeepers_oath'}),
            ]),
        }),
        // A1 Moonsign: Ascendant Gleam EM for the other members, gated on the
        // delivery (the saved control is kept in any team).
        new Condition({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            stats: {
                mastery: A1MoonsignEM,
            },
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                new ConditionNot([new ConditionConstellation({constellation: 6})]),
                new ConditionBoolean({name: 'illuga_lightkeepers_oath'}),
                illugaAscendantGleam,
            ]),
        }),
        // Burst: Nightingale's Song active
        new ConditionBoolean({
            name: 'illuga_nightingales_song',
            serializeId: 2,
            title: 'talent_name.illuga_shadowless_reflection',
            description: 'talent_descr.n11270001',
            info: {burst: true},
            rotation: 'self',
            stats: {},
        }),
        // A4: Demonhunter's Dusk - party element count for scaling
        new ConditionCalcElementsIlluga({
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        // A4: Demonhunter's Dusk - display condition
        new ConditionBooleanLevels({
            name: 'illuga_demonhunters_dusk',
            serializeId: 3,
            title: 'talent_name.illuga_demonhunters_dusk',
            description: 'talent_descr.illuga_demonhunters_dusk',
            levelSetting: 'illuga_hydro_geo_count',
            stats: [
                new StatTable('text_number', [0, 1, 2, 3]),
                new StatTable('text_percent_em', [0, ...A4GeoDmgScale]),
            ],
            info: {ascension: 4},
            hideInactive: true,
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
                new ConditionBoolean({name: 'illuga_nightingales_song'}),
            ],
        }),
    ],
    partyConditions: [],
    multipliers: [
        // Burst: Nightingale's Song consumes 1 stack when Geo DMG of nearby
        // active members hits, increasing the DMG from Illuga's live EM and
        // burst level (merged with the old typed party copies).
        new FeatureMultiplier({
            receivers: RECEIVERS.OTHERS,
            scaling: 'mastery*',
            leveling: 'char_skill_burst',
            source: 'illuga_nightingales_song',
            values: Talents.get('burst.illuga_geo_dmg_bonus'),
            target: new FeatureMultiplierTarget({
                damageElements: ['geo'],
                tagsExclude: ['lunarcrystallize_reaction'],
            }),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'illuga_nightingales_song'}),
                activeRecipient,
            ]),
        }),
        // Nightingale's Song: Lunar-Crystallize increase from live EM/burst.
        new FeatureMultiplier({
            receivers: RECEIVERS.OTHERS,
            scaling: 'mastery*',
            leveling: 'char_skill_burst',
            source: 'illuga_nightingales_song',
            values: Talents.get('burst.illuga_lunar_crystallize_bonus'),
            target: new FeatureMultiplierTarget({
                tags: ['lunarcrystallize_reaction'],
                options: ['reaction_flat'],
            }),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'illuga_nightingales_song'}),
                activeRecipient,
            ]),
        }),
        // A4: Demonhunter's Dusk enhances Nightingale's Song by the live
        // Hydro/Geo team count (source scope): Geo DMG increase.
        new FeatureMultiplier({
            receivers: RECEIVERS.OTHERS,
            scaling: 'mastery*',
            leveling: 'illuga_hydro_geo_count',
            source: 'illuga_demonhunters_dusk',
            values: new StatTable('illuga_a4_geo_dmg_bonus', [0, ...A4GeoDmgScale]),
            target: new FeatureMultiplierTarget({
                damageElements: ['geo'],
                tagsExclude: ['lunarcrystallize_reaction'],
            }),
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                new ConditionBoolean({name: 'illuga_demonhunters_dusk'}),
                activeRecipient,
            ]),
        }),
        // A4: Lunar-Crystallize increase by the live Hydro/Geo team count.
        new FeatureMultiplier({
            receivers: RECEIVERS.OTHERS,
            scaling: 'mastery*',
            leveling: 'illuga_hydro_geo_count',
            source: 'illuga_demonhunters_dusk',
            values: new StatTable('illuga_a4_lunar_crystallize_bonus', [0, ...A4LunarScale]),
            target: new FeatureMultiplierTarget({
                tags: ['lunarcrystallize_reaction'],
                options: ['reaction_flat'],
            }),
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                new ConditionBoolean({name: 'illuga_demonhunters_dusk'}),
                activeRecipient,
            ]),
        }),
    ],
    constellation: new DbObjectConstellation([
        // C1: Gullinkambi - Energy restoration (passive, not calculated)
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.illuga_vigilant_sentinel',
                    description: 'talent_descr.illuga_vigilant_sentinel',
                }),
            ],
        },
        // C2: Eikþyrnir - Aedon summon (featured above)
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.illuga_elk_with_fanged_antlers',
                    description: 'talent_descr.illuga_elk_with_fanged_antlers',
                    stats: {
                        text_percent_em: C2AedonEM,
                        text_percent_def: C2AedonDEF,
                    },
                }),
            ],
        },
        // C3: Bergelmir - Burst +3
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_burst_bonus: 3,
                    },
                }),
            ],
        },
        // C4: "nearby active party members will have their DEF increased by
        // 200": the on-field member, Illuga included.
        {
            conditions: [
                new ConditionBoolean({
                    name: 'illuga_c4_def',
                    serializeId: 4,
                    title: 'talent_name.illuga_solarhunting_wolf',
                    description: 'talent_descr.illuga_solarhunting_wolf',
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        def: C4DefBonus,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'illuga_c4_def'}),
                        activeRecipient,
                    ]),
                }),
            ],
        },
        // C5: Svadilfari - Skill +3
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_elemental_bonus: 3,
                    },
                }),
            ],
        },
        // C6: Nightmare Orioles - Enhanced Lightkeeper's Oath (applied via toggleable condition)
        {
            conditions: [
                // "Enhances the Lightkeeper's Oath effect ... You must first
                // unlock the Ascension Talent": the Oath control from C6 on.
                new ConditionBoolean({
                    name: 'illuga_lightkeepers_oath_c6',
                    serializeId: 6,
                    title: 'talent_name.illuga_nightmare_orioles',
                    description: 'talent_descr.illuga_nightmare_orioles',
                    rotation: 'self',
                    hideInactive: true,
                    condition: new ConditionAscensionChar({ascension: 1}),
                }),
                // C6 CRIT for the other members, in place of A1's values.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        crit_rate_geo: C6CritRate,
                        crit_dmg_geo: C6CritDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionAscensionChar({ascension: 1}),
                        new ConditionBoolean({name: 'illuga_lightkeepers_oath_c6'}),
                    ]),
                }),
                // C6 Moonsign: Ascendant Gleam EM for the other members.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        mastery: C6MoonsignEM,
                    },
                    condition: new ConditionAnd([
                        new ConditionAscensionChar({ascension: 1}),
                        new ConditionBoolean({name: 'illuga_lightkeepers_oath_c6'}),
                        illugaAscendantGleam,
                    ]),
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [4, 'checkbox'], [6, 'checkbox'], [7, 'checkbox'], [8, 'number'], [9, 'checkbox'], [10, 'checkbox'], [11, 'checkbox']],
});
