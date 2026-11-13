import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumberBondOfLife } from "../../classes/Condition/Number/BondOfLife";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { StatTable } from "../../classes/StatTable";
import { charTalentTables } from "../generated/CharTalentTables";
import { charTables } from "../generated/CharTables";
import { percent } from "../Params";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureDamageMultihit } from "../../classes/Feature2/Damage/Multihit";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { ValueTable } from "../../classes/ValueTable";
import { ConditionAnd } from "../../classes/Condition/And";
import { FeatureHeal } from "../../classes/Feature2/Heal";
import { FeatureMultiplierBondOfLife } from "../../classes/Feature2/Multiplier/BondOfLife";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeatureMultiplierClorinde } from "../../classes/Feature2/Multiplier/Clorinde";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Clorinde.s1_id,
        title: 'talent_name.clorinde_oath_of_hunting_shadows',
        description: 'talent_descr.clorinde_oath_of_hunting_shadows',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Clorinde.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Clorinde.s1.p2),
            },
            {
                type: 'multihit',
                hits: 2,
                table: new StatTable('normal_hit_3', charTalentTables.Clorinde.s1.p3),
            },
            {
                type: 'multihit',
                hits: 3,
                table: new StatTable('normal_hit_4', charTalentTables.Clorinde.s1.p5),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Clorinde.s1.p10),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Clorinde.s1.p11),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Clorinde.s1.p12),
            },
            {
                table: new StatTable('plunge', charTalentTables.Clorinde.s1.p13),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Clorinde.s1.p14),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Clorinde.s1.p15),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Clorinde.s2_id,
        title: 'talent_name.clorinde_hunters_vigil',
        description: 'talent_descr.clorinde_hunters_vigil',
        items: [
            {
                type: 'separated',
                table: [
                    new StatTable('clorinde_wild_hunt_dmg', charTalentTables.Clorinde.s2.p1),
                    new StatTable('clorinde_wild_hunt_2_dmg', charTalentTables.Clorinde.s2.p2),
                ],
            },
            {
                table: new StatTable('clorinde_wild_hunt_bol', charTalentTables.Clorinde.s2.p3),
            },
            {
                type: 'separated',
                table: [
                    new StatTable('clorinde_impale_the_night_dmg', charTalentTables.Clorinde.s2.p4),
                    new StatTable('clorinde_impale_the_night_2_dmg', charTalentTables.Clorinde.s2.p5),
                    new StatTable('clorinde_impale_the_night_3_dmg', charTalentTables.Clorinde.s2.p7),
                ],
                counts: ['', '', 3],
            },
            {
                type: 'separated',
                table: [
                    new StatTable('clorinde_impale_the_night_heal', [0]),
                    new StatTable('clorinde_impale_the_night_2_heal', charTalentTables.Clorinde.s2.p6),
                    new StatTable('clorinde_impale_the_night_3_heal', charTalentTables.Clorinde.s2.p8),
                ],
            },
            {
                table: new StatTable('clorinde_conversion', charTalentTables.Clorinde.s2.p9),
            },
            {
                table: new StatTable('surging_blade_dmg', charTalentTables.Clorinde.s2.p10),
            },
            {
                unit: 'sec',
                table: new StatTable('surging_blade_interval', charTalentTables.Clorinde.s2.p11),
            },
            {
                unit: 'sec',
                table: new StatTable('clorinde_duration', charTalentTables.Clorinde.s2.p12),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Clorinde.s2.p13),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Clorinde.s3_id,
        title: 'talent_name.clorinde_last_lightfall',
        description: 'talent_descr.clorinde_last_lightfall',
        items: [
            {
                type: 'multihit',
                hits: 5,
                table: new StatTable('burst_dmg', charTalentTables.Clorinde.s3.p1),
            },
            {
                table: new StatTable('clorinde_burst_bol', charTalentTables.Clorinde.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Clorinde.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Clorinde.s3.p4),
            },
        ],
    },
});

const TalentValues = {
    A4CritRate: percent(charTalentTables.Clorinde.a4.p3),
    C0ElectroBonus: percent(charTalentTables.Clorinde.a1.p3),
    C0ElectroBonusMax: charTalentTables.Clorinde.a1.p2,
    C1Damage: percent(charTalentTables.Clorinde.c1.p2),
    C2ElectroBonus: percent(charTalentTables.Clorinde.c2.p2),
    C2ElectroBonusMax: charTalentTables.Clorinde.c2.p1,
    C4BurstBonus: percent(charTalentTables.Clorinde.c4.p1),
    C4BurstBonusCap: percent(charTalentTables.Clorinde.c4.p2),
    C6CritRate: percent(charTalentTables.Clorinde.c6.p1),
    C6CritDmg: percent(charTalentTables.Clorinde.c6.p2),
    C6Damage: percent(charTalentTables.Clorinde.c6.p5),
};

export const Clorinde = new DbObjectChar({
    name: 'clorinde',
    serializeId: 86,
    gameId: 10000098,
    iconClass: 'char-icon-clorinde',
    rarity: 5,
    element: 'electro',
    weapon: 'sword',
    origin: 'fontaine',
    talents: Talents,
    statTable: charTables.Clorinde,
    // Damage hits below (normal/charged/plunge/skill/burst, Surging Blade) read the
    // total ATK by construction (default atk* scaling) and need nothing. A4 Lawful
    // Remuneration is a flat CRIT toggle: its game gate (BoL >= 100% MaxHP,
    // UNIQUE_Avatar_Clorinde_PermanentSkill_2_Handler predicate on FIGHT_PROP_MAX_HP)
    // is user-toggled here, with no stat scaling.
    features: [
        new FeatureDamageNormal({
            name: 'normal_hit_1',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_1'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'clorinde_night_watch'}),
            ]),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'clorinde_night_watch'}),
            ]),
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_3',
            allowInfusion: true,
            items: [
                {
                    hits: 2,
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_3'),
                        }),
                    ],
                },
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'clorinde_night_watch'}),
            ]),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_3_1',
            isChild: true,
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_3'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'clorinde_night_watch'}),
            ]),
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_4',
            allowInfusion: true,
            items: [
                {
                    hits: 3,
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_4'),
                        }),
                    ],
                },
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'clorinde_night_watch'}),
            ]),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4_1',
            isChild: true,
            hits: 3,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'clorinde_night_watch'}),
            ]),
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5'),
                }),
            ],
            condition: new ConditionNot([
                new ConditionBoolean({name: 'clorinde_night_watch'}),
            ]),
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
        new FeatureDamageNormal({
            name: 'clorinde_wild_hunt_1_dmg',
            element: 'electro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.clorinde_wild_hunt_dmg'),
                }),
            ],
            condition: new ConditionBoolean({name: 'clorinde_night_watch'}),
        }),
        new FeatureDamageNormal({
            name: 'clorinde_wild_hunt_2_dmg',
            element: 'electro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.clorinde_wild_hunt_2_dmg'),
                }),
            ],
            condition: new ConditionBoolean({name: 'clorinde_night_watch'}),
        }),

        new FeatureDamageNormal({
            name: 'clorinde_impale_the_night_1_dmg',
            element: 'electro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.clorinde_impale_the_night_dmg'),
                }),
            ],
            condition: new ConditionBoolean({name: 'clorinde_night_watch'}),
        }),
        new FeatureDamageNormal({
            name: 'clorinde_impale_the_night_2_dmg',
            element: 'electro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.clorinde_impale_the_night_2_dmg'),
                }),
            ],
            condition: new ConditionBoolean({name: 'clorinde_night_watch'}),
        }),
        new FeatureDamageNormal({
            name: 'clorinde_impale_the_night_3_dmg',
            element: 'electro',
            category: 'skill',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.clorinde_impale_the_night_3_dmg'),
                }),
            ],
            condition: new ConditionBoolean({name: 'clorinde_night_watch'}),
        }),
        new FeatureDamageNormal({
            name: 'clorinde_nightwatch_shade_dmg',
            element: 'electro',
            category: 'skill',
            multipliers: [
                // Game data: C1 coordinated attacks (Avatar_Clorinde_Constellation_1_Gadget)
                // damageExtra off ATK; GO reads input.total.atk. Damage hits read the
                // total by construction (default atk* scaling), so nothing is declared.
                new FeatureMultiplier({
                    source: 'constellation1',
                    values: new ValueTable([TalentValues.C1Damage]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'clorinde_night_watch'}),
                new ConditionConstellation({constellation: 1}),
            ]),
        }),
        new FeatureHeal({
            category: 'skill',
            name: 'clorinde_impale_the_night_2_heal',
            subtractBoL: true,
            multipliers: [
                // Game data: Avatar_Clorinde_ElementalArt_Dodge HealHP amounts read
                // FIGHT_PROP_CUR_HP_DEBTS (Bond of Life); healing converts to BoL
                // (SwitchHealToHPDebtsMixin). scaling 'hp*' already reads the total HP
                // and bond_of_life has no extra lane, so no params. No ability writes
                // extra HP, so premod and total HP agree today.
                new FeatureMultiplierBondOfLife({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.clorinde_impale_the_night_2_heal'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'skill',
            name: 'clorinde_impale_the_night_3_heal',
            subtractBoL: true,
            multipliers: [
                // Same evidence as clorinde_impale_the_night_2_heal above: total HP
                // by construction (hp*), bond_of_life has no lane.
                new FeatureMultiplierBondOfLife({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.clorinde_impale_the_night_3_heal'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'surging_blade_dmg',
            element: 'electro',
            cannotReact: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.surging_blade_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'electro',
            damageBonuses: ['dmg_burst_clorinde'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'clorinde_glimbright_shade_dmg',
            element: 'electro',
            category: 'other',
            multipliers: [
                // Game data: C6 Glimbright Shade damageExtra off ATK; GO reads
                // input.total.atk. Damage hits read the total by construction.
                new FeatureMultiplier({
                    source: 'constellation6',
                    values: new ValueTable([TalentValues.C6Damage]),
                }),
            ],
            condition: new ConditionAnd([
                new ConditionConstellation({constellation: 6}),
            ]),
        }),
    ],
    conditions: [
        new ConditionNumberBondOfLife({
            serializeId: 1,
        }),
        new Condition({
            stats: {
                clorinde_electro_dmg_max: TalentValues.C0ElectroBonusMax,
            },
        }),
        new Condition({
            settings: {
                clorinde_stacks_level: 2,
            },
            subConditions: [
                new ConditionConstellation({constellation: 2}),
            ]
        }),
        new ConditionBoolean({
            name: 'clorinde_night_watch',
            serializeId: 2,
            title: 'talent_name.clorinde_night_watch',
            description: 'talent_descr.clorinde_night_watch',
        }),
        new ConditionStacks({
            name: 'clorinde_dark_shattering_flame',
            serializeId: 3,
            title: 'talent_name.clorinde_dark_shattering_flame',
            description: 'talent_descr.clorinde_dark_shattering_flame',
            maxStacks: 3,
            levelSetting: 'clorinde_stacks_level',
            info: {ascension: 1},
            stats: [
                new StatTable('dmg_electro_clorinde', [TalentValues.C0ElectroBonus, TalentValues.C2ElectroBonus]),
                new StatTable('text_value_max', [TalentValues.C0ElectroBonusMax]),
            ],
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStacks({
            name: 'clorinde_lawful_remuneration',
            serializeId: 4,
            title: 'talent_name.clorinde_lawful_remuneration',
            description: 'talent_descr.clorinde_lawful_remuneration',
            maxStacks: 2,
            info: {ascension: 4},
            stats: [
                new StatTable('crit_rate', [TalentValues.A4CritRate]),
            ],
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    postEffects: [
        // C4 To Enshrine Tears, Life, and Love: game data
        // Avatar_Clorinde_ElementalBurst_Activate onAbilityStart sets
        // Clorinde_Constellation_4_final_ratio from FIGHT_PROP_CUR_HP_DEBTS x
        // Clorinde_Constellation_4_DMG_Multiplier x 100 / FIGHT_PROP_MAX_HP (total HP;
        // ProudSkill talent 984 = [0.02, 2]: 2% per 1% BoL, max 200%), applied by
        // ModifyDamageMixin to the burst. Our from 'bond_of_life' (BoL percent)
        // matches that formula, and bond_of_life / dmg_burst_clorinde have no extra
        // lane, so no params. KQM has no interaction test; GO reads a user BoL percent.
        new PostEffectStats({
            from: 'bond_of_life',
            percent: new StatTable('dmg_burst_clorinde', [TalentValues.C4BurstBonus * 100]),
            statCap: new ValueTable([TalentValues.C4BurstBonusCap]),
            conditions: [
                new ConditionConstellation({constellation: 4}),
            ],
        }),
    ],
    multipliers: [
        // A1 Dark-Shattering Flame: game data Avatar_Clorinde_Talent_PassiveSkill,
        // UNIQUE_Clorinde_PermanentSkill_1_Buff_DamageExtra (onAdded/onThinkInterval)
        // sets Clorinde_PermanentSkill_1_DamageExtra from FIGHT_PROP_CUR_ATTACK (total)
        // x AttackTo_DamageExtra_Ratio (ProudSkill 982101: 0.2, max 1800; C2 talent 982:
        // 0.3, max 2700), applied by ModifyDamageMixin to Normal Attacks and the burst.
        // GO reads input.total.atk. The default atk* scaling already reads the total,
        // so no params; it counts every ATK buff (Bennett extra, Columbina C2 premod).
        new FeatureMultiplierClorinde({
            source: 'ascension1',
            leveling: 'clorinde_stacks_level',
            stacksLeveling: 'clorinde_dark_shattering_flame',
            values: new ValueTable([TalentValues.C0ElectroBonus, TalentValues.C2ElectroBonus]),
            condition: new ConditionAscensionChar({ascension: 1}),
            target: new FeatureMultiplierTarget({
                damageElements: ['electro'],
                damageTypes: ['normal', 'burst'],
            }),
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.clorinde_from_this_day_i_pass_the_candles_shadow_veil',
                    description: 'talent_descr.clorinde_from_this_day_i_pass_the_candles_shadow_veil',
                    stats: {
                        text_percent_dmg: TalentValues.C1Damage,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.clorinde_now_as_we_face_the_perils_of_the_long_night',
                    description: 'talent_descr.clorinde_now_as_we_face_the_perils_of_the_long_night',
                    stats: {
                        text_percent: TalentValues.C2ElectroBonus,
                        text_value: TalentValues.C2ElectroBonusMax,
                        clorinde_electro_dmg_max: TalentValues.C2ElectroBonusMax - TalentValues.C0ElectroBonusMax,
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
                new ConditionStatic({
                    title: 'talent_name.clorinde_to_enshrine_tears_life_and_love',
                    description: 'talent_descr.clorinde_to_enshrine_tears_life_and_love',
                    stats: {
                        text_percent: TalentValues.C4BurstBonus,
                        text_percent_max: TalentValues.C4BurstBonusCap,
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
                    name: 'clorinde_and_so_shall_i_never_despair',
                    serializeId: 6,
                    title: 'talent_name.clorinde_and_so_shall_i_never_despair',
                    description: 'talent_descr.clorinde_and_so_shall_i_never_despair_1',
                    stats: {
                        crit_rate: TalentValues.C6CritRate,
                        crit_dmg: TalentValues.C6CritDmg,
                    },
                }),
                new ConditionStatic({
                    title: 'talent_name.clorinde_and_so_shall_i_never_despair',
                    description: 'talent_descr.clorinde_and_so_shall_i_never_despair_2',
                    stats: {
                        text_percent_dmg: TalentValues.C6Damage,
                    },
                }),
            ],
        },
    ]),
});
