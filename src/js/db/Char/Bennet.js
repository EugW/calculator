import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionBooleanWeaponType } from "../../classes/Condition/Boolean/WeaponType";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
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
import { FeatureHeal } from "../../classes/Feature2/Heal";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Bennett.s1_id,
        title: 'talent_name.bennett_strike_of_fortune',
        description: 'talent_descr.bennett_strike_of_fortune',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Bennett.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Bennett.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Bennett.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Bennett.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Bennett.s1.p5),
            },
            {
                type: 'hits',
                name: 'charged_hit_total',
                table: [
                    new StatTable('charged_hit_1', charTalentTables.Bennett.s1.p6),
                    new StatTable('charged_hit_2', charTalentTables.Bennett.s1.p7),
                ],
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Bennett.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Bennett.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Bennett.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Bennett.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Bennett.s2_id,
        title: 'talent_name.bennett_passion_overload',
        description: 'talent_descr.bennett_passion_overload',
        items: [
            {
                table: new StatTable('press_dmg', charTalentTables.Bennett.s2.p1),
            },
            {
                type: 'hits',
                name: 'charge_level_1',
                table: [
                    new StatTable('charge_level_1_1', charTalentTables.Bennett.s2.p2),
                    new StatTable('charge_level_1_2', charTalentTables.Bennett.s2.p3),
                ],
            },
            {
                type: 'hits',
                name: 'charge_level_2',
                table: [
                    new StatTable('charge_level_2_1', charTalentTables.Bennett.s2.p4),
                    new StatTable('charge_level_2_2', charTalentTables.Bennett.s2.p5),
                ],
            },
            {
                table: new StatTable('explosion_dmg', charTalentTables.Bennett.s2.p6),
            },
            {
                type: 'separated',
                unit: 'sec',
                table: [
                    new StatTable('cd', charTalentTables.Bennett.s2.p7),
                    new StatTable('cd', charTalentTables.Bennett.s2.p8),
                    new StatTable('cd', charTalentTables.Bennett.s2.p9),
                ],
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Bennett.s3_id,
        title: 'talent_name.bennett_fantastic_voyage',
        description: 'talent_descr.bennett_fantastic_voyage',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Bennett.s3.p1),
            },
            {
                unit: 'hp',
                type: 'shield',
                table: [
                    new StatTable('heal_dot', charTalentTables.Bennett.s3.p2),
                    new StatTable('', charTalentTables.Bennett.s3.p3),
                ],
            },
            {
                table: new StatTable('atk_ratio', charTalentTables.Bennett.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Bennett.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Bennett.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Bennett.s3.p7),
            },
        ],
    },
});

const meleeReceiver = () => new ConditionReceiver({
    condition: new ConditionBooleanWeaponType({
        types: ['sword', 'claymore', 'polearm'],
    }),
});

const TalentValues = {
    A1SkillCd: 20,
    A4SkillCd: 50,
    C1BuffBonus: percent(charTalentTables.Bennett.c1.p1),
    C2Recharge: percent(charTalentTables.Bennett.c2.p2),
    C2HpThreshold: percent(charTalentTables.Bennett.c2.p1),
    C4Damage: percent(charTalentTables.Bennett.c4.p1),
    C6PyroBonus: percent(charTalentTables.Bennett.c6.p1),
};

// Characters within Fantastic Voyage: every member, Bennett included.
// Burst ATK buff: base-ATK read, extra ATK write (default channels, no params).
// Game data: Avatar_Bennett_ElementalBurst onAbilityStart AddGlobalValue
// _ABILITY_Bennett_WarmField_BaseAttack with min/max FIGHT_PROP_BASE_ATTACK
// (base read: getBaseReadStats returns [], outside the premod/total graph),
// then Avatar_Bennett_ElementalBurst_Gadget UNIQUE_WarmField_AttackUp writes
// Actor_AttackExtraDelta = AttackUpRatio x Bennett_WarmField_BaseAttack
// (extra write = the default; the extra_scan lists this ability with
// W-extra: Actor_AttackExtraDelta and no non-extra read). C1 adds 20% of base
// ATK (Bennett_Constellation_1 paramList [0.2]; game text: "gains an
// additional 20% of Bennett's Base ATK"). GO reads input.base.atk into
// teamBuff.total.atk ("Not 100% sure if this should be in premod or total").
// KQM Bennett has no EM/ATK/HP/ER buff-chain test (Noblesse 2pc burst DMG%
// does not change the buff; the Q buff applies to Bennett's own Q damage).
const selfBuffPost = new PostEffectStats({
    receivers: RECEIVERS.TEAM,
    from: 'atk_base',
    levelSetting: 'char_skill_burst',
    percent: Talents.getMulti({
        name: 'atk',
        from: 'burst.atk_ratio',
        multi: 0.01,
    }),
    percentBonus: new ValueTable([TalentValues.C1BuffBonus / 100]),
    conditions: [
        new ConditionBoolean({
            name: 'bennet_fantastic_voyage',
        }),
    ],
    bonusCondition: new ConditionBooleanValue({
        setting: 'char_constellation',
        cond: 'ge',
        value: 1,
    }),
});

export const Bennet = new DbObjectChar({
    name: 'bennett',
    serializeId: 5,
    gameId: 10000032,
    iconClass: "char-icon-bennett",
    rarity: 4,
    element: 'pyro',
    weapon: 'sword',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Bennett,
    // Talent hits (normal/charged/plunge, skill press/charge/explosion,
    // burst) are plain ATK-scaled damage with no FIGHT_PROP stat read in the
    // strike/burst abilities: damage multipliers read the total by
    // construction and need nothing. GO uses dmgNode('atk', ...) for all of
    // them. C4's follow-up (135% of Charge Level 1's second hit;
    // Bennett_Constellation_4 paramList [1.35]) is the same kind of hit.
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
        new FeatureDamageNormal({
            name: 'normal_hit_4',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5'),
                }),
            ],
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'charged',
            name: 'charged_hit_total',
            allowInfusion: true,
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.charged_hit_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.charged_hit_2'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit_1',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_1'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_hit_2',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_2'),
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
            name: 'press_dmg',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.press_dmg'),
                }),
            ],
        }),
        new FeatureDamageMultihit({
            category: 'skill',
            damageType: 'skill',
            element: 'pyro',
            name: 'charge_level_1',
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_elemental',
                            values: Talents.get('skill.charge_level_1_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_elemental',
                            values: Talents.get('skill.charge_level_1_2'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageSkill({
            name: 'charge_level_1_1',
            element: 'pyro',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.charge_level_1_1'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'charge_level_1_2',
            isChild: true,
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.charge_level_1_2'),
                }),
            ],
        }),
        new FeatureDamageMultihit({
            category: 'skill',
            damageType: 'skill',
            element: 'pyro',
            name: 'charge_level_2',
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_elemental',
                            values: Talents.get('skill.charge_level_2_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_elemental',
                            values: Talents.get('skill.charge_level_2_2'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageSkill({
            name: 'charge_level_2_1',
            element: 'pyro',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.charge_level_2_1'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'charge_level_2_2',
            isChild: true,
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.charge_level_2_2'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'explosion_dmg',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.explosion_dmg'),
                }),
            ],
            condition: new ConditionConstellation({constellation: 4}),
        }),
        new FeatureDamageSkill({
            name: 'bennet_unexpected_odyssey_dmg',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.getMulti({
                        from: 'skill.charge_level_1_2',
                        multi: TalentValues.C4Damage / 100,
                    }),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        // Burst heal from Max HP (total by construction): the game heals with
        // HealHP amount HealConst + amountByCasterMaxHPRatio HealMaxHpRatio in
        // Avatar_Bennett_ElementalBurst_Gadget WarmField_Handler
        // (onThinkInterval; no FIGHT_PROP marker, as with Dahlia's shield
        // GlobalMainShieldMixin). scaling 'hp*' reads the total HP
        // (makeStatTotalItem); heals read the final value. GO uses
        // healNodeTalent('hp', ...). KQM Bennett has no heal-chain test. No
        // ability writes extra HP, so total == premod today. No params.
        new FeatureHeal({
            category: 'burst',
            name: 'heal_dot',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.getList('burst.heal_dot'),
                }),
            ],
        }),
        // Display of the burst ATK post-effect above; it follows that
        // post-effect's channels and needs nothing of its own.
        new FeaturePostEffectValue({
            category: 'burst',
            name: 'atk_bonus',
            postEffect: selfBuffPost,
        }),
    ],
    postEffects: [
        selfBuffPost,
    ],
    conditions: [
        new Condition({
            receivers: RECEIVERS.TEAM,
            condition: meleeReceiver(),
            settings: {
                allowed_infusion_pyro: 1,
            },
        }),
        new ConditionBoolean({
            name: 'bennet_fantastic_voyage',
            serializeId: 2,
            title: 'talent_name.bennett_fantastic_voyage',
            description: 'talent_descr.bennett_fantastic_voyage_talent',
        }),
        new ConditionStatic({
            // A1 Rekindle: skill CD -20%. No stat read or attribute write;
            // ConfigAbility_Avatar_Bennett.json has no PermanentSkill_1
            // modifier (CD logic only). GO computes it as a CD factor. Flat
            // conditions are always premod and need nothing.
            title: 'talent_name.bennett_rekindle',
            description: 'talent_descr.bennett_rekindle',
            stats: {
                text_percent_cd: TalentValues.A1SkillCd,
            },
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            // A4 Fearnaught: skill CD -50% inside Fantastic Voyage. No stat
            // read or attribute write (no PermanentSkill_2 modifier in the
            // ability file; CD logic only). Flat conditions are always
            // premod and need nothing.
            title: 'talent_name.bennett_fearnaught',
            description: 'talent_descr.bennett_fearnaught',
            stats: {
                text_percent_cd: TalentValues.A4SkillCd,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                // C1 Grand Expectation: +20% of base ATK on the burst buff
                // (game text + Bennett_Constellation_1 paramList [0.2]).
                // Implemented as percentBonus on the same base-ATK value: no
                // new stat read, no params.
                new ConditionStatic({
                    title: 'talent_name.bennett_grand_expectation',
                    description: 'talent_descr.bennett_grand_expectation',
                    stats: {
                        bonus_bennet_atk: TalentValues.C1BuffBonus,
                    },
                }),
            ],
        },
        {
            conditions: [
                // C2 Impasse Conqueror: flat +30% ER below 70% HP. Game data:
                // Avatar_Bennett_Talent_Capacitor Capacitor_EnergyGain_Up
                // writes Actor_ChargeEfficiencyDelta = Rate (no "Extra":
                // premod); talent Bennett_Constellation_2 paramList [0.7, 0.3]
                // matches the 70% threshold and the 30% ER. GO puts it under
                // premod.enerRech_. Flat conditions are always premod: no
                // params.
                new ConditionBoolean({
                    name: 'bennet_impasse_conqueror',
                    serializeId: 1,
                    title: 'talent_name.bennett_impasse_conqueror',
                    description: 'talent_descr.bennett_impasse_conqueror',
                    stats: {
                        recharge: TalentValues.C2Recharge,
                        text_percent_hp: TalentValues.C2HpThreshold,
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
                // C4 Unexpected Odyssey: display only (135% of Charge Level 1's
                // second hit; Bennett_Constellation_4 paramList [1.35]). The
                // mechanical hit is bennet_unexpected_odyssey_dmg above, a
                // plain ATK-scaled hit (total by construction). No params.
                new ConditionStatic({
                    title: 'talent_name.bennett_unexpected_odyssey',
                    description: 'talent_descr.bennett_unexpected_odyssey',
                    stats: {
                        text_percent_dmg: TalentValues.C4Damage,
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
                // C6 display row (flat 15% Pyro DMG; Bennett_Constellation_6
                // paramList [0.15]). The mechanical bonus below is the same
                // flat value. No stat read.
                new ConditionStatic({
                    name: 'bennet_fire_ventures_with_me',
                    title: 'talent_name.bennett_fire_ventures_with_me',
                    description: 'talent_descr.bennett_fire_ventures_with_me',
                    stats: {
                        text_percent: TalentValues.C6PyroBonus,
                    },
                    subConditions: [
                        new ConditionBoolean({
                            name: 'bennet_fantastic_voyage',
                        }),
                    ]
                }),
                // Sword, Claymore and Polearm users within Fantastic Voyage
                // C6 Fire Ventures With Me: flat +15% Pyro DMG + pyro
                // infusion. Game data: UNIQUE_Talent_Avatar_FireUp writes
                // Actor_FireAddHurtDelta = FireUp (plain = premod), and
                // UNIQUE_Talent_Weapon_FireEnhanced is gated on
                // WEAPON_SWORD_ONE_HAND/CLAYMORE/POLE. GO puts the DMG under
                // teamBuff.premod.pyro_dmg_. Conditions write premod: default
                // confirmed, no params. (KQM notes the in-game DMG also shows
                // on catalyst/bow holders; the infusion stays melee-gated.)
                new Condition({
                    receivers: RECEIVERS.TEAM,
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'bennet_fantastic_voyage'}),
                        meleeReceiver(),
                    ]),
                    settings: {
                        attack_infusion_pyro: 1,
                    },
                    stats: {
                        dmg_pyro: TalentValues.C6PyroBonus,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'number'], [3, 'checkbox'], [4, 'checkbox'], [5, 'checkbox'], [6, 'checkbox']],
});
