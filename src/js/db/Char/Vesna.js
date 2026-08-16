import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
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
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsAtk } from "../../classes/PostEffect/Stats/Atk";
import { StatTable } from "../../classes/StatTable";
import { Stats } from "../../classes/Stats";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Vesna.s1_id,
        title: 'talent_name.vesna_light_step',
        description: 'talent_descr.vesna_light_step',
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
        title: 'talent_name.vesna_spirit_blade_inception',
        description: 'talent_descr.vesna_spirit_blade_inception',
        items: [
            {table: new StatTable('vesna_spirit_blade_inception', charTalentTables.Vesna.s2.p1)},
            {table: new StatTable('vesna_spirit_blade_pierce', charTalentTables.Vesna.s2.p2)},
            {table: new StatTable('vesna_spirit_blade_plunge', charTalentTables.Vesna.s2.p3)},
            {table: new StatTable('vesna_spirit_blade_plunge_blade', charTalentTables.Vesna.s2.p4)},
            {table: new StatTable('vesna_stellar_spirit_blade_plunge', charTalentTables.Vesna.s2.p5)},
            {
                table: new StatTable('vesna_spirit_blade_dance', charTalentTables.Vesna.s2.p6),
                hits: 4,
            },
            {
                table: new StatTable('vesna_stellar_spirit_blade_dance', charTalentTables.Vesna.s2.p7),
                hits: 4,
            },
            {table: new StatTable('vesna_spirit_blade_dance_final', charTalentTables.Vesna.s2.p8)},
            {table: new StatTable('vesna_stellar_spirit_blade_dance_final', charTalentTables.Vesna.s2.p9)},
            {table: new StatTable('vesna_spirit_feather', charTalentTables.Vesna.s2.p10)},
            {
                unit: 'sec',
                table: new StatTable('vesna_spirit_blade_duration', charTalentTables.Vesna.s2.p12),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Vesna.s2.p14),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Vesna.s3_id,
        title: 'talent_name.vesna_spirit_blade_burst',
        description: 'talent_descr.vesna_spirit_blade_burst',
        items: [
            {table: new StatTable('vesna_spirit_blade_burst', charTalentTables.Vesna.s3.p1)},
            {table: new StatTable('vesna_stellar_spirit_blade_burst', charTalentTables.Vesna.s3.p2)},
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

const SpiritBladeDuration = 15;
const SpiritBladeInitialForce = 2;
const SpiritBladeDanceUses = 3;
const C1SpiritBladeDanceUses = 4;
const UnruffledMaxStacks = 6;
const UnruffledOriginalDmgPerStack = 10;
const A4AtkPerCryoAnemo = 6;
const A4MasteryPerOther = 25;
const C1StellarSwirlDmg = 20;
const C2Atk = 60;
const C4A4TotalMultiplier = 3;
const C6TreadDuration = 5;
const C6TreadAnemoDmg = 150;
const C6TreadStellarSwirlDmg = 200;
const C6StellarSwirlElevation = 20;
const JubileeBaseScalePer100Atk = 0.7;
const JubileeBaseScaleCap = 14;
const RadianceDuration = 8;

const spiritBladeName = 'vesna_spirit_blade';
const spiritBladeForceName = 'vesna_spirit_blade_force';
const unruffledName = 'vesna_unruffled';
const radianceName = 'vesna_radiance_stellarswirl';
const c6TreadName = 'vesna_c6_spirit_blade_tread';

const spiritBladeCondition = new ConditionBoolean({name: spiritBladeName});
const radianceCondition = new ConditionRadianceStellarGlimmer({
    conductName: 'polestar_field',
    swirlName: radianceName,
    mode: RADIANCE_STELLARSWIRL,
});
const noRadianceCondition = new ConditionNot([radianceCondition]);
const spiritBladeNoRadianceCondition = new ConditionAnd([
    spiritBladeCondition,
    noRadianceCondition,
]);
const spiritBladeRadianceCondition = new ConditionAnd([
    spiritBladeCondition,
    radianceCondition,
]);

/** C2 grants maximum A1 stacks on entry; the explicit clear event wins later. */
class ConditionStacksVesnaUnruffled extends ConditionStacks {
    isC2Entry(settings) {
        return (settings.char_ascension || 0) >= 1
            && (settings.char_constellation || 0) >= 2
            && !!settings[spiritBladeName]
            && !settings.vesna_unruffled_cleared;
    }

    getStacksCnt(settings) {
        if (settings.vesna_unruffled_cleared) {
            return 0;
        }
        if (this.isC2Entry(settings)) {
            return UnruffledMaxStacks;
        }
        return super.getStacksCnt(settings);
    }

    getData(settings) {
        const result = super.getData(settings);
        result.settings ||= {};
        if (settings.vesna_unruffled_cleared) {
            result.settings[unruffledName] = 0;
        } else if (this.isC2Entry(settings)) {
            result.settings[unruffledName] = UnruffledMaxStacks;
        }
        return result;
    }
}

/** Count Vesna plus the three selected party slots for A4 and its C4 tripling. */
class ConditionVesnaEffortless extends Condition {
    getData(settings) {
        const result = {
            settings: {},
            stats: new Stats(),
        };
        if (!this.isActive(settings)) {
            return result;
        }

        const elements = ['anemo'];
        for (const name of [
            'resonance_element_1',
            'resonance_element_2',
            'resonance_element_3',
        ]) {
            if (settings[name]) {
                elements.push(settings[name]);
            }
        }

        const cryoAnemo = elements.filter((element) => [
            'cryo',
            'anemo',
        ].includes(element)).length;
        const other = elements.length - cryoAnemo;
        const multiplier = (settings.char_constellation || 0) >= 4
            ? C4A4TotalMultiplier
            : 1;

        result.settings = {
            vesna_effortless_cryo_anemo_count: cryoAnemo,
            vesna_effortless_other_count: other,
        };
        result.stats.add('atk_percent', cryoAnemo * A4AtkPerCryoAnemo * multiplier);
        result.stats.add('mastery', other * A4MasteryPerOther * multiplier);
        return result;
    }
}

const jubileeBasePost = new PostEffectStatsAtk({
    percent: new StatTable('stellarswirl_multi', [JubileeBaseScalePer100Atk / 100]),
    statCap: new ValueTable([JubileeBaseScaleCap]),
});
const partyJubileeCondition = new ConditionBoolean({
    name: 'party.vesna_stellar_jubilee',
});
const partyJubileeBasePost = new PostEffectStats({
    from: 'vesna_atk_total',
    percent: new StatTable('stellarswirl_multi', [JubileeBaseScalePer100Atk / 100]),
    statCap: new ValueTable([JubileeBaseScaleCap]),
    condition: partyJubileeCondition,
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
        scalingSource: blade ? unruffledName : '',
        scalingMultiplier: blade ? 'vesna_blade_original_multi' : 1,
        values: Talents.get('skill.' + name),
    });
}

function burstMultiplier(name) {
    return new FeatureMultiplier({
        leveling: 'char_skill_burst',
        scalingSource: unruffledName,
        scalingMultiplier: 'vesna_blade_original_multi',
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
    beta: true,
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
            name: 'vesna_spirit_blade_inception',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_spirit_blade_inception')],
        }),
        // Pierce and Vesna's Plunge portion are ordinary attacks; only the
        // separately tagged blade portions have Stellar rows.
        new FeatureDamageSkill({
            name: 'vesna_spirit_blade_pierce',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_spirit_blade_pierce')],
            condition: spiritBladeCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_spirit_blade_plunge',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_spirit_blade_plunge')],
            condition: spiritBladeCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_spirit_blade_plunge_blade',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_spirit_blade_plunge_blade', true)],
            condition: spiritBladeNoRadianceCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'vesna_stellar_spirit_blade_plunge',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_stellar_spirit_blade_plunge', true)],
            condition: spiritBladeRadianceCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_spirit_blade_dance',
            element: 'anemo',
            hits: 4,
            multipliers: [skillMultiplier('vesna_spirit_blade_dance', true)],
            condition: spiritBladeNoRadianceCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'vesna_stellar_spirit_blade_dance',
            element: 'anemo',
            hits: 4,
            multipliers: [skillMultiplier('vesna_stellar_spirit_blade_dance', true)],
            condition: spiritBladeRadianceCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_spirit_blade_dance_final',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_spirit_blade_dance_final', true)],
            condition: spiritBladeNoRadianceCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'vesna_stellar_spirit_blade_dance_final',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_stellar_spirit_blade_dance_final', true)],
            condition: spiritBladeRadianceCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_spirit_feather',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_spirit_feather', true)],
            condition: spiritBladeCondition,
        }),
        new FeatureDamageBurst({
            name: 'vesna_spirit_blade_burst',
            element: 'anemo',
            multipliers: [burstMultiplier('vesna_spirit_blade_burst')],
            condition: noRadianceCondition,
        }),
        new FeatureDamageStellarSwirl({
            category: 'burst',
            name: 'vesna_stellar_spirit_blade_burst',
            element: 'anemo',
            multipliers: [burstMultiplier('vesna_stellar_spirit_blade_burst')],
            condition: radianceCondition,
        }),
        new FeatureDamageSkill({
            name: 'vesna_c6_spirit_blade_tread',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation6',
                    values: new ValueTable([C6TreadAnemoDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                new ConditionBoolean({name: c6TreadName}),
            ]),
        }),
        new FeatureDamageStellarSwirl({
            category: 'skill',
            name: 'vesna_c6_stellar_spirit_blade_tread',
            element: 'anemo',
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation6',
                    scalingSource: unruffledName,
                    scalingMultiplier: 'vesna_blade_original_multi',
                    values: new ValueTable([C6TreadStellarSwirlDmg]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                new ConditionBoolean({name: c6TreadName}),
            ]),
        }),
        new FeatureDamageSkill({
            name: 'vesna_c6_tread_spirit_feather',
            element: 'anemo',
            multipliers: [skillMultiplier('vesna_spirit_feather', true)],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
                new ConditionBoolean({name: c6TreadName}),
                spiritBladeCondition,
            ]),
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                allowed_stellarswirl: 1,
            },
        }),
        new ConditionBoolean({
            name: spiritBladeName,
            serializeId: 1,
            title: 'talent_name.n11430001',
            description: 'talent_descr.n11430001',
            rotation: 'self',
            stats: {
                text_duration: SpiritBladeDuration,
                text_value: SpiritBladeInitialForce,
            },
            settings: {
                attack_infusion: 'anemo',
            },
        }),
        new ConditionStacks({
            name: spiritBladeForceName,
            serializeId: 2,
            title: 'talent_name.vesna_spirit_blade_force',
            description: 'talent_descr.vesna_spirit_blade_force',
            rotation: 'self',
            maxStacks: SpiritBladeInitialForce,
            stats: [],
            condition: spiritBladeCondition,
        }),
        new ConditionNumber({
            name: 'vesna_spirit_blade_dance_uses',
            serializeId: 3,
            title: 'talent_name.vesna_spirit_blade_sequence',
            description: 'talent_descr.vesna_spirit_blade_sequence',
            rotation: 'self',
            min: 0,
            max: (settings) => (settings.char_constellation || 0) >= 1
                ? C1SpiritBladeDanceUses
                : SpiritBladeDanceUses,
            allowMinZero: true,
            forceSettings: true,
            noStat: true,
            condition: spiritBladeCondition,
        }),
        new ConditionStacksVesnaUnruffled({
            name: unruffledName,
            serializeId: 4,
            title: 'talent_name.vesna_unruffled',
            description: 'talent_descr.vesna_unruffled_1',
            info: {ascension: 1},
            rotation: 'self',
            maxStacks: UnruffledMaxStacks,
            // This dedicated multiplier stat keeps the original-DMG increase
            // dynamic in compiled feature trees instead of treating it as DMG Bonus.
            stats: [
                new StatTable('vesna_blade_original_multi', [UnruffledOriginalDmgPerStack]),
            ],
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionBoolean({
            name: 'vesna_unruffled_cleared',
            serializeId: 5,
            title: 'talent_name.vesna_unruffled_clear',
            description: 'talent_descr.vesna_unruffled_2',
            info: {ascension: 1},
            rotation: 'self',
            settings: {
                vesna_unruffled: 0,
            },
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
                new ConditionBoolean({name: 'polestar_field'}),
            ]),
        }),
        new ConditionStatic({
            title: 'talent_name.vesna_effortless',
            description: 'talent_descr.vesna_effortless',
            info: {ascension: 4},
            stats: {
                text_percent_atk: A4AtkPerCryoAnemo,
                text_value: A4MasteryPerOther,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionVesnaEffortless({
            isHidden: true,
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 4}),
                radianceCondition,
            ]),
        }),
        new ConditionStatic({
            title: 'talent_name.vesna_radiant_fae',
            description: 'talent_descr.vesna_radiant_fae',
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
                    title: 'talent_name.vesna_c1',
                    description: 'talent_descr.vesna_c1',
                    stats: {
                        text_value: C1SpiritBladeDanceUses - SpiritBladeDanceUses,
                        text_percent: C1StellarSwirlDmg,
                    },
                }),
                new Condition({
                    isHidden: true,
                    stats: {
                        dmg_stellarswirl: C1StellarSwirlDmg,
                    },
                    condition: spiritBladeCondition,
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.vesna_c2',
                    description: 'talent_descr.vesna_c2',
                    stats: {
                        text_percent_atk: C2Atk,
                    },
                }),
                new Condition({
                    isHidden: true,
                    stats: {
                        atk_percent: C2Atk,
                    },
                    condition: new ConditionAnd([
                        new ConditionAscensionChar({ascension: 1}),
                        new ConditionBooleanValue({
                            setting: unruffledName,
                            cond: 'ge',
                            value: UnruffledMaxStacks,
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
                    title: 'talent_name.vesna_c4',
                    description: 'talent_descr.vesna_c4',
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
                    name: c6TreadName,
                    serializeId: 8,
                    title: 'talent_name.vesna_c6',
                    description: 'talent_descr.vesna_c6_1',
                    rotation: 'self',
                    stats: {
                        text_duration: C6TreadDuration,
                        text_percent_dmg_1: C6TreadAnemoDmg,
                        text_percent_dmg_2: C6TreadStellarSwirlDmg,
                    },
                }),
                new ConditionStatic({
                    title: 'talent_name.vesna_c6',
                    description: 'talent_descr.vesna_c6_2',
                    stats: {
                        dmg_stellarswirl_special: C6StellarSwirlElevation,
                        text_percent: C6StellarSwirlElevation,
                    },
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
                name: 'vesna_atk_total',
                serializeId: 1,
                title: 'talent_name.stats_total_atk',
                partyStat: 'atk_total',
                max: 10000,
            }),
            new ConditionBoolean({
                name: 'party.vesna_stellar_jubilee',
                serializeId: 2,
                title: 'talent_name.vesna_radiant_fae',
                description: 'talent_descr.vesna_radiant_fae',
                rotation: 'party',
                settings: {
                    allowed_stellarswirl: 1,
                },
            }),
        ],
        postEffects: [
            partyJubileeBasePost,
        ],
    },
});
