import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanChar } from "../../classes/Condition/Boolean/Char";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionStatic } from "../../classes/Condition/Static";
import { DbObjectChar } from "../../classes/DbObject/Char";
import { DbObjectConstellation } from "../../classes/DbObject/Constellation";
import { DbObjectTalents } from "../../classes/DbObject/Talents";
import { CMulti } from "../../classes/Feature2/Compile/Types/Block";
import { FeatureDamageBurst } from "../../classes/Feature2/Damage/Burst";
import { FeatureDamageCharged } from "../../classes/Feature2/Damage/Charged";
import { FeatureDamageMultihit } from "../../classes/Feature2/Damage/Multihit";
import { FeatureDamageNormal } from "../../classes/Feature2/Damage/Normal";
import { FeatureDamageOther } from "../../classes/Feature2/Damage/Other";
import { FeatureDamagePlungeCollision } from "../../classes/Feature2/Damage/Plunge/Collision";
import { FeatureDamagePlungeShockWave } from "../../classes/Feature2/Damage/Plunge/ShockWave";
import { FeatureDamageSkill } from "../../classes/Feature2/Damage/Skill";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { StatTable } from "../../classes/StatTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Lohen.s1_id,
        title: 'talent_name.lohen_spear_of_favonius_broken_oath',
        description: 'talent_descr.lohen_spear_of_favonius_broken_oath',
        items: [
            {
                table: new StatTable('normal_hit_1', charTalentTables.Lohen.s1.p1),
            },
            {
                table: new StatTable('normal_hit_2', charTalentTables.Lohen.s1.p2),
            },
            {
                table: new StatTable('normal_hit_3', charTalentTables.Lohen.s1.p3),
            },
            {
                table: new StatTable('normal_hit_4', charTalentTables.Lohen.s1.p4),
            },
            {
                type: 'hits',
                name: 'normal_hit_5',
                table: [
                    new StatTable('normal_hit_5_1', charTalentTables.Lohen.s1.p5),
                    new StatTable('normal_hit_5_2', charTalentTables.Lohen.s1.p6),
                ],
            },
            {
                table: new StatTable('charged_hit', charTalentTables.Lohen.s1.p7),
            },
            {
                unit: 'unit',
                table: new StatTable('stamina_cost', charTalentTables.Lohen.s1.p8),
            },
            {
                table: new StatTable('plunge', charTalentTables.Lohen.s1.p9),
            },
            {
                table: new StatTable('plunge_low', charTalentTables.Lohen.s1.p10),
            },
            {
                table: new StatTable('plunge_high', charTalentTables.Lohen.s1.p11),
            },
        ],
    },
    skill: {
        gameId: charTalentTables.Lohen.s2_id,
        title: 'talent_name.lohen_unforeseen_strike',
        description: 'talent_descr.lohen_unforeseen_strike',
        items: [
            {
                table: new StatTable('lohen_masterstroke_normal_hit_1', charTalentTables.Lohen.s2.p1),
            },
            {
                table: new StatTable('lohen_masterstroke_normal_hit_2', charTalentTables.Lohen.s2.p2),
            },
            {
                table: new StatTable('lohen_masterstroke_normal_hit_3', charTalentTables.Lohen.s2.p3),
            },
            {
                table: new StatTable('lohen_masterstroke_normal_hit_4', charTalentTables.Lohen.s2.p4),
            },
            {
                type: 'hits',
                name: 'lohen_masterstroke_normal_hit_5',
                table: [
                    new StatTable('lohen_masterstroke_normal_hit_5_1', charTalentTables.Lohen.s2.p5),
                    new StatTable('lohen_masterstroke_normal_hit_5_2', charTalentTables.Lohen.s2.p6),
                ],
            },
            {
                table: new StatTable('lohen_masterstroke_charged_hit', charTalentTables.Lohen.s2.p7),
            },
            {
                unit: 'unit',
                table: new StatTable('lohen_masterstroke_stamina_cost', charTalentTables.Lohen.s2.p8),
            },
            {
                table: new StatTable('lohen_masterstroke_plunge', charTalentTables.Lohen.s2.p9),
            },
            {
                table: new StatTable('lohen_masterstroke_plunge_low', charTalentTables.Lohen.s2.p10),
            },
            {
                table: new StatTable('lohen_masterstroke_plunge_high', charTalentTables.Lohen.s2.p11),
            },
            {
                unit: 'sec',
                table: new StatTable('lohen_masterstroke_duration', charTalentTables.Lohen.s2.p12),
            },
            {
                table: new StatTable('lohen_etched_into_bone_and_soul', charTalentTables.Lohen.s2.p17),
            },
            {
                table: new StatTable('lohen_will_to_win_dmg_increase', charTalentTables.Lohen.s2.p18),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Lohen.s2.p19),
            },
        ],
    },
    burst: {
        gameId: charTalentTables.Lohen.s3_id,
        title: 'talent_name.lohen_manifest_judgment',
        description: 'talent_descr.lohen_manifest_judgment',
        items: [
            {
                table: new StatTable('lohen_manifest_judgment', charTalentTables.Lohen.s3.p1),
            },
            {
                table: new StatTable('lohen_manifest_judgment_will_to_win_dmg_increase', charTalentTables.Lohen.s3.p2),
            },
            {
                unit: 'sec',
                table: new StatTable('cd', charTalentTables.Lohen.s3.p3),
            },
            {
                unit: '',
                table: new StatTable('energy_cost', charTalentTables.Lohen.s3.p4),
            },
        ],
    },
});

const WillToWinMax = 100;
const C1WillToWinMax = 300;
const A4AtkBonus = 15;
const WitchNormalChargedBonus = 40;
const C2EvilsbaneBladeDmg = 500;
const C2PartyEm = 200;
const C6CritDmg = 175;

class ConditionLohenWillToWinHalf extends Condition {
    getType() {
        return 'static';
    }

    isActive(settings) {
        settings ||= {};

        let result = super.isActive(settings);
        if (!result) {
            return false;
        }

        return (settings.lohen_will_to_win || 0) >= lohenWillToWinMax(settings) / 2;
    }
}

class FeatureMultiplierLohenWillToWin extends FeatureMultiplier {
    constructor(params) {
        super(params);

        this.baseMultiplier = new FeatureMultiplier({
            leveling: params.baseLeveling || params.leveling,
            values: params.baseValues,
        });
    }

    getTreeLevelMultiplier(data) {
        return new CMulti([
            this.baseMultiplier.getTreeLevelMultiplier(data),
            super.getTreeLevelMultiplier(data),
        ]);
    }
}

const condMasterstroke = new ConditionBoolean({name: 'lohen_masterstroke'});
const condWitchHomework = new ConditionBoolean({name: 'lohen_witch_homework'});
const condHexereiResonance = new ConditionHexereiResonance({});
const lohenWillToWinMax = (settings) => {
    return settings.char_constellation >= 1 ? C1WillToWinMax : WillToWinMax;
};
const condPartyNotLohen = new ConditionNot([
    new ConditionBooleanChar({
        chars: ['lohen'],
    }),
]);

export const Lohen = new DbObjectChar({
    name: 'lohen',
    serializeId: 120,
    gameId: 10000129,
    iconClass: 'char-icon-lohen',
    rarity: 5,
    element: 'cryo',
    weapon: 'polearm',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Lohen,
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
            damageType: 'normal',
            name: 'normal_hit_5',
            allowInfusion: true,
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_5_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_attack',
                            values: Talents.get('attack.normal_hit_5_2'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5_1',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            name: 'normal_hit_5_2',
            isChild: true,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_attack',
                    values: Talents.get('attack.normal_hit_5_2'),
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
        new FeatureDamageNormal({
            category: 'skill',
            name: 'lohen_masterstroke_normal_hit_1',
            element: 'cryo',
            condition: condMasterstroke,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lohen_masterstroke_normal_hit_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            category: 'skill',
            name: 'lohen_masterstroke_normal_hit_2',
            element: 'cryo',
            condition: condMasterstroke,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lohen_masterstroke_normal_hit_2'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            category: 'skill',
            name: 'lohen_masterstroke_normal_hit_3',
            element: 'cryo',
            condition: condMasterstroke,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lohen_masterstroke_normal_hit_3'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            category: 'skill',
            name: 'lohen_masterstroke_normal_hit_4',
            element: 'cryo',
            condition: condMasterstroke,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lohen_masterstroke_normal_hit_4'),
                }),
            ],
        }),
        new FeatureDamageMultihit({
            category: 'skill',
            damageType: 'normal',
            name: 'lohen_masterstroke_normal_hit_5',
            element: 'cryo',
            condition: condMasterstroke,
            items: [
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_elemental',
                            values: Talents.get('skill.lohen_masterstroke_normal_hit_5_1'),
                        }),
                    ],
                },
                {
                    multipliers: [
                        new FeatureMultiplier({
                            leveling: 'char_skill_elemental',
                            values: Talents.get('skill.lohen_masterstroke_normal_hit_5_2'),
                        }),
                    ],
                },
            ],
        }),
        new FeatureDamageNormal({
            category: 'skill',
            name: 'lohen_masterstroke_normal_hit_5_1',
            element: 'cryo',
            isChild: true,
            condition: condMasterstroke,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lohen_masterstroke_normal_hit_5_1'),
                }),
            ],
        }),
        new FeatureDamageNormal({
            category: 'skill',
            name: 'lohen_masterstroke_normal_hit_5_2',
            element: 'cryo',
            isChild: true,
            condition: condMasterstroke,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lohen_masterstroke_normal_hit_5_2'),
                }),
            ],
        }),
        new FeatureDamageCharged({
            category: 'skill',
            name: 'lohen_masterstroke_charged_hit',
            element: 'cryo',
            condition: condMasterstroke,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lohen_masterstroke_charged_hit'),
                }),
            ],
        }),
        new FeatureDamagePlungeCollision({
            category: 'skill',
            name: 'lohen_masterstroke_plunge',
            element: 'cryo',
            condition: condMasterstroke,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lohen_masterstroke_plunge'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            category: 'skill',
            name: 'lohen_masterstroke_plunge_low',
            element: 'cryo',
            condition: condMasterstroke,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lohen_masterstroke_plunge_low'),
                }),
            ],
        }),
        new FeatureDamagePlungeShockWave({
            category: 'skill',
            name: 'lohen_masterstroke_plunge_high',
            element: 'cryo',
            condition: condMasterstroke,
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lohen_masterstroke_plunge_high'),
                }),
            ],
        }),
        new FeatureDamageSkill({
            name: 'lohen_etched_into_bone_and_soul',
            element: 'cryo',
            critDamageBonuses: ['crit_dmg_lohen_masterstroke_special'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_elemental',
                    values: Talents.get('skill.lohen_etched_into_bone_and_soul'),
                }),
                new FeatureMultiplierLohenWillToWin({
                    leveling: 'char_skill_elemental',
                    stacksLeveling: 'lohen_will_to_win',
                    maxStacks: lohenWillToWinMax,
                    baseValues: Talents.get('skill.lohen_etched_into_bone_and_soul'),
                    values: Talents.get('skill.lohen_will_to_win_dmg_increase'),
                }),
            ],
        }),
        new FeatureDamageOther({
            name: 'lohen_evilsbane_blade',
            element: 'cryo',
            condition: new ConditionConstellation({constellation: 2}),
            multipliers: [
                new FeatureMultiplier({
                    source: 'constellation2',
                    values: new StatTable('lohen_evilsbane_blade', [C2EvilsbaneBladeDmg]),
                }),
            ],
        }),
        new FeatureDamageBurst({
            name: 'lohen_manifest_judgment',
            element: 'cryo',
            critDamageBonuses: ['crit_dmg_lohen_masterstroke_special'],
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'char_skill_burst',
                    values: Talents.get('burst.lohen_manifest_judgment'),
                }),
                new FeatureMultiplierLohenWillToWin({
                    leveling: 'char_skill_burst',
                    stacksLeveling: 'lohen_will_to_win',
                    maxStacks: lohenWillToWinMax,
                    baseValues: Talents.get('burst.lohen_manifest_judgment'),
                    values: Talents.get('burst.lohen_manifest_judgment_will_to_win_dmg_increase'),
                }),
            ],
        }),
    ],
    conditions: [
        new ConditionBoolean({
            name: 'lohen_masterstroke',
            serializeId: 1,
            title: 'talent_name.n11290001',
            description: 'talent_descr.n11290001',
        }),
        new ConditionNumber({
            name: 'lohen_will_to_win',
            serializeId: 2,
            title: 'talent_name.n11290004',
            description: 'talent_descr.n11290004',
            max: lohenWillToWinMax,
            allowMinZero: 1,
        }),
        new ConditionBoolean({
            name: 'lohen_flippant_masterpiece',
            serializeId: 3,
            title: 'talent_name.lohen_flippant_masterpiece',
            description: 'talent_descr.lohen_flippant_masterpiece',
            info: {ascension: 4},
            stats: {
                atk_percent: A4AtkBonus,
            },
            condition: new ConditionAscensionChar({ascension: 4}),
        }),
        new ConditionBoolean({
            name: 'lohen_when_the_mood_strikes',
            serializeId: 7,
            title: 'talent_name.lohen_when_the_mood_strikes',
            description: 'talent_descr.lohen_when_the_mood_strikes',
            settings: {
                char_skill_elemental_bonus_2: 1,
            },
        }),
        new ConditionBoolean({
            name: 'lohen_witch_homework',
            serializeId: 4,
            title: 'talent_name.lohen_unhealing_thorn',
            info: {hexerei: true},
        }),
        new ConditionBoolean({
            name: 'lohen_unhealing_thorn',
            serializeId: 5,
            title: 'talent_name.lohen_unhealing_thorn',
            description: 'talent_descr.lohen_unhealing_thorn',
            hideInactive: true,
            stats: {
                dmg_normal: WitchNormalChargedBonus,
                dmg_charged: WitchNormalChargedBonus,
            },
            condition: new ConditionAnd([
                condWitchHomework,
                condHexereiResonance,
                new ConditionLohenWillToWinHalf(),
            ]),
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.lohen_o_breezes_that_so_oft_bear_sorrowful_lament',
                    description: 'talent_descr.lohen_o_breezes_that_so_oft_bear_sorrowful_lament',
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.lohen_in_flight_i_strike_whatever_flies',
                    description: 'talent_descr.lohen_in_flight_i_strike_whatever_flies',
                    stats: {
                        text_percent_dmg: C2EvilsbaneBladeDmg,
                        text_mastery: C2PartyEm,
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
                    title: 'talent_name.lohen_radiant_love_laughing_death',
                    description: 'talent_descr.lohen_radiant_love_laughing_death',
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
                    name: 'lohen_to_drown_to_sink_unconscious_supreme_joy',
                    serializeId: 6,
                    title: 'talent_name.lohen_to_drown_to_sink_unconscious_supreme_joy',
                    description: 'talent_descr.lohen_to_drown_to_sink_unconscious_supreme_joy',
                    stats: {
                        crit_dmg_lohen_masterstroke_special: C6CritDmg,
                    },
                }),
            ],
        },
    ]),
    partyData: {
        conditions: [
            new ConditionBoolean({
                name: 'party.lohen_witch_homework',
                serializeId: 1,
                rotation: 'party',
                title: 'talent_name.lohen_unhealing_thorn',
                description: 'talent_descr.lohen_unhealing_thorn',
                info: {hexerei: true},
            }),
            new ConditionBoolean({
                name: 'party.lohen_flippant_masterpiece',
                serializeId: 2,
                rotation: 'party',
                title: 'talent_name.lohen_flippant_masterpiece',
                description: 'talent_descr.lohen_flippant_masterpiece',
                info: {ascension: 4},
                stats: {
                    atk_percent: A4AtkBonus,
                },
            }),
            new ConditionBoolean({
                name: 'party.lohen_in_flight_i_strike_whatever_flies',
                serializeId: 3,
                rotation: 'party',
                title: 'talent_name.lohen_in_flight_i_strike_whatever_flies',
                description: 'talent_descr.lohen_in_flight_i_strike_whatever_flies',
                info: {constellation: 2},
                stats: {
                    mastery: C2PartyEm,
                },
                condition: condPartyNotLohen,
            }),
        ],
    },
});
