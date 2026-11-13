import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";
import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNumberCitlali } from "../../classes/Condition/Number/Citlali";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { StatTable } from "../../classes/StatTable";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { ValueTable } from "../../classes/ValueTable";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { FeatureShield } from "../../classes/Feature2/Shield";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamage } from "../../classes/Feature2/Damage";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { RECEIVERS } from "../../classes/Team/Receivers";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Citlali.s1_id,
        title: 'talent_name.citlali_shadow_stealing_spirit_vessel',
        description: 'talent_descr.citlali_shadow_stealing_spirit_vessel',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Citlali.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Citlali.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Citlali.s1.p3),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Citlali.s1.p4),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Citlali.s1.p5),
            },
            {
                table: new StatTable('plunge', charTalentTables.Citlali.s1.p6),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Citlali.s1.p7),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Citlali.s1.p8),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Citlali.s2_id,
        title: 'talent_name.citlali_dawnfrost_darkstar',
        description: 'talent_descr.citlali_dawnfrost_darkstar',
        items: [
            {
                table: new StatTable('citlali_obsidian_tzitzimitl_dmg', charTalentTables.Citlali.s2.p1),
            },
            {
                unit: 'mastery',
                type: 'shield',
                table: [
                    new StatTable('shield_absorption', charTalentTables.Citlali.s2.p2),
                    new StatTable('', charTalentTables.Citlali.s2.p3),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('shield_duration', charTalentTables.Citlali.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('citlali_duration', charTalentTables.Citlali.s2.p4),
            },
            {
                unit: 'per_sec',
                table: new StatTable('citlali_cost', charTalentTables.Citlali.s2.p7),
            },
            {
                table: new StatTable('citlali_frostfall_storm_dmg', charTalentTables.Citlali.s2.p5),
            },
            {
                unit: 'unit',
                table: new StatTable('xilonen_nightsoul', charTalentTables.Citlali.s2.p9),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Citlali.s2.p8),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Citlali.s3_id,
        title: 'talent_name.citlali_edict_of_entwined_splendor',
        description: 'talent_descr.citlali_edict_of_entwined_splendor',
        items: [
            {
                table: new StatTable('citlali_ice_storm_dmg', charTalentTables.Citlali.s3.p1),
            },
            {
                unit: '',
                table: new StatTable('citlali_point_gain', charTalentTables.Citlali.s3.p3),
            },
            {
                table: new StatTable('citlali_spiritvessel_skull_dmg', charTalentTables.Citlali.s3.p2),
            },
            {
                unit: '',
                table: new StatTable('citlali_skull_point_gain', charTalentTables.Citlali.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Citlali.s3.p5),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Citlali.s3.p6),
            },
        ],
    },
});

const A1ResShred = -percent(charTalentTables.Citlali.a1.p3);
const A4SkillBonus = percent(charTalentTables.Citlali.a4.p1);
const A4BurstBonus = percent(charTalentTables.Citlali.a4.p2);
const C1MasteryDmgBonus = percent(charTalentTables.Citlali.c1.p1);
const C2MasterySelf = charTalentTables.Citlali.c2.p1;
const C2MasteryOther = charTalentTables.Citlali.c2.p2;
const C2ResShred = -percent(charTalentTables.Citlali.c2.p4);
const C4SkillDmg = percent(charTalentTables.Citlali.c4.p1);
const C6MaxPoints = charTalentTables.Citlali.c6.p4;
const C6PointDmgBonus = percent(charTalentTables.Citlali.c6.p1);
const C6PointDmgBonusSelf = percent(charTalentTables.Citlali.c6.p3);

// Stellar Blade raises the DMG of a nearby active character other than
// Citlali.
const activeOtherReceiver = new ConditionReceiver({
    condition: new ConditionOnField(),
});

export const Citlali = new DbObjectChar({
    name: 'citlali',
    serializeId: 99,
    gameId: 10000107,
    iconClass: 'char-icon-citlali',
    rarity: 5,
    element: 'cryo',
    weapon: 'catalyst',
    origin: 'natlan',
    talents: Talents,
    statTable: charTables.Citlali,
    features: [
        new FeatureDamageNormal({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.citlali_obsidian_tzitzimitl_dmg'),
                }),
            ],
        }),
        // A4 Itzpapalotl's Star Garments (Frostfall Storm): the game
        // (Citalali_CurlocalAvatar_Attack in Avatar_Citlali_ElementalArt_Handler)
        // scales damageExtra Ratio1 on FIGHT_PROP_ELEMENT_MASTERY (total EM).
        // Hit damage multipliers read the total (scaling mastery*), no params.
        new FeatureDamageSkill({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.citlali_frostfall_storm_dmg'),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'ascension4',
                    values: new ValueTable([A4SkillBonus]),
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'citlali_itzpapalotls_star_garments'}),
                        new ConditionAscensionChar({ascension: 4}),
                    ]),
                }),
            ],
        }),
        // Skill Opal Shield: the game (UNIQUE_Citlali_ElementalArt_IceShield_Team,
        // GlobalMainShieldMixin shieldHP with FIGHT_PROP_ELEMENT_MASTERY) reads
        // total EM. Shield scalings read the total (mastery*), no params.
        new FeatureShield({
            category: 'skill',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'mastery*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.shield_absorption'),
                }),
            ],
        }),
        // A4 Itzpapalotl's Star Garments (Ice Storm): the game
        // (Skillobj_Citlali_ElementalBurst_Gadget1_Material Timer) scales
        // damageExtra Ratio2 on FIGHT_PROP_ELEMENT_MASTERY (total EM).
        // Hit damage multipliers read the total (scaling mastery*), no params.
        new FeatureDamageBurst({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.citlali_ice_storm_dmg'),
                }),
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'ascension4',
                    values: new ValueTable([A4BurstBonus]),
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'citlali_itzpapalotls_star_garments'}),
                        new ConditionAscensionChar({ascension: 4}),
                    ]),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.citlali_spiritvessel_skull_dmg'),
                }),
            ],
        }),
        // C4 Death Defier's Spirit Skull: the game
        // (Skillobj_Citlali_ElementalBurst_Gadget3_Material Timer1) scales
        // damageExtra Talent_Damage on FIGHT_PROP_ELEMENT_MASTERY (total EM).
        // Hit damage multipliers read the total (scaling mastery*), no params.
        new FeatureDamage({
            category: 'other',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'mastery*',
                    source: 'constellation4',
                    values: new StatTable('citlali_obsidian_spiritvessel_skull_dmg', [C4SkillDmg]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 4}),
        }),
    ],
    multipliers: [
        // C1 Radiant Blades of Centzon Mimixcoah: Stellar Blade consumed by a
        // nearby active character other than Citlali raises the dealt DMG by
        // 200% of her Elemental Mastery. The game (UNIQUE_Avatar_Citlali_Talent1_Buff,
        // ModifyDamageCountMixin damageExtra on FIGHT_PROP_ELEMENT_MASTERY) reads
        // total EM. Hit damage multipliers read the total (scaling mastery*), no params.
        new FeatureMultiplier({
            receivers: RECEIVERS.OTHERS,
            scaling: 'mastery*',
            source: 'constellation1',
            values: new ValueTable([C1MasteryDmgBonus]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'citlali_radiant_blades_of_centzon_mimixcoah'}),
                new ConditionConstellation({constellation: 1}),
                activeOtherReceiver,
            ]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal', 'charged', 'plunge', 'skill', 'burst'],
            }),
        }),
    ],
    conditions: [
        // A1 Mamaloaco's Frigid Rain: flat Pyro/Hydro RES shred (enemy debuff,
        // game UNIQUE_Avatar_Citlali_PermanentSkill_ResistDown, no stat read).
        // Flat conditions need nothing.
        new ConditionBoolean({
            name: 'citlali_mamaloacos_frigid_rain',
            serializeId: 1,
            // Frozen/Melt Pyro/Hydro RES shred is an enemy debuff.
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.citlali_mamaloacos_frigid_rain',
            description: 'talent_descr.citlali_mamaloacos_frigid_rain',
            info: {ascension: 1},
            stats:{
                enemy_res_pyro: A1ResShred,
                enemy_res_hydro: A1ResShred,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionBoolean({
            name: 'citlali_itzpapalotls_star_garments',
            serializeId: 2,
            title: 'talent_name.citlali_itzpapalotls_star_garments',
            description: 'talent_descr.citlali_itzpapalotls_star_garments',
            info: {ascension: 4},
            stats:{
                text_percent_1: A4SkillBonus,
                text_percent_2: A4BurstBonus,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    postEffects: [
        // C6 Teoiztac's Secret Pact: each Cifra point grants nearby party
        // members 1.5% Pyro/Hydro DMG Bonus from Citlali's live points.
        // Her own points control already grants her the same.
        // The game (UNIQUE_Avatar_Citlali_Talent6_Buff) writes plain
        // Actor_Fire/WaterAddHurtDelta, i.e. without "Extra": a premod
        // (non-extra) DMG% write, so premod DMG% readers count it. GO writes
        // it under premod as well. The read side is a points counter, not a stat.
        new PostEffectStats({
            receivers: RECEIVERS.OTHERS,
            from: 'citlali_points',
            percent: [
                new StatTable('dmg_pyro', [C6PointDmgBonus]),
                new StatTable('dmg_hydro', [C6PointDmgBonus]),
            ],
            writes: CHANNELS.PREMOD,
            conditions: [
                new ConditionBoolean({name: 'citlali_points'}),
                new ConditionConstellation({constellation: 6}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'citlali_radiant_blades_of_centzon_mimixcoah',
                    serializeId: 5,
                    title: 'talent_name.citlali_radiant_blades_of_centzon_mimixcoah',
                    description: 'talent_descr.citlali_radiant_blades_of_centzon_mimixcoah',
                    stats: {
                        text_percent: C1MasteryDmgBonus,
                    },
                }),
            ],
        },
        {
            conditions: [
                // C2 Heart Devourer's Travail: flat +125 EM for Citlali. The game
                // (Citlali_Talent_SelfMastery) writes plain Actor_ElemMasteryDelta
                // (no "Extra"): premod. Flat conditions are premod, no params.
                new ConditionBoolean({
                    name: 'citlali_heart_devourers_travail',
                    serializeId: 3,
                    title: 'talent_name.citlali_heart_devourers_travail',
                    description: 'talent_descr.citlali_heart_devourers_travail_1',
                    stats: {
                        mastery: C2MasterySelf,
                        text_value_self: C2MasterySelf,
                        text_value_other: C2MasteryOther,
                    },
                }),
                // Other shielded or followed characters gain 250 Mastery.
                // Citlali keeps her 125 above. The game
                // (UNIQUE_Citlali_Talent2_Mastery) writes plain
                // Actor_ElemMasteryDelta: premod. Flat conditions are premod, no params.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        mastery: C2MasteryOther,
                    },
                    condition: new ConditionBoolean({name: 'citlali_heart_devourers_travail'}),
                }),
                new ConditionStatic({
                    // C2 enhanced Mamaloaco's Frigid Rain: flat extra RES shred
                    // (enemy debuff, no stat read). Flat conditions need nothing.
                    // The enhanced Mamaloaco's Frigid Rain is an enemy debuff.
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.citlali_heart_devourers_travail',
                    description: 'talent_descr.citlali_heart_devourers_travail_2',
                    stats: {
                        enemy_res_pyro: C2ResShred,
                        enemy_res_hydro: C2ResShred,
                    },
                    subConditions: [
                        new ConditionBoolean({name: 'citlali_mamaloacos_frigid_rain'}),
                        new ConditionAscensionChar({ascension: 1}),
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
                    title: 'talent_name.citlali_death_defiers_spirit_skull',
                    description: 'talent_descr.citlali_death_defiers_spirit_skull',
                    stats: {
                        text_percent_dmg: C4SkillDmg,
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
                    title: 'talent_name.citlali_teoiztacs_secret_pact',
                    description: 'talent_descr.citlali_teoiztacs_secret_pact_1',
                }),
                // C6 Teoiztac's Secret Pact points control: each point grants
                // Citlali 2.5% all-DMG (self) and 1.5% Pyro/Hydro DMG (the team
                // copy, same as the postEffect above). The game self buff
                // (UNIQUE_Avatar_Citlali_Talent6_SelfBuff) is a hit-level
                // ModifyDamageMixin with no Actor channel, and dmg_all has no
                // extra lane here; the Pyro/Hydro copy matches the team's plain
                // (premod) Actor_Fire/WaterAddHurtDelta through this premod
                // condition. Points, not a stat: no read channel. Defaults kept.
                new ConditionNumberCitlali({
                    name: 'citlali_points',
                    serializeId: 4,
                    title: 'talent_name.citlali_teoiztacs_secret_pact',
                    description: 'talent_descr.citlali_teoiztacs_secret_pact_2',
                    max: C6MaxPoints,
                    otherBonus: C6PointDmgBonus,
                    selfBonus: C6PointDmgBonusSelf,
                    stats: {
                        text_percent_1: C6PointDmgBonus,
                        text_percent_2: C6PointDmgBonusSelf,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox'], [4, 'checkbox'], [5, 'checkbox'], [6, 'number']],
});
