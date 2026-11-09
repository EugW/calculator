import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionNumberTalent } from "../../classes/Condition/Number/Talent";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { FeatureShield } from "../../classes/Feature2/Shield";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Valeriy.s1_id,
        title: 'talent_name.valeriy_sword_and_shield',
        description: 'talent_descr.valeriy_sword_and_shield',
        items: [
            {table: new StatTable('normal_hit_1', charTalentTables.Valeriy.s1.p1)},
            {table: new StatTable('normal_hit_2', charTalentTables.Valeriy.s1.p2)},
            {table: new StatTable('normal_hit_3', charTalentTables.Valeriy.s1.p3)},
            {table: new StatTable('charged_hit', charTalentTables.Valeriy.s1.p4)},
            {table: new StatTable('valeriy_direct_fire_mortar', charTalentTables.Valeriy.s1.p5)},
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Valeriy.s1.p6),
            },
            {
                unit: 'atk',
                table: new StatTable('valeriy_offensive_directive_electro', charTalentTables.Valeriy.s1.p7),
            },
            {
                unit: 'atk',
                table: new StatTable('valeriy_offensive_directive_stellarconduct', charTalentTables.Valeriy.s1.p8),
            },
            {
                unit: '',
                table: new StatTable('valeriy_offensive_directive_stacks', charTalentTables.Valeriy.s1.p9),
            },
            {
                unit: 'sec',
                table: new StatTable('valeriy_offensive_directive_duration', charTalentTables.Valeriy.s1.p10),
            },
            {table: new StatTable('plunge', charTalentTables.Valeriy.s1.p11)},
            {table: new StatTable('plunge_low', charTalentTables.Valeriy.s1.p12)},
            {table: new StatTable('plunge_high', charTalentTables.Valeriy.s1.p13)},
        ],
    },
    skill: {
        gameId: charTalentTables.Valeriy.s2_id,
        title: 'talent_name.valeriy_bastion_charge',
        description: 'talent_descr.valeriy_bastion_charge',
        items: [
            {table: new StatTable('skill_dmg', charTalentTables.Valeriy.s2.p1)},
            {
                type: 'shield',
                unit: 'atk',
                table: [
                    new StatTable('shield', charTalentTables.Valeriy.s2.p2),
                    new StatTable('', charTalentTables.Valeriy.s2.p3),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('shield_duration', charTalentTables.Valeriy.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Valeriy.s2.p5),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Valeriy.s3_id,
        title: 'talent_name.valeriy_lightning_salvo',
        description: 'talent_descr.valeriy_lightning_salvo',
        items: [
            {table: new StatTable('burst_dmg', charTalentTables.Valeriy.s3.p1)},
            {table: new StatTable('valeriy_thunderburst_shell', charTalentTables.Valeriy.s3.p2)},
            {
                unit: 'sec',
                table: new StatTable('duration', charTalentTables.Valeriy.s3.p3),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Valeriy.s3.p4),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Valeriy.s3.p5),
            },
        ],
    },
    links: [11370001, 11370002, 11370003, 11330003],
});

const OffensiveDirectiveStacks = 15;
const ImpactMomentumMin = 40;
const ImpactMomentumMax = 100;
const C4ImpactMomentumMax = 130;
const A4ElectroAtkPerMomentum = 0.3;
const A4StellarConductAtkPerMomentum = 0.9;
const C2Mastery = 100;
const C2ShieldAtkPerExcessMomentum = 8;
const C2ExcessMomentumMax = 20;
const C6DmgBonus = 100;
const C6ElectroCritRate = 10;
const C6StellarConductCritDmg = 40;

const radianceName = 'valeriy_radiance_stellarconduct';
const directiveName = 'valeriy_offensive_directive';
const momentumName = 'valeriy_impact_momentum';
const partyRadianceName = 'party.valeriy_radiance_stellarconduct';
const partyDirectiveName = 'party.valeriy_offensive_directive';
const partyMomentumName = 'party.valeriy_impact_momentum';

// Feature-local bucket for the C6 Point-Blank Bombardment and Thunderburst Shell bonus.
const breachDmgBonus = 'dmg_valeriy_breach';

const maxMomentum = (settings) => (settings.char_constellation || 0) >= 4
    ? C4ImpactMomentumMax
    : ImpactMomentumMax;

// Outside Radiance, Offensive Directive raises ordinary Electro NA/CA/Plunge/Skill/Burst DMG.
const electroDirectTarget = () => new FeatureMultiplierTarget({
    damageElements: ['electro'],
    damageTypes: ['normal', 'charged', 'plunge', 'skill', 'burst'],
});

// In Radiance: Stellar-Conduct it raises Electro DMG considered Stellar-Conduct DMG.
const stellarConductFlatTarget = () => new FeatureMultiplierTarget({
    damageElements: ['electro'],
    damageTypes: ['stellarconduct'],
    options: ['stellarconduct_flat'],
});

/**
 * Builds the two Offensive Directive branches plus their A4 per-Momentum terms.
 * Self and party versions only differ in where Valeriy's ATK, talent level and
 * state switches are read from.
 */
function offensiveDirectiveMultipliers({scaling, leveling, source, directive, radiance, momentum, a4Condition}) {
    const directiveActive = () => new ConditionStacks({name: directive, maxStacks: OffensiveDirectiveStacks});
    const inRadiance = () => new ConditionBoolean({name: radiance});
    const branches = [
        {
            table: 'attack.valeriy_offensive_directive_electro',
            perMomentum: A4ElectroAtkPerMomentum,
            state: () => new ConditionNot([inRadiance()]),
            target: electroDirectTarget,
        },
        {
            table: 'attack.valeriy_offensive_directive_stellarconduct',
            perMomentum: A4StellarConductAtkPerMomentum,
            state: inRadiance,
            target: stellarConductFlatTarget,
        },
    ];

    const result = [];
    for (const branch of branches) {
        result.push(new FeatureMultiplier({
            scaling: scaling,
            leveling: leveling,
            source: source,
            values: Talents.get(branch.table),
            condition: new ConditionAnd([directiveActive(), branch.state()]),
            target: branch.target(),
        }));
        result.push(new FeatureMultiplier({
            scaling: scaling,
            source: source || 'ascension4',
            values: new ValueTable([branch.perMomentum]),
            stacksLeveling: momentum,
            maxStacks: C4ImpactMomentumMax,
            condition: new ConditionAnd([
                ...(a4Condition ? [a4Condition()] : []),
                directiveActive(),
                branch.state(),
            ]),
            target: branch.target(),
        }));
    }
    return result;
}

export const Valeriy = new DbObjectChar({
    name: 'valeriy',
    serializeId: 130,
    gameId: 10000137,
    iconClass: 'char-icon-valeriy',
    rarity: 4,
    element: 'electro',
    weapon: 'sword',
    origin: 'snezhnaya',
    talents: Talents,
    statTable: charTables.Valeriy,
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
        new FeatureDamageCharged({
            name: 'charged_hit',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.charged_hit'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            name: 'valeriy_direct_fire_mortar',
            element: 'electro',
            damageBonuses: [breachDmgBonus],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.valeriy_direct_fire_mortar'),
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
            name: 'skill_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.skill_dmg'),
                }),
            ],
        }),
        new FeatureShield({
            category: 'skill',
            element: 'electro',
            multipliers: [
                new FeatureMultiplierList({
                    leveling: 'char_skill_elemental',
                    values: Talents.getList('skill.shield'),
                }),
                new FeatureMultiplier({
                    source: 'constellation2',
                    values: new ValueTable([C2ShieldAtkPerExcessMomentum]),
                    stacksLeveling: 'valeriy_c2_excess_momentum',
                    maxStacks: C2ExcessMomentumMax,
                    condition: new ConditionConstellation({constellation: 2}),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'burst_dmg',
            element: 'electro',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.burst_dmg'),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'valeriy_thunderburst_shell',
            element: 'electro',
            damageBonuses: [breachDmgBonus],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.valeriy_thunderburst_shell'),
                }),
            ],
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: radianceName,
            serializeId: 1,
            title: 'talent_name.valeriy_subzero_conditioning',
            description: 'talent_descr.valeriy_subzero_conditioning',
            info: {special: true},
            rotation: 'self',
            subConditions: [
                new ConditionBoolean({name: 'polestar_field'}),
            ],
        }),
        new ConditionStacks({
            name: directiveName,
            serializeId: 2,
            title: 'talent_name.n11370002',
            description: 'talent_descr.n11370002',
            rotation: 'self',
            maxStacks: OffensiveDirectiveStacks,
        }),
        new ConditionNumber({
            name: momentumName,
            serializeId: 3,
            title: 'talent_name.n11370003',
            description: 'talent_descr.n11370003',
            rotation: 'self',
            min: ImpactMomentumMin,
            max: maxMomentum,
            forceSettings: true,
            noStat: true,
        }),
        new ConditionStatic({
            title: 'talent_name.valeriy_advance_with_the_creeping_barrage',
            description: 'talent_descr.valeriy_advance_with_the_creeping_barrage',
            info: {ascension: 1},
            condition: new ConditionAscensionChar({ascension: 1}),
        }),
        new ConditionStatic({
            title: 'talent_name.valeriy_into_the_breach',
            description: 'talent_descr.valeriy_into_the_breach',
            info: {ascension: 4},
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
    ],
    multipliers: offensiveDirectiveMultipliers({
        leveling: 'char_skill_attack',
        directive: directiveName,
        radiance: radianceName,
        momentum: momentumName,
        a4Condition: () => new ConditionAscensionChar({ascension: 4}),
    }),
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.valeriy_the_cadence_of_suppressive_fire',
                    description: 'talent_descr.valeriy_the_cadence_of_suppressive_fire',
                }),
            ],
        },
        {
            conditions: [
                new ConditionBoolean({
                    name: 'valeriy_ranks_that_charge_as_one',
                    serializeId: 4,
                    title: 'talent_name.valeriy_ranks_that_charge_as_one',
                    description: 'talent_descr.valeriy_ranks_that_charge_as_one',
                    rotation: 'self',
                    stats: {
                        mastery: C2Mastery,
                    },
                }),
                new ConditionNumber({
                    name: 'valeriy_c2_excess_momentum',
                    serializeId: 5,
                    title: 'talent_name.valeriy_ranks_that_charge_as_one',
                    rotation: 'self',
                    min: 0,
                    max: C2ExcessMomentumMax,
                    allowMinZero: true,
                    forceSettings: true,
                    noStat: true,
                }),
            ],
        },
        {
            conditions: [
                new Condition({
                    settings: {
                        char_skill_attack_bonus: 3,
                    },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.valeriy_fortitude_unshaken_by_attrition',
                    description: 'talent_descr.valeriy_fortitude_unshaken_by_attrition',
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
                new Condition({
                    isHidden: true,
                    stats: {
                        [breachDmgBonus]: C6DmgBonus,
                    },
                }),
                new ConditionBoolean({
                    name: 'valeriy_the_strength_to_breach_enemy_lines',
                    serializeId: 6,
                    title: 'talent_name.valeriy_the_strength_to_breach_enemy_lines',
                    description: 'talent_descr.valeriy_the_strength_to_breach_enemy_lines',
                    rotation: 'self',
                    stats: {
                        crit_rate_electro: C6ElectroCritRate,
                        crit_dmg_electro_stellarconduct: C6StellarConductCritDmg,
                    },
                }),
            ],
        },
    ]),
    partyData: {
        loadStats: {
            stats: ['atk_total'],
            settings: ['char_skill_attack'],
        },
        conditions: [
            new ConditionNumber({
                name: 'valeriy_atk_total',
                serializeId: 1,
                title: 'talent_name.stats_total_atk',
                partyStat: 'atk_total',
                max: 10000,
            }),
            new ConditionNumberTalent({
                name: 'valeriy_char_skill_attack',
                serializeId: 2,
                title: 'talent_name.valeriy_sword_and_shield',
                partySetting: 'char_skill_attack',
            }),
            new ConditionBoolean({
                name: 'party.valeriy_constellation_3',
                serializeId: 3,
                title: 'talent_name.valeriy_vigilance_at_close_quarters',
                info: {constellation: 3},
                settings: {
                    valeriy_char_skill_attack_bonus: 3,
                },
            }),
            new ConditionBoolean({
                name: partyRadianceName,
                serializeId: 4,
                title: 'talent_name.valeriy_subzero_conditioning',
                description: 'talent_descr.valeriy_subzero_conditioning',
                info: {special: true},
                rotation: 'party',
                subConditions: [
                    new ConditionBoolean({name: 'polestar_field'}),
                ],
            }),
            new ConditionStacks({
                name: partyDirectiveName,
                serializeId: 5,
                title: 'talent_name.n11370002',
                description: 'talent_descr.n11370002',
                rotation: 'party',
                maxStacks: OffensiveDirectiveStacks,
            }),
            new ConditionNumber({
                name: partyMomentumName,
                serializeId: 6,
                title: 'talent_name.valeriy_into_the_breach',
                description: 'talent_descr.valeriy_into_the_breach',
                info: {ascension: 4},
                rotation: 'party',
                min: ImpactMomentumMin,
                max: C4ImpactMomentumMax,
                forceSettings: true,
                noStat: true,
            }),
            new ConditionBoolean({
                name: 'party.valeriy_ranks_that_charge_as_one',
                serializeId: 7,
                title: 'talent_name.valeriy_ranks_that_charge_as_one',
                description: 'talent_descr.valeriy_ranks_that_charge_as_one',
                info: {constellation: 2},
                rotation: 'party',
                stats: {
                    mastery: C2Mastery,
                },
            }),
            new ConditionBoolean({
                name: 'party.valeriy_the_strength_to_breach_enemy_lines',
                serializeId: 8,
                title: 'talent_name.valeriy_the_strength_to_breach_enemy_lines',
                description: 'talent_descr.valeriy_the_strength_to_breach_enemy_lines',
                info: {constellation: 6},
                rotation: 'party',
                stats: {
                    crit_rate_electro: C6ElectroCritRate,
                    crit_dmg_electro_stellarconduct: C6StellarConductCritDmg,
                },
            }),
        ],
        multipliers: offensiveDirectiveMultipliers({
            scaling: 'valeriy_atk_total',
            leveling: 'valeriy_char_skill_attack',
            source: 'valeriy',
            directive: partyDirectiveName,
            radiance: partyRadianceName,
            momentum: partyMomentumName,
        }),
    },
});
