import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionBooleanCharElement } from "../../classes/Condition/Boolean/CharElement";
import { ConditionBooleanDropdownValue } from "../../classes/Condition/Boolean/DropdownValue";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdown } from "../../classes/Condition/Dropdown";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionOr } from "../../classes/Condition/Or";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionTeamElement } from "../../classes/Condition/TeamElement";
import { ConditionWitchHomework } from "../../classes/Condition/WitchHomework";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageArcaneProjection } from "../../classes/Feature2/Damage/ArcaneProjection";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureShield } from "../../classes/Feature2/Shield";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Nicole.s1_id,
        title: 'talent_name.nicole_allegoria',
        description: 'talent_descr.nicole_allegoria',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Nicole.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Nicole.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Nicole.s1.p3),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Nicole.s1.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Nicole.s1.p5),
            },
            {
                table: new StatTable('plunge', charTalentTables.Nicole.s1.p6),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Nicole.s1.p7),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Nicole.s1.p8),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Nicole.s2_id,
        title: 'talent_name.nicole_uncreated_light',
        description: 'talent_descr.nicole_uncreated_light',
        items: [
            {
                table: new StatTable('nicole_uncreated_light', charTalentTables.Nicole.s2.p1),
            },
            {
                type: 'shield',
                unit: 'atk',
                table: [
                    new StatTable('nicole_shield_of_blazing_light', charTalentTables.Nicole.s2.p2),
                    new StatTable('', charTalentTables.Nicole.s2.p3),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('nicole_shield_duration', charTalentTables.Nicole.s2.p4),
            },
            {
                table: new StatTable('nicole_grace_of_kenosis_atk_bonus_ratio', charTalentTables.Nicole.s2.p5),
            },
            {
                unit: '',
                table: new StatTable('nicole_grace_of_kenosis_max_atk_bonus', charTalentTables.Nicole.s2.p6),
            },
            {
                unit: 'sec',
                table: new StatTable('nicole_grace_of_kenosis_duration', charTalentTables.Nicole.s2.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Nicole.s2.p8),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Nicole.s3_id,
        title: 'talent_name.nicole_ladder_of_divine_ascent',
        description: 'talent_descr.nicole_ladder_of_divine_ascent',
        items: [
            {
                table: new StatTable('nicole_ladder_of_divine_ascent', charTalentTables.Nicole.s3.p1),
            },
            {
                table: new StatTable('nicole_arcane_projection', charTalentTables.Nicole.s3.p2),
            },
            {
                unit: '',
                table: new StatTable('nicole_arcane_projection_count', charTalentTables.Nicole.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('nicole_silent_contemplation_duration', charTalentTables.Nicole.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Nicole.s3.p5),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Nicole.s3.p6),
            },
        ],
    },
});

const GuidanceAtkBonus = charTalentTables.Nicole.a1.p3;
const C2GraceAtkBonus = charTalentTables.Nicole.c2.p1;
const C2ResShred = percent(charTalentTables.Nicole.c2.p2);
const WitchArcaneProjectionBonus = percent(charTalentTables.Nicole.sp.p1);
const C1ArcaneProjectionUnityDmg = percent(charTalentTables.Nicole.c1.p1);
const C4PathfinderBlessingBonus = percent(charTalentTables.Nicole.c4.p3);
const C6DefIgnore = percent(charTalentTables.Nicole.c6.p1);
const Elements = ['pyro', 'hydro', 'cryo', 'dendro', 'electro', 'anemo', 'geo'];

const condGrace = new ConditionBooleanDropdownValue({
    name: 'nicole_grace_of_kenosis',
    value: 'grace',
});
const condGuidance = new ConditionBooleanDropdownValue({
    name: 'nicole_grace_of_kenosis',
    value: 'guidance',
});
const condGraceOrGuidance = new ConditionOr([condGrace, condGuidance]);
const condWitchHomework = new ConditionBoolean({name: 'nicole_witch_homework'});
const condHexereiResonance = new ConditionHexereiResonance({});
const condC4Blessing = new ConditionAnd([
    condGuidance,
    new ConditionConstellation({constellation: 4}),
    new ConditionBoolean({name: 'nicole_whether_left_or_right_no_matter_which_way_you_turn'}),
]);

// "When characters other than Nicole who have Guidance of Theosis leave the
// field, their effect reverts to Grace of Kenosis"; from C6 it never reverts.
const condOthersKeepGuidance = new ConditionOr([
    new ConditionReceiver({
        condition: new ConditionOnField(),
    }),
    new ConditionConstellation({constellation: 6}),
]);

/**
 * C2: Guidance of Theosis shreds the RES of its holder's element, once per
 * element. Holders are Nicole herself, the on-field member (Methexis) and,
 * from C6, every member.
 *
 * @param {string} element
 * @returns {Condition}
 */
function condGuidanceHolderElement(element) {
    return new ConditionOr([
        new ConditionBooleanCharElement({element: [element]}),
        new ConditionAnd([
            new ConditionAscensionChar({ascension: 1}),
            new ConditionTeamElement({element: element, onField: true}),
        ]),
        new ConditionAnd([
            new ConditionConstellation({constellation: 6}),
            new ConditionTeamElement({element: element}),
        ]),
    ]);
}

// Grace of Kenosis ATK bonus (skill).
// Game data: Avatar_Nicole_ElementalArt onAbilityStart sets
// _ABILITY_Nicole_ElementalArt_AttackUp from FIGHT_PROP_NONEXTRA_ATTACK
// (premod) x AttackUp_AttackTranferRatio (cap AttackUp_Max), written by
// UNIQUE_Avatar_Nicole_AttackUp_Lv1/Lv2 as Actor_AttackExtraDelta (extra;
// GO: input.premod.atk into teamBuff total atk). The default premod read
// and extra write are confirmed.
const graceAtkPost = new PostEffectStats({
    receivers: RECEIVERS.TEAM,
    from: 'atk*',
    levelSetting: 'char_skill_elemental',
    percent: Talents.getMulti({
        name: 'atk',
        from: 'skill.nicole_grace_of_kenosis_atk_bonus_ratio',
        multi: 0.01,
    }),
    statCap: Talents.get('skill.nicole_grace_of_kenosis_max_atk_bonus'),
    condition: condGraceOrGuidance,
});

// C4 Pathfinder's Blessing flat bonus (displayed row; the damage itself is
// the delivered multiplier below).
// Game data: UNIQUE_Avatar_Nicole_Constellation_4_Buff (ModifyDamageCountMixin)
// damageExtra reads FIGHT_PROP_CUR_ATTACK (total) x Constellation_4_Buff_Ratio
// (GO: prod(percent(dmgInc), input.total.atk)). No KQM test. The written
// base_dmg_bonus_* stats have no extra lane, so only the read is declared.
const pathfinderBlessingPost = new PostEffectStats({
    reads: CHANNELS.TOTAL,
    from: 'atk*',
    percent: [
        new StatTable('base_dmg_bonus_normal', [C4PathfinderBlessingBonus]),
        new StatTable('base_dmg_bonus_charged', [C4PathfinderBlessingBonus]),
        new StatTable('base_dmg_bonus_plunge', [C4PathfinderBlessingBonus]),
        new StatTable('base_dmg_bonus_skill', [C4PathfinderBlessingBonus]),
        new StatTable('base_dmg_bonus_burst', [C4PathfinderBlessingBonus]),
    ],
    condition: new ConditionAnd([
        condGuidance,
        new ConditionBoolean({name: 'nicole_whether_left_or_right_no_matter_which_way_you_turn'}),
    ]),
});

// Delivered multipliers are computed in Nicole's scope: they scale on her ATK.
// C4 Pathfinder's Blessing: game reads FIGHT_PROP_CUR_ATTACK (total, see the
// post above; GO: input.total.atk). Secret Rite: game reads FIGHT_PROP_CUR_ATTACK
// (total; Avatar_Nicole_PermanentSkill_3 UNIQUE handler ModifyDamageMixin
// damageExtra, GO: input.total.atk). A scaling of 'atk*' already reads the
// total, so plain damage multipliers need nothing.
const pathfinderBlessingMultiplier = new FeatureMultiplier({
    receivers: RECEIVERS.TEAM,
    source: 'constellation4',
    values: new StatTable('nicole_pathfinder_blessing', [C4PathfinderBlessingBonus]),
    condition: condC4Blessing,
    target: new FeatureMultiplierTarget({
        damageTypes: ['normal', 'charged', 'plunge', 'skill', 'burst'],
    }),
});

export const Nicole = new DbObjectChar({
    name: 'nicole',
    serializeId: 121,
    gameId: 10000131,
    iconClass: 'char-icon-nicole',
    rarity: 5,
    element: 'pyro',
    weapon: 'catalyst',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Nicole,
    // Talent damage hits and the skill shield read the total ATK: the game
    // computes the shield from FIGHT_PROP_CUR_ATTACK
    // (Avatar_Nicole_ElementalArt_Shield_Handler_Temp) and talent hits scale
    // Talent_Damage x FIGHT_PROP_CUR_ATTACK. Damage multipliers need nothing.
    // A1/C2 flat +300 ATK, the C2 RES shred and C6 DEF ignore are flat
    // conditions / enemy stats (game: Actor_AttackDelta, SubHurtDelta,
    // ModifyDamageMixin ignore), need nothing.
    features: [
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_low',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'nicole_uncreated_light',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.nicole_uncreated_light'),
                }),
            ],
        }),
        new FeatureShield({
            category: 'skill',
            name: 'nicole_shield_of_blazing_light',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplierList({
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.nicole_shield_of_blazing_light'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'nicole_ladder_of_divine_ascent',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.nicole_ladder_of_divine_ascent'),
                }),
            ],
        }),
        // Arcane Projections are damage of the active member who summons
        // them, at Nicole's burst level: "This DMG scales based on the
        // corresponding character's ATK and will be considered as having
        // been dealt by them."
        new FeatureDamageArcaneProjection({
            name: 'nicole_arcane_projection',
            receivers: RECEIVERS.TEAM,
            tags: ['nicole_arcane_projection', 'arcane_projection'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.nicole_arcane_projection'),
                }),
            ],
        }),
        new FeatureDamageArcaneProjection({
            name: 'nicole_arcane_projection_unity',
            receivers: RECEIVERS.TEAM,
            tags: ['nicole_arcane_projection_unity', 'nicole_arcane_projection', 'arcane_projection'],
            condition: new ConditionConstellation({constellation: 1}),
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation1',
                    values: new StatTable('nicole_arcane_projection_unity', [C1ArcaneProjectionUnityDmg]),
                }),
            ],
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'nicole_grace_atk_bonus',
            postEffect: graceAtkPost,
            condition: condGraceOrGuidance,
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'nicole_pathfinder_blessing',
            postEffect: pathfinderBlessingPost,
            condition: new ConditionAnd([
                condGuidance,
                new ConditionBoolean({name: 'nicole_whether_left_or_right_no_matter_which_way_you_turn'}),
            ]),
        }),
    ],
    multipliers: [
        // Hexerei: Secret Rite: "Increases the DMG dealt by Hexerei
        // characters' Arcane Projections by 300% of Nicole's ATK."
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'atk*',
            source: 'nicole_light_in_the_darkness',
            values: new StatTable('nicole_light_in_the_darkness', [WitchArcaneProjectionBonus]),
            condition: new ConditionAnd([
                condWitchHomework,
                condHexereiResonance,
                new ConditionReceiver({
                    condition: new ConditionWitchHomework({}),
                }),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['arcane_projection'],
            }),
        }),
        pathfinderBlessingMultiplier,
    ],
    conditions: [
        new ConditionDropdown({
            name: 'nicole_grace_of_kenosis',
            serializeId: 1,
            title: 'talent_name.n11310001',
            description: 'talent_descr.n11310001',
            dropdownClass: 'medium-text',
            separateControlLine: true,
            values: [
                {title_str: 'talent_name.n11310001', value: 'grace', serializeId: 1},
                {title_str: 'talent_name.n11310002', value: 'guidance', serializeId: 2},
            ],
        }),
        new Condition({
            isHidden: true,
            stats: {
                atk: GuidanceAtkBonus,
            },
            condition: new ConditionAnd([
                condGuidance,
                new ConditionAscensionChar({ascension: 1}),
            ]),
        }),
        new Condition({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            stats: {
                atk: GuidanceAtkBonus,
            },
            condition: new ConditionAnd([
                condGuidance,
                new ConditionAscensionChar({ascension: 1}),
                condOthersKeepGuidance,
            ]),
        }),
        new ConditionBoolean({
            name: 'nicole_witch_homework',
            serializeId: 2,
            title: 'talent_name.nicole_light_in_the_darkness',
            description: 'talent_descr.nicole_light_in_the_darkness',
            info: {hexerei: true},
        }),
        new ConditionStatic({
            title: 'talent_name.nicole_methexis',
            description: 'talent_descr.nicole_methexis',
            info: {ascension: 1},
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.nicole_philokalia',
            description: 'talent_descr.nicole_philokalia',
            info: {ascension: 4},
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    postEffects: [
        graceAtkPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.nicole_do_not_be_afraid_child_who_is_loved',
                    description: 'talent_descr.nicole_do_not_be_afraid_child_who_is_loved',
                    stats: {
                        text_percent_dmg: C1ArcaneProjectionUnityDmg,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.nicole_i_will_guide_you_and_show_you_the_path_you_should_tread',
                    description: 'talent_descr.nicole_i_will_guide_you_and_show_you_the_path_you_should_tread',
                    stats: {
                        text_atk: C2GraceAtkBonus,
                        text_percent: C2ResShred,
                    },
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        atk: C2GraceAtkBonus,
                    },
                    condition: condGraceOrGuidance,
                }),
                ...Elements.map((element) => new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        ['enemy_res_' + element]: -C2ResShred,
                    },
                    condition: new ConditionAnd([
                        condGuidance,
                        condGuidanceHolderElement(element),
                    ]),
                })),
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
                    name: 'nicole_whether_left_or_right_no_matter_which_way_you_turn',
                    serializeId: 3,
                    title: 'talent_name.nicole_whether_left_or_right_no_matter_which_way_you_turn',
                    description: 'talent_descr.nicole_whether_left_or_right_no_matter_which_way_you_turn',
                    stats: {
                        text_atk_percent: C4PathfinderBlessingBonus,
                    },
                    condition: condGuidance,
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
                // From C6 every member holds Guidance of Theosis with Nicole.
                new ConditionStatic({
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.nicole_this_is_the_path_walk_it_without_delay',
                    description: 'talent_descr.nicole_this_is_the_path_walk_it_without_delay',
                    stats: {
                        def_ignore: C6DefIgnore,
                    },
                    condition: condGuidance,
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'number'], [9, 'number'], [3, 'dropdown'], [4, 'checkbox'], [11, 'checkbox'], [5, 'checkbox'], [8, 'checkbox'], [6, 'checkbox'], [10, 'checkbox'], [7, 'checkbox']],
});
