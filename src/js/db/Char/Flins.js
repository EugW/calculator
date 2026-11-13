import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionStaticLevel } from "../../classes/Condition/Static/Level";
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
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureReactionLunarChargedLike } from "../../classes/Feature2/Reaction/Transformative/Lunar/ChargedLike";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Flins.s1_id,
        title: 'talent_name.flins_pocztowy_demonspear',
        description: 'talent_descr.flins_pocztowy_demonspear',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Flins.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Flins.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Flins.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Flins.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Flins.s1.p5),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Flins.s1.p6),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Flins.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Flins.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Flins.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Flins.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Flins.s2_id,
        title: 'talent_name.flins_arcane_light',
        description: 'talent_descr.flins_arcane_light',
        items: [
            {
                table: new StatTable('flins_manifest_hit_1', charTalentTables.Flins.s2.p1),
            },
            {
                table: new StatTable('flins_manifest_hit_2', charTalentTables.Flins.s2.p2),
            },
            {
                table: new StatTable('flins_manifest_hit_3', charTalentTables.Flins.s2.p3),
            },
            {
                table: new StatTable('flins_manifest_hit_4', charTalentTables.Flins.s2.p4),
            },
            {
                table: new StatTable('flins_manifest_hit_5', charTalentTables.Flins.s2.p5),
            },
            {
                table: new StatTable('flins_manifest_charged', charTalentTables.Flins.s2.p6),
            },
            {
                table: new StatTable('flins_northland_spearstorm_dmg', charTalentTables.Flins.s2.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('flins_spearstorm_cd', charTalentTables.Flins.s2.p8),
            },
            {
                unit: 'sec',
                table: new StatTable('flins_manifest_duration', charTalentTables.Flins.s2.p9),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Flins.s2.p10),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Flins.s3_id,
        title: 'talent_name.flins_cometh_the_night',
        description: 'talent_descr.flins_cometh_the_night',
        items: [
            {
                table: new StatTable('flins_initial_dmg', charTalentTables.Flins.s3.p1),
            },
            {
                table: new StatTable('flins_middle_phase_dmg', charTalentTables.Flins.s3.p2),
            },
            {
                table: new StatTable('flins_final_phase_dmg', charTalentTables.Flins.s3.p3),
            },
            {
                table: new StatTable('flins_thunderous_symphony_dmg', charTalentTables.Flins.s3.p6),
            },
            {
                table: new StatTable('flins_thunderous_additional_dmg', charTalentTables.Flins.s3.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Flins.s3.p5),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Flins.s3.p4),
            },
        ],
    },
});

// Passive scaling constants
const PassiveLunarScale = percent(charTalentTables.Flins.a0.p1);
const PassiveLunarScaleCap = percent(charTalentTables.Flins.a0.p2);
const A1LunarChargedDmg = percent(charTalentTables.Flins.a1.p1);
const A4EmScale = percent(charTalentTables.Flins.a4.p1);
const A4EmCap = charTalentTables.Flins.a4.p2;

// Constellation constants
const C2AtkScale = percent(charTalentTables.Flins.c2.p1);
const C2ResShred = percent(charTalentTables.Flins.c2.p3);
const C4AtkBonus = percent(charTalentTables.Flins.c4.p1);
const C4EmScale = percent(charTalentTables.Flins.c4.p2);
const C4EmCap = charTalentTables.Flins.c4.p3;
const C6LunarChargedElevate = percent(charTalentTables.Flins.c6.p1);
const C6PartyElevate = percent(charTalentTables.Flins.c6.p2);

// Lunar-Charged base bonus post effect based on ATK. Delivered to the whole
// team from the source's live ATK (old priority kept). Moonsign Benedictions
// of different members stack, so no stack key.
// Game data: Avatar_Flins_PermanentSkill_3 sets the reaction base-damage ratio
// with SetNewElementReactionBaseDamageRatioParam (AttackTransferRatio x 0.01,
// cap MaxTransRatio), which names no premod/total read. The same call reads
// the total ATK in game (Ineffa's Benediction, in-game test: md/buff_chains.md):
// extra ATK (Bennett's burst) counts, as in GO (input.total.atk).
const lunarChargedPost = new PostEffectStatsAtk({
    receivers: RECEIVERS.TEAM,
    reads: CHANNELS.TOTAL,
    percent: new StatTable('lunarcharged_multi', [PassiveLunarScale / 100]),
    statCap: new ValueTable([PassiveLunarScaleCap]),
});

// A4 EM from ATK post effect (disabled at C4 where it's replaced by enhanced version)
// Game data: Avatar_Flins_PermanentSkill_2 computes FIGHT_PROP_NONEXTRA_ATTACK
// (premod) x Ratio (8%, cap MaxMastery 160; ProudSkill 1202201, GO:
// prod(percent, input.premod.atk) into total eleMas) into
// Actor_ElemMasteryExtraDelta (extra), so the default premod read and extra
// write are confirmed.
const a4EmPost = new PostEffectStatsAtk({
    percent: new StatTable('mastery', [A4EmScale / 100]),
    statCap: new ValueTable([A4EmCap]),
    condition: new ConditionAnd([
        new ConditionAscensionChar({ascension: 4}),
        new ConditionNot([new ConditionConstellation({constellation: 4})]),
    ]),
});

// C4 enhanced EM from ATK post effect (replaces A4 passive)
// Game data: same Avatar_Flins_PermanentSkill_2 modifier, C4 branch
// (FIGHT_PROP_NONEXTRA_ATTACK x Ratio2 10%, cap MaxMastery2 220 from talent
// Flins_Constellation_4 paramList [0.2, 0.1, 220]) into
// Actor_ElemMasteryExtraDelta, so the default premod read and extra write
// are confirmed.
const c4EmPost = new PostEffectStatsAtk({
    percent: new StatTable('mastery', [C4EmScale / 100]),
    statCap: new ValueTable([C4EmCap]),
    condition: new ConditionConstellation({constellation: 4}),
});

export const Flins = new DbObjectChar({
    name: 'flins',
    serializeId: 111,
    gameId: 10000120,
    iconClass: 'char-icon-flins',
    rarity: 5,
    element: 'electro',
    weapon: 'polearm',
    origin: 'nodkrai',
    talents: Talents,
    statTable: charTables.Flins,
    // Talent damage hits read the total ATK: the game computes them from
    // FIGHT_PROP_CUR_ATTACK (e.g. Avatar_Flins_Talent_MoonShockAttack
    // Timer_Talent2: Talent_Damage x FIGHT_PROP_CUR_ATTACK). Damage
    // multipliers need nothing. lunarcharged_multi below is a reaction base
    // bonus with no extra lane, so its scaling is total by construction.
    features: [
        // Normal attacks
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
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
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
        // Manifest Flame attacks
        new FeatureDamageSkill({
            name: 'flins_manifest_hit_1',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_hit_1'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_manifest_hit_2',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_hit_2'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_manifest_hit_3',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_hit_3'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_manifest_hit_4',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_hit_4'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_manifest_hit_5',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_hit_5'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_manifest_charged',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_manifest_charged'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'flins_northland_spearstorm_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.flins_northland_spearstorm_dmg'),
                }),
            ],
        }),
        // Burst
        new FeatureDamageBurst({
            name: 'flins_initial_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.flins_initial_dmg'),
                }),
            ],
        }),
        // Middle Phase - Lunar-Charged DMG (NOT affected by Electro DMG% or Burst DMG%)
        new FeatureReactionLunarChargedLike({
            name: 'flins_middle_phase_dmg',
            element: 'electro',
            category: 'burst',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: Talents.get('burst.flins_middle_phase_dmg'),
                }),
            ],
        }),
        // Final Phase - Lunar-Charged DMG (NOT affected by Electro DMG% or Burst DMG%)
        new FeatureReactionLunarChargedLike({
            name: 'flins_final_phase_dmg',
            element: 'electro',
            category: 'burst',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: Talents.get('burst.flins_final_phase_dmg'),
                }),
            ],
        }),
        // Thunderous Symphony - Also Lunar-Charged DMG (transformed burst)
        new FeatureReactionLunarChargedLike({
            name: 'flins_thunderous_symphony_dmg',
            element: 'electro',
            category: 'burst',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: Talents.get('burst.flins_thunderous_symphony_dmg'),
                }),
            ],
        }),
        // Thunderous Symphony Additional - Also Lunar-Charged DMG
        new FeatureReactionLunarChargedLike({
            name: 'flins_thunderous_additional_dmg',
            element: 'electro',
            category: 'burst',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: Talents.get('burst.flins_thunderous_additional_dmg'),
                }),
            ],
        }),
        // C2 Lunar-Charged damage after Spearstorm: 50% of Flins's ATK
        // (talent Flins_Constellation_2 paramList[0]; game scales Talent_Damage
        // x FIGHT_PROP_CUR_ATTACK, total), so a plain damage hit needs nothing.
        new FeatureReactionLunarChargedLike({
            element: 'electro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation2',
                    scalingMultiplier: 'lunarcharged_multi',
                    scalingSource: 'lunarcharged_multi',
                    values: new StatTable('flins_c2_lunar_dmg', [C2AtkScale]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 2}),
        }),
        // Displays of lunarChargedPost / a4EmPost / c4EmPost; they follow
        // their post-effects' channels, need nothing.
        new FeaturePostEffectValue({
            category: 'other',
            name: 'flins_lunar_bonus',
            postEffect: lunarChargedPost,
            format: 'percent',
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'flins_em_from_atk',
            postEffect: a4EmPost,
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                new ConditionNot([new ConditionConstellation({constellation: 4})]),
            ]),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'flins_em_from_atk',
            postEffect: c4EmPost,
            condition: new ConditionConstellation({constellation: 4}),
        }),
    ],
    conditions: [
        // Flins unlocks Lunar-Charged for the whole team (merged with the old
        // partyData copy).
        new Condition({
            receivers: RECEIVERS.TEAM,
            settings: {
                allowed_lunarcharged: 1,
            },
        }),
        // Moonsign level comes from the real team; every Moonsign member
        // delivers the same values, so this needs no stack key.
        new ConditionCalcMoonsign({receivers: RECEIVERS.TEAM}),
        new ConditionBooleanLevels({
            name: 'flins_symphony_of_winter',
            serializeId: 1,
            title: 'talent_name.flins_symphony_of_winter',
            description: 'talent_descr.flins_symphony_of_winter',
            // A1: game writes the flat Ratio (20%, ProudSkill 1202101) into
            // Actor_ElemReactMoonShockDelta (Flins_PermanentSkill_1_Buff; no
            // stat read, no extra lane), and the energy restore is a flat
            // ReviveElemEnergy: flat conditions (premod) need nothing.
            info: {ascension: 1},
            levelSetting: 'party_moonsign',
            stats: [
                new StatTable('dmg_reaction_lunarcharged', [0, A1LunarChargedDmg]),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.flins_whispering_flame',
            description: 'talent_descr.flins_whispering_flame',
            info: {ascension: 4},
            stats: {
                text_percent: A4EmScale,
                text_max: A4EmCap,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionStatic({
            title: 'talent_name.flins_old_world_secrets',
            description: 'talent_descr.flins_old_world_secrets',
            stats: {
                text_percent: PassiveLunarScale,
                text_percent_max: PassiveLunarScaleCap,
            },
        }),
    ],
    postEffects: [
        lunarChargedPost,
        a4EmPost,
        c4EmPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.flins_part_the_veil_of_snow',
                    description: 'talent_descr.flins_part_the_veil_of_snow',
                }),
            ],
        },
        {
            conditions: [
                // C2: game writes the flat ElecDown into Actor_ElecSubHurtDelta
                // (enemy RES, UNIQUE_Avatar_Flins_Talent2_ElecDown) and deals
                // the flat Talent_Damage hit above: no stat read, flat
                // conditions (premod) need nothing.
                new ConditionBooleanLevels({
                    name: 'flins_the_devils_wall',
                    serializeId: 2,
                    title: 'talent_name.flins_the_devils_wall',
                    description: 'talent_descr.flins_the_devils_wall',
                    levelSetting: 'party_moonsign',
                    stats: [
                        new StatTable('text_percent_dmg', [C2AtkScale, C2AtkScale]),
                        new StatTable('enemy_res_electro', [0, -C2ResShred]),
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
                // C4: game writes the flat AttackUp (20%, talent
                // Flins_Constellation_4 paramList[0]) into Actor_AttackRatio
                // (Avatar_Flins_Constellation_4_Property), a premod write;
                // flat conditions are always premod, so this needs nothing.
                new ConditionStatic({
                    title: 'talent_name.flins_night_on_bald_mountain',
                    description: 'talent_descr.flins_night_on_bald_mountain',
                    stats: {
                        atk_percent: C4AtkBonus,
                        text_percent: C4EmScale,
                        text_max: C4EmCap,
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
                // C6: game writes the flat Ratio / Team_Ratio (35% / 10%,
                // talent Flins_Constellation_6) into
                // Actor_ElemReactMoonShockEffectFactor (no stat read, no extra
                // lane): flat conditions (premod) need nothing.
                // C6 elevates Flins's own Lunar-Charged DMG by 35%.
                new ConditionBoolean({
                    name: 'flins_songs_and_dances_of_death',
                    serializeId: 4,
                    title: 'talent_name.flins_songs_and_dances_of_death',
                    description: 'talent_descr.flins_songs_and_dances_of_death',
                    stats: {
                        'dmg_lunarcharged_special': C6LunarChargedElevate,
                    },
                }),
                // At Ascendant Gleam all other nearby party members'
                // Lunar-Charged DMG is elevated by 10%. Flins keeps his own
                // copy above, so the delivery excludes the source.
                new ConditionStaticLevel({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    levelSetting: 'party_moonsign',
                    stats: [
                        new StatTable('dmg_lunarcharged_special', [0, C6PartyElevate]),
                    ],
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'flins_songs_and_dances_of_death'}),
                        new ConditionConstellation({constellation: 6}),
                    ]),
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox']],
});
