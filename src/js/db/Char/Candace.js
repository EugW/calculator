import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
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
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureShield } from "../../classes/Feature2/Shield";
import { PostEffectStatsHP } from "../../classes/PostEffect/Stats/HP";
import { StatTable } from "../../classes/StatTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from "../../classes/ValueTable";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent, times } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Candace.s1_id,
        title: 'talent_name.candace_gleaming_spear_guardian_stance',
        description: 'talent_descr.candace_gleaming_spear_guardian_stance',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Candace.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Candace.s1.p2),
            },
            {
                type: 'hits',
                name: 'normal_hit_3',
                table: [
                    new StatTable('normal_hit_3_1', charTalentTables.Candace.s1.p3),
                    new StatTable('normal_hit_3_2', charTalentTables.Candace.s1.p4),
                ],
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Candace.s1.p5),
            },

            {
                table: new StatTable('charged_hit', charTalentTables.Candace.s1.p6),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Candace.s1.p7),
            },
            {
                table: new StatTable('plunge', charTalentTables.Candace.s1.p8),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Candace.s1.p9),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Candace.s1.p10),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Candace.s2_id,
        title: 'talent_name.candace_herons_sanctum',
        description: 'talent_descr.candace_herons_sanctum',
        items: [
            {
                unit: 'hp',
                type: 'shield',
                table: [
                    new StatTable('shield_absorption', charTalentTables.Candace.s2.p1),
                    new StatTable('', charTalentTables.Candace.s2.p2),
                ],
            },
            {
                unit: 'hp',
                table: new StatTable('candace_press_dmg', charTalentTables.Candace.s2.p3),
            },
            {
                unit: 'hp',
                table: new StatTable('candace_hold_dmg', charTalentTables.Candace.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd_press', charTalentTables.Candace.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd_hold', charTalentTables.Candace.s2.p6),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Candace.s3_id,
        title: 'talent_name.candace_wagtails_tide',
        description: 'talent_descr.candace_wagtails_tide',
        items: [
            {
                unit: 'hp',
                table: new StatTable('burst_dmg', charTalentTables.Candace.s3.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Candace.s3.p2),
            },
            {
                table: new StatTable('candace_dmg_bonus', charTalentTables.Candace.s3.p3),
            },
            {
                unit: 'hp',
                table: new StatTable('candace_wave_dmg', charTalentTables.Candace.s3.p4),
            },
            {
                table: new StatTable('candace_wave_count', charTalentTables.Candace.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Candace.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Candace.s3.p7),
            },
        ],
    },
});

const TalentValues = {
    BaseDmgBonus: 20,
    A4BonusScale: percent(times(charTalentTables.Candace.a4.p1, 0.001)),
    C2HpBonus: percent(charTalentTables.Candace.c2.p1),
    C6Damage: percent(charTalentTables.Candace.c6.p1),
};

// Sword, Claymore and Polearm wielders of Prayer of the Crimson Crown.
const meleeReceiver = () => new ConditionReceiver({
    condition: new ConditionBooleanWeaponType({
        types: ['sword', 'claymore', 'polearm'],
    }),
});

export const Candace = new DbObjectChar({
    name: 'candace',
    serializeId: 58,
    gameId: 10000072,
    iconClass: "char-icon-candace",
    rarity: 4,
    element: 'hydro',
    weapon: 'polearm',
    origin: 'sumeru',
    talents: Talents,
    statTable: charTables.Candace,
    // Talent HP-scaled hits read the total HP: the game computes them from
    // FIGHT_PROP_MAX_HP in damageExtra (Elemental_Art_H/L, Elemental_Burst,
    // Elemental_Burst_AvatarIn, ExtraAvatarInAttack_DMG x FIGHT_PROP_MAX_HP in
    // Avatar_Candace_ElementalArt_H/L and Avatar_Candace_ElementalBurst).
    // Damage multipliers with scaling 'hp*' read the total by construction
    // and need nothing. The skill shield (EliteShieldMixin with
    // Shield_HP_Ratio/Shield_HP_Delta in Avatar_Candace_ElementalArt_ChargeShield)
    // names no FIGHT_PROP read; shields scale like hits (total) and need
    // nothing. GO uses dmgNode/shieldNodeTalent('hp', ...) (total) for all of
    // these. KQM Candace has no EM/ATK/HP/ER buff-chain test.
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
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_3',
            allowInfusion: true,
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_3_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_3_2'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3_1',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3_2',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3_2'),
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
            name: 'charged_hit',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
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
            name: 'candace_press_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.candace_press_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'candace_hold_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.candace_hold_dmg'),
                }),
            ],
        }),
        new FeatureShield({
            category: 'skill',
            name: 'shield',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.shield_absorption'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'candace_wave_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.candace_wave_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'candace_the_overflow_dmg',
            element: 'hydro',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    source: 'constellation6',
                    values: new ValueTable([TalentValues.C6Damage]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
        // Display of the burst A4 post-effect below. It is a post-effect of
        // its own, so it declares the same total HP read (FIGHT_PROP_MAX_HP).
        new FeaturePostEffectValue({
            category: 'burst',
            name: 'candace_dmg_bonus',
            postEffect: new PostEffectStatsHP({
                reads: CHANNELS.TOTAL,
                percent: [
                    new StatTable('text_percent', [TalentValues.A4BonusScale]),
                ],
                flatBonus: new ValueTable([TalentValues.BaseDmgBonus / 100]),
            }),
            format: 'percent',
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    conditions: [
        // Prayer of the Crimson Crown reaches every member; Hydro infusion
        // only Sword, Claymore and Polearm wielders.
        new Condition({
            receivers: RECEIVERS.TEAM,
            condition: meleeReceiver(),
            settings: {
                allowed_infusion_hydro: 1,
            },
        }),
        // Base 20% NormalAttack elemental DMG: the game adds it with
        // ModifyDamageMixin damagePercentageRatio Buff_NormalAttack_BaseDMGRatio
        // (no stat read) in UNIQUE_Candace_ElementalBurst_WaterField_LocalHandler;
        // GO sums it with the A4 part under teamBuff.premod. A flat toggle
        // writes premod by construction (conditions cannot write extra yet)
        // and needs nothing.
        new ConditionBoolean({
            name: 'candace_prayer_of_the_crimson_crown',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.candace_prayer_of_the_crimson_crown',
            description: 'talent_descr.candace_prayer_of_the_crimson_crown',
            stats: {
                dmg_normal_anemo: TalentValues.BaseDmgBonus,
                dmg_normal_geo: TalentValues.BaseDmgBonus,
                dmg_normal_pyro: TalentValues.BaseDmgBonus,
                dmg_normal_electro: TalentValues.BaseDmgBonus,
                dmg_normal_hydro: TalentValues.BaseDmgBonus,
                dmg_normal_cryo: TalentValues.BaseDmgBonus,
                dmg_normal_dendro: TalentValues.BaseDmgBonus,
            },
        }),
        new Condition({
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'candace_prayer_of_the_crimson_crown'}),
                meleeReceiver(),
            ]),
            settings: {
                attack_infusion_hydro: 1,
            },
        }),
        new ConditionStatic({
            title: 'talent_name.candace_aegis_of_crossed_arrows',
            description: 'talent_descr.candace_aegis_of_crossed_arrows',
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.candace_celestial_dome_of_sand',
            description: 'talent_descr.candace_celestial_dome_of_sand',
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    postEffects: [
        // Burst A4 NormalAttack elemental DMG from Max HP (team, dmg_normal_*).
        // Game data: UNIQUE_Candace_ElementalBurst_WaterField_LocalHandler
        // computes ModifyDamageMixin damagePercentageRatio
        // [Buff_NormalAttack_MaxHP2DMGRatio, FIGHT_PROP_MAX_HP, MUL, 1000, DIV]
        // gated by Talent_Candace_PermanentSkill_2 (A4, ProudSkill 722201
        // param 0.005 = 0.5% per 1000 HP; talent text: Celestial Dome of Sand).
        // FIGHT_PROP_MAX_HP is the total read (md/buff_chains.md), as for
        // Baizhu, Chevreuse and Columbina; the same number as premod while no
        // ability writes extra HP. GO reads input.total.hp.
        new PostEffectStatsHP({
            receivers: RECEIVERS.TEAM,
            reads: CHANNELS.TOTAL,
            percent: [
                new StatTable('dmg_normal_anemo', [TalentValues.A4BonusScale]),
                new StatTable('dmg_normal_geo', [TalentValues.A4BonusScale]),
                new StatTable('dmg_normal_pyro', [TalentValues.A4BonusScale]),
                new StatTable('dmg_normal_electro', [TalentValues.A4BonusScale]),
                new StatTable('dmg_normal_hydro', [TalentValues.A4BonusScale]),
                new StatTable('dmg_normal_cryo', [TalentValues.A4BonusScale]),
                new StatTable('dmg_normal_dendro', [TalentValues.A4BonusScale]),
            ],
            conditions: [
                new ConditionAscensionChar({ascension: 4}),
                new ConditionBoolean({name: 'candace_prayer_of_the_crimson_crown'}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.candace_returning_heiress_of_the_scarlet_sands',
                    description: 'talent_descr.candace_returning_heiress_of_the_scarlet_sands',
                }),
            ],
        },
        {
            conditions: [
                // C2 Max HP +20%: the game writes Actor_MaxHPRatio (no "Extra",
                // i.e. premod) in UNIQUE_Candace_Constellation_2_MaxHPUp
                // (Talent Candace_Constellation_2 paramList [0.2, 15]; GO puts it
                // under premod hp_). Flat conditions are always premod, so this
                // needs nothing.
                new ConditionBoolean({
                    name: 'candace_moon_piercing_brilliance',
                    serializeId: 2,
                    title: 'talent_name.candace_moon_piercing_brilliance',
                    description: 'talent_descr.candace_moon_piercing_brilliance',
                    stats: {
                        hp_percent: TalentValues.C2HpBonus,
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
                    title: 'talent_name.candace_sentinel_oath',
                    description: 'talent_descr.candace_sentinel_oath',
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
                // C6 display only (15% Max HP wave): the real hit is
                // candace_the_overflow_dmg above (game: ExtraAvatarInAttack_DMG x
                // FIGHT_PROP_MAX_HP, total). text_percent_dmg has no extra lane
                // and needs nothing.
                new ConditionStatic({
                    title: 'talent_name.candace_the_overflow',
                    description: 'talent_descr.candace_the_overflow',
                    stats: {
                        text_percent_dmg: TalentValues.C6Damage,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox']],
});
