import { Condition } from '../../classes/Condition'
import { ConditionAscensionChar } from '../../classes/Condition/Ascension/Char';
import { ConditionBoolean } from '../../classes/Condition/Boolean'
import { ConditionConstellation } from '../../classes/Condition/Constellation';
import { ConditionStatic } from '../../classes/Condition/Static';
import { CHANNELS } from "../../classes/PostEffect/Channels";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation"
import { DbObjectTalents } from '../../classes/DbObject/Talents';
import { FeatureDamageBurst } from '../../classes/Feature2/Damage/Burst';
import { FeatureDamageCharged } from '../../classes/Feature2/Damage/Charged';
import { FeatureDamageMultihit } from '../../classes/Feature2/Damage/Multihit';
import { FeatureDamageNormal } from '../../classes/Feature2/Damage/Normal';
import { FeatureDamagePlungeCollision } from '../../classes/Feature2/Damage/Plunge/Collision';
import { FeatureDamagePlungeShockWave } from '../../classes/Feature2/Damage/Plunge/ShockWave';
import { FeatureDamageSkill } from '../../classes/Feature2/Damage/Skill';
import { FeatureMultiplier } from '../../classes/Feature2/Multiplier';
import { FeatureMultiplierList } from '../../classes/Feature2/Multiplier/List';
import { FeatureMultiplierKiraraBurst } from '../../classes/Feature2/Multiplier/KiraraBurst';
import { FeatureShield } from '../../classes/Feature2/Shield';
import { PostEffectStatsHP } from '../../classes/PostEffect/Stats/HP';
import { StatTable } from "../../classes/StatTable"
import { RECEIVERS } from "../../classes/Team/Receivers";
import { ValueTable } from '../../classes/ValueTable';
import { charTables } from "../generated/CharTables";
import { charTalentTables } from '../generated/CharTalentTables';
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Kirara.s1_id,
        title: 'talent_name.kirara_boxcutter',
        description: 'talent_descr.kirara_boxcutter',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Kirara.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Kirara.s1.p2),
            },
            {
                type: 'hits',
                name: 'normal_hit_3',
                table: [
                    new StatTable('normal_hit_3_1', charTalentTables.Kirara.s1.p3),
                    new StatTable('normal_hit_3_2', charTalentTables.Kirara.s1.p4),
                ],
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Kirara.s1.p5),
            },
            {
                type: 'hits',
                name: 'charged_hit_total',
                table: [
                    new StatTable('charged_hit_1', charTalentTables.Kirara.s1.p6),
                    new StatTable('charged_hit_2', charTalentTables.Kirara.s1.p7),
                    new StatTable('charged_hit_3', charTalentTables.Kirara.s1.p8),
                ],
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Kirara.s1.p9),
            },
            {
                table: new StatTable('plunge', charTalentTables.Kirara.s1.p10),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Kirara.s1.p11),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Kirara.s1.p12),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Kirara.s2_id,
        title: 'talent_name.kirara_meow_teor_kick',
        description: 'talent_descr.kirara_meow_teor_kick',
        items: [
            {
                table: new StatTable('kirara_flying_kick_dmg', charTalentTables.Kirara.s2.p1),
            },
            {
                type: 'shield',
                unit: 'hp',
                table: [
                    new StatTable('shield_absorption', charTalentTables.Kirara.s2.p2),
                    new StatTable('', charTalentTables.Kirara.s2.p3),
                ],
            },
            {
                type: 'shield',
                unit: 'hp',
                table: [
                    new StatTable('shield_max_absorption', charTalentTables.Kirara.s2.p4),
                    new StatTable('', charTalentTables.Kirara.s2.p5),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('shield_duration', charTalentTables.Kirara.s2.p6),
            },
            {
                table: new StatTable('kirara_urgent_neko_parcel_dmg', charTalentTables.Kirara.s2.p7),
            },
            {
                unit: 'sec',
                table: new StatTable('kirara_urgent_neko_parcel_duration', charTalentTables.Kirara.s2.p8),
            },
            {
                table: new StatTable('kirara_flipclaw_strike_dmg', charTalentTables.Kirara.s2.p9),
            },
            {
                unit: 'sec',
                type: 'separated',
                separator: ' - ',
                unitLast: true,
                table: [
                    new StatTable('cd', charTalentTables.Kirara.s2.p10),
                    new StatTable('cd', charTalentTables.Kirara.s2.p11),
                ],
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Kirara.s3_id,
        title: 'talent_name.kirara_surprise_dispatch',
        description: 'talent_descr.kirara_surprise_dispatch',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.Kirara.s3.p1),
            },
            {
                table: new StatTable('kirara_cat_grass_explosion_dmg', charTalentTables.Kirara.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('kirara_cat_grass_duration', charTalentTables.Kirara.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Kirara.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Kirara.s3.p5),
            },
        ],
    },
});

const TalentValues = {
    A1ShieldBonus: percent(charTalentTables.Kirara.a1.p1),
    A4SkillBonus: percent(charTalentTables.Kirara.a4.p1),
    A4BurstBonus: percent(charTalentTables.Kirara.a4.p2),
    C1SeedHp: 8000,
    C2PartyShield: percent(charTalentTables.Kirara.c2.p1),
    C4Damage: percent(charTalentTables.Kirara.c4.p1),
    C6ElementalBonus: percent(charTalentTables.Kirara.c6.p1),
};

export const Kirara = new DbObjectChar({
    name: 'kirara',
    serializeId: 71,
    gameId: 10000061,
    iconClass: "char-icon-kirara",
    rarity: 4,
    element: 'dendro',
    weapon: 'sword',
    origin: 'inazuma',
    talents: Talents,
    statTable: charTables.Kirara,
    // Every scaling below reads the total stat, so it needs no channels:
    // skill/burst hits scale on ATK (FIGHT_PROP_CUR_ATTACK by convention;
    // GO dmgNode('atk', ...)); shields scale on Max HP through the skill's
    // ShieldHPRatio/ShieldHPConst talent params (Momoka_ElementalArt_Shield_Handler
    // has no FIGHT_PROP_NONEXTRA read; GO shieldNodeTalent('hp', ...) reads
    // input.total.hp), so scaling: 'hp*' is already total. C1's extra-mine
    // count and C4's coordinated hit are plain ATK/HP-scaled hits (see their
    // notes), and C6 is a flat DMG bonus (see constellation note).
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
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.charged_hit_3'),
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
        new FeatureDamageCharged({
            name: 'charged_hit_3',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_3'),
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
            name: 'kirara_flying_kick_dmg',
            element: 'dendro',
            damageBonuses: ['dmg_skill_kirara'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.kirara_flying_kick_dmg'),
                }),
            ],
        }),
        new FeatureShield({
            name: 'shield',
            category: 'skill',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.shield_absorption'),
                }),
            ],
        }),
        new FeatureShield({
            name: 'shield_max_absorption',
            category: 'skill',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.shield_max_absorption'),
                }),
            ],
        }),
        // C2 party shield: 40% of the skill's max shield (talent
        // Momoka_Constellation_2 paramList[0] = 0.4; game multiplies
        // ShieldHPRatio_Max/ShieldHPConst_Max into ShieldHPRatio_Constellation
        // in Avatar_Momoka_Constellation_2_ExtraGrassShield). Same HP-scaled
        // shield path as above: scaling 'hp*' is already total, no params.
        new FeatureShield({
            name: 'kirara_party_shield',
            category: 'skill',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_elemental',
                    values: Talents.getMulti({
                        from: 'skill.shield_absorption',
                        multi: TalentValues.C2PartyShield / 100,
                    }),
                }),
            ],
            condition: new ConditionConstellation({constellation: 2}),
        }),
        new FeatureDamageSkill({
            name: 'kirara_urgent_neko_parcel_dmg',
            element: 'dendro',
            damageBonuses: ['dmg_skill_kirara'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.kirara_urgent_neko_parcel_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'kirara_flipclaw_strike_dmg',
            element: 'dendro',
            damageBonuses: ['dmg_skill_kirara'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.kirara_flipclaw_strike_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'dendro',
            damageBonuses: ['dmg_burst_kirara'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'kirara_cat_grass_explosion_dmg',
            element: 'dendro',
            damageBonuses: ['dmg_burst_kirara'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.kirara_cat_grass_explosion_dmg'),
                }),
            ],
        }),
        // C1 extra Cat Grass Cardamom: game counts floor(Max HP / 8000), cap 4
        // (Avatar_Momoka_Constellation_1 onAbilityStart reads FIGHT_PROP_MAX_HP
        // (total) into Extra_MineCount_Cache; talent Momoka_Constellation_1
        // paramList[0] = 0.000125 = 1/8000; GO thresholds on input.total.hp).
        // makeStatTotalItem('hp', ...) already reads the total: no params.
        new FeatureDamageBurst({
            name: 'kirara_cat_grass_explosion_extra_dmg',
            element: 'dendro',
            damageBonuses: ['dmg_burst_kirara'],
            cannotReact: true,
            multipliers: [
                new FeatureMultiplierKiraraBurst({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.kirara_cat_grass_explosion_dmg'),
                }),
            ],
            condition: new ConditionConstellation({constellation: 1}),
        }),
        // C4 coordinated attack: 200% of ATK as Dendro DMG, counted as burst
        // (Avatar_Momoka_Constellation_AddAttack attackProperty damagePercentage
        // Constellation4_Mine_Damage; talent Momoka_Constellation_4 paramList[0]
        // = 2; GO prods input.total.atk). A plain ATK-scaled hit reads the
        // total by default: no params.
        new FeatureDamageBurst({
            name: 'kirara_coordinated_dmg',
            element: 'dendro',
            damageBonuses: ['dmg_burst_kirara'],
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation4',
                    values: new ValueTable([TalentValues.C4Damage]),
                }),
            ],
            condition: new ConditionConstellation({constellation: 4}),
        }),
    ],
    // A1 stacked shields (20% of the skill shield per Reinforced Packaging
    // stack; ProudSkill 6121 paramList[0] = 0.2 = Momoka_PermanentSkill_1_PerShield
    // in Momoka_ElementalArt_Shield_Handler) and the A4 text rows below are
    // display only (text_percent / text_percent_skill / text_percent_burst):
    // no stat read, no channels. A4's mechanical bonuses are the post-effects.
    conditions: [
        new ConditionStatic({
            title: 'talent_name.kirara_bewitching_betwitching_tails',
            description: 'talent_descr.kirara_bewitching_betwitching_tails',
            info: {ascension: 1},
            stats: {
                text_percent: TalentValues.A1ShieldBonus,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.kirara_pupillary_variance',
            description: 'talent_descr.kirara_pupillary_variance',
            info: {ascension: 4},
            stats: {
                text_percent_skill: TalentValues.A4SkillBonus,
                text_percent_burst: TalentValues.A4BurstBonus,
            },
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    postEffects: [
        // Game data: Avatar_Momoka_PermanentSkill_2_Handler (ModifyDamageMixin,
        // openConfig Momoka_PermanentSkill_2 = ProudSkill 612201 params
        // [0.004, 0.003]) scales ElementalArtDMGRatio x FIGHT_PROP_MAX_HP
        // (total) for Elemental_Art tags. KQM Kirara has no stat-interaction
        // test; GO reads input.total.hp. Total read.
        new PostEffectStatsHP({
            reads: CHANNELS.TOTAL,
            percent: new StatTable('dmg_skill_kirara', [TalentValues.A4SkillBonus / 1000]),
            conditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        // Game data: same handler's second ModifyDamageMixin scales
        // ElementalBurstDMGRatio x FIGHT_PROP_MAX_HP (total) for Elemental_Burst;
        // same evidence as dmg_skill_kirara above. GO reads input.total.hp.
        new PostEffectStatsHP({
            reads: CHANNELS.TOTAL,
            percent: new StatTable('dmg_burst_kirara', [TalentValues.A4BurstBonus / 1000]),
            conditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            // C1 display only (text_value_hp = 8000): the mechanical mine count
            // is the burst feature above, which already reads total HP.
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.kirara_material_circulation',
                    description: 'talent_descr.kirara_material_circulation',
                    stats: {
                        text_value_hp: TalentValues.C1SeedHp,
                    },
                }),
            ],
        },
        {
            // C2 display only (text_percent_shield = 40): the mechanical party
            // shield is the skill feature above, HP-scaled (total), no params.
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.kirara_perfectly_packaged',
                    description: 'talent_descr.kirara_perfectly_packaged',
                    stats: {
                        text_percent_shield: TalentValues.C2PartyShield,
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
            // C4 display only (text_percent_atk = 200): the mechanical hit is
            // the burst feature above, ATK-scaled (total), no params.
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.kirara_steed_of_skanda',
                    description: 'talent_descr.kirara_steed_of_skanda',
                    stats: {
                        text_percent_atk: TalentValues.C4Damage,
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
            // C6 flat 12% all-elemental DMG to nearby party (talent
            // Momoka_Constellation_6 paramList[0] = 0.12; game writes
            // Actor_*AddHurtDelta without Extra in
            // UNIQUE_Avatar_Momoka_Constellation_6_ElemDamageUp_Effect).
            // Conditions write premod: default confirmed, no params. GO puts
            // it under teamBuff.premod.
            conditions: [
                new ConditionBoolean({
                    name: 'kirara_countless_sights_to_see',
                    serializeId: 1,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.kirara_countless_sights_to_see',
                    description: 'talent_descr.kirara_countless_sights_to_see',
                    stats: {
                        dmg_anemo: TalentValues.C6ElementalBonus,
                        dmg_geo: TalentValues.C6ElementalBonus,
                        dmg_pyro: TalentValues.C6ElementalBonus,
                        dmg_electro: TalentValues.C6ElementalBonus,
                        dmg_hydro: TalentValues.C6ElementalBonus,
                        dmg_cryo: TalentValues.C6ElementalBonus,
                        dmg_dendro: TalentValues.C6ElementalBonus,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'checkbox']],
});
