import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdownTravelerResonated } from "../../classes/Condition/Dropdown/TravelerResonated";
import { ConditionLevelSelect } from "../../classes/Condition/LevelSelect";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionOr } from "../../classes/Condition/Or";
import {
    ConditionRadianceStellarGlimmer,
    RADIANCE_STELLARCONDUCT,
    RADIANCE_STELLARSWIRL,
} from "../../classes/Condition/RadianceStellarGlimmer";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageMultihit } from "../../classes/Feature2/Damage/Multihit";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureDamageStellarConduct } from "../../classes/Feature2/Damage/StellarConduct";
import {
    FeatureDamageStellarConductMultihit,
    FeatureDamageStellarSwirlMultihit,
} from "../../classes/Feature2/Damage/StellarMultihit";
import { FeatureDamageStellarSwirl } from "../../classes/Feature2/Damage/StellarSwirl";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierStatic } from "../../classes/Feature2/Multiplier/Static";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureStatic } from "../../classes/Feature2/Static";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../classes/StatTable";
import { StatTableAscensionScale } from "../../classes/StatTable/Ascension/Scale";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.TravelerCryo.s1_id,
        title: 'talent_name.traveler_foreign_permafrost',
        description: 'talent_descr.traveler_foreign_permafrost_1',
        items: [
            {table: new StatTable('normal_hit_1', charTalentTables.TravelerCryo.s1.p1)},
            {table: new StatTable('normal_hit_2', charTalentTables.TravelerCryo.s1.p2)},
            {table: new StatTable('normal_hit_3', charTalentTables.TravelerCryo.s1.p3)},
            {table: new StatTable('normal_hit_4', charTalentTables.TravelerCryo.s1.p4)},
            {table: new StatTable('normal_hit_5', charTalentTables.TravelerCryo.s1.p5)},
            {
                type: 'hits',
                name: 'charged_hit_total',
                table: [
                    new StatTable('charged_hit_1', charTalentTables.TravelerCryo.s1.p6),
                    new StatTable('charged_hit_2', charTalentTables.TravelerCryo.s1.p7),
                ],
            },
            {unit: 'unit', table: new StatTable('stamina_cost', charTalentTables.TravelerCryo.s1.p8)},
            {table: new StatTable('plunge', charTalentTables.TravelerCryo.s1.p9)},
            {table: new StatTable('plunge_low', charTalentTables.TravelerCryo.s1.p10)},
            {table: new StatTable('plunge_high', charTalentTables.TravelerCryo.s1.p11)},
        ],
    },
    skill: {
        gameId: charTalentTables.TravelerCryo.s2_id,
        title: 'talent_name.traveler_ice_fog_piercer',
        description: 'talent_descr.traveler_ice_fog_piercer',
        items: [
            {table: new StatTable('traveler_cryo_skill_dmg', charTalentTables.TravelerCryo.s2.p1)},
            {table: new StatTable('traveler_cryo_ice_crystal_dmg', charTalentTables.TravelerCryo.s2.p2)},
            {
                unit: 'sec',
                table: new StatTable('traveler_cryo_frostpierce_star_duration', charTalentTables.TravelerCryo.s2.p4),
            },
            {unit: 'sec', table: new StatTable('cd', charTalentTables.TravelerCryo.s2.p3)},
        ],
    },
    burst: {
        gameId: charTalentTables.TravelerCryo.s3_id,
        title: 'talent_name.traveler_frostbound_javelin',
        description: 'talent_descr.traveler_frostbound_javelin',
        items: [
            {table: new StatTable('traveler_cryo_ice_javelin', charTalentTables.TravelerCryo.s3.p1)},
            {table: new StatTable('traveler_cryo_frostglow_dmg_bonus', charTalentTables.TravelerCryo.s3.p2)},
            {
                table: new StatTable(
                    'traveler_cryo_ice_javelin_stellarconduct',
                    charTalentTables.TravelerCryo.s3.p8,
                ),
            },
            {
                table: new StatTable(
                    'traveler_cryo_frostglow_stellarconduct_dmg_bonus',
                    charTalentTables.TravelerCryo.s3.p9,
                ),
            },
            {
                table: new StatTable(
                    'traveler_cryo_ice_javelin_stellarswirl',
                    charTalentTables.TravelerCryo.s3.p10,
                ),
            },
            {
                table: new StatTable(
                    'traveler_cryo_frostglow_stellarswirl_dmg_bonus',
                    charTalentTables.TravelerCryo.s3.p11,
                ),
            },
            {unit: '', table: new StatTable('traveler_cryo_strikes', charTalentTables.TravelerCryo.s3.p3)},
            {
                unit: '',
                table: new StatTable(
                    'traveler_cryo_extra_strikes_max_frostglow',
                    charTalentTables.TravelerCryo.s3.p4,
                ),
            },
            {unit: 'sec', table: new StatTable('cd', charTalentTables.TravelerCryo.s3.p6)},
            {unit: '', table: new StatTable('energy_cost', charTalentTables.TravelerCryo.s3.p7)},
        ],
    },
    links: [10050001, 10050002, 11500004],
});

const A1AttackBonus = 80;
const A4EmScale = 8;
const A4EmCap = 160;
const GlimmerBaseScale = 0.35;
const GlimmerBaseCap = 7;
const RadianceSwirlDuration = 8;
const ForeignPermafrostBonus = 140;
const ForeignPermafrostFrostglow = 2;
const ForeignPermafrostCooldown = 15;
const C1Energy = 5;
const C2Mastery = 60;
const C2MasteryEnhanced = 120;
const C4DurationBonus = 3;
const C6GlimmerPerFrostglow = 5;

const radianceConductName = 'traveler_cryo_radiance_stellarconduct';
const radianceSwirlName = 'traveler_cryo_radiance_stellarswirl';
const radianceConductCondition = new ConditionRadianceStellarGlimmer({
    conductName: radianceConductName,
    swirlName: radianceSwirlName,
    mode: RADIANCE_STELLARCONDUCT,
});
const radianceSwirlCondition = new ConditionRadianceStellarGlimmer({
    conductName: radianceConductName,
    swirlName: radianceSwirlName,
    mode: RADIANCE_STELLARSWIRL,
});
const anyRadianceCondition = new ConditionOr([
    radianceConductCondition,
    radianceSwirlCondition,
]);
const noRadianceCondition = new ConditionNot([anyRadianceCondition]);
const frostpierceCondition = new ConditionBoolean({name: 'traveler_cryo_frostpierce_star'});
const frostglowMaxCondition = new ConditionBooleanValue({
    setting: 'traveler_cryo_frostglow',
    cond: 'ge',
    value: 8,
});
const icepointMaxCondition = new ConditionBooleanValue({
    setting: 'traveler_cryo_icepoint',
    cond: 'ge',
    value: 3,
});
const foreignPermafrostTag = 'traveler_cryo_freezing_ice';

const a1Condition = new ConditionAnd([
    new ConditionAscensionChar({ascension: 1}),
    frostpierceCondition,
    radianceConductCondition,
]);

const a4EmPost = new PostEffectStatsAtk({
    percent: new StatTable('mastery', [A4EmScale / 100]),
    statCap: new ValueTable([A4EmCap]),
    condition: new ConditionAscensionChar({ascension: 4}),
});

const glimmerBasePost = new PostEffectStatsAtk({
    percent: new StatTable('stellarglimmer_multi', [GlimmerBaseScale / 100]),
    statCap: new ValueTable([GlimmerBaseCap]),
});

function makeAttackMultiplier(name) {
    return new FeatureMultiplier({
        leveling: 'char_skill_attack',
        values: Talents.get('attack.' + name),
    });
}

const condTravelerAether = new ConditionBoolean({name: 'traveler_aether'});
const condLumineDefault = new ConditionNot([condTravelerAether]);

function makeChargedHit2Multipliers() {
    return [
        new FeatureMultiplier({
            leveling: 'char_skill_attack',
            values: Talents.get('attack.charged_hit_2'),
            condition: condLumineDefault,
        }),
        new FeatureMultiplier({
            leveling: 'char_skill_attack',
            values: new StatTable(
                'charged_hit_2',
                charTalentTables.TravelerCryo.s1_boy.p7,
            ),
            condition: condTravelerAether,
        }),
    ];
}

function makeFreezingIceHit(name) {
    return [
        ...(name === 'charged_hit_2'
            ? makeChargedHit2Multipliers()
            : [makeAttackMultiplier(name)]),
        new FeatureMultiplier({
            source: 'foreign_permafrost',
            values: new ValueTable([ForeignPermafrostBonus]),
        }),
    ];
}

function makeBurstMultipliers(baseName, frostglowName, total = false) {
    const baseMultiplier = total ? 3 : 1;
    const result = [
        new FeatureMultiplier({
            leveling: 'char_skill_burst',
            scalingMultiplier: baseMultiplier,
            scalingSource: 'traveler_cryo_strikes',
            values: Talents.get('burst.' + baseName),
        }),
        new FeatureMultiplier({
            leveling: 'char_skill_burst',
            scalingMultiplier: baseMultiplier,
            scalingSource: 'traveler_cryo_strikes',
            stacksLeveling: 'traveler_cryo_frostglow',
            maxStacks: 8,
            values: Talents.get('burst.' + frostglowName),
        }),
    ];

    if (total) {
        result.push(
            new FeatureMultiplier({
                leveling: 'char_skill_burst',
                scalingMultiplier: 2,
                scalingSource: 'traveler_cryo_extra_strikes_max_frostglow',
                values: Talents.get('burst.' + baseName),
                condition: frostglowMaxCondition,
            }),
            new FeatureMultiplier({
                leveling: 'char_skill_burst',
                scalingMultiplier: 2,
                scalingSource: 'traveler_cryo_extra_strikes_max_frostglow',
                stacksLeveling: 'traveler_cryo_frostglow',
                maxStacks: 8,
                values: Talents.get('burst.' + frostglowName),
                condition: frostglowMaxCondition,
            }),
        );
    }

    return result;
}

function makeFreezingIceItems() {
    return [
        {multipliers: makeFreezingIceHit('charged_hit_1')},
        {multipliers: makeFreezingIceHit('charged_hit_2')},
    ];
}

export const TravelerCryo = new DbObjectChar({
    name: 'traveler_cryo',
    serializeId: 124,
    gameId: [10000005, 10000007],
    depotIds: [505, 705],
    iconClass: 'char-icon-traveler-girl',
    rarity: 5,
    element: 'cryo',
    weapon: 'sword',
    origin: 'foreign',
    talents: Talents,
    statTable: [
        ...charTables.Traveler,
        new StatTableAscensionScale({
            stat: 'burst_energy_cost',
            base: Talents.get('burst.energy_cost').getValue(1),
        }),
    ],
    features: [
        ...['normal_hit_1', 'normal_hit_2', 'normal_hit_3', 'normal_hit_4', 'normal_hit_5'].map(name =>
            new FeatureDamageNormal({
                name,
                multipliers: [makeAttackMultiplier(name)],
            })
        ),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'charged',
            name: 'charged_hit_total',
            allowInfusion: true,
            items: [
                {multipliers: [makeAttackMultiplier('charged_hit_1')]},
                {multipliers: makeChargedHit2Multipliers()},
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit_1',
            isChild: true,
            multipliers: [makeAttackMultiplier('charged_hit_1')],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit_2',
            isChild: true,
            multipliers: makeChargedHit2Multipliers(),
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
            multipliers: [makeAttackMultiplier('plunge')],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_low',
            multipliers: [makeAttackMultiplier('plunge_low')],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            multipliers: [makeAttackMultiplier('plunge_high')],
        }),
        new FeatureDamageSkill({
            name: 'traveler_cryo_skill_dmg',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.traveler_cryo_skill_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'traveler_cryo_ice_crystal_dmg',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.traveler_cryo_ice_crystal_dmg'),
                }),
            ],
            condition: frostpierceCondition,
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'charged',
            name: 'traveler_cryo_freezing_ice',
            element: 'cryo',
            allowInfusion: true,
            tags: [foreignPermafrostTag],
            items: makeFreezingIceItems(),
            condition: new ConditionAnd([
                icepointMaxCondition,
                noRadianceCondition,
            ]),
        }),
        ...makeFreezingIceItems().map((item, index) => new FeatureDamageCharged({
            name: 'traveler_cryo_freezing_ice_' + (index + 1),
            isChild: true,
            element: 'cryo',
            tags: [foreignPermafrostTag],
            multipliers: item.multipliers,
            condition: new ConditionAnd([
                icepointMaxCondition,
                noRadianceCondition,
            ]),
        })),
        new FeatureDamageStellarConductMultihit({
            category: 'attack',
            name: 'traveler_cryo_freezing_ice_stellarconduct',
            element: 'cryo',
            tags: [foreignPermafrostTag],
            items: makeFreezingIceItems(),
            condition: new ConditionAnd([
                icepointMaxCondition,
                radianceConductCondition,
            ]),
        }),
        ...makeFreezingIceItems().map((item, index) => new FeatureDamageStellarConduct({
            category: 'attack',
            name: 'traveler_cryo_freezing_ice_stellarconduct_' + (index + 1),
            isChild: true,
            element: 'cryo',
            tags: [foreignPermafrostTag],
            multipliers: item.multipliers,
            condition: new ConditionAnd([
                icepointMaxCondition,
                radianceConductCondition,
            ]),
        })),
        new FeatureDamageStellarSwirlMultihit({
            category: 'attack',
            name: 'traveler_cryo_freezing_ice_stellarswirl',
            element: 'cryo',
            tags: [foreignPermafrostTag],
            items: makeFreezingIceItems(),
            condition: new ConditionAnd([
                icepointMaxCondition,
                radianceSwirlCondition,
            ]),
        }),
        ...makeFreezingIceItems().map((item, index) => new FeatureDamageStellarSwirl({
            category: 'attack',
            name: 'traveler_cryo_freezing_ice_stellarswirl_' + (index + 1),
            isChild: true,
            element: 'cryo',
            tags: [foreignPermafrostTag],
            multipliers: item.multipliers,
            condition: new ConditionAnd([
                icepointMaxCondition,
                radianceSwirlCondition,
            ]),
        })),
        new FeatureDamageBurst({
            name: 'traveler_cryo_ice_javelin',
            element: 'cryo',
            multipliers: makeBurstMultipliers(
                'traveler_cryo_ice_javelin',
                'traveler_cryo_frostglow_dmg_bonus',
            ),
            condition: noRadianceCondition,
        }),
        new FeatureDamageBurst({
            name: 'traveler_cryo_frostbound_javelin_total',
            element: 'cryo',
            multipliers: makeBurstMultipliers(
                'traveler_cryo_ice_javelin',
                'traveler_cryo_frostglow_dmg_bonus',
                true,
            ),
            condition: noRadianceCondition,
        }),
        new FeatureDamageStellarConduct({
            category: 'burst',
            name: 'traveler_cryo_ice_javelin_stellarconduct',
            element: 'cryo',
            multipliers: makeBurstMultipliers(
                'traveler_cryo_ice_javelin_stellarconduct',
                'traveler_cryo_frostglow_stellarconduct_dmg_bonus',
            ),
            condition: radianceConductCondition,
        }),
        new FeatureDamageStellarConduct({
            category: 'burst',
            name: 'traveler_cryo_frostbound_javelin_stellarconduct_total',
            element: 'cryo',
            multipliers: makeBurstMultipliers(
                'traveler_cryo_ice_javelin_stellarconduct',
                'traveler_cryo_frostglow_stellarconduct_dmg_bonus',
                true,
            ),
            condition: radianceConductCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'burst',
            name: 'traveler_cryo_ice_javelin_stellarswirl',
            element: 'cryo',
            multipliers: makeBurstMultipliers(
                'traveler_cryo_ice_javelin_stellarswirl',
                'traveler_cryo_frostglow_stellarswirl_dmg_bonus',
            ),
            condition: radianceSwirlCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'burst',
            name: 'traveler_cryo_frostbound_javelin_stellarswirl_total',
            element: 'cryo',
            multipliers: makeBurstMultipliers(
                'traveler_cryo_ice_javelin_stellarswirl',
                'traveler_cryo_frostglow_stellarswirl_dmg_bonus',
                true,
            ),
            condition: radianceSwirlCondition,
        }),
        new FeatureStatic({
            category: 'skill',
            name: 'traveler_cryo_frostpierce_star_duration',
            format: 'decimal',
            multipliers: [
                new FeatureMultiplierStatic({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.traveler_cryo_frostpierce_star_duration'),
                }),
                new FeatureMultiplierStatic({
                    source: 'constellation4',
                    values: new ValueTable([C4DurationBonus]),
                    condition: new ConditionConstellation({constellation: 4}),
                }),
            ],
        }),
        new FeatureStatic({
            category: 'other',
            name: 'traveler_cryo_freezing_ice_frostglow',
            multipliers: [
                new FeatureMultiplierStatic({
                    source: 'foreign_permafrost',
                    values: new ValueTable([ForeignPermafrostFrostglow]),
                }),
            ],
            condition: icepointMaxCondition,
        }),
        new FeatureStatic({
            category: 'other',
            name: 'traveler_cryo_freezing_ice_cooldown',
            format: 'decimal',
            multipliers: [
                new FeatureMultiplierStatic({
                    source: 'foreign_permafrost',
                    values: new ValueTable([ForeignPermafrostCooldown]),
                }),
            ],
            condition: icepointMaxCondition,
        }),
        new FeatureStatic({
            category: 'other',
            name: 'traveler_cryo_somber_freeze_energy',
            multipliers: [
                new FeatureMultiplierStatic({
                    source: 'constellation1',
                    values: new ValueTable([C1Energy]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 1}),
                anyRadianceCondition,
            ]),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'traveler_cryo_lucent_ice_mastery',
            postEffect: a4EmPost,
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'traveler_cryo_illusory_frostmirror_base_dmg',
            postEffect: glimmerBasePost,
            format: 'percent',
        }),
    ],
    conditions: [
        new Condition({settings: {
            allowed_stellarconduct: 1,
            allowed_stellarswirl: 1,
        }}),
        new ConditionBoolean({
            name: radianceConductName,
            serializeId: 1,
            title: 'talent_name.radiance_stellarconduct',
            description: 'talent_descr.traveler_illusory_frostmirror_1',
            info: {special: true},
            rotation: 'self',
            condition: new ConditionBoolean({name: 'polestar_field'}),
        }),
        new ConditionBoolean({
            name: radianceSwirlName,
            serializeId: 2,
            title: 'talent_name.radiance_stellarswirl',
            description: 'talent_descr.traveler_illusory_frostmirror_2',
            info: {special: true},
            rotation: 'self',
            stats: {
                text_duration: RadianceSwirlDuration,
            },
            condition: new ConditionNot([
                new ConditionBoolean({name: radianceConductName}),
            ]),
        }),
        new ConditionStatic({
            title: 'talent_name.traveler_illusory_frostmirror',
            description: 'talent_descr.traveler_illusory_frostmirror_3',
            info: {special: true},
            stats: {
                text_percent: GlimmerBaseScale,
                text_percent_max: GlimmerBaseCap,
            },
        }),
        new ConditionBoolean({
            name: 'traveler_cryo_frostpierce_star',
            serializeId: 3,
            title: 'talent_name.traveler_ice_fog_piercer',
            description: 'talent_descr.traveler_ice_fog_piercer',
            rotation: 'self',
        }),
        new ConditionStacks({
            name: 'traveler_cryo_frostglow',
            serializeId: 4,
            title: 'talent_name.n10050002',
            description: 'talent_descr.n10050002',
            maxStacks: 8,
            noStat: true,
            rotation: 'self',
        }),
        new ConditionStacks({
            name: 'traveler_cryo_icepoint',
            serializeId: 5,
            title: 'talent_name.traveler_cryo_icepoint',
            description: 'talent_descr.traveler_foreign_permafrost_2',
            maxStacks: 3,
            noStat: true,
            rotation: 'self',
        }),
        new ConditionDropdownTravelerResonated({
            name: 'traveler_cryo_resonated_elements',
            serializeId: 6,
        }),
        new ConditionStatic({
            title: 'talent_name.traveler_ever_keen_frost',
            description: 'talent_descr.traveler_ever_keen_frost',
            info: {ascension: 1},
            stats: {text_percent_atk: A1AttackBonus},
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.traveler_ever_keen_frost',
            description: 'talent_descr.traveler_ever_keen_frost',
            settings: {attack_infusion: 'cryo'},
            condition: a1Condition,
            isHidden: true,
        }),
        new ConditionStatic({
            title: 'talent_name.traveler_lucent_ice',
            description: 'talent_descr.traveler_lucent_ice',
            info: {ascension: 4},
            stats: {
                text_percent: A4EmScale,
                text_value: A4EmCap,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionBoolean({
            name: 'traveler_swordfighting_techniques',
            serializeId: 9,
            title: 'talent_name.traveler_swordfighting_techniques',
            description: 'talent_descr.traveler_swordfighting_techniques',
            stats: {atk_base: 3},
        }),
        new ConditionBoolean({
            name: 'traveler_special_training',
            serializeId: 10,
            title: 'talent_name.traveler_special_training',
            description: 'talent_descr.traveler_special_training',
            stats: {
                atk_base: 7,
                mastery: 15,
                hp_base: 50,
            },
        }),
        new ConditionBoolean({
            name: 'traveler_aether',
            serializeId: 11,
            title: 'talent_name.traveler_twin_aether',
            description: 'talent_descr.traveler_twin_aether',
            rotation: 'self',
        }),
    ],
    multipliers: [
        new FeatureMultiplier({
            source: 'ascension1',
            values: new ValueTable([A1AttackBonus]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal', 'charged', 'plunge'],
                tagsExclude: [foreignPermafrostTag],
            }),
            condition: a1Condition,
        }),
    ],
    postEffects: [
        a4EmPost,
        glimmerBasePost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.traveler_somber_freeze',
                    description: 'talent_descr.traveler_somber_freeze',
                    stats: {text_value: C1Energy},
                }),
            ],
        },
        {
            conditions: [
                new ConditionLevelSelect({
                    name: 'traveler_cryo_frostfall_reverberation',
                    serializeId: 8,
                    title: 'talent_name.traveler_frostfall_reverberation',
                    description: 'talent_descr.traveler_frostfall_reverberation',
                    maxStacks: 2,
                    rotation: 'self',
                    stats: [new StatTable('mastery', [C2Mastery, C2MasteryEnhanced])],
                }),
            ],
        },
        {conditions: [new Condition({settings: {char_skill_burst_bonus: 3}})]},
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.traveler_enduring_ice',
                    description: 'talent_descr.traveler_enduring_ice',
                    stats: {text_duration: C4DurationBonus},
                }),
            ],
        },
        {conditions: [new Condition({settings: {char_skill_elemental_bonus: 3}})]},
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.traveler_brumal_grimfrost',
                    description: 'talent_descr.traveler_brumal_grimfrost',
                    stats: {text_percent: C6GlimmerPerFrostglow},
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['atk_total'],
        },
        conditions: [
            new ConditionNumber({
                name: 'traveler_cryo_atk_total',
                title: 'talent_name.stats_total_atk',
                partyStat: 'atk_total',
                serializeId: 1,
                rotation: 'party',
                max: 10000,
            }),
            new Condition({settings: {
                allowed_stellarconduct: 1,
                allowed_stellarswirl: 1,
            }}),
            new ConditionLevelSelect({
                name: 'party.traveler_cryo_frostfall_reverberation',
                serializeId: 2,
                title: 'talent_name.traveler_frostfall_reverberation',
                description: 'talent_descr.traveler_frostfall_reverberation',
                info: {constellation: 2},
                maxStacks: 2,
                rotation: 'party',
                stats: [new StatTable('mastery', [C2Mastery, C2MasteryEnhanced])],
            }),
            new ConditionStacks({
                name: 'party.traveler_cryo_brumal_grimfrost',
                serializeId: 3,
                title: 'talent_name.traveler_brumal_grimfrost',
                description: 'talent_descr.traveler_brumal_grimfrost',
                info: {constellation: 6},
                maxStacks: 8,
                rotation: 'party',
                stats: [new StatTable('dmg_stellarglimmer', [C6GlimmerPerFrostglow])],
            }),
        ],
        postEffects: [
            new PostEffectStats({
                from: 'traveler_cryo_atk_total',
                percent: new StatTable('stellarglimmer_multi', [GlimmerBaseScale / 100]),
                statCap: new ValueTable([GlimmerBaseCap]),
            }),
        ],
    },
});
