import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionTeam } from "../../classes/Condition/Team";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
import {
    ConditionRadianceStellarGlimmer,
    RADIANCE_STELLARSWIRL,
} from "../../classes/Condition/RadianceStellarGlimmer";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureDamageStellarSwirl } from "../../classes/Feature2/Damage/StellarSwirl";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { Stats } from "../../classes/Stats";
import { teammateElements } from "../../classes/Team/Party";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent, plus } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Vesna.s1_id,
        title: 'talent_name.vesna_vila_blade_dance',
        description: 'talent_descr.vesna_vila_blade_dance',
        items: [
            {table: new StatTable('normal_hit_1', charTalentTables.Vesna.s1.p1)},
            {table: new StatTable('normal_hit_2', charTalentTables.Vesna.s1.p2)},
            {
                table: new StatTable('normal_hit_3', charTalentTables.Vesna.s1.p3),
                hits: 2,
            },
            {table: new StatTable('normal_hit_4', charTalentTables.Vesna.s1.p4)},
            {table: new StatTable('normal_hit_5', charTalentTables.Vesna.s1.p5)},
            {table: new StatTable('normal_hit_6', charTalentTables.Vesna.s1.p6)},
            {table: new StatTable('charged_hit', charTalentTables.Vesna.s1.p7)},
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Vesna.s1.p8),
            },
            {table: new StatTable('plunge', charTalentTables.Vesna.s1.p9)},
            {table: new StatTable('plunge_low', charTalentTables.Vesna.s1.p10)},
            {table: new StatTable('plunge_high', charTalentTables.Vesna.s1.p11)},
        ],
    },
    skill: {
        gameId: charTalentTables.Vesna.s2_id,
        title: 'talent_name.vesna_the_art_of_victory',
        description: 'talent_descr.vesna_the_art_of_victory',
        items: [
            {table: new StatTable('vesna_the_art_of_victory', charTalentTables.Vesna.s2.p1)},
            {table: new StatTable('vesna_windborne_sword_lv1', charTalentTables.Vesna.s2.p2)},
            {table: new StatTable('vesna_windborne_sword_lv2', charTalentTables.Vesna.s2.p3)},
            {table: new StatTable('vesna_windborne_sword_lv2_spirit_blade', charTalentTables.Vesna.s2.p4)},
            {table: new StatTable('vesna_windborne_sword_lv2_spirit_blade_stellar', charTalentTables.Vesna.s2.p5)},
            {
                table: new StatTable('vesna_windborne_sword_lv3', charTalentTables.Vesna.s2.p6),
                hits: 4,
            },
            {
                table: new StatTable('vesna_windborne_sword_lv3_stellar', charTalentTables.Vesna.s2.p7),
                hits: 4,
            },
            {table: new StatTable('vesna_windborne_sword_lv3_final', charTalentTables.Vesna.s2.p8)},
            {table: new StatTable('vesna_windborne_sword_lv3_final_stellar', charTalentTables.Vesna.s2.p9)},
            {table: new StatTable('vesna_wind_pinion', charTalentTables.Vesna.s2.p10)},
            {
                unit: 'sec',
                table: new StatTable('vesna_armed_for_action_duration', charTalentTables.Vesna.s2.p12),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Vesna.s2.p14),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Vesna.s3_id,
        title: 'talent_name.vesna_for_the_tsaritsa',
        description: 'talent_descr.vesna_for_the_tsaritsa',
        items: [
            {table: new StatTable('vesna_for_the_tsaritsa', charTalentTables.Vesna.s3.p1)},
            {table: new StatTable('vesna_for_the_tsaritsa_stellar', charTalentTables.Vesna.s3.p2)},
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Vesna.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Vesna.s3.p4),
            },
        ],
    },
    links: [11430001],
});

const ArmedForActionDuration = 15;
const SwordEnergyInitial = 2;
const WindborneSwordMaxUses = 3;
const C1WindborneSwordMaxUses = 4;
const DisciplinaryActionMaxStacks = charTalentTables.Vesna.a1.p2;
const DisciplinaryActionDmgPerStack = percent(charTalentTables.Vesna.a1.p3);
const A4AtkPerCryoAnemo = percent(charTalentTables.Vesna.a4.p1);
const A4MasteryPerOther = charTalentTables.Vesna.a4.p2;
const C1StellarSwirlDmg = percent(charTalentTables.Vesna.c1.p2);
const C2Atk = percent(charTalentTables.Vesna.c2.p1);
const C4A4TotalMultiplier = plus(1, charTalentTables.Vesna.c4.p1);
const C6TransposeDuration = charTalentTables.Vesna.c6.p1;
const C6TransposeAnemoDmg = percent(charTalentTables.Vesna.c6.p2);
const C6TransposeSpiritBladeDmg = percent(charTalentTables.Vesna.c6.p3);
const C6StellarSwirlElevation = percent(charTalentTables.Vesna.c6.p4);
const JubileeBaseScalePer100Atk = percent(charTalentTables.Vesna.a0.p1);
const JubileeBaseScaleCap = percent(charTalentTables.Vesna.a0.p2);
const RadianceDuration = 8;

const armedForActionName = 'vesna_armed_for_action';
const swordEnergyName = 'vesna_sword_energy';
const disciplinaryActionName = 'vesna_disciplinary_action';
const radianceName = 'vesna_radiance_stellarswirl';
const c6TransposeName = 'vesna_c6_transpose';

const armedForActionCondition = new ConditionBoolean({name: armedForActionName});
const radianceCondition = new ConditionRadianceStellarGlimmer({
    conductName: 'polestar_field',
    swirlName: radianceName,
    mode: RADIANCE_STELLARSWIRL,
});
const noRadianceCondition = new ConditionNot([radianceCondition]);
const armedForActionNoRadianceCondition = new ConditionAnd([
    armedForActionCondition,
    noRadianceCondition,
]);
const armedForActionRadianceCondition = new ConditionAnd([
    armedForActionCondition,
    radianceCondition,
]);

/** Truth Prevails (A4; C4 triples it): no stat read, it counts Cryo/Anemo vs
 * other party members. Game data: Avatar_Vesna_PermanentSkill_2
 * (Vesna_PermanentSkill_2_AttackUp_Buff /
 * Vesna_PermanentSkill_2_ElementalMasteryUp_Buff; ProudSkill
 * Vesna_PermanentSkill_2 = [0.06, 25]) writes Actor_AttackRatio and
 * Actor_ElemMasteryDelta, both without "Extra": premod ATK% and premod EM.
 * Conditions write premod, so the default is confirmed (no params); the
 * premod EM counts for premod EM readers (Nahida A1). KQM has no Vesna
 * stat-interaction test; GO has no Vesna sheet. Count Vesna plus the three
 * selected party slots for A4 and its C4 tripling. */
class ConditionVesnaTruthPrevails extends Condition {
    getData(settings) {
        const result = {
            settings: {},
            stats: new Stats(),
        };
        if (!this.isActive(settings)) {
            return result;
        }

        const elements = ['anemo'].concat(teammateElements(settings));

        const cryoAnemo = elements.filter((element) => [
            'cryo',
            'anemo',
        ].includes(element)).length;
        const other = elements.length - cryoAnemo;
        const multiplier = (settings.char_constellation || 0) >= 4
            ? C4A4TotalMultiplier
            : 1;

        result.settings = {
            vesna_truth_prevails_cryo_anemo_count: cryoAnemo,
            vesna_truth_prevails_other_count: other,
        };
        result.stats.add('atk_percent', cryoAnemo * A4AtkPerCryoAnemo * multiplier);
        result.stats.add('mastery', other * A4MasteryPerOther * multiplier);
        return result;
    }
}

// Stellar Jubilee: Splendid Prelude, TEAM base Stellar Swirl bonus from ATK
// (0.7% per 100 ATK, cap 14%). Game data:
// Avatar_Vesna_PermanentSkill_3 sets it with
// SetNewElementReactionBaseDamageRatioParam (AttackTransferRatio x 0.01 for
// StarSwirlIce/StarSwirlWind, caps Min/MaxTransRatio; ProudSkill
// Vesna_PermanentSkill_3 = [0.007, 0.14]), which names no premod/total read:
// the engine resolves the ATK stat itself. The same call reads the total
// ATK in game (Ineffa's Benediction, in-game test: md/buff_chains.md):
// extra ATK (Bennett's burst) counts. GO has no Vesna sheet.
// stellarswirl_multi has no extra lane, so only the read matters.
const jubileeBasePost = new PostEffectStatsAtk({
    receivers: RECEIVERS.TEAM,
    reads: CHANNELS.TOTAL,
    percent: new StatTable('stellarswirl_multi', [JubileeBaseScalePer100Atk / 100]),
    statCap: new ValueTable([JubileeBaseScaleCap]),
});

function attackMultiplier(name) {
    return new FeatureMultiplier({
        leveling: 'char_skill_attack',
        values: Talents.get('attack.' + name),
    });
}

function skillMultiplier(name, blade = false) {
    return new FeatureMultiplier({
        leveling: 'char_skill_elemental',
        scalingSource: blade ? disciplinaryActionName : '',
        scalingMultiplier: blade ? 'vesna_disciplinary_action_multi' : 1,
        values: Talents.get('skill.' + name),
    });
}

function burstMultiplier(name) {
    return new FeatureMultiplier({
        leveling: 'char_skill_burst',
        scalingSource: disciplinaryActionName,
        scalingMultiplier: 'vesna_disciplinary_action_multi',
        values: Talents.get('burst.' + name),
    });
}

export const Vesna = new DbObjectChar({
    name: 'vesna',
    serializeId: 128,
    gameId: 10000143,
    iconClass: 'char-icon-vesna',
    rarity: 5,
    element: 'anemo',
    weapon: 'sword',
    origin: 'snezhnaya',
    talents: Talents,
    statTable: charTables.Vesna,
    features: [
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            multipliers: [attackMultiplier('normal_hit_1')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            multipliers: [attackMultiplier('normal_hit_2')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3',
            hits: 2,
            multipliers: [attackMultiplier('normal_hit_3')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4',
            multipliers: [attackMultiplier('normal_hit_4')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5',
            multipliers: [attackMultiplier('normal_hit_5')],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_6',
            multipliers: [attackMultiplier('normal_hit_6')],
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
            name: 'vesna_the_art_of_victory',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_the_art_of_victory')],
        }),
        // Lv. 1 and the Vesna-side Lv. 2 portion are ordinary attacks; only the
        // separately tagged blade portions have Stellar rows.
        new FeatureDamageSkill({
            name: 'vesna_windborne_sword_lv1',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_windborne_sword_lv1')],
            condition: armedForActionCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_windborne_sword_lv2',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_windborne_sword_lv2')],
            condition: armedForActionCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_windborne_sword_lv2_spirit_blade',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_windborne_sword_lv2_spirit_blade', true)],
            condition: armedForActionNoRadianceCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'vesna_windborne_sword_lv2_spirit_blade_stellar',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_windborne_sword_lv2_spirit_blade_stellar', true)],
            condition: armedForActionRadianceCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_windborne_sword_lv3',
            element: 'anemo',
            hits: 4,
            multipliers: [skillMultiplier('vesna_windborne_sword_lv3', true)],
            condition: armedForActionNoRadianceCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'vesna_windborne_sword_lv3_stellar',
            element: 'anemo',
            hits: 4,
            multipliers: [skillMultiplier('vesna_windborne_sword_lv3_stellar', true)],
            condition: armedForActionRadianceCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_windborne_sword_lv3_final',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_windborne_sword_lv3_final', true)],
            condition: armedForActionNoRadianceCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'vesna_windborne_sword_lv3_final_stellar',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_windborne_sword_lv3_final_stellar', true)],
            condition: armedForActionRadianceCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_wind_pinion',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_wind_pinion')],
            condition: armedForActionCondition,
        }),
        new FeatureDamageBurst({
            name: 'vesna_for_the_tsaritsa',
            element: 'anemo',
            multipliers: [burstMultiplier('vesna_for_the_tsaritsa')],
            condition: noRadianceCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'burst',
            name: 'vesna_for_the_tsaritsa_stellar',
            element: 'anemo',
            multipliers: [burstMultiplier('vesna_for_the_tsaritsa_stellar')],
            condition: radianceCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_c6_transpose',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation6',
                    values: new ValueTable([C6TransposeAnemoDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                new ConditionBoolean({name: c6TransposeName}),
            ]),
        }),
        new FeatureDamageSkill({
            name: 'vesna_c6_transpose_spirit_blade',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation6',
                    scalingSource: disciplinaryActionName,
                    scalingMultiplier: 'vesna_disciplinary_action_multi',
                    values: new ValueTable([C6TransposeSpiritBladeDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                new ConditionBoolean({name: c6TransposeName}),
                noRadianceCondition,
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'vesna_c6_transpose_stellar',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation6',
                    scalingSource: disciplinaryActionName,
                    scalingMultiplier: 'vesna_disciplinary_action_multi',
                    values: new ValueTable([C6TransposeSpiritBladeDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                new ConditionBoolean({name: c6TransposeName}),
                radianceCondition,
            ]),
        }),
        new FeatureDamageSkill({
            name: 'vesna_c6_transpose_wind_pinion',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_wind_pinion')],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                new ConditionBoolean({name: c6TransposeName}),
                armedForActionCondition,
            ]),
        }),
    ],
    conditions: [
        new Condition({
            receivers: RECEIVERS.TEAM,
            settings: {
                allowed_stellarswirl: 1,
            },
        }),
        new ConditionBoolean({
            name: armedForActionName,
            serializeId: 1,
            title: 'talent_name.n11430001',
            description: 'talent_descr.n11430001',
            rotation: 'self',
            stats: {
                text_duration: ArmedForActionDuration,
                text_value: SwordEnergyInitial,
            },
            settings: {
                attack_infusion: 'anemo',
            },
        }),
        new ConditionStacks({
            name: swordEnergyName,
            serializeId: 2,
            title: 'talent_name.vesna_sword_energy',
            description: 'talent_descr.vesna_sword_energy',
            rotation: 'self',
            maxStacks: SwordEnergyInitial,
            stats: [],
            condition: armedForActionCondition,
        }),
        new ConditionNumber({
            name: 'vesna_windborne_sword_uses',
            serializeId: 3,
            title: 'talent_name.vesna_windborne_sword_level',
            description: 'talent_descr.vesna_windborne_sword_level',
            rotation: 'self',
            min: 0,
            max: (settings) => (settings.char_constellation || 0) >= 1
                ? C1WindborneSwordMaxUses
                : WindborneSwordMaxUses,
            allowMinZero: true,
            forceSettings: true,
            noStat: true,
            condition: armedForActionCondition,
        }),
        new ConditionStacks({
            // Rite of Spring's Procession (A1): a stack counter, no stat
            // read or attribute write. Game data:
            // Avatar_Vesna_PermanentSkill_1 (Vesna_PermanentSkill_1_Buff;
            // ProudSkill Vesna_PermanentSkill_1 = [20, 6, 0.1]) only counts
            // stacks; the Spirit Blade formula multiplies
            // FIGHT_PROP_CUR_ATTACK (total) by Sword_Buff_Up_Factor x count:
            // damage hits read the total and need nothing.
            name: disciplinaryActionName,
            serializeId: 4,
            title: 'talent_name.vesna_rite_of_springs_procession',
            description: 'talent_descr.vesna_rite_of_springs_procession_1',
            info: {ascension: 1},
            rotation: 'self',
            maxStacks: DisciplinaryActionMaxStacks,
            // This dedicated multiplier stat keeps the original-DMG increase
            // dynamic in compiled feature trees instead of treating it as DMG Bonus.
            stats: [
                new StatTable('vesna_disciplinary_action_multi', [DisciplinaryActionDmgPerStack]),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionBoolean({
            // Retain the removed control's ID so existing builds still load.
            name: 'vesna_disciplinary_action_cleared',
            serializeId: 5,
            isHidden: true,
        }),
        new ConditionBoolean({
            name: radianceName,
            serializeId: 6,
            title: 'talent_name.n11500004',
            description: 'talent_descr.n11500004',
            info: {special: true},
            rotation: 'self',
            stats: {
                text_duration: RadianceDuration,
            },
            condition: new ConditionNot([
                new ConditionTeam({condition: new ConditionBoolean({name: 'polestar_field'})}),
            ]),
        }),
        new ConditionStatic({
            title: 'talent_name.vesna_truth_prevails',
            description: 'talent_descr.vesna_truth_prevails',
            info: {ascension: 4},
            stats: {
                text_percent_atk: A4AtkPerCryoAnemo,
                text_value: A4MasteryPerOther,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionVesnaTruthPrevails({
            isHidden: true,
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                radianceCondition,
            ]),
        }),
        new ConditionStatic({
            title: 'talent_name.vesna_splendid_prelude',
            description: 'talent_descr.vesna_splendid_prelude',
            stats: {
                text_percent: JubileeBaseScalePer100Atk,
                text_percent_max: JubileeBaseScaleCap,
                text_duration: RadianceDuration,
            },
        }),
    ],
    postEffects: [
        jubileeBasePost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.vesna_winters_farewell_feast',
                    description: 'talent_descr.vesna_winters_farewell_feast',
                    stats: {
                        text_value: C1WindborneSwordMaxUses - WindborneSwordMaxUses,
                        text_percent: C1StellarSwirlDmg,
                    },
                }),
                new Condition({
                    // C1 Winter's Farewell Feast: flat +20% Stellar Swirl DMG
                    // (game: Vesna_Constellation_1_Buff writes
                    // Actor_ElemReactStarSwirlIceDelta/WindDelta =
                    // C1_StarDamage_Ratio, no stat read). Flat conditions
                    // (premod) need nothing.
                    isHidden: true,
                    stats: {
                        dmg_stellarswirl: C1StellarSwirlDmg,
                    },
                    condition: armedForActionCondition,
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.vesna_kolo_of_springs_arrival',
                    description: 'talent_descr.vesna_kolo_of_springs_arrival',
                    stats: {
                        text_percent_atk: C2Atk,
                    },
                }),
                new Condition({
                    // C2 Kolo of Spring's Arrival: flat +40% ATK at maximum
                    // Disciplinary Action (game:
                    // Vesna_Constellation_2_ATK_Buff writes Actor_AttackRatio
                    // = C2_ATK_Ratio, no stat read; needs A1). Flat
                    // conditions (premod) need nothing.
                    isHidden: true,
                    stats: {
                        atk_percent: C2Atk,
                    },
                    condition: new ConditionAnd([
                        new ConditionAscensionChar({ascension: 1}),
                        new ConditionBooleanValue({
                            setting: disciplinaryActionName,
                            cond: 'ge',
                            value: DisciplinaryActionMaxStacks,
                        }),
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
                    title: 'talent_name.vesna_glory_to_our_forebears',
                    description: 'talent_descr.vesna_glory_to_our_forebears',
                    stats: {
                        text_percent: (C4A4TotalMultiplier - 1) * 100,
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
                new ConditionBoolean({
                    name: c6TransposeName,
                    serializeId: 8,
                    title: 'talent_name.vesna_unwavering_ardor',
                    description: 'talent_descr.vesna_unwavering_ardor_1',
                    rotation: 'self',
                    stats: {
                        text_duration: C6TransposeDuration,
                        text_percent_dmg_1: C6TransposeAnemoDmg,
                        text_percent_dmg_2: C6TransposeSpiritBladeDmg,
                    },
                }),
                new ConditionStatic({
                    // C6 Unwavering Ardor elevation: flat +20% Stellar Swirl
                    // DMG (game:
                    // UNIQUE_Avatar_Vesna_Constellation_6_StarSwirlBuff writes
                    // Actor_ElemReactStarSwirlIce/WindEffectFactor, no stat
                    // read). Flat conditions (premod) need nothing.
                    title: 'talent_name.vesna_unwavering_ardor',
                    description: 'talent_descr.vesna_unwavering_ardor_2',
                    stats: {
                        dmg_stellarswirl_special: C6StellarSwirlElevation,
                        text_percent: C6StellarSwirlElevation,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox']],
});
