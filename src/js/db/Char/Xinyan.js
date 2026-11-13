import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageBurstXinyan } from "../../classes/Feature2/Damage/Burst/Xinyan";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeatureShield } from "../../classes/Feature2/Shield";
import { PostEffectStatsDef } from "../../classes/PostEffect/Stats/Def";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Xinyan.s1_id,
        title: 'talent_name.xinyan_dance_on_fire',
        description: 'talent_descr.xinyan_dance_on_fire',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Xinyan.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Xinyan.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Xinyan.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Xinyan.s1.p4),
            },
            {
                table: new StatTable('charged_spin', charTalentTables.Xinyan.s1.p5),
            },
            {
                table: new StatTable('charged_final', charTalentTables.Xinyan.s1.p6),
            },
            {
                unit: 'per_sec',
                table: new StatTable('stamina_cost', charTalentTables.Xinyan.s1.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('max_duration', charTalentTables.Xinyan.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Xinyan.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Xinyan.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Xinyan.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Xinyan.s2_id,
        title: 'talent_name.xinyan_sweeping_fervor',
        description: 'talent_descr.xinyan_sweeping_fervor',
        items: [
            {
                table: new StatTable('swing_dmg', charTalentTables.Xinyan.s2.p1),
            },
            {
                type: 'shield',
                unit: 'def',
                table: [
                    new StatTable('xinyan_shield_level_1', charTalentTables.Xinyan.s2.p2),
                    new StatTable('', charTalentTables.Xinyan.s2.p3),
                ],
            },
            {
                type: 'shield',
                unit: 'def',
                table: [
                    new StatTable('xinyan_shield_level_2', charTalentTables.Xinyan.s2.p4),
                    new StatTable('', charTalentTables.Xinyan.s2.p5),
                ],
            },
            {
                type: 'shield',
                unit: 'def',
                table: [
                    new StatTable('xinyan_shield_level_3', charTalentTables.Xinyan.s2.p6),
                    new StatTable('', charTalentTables.Xinyan.s2.p7),
                ],
            },
            {
                table: new StatTable('dot_dmg', charTalentTables.Xinyan.s2.p8),
            },
            {
                unit: 'sec',
                table: new StatTable('xinyan_duration', charTalentTables.Xinyan.s2.p9),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Xinyan.s2.p10),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Xinyan.s3_id,
        title: 'talent_name.xinyan_riff_revolution',
        description: 'talent_descr.xinyan_riff_revolution',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Xinyan.s3.p1),
            },
            {
                table: new StatTable('dot_dmg', charTalentTables.Xinyan.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Xinyan.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Xinyan.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Xinyan.s3.p4),
            },
        ],
    },
});

const A4PhysDmg = percent(charTalentTables.Xinyan.a4.p1);
const C1AtkSpeed = percent(charTalentTables.Xinyan.c1.p1);
const C2CritRate = percent(charTalentTables.Xinyan.c2.p1);
const C4PhysRes = percent(charTalentTables.Xinyan.c4.p1);
const C6AtkBonus = charTalentTables.Xinyan.c6.p2;
const C6Stamina = -percent(charTalentTables.Xinyan.c6.p1);

export const Xinyan = new DbObjectChar({
    name: 'xinyan',
    serializeId: 30,
    gameId: 10000044,
    iconClass: "char-icon-xinyan",
    rarity: 4,
    element: 'pyro',
    weapon: 'claymore',
    origin: 'liyue',
    talents: Talents,
    statTable: charTables.Xinyan,
    features: [
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_spin'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'charged_final',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_final'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.swing_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.dot_dmg'),
                }),
            ],
        }),
        new FeatureShield({
            category: 'skill',
            element: 'pyro',
            multipliers: [
                // Sweeping Fervor shields (levels 1-3): absorption = DEF ratio
                // x DEF + flat. Game data: UNIQUE_Xinyan_Skill_S_Shield (in
                // Avatar_Xinyan_ElementalArt_Shield_1/2/3) builds shieldHP as
                // Xinyan_ShieldN_DefRatioDurability x FIGHT_PROP_CUR_DEFENSE
                // (total) + Xinyan_ShieldN_BaseDurability. scaling 'def*'
                // reads the total by construction and needs nothing; no
                // ability writes extra DEF, so premod and total DEF agree
                // today. GO shieldNodeTalent('def', ...) agrees.
                new FeatureMultiplierList({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.xinyan_shield_level_1'),
                }),
            ],
        }),
        new FeatureShield({
            category: 'skill',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.xinyan_shield_level_2'),
                }),
            ],
        }),
        new FeatureShield({
            category: 'skill',
            element: 'pyro',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'def*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.xinyan_shield_level_3'),
                }),
            ],
        }),
        new FeatureDamageBurstXinyan({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'pyro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.dot_dmg'),
                }),
            ],
        }),
    ],
    postEffects: [
        // Rockin' in a Flaming World (C6): Charged Attacks gain ATK equal to
        // 50% of DEF. Game data: Avatar_Xinyan_Talent_EnhanceExtraAttack
        // writes Actor_AttackExtraDelta (extra) as
        // Xinyan_Talent_EnhanceExtraAttack_DefPer x FIGHT_PROP_NONEXTRA_DEFENSE
        // (premod); talent config Xinyan_Constellation_6 paramList [-0.3, 0.5].
        // The default channels (premod read, extra write) are confirmed, so no
        // params: premod DEF writers (Columbina's C2 Geo) count, while extra
        // ATK (Bennett's burst) does not feed it back. KQM Xinyan ("C6 affects
        // her Skill and Burst"): the bonus lands on the stats page as flat ATK
        // and her dynamic skill/burst hits count it; no KQM buff-chain
        // interaction test. GO reads input.total.def into premod.atk
        // (supporting evidence only; the game data wins on both ends).
        new PostEffectStatsDef({
            percent: new StatTable('atk', [C6AtkBonus]),
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'xinyan_rockin_in_a_flaming_world'}),
                new ConditionConstellation({constellation: 6}),
            ]),
        }),
    ],
    conditions: [
        new ConditionStatic({
            title: 'talent_name.xinyan_the_show_goes_on_even_without_an_audience',
            description: 'talent_descr.xinyan_the_show_goes_on_even_without_an_audience',
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionBoolean({
            name: 'xinyan_now_thats_rock',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.xinyan_now_thats_rock_n_roll',
            description: 'talent_descr.xinyan_now_thats_rock_n_roll',
            // "...Now That's Rock 'N' Roll!" (A4): flat 15% Physical DMG under
            // the shield. Game data: Xinyan_Talent_ShieldEnhancePhysicalDMG
            // writes Actor_PhysicalAddHurtDelta from the flat
            // Xinyan_Talent_ShieldEnhancePhysicalDMG_DMGRate, no stat read.
            // Flat conditions are always premod: needs nothing. GO
            // teamBuff.premod.physical_dmg_ agrees.
            stats: {
                dmg_phys: A4PhysDmg,
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
                // Fatal Acceleration (C1): flat ATK SPD on CRIT. Game data:
                // Xinyan_Talent_CritEnhanceAtkSpeed writes
                // Animator_OverallSpeedRatio from the flat
                // Avatar_Xinyan_Talent_CritEnhanceAtkSpeed_AttackSpeedRatio
                // (talent Xinyan_Constellation_1 paramList [0.12, 5]), no stat
                // read. Flat conditions are always premod: needs nothing.
                new ConditionBoolean({
                    name: 'xinyan_fatal_acceleration',
                    serializeId: 2,
                    title: 'talent_name.xinyan_fatal_acceleration',
                    description: 'talent_descr.xinyan_fatal_acceleration',
                    stats: {
                        atk_speed_normal: C1AtkSpeed,
                        atk_speed_charged: C1AtkSpeed,
                    },
                }),
            ],
        },
        {
            conditions: [
                // Impromptu Opening (C2): flat 100% burst Physical CRIT. Game
                // data: the burst hit's attackProperty.bonusCritical =
                // Xinyan_Talent_CritWhenElementalBurst_CritRate (talent
                // Xinyan_Constellation_2 paramList [1, ...]), no stat read.
                // Flat conditions are always premod: needs nothing.
                new ConditionStatic({
                    title: 'talent_name.xinyan_impromptu_opening',
                    description: 'talent_descr.xinyan_impromptu_opening',
                    stats: {
                        crit_rate_xinyan: C2CritRate,
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
                // Wildfire Rhythm (C4): flat Physical RES shred on skill hit.
                // Game data (talent Xinyan_Constellation_4 paramList [-0.15,
                // 12]): no stat read. Flat conditions are always premod:
                // needs nothing.
                new ConditionBoolean({
                    name: 'xinyan_wildfire_rhythm',
                    serializeId: 4,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.xinyan_wildfire_rhythm',
                    description: 'talent_descr.xinyan_wildfire_rhythm',
                    stats: {
                        enemy_res_phys: C4PhysRes,
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
                // Rockin' in a Flaming World (C6) toggle: the -30% Charged
                // stamina is display-only here (game: Actor_CostStaminaRatio =
                // Xinyan_Talent_EnhanceExtraAttack_StaminaCost); the ATK bonus
                // itself is the postEffect above. No stat read.
                new ConditionBoolean({
                    name: 'xinyan_rockin_in_a_flaming_world',
                    serializeId: 5,
                    title: 'talent_name.xinyan_rockin_in_a_flaming_world',
                    description: 'talent_descr.xinyan_rockin_in_a_flaming_world',
                    stats: {
                        text_percent: C6Stamina,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'checkbox'], [2, 'checkbox']],
});
