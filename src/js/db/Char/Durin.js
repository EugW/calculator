import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionBooleanDropdownValue } from "../../classes/Condition/Boolean/DropdownValue";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdownElement } from "../../classes/Condition/Dropdown/Element";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageBurstPeriodic } from "../../classes/Feature2/Damage/Burst/Periodic";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent, plus, times } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Durin.s1_id,
        title: 'talent_name.durin_radiant_wingslash',
        description: 'talent_descr.durin_radiant_wingslash',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Durin.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Durin.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Durin.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Durin.s1.p5),
            },
            {
                table: new StatTable('durin_charged_dmg', charTalentTables.Durin.s1.p6),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Durin.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Durin.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Durin.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Durin.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Durin.s2_id,
        title: 'talent_name.durin_convergence_and_division',
        description: 'talent_descr.durin_convergence_and_division',
        items: [
            {
                table: new StatTable('durin_confirmation_dmg', charTalentTables.Durin.s2.p1),
            },
            {
                table: new StatTable('durin_denial_dmg_1', charTalentTables.Durin.s2.p2),
            },
            {
                table: new StatTable('durin_denial_dmg_2', charTalentTables.Durin.s2.p3),
            },
            {
                table: new StatTable('durin_denial_dmg_3', charTalentTables.Durin.s2.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('energy_regen', charTalentTables.Durin.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Durin.s2.p6),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Durin.s3_id,
        title: 'talent_name.durin_as_the_light_shifts',
        description: 'talent_descr.durin_as_the_light_shifts',
        items: [
            {
                table: new StatTable('durin_purity_dmg_1', charTalentTables.Durin.s3.p1),
            },
            {
                table: new StatTable('durin_purity_dmg_2', charTalentTables.Durin.s3.p2),
            },
            {
                table: new StatTable('durin_purity_dmg_3', charTalentTables.Durin.s3.p3),
            },
            {
                table: new StatTable('durin_darkness_dmg_1', charTalentTables.Durin.s3.p4),
            },
            {
                table: new StatTable('durin_darkness_dmg_2', charTalentTables.Durin.s3.p5),
            },
            {
                table: new StatTable('durin_darkness_dmg_3', charTalentTables.Durin.s3.p6),
            },
            {
                table: new StatTable('durin_white_flame_dmg', charTalentTables.Durin.s3.p7),
            },
            {
                table: new StatTable('durin_dark_decay_dmg', charTalentTables.Durin.s3.p8),
            },
            {
                unit: 'sec',
                table: new StatTable('durin_dragon_duration', charTalentTables.Durin.s3.p9),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Durin.s3.p11),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Durin.s3.p12),
            },
        ],
    },
});

// Passive and constellation values
const A1ResShred = percent(charTalentTables.Durin.a1.p1);
const A1ResShredHexerei = percent(times(charTalentTables.Durin.a1.p1, plus(1, charTalentTables.Durin.sp.p1)));
const A1VaporizeMeltBonus = percent(charTalentTables.Durin.a1.p3);
const A1VaporizeMeltBonusHexerei = percent(times(charTalentTables.Durin.a1.p3, plus(1, charTalentTables.Durin.sp.p1)));
const A4PrimordialMaxBonus = percent(charTalentTables.Durin.a4.p2);
const A4PrimordialAtkScale = percent(charTalentTables.Durin.a4.p1); // per 100 ATK (PostEffect divides by 100 for percent stats)

// A4 - Primordial Fusion: Dragon attacks consume stack and gain DMG multiplier based on ATK
// This is a separate multiplicative layer, not additive DMG bonus
// Formula: 100% + min(3% * ATK / 100, 75%) = up to 175% multiplier
// Game data: Avatar_Durin_PermanentSkill_2 (UNIQUE_Avatar_Durin_PermanentSkill_2_DamageUp,
// onThinkInterval/onHittingOther) reads FIGHT_PROP_CUR_ATTACK (total). GO reads
// input.total.atk. Writes dmg_burst_periodic_special, which has no extra lane,
// so no writes param is needed. KQM Durin page has no ATK-interaction test.
const a4PrimordialPost = new PostEffectStatsAtk({
    reads: CHANNELS.TOTAL,
    // Game formula: 3% per 100 ATK (ATK/100 x 0.03, cap 0.75): the game sets
    // ATTACK_PermanentSkill_2 = FIGHT_PROP_CUR_ATTACK/100 then x
    // Permanent_2_DamageRatio (ProudSkill 12322 params [0.03, 0.75]); GO does
    // prod(percent(3%), input.total.atk, 1/100). The /100 for "per 100 ATK"
    // lives in content (cf. Odette stellarglimmer_multi [x/100]).
    percent: new StatTable('dmg_burst_periodic_special', [A4PrimordialAtkScale / 100]),
    statCap: new StatTable('', [A4PrimordialMaxBonus]),
    conditions: [
        new ConditionAscensionChar({ascension: 4}),
        new ConditionBoolean({name: 'durin_primordial_fusion'}),
    ],
});
const C1CycleAtkScale = percent(charTalentTables.Durin.c1.p5);
const C1CycleSelfAtkScale = percent(charTalentTables.Durin.c1.p7);
const C2PyroDmgBonus = percent(charTalentTables.Durin.c2.p3);
const C4BurstDmgBonus = percent(charTalentTables.Durin.c4.p3);
const C6DefIgnore = percent(charTalentTables.Durin.c6.p1);
const C6DefShred = percent(charTalentTables.Durin.c6.p2);
const C6DarknessDefIgnoreExtra = percent(charTalentTables.Durin.c6.p4);

// Condition shortcuts for Dragon Form
// Toggle OFF (default) = Purity mode, Toggle ON = Darkness mode
const condDarknessMode = new ConditionBoolean({name: 'durin_darkness_mode'});
const condPurityMode = new ConditionNot([new ConditionBoolean({name: 'durin_darkness_mode'})]);

// The White Flame form (Principle of Purity) gates A1's RES shred and C1's
// party Cycle of Enlightenment. The old model gated only their controls, so
// the effects still applied in Darkness mode, and its recordings were made
// that way; the conversion row and the solo baseline open this gate.
export const durinWhiteFlame = new ConditionNot([new ConditionBoolean({name: 'durin_darkness_mode'})]);
const activeRecipient = new ConditionReceiver({
    condition: new ConditionOnField(),
});

export const Durin = new DbObjectChar({
    name: 'durin',
    serializeId: 113,
    gameId: 10000123,
    iconClass: 'char-icon-durin',
    rarity: 5,
    element: 'pyro',
    weapon: 'sword',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Durin,
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
        new FeatureDamageNormal({
            name: 'normal_hit_4',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'durin_charged_dmg',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.durin_charged_dmg'),
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
        // Skill - Confirmation of Purity
        new FeatureDamageSkill({
            name: 'durin_confirmation_dmg',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.durin_confirmation_dmg'),
                }),
            ],
        }),
        // Skill - Denial of Darkness (3 hits)
        new FeatureDamageSkill({
            name: 'durin_denial_dmg_1',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.durin_denial_dmg_1'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'durin_denial_dmg_2',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.durin_denial_dmg_2'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'durin_denial_dmg_3',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.durin_denial_dmg_3'),
                }),
            ],
        }),
        // Burst - Principle of Purity (3 hits) - only visible in Purity mode
        new FeatureDamageBurst({
            name: 'durin_purity_dmg_1',
            element: 'pyro',
            condition: condPurityMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_purity_dmg_1'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'durin_purity_dmg_2',
            element: 'pyro',
            condition: condPurityMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_purity_dmg_2'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'durin_purity_dmg_3',
            element: 'pyro',
            condition: condPurityMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_purity_dmg_3'),
                }),
            ],
        }),
        // Dragon of White Flame (periodic) - only visible in Purity mode
        new FeatureDamageBurstPeriodic({
            name: 'durin_white_flame_dmg',
            element: 'pyro',
            condition: condPurityMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_white_flame_dmg'),
                }),
            ],
        }),
        // Burst - Principle of Darkness (3 hits) - only visible in Darkness mode
        new FeatureDamageBurst({
            name: 'durin_darkness_dmg_1',
            element: 'pyro',
            condition: condDarknessMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_darkness_dmg_1'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'durin_darkness_dmg_2',
            element: 'pyro',
            condition: condDarknessMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_darkness_dmg_2'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'durin_darkness_dmg_3',
            element: 'pyro',
            condition: condDarknessMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_darkness_dmg_3'),
                }),
            ],
        }),
        // Dragon of Dark Decay (periodic) - only visible in Darkness mode
        new FeatureDamageBurstPeriodic({
            name: 'durin_dark_decay_dmg',
            element: 'pyro',
            condition: condDarknessMode,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.durin_dark_decay_dmg'),
                }),
            ],
        }),
    ],
    // C1 - Dark form (Principle of Darkness): 150% ATK flat damage bonus to Burst
    // C1 - Light form (Principle of Purity): 60% ATK flat damage for other members
    // Game data: Avatar_Durin_Talent_1 (UNIQUE_Avatar_Durin_DamageExtra_Black_Buff /
    // _White_Buff, ModifyDamageCountMixin) reads FIGHT_PROP_CUR_ATTACK (total).
    // GO reads input.total.atk. Damage flat bonuses read the total by
    // construction (FeatureMultiplier scaling atk*), so no params are needed.
    multipliers: [
        new FeatureMultiplier({
            scaling: 'atk*',
            source: 'durin_c1',
            values: new StatTable('', [C1CycleSelfAtkScale]), // 150% of ATK
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 1}),
                condDarknessMode,
                new ConditionBoolean({name: 'durin_c1_cycle_self'}),
            ]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['burst'],
            }),
        }),
        // "All other nearby party members gain 20 stacks ... When nearby
        // active characters deal ... DMG, 1 stack ... increase the DMG dealt
        // by 60% of Durin's ATK": the on-field member among the others.
        new FeatureMultiplier({
            receivers: RECEIVERS.OTHERS,
            scaling: 'atk*',
            source: 'durin_c1',
            values: new StatTable('', [C1CycleAtkScale]), // 60% of ATK
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 1}),
                durinWhiteFlame,
                new ConditionBoolean({name: 'durin_c1_cycle_party'}),
                activeRecipient,
            ]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal', 'charged', 'plunge', 'skill', 'burst'],
            }),
        }),
    ],
    conditions: [
        // Dragon Form selector - OFF (default) = Purity, ON = Darkness
        new ConditionBoolean({
            name: 'durin_darkness_mode',
            serializeId: 11,
            title: 'talent_name.durin_darkness_mode',
        }),
        // Witch Homework - Witch's Eve Rite: Ode to Ascension
        new ConditionBoolean({
            name: 'durin_witch_homework',
            serializeId: 8,
            title: 'talent_name.durin_ode_to_ascension',
            description: 'talent_descr.durin_ode_to_ascension',
            info: {hexerei: true},
        }),
        // A1 - Dragon of White Flame RES shred (multi-select for elements) - Purity mode only
        new ConditionDropdownElement({
            name: 'durin_res_shred',
            serializeId: 1,
            multiple: true,
            hideEmpty: true,
            hideInactive: true,
            dropdownClass: 'select-element-multiple',
            title: 'talent_name.durin_light_manifest_of_the_divine_calculus',
            description: 'talent_descr.durin_light_manifest_of_the_divine_calculus',
            info: {ascension: 1},
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                condPurityMode,
            ]),
            values: [
                { value: 'pyro', serializeId: 1 },
                { value: 'dendro', serializeId: 2 },
                { value: 'electro', serializeId: 3 },
                { value: 'anemo', serializeId: 4 },
                { value: 'geo', serializeId: 5 },
            ],
        }),
        // A1 - Dragon of White Flame RES shred effects (base, no Hexerei).
        // An opponent debuff, so it reaches the whole team.
        ...['pyro', 'dendro', 'electro', 'anemo', 'geo'].map((elem) => {
            return new Condition({
                receivers: RECEIVERS.TEAM,
                stats: {
                    ['enemy_res_' + elem]: -A1ResShred,
                },
                condition: new ConditionAnd([
                    new ConditionAscensionChar({ascension: 1}),
                    durinWhiteFlame,
                    new ConditionBooleanDropdownValue({name: 'durin_res_shred', value: elem}),
                    new ConditionNot([new ConditionHexereiResonance({})]),
                ]),
            });
        }),
        // A1 - Dragon of White Flame RES shred effects (Hexerei enhanced)
        ...['pyro', 'dendro', 'electro', 'anemo', 'geo'].map((elem) => {
            return new Condition({
                receivers: RECEIVERS.TEAM,
                stats: {
                    ['enemy_res_' + elem]: -A1ResShredHexerei,
                },
                condition: new ConditionAnd([
                    new ConditionAscensionChar({ascension: 1}),
                    durinWhiteFlame,
                    new ConditionBooleanDropdownValue({name: 'durin_res_shred', value: elem}),
                    new ConditionHexereiResonance({}),
                ]),
            });
        }),
        // A1 - Dragon of Dark Decay Vaporize/Melt bonus - Darkness mode only
        new ConditionBoolean({
            name: 'durin_vaporize_melt_bonus',
            serializeId: 2,
            hideInactive: true,
            title: 'talent_name.durin_light_manifest_of_the_divine_calculus',
            description: 'talent_descr.durin_light_manifest_of_the_divine_calculus',
            info: {ascension: 1},
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                condDarknessMode,
            ]),
        }),
        // A1 - Vaporize/Melt bonus effects (base, no Hexerei)
        new Condition({
            stats: {
                dmg_reaction_vaporize: A1VaporizeMeltBonus,
                dmg_reaction_melt: A1VaporizeMeltBonus,
            },
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                condDarknessMode,
                new ConditionBoolean({name: 'durin_vaporize_melt_bonus'}),
                new ConditionNot([new ConditionHexereiResonance({})]),
            ]),
        }),
        // A1 - Vaporize/Melt bonus effects (Hexerei enhanced)
        new Condition({
            stats: {
                dmg_reaction_vaporize: A1VaporizeMeltBonusHexerei,
                dmg_reaction_melt: A1VaporizeMeltBonusHexerei,
            },
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                condDarknessMode,
                new ConditionBoolean({name: 'durin_vaporize_melt_bonus'}),
                new ConditionHexereiResonance({}),
            ]),
        }),
        // A4 - Primordial Fusion (toggle for consuming stack - DMG bonus calculated from ATK)
        new ConditionBoolean({
            name: 'durin_primordial_fusion',
            serializeId: 7,
            title: 'talent_name.durin_chaos_formed_like_the_night',
            description: 'talent_descr.durin_chaos_formed_like_the_night',
            info: {ascension: 4},
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        // C1 - Light form party buff (source control; the OTHERS multiplier
        // above delivers it).
        new ConditionBoolean({
            name: 'durin_c1_cycle_party',
            serializeId: 4,
            hideInactive: true,
            title: 'talent_name.durin_adamahs_redemption',
            description: 'talent_descr.durin_adamahs_redemption',
            stats: {
                text_atk_percent: C1CycleAtkScale,
            },
            info: {constellation: 1},
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 1}),
                durinWhiteFlame,
            ]),
        }),
        // C2 - Unground Visions: "all nearby party members gain a 50% increase
        // to their Pyro DMG and to the corresponding elemental DMG involved in
        // the reaction". Pyro is durin_c2_pyro_bonus (TEAM); this dropdown
        // picks the reactions' other elements.
        new ConditionDropdownElement({
            name: 'durin_c2_dmg_bonus',
            serializeId: 5,
            multiple: true,
            hideEmpty: true,
            dropdownClass: 'select-element-multiple',
            title: 'talent_name.durin_unground_visions',
            description: 'talent_descr.durin_unground_visions',
            info: {constellation: 2},
            condition: new ConditionConstellation({constellation: 2}),
            values: [
                { value: 'hydro', serializeId: 2 },
                { value: 'cryo', serializeId: 3 },
                { value: 'dendro', serializeId: 4 },
                { value: 'electro', serializeId: 5 },
                { value: 'anemo', serializeId: 6 },
                { value: 'geo', serializeId: 7 },
            ],
        }),
        ...['hydro', 'cryo', 'dendro', 'electro', 'anemo', 'geo'].map((elem) => {
            return new Condition({
                isHidden: true,
                receivers: RECEIVERS.TEAM,
                stats: {
                    ['dmg_' + elem]: C2PyroDmgBonus,
                },
                condition: new ConditionAnd([
                    new ConditionConstellation({constellation: 2}),
                    new ConditionBooleanDropdownValue({name: 'durin_c2_dmg_bonus', value: elem}),
                ]),
            });
        }),
    ],
    postEffects: [
        a4PrimordialPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                // C1 - Dark form (Principle of Darkness): Self burst flat damage bonus - Darkness mode only
                new ConditionBoolean({
                    name: 'durin_c1_cycle_self',
                    serializeId: 9,
                    hideInactive: true,
                    title: 'talent_name.durin_adamahs_redemption',
                    description: 'talent_descr.durin_adamahs_redemption',
                    stats: {
                        text_atk_percent: C1CycleSelfAtkScale,
                    },
                    condition: condDarknessMode,
                }),
            ],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'durin_c2_pyro_bonus',
                    serializeId: 3,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.durin_unground_visions',
                    description: 'talent_descr.durin_unground_visions',
                    stats: {
                        dmg_pyro: C2PyroDmgBonus,
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
                    name: 'durin_c4_burst_bonus',
                    title: 'talent_name.durin_emanares_source',
                    description: 'talent_descr.durin_emanares_source',
                    stats: {
                        dmg_burst: C4BurstDmgBonus,
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
                // Base C6: Burst ignores 30% DEF (always active at C6)
                new ConditionStatic({
                    name: 'durin_c6_def_ignore',
                    title: 'talent_name.durin_dual_birth',
                    description: 'talent_descr.durin_dual_birth',
                    stats: {
                        def_ignore_burst: C6DefIgnore,
                    },
                }),
                // Purity form: DEF shred 30% - Purity mode only, opponent debuff shared with team
                new ConditionBoolean({
                    name: 'durin_c6_def_shred',
                    serializeId: 6,
                    receivers: RECEIVERS.TEAM,
                    hideInactive: true,
                    title: 'talent_name.durin_dual_birth',
                    description: 'talent_descr.durin_dual_birth',
                    stats: {
                        enemy_def_reduce: C6DefShred,
                    },
                    condition: condPurityMode,
                }),
                // Darkness form: Additional 40% DEF ignore - Darkness mode only, auto-active
                new Condition({
                    stats: {
                        def_ignore_burst: C6DarknessDefIgnoreExtra,
                    },
                    condition: condDarknessMode,
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [6, 'checkbox'], [2, 'checkbox'], [3, 'dropdown'], [4, 'checkbox'], [5, 'dropdown'], [7, 'checkbox']],
});
