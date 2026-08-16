import { ConditionAnd } from "../../classes/Condition/And";
import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanChar } from "../../classes/Condition/Boolean/Char";
import { ConditionBooleanCharElement } from "../../classes/Condition/Boolean/CharElement";
import { ConditionBooleanCharOrigin } from "../../classes/Condition/Boolean/CharOrigin";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionCalcMoonsign } from "../../classes/Condition/CalcMoonsign";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
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
import { PRIORITIES } from "../../classes/PostEffect";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsDef } from "../../classes/PostEffect/Stats/Def";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

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

const A4EmScale = 5;
const PassiveLunarScale = 0.7;
const PassiveLunarScaleCap = 14;
const ProvisionalClassificationFieldCatalogScale = 75;
const ProvisionalClassificationMillionTonCrushScale = 150;
const ProvisionalClassificationMaxMillionTonCrushStacks = 5;
const C6ProvisionalClassificationExtraScale = ProvisionalClassificationFieldCatalogScale * 0.5;
const C6ProvisionalClassificationMillionTonCrushExtraScale = ProvisionalClassificationMillionTonCrushScale * 0.5;
const C2PartyCritDmg = 40;
const C2MillionTonCritDmg = 150;
const C4DefBonus = 25;
const C6LunarCrystallizeElevate = 25;

const partyA4MoonsignTarget = new ConditionAnd([
    new ConditionBooleanCharOrigin({
        origin: ['nodkrai'],
    }),
    new ConditionNot([
        new ConditionBooleanChar({
            chars: ['linnea'],
        }),
    ]),
]);
const partyC2HydroGeoTarget = new ConditionBooleanCharElement({
    element: ['hydro', 'geo'],
});

const a4SelfEmPost = new PostEffectStatsDef({
    percent: new StatTable('mastery', [A4EmScale / 100]),
    priority: PRIORITIES.STAT_GLOBAL,
    condition: new ConditionAnd([
        new ConditionAscensionChar({ascension: 4}),
        new ConditionBoolean({name: 'linnea_universal_naturalist_archive'}),
    ]),
});

const lunarCrystallizePost = new PostEffectStatsDef({
    percent: new StatTable('lunarcrystallize_multi', [PassiveLunarScale / 100]),
    statCap: new ValueTable([PassiveLunarScaleCap]),
});

const partyA4EmPost = new PostEffectStats({
    from: 'linnea_def_total',
    percent: new StatTable('mastery', [A4EmScale / 100]),
    condition: new ConditionAnd([
        new ConditionBoolean({name: 'party.linnea_universal_naturalist_archive'}),
        partyA4MoonsignTarget,
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
        new FeaturePostEffectValue({
            category: 'other',
            name: 'linnea_lunar_bonus',
            postEffect: lunarCrystallizePost,
            format: 'percent',
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                allowed_lunarcrystallize: 1,
            },
        }),
        new ConditionCalcMoonsign(),
        new ConditionBooleanLevels({
            name: 'linnea_field_observation_notes',
            serializeId: 1,
            title: 'talent_name.linnea_field_observation_notes',
            description: 'talent_descr.linnea_field_observation_notes',
            info: {ascension: 1},
            rotation: 'self',
            levelSetting: 'party_moonsign',
            stats: [
                new StatTable('enemy_res_geo', [-15, -30]),
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
    ],
    multipliers: [
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
                    title: 'talent_name.linnea_golden_beagles_dream',
                    description: 'talent_descr.linnea_golden_beagles_dream',
                    condition: new ConditionConstellation({constellation: 6}),
                }),
                new Condition({
                    isHidden: true,
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
    partyData: {
        loadStats: {
            stats: ['def_total'],
        },
        conditions: [
            new Condition({
                settings: {
                    allowed_lunarcrystallize: 1,
                },
            }),
            new ConditionCalcMoonsign(),
            new ConditionNumber({
                name: 'linnea_def_total',
                title: 'talent_name.stats_total_def',
                partyStat: 'def_total',
                serializeId: 2,
                rotation: 'party',
                max: 10000,
            }),
            new ConditionStatic({
                title: 'talent_name.linnea_moonsign_benediction',
                description: 'talent_descr.linnea_moonsign_benediction',
                stats: {
                    text_percent: PassiveLunarScale,
                    text_percent_max: PassiveLunarScaleCap,
                },
            }),
            new ConditionBooleanLevels({
                name: 'party.linnea_field_observation_notes',
                serializeId: 1,
                title: 'talent_name.linnea_field_observation_notes',
                description: 'talent_descr.linnea_field_observation_notes',
                info: {ascension: 1},
                rotation: 'party',
                levelSetting: 'party_moonsign',
                stats: [
                    new StatTable('enemy_res_geo', [-15, -30]),
                ],
            }),
            new ConditionBoolean({
                name: 'party.linnea_universal_naturalist_archive',
                serializeId: 3,
                title: 'talent_name.linnea_universal_naturalist_archive',
                description: 'talent_descr.linnea_universal_naturalist_archive',
                info: {ascension: 4},
                rotation: 'party',
                hideInactive: true,
                stats: {
                    text_percent: A4EmScale,
                },
                condition: partyA4MoonsignTarget,
            }),
            new ConditionBoolean({
                name: 'party.linnea_provisional_classification',
                serializeId: 4,
                title: 'talent_name.linnea_provisional_classification',
                description: 'talent_descr.linnea_provisional_classification',
                info: {constellation: 1},
                rotation: 'party',
            }),
            new ConditionBooleanLevels({
                name: 'party.linnea_tidings_of_joy_and_sorrow',
                serializeId: 5,
                title: 'talent_name.linnea_tidings_of_joy_and_sorrow',
                description: 'talent_descr.linnea_tidings_of_joy_and_sorrow',
                info: {constellation: 2},
                rotation: 'party',
                hideInactive: true,
                levelSetting: 'party_moonsign',
                stats: [
                    new StatTable('crit_dmg_hydro', [C2PartyCritDmg, C2PartyCritDmg]),
                    new StatTable('crit_dmg_geo', [C2PartyCritDmg, C2PartyCritDmg]),
                ],
                condition: partyC2HydroGeoTarget,
            }),
            new ConditionBoolean({
                name: 'party.linnea_expert_instinct',
                serializeId: 6,
                title: 'talent_name.linnea_expert_instinct',
                description: 'talent_descr.linnea_expert_instinct',
                info: {constellation: 4},
                rotation: 'party',
                stats: {
                    def_percent: C4DefBonus,
                },
            }),
            new ConditionBoolean({
                name: 'party.linnea_golden_beagles_dream',
                serializeId: 7,
                title: 'talent_name.linnea_golden_beagles_dream',
                description: 'talent_descr.linnea_golden_beagles_dream',
                info: {constellation: 6},
                rotation: 'party',
            }),
            new Condition({
                isHidden: true,
                stats: {
                    dmg_lunarcrystallize_special: C6LunarCrystallizeElevate,
                },
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.linnea_golden_beagles_dream'}),
                    new ConditionBooleanValue({
                        setting: 'party_moonsign',
                        cond: 'ge',
                        value: 2,
                    }),
                ]),
            }),
        ],
        postEffects: [
            new PostEffectStats({
                from: 'linnea_def_total',
                percent: new StatTable('lunarcrystallize_multi', [PassiveLunarScale / 100]),
                statCap: new ValueTable([PassiveLunarScaleCap]),
            }),
            partyA4EmPost,
        ],
        multipliers: [
            new FeatureMultiplier({
                scaling: 'linnea_def_total',
                source: 'linnea_provisional_classification',
                values: new StatTable('party_linnea_provisional_classification', [ProvisionalClassificationFieldCatalogScale]),
                condition: new ConditionBoolean({name: 'party.linnea_provisional_classification'}),
                target: new FeatureMultiplierTarget({
                    tags: ['lunarcrystallize_reaction'],
                    options: ['reaction_flat'],
                }),
            }),
            new FeatureMultiplier({
                scaling: 'linnea_def_total',
                source: 'linnea_golden_beagles_dream',
                values: new StatTable('party_linnea_golden_beagles_dream', [C6ProvisionalClassificationExtraScale]),
                condition: new ConditionAnd([
                    new ConditionBoolean({name: 'party.linnea_provisional_classification'}),
                    new ConditionBoolean({name: 'party.linnea_golden_beagles_dream'}),
                ]),
                target: new FeatureMultiplierTarget({
                    tags: ['lunarcrystallize_reaction'],
                    options: ['reaction_flat'],
                }),
            }),
        ],
    },
});
