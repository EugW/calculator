import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
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
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsRecharge } from "../../classes/PostEffect/Stats/Recharge";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Dori.s1_id,
        title: 'talent_name.dori_marvelous_sword_dance_modified',
        description: 'talent_descr.dori_marvelous_sword_dance_modified',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Dori.s1.p1),
            },
            {
                type: 'hits',
                name: 'normal_hit_2',
                table: [
                    new StatTable('normal_hit_2_1', charTalentTables.Dori.s1.p2),
                    new StatTable('normal_hit_2_2', charTalentTables.Dori.s1.p3),
                ],
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Dori.s1.p4),
            },
            {
                table: new StatTable('charged_spin', charTalentTables.Dori.s1.p5),
            },
            {
                table: new StatTable('charged_final', charTalentTables.Dori.s1.p6),
            },
            {
                unit: 'per_sec',
                table: new StatTable('stamina_cost', charTalentTables.Dori.s1.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('max_duration', charTalentTables.Dori.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Dori.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Dori.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Dori.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Dori.s2_id,
        title: 'talent_name.dori_troubleshooter_cannon',
        description: 'talent_descr.dori_troubleshooter_cannon',
        items: [
            {
                table: new StatTable('dori_troubleshooter_shot_dmg', charTalentTables.Dori.s2.p1),
            },
            {
                table: new StatTable('dori_aftersales_service_round_dmg', charTalentTables.Dori.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Dori.s2.p3),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Dori.s3_id,
        title: 'talent_name.dori_alcazarzarays_exactitude',
        description: 'talent_descr.dori_alcazarzarays_exactitude',
        items: [
            {
                table: new StatTable('dori_connector_dmg', charTalentTables.Dori.s3.p1),
            },
            {
                type: 'shield',
                unit: 'hp',
                table: [
                    new StatTable('heal_dot', charTalentTables.Dori.s3.p2),
                    new StatTable('', charTalentTables.Dori.s3.p3),
                ],
            },
            {
                unit: '',
                table: new StatTable('dori_energy_regeneration', charTalentTables.Dori.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Dori.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Dori.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Dori.s3.p7),
            },
        ],
    },
});

const TalentValues = {
    C2Damage: percent(charTalentTables.Dori.c2.p1),
    C4HealingRecv: percent(charTalentTables.Dori.c4.p1),
    C4Recharge: percent(charTalentTables.Dori.c4.p2),
    C6Heal: percent(charTalentTables.Dori.c6.p2),
    A4Energy: charTalentTables.Dori.a4.p1,
    A4EnergyMax: charTalentTables.Dori.a4.p2,
};

export const Dori = new DbObjectChar({
    name: 'dori',
    serializeId: 56,
    gameId: 10000068,
    iconClass: "char-icon-dori",
    rarity: 4,
    element: 'electro',
    weapon: 'claymore',
    origin: 'sumeru',
    talents: Talents,
    statTable: charTables.Dori,
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
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_2',
            allowInfusion: true,
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_2_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_2_2'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2_1',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_2_2',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_2_2'),
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
        new FeatureDamageCharged({
            name: 'charged_spin',
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
            name: 'dori_troubleshooter_shot_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.dori_troubleshooter_shot_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'dori_aftersales_service_round_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.dori_aftersales_service_round_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'dori_special_franchise',
            element: 'electro',
            // C2 Jinni Toop: 50% of ATK (game: Dori_Constellation_2,
            // paramList 0.5). A damage hit reads the total and needs nothing.
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation2',
                    values: new ValueTable([TalentValues.C2Damage]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 2}),
        }),
        new FeaturePostEffectValue({
            name: 'dori_compound_interest',
            category: 'skill',
            format: 'decimal',
            digits: 2,
            postEffect: new PostEffectStatsRecharge({
                // Game data: Avatar_Dori_ElementalArt / ElementalArt_Bullet_Ball
                // sets _ABILITY_Dori_ElementalArt_ReviveEnergy from
                // FIGHT_PROP_CHARGE_EFFICIENCY (total ER), gated by
                // Dori_PermanentSkill_2 (= A4; ProudSkill paramList [5, 15]).
                // Same pattern as Alyosha's A4, opposite to Sara's Decorum and
                // Raiden's restore (FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY).
                // GO reads input.total.enerRech_; KQM notes only that every
                // point of ER counts, with no chain test.
                reads: CHANNELS.TOTAL,
                percent: new StatTable('', [TalentValues.A4Energy]),
                statCap: new ValueTable([TalentValues.A4EnergyMax]),
            }),
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new FeatureHeal({
            category: 'skill',
            name: 'dori_sprinkling_weight',
            partyHeal: 1,
            // C6 heal: 4% of Max HP (game: Avatar_Dori_Constellation_6,
            // HealHP_OnHittingOthers, talent paramList 0.04). A heal reads
            // the total and needs nothing; no ability writes extra HP.
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    source: 'constellation6',
                    values: new ValueTable([TalentValues.C6Heal]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
        new FeatureDamageBurst({
            name: 'dori_connector_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.dori_connector_dmg'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'burst',
            name: 'heal_dot',
            partyHeal: 1,
            // Burst heal scales on Max HP (game: abilitySpecials HealHP
            // params). A heal reads the total and needs nothing; no ability
            // writes extra HP, so total == premod today.
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.getList('burst.heal_dot'),
                }),
            ],
        }),
    ],
    conditions: [
        new ConditionStatic({
            title: 'talent_name.dori_an_eye_for_gold',
            description: 'talent_descr.dori_an_eye_for_gold',
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.dori_compound_interest',
            description: 'talent_descr.dori_compound_interest',
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.dori_additional_investment',
                    description: 'talent_descr.dori_additional_investment',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.dori_special_franchise',
                    description: 'talent_descr.dori_special_franchise',
                    stats: {
                        text_percent: TalentValues.C2Damage,
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
                new ConditionBoolean({
                    name: 'dori_discretionary_supplement_1',
                    serializeId: 1,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.dori_discretionary_supplement',
                    description: 'talent_descr.dori_discretionary_supplement_1',
                    // C4 buffs are flat (game:
                    // Dori_Constellation_4_Buff_HealedAddUp writes
                    // Actor_HealedAddDelta, no "Extra": premod). Conditions
                    // are always premod: default confirmed, no params.
                    stats: {
                        healing_recv: TalentValues.C4HealingRecv,
                    },
                }),
                new ConditionBoolean({
                    name: 'dori_discretionary_supplement_2',
                    serializeId: 2,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.dori_discretionary_supplement',
                    description: 'talent_descr.dori_discretionary_supplement_2',
                    // C4 buffs are flat (game:
                    // Dori_Constellation_4_Buff_ChargeEfficiencyUp writes
                    // Actor_ChargeEfficiencyDelta, no "Extra": premod).
                    // Conditions are always premod: default confirmed.
                    stats: {
                        recharge: TalentValues.C4Recharge,
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
                new Condition({
                    settings: {
                        allowed_infusion_electro: 1,
                    },
                }),
                new ConditionBoolean({
                    name: 'dori_sprinkling_weight',
                    serializeId: 3,
                    title: 'talent_name.dori_sprinkling_weight',
                    description: 'talent_descr.dori_sprinkling_weight',
                    stats: {
                        text_percent: TalentValues.C6Heal,
                    },
                    settings: {
                        attack_infusion_electro: 1,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'checkbox'], [2, 'checkbox']],
});
