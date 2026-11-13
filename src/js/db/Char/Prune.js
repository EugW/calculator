import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdown } from "../../classes/Condition/Dropdown";
import { ConditionDropdownElement } from "../../classes/Condition/Dropdown/Element";
import { ConditionDropdownTeamMember } from "../../classes/Condition/Dropdown/TeamMember";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionSelectedReceiver } from "../../classes/Condition/SelectedReceiver";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionWitchHomework } from "../../classes/Condition/WitchHomework";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamage } from "../../classes/Feature2/Damage";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageBurstPeriodic } from "../../classes/Feature2/Damage/Burst/Periodic";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Prune.s1_id,
        title: 'talent_name.prune_badaboom_hexbuster_hammer',
        description: 'talent_descr.prune_badaboom_hexbuster_hammer',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Prune.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Prune.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Prune.s1.p3),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Prune.s1.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Prune.s1.p5),
            },
            {
                table: new StatTable('plunge', charTalentTables.Prune.s1.p6),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Prune.s1.p7),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Prune.s1.p8),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Prune.s2_id,
        title: 'talent_name.prune_ring_a_ding_ding_hexhunter_chime',
        description: 'talent_descr.prune_ring_a_ding_ding_hexhunter_chime',
        items: [
            {
                table: new StatTable('prune_skill_1_hit_dmg', charTalentTables.Prune.s2.p1),
            },
            {
                table: new StatTable('prune_skill_2_hit_dmg', charTalentTables.Prune.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Prune.s2.p3),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Prune.s3_id,
        title: 'talent_name.prune_the_bell_tolls_the_hunt_is_on',
        description: 'talent_descr.prune_the_bell_tolls_the_hunt_is_on',
        items: [
            {
                table: new StatTable('prune_burst_dmg', charTalentTables.Prune.s3.p1),
            },
            {
                table: new StatTable('prune_witchlure_bell_dmg', charTalentTables.Prune.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('prune_hunter_seeker_mode_duration', charTalentTables.Prune.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Prune.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Prune.s3.p5),
            },
        ],
    },
});

const A1BanehunterOathhammerDmg = percent(charTalentTables.Prune.a1.p1);
const A4TollingRallyScale = percent(charTalentTables.Prune.a4.p1);
const A4TollingRallyCap = percent(charTalentTables.Prune.a4.p3);
const A4TollingRallyAtkThreshold = charTalentTables.Prune.a4.p4;
const WitchPruneAtkBonus = percent(charTalentTables.Prune.sp.p1);
const WitchSwirlAtkBonus = percent(charTalentTables.Prune.sp.p3);
const C2HuntTheWitchAtkBonus = percent(charTalentTables.Prune.c2.p1);
const C2HuntTheWitchStackBonus = percent(charTalentTables.Prune.c2.p2);
const C2HuntTheWitchMaxStacks = 6;
const C4RicochetDmg = percent(charTalentTables.Prune.c4.p1);
const C6AtkBonus = charTalentTables.Prune.c6.p2;

const condWitchHomework = new ConditionBoolean({name: 'prune_witch_homework'});
const condHexereiResonance = new ConditionHexereiResonance({});
const condTollingRally = new ConditionBoolean({name: 'prune_tolling_synchronicity'});

// A4 Tolling Rally: other nearby members' DMG increased from Prune's ATK
// excess over 2000 (up to 50%). Lasting per-character effect, no active-follow.
// Game data: UNIQUE_Prune_PermanentSkill_2_Handler computes _ABILITY_Prune_AddRatio
// with SetOverrideMapValue [DamageAddRatio, FIGHT_PROP_NONEXTRA_ATTACK, ...]
// (premod ATK), applied by UNIQUE_Prune_PermanentSkill_2_Buff as a
// ModifyDamageMixin hit bonus (no Actor channel; dmg_all has no extra lane).
// GO reads input.premod.atk. Default channels confirmed: premod read, so
// premod ATK writers (Columbina C2, her own C2/C6) count and extra ATK
// (Bennett's burst) does not; see test/buffChainsPrune.test.js.
const tollingRallyPost = new PostEffectStatsAtk({
    receivers: RECEIVERS.OTHERS,
    percent: new StatTable('dmg_all', [A4TollingRallyScale]),
    exceed: A4TollingRallyAtkThreshold,
    statCap: new ValueTable([A4TollingRallyCap]),
    conditions: [
        new ConditionAscensionChar({ascension: 4}),
        condTollingRally,
    ],
});

export const Prune = new DbObjectChar({
    name: 'prune',
    serializeId: 122,
    gameId: 10000132,
    iconClass: 'char-icon-prune',
    rarity: 4,
    element: 'anemo',
    weapon: 'catalyst',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Prune,
    // Every damage hit below (normals, skill, burst, A1 Banehunter Oathhammer
    // at 150% of ATK, C4 ricochet at 80% of ATK) scales on ATK and reads the
    // total: talent hits read FIGHT_PROP_CUR_ATTACK in the game, and GO reads
    // input.total.atk for the A1/C4 hits. atk* is already total, so nothing
    // is declared. C1 energy and C3/C5 talent levels read no stat.
    features: [
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_low',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'prune_skill_1_hit_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.prune_skill_1_hit_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'prune_skill_2_hit_dmg',
            elementSetting: 'prune_banehunter_oathhammer_element_str',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.prune_skill_2_hit_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'prune_burst_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.prune_burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurstPeriodic({
            name: 'prune_witchlure_bell_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.prune_witchlure_bell_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'prune_banehunter_oathhammer',
            elementSetting: 'prune_banehunter_oathhammer_element_str',
            condition: new ConditionAscensionChar({ascension: 1}),
            multipliers: [
                new FeatureMultiplier({
                    source: 'ascension1',
                    values: new StatTable('prune_banehunter_oathhammer', [A1BanehunterOathhammerDmg]),
                }),
            ],
        }),
        new FeatureDamage({
            category: 'other',
            name: 'prune_banehunter_ricochet',
            elementSetting: 'prune_banehunter_oathhammer_element_str',
            condition: new ConditionConstellation({constellation: 4}),
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new StatTable('prune_banehunter_ricochet', [C4RicochetDmg]),
                }),
            ],
        }),
    ],
    conditions: [
        new ConditionDropdownElement({
            name: 'prune_banehunter_oathhammer_element',
            serializeId: 1,
            title: 'talent_name.n11320001',
            description: 'talent_descr.n11320001',
            hideEmpty: true,
            defaultValue: 'pyro',
            values: [
                { value: 'pyro', serializeId: 1, conditions: [new Condition({settings: {prune_banehunter_oathhammer_element_str: 'pyro'}})] },
                { value: 'hydro', serializeId: 2, conditions: [new Condition({settings: {prune_banehunter_oathhammer_element_str: 'hydro'}})] },
                { value: 'electro', serializeId: 3, conditions: [new Condition({settings: {prune_banehunter_oathhammer_element_str: 'electro'}})] },
                { value: 'cryo', serializeId: 4, conditions: [new Condition({settings: {prune_banehunter_oathhammer_element_str: 'cryo'}})] },
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.prune_verdict_and_punishment',
            description: 'talent_descr.prune_verdict_and_punishment',
            info: {ascension: 1},
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        // A4 Tolling Rally source control (was a static description row).
        // The delivered effect is the hidden OTHERS postEffect below.
        new ConditionBoolean({
            name: 'prune_tolling_synchronicity',
            serializeId: 5,
            title: 'talent_name.prune_tolling_synchronicity',
            description: 'talent_descr.prune_tolling_synchronicity',
            info: {ascension: 4},
            stats: {
                text_percent: A4TollingRallyScale,
                text_percent_max: A4TollingRallyCap,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        // Secret Rite, Swirl part: "If the Elemental Reaction triggered is a
        // Swirl or Stellar Swirl reaction, the triggering character's ATK
        // will additionally be increased by 30%". The trigger is a Hexerei
        // member affected by Tolling Rally (so not Prune); it is chosen, as
        // for Venti's Secret Rite.
        // Game data: UNIQUE_Prune_Monv_Talent_Buff_ForOther writes
        // Actor_AttackRatio (premod, no Extra), no stat read. Conditions are
        // always premod: needs nothing.
        new ConditionBoolean({
            name: 'prune_witchseekers_vow_swirl',
            serializeId: 7,
            title: 'talent_name.prune_witchseekers_vow_swirl',
            description: 'talent_descr.prune_witchseekers_vow_swirl',
            displayStats: {atk_percent: WitchSwirlAtkBonus},
            hideInactive: true,
            info: {hexerei: true},
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                condWitchHomework,
                condTollingRally,
            ]),
        }),
        new ConditionDropdownTeamMember({
            name: 'prune_witchseekers_vow_swirl_receiver',
            serializeId: 8,
            othersOnly: true,
            title: 'buffs_name.selected_receiver',
            description: 'buffs_descr.selected_receiver',
            hideInactive: true,
            info: {hexerei: true},
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                condWitchHomework,
                condTollingRally,
            ]),
        }),
        new Condition({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            stats: {
                atk_percent: WitchSwirlAtkBonus,
            },
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                condWitchHomework,
                condHexereiResonance,
                condTollingRally,
                new ConditionBoolean({name: 'prune_witchseekers_vow_swirl'}),
                new ConditionSelectedReceiver({name: 'prune_witchseekers_vow_swirl_receiver'}),
                new ConditionReceiver({
                    condition: new ConditionWitchHomework({}),
                }),
            ]),
        }),
        new ConditionBoolean({
            name: 'prune_witch_homework',
            serializeId: 2,
            title: 'talent_name.prune_witchseekers_vow',
            description: 'talent_descr.prune_witchseekers_vow',
            info: {hexerei: true},
        }),
        new ConditionBoolean({
            name: 'prune_witchseekers_vow',
            serializeId: 3,
            title: 'talent_name.prune_witchseekers_vow_reaction',
            description: 'talent_descr.prune_witchseekers_vow_reaction',
            hideInactive: true,
            stats: {
                atk_percent: WitchPruneAtkBonus,
            },
            // Witchseeker's Vow self part ("Prune's ATK is increased by 60%").
            // Game data: UNIQUE_Prune_Monv_Talent_Buff_ForPrune writes
            // Actor_AttackRatio (premod, no Extra), no stat read. A flat
            // condition: always premod, needs nothing.
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                condWitchHomework,
                condHexereiResonance,
            ]),
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.prune_with_a_vow_to_rescue_the_journey_begins',
                    description: 'talent_descr.prune_with_a_vow_to_rescue_the_journey_begins',
                }),
            ],
        },
        {
            conditions: [
                // C2 Hunt the Witch (10% + 5% per stack, max 40% ATK).
                // Game data: Prune_Constellation_2_Buff writes
                // Actor_AttackRatio (premod, no Extra) from the C2_AttackAdd_*
                // global values, no stat read. A flat condition: always
                // premod, needs nothing.
                new ConditionDropdown({
                    name: 'prune_useful_for_cleaning_messy_baggage_elemental_powers_are_indeed',
                    serializeId: 4,
                    title: 'talent_name.prune_useful_for_cleaning_messy_baggage_elemental_powers_are_indeed',
                    description: 'talent_descr.prune_useful_for_cleaning_messy_baggage_elemental_powers_are_indeed',
                    values: Array.from({length: C2HuntTheWitchMaxStacks + 1}, (_, stacks) => ({
                        title: ''+ stacks,
                        value: ''+ stacks,
                        serializeId: stacks + 1,
                        conditions: [
                            new Condition({
                                stats: {
                                    atk_percent: C2HuntTheWitchAtkBonus + C2HuntTheWitchStackBonus * stacks,
                                },
                            }),
                        ],
                    })),
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
                    title: 'talent_name.prune_looking_back_following_the_wind_ones_shadow_still_halved',
                    description: 'talent_descr.prune_looking_back_following_the_wind_ones_shadow_still_halved',
                    stats: {
                        text_percent_dmg: C4RicochetDmg,
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
                // C6 flat 350 ATK for Prune herself (below) and for the
                // on-field member among the others (hidden OTHERS below).
                // Game data: UNIQUE_Prune_C6_Buff_OnPrune and
                // UNIQUE_Prune_C6_Buff_OnCurLocalAvatar write
                // Actor_AttackDelta (premod, no Extra), no stat read. Flat
                // conditions are always premod: needs nothing.
                new ConditionBoolean({
                    name: 'prune_and_thats_the_story_share_it_with_your_friends',
                    serializeId: 6,
                    title: 'talent_name.prune_and_thats_the_story_share_it_with_your_friends',
                    description: 'talent_descr.prune_and_thats_the_story_share_it_with_your_friends',
                    stats: {
                        atk: C6AtkBonus,
                    },
                }),
                // C6: party members affected by Tolling Rally "cause Prune and
                // the other current active character(s) affected by Tolling
                // Rally to gain 350 ATK": the on-field member among the others.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        atk: C6AtkBonus,
                    },
                    condition: new ConditionAnd([
                        new ConditionAscensionChar({ascension: 4}),
                        condTollingRally,
                        new ConditionBoolean({name: 'prune_and_thats_the_story_share_it_with_your_friends'}),
                        new ConditionReceiver({
                            condition: new ConditionOnField(),
                        }),
                    ]),
                }),
            ],
        },
    ]),
    postEffects: [
        tollingRallyPost,
    ],
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox'], [4, 'checkbox'], [5, 'checkbox']],
});
