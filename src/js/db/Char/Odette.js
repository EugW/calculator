import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionTeam } from "../../classes/Condition/Team";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionOr } from "../../classes/Condition/Or";
import {
    ConditionRadianceStellarGlimmer,
    RADIANCE_STELLARCONDUCT,
    RADIANCE_STELLARSWIRL,
} from "../../classes/Condition/RadianceStellarGlimmer";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionStaticLevel } from "../../classes/Condition/Static/Level";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageMultihit } from "../../classes/Feature2/Damage/Multihit";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureDamageStellarConduct } from "../../classes/Feature2/Damage/StellarConduct";
import { FeatureDamageStellarSwirl } from "../../classes/Feature2/Damage/StellarSwirl";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../classes/StatTable";
import { StatTableConditions } from "../../classes/StatTable/Condition";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Odette.s1_id,
        title: 'talent_name.odette_snow_swan_variation',
        description: 'talent_descr.odette_snow_swan_variation',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Odette.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Odette.s1.p2),
            },
            {
                type: 'hits',
                name: 'normal_hit_3',
                table: [
                    new StatTable('normal_hit_3_1', charTalentTables.Odette.s1.p3),
                    new StatTable('normal_hit_3_2', charTalentTables.Odette.s1.p4),
                ],
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Odette.s1.p5),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Odette.s1.p6),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Odette.s1.p7),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Odette.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Odette.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Odette.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Odette.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Odette.s2_id,
        title: 'talent_name.odette_phantom_night_dancers',
        description: 'talent_descr.odette_phantom_night_dancers',
        items: [
            {
                table: new StatTable('odette_phantom_night_dancers', charTalentTables.Odette.s2.p1),
            },
            {
                table: new StatTable('odette_coda_dot', charTalentTables.Odette.s2.p2),
            },
            {
                table: new StatTable('odette_coda_stellarconduct', charTalentTables.Odette.s2.p3),
            },
            {
                table: new StatTable('odette_coda_stellarswirl', charTalentTables.Odette.s2.p4),
            },
            {
                table: new StatTable('odette_plume', charTalentTables.Odette.s2.p5),
            },
            {
                table: new StatTable('odette_plume_stellarconduct', charTalentTables.Odette.s2.p6),
            },
            {
                table: new StatTable('odette_plume_stellarswirl', charTalentTables.Odette.s2.p7),
            },
            {
                table: new StatTable('odette_wing', charTalentTables.Odette.s2.p8),
            },
            {
                table: new StatTable('odette_wing_stellarconduct', charTalentTables.Odette.s2.p9),
            },
            {
                table: new StatTable('odette_wing_stellarswirl', charTalentTables.Odette.s2.p10),
            },
            {
                unit: 'sec',
                table: new StatTable('odette_solo_dance_double_duration', charTalentTables.Odette.s2.p11),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Odette.s2.p12),
            },
            {
                unit: 'sec',
                table: new StatTable('odette_coda_cooldown', charTalentTables.Odette.s2.p13),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Odette.s3_id,
        title: 'talent_name.odette_bluebird_finale',
        description: 'talent_descr.odette_bluebird_finale',
        items: [
            {
                table: new StatTable('odette_bluebird_slash', charTalentTables.Odette.s3.p1),
            },
            {
                table: new StatTable('odette_bluebird_final_slash', charTalentTables.Odette.s3.p2),
            },
            {
                table: new StatTable('odette_snow_swans_dream_bonus', charTalentTables.Odette.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('odette_snow_swans_dream_duration', charTalentTables.Odette.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('odette_solo_dance_double_duration', charTalentTables.Odette.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Odette.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Odette.s3.p7),
            },
        ],
    },
    links: [11500001, 11500002, 11500003, 11500004],
});

const CodaAvailabilityDuration = 6;
const MarvelousSplendorBaseStacks = charTalentTables.Odette.a1.p1;
const C1AdditionalSplendorStacks = charTalentTables.Odette.c1.p1;
const MarvelousSplendorDmg = percent(charTalentTables.Odette.a1.p2);
const A4AtkThreshold = charTalentTables.Odette.a4.p1;
const A4BaseScalePer100Atk = percent(charTalentTables.Odette.a4.p2);
const A4BaseScaleCap = percent(charTalentTables.Odette.a4.p3);
const RadianceBaseScalePer100Atk = percent(charTalentTables.Odette.a0.p1);
const RadianceBaseScaleCap = percent(charTalentTables.Odette.a0.p2);
const RadianceSwirlDuration = 8;
const C1CodaConductDmg = percent(charTalentTables.Odette.c1.p4);
const C1CodaSwirlDmg = percent(charTalentTables.Odette.c1.p5);
const C2AtkPerStack = percent(charTalentTables.Odette.c2.p1);
const C2ElementalRes = -percent(charTalentTables.Odette.c2.p2);
const C4PartySnowSwanRatio = charTalentTables.Odette.c4.p4;
const C4CoordinatedConductDmg = percent(charTalentTables.Odette.c4.p1);
const C4CoordinatedSwirlDmg = percent(charTalentTables.Odette.c4.p2);
const C4CoordinatedCooldown = charTalentTables.Odette.c4.p3;
const C6SplendorElevation = percent(charTalentTables.Odette.c6.p1);
const C6OdetteElevation = percent(charTalentTables.Odette.c6.p2);

const doubleName = 'odette_solo_dance_double';
const codaName = 'odette_coda_at_dawns_tolling';
const splendorName = 'odette_marvelous_splendor';
const splendorOthersName = 'odette_marvelous_splendor_others';
const radianceConductName = 'odette_radiance_stellarconduct';
const radianceSwirlName = 'odette_radiance_stellarswirl';

const doubleCondition = new ConditionBoolean({name: doubleName});
const codaCondition = new ConditionAnd([
    doubleCondition,
    new ConditionBoolean({name: codaName}),
]);
const radianceConductCondition = new ConditionRadianceStellarGlimmer({
    conductName: radianceConductName,
    swirlName: radianceSwirlName,
    mode: RADIANCE_STELLARCONDUCT,
    condition: new ConditionTeam({condition: new ConditionBoolean({name: 'polestar_field'})}),
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
const conductOrNoRadianceCondition = new ConditionNot([
    radianceSwirlCondition,
]);

// A4 (Pathetique of Pateticheskaya): self Stellar Glimmer base bonus from ATK.
// Game data: Avatar_Odette_PermanentSkill_2 reads FIGHT_PROP_CUR_ATTACK
// (total) into _ABILITY_Odette_Talent2_AttackCache, computes
// (cache - Talent2_AttackThreshold) x Talent2_DamageUpPer100Attack x 0.01
// (cap Talent2_MaxDamageUpRatio; ProudSkill Odette_PermanentSkill_2 =
// [1000, 0.015, 0.30], GO: prod(input.total.atk - thresh, ...) into the
// stellar multiplier), applied as _ABILITY_Odette_Talent2_StarReactDamageUpRatio
// = 1 + ratio on the stellar hits (FIGHT_PROP_CUR_ATTACK x ... x ratio).
// stellarglimmer_multi has no extra lane, so only the read matters: TOTAL.
const a4BasePost = new PostEffectStatsAtk({
    reads: CHANNELS.TOTAL,
    percent: new StatTable('stellarglimmer_multi', [A4BaseScalePer100Atk / 100]),
    exceed: A4AtkThreshold,
    statCap: new ValueTable([A4BaseScaleCap]),
    condition: new ConditionAscensionChar({ascension: 4}),
});
// Radiance (Dance of Aurore): team Stellar Glimmer base bonus from ATK.
// Game data: Avatar_Odette_PermanentSkill_3 sets it with
// SetNewElementReactionBaseDamageRatioParam (AttackTransferRatio x 0.01, cap
// MaxTransRatio; ProudSkill Odette_PermanentSkill_3 = [0.007, 0.14]), which
// names no premod/total read: the engine resolves the ATK stat itself. The
// same call reads the total ATK in game
// (Ineffa's Benediction, in-game test: md/buff_chains.md), as GO does
// (input.total.atk).
const radianceBasePost = new PostEffectStatsAtk({
    receivers: RECEIVERS.TEAM,
    reads: CHANNELS.TOTAL,
    percent: new StatTable('stellarglimmer_multi', [RadianceBaseScalePer100Atk / 100]),
    statCap: new ValueTable([RadianceBaseScaleCap]),
    condition: anyRadianceCondition,
});

function attackMultiplier(name) {
    return new FeatureMultiplier({
        leveling: 'char_skill_attack',
        values: Talents.get('attack.' + name),
    });
}

function skillMultiplier(name) {
    return new FeatureMultiplier({
        leveling: 'char_skill_elemental',
        values: Talents.get('skill.' + name),
    });
}

function burstMultiplier(name) {
    return new FeatureMultiplier({
        leveling: 'char_skill_burst',
        values: Talents.get('burst.' + name),
    });
}

export const Odette = new DbObjectChar({
    name: 'odette',
    serializeId: 126,
    gameId: 10000150,
    iconClass: 'char-icon-odette',
    rarity: 5,
    element: 'cryo',
    weapon: 'sword',
    origin: 'snezhnaya',
    talents: Talents,
    statTable: charTables.Odette,
    // Talent damage hits (normal/charged/plunge, skill, burst, C1 and C4
    // coordinated Stellar hits) read the total ATK: the game computes them
    // from FIGHT_PROP_CUR_ATTACK (e.g. skill/constellation damage entries
    // scale Talent_DamagePercentage x FIGHT_PROP_CUR_ATTACK x
    // _ABILITY_Odette_Talent2_StarReactDamageUpRatio). Damage multipliers
    // need nothing. dmg_stellarglimmer / dmg_stellarglimmer_special below are
    // reaction bonus buckets with no extra lane.
    features: [
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            multipliers: [attackMultiplier('normal_hit_1')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            multipliers: [attackMultiplier('normal_hit_2')],
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_3',
            allowInfusion: true,
            items: [
                {multipliers: [attackMultiplier('normal_hit_3_1')]},
                {multipliers: [attackMultiplier('normal_hit_3_2')]},
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3_1',
            isChild: true,
            multipliers: [attackMultiplier('normal_hit_3_1')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3_2',
            isChild: true,
            multipliers: [attackMultiplier('normal_hit_3_2')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4',
            multipliers: [attackMultiplier('normal_hit_4')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5',
            multipliers: [attackMultiplier('normal_hit_5')],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit',
            multipliers: [attackMultiplier('charged_hit')],
        }),
        new FeatureDamagePlungeCollision({
            name: 'plunge',
            multipliers: [attackMultiplier('plunge')],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_low',
            multipliers: [attackMultiplier('plunge_low')],
        }),
        new FeatureDamagePlungeShockWave({
            name: 'plunge_high',
            multipliers: [attackMultiplier('plunge_high')],
        }),
        new FeatureDamageSkill({
            name: 'odette_phantom_night_dancers',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_phantom_night_dancers')],
        }),
        new FeatureDamageSkill({
            name: 'odette_coda_dot',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_coda_dot')],
            condition: codaCondition,
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'odette_coda_stellarconduct',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_coda_stellarconduct')],
            condition: new ConditionAnd([
                codaCondition,
                conductOrNoRadianceCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'odette_coda_stellarswirl',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_coda_stellarswirl')],
            condition: new ConditionAnd([
                codaCondition,
                radianceSwirlCondition,
            ]),
        }),
        new FeatureDamageSkill({
            name: 'odette_plume',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_plume')],
            condition: doubleCondition,
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'odette_plume_stellarconduct',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_plume_stellarconduct')],
            condition: new ConditionAnd([
                codaCondition,
                radianceConductCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'odette_plume_stellarswirl',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_plume_stellarswirl')],
            condition: new ConditionAnd([
                codaCondition,
                radianceSwirlCondition,
            ]),
        }),
        new FeatureDamageSkill({
            name: 'odette_wing',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_wing')],
            condition: doubleCondition,
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'odette_wing_stellarconduct',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_wing_stellarconduct')],
            condition: new ConditionAnd([
                codaCondition,
                radianceConductCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'odette_wing_stellarswirl',
            element: 'cryo',
            multipliers: [skillMultiplier('odette_wing_stellarswirl')],
            condition: new ConditionAnd([
                codaCondition,
                radianceSwirlCondition,
            ]),
        }),
        new FeatureDamageBurst({
            name: 'odette_bluebird_slash',
            element: 'cryo',
            multipliers: [burstMultiplier('odette_bluebird_slash')],
        }),
        new FeatureDamageBurst({
            name: 'odette_bluebird_final_slash',
            element: 'cryo',
            multipliers: [burstMultiplier('odette_bluebird_final_slash')],
        }),
        new FeatureDamageStellarConduct({
            category: 'skill',
            name: 'odette_c1_coda_stellarconduct',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation1',
                    values: new ValueTable([C1CodaConductDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 1}),
                codaCondition,
                conductOrNoRadianceCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'odette_c1_coda_stellarswirl',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation1',
                    values: new ValueTable([C1CodaSwirlDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 1}),
                codaCondition,
                radianceSwirlCondition,
            ]),
        }),
        new FeatureDamageStellarConduct({
            category: 'other',
            name: 'odette_c4_coordinated_stellarconduct',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new ValueTable([C4CoordinatedConductDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                conductOrNoRadianceCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'other',
            name: 'odette_c4_coordinated_stellarswirl',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new ValueTable([C4CoordinatedSwirlDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                radianceSwirlCondition,
            ]),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'odette_pathetique_base_bonus',
            postEffect: a4BasePost,
            format: 'percent',
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'odette_radiance_base_bonus',
            postEffect: radianceBasePost,
            format: 'percent',
            condition: anyRadianceCondition,
        }),
    ],
    conditions: [
        new Condition({
            receivers: RECEIVERS.TEAM,
            settings: {
                allowed_stellarconduct: 1,
                allowed_stellarswirl: 1,
            },
        }),
        new ConditionBoolean({
            name: doubleName,
            serializeId: 1,
            title: 'talent_name.n11500001',
            description: 'talent_descr.n11500001',
            rotation: 'self',
        }),
        new ConditionBoolean({
            name: codaName,
            serializeId: 2,
            title: 'talent_name.n11500002',
            description: 'talent_descr.n11500002',
            rotation: 'self',
            stats: {
                text_duration: CodaAvailabilityDuration,
            },
            subConditions: [doubleCondition],
        }),
        // Apply C5 before Snow Swan's Dream reads the Burst table. Constellation
        // conditions are otherwise appended after regular character conditions.
        new Condition({
            isHidden: true,
            settings: {
                char_skill_burst_bonus: 3,
            },
            condition: new ConditionConstellation({constellation: 5}),
        }),
        // Snow Swan's Dream: flat Stellar DMG bonus from the burst table
        // (game: Actor_ElemReactStarSConduct/Swirl...Delta =
        // Burst_StarReact_DamageUp_Ratio); the C4 party copy is half of it
        // (game: x C4_FinalAct_TeamDamageUp_Ratio = 0.5). Flat conditions,
        // always premod; need nothing.
        new ConditionBooleanLevels({
            name: 'odette_snow_swans_dream',
            serializeId: 3,
            title: 'talent_name.odette_snow_swans_dream',
            description: 'talent_descr.odette_snow_swans_dream',
            rotation: 'self',
            levelSetting: 'char_skill_burst',
            stats: [
                Talents.getAlias('burst.odette_snow_swans_dream_bonus', 'dmg_stellarglimmer'),
            ],
        }),
        // C4: "when Odette obtains Snow Swan's Dream, Stellar Glimmer reaction
        // DMG dealt by other nearby party members is increased by 50% of Snow
        // Swan Dream's effects", at Odette's burst level.
        new ConditionStaticLevel({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            levelSetting: 'char_skill_burst',
            stats: [
                Talents.getMulti({
                    name: 'dmg_stellarglimmer',
                    from: 'burst.odette_snow_swans_dream_bonus',
                    multi: C4PartySnowSwanRatio,
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 4}),
                new ConditionBoolean({name: 'odette_snow_swans_dream'}),
            ]),
        }),
        // Marvelous Splendor: "When Odette is off-field, she loses 1 stack of
        // Marvelous Splendor every 1 second, while other nearby party members
        // gain the corresponding number of Marvelous Splendor stacks at the
        // same time." Odette's own stacks and the stacks the other members
        // hold are separate counts.
        // Marvelous Splendor: flat per-stack Stellar DMG (Talent1_DamagePerLayer
        // = 15%, ProudSkill Odette_PermanentSkill_1) written in game as
        // Actor_ElemReactStarSConduct/Swirl...Delta (plain, no "Extra"), and
        // C2 ATK% (C2_AtkPerLayer = 7%, constellation_2 paramList) written as
        // Actor_AttackRatio (premod, no "Extra"). Conditions are always
        // premod, so the default is confirmed; needs nothing.
        new ConditionStacks({
            name: splendorName,
            serializeId: 4,
            title: 'talent_name.n11500003',
            description: 'talent_descr.n11500003',
            info: {ascension: 1},
            rotation: 'self',
            maxStacks: settings => settings.char_constellation >= 1
                ? MarvelousSplendorBaseStacks + C1AdditionalSplendorStacks
                : MarvelousSplendorBaseStacks,
            stats: [
                new StatTable('dmg_stellarglimmer', [MarvelousSplendorDmg]),
                new StatTableConditions('atk_percent', [C2AtkPerStack], [
                    new ConditionConstellation({constellation: 2}),
                ]),
            ],
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStacks({
            name: splendorOthersName,
            serializeId: 7,
            receivers: RECEIVERS.OTHERS,
            title: 'talent_name.odette_marvelous_splendor_others',
            description: 'talent_descr.n11500003',
            info: {ascension: 1},
            rotation: 'self',
            maxStacks: settings => settings.char_constellation >= 1
                ? MarvelousSplendorBaseStacks + C1AdditionalSplendorStacks
                : MarvelousSplendorBaseStacks,
            stats: [
                new StatTable('dmg_stellarglimmer', [MarvelousSplendorDmg]),
                new StatTableConditions('atk_percent', [C2AtkPerStack], [
                    new ConditionConstellation({constellation: 2}),
                ]),
            ],
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionBoolean({
            name: radianceConductName,
            serializeId: 5,
            title: 'talent_name.radiance_stellarconduct',
            description: 'talent_descr.odette_dance_of_aurore_1',
            info: {special: true},
            rotation: 'self',
            condition: new ConditionTeam({condition: new ConditionBoolean({name: 'polestar_field'})}),
        }),
        new ConditionBoolean({
            name: radianceSwirlName,
            serializeId: 6,
            title: 'talent_name.radiance_stellarswirl',
            description: 'talent_descr.odette_dance_of_aurore_2',
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
            title: 'talent_name.odette_dance_of_aurore',
            description: 'talent_descr.odette_dance_of_aurore_3',
            info: {special: true},
            stats: {
                text_percent: RadianceBaseScalePer100Atk,
                text_percent_max: RadianceBaseScaleCap,
            },
        }),
        new ConditionStatic({
            title: 'talent_name.odette_spring_rite_of_the_chosen_one',
            description: 'talent_descr.odette_spring_rite_of_the_chosen_one',
            info: {ascension: 1},
            stats: {
                text_value: MarvelousSplendorBaseStacks,
                text_percent: MarvelousSplendorDmg,
            },
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.odette_pathetique_of_pateticheskaya',
            description: 'talent_descr.odette_pathetique_of_pateticheskaya',
            info: {ascension: 4},
            stats: {
                text_percent: A4BaseScalePer100Atk,
                text_percent_max: A4BaseScaleCap,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionStatic({
            title: 'talent_name.n11500004',
            description: 'talent_descr.n11500004',
        }),
    ],
    postEffects: [
        a4BasePost,
        radianceBasePost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.odette_on_this_danceless_morn_she_gazes_at_her_reflection',
                    description: 'talent_descr.odette_on_this_danceless_morn_she_gazes_at_her_reflection_1',
                    stats: {
                        text_percent_dmg_1: C1CodaConductDmg,
                        text_percent_dmg_2: C1CodaSwirlDmg,
                    },
                }),
                new ConditionStatic({
                    title: 'talent_name.odette_on_this_danceless_morn_she_gazes_at_her_reflection',
                    description: 'talent_descr.odette_on_this_danceless_morn_she_gazes_at_her_reflection_2',
                    stats: {
                        text_value: C1AdditionalSplendorStacks,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.odette_i_must_see_the_snow_swans_unseen_dream_for_myself_she_thought',
                    description: 'talent_descr.odette_i_must_see_the_snow_swans_unseen_dream_for_myself_she_thought',
                    stats: {
                        text_percent_atk: C2AtkPerStack,
                        text_percent: Math.abs(C2ElementalRes),
                    },
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        enemy_res_cryo: C2ElementalRes,
                        enemy_res_electro: C2ElementalRes,
                    },
                    condition: new ConditionAnd([
                        new ConditionConstellation({constellation: 2}),
                        doubleCondition,
                        radianceConductCondition,
                    ]),
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        enemy_res_cryo: C2ElementalRes,
                        enemy_res_anemo: C2ElementalRes,
                    },
                    condition: new ConditionAnd([
                        new ConditionConstellation({constellation: 2}),
                        doubleCondition,
                        radianceSwirlCondition,
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
                new ConditionStatic({
                    title: 'talent_name.odette_up_up_the_long_delirious_burning_blue',
                    description: 'talent_descr.odette_up_up_the_long_delirious_burning_blue',
                    stats: {
                        text_percent: C4PartySnowSwanRatio * 100,
                        text_percent_dmg_1: C4CoordinatedConductDmg,
                        text_percent_dmg_2: C4CoordinatedSwirlDmg,
                        text_duration: C4CoordinatedCooldown,
                    },
                }),
            ],
        },
        {
            conditions: [],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'odette_all_party_marvelous_splendor',
                    serializeId: 8,
                    title: 'talent_name.odette_put_out_my_hand_and_touched_the_face_of_the_divine',
                    description: 'talent_descr.odette_put_out_my_hand_and_touched_the_face_of_the_divine_1',
                    rotation: 'self',
                }),
                new ConditionStatic({
                    title: 'talent_name.odette_put_out_my_hand_and_touched_the_face_of_the_divine',
                    description: 'talent_descr.odette_put_out_my_hand_and_touched_the_face_of_the_divine_3',
                    stats: {
                        dmg_stellarglimmer_special: C6OdetteElevation,
                        text_percent: C6OdetteElevation,
                    },
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        dmg_stellarglimmer_special: C6SplendorElevation,
                    },
                    condition: new ConditionAnd([
                        new ConditionConstellation({constellation: 6}),
                        // This toggle represents the source state that grants
                        // Marvelous Splendor to the entire nearby party. Odette
                        // is necessarily affected too, even though her stack
                        // counter is a separate rotation value.
                        new ConditionBoolean({
                            name: 'odette_all_party_marvelous_splendor',
                        }),
                    ]),
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'number'], [12, 'checkbox'], [3, 'checkbox'], [4, 'stacks'], [5, 'checkbox'], [6, 'checkbox'], [8, 'checkbox'], [9, 'checkbox'], [10, 'checkbox'], [11, 'checkbox']],
});
