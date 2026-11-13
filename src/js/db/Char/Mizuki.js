import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionTeam } from "../../classes/Condition/Team";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionRadianceStellarGlimmer, RADIANCE_STELLARSWIRL } from "../../classes/Condition/RadianceStellarGlimmer";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamage } from "../../classes/Feature2/Damage";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureDamageStellarSwirl } from "../../classes/Feature2/Damage/StellarSwirl";
import { FeatureHeal } from "../../classes/Feature2/Heal";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsMastery } from "../../classes/PostEffect/Stats/Mastery";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Mizuki.s1_id,
        title: 'talent_name.yumemizuki_mizuki_pure_heart_pure_dreams',
        description: 'talent_descr.yumemizuki_mizuki_pure_heart_pure_dreams',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Mizuki.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Mizuki.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Mizuki.s1.p3),
            },
            {
                table:  new StatTable('charged_hit', charTalentTables.Mizuki.s1.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Mizuki.s1.p5),
            },
            {
                table: new StatTable('plunge', charTalentTables.Mizuki.s1.p6),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Mizuki.s1.p7),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Mizuki.s1.p8),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Mizuki.s2_id,
        title: 'talent_name.yumemizuki_mizuki_aisa_utamakura_pilgrimage',
        description: 'talent_descr.yumemizuki_mizuki_aisa_utamakura_pilgrimage',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.Mizuki.s2.p4),
            },
            {
                table: new StatTable('mizuki_continuous_attack_dmg', charTalentTables.Mizuki.s2.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('mizuki_duration', charTalentTables.Mizuki.s2.p5),
            },
            {
                digits: 2,
                table: new StatTable('mizuki_em_buff', charTalentTables.Mizuki.s2.p2),
            },
            {
                digits: 2,
                table: new StatTable('mizuki_stellarswirl_em_buff', charTalentTables.Mizuki.s2.p6),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Mizuki.s2.p3),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Mizuki.s3_id,
        title: 'talent_name.yumemizuki_mizuki_anraku_secret_spring_therapy',
        description: 'talent_descr.yumemizuki_mizuki_anraku_secret_spring_therapy',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Mizuki.s3.p1),
            },
            {
                table: new StatTable('mizuki_munen_shockwave_dmg', charTalentTables.Mizuki.s3.p2),
            },
            {
                type: 'shield',
                unit: 'mastery',
                table: [
                    new StatTable('mizuki_snack_heal', charTalentTables.Mizuki.s3.p3),
                    new StatTable('', charTalentTables.Mizuki.s3.p7),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Mizuki.s3.p6),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Mizuki.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Mizuki.s3.p5),
            },
        ],
    },
});

const A4Mastery = charTalentTables.Mizuki.a4.p1;
const C1SwirlBonus = percent(charTalentTables.Mizuki.c1.p1);
const C1StellarSwirlBonus = percent(charTalentTables.Mizuki.c1.p6);
const C1AnemoDmg = percent(charTalentTables.Mizuki.c1.p4);
const C1StellarSwirlDmg = percent(charTalentTables.Mizuki.c1.p5);
const C2ElemBonus = percent(charTalentTables.Mizuki.c2.p1);
const C2Resistance = -percent(charTalentTables.Mizuki.c2.p2);
const C4ExtraHeal = percent(charTalentTables.Mizuki.c4.p2);
const C6SwirlCritRate = percent(charTalentTables.Mizuki.c6.p1);
const C6SwirlCritDmg = 100;
const C6StellarSwirlCritRate = percent(charTalentTables.Mizuki.c6.p7);
const C6StellarSwirlCritDmg = percent(charTalentTables.Mizuki.c6.p8);
const C6CritRatePerEm = percent(charTalentTables.Mizuki.c6.p3);
const C6CritDmgPerEm = percent(charTalentTables.Mizuki.c6.p4);
const C6EmThreshold = charTalentTables.Mizuki.c6.p2;
const C6CritRateCap = percent(charTalentTables.Mizuki.c6.p5);
const C6CritDmgCap = percent(charTalentTables.Mizuki.c6.p6);
const VastDmg = percent(charTalentTables.Mizuki.sp.p1);
const VastMasteryRatio = charTalentTables.Mizuki.sp.p3;

const radianceSwirlName = 'mizuki_radiance_stellarswirl';

function radianceSwirlCondition() {
    return new ConditionRadianceStellarGlimmer({
        conductName: 'polestar_field',
        swirlName: radianceSwirlName,
        mode: RADIANCE_STELLARSWIRL,
    });
}

// The 7.0 talent table is displayed per 100 EM (18% / 1.8% at level 1),
// while PostEffectStatsMastery consumes a per-point rate.
const swirlEmBonusPerPoint = Talents.getMulti({
    from: 'skill.mizuki_em_buff',
    name: 'dmg_reaction_swirl',
    multi: 0.01,
});
const stellarSwirlEmBonusPerPoint = Talents.getMulti({
    from: 'skill.mizuki_stellarswirl_em_buff',
    name: 'dmg_stellarswirl',
    multi: 0.01,
});

const buffSwirl = new PostEffectStatsMastery({
    receivers: RECEIVERS.TEAM,
    levelSetting: 'char_skill_elemental',
    percent: swirlEmBonusPerPoint,
    // Game data: Avatar_Mizuki_MasteryToSwirhurt caches FIGHT_PROP_ELEMENT_MASTERY (total).
    reads: CHANNELS.TOTAL,
    conditions: [
        new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
    ],
});

const buffStellarSwirl = new PostEffectStatsMastery({
    receivers: RECEIVERS.TEAM,
    levelSetting: 'char_skill_elemental',
    percent: stellarSwirlEmBonusPerPoint,
    // Game data: Avatar_Mizuki_MasteryToSwirhurt caches FIGHT_PROP_ELEMENT_MASTERY (total).
    reads: CHANNELS.TOTAL,
    conditions: [
        new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
    ],
});

const buffVastMastery = new PostEffectStatsMastery({
    receivers: RECEIVERS.TEAM,
    percent: new StatTable('mastery', [VastMasteryRatio]),
    // Game data: Avatar_Mizuki_ExtraProudSkill reads FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY
    // into NonExtraMasteryCache and writes Actor_ElemMasteryExtraDelta: default.
    conditions: [
        new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
    ],
});

const buffElemental = new PostEffectStatsMastery({
    receivers: RECEIVERS.TEAM,
    percent: [
        new StatTable('dmg_pyro', [C2ElemBonus]),
        new StatTable('dmg_hydro', [C2ElemBonus]),
        new StatTable('dmg_electro', [C2ElemBonus]),
        new StatTable('dmg_cryo', [C2ElemBonus]),
    ],
    // Game data: Avatar_Mizuki_Talent_2 (gameplay C2) reads FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY
    // and writes Actor_*AddHurtExtraDelta: default (GO reads total here; the data overrules it).
    conditions: [
        new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
        new ConditionConstellation({constellation: 2}),
    ],
});

const buffC6CritRate = new PostEffectStatsMastery({
    percent: new StatTable('crit_rate', [C6CritRatePerEm]),
    exceed: C6EmThreshold,
    statCap: new ValueTable([C6CritRateCap]),
    // Game data: Avatar_Mizuki_Talent_6 (gameplay C6) reads FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY
    // and writes Actor_CriticalExtraDelta: default.
    conditions: [
        new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
        new ConditionConstellation({constellation: 6}),
    ],
});

const buffC6CritDmg = new PostEffectStatsMastery({
    percent: new StatTable('crit_dmg', [C6CritDmgPerEm]),
    exceed: C6EmThreshold,
    statCap: new ValueTable([C6CritDmgCap]),
    // Game data: Avatar_Mizuki_Talent_6 (gameplay C6) reads FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY
    // and writes Actor_CriticalHurtExtraDelta: default.
    conditions: [
        new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
        new ConditionConstellation({constellation: 6}),
    ],
});

export const Mizuki = new DbObjectChar({
    name: 'yumemizuki_mizuki',
    serializeId: 101,
    gameId: 10000109,
    iconClass: "char-icon-yumemizuki-mizuki",
    rarity: 5,
    element: 'anemo',
    weapon: 'catalyst',
    origin: 'inazuma',
    talents: Talents,
    statTable: charTables.Mizuki,
    features: [
        new FeatureDamageNormal({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamage({
            category: 'other',
            name: 'mizuki_vast_be_the_dream_dmg',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'special',
                    values: new ValueTable([VastDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
                new ConditionBoolean({name: 'mizuki_vast_be_the_dream'}),
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'other',
            name: 'mizuki_vast_be_the_dream_stellarswirl',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'special',
                    values: new ValueTable([VastDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
                new ConditionBoolean({name: 'mizuki_vast_be_the_dream'}),
                radianceSwirlCondition(),
            ]),
        }),
        new FeatureDamage({
            category: 'other',
            name: 'mizuki_moonlit_dream_attack',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation1',
                    values: new ValueTable([C1AnemoDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
                new ConditionBoolean({name: 'mizuki_in_mist_like_waters'}),
                new ConditionConstellation({constellation: 1}),
                new ConditionNot([radianceSwirlCondition()]),
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'other',
            name: 'mizuki_moonlit_dream_stellarswirl',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation1',
                    values: new ValueTable([C1StellarSwirlDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
                new ConditionBoolean({name: 'mizuki_in_mist_like_waters'}),
                new ConditionConstellation({constellation: 1}),
                radianceSwirlCondition(),
            ]),
        }),
        new FeatureDamageSkill({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.mizuki_continuous_attack_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.mizuki_munen_shockwave_dmg'),
                }),
            ],
        }),
        new FeatureHeal({
            name: 'mizuki_snack_other_heal',
            category: 'burst',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'mastery*',
                    leveling: 'char_skill_burst',
                    values: Talents.getList('burst.mizuki_snack_heal'),
                }),
            ],
        }),
        new FeatureHeal({
            name: 'mizuki_snack_self_heal',
            category: 'burst',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'mastery*',
                    leveling: 'char_skill_burst',
                    scalingMultiplier: 2,
                    scalingSource: 'mizuki_selfheal',
                    values: Talents.getList('burst.mizuki_snack_heal'),
                }),
            ],
        }),
        new FeatureHeal({
            name: 'mizuki_buds_warm_lucid_springs_heal',
            category: 'other',
            partyHeal: true,
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation4',
                    values: new ValueTable([C4ExtraHeal]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 4}),
        }),
        new FeaturePostEffectValue({
            category: 'skill',
            name: 'mizuki_swirl_bonus',
            postEffect: buffSwirl,
            format: 'percent',
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'mizuki_elemental_bonus',
            postEffect: buffElemental,
            format: 'percent',
            condition: new ConditionConstellation({constellation: 2}),
        }),
        new FeaturePostEffectValue({
            category: 'skill',
            name: 'mizuki_stellarswirl_bonus',
            postEffect: buffStellarSwirl,
            format: 'percent',
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'mizuki_dreamdrifter',
            serializeId: 1,
            title: 'talent_name.yumemizuki_mizuki_dreamdrifter',
            description: 'talent_descr.yumemizuki_mizuki_dreamdrifter',
        }),
        new ConditionStatic({
            title: 'talent_name.yumemizuki_mizuki_bright_moons_restless_voice',
            description: 'talent_descr.yumemizuki_mizuki_bright_moons_restless_voice',
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionBoolean({
            name: 'mizuki_thoughts_by_day_bring_dreams_by_night',
            serializeId: 2,
            title: 'talent_name.yumemizuki_mizuki_thoughts_by_day_bring_dreams_by_night',
            description: 'talent_descr.yumemizuki_mizuki_thoughts_by_day_bring_dreams_by_night',
            info: {ascension: 4},
            stats: {
                mastery: A4Mastery,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        new ConditionBoolean({
            name: 'mizuki_vast_be_the_dream',
            serializeId: 4,
            title: 'talent_name.yumemizuki_mizuki_vast_be_the_dream',
            description: 'talent_descr.yumemizuki_mizuki_vast_be_the_dream_1',
            info: {special: true},
            subConditions: [
                new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
            ],
        }),
        new ConditionBoolean({
            name: radianceSwirlName,
            serializeId: 5,
            title: 'talent_name.radiance_stellarswirl',
            description: 'talent_descr.yumemizuki_mizuki_vast_be_the_dream_2',
            info: {special: true},
            condition: new ConditionNot([
                new ConditionTeam({condition: new ConditionBoolean({name: 'polestar_field'})}),
            ]),
        }),
        new ConditionStatic({
            title: 'talent_name.yumemizuki_mizuki_vast_be_the_dream',
            description: 'talent_descr.yumemizuki_mizuki_vast_be_the_dream_3',
            info: {special: true},
            stats: {
                text_percent: VastMasteryRatio * 100,
            },
            condition: new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
        }),
    ],
    multipliers: [
        // Game data: Avatar_Mizuki_Talent_1_New (gameplay C1) caches FIGHT_PROP_ELEMENT_MASTERY
        // (total) as OwnerMasteryCache; scaling 'mastery*' already reads the total.
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'mastery*',
            source: 'constellation1',
            values: new ValueTable([C1SwirlBonus]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
                new ConditionBoolean({name: 'mizuki_in_mist_like_waters'}),
                new ConditionConstellation({constellation: 1}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['swirl'],
                options: ['reaction_flat'],
            }),
        }),
        new FeatureMultiplier({
            receivers: RECEIVERS.TEAM,
            scaling: 'mastery*',
            source: 'constellation1',
            values: new ValueTable([C1StellarSwirlBonus]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
                new ConditionBoolean({name: 'mizuki_in_mist_like_waters'}),
                new ConditionConstellation({constellation: 1}),
            ]),
            target: new FeatureMultiplierTarget({
                tags: ['stellarswirl_immediate'],
                options: ['stellarswirl_flat'],
            }),
        }),
    ],
    postEffects: [
        buffSwirl,
        buffStellarSwirl,
        buffVastMastery,
        buffElemental,
        buffC6CritRate,
        buffC6CritDmg,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'mizuki_in_mist_like_waters',
                    serializeId: 3,
                    title: 'talent_name.yumemizuki_mizuki_in_mist_like_waters',
                    description: 'talent_descr.yumemizuki_mizuki_in_mist_like_waters_buffed',
                    stats: {
                        text_percent_dmg: C1SwirlBonus,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
                    ],
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.yumemizuki_mizuki_your_echo_i_meet_in_dreams',
                    description: 'talent_descr.yumemizuki_mizuki_your_echo_i_meet_in_dreams_buffed',
                    stats: {
                        text_percent_dmg: C2ElemBonus,
                        enemy_res_pyro: C2Resistance,
                        enemy_res_hydro: C2Resistance,
                        enemy_res_cryo: C2Resistance,
                        enemy_res_electro: C2Resistance,
                        enemy_res_anemo: C2Resistance,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
                    ],
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
                new ConditionStatic({
                    title: 'talent_name.yumemizuki_mizuki_buds_warm_lucid_springs',
                    description: 'talent_descr.yumemizuki_mizuki_buds_warm_lucid_springs_buffed',
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
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.yumemizuki_mizuki_the_heart_lingers_long',
                    description: 'talent_descr.yumemizuki_mizuki_the_heart_lingers_long_buffed',
                    stats: {
                        crit_rate_swirl: C6SwirlCritRate,
                        crit_dmg_swirl: C6SwirlCritDmg,
                        crit_rate_stellarswirl: C6StellarSwirlCritRate,
                        crit_dmg_stellarswirl: C6StellarSwirlCritDmg,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'mizuki_dreamdrifter'}),
                    ],
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'number'], [3, 'checkbox'], [4, 'checkbox'], [5, 'checkbox'], [6, 'checkbox'], [7, 'checkbox']],
});
