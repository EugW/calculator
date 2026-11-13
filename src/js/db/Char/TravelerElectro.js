import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdownTeamMember } from "../../classes/Condition/Dropdown/TeamMember";
import { ConditionDropdownTravelerResonated } from "../../classes/Condition/Dropdown/TravelerResonated";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionSelectedReceiver } from "../../classes/Condition/SelectedReceiver";
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
import { FeatureMultiplierStatic } from "../../classes/Feature2/Multiplier/Static";
import { FeaturePostEffectValue } from "../../classes/Feature2/PostEffectValue";
import { FeatureStatic } from "../../classes/Feature2/Static";
import { PostEffectStats } from "../../classes/PostEffect/Stats";
import { PostEffectStatsRecharge } from "../../classes/PostEffect/Stats/Recharge";
import { PostEffectStatsStatic } from "../../classes/PostEffect/Stats/Static";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { StatTableAscensionScale } from "../../classes/StatTable/Ascension/Scale";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent, times } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.TravelerElectro.s1_id,
        title: 'talent_name.traveler_foreign_thundershock',
        description: 'talent_descr.traveler_foreign_thundershock',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.TravelerElectro.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.TravelerElectro.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.TravelerElectro.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.TravelerElectro.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.TravelerElectro.s1.p5),
            },
            {
                type: 'hits',
                name: 'charged_hit_total',
                table: [
                    new StatTable('charged_hit_1', charTalentTables.TravelerElectro.s1.p6),
                    new StatTable('charged_hit_2', charTalentTables.TravelerElectro.s1.p7),
                ],
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.TravelerElectro.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.TravelerElectro.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.TravelerElectro.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.TravelerElectro.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.TravelerElectro.s2_id,
        title: 'talent_name.traveler_lightning_blade',
        description: 'talent_descr.traveler_lightning_blade',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.TravelerElectro.s2.p1),
            },
            {
                unit: 'per_amulet',
                table: new StatTable('traveler_amulet_recharge', charTalentTables.TravelerElectro.s2.p2),
            },
            {
                table: new StatTable('traveler_amulet_increase', charTalentTables.TravelerElectro.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.TravelerElectro.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('traveler_amulet_duration', charTalentTables.TravelerElectro.s2.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.TravelerElectro.s2.p6),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.TravelerElectro.s3_id,
        title: 'talent_name.traveler_bellowing_thunder',
        description: 'talent_descr.traveler_bellowing_thunder',
        items: [
            {
                table: new StatTable('burst_dmg', charTalentTables.TravelerElectro.s3.p1),
            },
            {
                table: new StatTable('traveler_falling_thunder_dmg', charTalentTables.TravelerElectro.s3.p2),
            },
            {
                unit: '',
                table: new StatTable('traveler_energy_gain', charTalentTables.TravelerElectro.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.TravelerElectro.s3.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.TravelerElectro.s3.p5),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.TravelerElectro.s3.p6),
            },
        ],
    },
});

// Abundance Amulet: "When a character is near an Abundance Amulet, they
// will absorb it": the member who picks it up is chosen, the Traveler
// included, as for Xiangling's chili pepper.
const amuletPickedUp = new ConditionAnd([
    new ConditionBoolean({name: 'traveler_abundance_amulet'}),
    new ConditionSelectedReceiver({name: 'traveler_abundance_amulet_receiver'}),
]);

const A4Recharge = percent(charTalentTables.TravelerElectro.a4.p1);
const AmuletRecharge = times(charTalentTables.TravelerElectro.s2.p4[0], 0.01);

const rechargePreA4Post = new PostEffectStatsStatic({
    receivers: RECEIVERS.TEAM,
    // Game data: Player_Electric_ElementalArt_Magatama_Pickable /
    // UNIQUE_Player_Electric_ElementalArt_Magatama_EfficiencyUp writes
    // Actor_ChargeEfficiencyExtraDelta (extra) with no stat read. KQM
    // (Electro Traveler): the amulet ER affects neither Raiden/Mona A4, nor
    // Emblem 4pc, nor Engulfing. The default channels hold.
    percent: new StatTable('recharge', [20]),
    conditions: [
        amuletPickedUp,
        new ConditionNot([
            new ConditionAscensionChar({ascension: 4}),
        ]),
    ],
});

const rechargePostA4Post = new PostEffectStatsRecharge({
    receivers: RECEIVERS.TEAM,
    // Game data: Player_Electric_ElementalArt_Magatama_Pickable /
    // UNIQUE_Player_Electric_ElementalArt_Magatama_ExtraEfficiencyUp (gated
    // by ByUnlockTalentParam Player_Electric_ElementalArt_ExtraChargeEfficiency,
    // A4 Resounding Roar) writes Actor_ChargeEfficiencyExtraDelta (extra)
    // from FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY (premod). KQM (Electro
    // Traveler): A4 only takes the Traveler's original ER, so its own write
    // does not feed it; GO reads input.premod.enerRech_ into
    // teamBuff.total.enerRech_. The default channels hold.
    percent: new StatTable('recharge', [A4Recharge]),
    flatBonus: new ValueTable([AmuletRecharge]),
    conditions: [
        amuletPickedUp,
        new ConditionAscensionChar({ascension: 4}),
    ],
});


const condTravelerAether = new ConditionBoolean({name: 'traveler_aether'});
const condLumineDefault = new ConditionNot([condTravelerAether]);

const ForeignDetonateBonus = percent(charTalentTables.TravelerElectro.sp.p8);
const ForeignDetonateDelayed = percent(charTalentTables.TravelerElectro.sp.p11);
const ForeignDetonateCooldown = charTalentTables.TravelerElectro.sp.p9;
const C2ElectroRes = percent(charTalentTables.TravelerElectro.c2.p2);
const C2Duration = charTalentTables.TravelerElectro.c2.p1;
const C4EnergyThreshold = percent(charTalentTables.TravelerElectro.c4.p1);
const C6FallingThunderBonus = charTalentTables.TravelerElectro.c6.p1;

const bladeReadyCondition = new ConditionBooleanValue({
    setting: 'traveler_electro_blade_thunder',
    cond: 'ge',
    value: 3,
});

function makeChargedHit2Multipliers() {
    return [
        new FeatureMultiplier({
            leveling: 'char_skill_attack',
            values: Talents.get('attack.charged_hit_2'),
            condition: condLumineDefault,
        }),
        new FeatureMultiplier({
            leveling: 'char_skill_attack',
            values: new StatTable(
                'charged_hit_2',
                charTalentTables.TravelerElectro.s1_boy.p7,
            ),
            condition: condTravelerAether,
        }),
    ];
}
export const TravelerElectro = new DbObjectChar({
    name: 'traveler_electro',
    serializeId: 39,
    gameId: [10000005, 10000007],
    depotIds: [507, 707],
    iconClass: "char-icon-traveler-girl",
    rarity: 5,
    element: 'electro',
    weapon: 'sword',
    origin: 'foreign',
    talents: Talents,
    statTable: [
        ...charTables.Traveler,
        new StatTableAscensionScale({
			stat: 'burst_energy_cost',
			base: Talents.get('burst.energy_cost').getValue(1),
		}),
    ],
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
        new FeatureDamageNormal({
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
                    multipliers: makeChargedHit2Multipliers(),
                },
            ],
        }),
        new FeatureDamageCharged({
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_1'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            isChild: true,
            multipliers: makeChargedHit2Multipliers(),
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
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.traveler_falling_thunder_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'traveler_falling_thunder_bonus_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    scalingMultiplier: C6FallingThunderBonus,
                    scalingSource: 'constellation6',
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.traveler_falling_thunder_dmg'),
                }),
            ],
            condition: new ConditionConstellation({constellation: 6}),
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'charged',
            name: 'traveler_electro_detonate',
            element: 'electro',
            allowInfusion: true,
            items: [
                {multipliers: [
                    new FeatureMultiplier({
                        leveling: 'char_skill_attack',
                        values: Talents.get('attack.charged_hit_1'),
                    }),
                    new FeatureMultiplier({
                        source: 'foreign_thundertrail',
                        values: new ValueTable([ForeignDetonateBonus]),
                    }),
                ]},
                {multipliers: [
                    ...makeChargedHit2Multipliers(),
                    new FeatureMultiplier({
                        source: 'foreign_thundertrail',
                        values: new ValueTable([ForeignDetonateBonus]),
                    }),
                ]},
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureDamageCharged({
            name: 'traveler_electro_detonate_1',
            isChild: true,
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_1'),
                }),
                new FeatureMultiplier({
                    source: 'foreign_thundertrail',
                    values: new ValueTable([ForeignDetonateBonus]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureDamageCharged({
            name: 'traveler_electro_detonate_2',
            isChild: true,
            element: 'electro',
            multipliers: [
                ...makeChargedHit2Multipliers(),
                new FeatureMultiplier({
                    source: 'foreign_thundertrail',
                    values: new ValueTable([ForeignDetonateBonus]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureDamageCharged({
            name: 'traveler_electro_detonate_delayed',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    source: 'foreign_thundertrail_delayed',
                    values: new ValueTable([ForeignDetonateDelayed]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureStatic({
            category: 'other',
            name: 'traveler_electro_detonate_cooldown',
            format: 'decimal',
            multipliers: [
                new FeatureMultiplierStatic({
                    source: 'foreign_thundertrail',
                    values: new ValueTable([ForeignDetonateCooldown]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
        new FeaturePostEffectValue({
            category: 'skill',
            name: 'traveler_electro_recharge_bonus',
            postEffect: rechargePreA4Post,
            format: 'percent',
            condition: new ConditionNot([
                new ConditionAscensionChar({ascension: 4}),
            ]),
        }),
        new FeaturePostEffectValue({
            category: 'skill',
            name: 'traveler_electro_recharge_bonus',
            postEffect: rechargePostA4Post,
            format: 'percent',
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'traveler_aether',
            serializeId: 5,
            title: 'talent_name.traveler_twin_aether',
            description: 'talent_descr.traveler_twin_aether',
            rotation: 'self',
        }),
        new ConditionBoolean({
            name: 'traveler_abundance_amulet',
            serializeId: 3,
            title: 'talent_name.traveler_abundance_amulet',
            description: 'talent_descr.traveler_abundance_amulet',
        }),
        new ConditionDropdownTeamMember({
            name: 'traveler_abundance_amulet_receiver',
            serializeId: 8,
            title: 'buffs_name.selected_receiver',
            description: 'buffs_descr.selected_receiver',
        }),
        new ConditionStatic({
            title: 'talent_name.traveler_thunderflash',
            description: 'talent_descr.traveler_thunderflash',
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.traveler_resounding_roar',
            description: 'talent_descr.traveler_resounding_roar',
            stats: {
                text_percent: A4Recharge,
            },
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        new ConditionBoolean({
            name: 'traveler_swordfighting_techniques',
            serializeId: 2,
            title: 'talent_name.traveler_swordfighting_techniques',
            description: 'talent_descr.traveler_swordfighting_techniques',
            stats: {
                atk_base: 3,
            },
        }),
        new ConditionBoolean({
            name: 'traveler_special_training',
            serializeId: 4,
            title: 'talent_name.traveler_special_training',
            description: 'talent_descr.traveler_special_training',
            stats: {
                atk_base: 7,
                mastery: 15,
                hp_base: 50,
            },
        }),
        new ConditionDropdownTravelerResonated({
            name: 'traveler_electro_resonated_elements',
            serializeId: 6,
        }),
        new ConditionStacks({
            name: 'traveler_electro_blade_thunder',
            serializeId: 7,
            title: 'talent_name.traveler_foreign_thundertrail',
            description: 'talent_descr.traveler_foreign_thundertrail',
            maxStacks: 3,
            noStat: true,
            rotation: 'self',
        }),
    ],
    postEffects: [
        rechargePreA4Post,
        rechargePostA4Post,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.traveler_spring_thunder_of_fertility',
                    description: 'talent_descr.traveler_spring_thunder_of_fertility',
                }),
            ],
        },
        {
            conditions: [
                // Falling Thunder Electro RES shred is an enemy debuff (TEAM).
                new ConditionBoolean({
                    name: 'traveler_violet_vehemence',
                    serializeId: 1,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.traveler_violet_vehemence',
                    description: 'talent_descr.traveler_violet_vehemence',
                    stats: {
                        enemy_res_electro: C2ElectroRes,
                        text_duration: C2Duration,
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
                    title: 'talent_name.traveler_fickle_cloudstrike',
                    description: 'talent_descr.traveler_fickle_cloudstrike',
                    stats: {
                        text_percent1: C4EnergyThreshold,
                        text_percent2: 100,
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
                    title: 'talent_name.traveler_world_shaker',
                    description: 'talent_descr.traveler_world_shaker',
                    stats: {
                        text_percent_dmg: 100,
                    },
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox'], [4, 'checkbox']],
});
