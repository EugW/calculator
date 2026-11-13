import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionOnField } from "../../classes/Condition/Field";
import { ConditionBooleanLevels } from "../../classes/Condition/Boolean/Levels";
import { ConditionBooleanValue } from "../../classes/Condition/Boolean/Value";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionOr } from "../../classes/Condition/Or";
import { ConditionReceiver } from "../../classes/Condition/Receiver";
import { ConditionStacks } from "../../classes/Condition/Stacks";
import { ConditionStatic } from "../../classes/Condition/Static";
import { ConditionStaticLevel } from "../../classes/Condition/Static/Level";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageMultihit } from "../../classes/Feature2/Damage/Multihit";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureHeal } from "../../classes/Feature2/Heal";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierList } from "../../classes/Feature2/Multiplier/List";
import { RECEIVERS } from "../../classes/Team/Receivers";
import { StatTable } from "../../classes/StatTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";
import { percent } from "../Params";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Mika.s1_id,
        title: 'talent_name.mika_spear_of_favonius_arrows_passage',
        description: 'talent_descr.mika_spear_of_favonius_arrows_passage',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Mika.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Mika.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Mika.s1.p3),
            },
            {
                type: 'multihit',
                hits: 2,
                table: new StatTable('normal_hit_4', charTalentTables.Mika.s1.p4),
            },
            {
                table: new StatTable('normal_hit_5', charTalentTables.Mika.s1.p6),
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Mika.s1.p7),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Mika.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Mika.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Mika.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Mika.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Mika.s2_id,
        title: 'talent_name.mika_starfrost_swirl',
        description: 'talent_descr.mika_starfrost_swirl',
        items: [
            {
                table: new StatTable('mika_flowfrost_arrow_dmg', charTalentTables.Mika.s2.p1),
            },
            {
                table: new StatTable('mika_rimestar_flare_dmg', charTalentTables.Mika.s2.p2),
            },
            {
                table: new StatTable('mika_rimestar_shard_dmg', charTalentTables.Mika.s2.p3),
            },
            {
                table: new StatTable('mika_atk_spd_bonus', charTalentTables.Mika.s2.p4),
            },
            {
                unit: 'sec',
                table: new StatTable('mika_soulwind_duration', charTalentTables.Mika.s2.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Mika.s2.p6),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Mika.s3_id,
        title: 'talent_name.mika_skyfeather_song',
        description: 'talent_descr.mika_skyfeather_song',
        items: [
            {
                type: 'shield',
                unit: 'hp',
                table: [
                    new StatTable('heal', charTalentTables.Mika.s3.p2),
                    new StatTable('', charTalentTables.Mika.s3.p1),
                ],
            },
            {
                type: 'shield',
                unit: 'hp',
                table: [
                    new StatTable('mika_heal_dot', charTalentTables.Mika.s3.p4),
                    new StatTable('', charTalentTables.Mika.s3.p3),
                ],
            },
            {
                unit: 'sec',
                table: new StatTable('mika_eagleplume_regen_interval', charTalentTables.Mika.s3.p5),
            },
            {
                unit: 'sec',
                table: new StatTable('mika_duration', charTalentTables.Mika.s3.p6),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Mika.s3.p7),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Mika.s3.p8),
            },
        ],
    },
});

const A1PhysBonus = percent(charTalentTables.Mika.a1.p1);
const A1MaxStacks = charTalentTables.Mika.a1.p2;
const A4MaxStacks = charTalentTables.Mika.a1.p2 + charTalentTables.Mika.a4.p1;
const C6MaxStacks = charTalentTables.Mika.a1.p2 + charTalentTables.Mika.a4.p1 + charTalentTables.Mika.c6.p2;
const C6PhysCritDmg = percent(charTalentTables.Mika.c6.p1);

// Soulwind and Detector reach affected characters on the field.
const activeReceiver = new ConditionReceiver({
    condition: new ConditionOnField(),
});

export const Mika = new DbObjectChar({
    name: 'mika',
    serializeId: 68,
    gameId: 10000080,
    iconClass: "char-icon-mika",
    rarity: 4,
    element: 'cryo',
    weapon: 'polearm',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Mika,
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
        new FeatureDamageMultihit({
            name: 'normal_hit_4',
            category: 'attack',
            damageType: 'normal',
            allowInfusion: true,
            items: [
                {
                    hits: 2,
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_4'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_4_1',
            isChild: true,
            hits: 2,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_4'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5'),
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
            name: 'mika_flowfrost_arrow_dmg',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.mika_flowfrost_arrow_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'mika_rimestar_flare_dmg',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.mika_rimestar_flare_dmg'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'mika_rimestar_shard_dmg',
            element: 'cryo',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.mika_rimestar_shard_dmg'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'burst',
            name: 'heal',
            partyHeal: 1,
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.getList('burst.heal'),
                }),
            ],
        }),
        new FeatureHeal({
            category: 'burst',
            name: 'mika_heal_dot',
            multipliers: [
                new FeatureMultiplierList({
                    scaling: 'hp*',
                    leveling: 'char_skill_burst',
                    values: Talents.getList('burst.mika_heal_dot'),
                }),
            ],
        }),
    ],
    conditions: [
        new Condition({
            settings: {
                char_skill_elemental_bonus: 3,
            },
            subConditions: [
                new ConditionConstellation({constellation: 5}),
            ],
        }),
        new ConditionBooleanLevels({
            name: 'mika_soulwind',
            serializeId: 3,
            title: 'talent_name.mika_soulwind',
            description: 'talent_descr.mika_soulwind',
            levelSetting: 'char_skill_elemental',
            stats: [
                Talents.getAlias('skill.mika_atk_spd_bonus', 'atk_speed_normal'),
            ],
        }),
        // Soulwind raises the ATK SPD of affected characters on the field;
        // Mika keeps his own copy above.
        new ConditionStaticLevel({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            levelSetting: 'char_skill_elemental',
            stats: [
                Talents.getAlias('skill.mika_atk_spd_bonus', 'atk_speed_normal'),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'mika_soulwind'}),
                activeReceiver,
            ]),
        }),
        new ConditionStacks({
            name: 'mika_suppressive_barrage',
            serializeId: 1,
            title: 'talent_name.mika_suppressive_barrage',
            description: 'talent_descr.mika_suppressive_barrage',
            maxStacks: [
                {
                    value: A1MaxStacks,
                    condition: [
                        new ConditionNot([
                            new ConditionAscensionChar({ascension: 4}),
                            new ConditionConstellation({constellation: 6}),
                        ]),
                    ],
                },
                {
                    value: A4MaxStacks,
                    condition: [
                        new ConditionOr([
                            new ConditionAscensionChar({ascension: 4}),
                            new ConditionConstellation({constellation: 6}),
                        ]),
                    ],
                },
                {
                    value: C6MaxStacks,
                    condition: [
                        new ConditionAscensionChar({ascension: 4}),
                        new ConditionConstellation({constellation: 6}),
                    ],
                },
            ],
            stats: [
                new StatTable('dmg_phys', [A1PhysBonus]),
            ],
            info: {ascension: 1},
            subConditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
        // Detector raises the Physical DMG of affected characters on the
        // field, one hidden copy per stack; Mika keeps his own copy above.
        // The fourth and fifth copies need the same ascension and
        // constellation that raise the stack cap.
        ...[1, 2, 3, 4, 5].map((level) => new Condition({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            stats: {
                dmg_phys: A1PhysBonus,
            },
            condition: new ConditionAnd([
                new ConditionAscensionChar({ascension: 1}),
                new ConditionBooleanValue({
                    setting: 'mika_suppressive_barrage',
                    cond: 'ge',
                    value: level,
                }),
                ...(level < 4 ? [] : [new ConditionOr([
                    new ConditionAscensionChar({ascension: 4}),
                    new ConditionConstellation({constellation: 6}),
                ])]),
                ...(level < 5 ? [] : [
                    new ConditionAscensionChar({ascension: 4}),
                    new ConditionConstellation({constellation: 6}),
                ]),
                activeReceiver,
            ]),
        })),
        new ConditionStatic({
            title: 'talent_name.mika_topographical_mapping',
            description: 'talent_descr.mika_topographical_mapping',
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
                    title: 'talent_name.mika_factor_confluence',
                    description: 'talent_descr.mika_factor_confluence',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.mika_companions_ingress',
                    description: 'talent_descr.mika_companions_ingress',
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
                    title: 'talent_name.mika_sunfrost_encomium',
                    description: 'talent_descr.mika_sunfrost_encomium',
                }),
            ],
        },
        {},
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.mika_companions_counsel',
                    description: 'talent_descr.mika_companions_counsel_1',
                }),
                new ConditionBoolean({
                    name: 'mika_companions_counsel',
                    serializeId: 2,
                    title: 'talent_name.mika_companions_counsel',
                    description: 'talent_descr.mika_companions_counsel_2',
                    stats: {
                        crit_dmg_phys: C6PhysCritDmg,
                    },
                }),
                // Soulwind raises active affected characters' Physical CRIT
                // DMG; Mika keeps his own copy above.
                new Condition({
                    isHidden: true,
                    receivers: RECEIVERS.OTHERS,
                    stats: {
                        crit_dmg_phys: C6PhysCritDmg,
                    },
                    condition: new ConditionAnd([
                        new ConditionBoolean({name: 'mika_companions_counsel'}),
                        activeReceiver,
                    ]),
                }),
            ],
        },
    ]),
    retiredParty: [[1, 'number'], [2, 'checkbox'], [3, 'checkbox'], [4, 'stacks'], [5, 'checkbox']],
});
