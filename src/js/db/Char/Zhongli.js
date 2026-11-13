import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionStacks } from "../../classes/Condition/Stacks";
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
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureShield } from "../../classes/Feature2/Shield";
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { PostEffectStatsHP } from "../../classes/PostEffect/Stats/HP";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Zhongli.s1_id,
        title: 'talent_name.zhongli_rain_of_stone',
        description: 'talent_descr.zhongli_rain_of_stone',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Zhongli.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Zhongli.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Zhongli.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Zhongli.s1.p4),
            },
            {
                type: 'multihit',
                hits: 4,
                table: new StatTable('normal_hit_5', charTalentTables.Zhongli.s1.p5),
            },
            {
                table: new StatTable('normal_hit_6', charTalentTables.Zhongli.s1.p6),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Zhongli.s1.p7),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Zhongli.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Zhongli.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Zhongli.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Zhongli.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Zhongli.s2_id,
        title: 'talent_name.zhongli_dominus_lapidis',
        description: 'talent_descr.zhongli_dominus_lapidis',
        items: [
            {
                table: new StatTable('zhongli_stele_dmg', charTalentTables.Zhongli.s2.p1),
            },
            {
                table: new StatTable('zhongli_resonance_dmg', charTalentTables.Zhongli.s2.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd_press', charTalentTables.Zhongli.s2.p3),
            },
            {
                table: new StatTable('hold_dmg', charTalentTables.Zhongli.s2.p4),
            },
            {
                type: 'shield',
                unit: 'hp',
                table: [
                    new StatTable('shield', charTalentTables.Zhongli.s2.p6),
                    new StatTable('', charTalentTables.Zhongli.s2.p5),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('zhongli_shield_duration', charTalentTables.Zhongli.s2.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('cd_hold', charTalentTables.Zhongli.s2.p8),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Zhongli.s3_id,
        title: 'talent_name.zhongli_planet_befall',
        description: 'talent_descr.zhongli_planet_befall',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Zhongli.s3.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('zhongli_petrification_duration', charTalentTables.Zhongli.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Zhongli.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Zhongli.s3.p4),
            },
        ],
    },
});

const A1ShieldStrength = percent(charTalentTables.Zhongli.a1.p1);
const A4NormalHpRatio = charTalentTables.Zhongli.a4.p1;
const A4NormalHpPercent = percent(charTalentTables.Zhongli.a4.p1);
const A4SkillHpRatio = charTalentTables.Zhongli.a4.p2;
const A4SkillHpPercent = percent(charTalentTables.Zhongli.a4.p2);
const A4BurstHpRatio = charTalentTables.Zhongli.a4.p3;
const A4BurstHpPercent = percent(charTalentTables.Zhongli.a4.p3);
const C6HealRatio = percent(charTalentTables.Zhongli.c6.p1);
const C6HealCap = percent(charTalentTables.Zhongli.c6.p2);

export const Zhongli = new DbObjectChar({
    name: 'zhongli',
    serializeId: 31,
    gameId: 10000030,
    iconClass: "char-icon-zhongli",
    rarity: 5,
    element: 'geo',
    weapon: 'polearm',
    origin: 'liyue',
    talents: Talents,
    statTable: charTables.Zhongli,
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
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'normal',
            name: 'normal_hit_5',
            allowInfusion: true,
            items: [
                {
                    hits: 4,
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_5'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5_1',
            isChild: true,
            hits: 4,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_6'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
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
        // A4 Dominance of Earth, Normal/Charged/Plunge (+1.39% of Max HP).
        // Game data: damageExtra [FIGHT_PROP_MAX_HP, HP2ATK_Ratio1, MUL] gated
        // by HP2ATK (Zhongli_PermanentSkill_2, ProudSkill 302201) in
        // Avatar_Zhongli_NormalAttack et al. FIGHT_PROP_MAX_HP is the total
        // marker; same number as premod while nothing writes extra HP. GO
        // prods input.premod.hp with a TODO saying it should be total.
        new FeaturePostEffectValue({
            category: 'attack',
            name: 'zhongli_additional_dmg',
            postEffect: new PostEffectStatsHP({
                // Explicit total read in the data: declare TOTAL even with no
                // extra-HP writer today.
                reads: CHANNELS.TOTAL,
                percent: new StatTable('', [A4NormalHpRatio]),
            }),
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new FeatureDamageSkill({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.zhongli_stele_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.zhongli_resonance_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.hold_dmg'),
                }),
            ],
        }),
        // A4 Dominance of Earth, skill (+1.9% of Max HP). Game data:
        // damageExtra [FIGHT_PROP_MAX_HP, HP2ATK_Ratio2, MUL] (total) in
        // SkillObj_Zhongli_PrimoPillar and Avatar_Zhongli_RockShield, same
        // HP2ATK evidence as above.
        new FeaturePostEffectValue({
            category: 'skill',
            name: 'zhongli_additional_dmg',
            postEffect: new PostEffectStatsHP({
                // Explicit total read in the data: declare TOTAL even with no
                // extra-HP writer today.
                reads: CHANNELS.TOTAL,
                percent: new StatTable('', [A4SkillHpRatio]),
            }),
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        // Jade Shield absorption scales on Max HP (ShieldBaseDuability plus
        // ShieldRatioDuability via GlobalMainShieldMixin in
        // Avatar_Zhongli_RockShield; no FIGHT_PROP marker, as for Kirara).
        // scaling 'hp*' reads the total by construction: no params. GO
        // shieldNodeTalent('hp', ...) reads input.total.hp.
        new FeatureShield({
            category: 'skill',
            element: 'geo',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.shield'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'geo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        // A4 Dominance of Earth, burst (+33% of Max HP). Game data:
        // damageExtra [FIGHT_PROP_MAX_HP, HP2ATK_Ratio3, MUL] (total) in
        // Avatar_Zhongli_GeoOrder, same HP2ATK evidence as above.
        new FeaturePostEffectValue({
            category: 'burst',
            name: 'zhongli_additional_dmg',
            postEffect: new PostEffectStatsHP({
                // Explicit total read in the data: declare TOTAL even with no
                // extra-HP writer today.
                reads: CHANNELS.TOTAL,
                percent: new StatTable('', [A4BurstHpRatio]),
            }),
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    conditions: [
        // Jade Shield RES shred (-20% all elements/phys). Game data:
        // UNIQUE_Zhongli_RockShield_Debuff writes Actor_*SubHurtDelta from
        // special RockShield_Debuff_SubHurtDelta (-0.2): a flat toggle with no
        // stat read. Conditions are premod by construction, right for flat
        // buffs: no params.
        new ConditionBoolean({
            name: 'zhongli_jade_shield',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.zhongli_jade_shield',
            description: 'talent_descr.zhongli_jade_shield',
            stats: {
                enemy_res_phys: -20,
                enemy_res_anemo: -20,
                enemy_res_geo: -20,
                enemy_res_pyro: -20,
                enemy_res_electro: -20,
                enemy_res_hydro: -20,
                enemy_res_cryo: -20,
                enemy_res_dendro: -20,
            },
        }),
        // A1 Resonant Waves (Fortify: +5% shield strength per stack). Game data:
        // Zhongli_ToughShield_L1..L5 write Actor_ShieldCostMinusRatio from
        // special ShieldCostMinusRatio (talent Zhongli_PermanentSkill_1,
        // ProudSkill 302101 param 0.05): a flat toggle with no stat read.
        // Conditions are premod by construction, right for flat buffs.
        new ConditionStacks({
            name: 'zhongli_resonant_waves',
            serializeId: 2,
            receivers: RECEIVERS.TEAM,
            title: 'talent_name.zhongli_resonant_waves',
            description: 'talent_descr.zhongli_resonant_waves',
            maxStacks: 5,
            stats: [
                new StatTable('shield', [A1ShieldStrength]),
            ],
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        // A4 display rates (mirrors the multipliers below and the
        // FeaturePostEffectValue rows above): talent base-bonus stats with no
        // extra lane, consumed via Stats.getBaseBonus (getTotal('hp'), total).
        // Same FIGHT_PROP_MAX_HP (total) evidence as above: no params.
        new ConditionStatic({
            title: 'talent_name.zhongli_dominance_of_earth',
            description: 'talent_descr.zhongli_dominance_of_earth',
            stats: {
                normal_base_hp_percent: A4NormalHpPercent,
                skill_base_hp_percent: A4SkillHpPercent,
                burst_base_hp_percent: A4BurstHpPercent,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    // A4 mechanical damage: scaling 'hp*' in a FeatureMultiplier reads the
    // total by construction and needs nothing (same FIGHT_PROP_MAX_HP total
    // evidence as the display values above; GO's premod read is a flagged
    // guess with a TODO saying it should be total).
    multipliers: [
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'ascension4',
            values: new ValueTable([A4NormalHpPercent]),
            condition: new ConditionAscensionChar({ascension: 4}),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal', 'charged', 'plunge'],
            }),
        }),
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'ascension4',
            values: new ValueTable([A4SkillHpPercent]),
            condition: new ConditionAscensionChar({ascension: 4}),
            target: new FeatureMultiplierTarget({
                damageTypes: ['skill'],
            }),
        }),
        new FeatureMultiplier({
            scaling: 'hp*',
            source: 'ascension4',
            values: new ValueTable([A4BurstHpPercent]),
            condition: new ConditionAscensionChar({ascension: 4}),
            target: new FeatureMultiplierTarget({
                damageTypes: ['burst'],
            }),
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.zhongli_rock_the_backbone_of_earth',
                    description: 'talent_descr.zhongli_rock_the_backbone_of_earth',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.zhongli_stone_the_cradle_of_jade',
                    description: 'talent_descr.zhongli_stone_the_cradle_of_jade',
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
                    title: 'talent_name.zhongli_topaz_unbreakable_and_fearless',
                    description: 'talent_descr.zhongli_topaz_unbreakable_and_fearless',
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
                // C6 Chrysos Bounty (40% of taken damage as heal, cap 8% of Max
                // HP): display only. Game data: GlobalMainShieldMixin
                // amountByGetDamage HealRatio capped by
                // healLimitedByLocalCreatureMaxHPRatio (talent 306,
                // Zhongli_Constellation_6 params [0.4, 0.08]); content has no
                // heal feature, so no stat read and no params. GO
                // customHealNode prods input.total.hp (total).
                new ConditionStatic({
                    title: 'talent_name.zhongli_chrysos_bounty_of_dominator',
                    description: 'talent_descr.zhongli_chrysos_bounty_of_dominator',
                    stats: {
                        text_percent_dmg: C6HealRatio,
                        text_percent_hp: C6HealCap,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'checkbox'], [2, 'stacks']],
});
