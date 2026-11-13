import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionDropdownElement } from "../../classes/Condition/Dropdown/Element";
import { ConditionDropdownTravelerResonated } from "../../classes/Condition/Dropdown/TravelerResonated";
import { ConditionLevels } from "../../classes/Condition/Levels";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionNot } from "../../classes/Condition/Not";
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
import { PostEffectStatsMastery } from "../../classes/PostEffect/Stats/Mastery";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { StatTableAscensionScale } from "../../classes/StatTable/Ascension/Scale";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";
import { CHANNELS } from "../../classes/PostEffect/Channels";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.TravelerDendro.s1_id,
        title: 'talent_name.traveler_foreign_fieldcleaver',
        description: 'talent_descr.traveler_foreign_fieldcleaver',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.TravelerDendro.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.TravelerDendro.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.TravelerDendro.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.TravelerDendro.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.TravelerDendro.s1.p5),
            },
            {
                type: 'hits',
                name: 'charged_hit_total',
                table: [
                    new StatTable('charged_hit_1', charTalentTables.TravelerDendro.s1.p6),
                    new StatTable('charged_hit_2', charTalentTables.TravelerDendro.s1.p7),
                ],
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.TravelerDendro.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.TravelerDendro.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.TravelerDendro.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.TravelerDendro.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.TravelerDendro.s2_id,
        title: 'talent_name.traveler_razorgrass_blade',
        description: 'talent_descr.traveler_razorgrass_blade',
        items: [
            {
                table: new StatTable('skill_dmg', charTalentTables.TravelerDendro.s2.p1),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.TravelerDendro.s2.p2),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.TravelerDendro.s3_id,
        title: 'talent_name.traveler_surgent_manifestation',
        description: 'talent_descr.traveler_surgent_manifestation',
        items: [
            {
                table: new StatTable('traveler_lea_lotus_lamp_attack_dmg', charTalentTables.TravelerDendro.s3.p1),
            },
            {
                table: new StatTable('traveler_explosion_dmg', charTalentTables.TravelerDendro.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('traveler_duration', charTalentTables.TravelerDendro.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.TravelerDendro.s3.p6),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.TravelerDendro.s3.p7),
            },
        ],
    },
});

// A4 Verdant Luxury: skill +0.15%/EM, burst +0.1%/EM. Game data:
// Avatar_Player_Grass_Damage_Up_By_Element_Mastery caches FIGHT_PROP_ELEMENT_MASTERY (total)
// and scales Elemental_Art / Elemental_Burst through ModifyDamageMixin, so extra EM counts
// (KQM Nahida: Dendro Traveler A4 works with Nahida's A1; GO reads input.total.eleMas).
const A4SkillDmgBonus = percent(charTalentTables.TravelerDendro.a4.p1);
const A4BurstDmgBonus = percent(charTalentTables.TravelerDendro.a4.p2);
const skillDmgPost = new PostEffectStatsMastery({
    percent: new StatTable('dmg_skill_traveler_dendro', [A4SkillDmgBonus]),
    reads: CHANNELS.TOTAL,
    conditions: [
        new ConditionAscensionChar({ascension: 4}),
    ],
});

const burstDmgPost = new PostEffectStatsMastery({
    percent: new StatTable('dmg_burst_traveler_dendro', [A4BurstDmgBonus]),
    reads: CHANNELS.TOTAL, // Game data: same ability reads FIGHT_PROP_ELEMENT_MASTERY (total).
    conditions: [
        new ConditionAscensionChar({ascension: 4}),
    ],
});


const condTravelerAether = new ConditionBoolean({name: 'traveler_aether'});
const condLumineDefault = new ConditionNot([condTravelerAether]);

const ForeignVerdessenceBonus = percent(charTalentTables.TravelerDendro.sp.p8);
const ForeignVinecoreDmg = percent(charTalentTables.TravelerDendro.sp.p11);
const ForeignVerdessenceCooldown = charTalentTables.TravelerDendro.sp.p9;
const A1Mastery = charTalentTables.TravelerDendro.a1.p1;
const C1Energy = charTalentTables.TravelerDendro.c1.p1;
const C2DurationBonus = charTalentTables.TravelerDendro.c2.p1;
const C6DmgBonus = percent(charTalentTables.TravelerDendro.c6.p1);

const bladeReadyCondition = new ConditionBooleanValue({
    setting: 'traveler_dendro_blade_viridis',
    cond: 'ge',
    value: 3,
});

// Verdant Overgrowth and Withering Aggregation reach the active character(s) within the Lamp AoE.
const activeReceiver = new ConditionReceiver({
    condition: new ConditionOnField(),
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
                charTalentTables.TravelerDendro.s1_boy.p7,
            ),
            condition: condTravelerAether,
        }),
    ];
}
export const TravelerDendro = new DbObjectChar({
    name: 'traveler_dendro',
    serializeId: 57,
    gameId: [10000005, 10000007],
    depotIds: [508, 708],
    iconClass: "char-icon-traveler-girl",
    rarity: 5,
    element: 'dendro',
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
            element: 'dendro',
            damageBonuses: ['dmg_skill_traveler_dendro'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'dendro',
            damageBonuses: ['dmg_burst_traveler_dendro'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.traveler_lea_lotus_lamp_attack_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            element: 'dendro',
            damageBonuses: ['dmg_burst_traveler_dendro'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.traveler_explosion_dmg'),
                }),
            ],
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'traveler_dendro_skill_bonus',
            postEffect: skillDmgPost,
            format: 'percent',
        }),
        new FeaturePostEffectValue({
            category: 'other',
            name: 'traveler_dendro_burst_bonus',
            postEffect: burstDmgPost,
            format: 'percent',
        }),
        new FeatureDamageMultihit({
            category: 'attack',
            damageType: 'charged',
            name: 'traveler_dendro_verdessence',
            element: 'dendro',
            allowInfusion: true,
            items: [
                {multipliers: [
                    new FeatureMultiplier({
                        leveling: 'char_skill_attack',
                        values: Talents.get('attack.charged_hit_1'),
                    }),
                    new FeatureMultiplier({
                        source: 'foreign_verdalume',
                        values: new ValueTable([ForeignVerdessenceBonus]),
                    }),
                ]},
                {multipliers: [
                    ...makeChargedHit2Multipliers(),
                    new FeatureMultiplier({
                        source: 'foreign_verdalume',
                        values: new ValueTable([ForeignVerdessenceBonus]),
                    }),
                ]},
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureDamageCharged({
            name: 'traveler_dendro_verdessence_1',
            isChild: true,
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit_1'),
                }),
                new FeatureMultiplier({
                    source: 'foreign_verdalume',
                    values: new ValueTable([ForeignVerdessenceBonus]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureDamageCharged({
            name: 'traveler_dendro_verdessence_2',
            isChild: true,
            element: 'dendro',
            multipliers: [
                ...makeChargedHit2Multipliers(),
                new FeatureMultiplier({
                    source: 'foreign_verdalume',
                    values: new ValueTable([ForeignVerdessenceBonus]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureDamageCharged({
            name: 'traveler_dendro_vinecore_1',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    source: 'foreign_verdalume_vinecore',
                    values: new ValueTable([ForeignVinecoreDmg]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureDamageCharged({
            name: 'traveler_dendro_vinecore_2',
            element: 'dendro',
            multipliers: [
                new FeatureMultiplier({
                    source: 'foreign_verdalume_vinecore',
                    values: new ValueTable([ForeignVinecoreDmg]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
        new FeatureStatic({
            category: 'other',
            name: 'traveler_dendro_verdessence_cooldown',
            format: 'decimal',
            multipliers: [
                new FeatureMultiplierStatic({
                    source: 'foreign_verdalume',
                    values: new ValueTable([ForeignVerdessenceCooldown]),
                }),
            ],
            condition: bladeReadyCondition,
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'traveler_aether',
            serializeId: 6,
            title: 'talent_name.traveler_twin_aether',
            description: 'talent_descr.traveler_twin_aether',
            rotation: 'self',
        }),
        new ConditionStacks({
            name: 'traveler_verdant_overgrowth',
            serializeId: 1,
            title: 'talent_name.traveler_verdant_overgrowth',
            description: 'talent_descr.traveler_verdant_overgrowth',
            dropdownClass: 'two-digits',
            maxStacks: 10,
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        // Active character(s) within the Lamp AoE gain the Mastery. The saved stacks stay
        // selectable off-field; the hidden delivery carries the active check.
        // A1 Verdant Overgrowth: flat +6 EM/stack (Player_Grass_PermanentSkill_1). Game data:
        // UNIQUE_Player_Grass_Seed_Aura_Element_Mastery_Up writes Actor_ElemMasteryDelta
        // (no "Extra": premod). Conditions write premod: confirmed default, no params.
        new ConditionLevels({
            levelSetting: 'traveler_verdant_overgrowth',
            isHidden: true,
            receivers: RECEIVERS.TEAM,
            stats: [
                new StatTable('mastery', [A1Mastery, 12, 18, 24, 30, 36, 42, 48, 54, 60]),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'traveler_verdant_overgrowth'}),
                new ConditionAscensionChar({ascension: 1}),
                activeReceiver,
            ]),
        }),
        new ConditionStatic({
            title: 'talent_name.traveler_verdant_luxury',
            description: 'talent_descr.traveler_verdant_luxury',
            info: {ascension: 4},
            subConditions: [
                new ConditionAscensionChar({ascension: 4}),
            ],
        }),
        new ConditionBoolean({
            name: 'traveler_swordfighting_techniques',
            serializeId: 4,
            title: 'talent_name.traveler_swordfighting_techniques',
            description: 'talent_descr.traveler_swordfighting_techniques',
            stats: {
                atk_base: 3,
            },
        }),
        new ConditionBoolean({
            name: 'traveler_special_training',
            serializeId: 5,
            title: 'talent_name.traveler_special_training',
            description: 'talent_descr.traveler_special_training',
            stats: {
                atk_base: 7,
                mastery: 15,
                hp_base: 50,
            },
        }),
        new ConditionDropdownTravelerResonated({
            name: 'traveler_dendro_resonated_elements',
            serializeId: 7,
        }),
        new ConditionStacks({
            name: 'traveler_dendro_blade_viridis',
            serializeId: 8,
            title: 'talent_name.traveler_foreign_verdalume',
            description: 'talent_descr.traveler_foreign_verdalume',
            maxStacks: 3,
            noStat: true,
            rotation: 'self',
        }),
    ],
    postEffects: [
        skillDmgPost,
        burstDmgPost,
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.traveler_symbiotic_creeper',
                    description: 'talent_descr.traveler_symbiotic_creeper',
                    stats: {
                        text_value: C1Energy,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.traveler_green_resilience',
                    description: 'talent_descr.traveler_green_resilience',
                    stats: {
                        text_duration: C2DurationBonus,
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
                    title: 'talent_name.traveler_treacle_grass',
                    description: 'talent_descr.traveler_treacle_grass',
                    stats: {
                        text_value: 5,
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
                // C6 Withering Aggregation: flat +12% Dendro / transfigured-element DMG
                // (Player_Grass_Constellation_6, param 0.12). Game data:
                // Player_Grass_Seed_Aura_Element_Damage_Up_* writes Actor_*AddHurtDelta
                // (no "Extra": premod). Conditions write premod: confirmed default, no params.
                // Saved toggles only; hidden deliveries reach the active character under the Lamp.
                new ConditionBoolean({
                    name: 'traveler_withering_aggregation_1',
                    serializeId: 2,
                    title: 'talent_name.traveler_withering_aggregation',
                    description: 'talent_descr.traveler_withering_aggregation_1',
                    displayStats: {dmg_dendro: C6DmgBonus},
                }),
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.TEAM,
                    stats: {
                        dmg_dendro: C6DmgBonus,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'traveler_withering_aggregation_1'}),
                        activeReceiver,
                    ]),
                }),
                new ConditionDropdownElement({
                    name: 'traveler_withering_aggregation_2',
                    serializeId: 3,
                    receivers: RECEIVERS.TEAM,
                    title: 'talent_name.traveler_withering_aggregation',
                    description: 'talent_descr.traveler_withering_aggregation_2',
                    valueAliases: ['party.traveler_withering_aggregation_2'],
                    values: [
                        {
                            value: 'pyro',
                            serializeId: 1,
                            conditions: [
                                new Condition({
                                    condition: activeReceiver,
                                    stats: {
                                        dmg_pyro: C6DmgBonus,
                                    },
                                }),
                            ],
                        },
                        {
                            value: 'electro',
                            serializeId: 2,
                            conditions: [
                                new Condition({
                                    condition: activeReceiver,
                                    stats: {
                                        dmg_electro: C6DmgBonus,
                                    },
                                }),
                            ],
                        },
                        {
                            value: 'hydro',
                            serializeId: 3,
                            conditions: [
                                new Condition({
                                    condition: activeReceiver,
                                    stats: {
                                        dmg_hydro: C6DmgBonus,
                                    },
                                }),
                            ],
                        },
                    ],
                    subConditions: [
                        new ConditionBoolean({
                            name: 'traveler_withering_aggregation_1',
                        }),
                    ],
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'stacks'], [2, 'checkbox'], [3, 'dropdown']],
});
