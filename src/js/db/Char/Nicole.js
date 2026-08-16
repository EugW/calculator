import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanCharElement } from "../../classes/Condition/Boolean/CharElement";
import { ConditionBooleanDropdownValue } from "../../classes/Condition/Boolean/DropdownValue";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdown } from "../../classes/Condition/Dropdown";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionNumberTalent } from "../../classes/Condition/Number/Talent";
import { ConditionOr } from "../../classes/Condition/Or";
import { ConditionStatic } from "../../classes/Condition/Static";
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
import { StatTable } from "../../classes/StatTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

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

const GuidanceAtkBonus = 300;
const C2GraceAtkBonus = 300;
const C2ResShred = 25;
const WitchArcaneProjectionBonus = 300;
const C1ArcaneProjectionUnityDmg = 600;
const C4PathfinderBlessingBonus = 70;
const C6DefIgnore = 40;
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
const condPartyGrace = new ConditionBooleanDropdownValue({
    name: 'party.nicole_grace_of_kenosis',
    value: 'grace',
});
const condPartyGuidance = new ConditionBooleanDropdownValue({
    name: 'party.nicole_grace_of_kenosis',
    value: 'guidance',
});
const condPartyGraceOrGuidance = new ConditionOr([condPartyGrace, condPartyGuidance]);
const condWitchHomework = new ConditionBoolean({name: 'nicole_witch_homework'});
const condPartyWitchHomework = new ConditionBoolean({name: 'party.nicole_witch_homework'});
const condPartyArcaneProjectionUnity = new ConditionBoolean({name: 'party.nicole_do_not_be_afraid_child_who_is_loved'});
const condHexereiResonance = new ConditionHexereiResonance({});

const graceAtkPost = new PostEffectStats({
    from: 'atk_total',
    levelSetting: 'char_skill_elemental',
    percent: Talents.getMulti({
        name: 'atk',
        from: 'skill.nicole_grace_of_kenosis_atk_bonus_ratio',
        multi: 0.01,
    }),
    statCap: Talents.get('skill.nicole_grace_of_kenosis_max_atk_bonus'),
    condition: condGraceOrGuidance,
});

const partyGraceAtkPost = new PostEffectStats({
    from: 'nicole_atk_total',
    levelSetting: 'nicole_char_skill_elemental',
    percent: Talents.getMulti({
        name: 'atk',
        from: 'skill.nicole_grace_of_kenosis_atk_bonus_ratio',
        multi: 0.01,
    }),
    statCap: Talents.get('skill.nicole_grace_of_kenosis_max_atk_bonus'),
    condition: condPartyGraceOrGuidance,
});

const pathfinderBlessingPost = new PostEffectStats({
    from: 'atk_total',
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

const pathfinderBlessingMultiplier = new FeatureMultiplier({
    source: 'constellation4',
    values: new StatTable('nicole_pathfinder_blessing', [C4PathfinderBlessingBonus]),
    condition: new ConditionAnd([
        condGuidance,
        new ConditionBoolean({name: 'nicole_whether_left_or_right_no_matter_which_way_you_turn'}),
    ]),
    target: new FeatureMultiplierTarget({
        damageTypes: ['normal', 'charged', 'plunge', 'skill', 'burst'],
    }),
});

const partyPathfinderBlessingMultiplier = new FeatureMultiplier({
    scaling: 'nicole_atk_total',
    source: 'nicole',
    values: new StatTable('party_nicole_pathfinder_blessing', [C4PathfinderBlessingBonus]),
    condition: new ConditionAnd([
        condPartyGuidance,
        new ConditionBoolean({name: 'party.nicole_whether_left_or_right_no_matter_which_way_you_turn'}),
    ]),
    target: new FeatureMultiplierTarget({
        damageTypes: ['normal', 'charged', 'plunge', 'skill', 'burst'],
    }),
});

function makeArcaneProjectionFeature(leveling) {
    return new FeatureDamageArcaneProjection({
        name: 'nicole_arcane_projection',
        tags: ['nicole_arcane_projection', 'arcane_projection'],
        multipliers: [
            new FeatureMultiplier({
                leveling: leveling,
                values: Talents.get('burst.nicole_arcane_projection'),
            }),
        ],
    });
}

function makeArcaneProjectionUnityFeature(condition) {
    return new FeatureDamageArcaneProjection({
        name: 'nicole_arcane_projection_unity',
        tags: ['nicole_arcane_projection_unity', 'nicole_arcane_projection', 'arcane_projection'],
        condition: condition,
        multipliers: [
            new FeatureMultiplier({
                source: 'constellation1',
                values: new StatTable('nicole_arcane_projection_unity', [C1ArcaneProjectionUnityDmg]),
            }),
        ],
    });
}

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
        makeArcaneProjectionFeature('char_skill_burst'),
        makeArcaneProjectionUnityFeature(new ConditionConstellation({constellation: 1})),
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
        new FeatureMultiplier({
            scaling: 'atk*',
            source: 'nicole_light_in_the_darkness',
            values: new StatTable('nicole_light_in_the_darkness', [WitchArcaneProjectionBonus]),
            condition: new ConditionAnd([
                condWitchHomework,
                condHexereiResonance,
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['nicole_arcane_projection'],
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
                    stats: {
                        atk: C2GraceAtkBonus,
                    },
                    condition: condGraceOrGuidance,
                }),
                new Condition({
                    isHidden: true,
                    stats: {
                        enemy_res_pyro: -C2ResShred,
                    },
                    condition: condGuidance,
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
                new ConditionStatic({
                    title: 'talent_name.nicole_this_is_the_path_walk_it_without_delay',
                    description: 'talent_descr.nicole_this_is_the_path_walk_it_without_delay',
                    stats: {
                        enemy_def_ignore: C6DefIgnore,
                    },
                    condition: condGuidance,
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['atk_total'],
            settings: ['char_skill_elemental', 'char_skill_burst'],
        },
        conditions: [
            new ConditionNumber({
                name: 'nicole_atk_total',
                title: 'talent_name.stats_total_atk',
                partyStat: 'atk_total',
                serializeId: 1,
                rotation: 'party',
                max: 10000,
            }),
            new ConditionNumberTalent({
                name: 'nicole_char_skill_elemental',
                title: 'talent_name.stats_level_skill',
                partySetting: 'char_skill_elemental',
                serializeId: 2,
            }),
            new ConditionNumberTalent({
                name: 'nicole_char_skill_burst',
                title: 'talent_name.stats_level_burst',
                partySetting: 'char_skill_burst',
                serializeId: 9,
            }),
            new ConditionDropdown({
                name: 'party.nicole_grace_of_kenosis',
                serializeId: 3,
                rotation: 'party',
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
                condition: condPartyGuidance,
            }),
            new ConditionBoolean({
                name: 'party.nicole_witch_homework',
                serializeId: 4,
                rotation: 'party',
                title: 'talent_name.nicole_light_in_the_darkness',
                description: 'talent_descr.nicole_light_in_the_darkness',
                info: {hexerei: true},
            }),
            new ConditionBoolean({
                name: 'party.nicole_do_not_be_afraid_child_who_is_loved',
                serializeId: 11,
                rotation: 'party',
                title: 'talent_name.nicole_do_not_be_afraid_child_who_is_loved',
                description: 'talent_descr.nicole_do_not_be_afraid_child_who_is_loved',
                info: {constellation: 1},
                stats: {
                    text_percent_dmg: C1ArcaneProjectionUnityDmg,
                },
            }),
            new ConditionBoolean({
                name: 'party.nicole_i_will_guide_you_and_show_you_the_path_you_should_tread',
                serializeId: 5,
                rotation: 'party',
                title: 'talent_name.nicole_i_will_guide_you_and_show_you_the_path_you_should_tread',
                description: 'talent_descr.nicole_i_will_guide_you_and_show_you_the_path_you_should_tread',
                info: {constellation: 2},
            }),
            new ConditionBoolean({
                name: 'party.nicole_you_will_hear_my_voice_beside_you',
                serializeId: 8,
                rotation: 'party',
                title: 'talent_name.nicole_you_will_hear_my_voice_beside_you',
                description: 'talent_descr.char_constellation_skill',
                info: {constellation: 3},
                settings: {
                    nicole_char_skill_elemental_bonus: 3,
                },
            }),
            new Condition({
                isHidden: true,
                stats: {
                    atk: C2GraceAtkBonus,
                },
                condition: new ConditionAnd([
                    condPartyGraceOrGuidance,
                    new ConditionBoolean({name: 'party.nicole_i_will_guide_you_and_show_you_the_path_you_should_tread'}),
                ]),
            }),
            ...Elements.map((element) => {
                return new Condition({
                    isHidden: true,
                    stats: {
                        ['enemy_res_' + element]: -C2ResShred,
                    },
                    condition: new ConditionAnd([
                        condPartyGuidance,
                        new ConditionBoolean({name: 'party.nicole_i_will_guide_you_and_show_you_the_path_you_should_tread'}),
                        new ConditionBooleanCharElement({element: [element]}),
                    ]),
                });
            }),
            new ConditionBoolean({
                name: 'party.nicole_whether_left_or_right_no_matter_which_way_you_turn',
                serializeId: 6,
                rotation: 'party',
                title: 'talent_name.nicole_whether_left_or_right_no_matter_which_way_you_turn',
                description: 'talent_descr.nicole_whether_left_or_right_no_matter_which_way_you_turn',
                info: {constellation: 4},
                stats: {
                    text_atk_percent: C4PathfinderBlessingBonus,
                },
                condition: condPartyGuidance,
            }),
            new ConditionBoolean({
                name: 'party.nicole_a_lamp_by_your_side_a_light_to_shine_the_way',
                serializeId: 10,
                rotation: 'party',
                title: 'talent_name.nicole_a_lamp_by_your_side_a_light_to_shine_the_way',
                description: 'talent_descr.char_constellation_burst',
                info: {constellation: 5},
                settings: {
                    nicole_char_skill_burst_bonus: 3,
                },
            }),
            new ConditionBoolean({
                name: 'party.nicole_this_is_the_path_walk_it_without_delay',
                serializeId: 7,
                rotation: 'party',
                title: 'talent_name.nicole_this_is_the_path_walk_it_without_delay',
                description: 'talent_descr.nicole_this_is_the_path_walk_it_without_delay',
                info: {constellation: 6},
                stats: {
                    enemy_def_ignore: C6DefIgnore,
                },
                condition: condPartyGuidance,
            }),
        ],
        features: [
            makeArcaneProjectionFeature('nicole_char_skill_burst'),
            makeArcaneProjectionUnityFeature(condPartyArcaneProjectionUnity),
        ],
        postEffects: [
            partyGraceAtkPost,
        ],
        multipliers: [
            partyPathfinderBlessingMultiplier,
            new FeatureMultiplier({
                scaling: 'nicole_atk_total',
                source: 'nicole_light_in_the_darkness',
                values: new StatTable('party_nicole_light_in_the_darkness', [WitchArcaneProjectionBonus]),
                condition: new ConditionAnd([
                    condPartyWitchHomework,
                    condHexereiResonance,
                    new ConditionWitchHomework({}),
                ]),
                target: new FeatureMultiplierTarget({
                    tags: ['arcane_projection'],
                }),
            }),
        ],
    },
});
