import { ConditionAnd } from "../../classes/Condition/And";
import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionBooleanChar } from "../../classes/Condition/Boolean/Char";
import { ConditionBooleanCharElement } from "../../classes/Condition/Boolean/CharElement";
import { ConditionBooleanCharOrigin } from "../../classes/Condition/Boolean/CharOrigin";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionOr } from "../../classes/Condition/Or";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionTeamOrigin } from "../../classes/Condition/TeamOrigin";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
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
import { FeatureReactionLunarCrystallizeLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/CrystallizeLike";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsDef } from "../../classes/PostEffect/Stats/Def";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent, plus, times } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Linnea.s1_id,
        title: 'talent_name.linnea_capture_protocol',
        description: 'talent_descr.linnea_capture_protocol',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Linnea.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Linnea.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Linnea.s1.p3),
            },
            {
                table: new StatTable('aimed', charTalentTables.Linnea.s1.p4),
            },
            {
                table: new StatTable('charged_aimed', charTalentTables.Linnea.s1.p5),
            },
            {
                table: new StatTable('plunge', charTalentTables.Linnea.s1.p6),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Linnea.s1.p7),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Linnea.s1.p8),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Linnea.s2_id,
        title: 'talent_name.linnea_lumis_battle_cry',
        description: 'talent_descr.linnea_lumis_battle_cry',
        items: [
            {
                table: new StatTable('lumi_pound_pound_pummeler_dmg', charTalentTables.Linnea.s2.p1),
            },
            {
                table: new StatTable('lumi_heavy_overdrive_hammer_dmg', charTalentTables.Linnea.s2.p2),
            },
            {
                table: new StatTable('lumi_million_ton_crush_dmg', charTalentTables.Linnea.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('lumi_duration', charTalentTables.Linnea.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Linnea.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Linnea.s3_id,
        title: 'talent_name.linnea_survival_guide_in_extreme_conditions',
        description: 'talent_descr.linnea_survival_guide_in_extreme_conditions',
        items: [
            {
                type: 'shield',
                unit: 'def',
                table: [
                    new StatTable('linnea_initial_healing_amount', charTalentTables.Linnea.s3.p2),
                    new StatTable('', charTalentTables.Linnea.s3.p1),
                ],
            },
            {
                type: 'shield',
                unit: 'def',
                table: [
                    new StatTable('linnea_continuous_healing', charTalentTables.Linnea.s3.p4),
                    new StatTable('', charTalentTables.Linnea.s3.p3),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('linnea_healing_duration', charTalentTables.Linnea.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Linnea.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Linnea.s3.p7),
            },
        ],
    },
});

const A1GeoRes = -percent(charTalentTables.Linnea.a1.p1);
const A1GeoResMoonsign = -percent(charTalentTables.Linnea.a1.p2);
const A4EmScale = percent(charTalentTables.Linnea.a4.p1);
const PassiveLunarScale = percent(charTalentTables.Linnea.a0.p1);
const PassiveLunarScaleCap = percent(charTalentTables.Linnea.a0.p2);
const ProvisionalClassificationFieldCatalogScale = percent(charTalentTables.Linnea.c1.p4);
const ProvisionalClassificationMillionTonCrushScale = percent(charTalentTables.Linnea.c1.p6);
const ProvisionalClassificationMaxMillionTonCrushStacks = charTalentTables.Linnea.c1.p5;
// C6: a hit consumes twice the stacks (C6_BuffConsume_Factor) at 75% each
// (C6_BuffDamageUp_Factor), "150% of the original". The doubled consumption
// is not modelled: the stack count stays, and the extra half is a second
// multiplier.
const C6ProvisionalClassificationExtraFactor = plus(times(charTalentTables.Linnea.c6.p2, charTalentTables.Linnea.c6.p3), -1);
const C6ProvisionalClassificationExtraScale = times(ProvisionalClassificationFieldCatalogScale, C6ProvisionalClassificationExtraFactor);
const C6ProvisionalClassificationMillionTonCrushExtraScale = times(ProvisionalClassificationMillionTonCrushScale, C6ProvisionalClassificationExtraFactor);
const C2PartyCritDmg = percent(charTalentTables.Linnea.c2.p1);
const C2MillionTonCritDmg = percent(charTalentTables.Linnea.c2.p3);
const C4DefBonus = percent(charTalentTables.Linnea.c4.p2);
const C6LunarCrystallizeElevate = percent(charTalentTables.Linnea.c6.p1);

// "Your current active character" is the on-field member: a receiver
// field-state check on a hidden delivery, not a manual assumption.
const activeRecipient = new ConditionReceiver({
    condition: new ConditionOnField(),
});

// The active Moonsign character other than Linnea herself (receiver scope).
const activeMoonsignOther = new ConditionReceiver({
    condition: new ConditionAnd([
        new ConditionBooleanCharOrigin({
            origin: ['nodkrai'],
        }),
        new ConditionNot([
            new ConditionBooleanChar({
                chars: ['linnea'],
            }),
        ]),
    ]),
});

// Hydro or Geo receivers (receiver scope) for the C2 CRIT delivery.
const hydroGeoRecipient = new ConditionReceiver({
    condition: new ConditionBooleanCharElement({
        element: ['hydro', 'geo'],
    }),
});

// A4: "If your current active character: Is a Moonsign character: Increase
// this character's Elemental Mastery. Is not a Moonsign character: Increase
// Linnea's own Elemental Mastery." Linnea's copy applies when she is the
// active character or the active character is not a Moonsign character.
// Game data: Avatar_Linnea_PermanentSkill_2 computes DefToMastery_Factor x
// FIGHT_PROP_NONEXTRA_DEFENSE (premod) into Actor_ElemMasteryExtraDelta
// (extra), so the default premod read and extra write are confirmed.
const a4SelfEmPost = new PostEffectStatsDef({
    percent: new StatTable('mastery', [A4EmScale / 100]),
    condition: new ConditionAnd([
        new ConditionAscensionChar({ascension: 4}),
        new ConditionBoolean({name: 'linnea_universal_naturalist_archive'}),
        new ConditionOr([
            new ConditionOnField(),
            new ConditionTeamOrigin({origin: 'nodkrai', onField: true, invert: true}),
        ]),
    ]),
});

// Moonsign benediction: DEF feeds the Lunar-Crystallize base damage ratio.
// Game data: Avatar_Linnea_PermanentSkill_3 uses
// SetNewElementReactionBaseDamageRatioParam (propType Defense), which names
// no premod/total read. The same call reads the total stat in game
// (Ineffa's Benediction, in-game test: md/buff_chains.md); GO reads
// input.total.def. The same number either way while nothing writes extra DEF.
const lunarCrystallizePost = new PostEffectStatsDef({
    receivers: RECEIVERS.TEAM,
    reads: CHANNELS.TOTAL,
    percent: new StatTable('lunarcrystallize_multi', [PassiveLunarScale / 100]),
    statCap: new ValueTable([PassiveLunarScaleCap]),
});

// A4: 5% of Linnea's live DEF as EM for the active Moonsign character
// (Linnea herself excluded: she uses the self post below). The old party
// stage was the default local one; the self copy stays global.
// Game data: same Avatar_Linnea_PermanentSkill_2 modifier as the self copy
// (FIGHT_PROP_NONEXTRA_DEFENSE into Actor_ElemMasteryExtraDelta), so the
// default premod read and extra write are confirmed.
const a4TeamEmPost = new PostEffectStatsDef({
    receivers: RECEIVERS.TEAM,
    percent: new StatTable('mastery', [A4EmScale / 100]),
    condition: new ConditionAnd([
        new ConditionAscensionChar({ascension: 4}),
        new ConditionBoolean({name: 'linnea_universal_naturalist_archive'}),
        activeRecipient,
        activeMoonsignOther,
    ]),
});

export const Linnea = new DbObjectChar({
    name: 'linnea',
    serializeId: 119,
    gameId: 10000130,
    iconClass: 'char-icon-linnea',
    rarity: 5,
    element: 'geo',
    weapon: 'bow',
    origin: 'nodkrai',
    talents: Talents,
    statTable: charTables.Linnea,
    // Every scaling: 'def*' damage multiplier below reads the total DEF: the
    // game computes these hits from FIGHT_PROP_CUR_DEFENSE
    // (Avatar_Linnea_ElementalBurst, Linnea_Partner_AttackSkill_01..03; GO:
    // dmgNode('def', ...)). def* is already total, so no params. Burst heals
    // read the total the same way (GO: healNodeTalent('def', ...)).
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
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_aimed'),
                }),
            ],
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
            name: 'lumi_pound_pound_pummeler_dmg',
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lumi_pound_pound_pummeler_dmg'),
                }),
            ],
        }),
        new FeatureReactionLunarCrystallizeLike({
            name: 'lumi_heavy_overdrive_hammer_dmg',
            element: 'geo',
            category: 'skill',
            tags: ['linnea_heavy_overdrive_hammer'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarcrystallize_multi',
                    scalingSource: 'lunarcrystallize_multi',
                    values: Talents.get('skill.lumi_heavy_overdrive_hammer_dmg'),
                }),
            ],
        }),
        new FeatureReactionLunarCrystallizeLike({
            name: 'lumi_million_ton_crush_dmg',
            element: 'geo',
            category: 'skill',
            tags: ['linnea_million_ton_crush'],
            critDamageBonuses: ['crit_dmg_linnea_million_ton_crush'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarcrystallize_multi',
                    scalingSource: 'lunarcrystallize_multi',
                    values: Talents.get('skill.lumi_million_ton_crush_dmg'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'burst',
            name: 'linnea_initial_healing_amount',
            partyHeal: 1,
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'def*',
                    leveling: 'char_skill_burst',
                    values: Talents.getList('burst.linnea_initial_healing_amount'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'burst',
            name: 'linnea_continuous_healing',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'def*',
                    leveling: 'char_skill_burst',
                    values: Talents.getList('burst.linnea_continuous_healing'),
                }),
            ],
        }),
        // Display of lunarCrystallizePost; follows its channels, needs nothing.
        new FeaturePostEffectValue({
            category: 'other',
            name: 'linnea_lunar_bonus',
            postEffect: lunarCrystallizePost,
            format: 'percent',
        }),
    ],
    conditions: [
        // Linnea unlocks Lunar-Crystallize for the whole team (merged with
        // the old partyData copy).
        new Condition({
            receivers: RECEIVERS.TEAM,
            settings: {
                allowed_lunarcrystallize: 1,
            },
        }),
        // Moonsign level comes from the real team; every Moonsign member
        // delivers the same values, so this needs no stack key.
        new ConditionCalcMoonsign({receivers: RECEIVERS.TEAM}),
        // A1 Field Observation Notes: game sets the flat RockHurtDelta enemy
        // RES values (Avatar_Linnea_PermanentSkill_1, no stat read); flat
        // conditions (premod) need nothing.
        new ConditionBooleanLevels({
            name: 'linnea_field_observation_notes',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.linnea_field_observation_notes',
            description: 'talent_descr.linnea_field_observation_notes',
            info: {ascension: 1},
            rotation: 'self',
            levelSetting: 'party_moonsign',
            stats: [
                new StatTable('enemy_res_geo', [A1GeoRes, A1GeoResMoonsign]),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionBoolean({
            name: 'linnea_universal_naturalist_archive',
            serializeId: 2,
            title: 'talent_name.linnea_universal_naturalist_archive',
            description: 'talent_descr.linnea_universal_naturalist_archive',
            info: {ascension: 4},
            rotation: 'self',
            stats: {
                text_percent: A4EmScale,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionStatic({
            title: 'talent_name.linnea_moonsign_benediction',
            description: 'talent_descr.linnea_moonsign_benediction',
            stats: {
                text_percent: PassiveLunarScale,
                text_percent_max: PassiveLunarScaleCap,
            },
        }),
    ],
    postEffects: [
        lunarCrystallizePost,
        a4SelfEmPost,
        a4TeamEmPost,
    ],
    multipliers: [
        // C1/C6 Provisional Classification: every damageExtra entry in
        // Avatar_Linnea_Constellation_1 (self, team, Cola, and the
        // C6_BuffDamageUp_Factor variants) reads FIGHT_PROP_CUR_DEFENSE
        // (total; GO: input.total.def), so scaling 'def*' (total) is
        // confirmed for all six below, no params.
        // C1 Provisional Classification: nearby members' Lunar-Crystallize
        // DMG +75% of Linnea's live DEF (merged with the old typed party
        // copy). Always active at C1 like her own Heavy Overdrive copy; the
        // source never takes her own delivery.
        new FeatureMultiplier({
            receivers: RECEIVERS.OTHERS,
            scaling: 'def*',
            source: 'linnea_provisional_classification',
            values: new StatTable('linnea_provisional_classification_team', [ProvisionalClassificationFieldCatalogScale]),
            condition: new ConditionConstellation({constellation: 1}),
            target: new FeatureMultiplierTarget({
                tags: ['lunarcrystallize_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        // C6 Golden Beagle's Dream: another +37.5% of live DEF for others.
        new FeatureMultiplier({
            receivers: RECEIVERS.OTHERS,
            scaling: 'def*',
            source: 'linnea_golden_beagles_dream',
            values: new StatTable('linnea_golden_beagles_dream_team', [C6ProvisionalClassificationExtraScale]),
            condition: new ConditionConstellation({constellation: 6}),
            target: new FeatureMultiplierTarget({
                tags: ['lunarcrystallize_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        new FeatureMultiplier({
            scaling: 'def*',
            source: 'linnea_provisional_classification',
            values: new StatTable('linnea_provisional_classification_heavy_overdrive_hammer', [ProvisionalClassificationFieldCatalogScale]),
            condition: new ConditionConstellation({constellation: 1}),
            target: new FeatureMultiplierTarget({
                tags: ['linnea_heavy_overdrive_hammer'],
                options: ['reaction_flat'],
            }),
        }),
        new FeatureMultiplier({
            scaling: 'def*',
            source: 'linnea_golden_beagles_dream',
            values: new StatTable('linnea_golden_beagles_dream_heavy_overdrive_hammer', [C6ProvisionalClassificationExtraScale]),
            condition: new ConditionConstellation({constellation: 6}),
            target: new FeatureMultiplierTarget({
                tags: ['linnea_heavy_overdrive_hammer'],
                options: ['reaction_flat'],
            }),
        }),
        new FeatureMultiplier({
            scaling: 'def*',
            source: 'linnea_provisional_classification',
            stacksLeveling: 'linnea_provisional_classification_million_ton_crush',
            maxStacks: ProvisionalClassificationMaxMillionTonCrushStacks,
            values: new StatTable('linnea_provisional_classification_million_ton_crush', [ProvisionalClassificationMillionTonCrushScale]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 1}),
                new ConditionStacks({name: 'linnea_provisional_classification_million_ton_crush'}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['linnea_million_ton_crush'],
                options: ['reaction_flat'],
            }),
        }),
        new FeatureMultiplier({
            scaling: 'def*',
            source: 'linnea_golden_beagles_dream',
            stacksLeveling: 'linnea_provisional_classification_million_ton_crush',
            maxStacks: ProvisionalClassificationMaxMillionTonCrushStacks,
            values: new StatTable('linnea_golden_beagles_dream_million_ton_crush', [C6ProvisionalClassificationMillionTonCrushExtraScale]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                new ConditionStacks({name: 'linnea_provisional_classification_million_ton_crush'}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['linnea_million_ton_crush'],
                options: ['reaction_flat'],
            }),
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStacks({
                    name: 'linnea_provisional_classification_million_ton_crush',
                    serializeId: 3,
                    title: 'talent_name.linnea_provisional_classification',
                    description: 'talent_descr.linnea_provisional_classification',
                    rotation: 'self',
                    maxStacks: ProvisionalClassificationMaxMillionTonCrushStacks,
                    condition: new ConditionConstellation({constellation: 1}),
                }),
            ],
        },
        {
            conditions: [
                // C2 Tidings of Joy and Sorrow: game writes the flat value
                // C2_CritDamageUp into Actor_CriticalHurtDelta
                // (UNIQUE_Avatar_Linnea_Constellation_2_Buff) and a flat
                // ModifyDamageMixin bonusCriticalHurt for Million Ton Crush:
                // no stat read, so flat conditions (premod) need nothing.
                new ConditionBooleanLevels({
                    name: 'linnea_tidings_of_joy_and_sorrow',
                    serializeId: 5,
                    title: 'talent_name.linnea_tidings_of_joy_and_sorrow',
                    description: 'talent_descr.linnea_tidings_of_joy_and_sorrow',
                    info: {constellation: 2},
                    rotation: 'self',
                    levelSetting: 'party_moonsign',
                    stats: [
                        new StatTable('crit_dmg_geo', [C2PartyCritDmg, C2PartyCritDmg]),
                        new StatTable('text_percent_2', [C2MillionTonCritDmg, C2MillionTonCritDmg]),
                    ],
                    condition: new ConditionConstellation({constellation: 2}),
                }),
                new Condition({
                    isHidden: true,
                    stats: {
                        crit_dmg_linnea_million_ton_crush: C2MillionTonCritDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionConstellation({constellation: 2}),
                        new ConditionBoolean({name: 'linnea_tidings_of_joy_and_sorrow'}),
                    ]),
                }),
                // C2: all Hydro and Geo party members' CRIT DMG +40% (merged
                // with the old typed party copy; the receiver check is in the
                // receiver scope, the toggle stays a plain source read).
                // Linnea keeps her own copy above, so the delivery excludes
                // the source.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        crit_dmg_hydro: C2PartyCritDmg,
                        crit_dmg_geo: C2PartyCritDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'linnea_tidings_of_joy_and_sorrow'}),
                        hydroGeoRecipient,
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
                // C4 Expert Instinct: game writes the flat C4_DefenseRatio
                // into Actor_DefenceRatio (no stat read); flat conditions
                // (premod) need nothing.
                new ConditionBoolean({
                    name: 'linnea_expert_instinct',
                    serializeId: 6,
                    title: 'talent_name.linnea_expert_instinct',
                    description: 'talent_descr.linnea_expert_instinct',
                    info: {constellation: 4},
                    rotation: 'self',
                    stats: {
                        def_percent: C4DefBonus,
                    },
                    condition: new ConditionConstellation({constellation: 4}),
                }),
                new ConditionBoolean({
                    name: 'linnea_expert_instinct_stack',
                    serializeId: 7,
                    title: 'talent_name.linnea_expert_instinct',
                    rotation: 'self',
                    hideInactive: true,
                    stats: {
                        def_percent: C4DefBonus,
                    },
                    condition: new ConditionAnd([
                        new ConditionConstellation({constellation: 4}),
                        new ConditionBoolean({name: 'linnea_expert_instinct'}),
                    ]),
                }),
                // C4: the current active character's DEF +25%. The saved
                // control stays on the source (self copy above); the hidden
                // delivery excludes the source so her manual on-field stack
                // above is not tripled.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        def_percent: C4DefBonus,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'linnea_expert_instinct'}),
                        activeRecipient,
                    ]),
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
                // C6 Golden Beagle's Dream: game writes the flat C6_DefenseRatio
                // into Actor_ElemReactMoonCrystallizeWaterEffectFactor (no stat
                // read); flat conditions need nothing.
                new ConditionStatic({
                    title: 'talent_name.linnea_golden_beagles_dream',
                    description: 'talent_descr.linnea_golden_beagles_dream',
                    condition: new ConditionConstellation({constellation: 6}),
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        dmg_lunarcrystallize_special: C6LunarCrystallizeElevate,
                    },
                    condition: new ConditionAnd([
                        new ConditionConstellation({constellation: 6}),
                        new ConditionBooleanValue({
                            setting: 'party_moonsign',
                            cond: 'ge',
                            value: 2,
                        }),
                    ]),
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'checkbox'], [2, 'number'], [3, 'checkbox'], [4, 'checkbox'], [5, 'checkbox'], [6, 'checkbox'], [7, 'checkbox']],
});
