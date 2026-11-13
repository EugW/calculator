import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionBooleanDropdownValue } from "../../classes/Condition/Boolean/DropdownValue";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdownElement } from "../../classes/Condition/Dropdown/Element";
import { ConditionLevels } from "../../classes/Condition/Levels";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionBooleanColumbina } from "../../classes/Condition/Boolean/Columbina";
import { ConditionDropdownColumbina } from "../../classes/Condition/Dropdown/Columbina";
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
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureReactionLunarBloomLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/BloomLike";
import { FeatureReactionLunarChargedLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/ChargedLike";
import { FeatureReactionLunarCrystallizeLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/CrystallizeLike";
import { PostEffectStatsHP } from "../../classes/PostEffect/Stats/HP";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";
import { CHANNELS } from "../../classes/PostEffect/Channels";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Columbina.s1_id,
        title: 'talent_name.columbina_moondew_cascade',
        description: 'talent_descr.columbina_moondew_cascade',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Columbina.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Columbina.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Columbina.s1.p3),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Columbina.s1.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Columbina.s1.p5),
            },
            {
                table: new StatTable('columbina_moondew_cleanse_dmg', charTalentTables.Columbina.s1.p6),
            },
            {
                table: new StatTable('plunge', charTalentTables.Columbina.s1.p7),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Columbina.s1.p8),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Columbina.s1.p9),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Columbina.s2_id,
        title: 'talent_name.columbina_eternal_tides',
        description: 'talent_descr.columbina_eternal_tides',
        items: [
            {
                table: new StatTable('columbina_skill_dmg', charTalentTables.Columbina.s2.p1),
            },
            {
                table: new StatTable('columbina_gravity_ripple_dmg', charTalentTables.Columbina.s2.p2),
            },
            {
                table: new StatTable('columbina_lunar_charged_dmg', charTalentTables.Columbina.s2.p3),
            },
            {
                table: new StatTable('columbina_lunar_bloom_dmg', charTalentTables.Columbina.s2.p4),
            },
            {
                table: new StatTable('columbina_lunar_crystallize_dmg', charTalentTables.Columbina.s2.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('columbina_gravity_limit', charTalentTables.Columbina.s2.p8),
            },
            {
                unit: 'sec',
                table: new StatTable('columbina_gravity_ripple_duration', charTalentTables.Columbina.s2.p9),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Columbina.s2.p10),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Columbina.s3_id,
        title: 'talent_name.columbina_moonlit_melancholy',
        description: 'talent_descr.columbina_moonlit_melancholy',
        items: [
            {
                table: new StatTable('columbina_burst_dmg', charTalentTables.Columbina.s3.p1),
            },
            {
                unit: 'percent',
                table: new StatTable('columbina_lunar_reaction_bonus', charTalentTables.Columbina.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('columbina_lunar_domain_duration', charTalentTables.Columbina.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Columbina.s3.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('energy_cost', charTalentTables.Columbina.s3.p5),
            },
        ],
    },
});

// Passive scaling constants
const PassiveLunarHpScale = percent(charTalentTables.Columbina.a0.p1); // per 1000 HP
const PassiveLunarHpScalePerHp = PassiveLunarHpScale / 1000;
const PassiveLunarHpCap = percent(charTalentTables.Columbina.a0.p2);
const A1CritRate = percent(charTalentTables.Columbina.a1.p1);
const A1MaxStacks = 3; // max 3 stacks (15% total)

// Constellation constants
const C1Elevation = percent(charTalentTables.Columbina.c1.p7);
const C1ShieldHpScale = percent(charTalentTables.Columbina.c1.p4);
const C2GravityBonus = percent(charTalentTables.Columbina.c2.p1);
const C2HpBonus = percent(charTalentTables.Columbina.c2.p2);
const C2Elevation = percent(charTalentTables.Columbina.c2.p7);
const C2AtkHpScale = percent(charTalentTables.Columbina.c2.p4);
const C2EmHpScale = percent(charTalentTables.Columbina.c2.p5);
const C2DefHpScale = percent(charTalentTables.Columbina.c2.p6);
const C3Elevation = percent(charTalentTables.Columbina.c3.p1);
const C4Elevation = percent(charTalentTables.Columbina.c4.p6);
const C4LunarChargedHpScale = percent(charTalentTables.Columbina.c4.p2);
const C4LunarBloomHpScale = percent(charTalentTables.Columbina.c4.p3);
const C4LunarCrystallizeHpScale = percent(charTalentTables.Columbina.c4.p4);
const C5Elevation = percent(charTalentTables.Columbina.c5.p1);
const C6CritDmg = 80;
const C6Elevation = percent(charTalentTables.Columbina.c6.p3);

// Utility passive: Lunar reaction base DMG bonus from HP
// Adds to all three *_multi stats to integrate with existing lunar calculation
// Delivered to the whole team from the source's live HP (old priority kept).
// Moonsign Benedictions of different members stack, so no stack key.
// Game data: Avatar_Columbina_PermanentSkill_3 sets the reaction base-damage
// ratio with SetNewElementReactionBaseDamageRatioParam (propType MaxHp), which
// names no premod/total read. The same call reads the total stat in game
// (Ineffa's Benediction, in-game test: md/buff_chains.md); GO reads
// input.total.hp. The same number either way while nothing writes extra HP.
const lunarHpPostBloom = new PostEffectStatsHP({
    receivers: RECEIVERS.TEAM,
    reads: CHANNELS.TOTAL,
    percent: new StatTable('lunarbloom_multi', [PassiveLunarHpScalePerHp]),
    statCap: new ValueTable([PassiveLunarHpCap]),
});
const lunarHpPostCharged = new PostEffectStatsHP({
    receivers: RECEIVERS.TEAM,
    reads: CHANNELS.TOTAL,
    percent: new StatTable('lunarcharged_multi', [PassiveLunarHpScalePerHp]),
    statCap: new ValueTable([PassiveLunarHpCap]),
});
const lunarHpPostCrystallize = new PostEffectStatsHP({
    receivers: RECEIVERS.TEAM,
    reads: CHANNELS.TOTAL,
    percent: new StatTable('lunarcrystallize_multi', [PassiveLunarHpScalePerHp]),
    statCap: new ValueTable([PassiveLunarHpCap]),
});

// "Your current active character" is the on-field member: a receiver
// field-state check on the hidden delivery, not a manual assumption.
const activeRecipient = new ConditionReceiver({
    condition: new ConditionOnField(),
});

/**
 * Moonsign: Ascendant Gleam, in the source's settings: the gate of C2's
 * ATK/EM/DEF for the active character. The old model applied them without
 * it; the conversion row forces it open to reproduce that recording.
 */
export const columbinaAscendantGleam = new ConditionBooleanValue({
    setting: 'party_moonsign',
    cond: 'ge',
    value: 2,
});

export const Columbina = new DbObjectChar({
    name: 'columbina',
    serializeId: 115,
    gameId: 10000125,
    iconClass: 'char-icon-columbina',
    rarity: 5,
    element: 'hydro',
    weapon: 'catalyst',
    origin: 'nodkrai',
    talents: Talents,
    statTable: charTables.Columbina,
    // Every scaling: 'hp*' damage multiplier below reads the total HP: the
    // game computes these hits from FIGHT_PROP_MAX_HP (damageExtra and
    // ODOCDKOAICG entries; GO: dmgNode('hp', ...)). hp* is already total,
    // so no params.
    features: [
        // Normal attacks (ATK scaling, Hydro)
        new FeatureDamageNormal({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        // Charged Attack (ATK scaling, Hydro)
        new FeatureDamageCharged({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        // Moondew Cleanse (HP scaling, Dendro, Lunar-Bloom DMG ×3) - replaces Charged Attack
        new FeatureReactionLunarBloomLike({
            name: 'columbina_moondew_cleanse_dmg',
            element: 'dendro',
            category: 'attack',
            dmgStats: ['dmg_charged'],
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_attack',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: Talents.get('attack.columbina_moondew_cleanse_dmg'),
                }),
            ],
        }),
        // Plunge attacks (ATK scaling, Hydro)
        new FeatureDamagePlungeCollision({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        // Skill DMG (HP scaling, Hydro)
        new FeatureDamageSkill({
            name: 'columbina_skill_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.columbina_skill_dmg'),
                }),
            ],
        }),
        // Gravity Ripple DMG (HP scaling, Hydro)
        new FeatureDamageSkill({
            name: 'columbina_gravity_ripple_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.columbina_gravity_ripple_dmg'),
                }),
            ],
        }),
        // Gravity Interference: Lunar-Charged (HP scaling, Electro)
        new FeatureReactionLunarChargedLike({
            name: 'columbina_lunar_charged_dmg',
            element: 'electro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: Talents.get('skill.columbina_lunar_charged_dmg'),
                }),
            ],
        }),
        // Gravity Interference: Lunar-Bloom (HP scaling, Dendro, ×5)
        new FeatureReactionLunarBloomLike({
            name: 'columbina_lunar_bloom_dmg',
            element: 'dendro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: Talents.get('skill.columbina_lunar_bloom_dmg'),
                }),
            ],
        }),
        // Gravity Interference: Lunar-Crystallize (HP scaling, Geo)
        new FeatureReactionLunarCrystallizeLike({
            name: 'columbina_lunar_crystallize_dmg',
            element: 'geo',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    scalingMultiplier: 'lunarcrystallize_multi',
                    scalingSource: 'lunarcrystallize_multi',
                    values: Talents.get('skill.columbina_lunar_crystallize_dmg'),
                }),
            ],
        }),
        // Burst DMG (HP scaling, Hydro)
        new FeatureDamageBurst({
            name: 'columbina_burst_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.columbina_burst_dmg'),
                }),
            ],
        }),
        // Post effect display for utility passive (shows one, all three are same value)
        new FeaturePostEffectValue({
            category: 'other',
            name: 'columbina_lunar_hp_bonus',
            postEffect: lunarHpPostBloom,
            format: 'percent',
        }),
    ],
    conditions: [
        // Enable all Lunar reactions for the whole team (merged with the old
        // partyData copy).
        new Condition({
            receivers: RECEIVERS.TEAM,
            settings: {
                allowed_lunarbloom: 1,
                allowed_lunarcharged: 1,
                allowed_lunarcrystallize: 1,
            },
        }),
        // Moonsign level comes from the real team; every Moonsign member
        // delivers the same values, so this needs no stack key.
        new ConditionCalcMoonsign({receivers: RECEIVERS.TEAM}),
        // A1: Lunacy's Lure - CRIT Rate stacks from Gravity Interference.
        // Game data: Avatar_Columbina_PermanentSkill_1 writes the flat
        // Actor_CriticalDelta (no stat read). Flat conditions are premod,
        // so no params.
        new ConditionStacks({
            name: 'columbina_lunacy_stacks',
            serializeId: 1,
            title: 'talent_name.columbina_lunacys_lure',
            description: 'talent_descr.columbina_lunacys_lure',
            info: {ascension: 1},
            rotation: 'self',
            maxStacks: A1MaxStacks,
            stats: [
                new StatTable('crit_rate', [A1CritRate]),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        // A4: Law of the New Moon (non-calculable effects, just description)
        new ConditionStatic({
            title: 'talent_name.columbina_law_of_the_new_moon',
            description: 'talent_descr.columbina_law_of_the_new_moon',
            info: {ascension: 4},
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        // Utility Passive: Moonsign Benediction
        new ConditionStatic({
            title: 'talent_name.columbina_moonsign_benediction',
            description: 'talent_descr.columbina_moonsign_benediction',
            stats: {
                text_percent: PassiveLunarHpScale,
                text_percent_max: PassiveLunarHpCap,
            },
        }),
        // C5: Burst +3 (must be before ConditionLevels to apply bonus)
        new Condition({
            settings: {
                char_skill_burst_bonus: 3,
            },
            condition: new ConditionConstellation({constellation: 5}),
        }),
        // Burst: Lunar Domain active toggle with level-scaling DMG bonus
        new ConditionBoolean({
            name: 'columbina_lunar_domain',
            serializeId: 2,
            title: 'talent_name.n11250002',
            description: 'talent_descr.n11250002',
            rotation: 'self',
        }),
        // Burst: Lunar Reaction DMG Bonus from Lunar Domain (level-scaling).
        // The shared Lunar Domain delivers the source's live burst level
        // (with her own C5 bonus) to every member's program. Level-scaled,
        // no stat read, so no params.
        new ConditionLevels({
            receivers: RECEIVERS.TEAM,
            levelSetting: 'char_skill_burst',
            stats: [
                Talents.getAlias('burst.columbina_lunar_reaction_bonus', 'dmg_reaction_lunar'),
            ],
            subConditions: [
                new ConditionBoolean({name: 'columbina_lunar_domain'}),
            ],
        }),

    ],
    postEffects: [
        lunarHpPostBloom,
        lunarHpPostCharged,
        lunarHpPostCrystallize,
        // C2 Ascendant Gleam: Lunar-Charged (electro) -> ATK of the active
        // character, from live HP. The saved selector and Brilliance toggle
        // stay on the source, so the activation survives save/load off-field;
        // the hidden delivery checks the receiver and the Moonsign gate.
        // Game data: Avatar_Columbina_Constellation_2_MoonShockBuff_OnLocal
        // writes Actor_AttackDelta (non-extra) from FIGHT_PROP_MAX_HP
        // (total); GO writes it under premod. Premod ATK readers (Flins,
        // Ineffa, Sandrone, Cryo Traveler A4) count it.
        new PostEffectStatsHP({
            receivers: RECEIVERS.TEAM,
            reads: CHANNELS.TOTAL,
            writes: CHANNELS.PREMOD,
            percent: new StatTable('atk', [C2AtkHpScale / 100]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 2}),
                new ConditionBoolean({name: 'columbina_lunar_brilliance'}),
                new ConditionBooleanDropdownValue({name: 'columbina_c2_dominant_lunar', value: 'electro'}),
                columbinaAscendantGleam,
                activeRecipient,
            ]),
        }),
        // C2 Ascendant Gleam: Lunar-Bloom (dendro) -> EM of the active character.
        // Game data: Avatar_Columbina_Constellation_2_MoonOverGrowBuff_OnLocal
        // writes Actor_ElemMasteryDelta (non-extra) from FIGHT_PROP_MAX_HP
        // (total); GO writes it under premod. Premod EM readers (Sucrose,
        // Nahida, Kazuha A4) count it.
        new PostEffectStatsHP({
            receivers: RECEIVERS.TEAM,
            reads: CHANNELS.TOTAL,
            writes: CHANNELS.PREMOD,
            percent: new StatTable('mastery', [C2EmHpScale / 100]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 2}),
                new ConditionBoolean({name: 'columbina_lunar_brilliance'}),
                new ConditionBooleanDropdownValue({name: 'columbina_c2_dominant_lunar', value: 'dendro'}),
                columbinaAscendantGleam,
                activeRecipient,
            ]),
        }),
        // C2 Ascendant Gleam: Lunar-Crystallize (geo) -> DEF of the active character.
        // Game data: Avatar_Columbina_Constellation_2_MoonCrystalBuff_OnLocal
        // writes Actor_DefenceDelta (non-extra) from FIGHT_PROP_MAX_HP
        // (total); GO writes it under premod. Premod DEF readers (Itto,
        // Noelle, Xinyan) and Linnea's A4 (total DEF) count it.
        new PostEffectStatsHP({
            receivers: RECEIVERS.TEAM,
            reads: CHANNELS.TOTAL,
            writes: CHANNELS.PREMOD,
            percent: new StatTable('def', [C2DefHpScale / 100]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 2}),
                new ConditionBoolean({name: 'columbina_lunar_brilliance'}),
                new ConditionBooleanDropdownValue({name: 'columbina_c2_dominant_lunar', value: 'geo'}),
                columbinaAscendantGleam,
                activeRecipient,
            ]),
        }),
    ],
    multipliers: [
        // C4: Lunar-Charged DMG Increase (+12.5% HP as flat damage).
        // Game data: Avatar_Columbina_Constellation_4_Buff reads
        // FIGHT_PROP_MAX_HP (total; GO: input.total.hp). scaling: 'hp*' is
        // already total, so no params.
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'constellation4',
            values: new StatTable('columbina_c4_lunar_charged', [C4LunarChargedHpScale]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                new ConditionBoolean({name: 'columbina_c4_dmg_bonus'}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['lunarcharged_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        // C4: Lunar-Bloom DMG Increase (+2.5% HP as flat damage)
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'constellation4',
            values: new StatTable('columbina_c4_lunar_bloom', [C4LunarBloomHpScale]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                new ConditionBoolean({name: 'columbina_c4_dmg_bonus'}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['lunarbloom_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        // C4: Lunar-Crystallize DMG Increase (+12.5% HP as flat damage)
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'constellation4',
            values: new StatTable('columbina_c4_lunar_crystallize', [C4LunarCrystallizeHpScale]),
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                new ConditionBoolean({name: 'columbina_c4_dmg_bonus'}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['lunarcrystallize_reaction'],
                options: ['reaction_flat'],
            }),
        }),
    ],
    constellation: new DbObjectConstellation([
        // C1: Radiance Over Blossoms and Peaks
        // (Game data: Actor_EndureDelta is flat; the Rainsea Shield is sized
        // by GlobalMainShieldMixin maxShieldByHPRatio = 12% Max HP but kept
        // as display text here; the 6 Energy is flat and not modelled.
        // Flat conditions are premod, so no params.)
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.columbina_radiance_over_blossoms_and_peaks',
                    description: 'talent_descr.columbina_radiance_over_blossoms_and_peaks',
                    stats: {
                        text_percent_shield: C1ShieldHpScale,
                    },
                }),
                // "All nearby party members' Lunar Reaction DMG is elevated by
                // 1.5%." Every constellation ends with such a sentence as its
                // own paragraph, after the Ascendant Gleam block where there
                // is one; it has no Moonsign condition (as in the old model).
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        'dmg_lunar_special': C1Elevation,
                    },
                }),
            ],
        },
        // C2: Not in Lone Splendor
        {
            conditions: [
                new ConditionBooleanColumbina({
                    name: 'columbina_lunar_brilliance',
                    serializeId: 3,
                    title: 'talent_name.columbina_not_in_lone_splendor',
                    description: 'talent_descr.columbina_not_in_lone_splendor',
                    rotation: 'self',
                    hideInactive: true,
                    baseStats: {
                        text_percent_gravity: C2GravityBonus,
                        text_percent_atk: C2AtkHpScale,
                        text_percent_em: C2EmHpScale,
                        text_percent_def: C2DefHpScale,
                    },
                    stats: {
                        hp_percent: C2HpBonus,
                        text_percent: C2HpBonus,
                    },
                }),
                // C2 dominant-Lunar selector (source control; the receiver
                // element checks are plain dropdown-value reads in the source
                // scope on the hidden HP deliveries above).
                // The Brilliance HP below is flat: the game writes the
                // non-extra Actor_MaxHPRatio (no stat read), and flat
                // conditions are premod, so no params.
                new ConditionDropdownElement({
                    name: 'columbina_c2_dominant_lunar',
                    serializeId: 5,
                    title: 'talent_name.columbina_ascendant_gleam',
                    description: 'talent_descr.columbina_ascendant_gleam',
                    dropdownClass: 'select-element',
                    values: [
                        { value: 'electro', serializeId: 1 },
                        { value: 'dendro', serializeId: 2 },
                        { value: 'geo', serializeId: 3 },
                    ],
                }),
                // "All nearby party members' Lunar Reaction DMG is elevated by
                // 7%." Automatic at C2, like C1's (not tied to the Brilliance
                // toggle).
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        'dmg_lunar_special': C2Elevation,
                    },
                }),
            ],
        },
        // C3: Skill +3
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_elemental_bonus: 3,
                    },
                }),
                new ConditionStatic({
                    title: 'talent_name.columbina_dreamlike_glow_across_tranquil_waters',
                    description: 'talent_descr.char_constellation_skill',
                    stats: {
                        'dmg_lunar_special': C3Elevation,
                    },
                    receivers: RECEIVERS.TEAM,
                }),
            ],
        },
        // C4: Cloudveiled Ridges in Floral Mists
        {
            conditions: [
                new ConditionBooleanColumbina({
                    name: 'columbina_c4_dmg_bonus',
                    serializeId: 8,
                    title: 'talent_name.columbina_cloudveiled_ridges_in_floral_mists',
                    description: 'talent_descr.columbina_cloudveiled_ridges_in_floral_mists',
                    stats: {
                        text_percent_lunarcharged: C4LunarChargedHpScale,
                        text_percent_lunarbloom: C4LunarBloomHpScale,
                        text_percent_lunarcrystallize: C4LunarCrystallizeHpScale,
                    },
                }),
                // C4 elevation is automatic (not tied to the C4 flat toggle):
                // "All nearby party members' Lunar Reaction DMG is elevated
                // by 1.5%."
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        'dmg_lunar_special': C4Elevation,
                    },
                }),
            ],
        },
        // C5: Burst +3 (setting moved to conditions array for proper ordering)
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.columbina_silence_tending_one_lone_song',
                    description: 'talent_descr.char_constellation_burst',
                    stats: {
                        'dmg_lunar_special': C5Elevation,
                    },
                    receivers: RECEIVERS.TEAM,
                }),
            ],
        },
        // C6: Through Darkness Led by Moonlight
        // (Game data: ModifyDamageMixin bonusCriticalHurt 0.8 by element is
        // flat, no stat read. Flat conditions are premod, so no params.)
        {
            conditions: [
                new ConditionDropdownColumbina({
                    name: 'columbina_c6_crit',
                    serializeId: 4,
                    multiple: true,
                    hideEmpty: true,
                    hideInactive: true,
                    dropdownClass: 'select-element-multiple',
                    title: 'talent_name.columbina_through_darkness_led_by_moonlight',
                    description: 'talent_descr.columbina_through_darkness_led_by_moonlight',
                    values: [
                        { value: 'hydro', serializeId: 1 },
                        { value: 'electro', serializeId: 2 },
                        { value: 'dendro', serializeId: 3 },
                        { value: 'geo', serializeId: 4 },
                    ],
                }),
                // C6 elevation is automatic at C6 (not tied to the CRIT
                // selection): "All nearby party members' Lunar Reaction DMG
                // is elevated by 7%."
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        'dmg_lunar_special': C6Elevation,
                    },
                }),
                ...['hydro', 'electro', 'dendro', 'geo'].map((elem) => {
                    return new Condition({
                        receivers: RECEIVERS.TEAM,
                        stats: {
                            ['crit_dmg_' + elem]: C6CritDmg,
                        },
                        condition: new ConditionBooleanDropdownValue({name: 'columbina_c6_crit', value: elem}),
                    });
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'number'], [3, 'checkbox'], [4, 'dropdown'], [5, 'number'], [6, 'dropdown']],
});
