import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionLevels } from "../../classes/Condition/Levels";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureReactionLunarBloomLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/BloomLike";
import { PostEffectStatsMastery } from "../../classes/PostEffect/Stats/Mastery";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTableAscensionScale } from "../../classes/StatTable/Ascension/Scale";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Lauma.s1_id,
        title: 'talent_name.lauma_peregrination_of_linnunrata',
        description: 'talent_descr.lauma_peregrination_of_linnunrata',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Lauma.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Lauma.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Lauma.s1.p3),
            },
            {
                table: new StatTable('lauma_spiritcall_prayer_dmg', charTalentTables.Lauma.s1.p9),
            },
            {
                table: new StatTable('plunge', charTalentTables.Lauma.s1.p10),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Lauma.s1.p11),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Lauma.s1.p12),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Lauma.s2_id,
        title: 'talent_name.lauma_dawnless_rest_of_karsikko',
        description: 'talent_descr.lauma_dawnless_rest_of_karsikko',
        items: [
            {
                table: new StatTable('lauma_press_dmg', charTalentTables.Lauma.s2.p1),
            },
            {
                table: new StatTable('lauma_hold_1_dmg', charTalentTables.Lauma.s2.p2),
            },
            {
                table: new StatTable('lauma_hold_2_dmg', charTalentTables.Lauma.s2.p3),
            },
            {
                table: new StatTable('lauma_sanctuary_dmg', charTalentTables.Lauma.s2.p4),
            },
            {
                table: new StatTable('lauma_sanctuary_enhanced_dmg', charTalentTables.Lauma.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('lauma_sanctuary_duration', charTalentTables.Lauma.s2.p6),
            },
            {
                unit: 'percent',
                table: new StatTable('lauma_res_decrease', charTalentTables.Lauma.s2.p8),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Lauma.s2.p10),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Lauma.s3_id,
        title: 'talent_name.lauma_all_hearts_become_the_beating_moon',
        description: 'talent_descr.lauma_all_hearts_become_the_beating_moon',
        items: [
            {
                unit: '',
                table: new StatTable('lauma_pale_hymn_stacks', charTalentTables.Lauma.s3.p1),
            },
            {
                table: new StatTable('lauma_bloom_dmg_increase', charTalentTables.Lauma.s3.p3),
            },
            {
                table: new StatTable('lauma_lunarbloom_dmg_increase', charTalentTables.Lauma.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('lauma_pale_hymn_duration', charTalentTables.Lauma.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Lauma.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Lauma.s3.p7),
            },
        ],
    },
});

// Passive scaling constants
const PassiveLunarScale = percent(charTalentTables.Lauma.a0.p1);
const PassiveLunarScaleCap = percent(charTalentTables.Lauma.a0.p2);
const A1BloomCritRate = percent(charTalentTables.Lauma.a1.p1);
const A1BloomCritDmg = percent(charTalentTables.Lauma.a1.p2);
const A1LunarBloomCritRate = percent(charTalentTables.Lauma.a1.p3);
const A1LunarBloomCritDmg = percent(charTalentTables.Lauma.a1.p4);
const A4SkillDmgScale = percent(charTalentTables.Lauma.a4.p1);
const A4SkillDmgCap = percent(charTalentTables.Lauma.a4.p2);

// Skill constants
const MaxVerdantDew = 3;

// Constellation constants
const C1HealScale = percent(charTalentTables.Lauma.c1.p2);
const C2BloomEmScale = percent(charTalentTables.Lauma.c2.p1);
const C2LunarBloomEmScale = percent(charTalentTables.Lauma.c2.p2);
const C2LunarBloomDmg = percent(charTalentTables.Lauma.c2.p3);
const C6SanctuaryEmScale = percent(charTalentTables.Lauma.c6.p1);
const C6NormalEmScale = percent(charTalentTables.Lauma.c6.p5);
const C6LunarBloomElevate = percent(charTalentTables.Lauma.c6.p6);

// Lunar-Bloom base bonus post effect (scales from EM). Delivered to the
// whole team from the source's live Mastery (old priority kept). Moonsign
// Benedictions of different members stack, so no stack key.
// Game data: Avatar_Lauma_PermanentSkill_3 sets it with
// SetNewElementReactionBaseDamageRatioParam (propType Mastery): the engine
// resolves the stat itself with no NONEXTRA/CUR marker. The same call reads
// the total stat in game (Ineffa's Benediction, in-game test: md/buff_chains.md),
// so extra EM (Nahida's A1, Sucrose's A4) counts, as in GO
// (input.total.eleMas).
const lunarBloomPost = new PostEffectStatsMastery({
    receivers: RECEIVERS.TEAM,
    reads: CHANNELS.TOTAL,
    percent: new StatTable('lunarbloom_multi', [PassiveLunarScale]),
    statCap: new ValueTable([PassiveLunarScaleCap]),
});

// A4 Skill damage bonus based on EM.
// Game data: Avatar_Lauma_PermanentSkill_2 computes
// Ratio_PerMastery * FIGHT_PROP_ELEMENT_MASTERY (total) into
// _ABILITY_Lauma_PermanentSkill_2_DeerAttack_Buff, applied by a
// ModifyDamageMixin on Elemental_Art. GO reads input.total.eleMas.
const a4SkillDmgPost = new PostEffectStatsMastery({
    reads: CHANNELS.TOTAL,
    percent: new StatTable('dmg_skill', [A4SkillDmgScale]),
    statCap: new ValueTable([A4SkillDmgCap]),
    condition: new ConditionAscensionChar({ascension: 4}),
});

/**
 * Moonsign: Ascendant Gleam, in the source's settings: the gate of C2's and
 * C6's party bonuses. The old model applied both without it; the recorded
 * baseline checks force it open to reproduce that recording.
 */
export const laumaAscendantGleam = new ConditionBooleanValue({
    setting: 'party_moonsign',
    cond: 'ge',
    value: 2,
});

export const Lauma = new DbObjectChar({
    name: 'lauma',
    serializeId: 110,
    gameId: 10000119,
    iconClass: 'char-icon-lauma',
    rarity: 5,
    element: 'dendro',
    weapon: 'catalyst',
    origin: 'nodkrai',
    talents: Talents,
    statTable: [
        ...charTables.Lauma,
        new StatTableAscensionScale({
            stat: 'mastery_base',
            base: 200,
        }),
    ],
    features: [
        new FeatureDamageNormal({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'lauma_spiritcall_prayer_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.lauma_spiritcall_prayer_dmg'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'lauma_press_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lauma_press_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'lauma_hold_1_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lauma_hold_1_dmg'),
                }),
            ],
        }),
        // Hold-2 Lunar-Bloom hit. Game data:
        // Avatar_Lauma_ElementalArt_DeerAttack_Damage and
        // Avatar_Lauma_ElementalArt_Hold_Strike scale EM through
        // FIGHT_PROP_ELEMENT_MASTERY (total); hits read the total, so no params.
        new FeatureReactionLunarBloomLike({
            name: 'lauma_hold_2_dmg',
            element: 'dendro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    stacksLeveling: 'lauma_verdant_dew_consumed',
                    maxStacks: MaxVerdantDew,
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: Talents.get('skill.lauma_hold_2_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'lauma_sanctuary_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lauma_sanctuary_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'lauma_sanctuary_enhanced_dmg',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lauma_sanctuary_enhanced_dmg'),
                }),
            ],
        }),
        // C6 Sanctuary Lunar-Bloom damage.
        // Game data: Avatar_Lauma_ElementalArt_Constellation_6_Strike scales
        // Constellation_6_Attack * FIGHT_PROP_ELEMENT_MASTERY (total), and
        // UNIQUE_Avatar_Lauma_Constellation_6_SelfDeerAttackBuff adds
        // ElementalBurst_DamageExtra_MoonOvergrow * FIGHT_PROP_ELEMENT_MASTERY
        // (total). scaling: 'mastery*' is already total, so no params.
        new FeatureReactionLunarBloomLike({
            element: 'dendro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation6',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: new StatTable('lauma_c6_sanctuary_dmg', [C6SanctuaryEmScale]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
        // C6 Normal Attack Lunar-Bloom damage.
        // Game data: Avatar_Lauma_Attack01/02/03_Constellation_6 scale
        // Attack0N_Constellation_6_Damage * FIGHT_PROP_ELEMENT_MASTERY
        // (total). scaling: 'mastery*' is already total, so no params.
        new FeatureReactionLunarBloomLike({
            element: 'dendro',
            category: 'attack',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation6',
                    scalingMultiplier: 'lunarbloom_multi',
                    scalingSource: 'lunarbloom_multi',
                    values: new StatTable('lauma_c6_normal_dmg', [C6NormalEmScale]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'lauma_lunarbloom_bonus',
            postEffect: lunarBloomPost,
            format: 'percent',
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'lauma_skill_em_bonus',
            postEffect: a4SkillDmgPost,
            format: 'percent',
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    conditions: [
        // Lauma unlocks Lunar-Bloom for the whole team (merged with the old
        // partyData copy).
        new Condition({
            receivers: RECEIVERS.TEAM,
            settings: {
                allowed_lunarbloom: 1,
            },
        }),
        // Moonsign level comes from the real team; every Moonsign member
        // delivers the same values, so this needs no stack key.
        new ConditionCalcMoonsign({receivers: RECEIVERS.TEAM}),
        // C5: Skill level +3 (must be in main conditions for ConditionLevels to see it)
        new Condition({
            settings: {
                char_skill_elemental_bonus: 3,
            },
            subConditions: [
                new ConditionConstellation({constellation: 5}),
            ],
        }),
        // A1: Bloom-family CRIT at Nascent Gleam, Lunar-Bloom CRIT at
        // Ascendant Gleam, for all nearby party members (TEAM). The tiers
        // come from the source's live Moonsign; tiers do not stack.
        new ConditionBooleanLevels({
            name: 'lauma_light_for_the_frosty_night',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.lauma_light_for_the_frosty_night',
            description: 'talent_descr.lauma_light_for_the_frosty_night',
            info: {ascension: 1},
            levelSetting: 'party_moonsign',
            stats: [
                new StatTable('crit_rate_bloom', [A1BloomCritRate, 0]),
                new StatTable('crit_dmg_bloom', [A1BloomCritDmg, 0]),
                new StatTable('crit_rate_lunarbloom', [0, A1LunarBloomCritRate]),
                new StatTable('crit_dmg_lunarbloom', [0, A1LunarBloomCritDmg]),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.lauma_cleansing_for_the_spring',
            description: 'talent_descr.lauma_cleansing_for_the_spring',
            info: {ascension: 4},
            stats: {
                text_percent: A4SkillDmgScale,
                text_percent_max: A4SkillDmgCap,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionStatic({
            title: 'talent_name.lauma_natures_chorus',
            description: 'talent_descr.lauma_natures_chorus',
            stats: {
                text_percent: PassiveLunarScale * 100,
                text_percent_max: PassiveLunarScaleCap,
            },
        }),
        new ConditionBoolean({
            name: 'lauma_res_shred',
            serializeId: 3,
            title: 'talent_name.lauma_dawnless_rest_of_karsikko',
            description: 'talent_descr.lauma_dawnless_rest_of_karsikko',
            rotation: 'self',
        }),
        // Skill RES shred (Sanctuary debuff on enemies). The enemy is shared,
        // so the source's live skill level (with her own C5 bonus) delivers
        // the shred to every member's program; the old typed party copies
        // are retired below.
        new ConditionLevels({
            receivers: RECEIVERS.TEAM,
            levelSetting: 'char_skill_elemental',
            stats: [
                Talents.getMulti({
                    name: 'enemy_res_dendro',
                    from: 'skill.lauma_res_decrease',
                    multi: -1,
                }),
                Talents.getMulti({
                    name: 'enemy_res_hydro',
                    from: 'skill.lauma_res_decrease',
                    multi: -1,
                }),
            ],
            subConditions: [
                new ConditionBoolean({name: 'lauma_res_shred'}),
            ],
        }),
        new ConditionNumber({
            name: 'lauma_verdant_dew_consumed',
            serializeId: 6,
            title: 'talent_name.n11190008',
            description: 'talent_descr.n11190008',
            max: MaxVerdantDew,
            default: MaxVerdantDew,
        }),
        // Burst: Pale Hymn self-buff toggle
        new ConditionBoolean({
            name: 'lauma_pale_hymn',
            serializeId: 7,
            title: 'talent_name.n11190003',
            description: 'talent_descr.n11190003',
            rotation: 'self',
        }),
    ],
    postEffects: [
        lunarBloomPost,
        a4SkillDmgPost,
    ],
    multipliers: [
        // Pale Hymn self-buff: Bloom/Hyperbloom/Burgeon DMG Increase.
        // Reaches all nearby party members from the source's live Mastery
        // and burst level (merged with the old typed party copies).
        // Game data: UNIQUE_Avatar_Lauma_ElementalBurst_Buff(_2/_3) add
        // ElementalBurst_DamageExtra * FIGHT_PROP_ELEMENT_MASTERY (total) to
        // OverGrow-family tags. scaling: 'mastery*' is already total, so no
        // params. GO reads input.total.eleMas.
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'mastery*',
            leveling: 'char_skill_burst',
            source: 'lauma_pale_hymn',
            values: Talents.get('burst.lauma_bloom_dmg_increase'),
            condition: new ConditionBoolean({name: 'lauma_pale_hymn'}),
            target: new FeatureMultiplierTarget({
                tags: ['bloom_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        // Pale Hymn self-buff: Lunar-Bloom DMG Increase.
        // Game data: same burst buffs add ElementalBurst_DamageExtra_MoonOvergrow
        // * FIGHT_PROP_ELEMENT_MASTERY (total) to the MoonOvergrowDamage tag.
        // scaling: 'mastery*' is already total, so no params.
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'mastery*',
            leveling: 'char_skill_burst',
            source: 'lauma_pale_hymn',
            values: Talents.get('burst.lauma_lunarbloom_dmg_increase'),
            condition: new ConditionBoolean({name: 'lauma_pale_hymn'}),
            target: new FeatureMultiplierTarget({
                tags: ['lunarbloom_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        // C2 Pale Hymn: Additional Bloom/Hyperbloom/Burgeon DMG Increase (+500% EM).
        // Game data: with Lauma_Constellation_2 the burst buffs switch
        // ElementalBurst_DamageExtra(_MoonOvergrow) from _Normal to
        // _Normal + _Extra (C2's paramList ratio), through the same
        // FIGHT_PROP_ELEMENT_MASTERY (total) mixin. scaling: 'mastery*' is
        // already total, so no params.
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'mastery*',
            source: 'constellation2',
            values: new StatTable('lauma_c2_bloom_dmg_increase', [C2BloomEmScale]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'lauma_pale_hymn'}),
                new ConditionConstellation({constellation: 2}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['bloom_reaction'],
                options: ['reaction_flat'],
            }),
        }),
        // C2 Pale Hymn: Additional Lunar-Bloom DMG Increase (+400% EM).
        // Game data: same C2-switched mixin on the MoonOvergrowDamage tag
        // (total EM). scaling: 'mastery*' is already total, so no params.
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'mastery*',
            source: 'constellation2',
            values: new StatTable('lauma_c2_lunarbloom_dmg_increase', [C2LunarBloomEmScale]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'lauma_pale_hymn'}),
                new ConditionConstellation({constellation: 2}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['lunarbloom_reaction'],
                options: ['reaction_flat'],
            }),
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.lauma_o_lips_weave_me_songs_and_psalms',
                    description: 'talent_descr.lauma_o_lips_weave_me_songs_and_psalms',
                    stats: {
                        text_percent_heal: C1HealScale,
                    },
                }),
            ],
        },
        {
            conditions: [
                // C2: Pale Hymn also grants all nearby members +500%/+400% EM
                // reaction DMG (via the multipliers above). "Moonsign:
                // Ascendant Gleam: All nearby party members' Lunar-Bloom DMG is
                // increased by 40%." The gate is on the delivery, so the saved
                // control is kept in any team.
                new ConditionBoolean({
                    name: 'lauma_twine_warnings_and_tales_from_the_north',
                    serializeId: 4,
                    title: 'talent_name.lauma_twine_warnings_and_tales_from_the_north',
                    description: 'talent_descr.lauma_twine_warnings_and_tales_from_the_north',
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        'dmg_reaction_lunarbloom': C2LunarBloomDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'lauma_twine_warnings_and_tales_from_the_north'}),
                        laumaAscendantGleam,
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
                new ConditionStatic({
                    title: 'talent_name.lauma_nor_yearn_for_the_great_bears_might',
                    description: 'talent_descr.lauma_nor_yearn_for_the_great_bears_might',
                }),
            ],
        },
        {},
        {
            conditions: [
                // C6: "Moonsign: Ascendant Gleam: All nearby party members'
                // Lunar-Bloom DMG is elevated by 25%." Gated on the delivery,
                // like C2.
                new ConditionBoolean({
                    name: 'lauma_i_offer_blood_and_tears_to_the_moonlight',
                    serializeId: 5,
                    title: 'talent_name.lauma_i_offer_blood_and_tears_to_the_moonlight',
                    description: 'talent_descr.lauma_i_offer_blood_and_tears_to_the_moonlight',
                    stats: {
                        text_percent_dmg: C6SanctuaryEmScale,
                        text_percent_dmg_2: C6NormalEmScale,
                    },
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        'dmg_lunarbloom_special': C6LunarBloomElevate,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'lauma_i_offer_blood_and_tears_to_the_moonlight'}),
                        laumaAscendantGleam,
                    ]),
                }),
            ],
        },
    ]),
    retiredParty: [
        [1, 'number'], [2, 'checkbox'], [4, 'checkbox'], [5, 'checkbox'],
        [6, 'checkbox'], [7, 'number'], [8, 'checkbox'], [9, 'number'],
        [10, 'checkbox'], [11, 'checkbox'],
    ],
});
