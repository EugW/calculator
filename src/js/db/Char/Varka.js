import { Condition } from "../../classes/Condition";
import { ConditionAscensionChar } from "../../classes/Condition/Ascension/Char";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionConstellation } from "../../classes/Condition/Constellation";
import { ConditionDropdownElement } from "../../classes/Condition/Dropdown/Element";
import { ConditionDropdownElementWanderer } from "../../classes/Condition/Dropdown/Element/Wanderer";
import { FeatureMultiplierVarkaA1 } from "../../classes/Feature2/Multiplier/VarkaA1";
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
import { PostEffectStatsVarkaAtk } from "../../classes/PostEffect/Stats/VarkaAtk";
import { StatTable } from "../../classes/StatTable";
import { StatTableConditions } from "../../classes/StatTable/Condition";
import { ValueTable } from "../../classes/ValueTable";
import { charTables } from "../generated/CharTables";
import { charTalentTables } from "../generated/CharTalentTables";

const Talents = new DbObjectTalents({
    attack: {
        gameId: charTalentTables.Varka.s1_id,
        title: 'talent_name.varka_dancing_radiance',
        description: 'talent_descr.varka_dancing_radiance',
        items: [
            { table: new StatTable('normal_hit_1', charTalentTables.Varka.s1.p1) },
            { type: 'hits', name: 'normal_hit_2', table: [ new StatTable('normal_hit_2_1', charTalentTables.Varka.s1.p3), new StatTable('normal_hit_2_2', charTalentTables.Varka.s1.p2) ] },
            { type: 'hits', name: 'normal_hit_3', table: [ new StatTable('normal_hit_3_1', charTalentTables.Varka.s1.p5), new StatTable('normal_hit_3_2', charTalentTables.Varka.s1.p4) ] },
            { type: 'hits', name: 'normal_hit_4', table: [ new StatTable('normal_hit_4_1', charTalentTables.Varka.s1.p6), new StatTable('normal_hit_4_2', charTalentTables.Varka.s1.p7) ] },
            { type: 'hits', name: 'normal_hit_5', table: [ new StatTable('normal_hit_5_1', charTalentTables.Varka.s1.p8), new StatTable('normal_hit_5_2', charTalentTables.Varka.s1.p9) ] },
            { type: 'hits', name: 'charged_hit', table: [ new StatTable('charged_hit_1', charTalentTables.Varka.s1.p10), new StatTable('charged_hit_2', charTalentTables.Varka.s1.p11) ] },
            { unit: 'unit', table: new StatTable('stamina_cost', charTalentTables.Varka.s1.p12) },
            { table: new StatTable('plunge', charTalentTables.Varka.s1.p13) },
            { table: new StatTable('plunge_low', charTalentTables.Varka.s1.p14) },
            { table: new StatTable('plunge_high', charTalentTables.Varka.s1.p15) },
        ],
    },
    skill: {
        gameId: charTalentTables.Varka.s2_id,
        title: 'talent_name.varka_windbound_execution',
        description: 'talent_descr.varka_windbound_execution',
        items: [
            { table: new StatTable('varka_skill_dmg', charTalentTables.Varka.s2.p1) },
            { unit: 'sec', table: new StatTable('varka_sturm_und_drang_duration', charTalentTables.Varka.s2.p2) },
            { table: new StatTable('varka_skill_normal_hit_1', charTalentTables.Varka.s2.p3) },
            { type: 'hits', name: 'varka_skill_normal_hit_2', table: [ new StatTable('varka_skill_normal_hit_2_1', charTalentTables.Varka.s2.p5), new StatTable('varka_skill_normal_hit_2_2', charTalentTables.Varka.s2.p4) ] },
            { type: 'hits', name: 'varka_skill_normal_hit_3', table: [ new StatTable('varka_skill_normal_hit_3_1', charTalentTables.Varka.s2.p7), new StatTable('varka_skill_normal_hit_3_2', charTalentTables.Varka.s2.p6) ] },
            { type: 'hits', name: 'varka_skill_normal_hit_4', table: [ new StatTable('varka_skill_normal_hit_4_1', charTalentTables.Varka.s2.p8), new StatTable('varka_skill_normal_hit_4_2', charTalentTables.Varka.s2.p9) ] },
            { type: 'hits', name: 'varka_skill_normal_hit_5', table: [ new StatTable('varka_skill_normal_hit_5_1', charTalentTables.Varka.s2.p10), new StatTable('varka_skill_normal_hit_5_2', charTalentTables.Varka.s2.p11) ] },
            { type: 'hits', name: 'varka_skill_charged_hit', table: [ new StatTable('varka_skill_charged_hit_1', charTalentTables.Varka.s2.p12), new StatTable('varka_skill_charged_hit_2', charTalentTables.Varka.s2.p13) ] },
            { table: new StatTable('varka_four_winds_ascension_dmg', charTalentTables.Varka.s2.p14) },
            { table: new StatTable('varka_four_winds_ascension_anemo_dmg', charTalentTables.Varka.s2.p15) },
            { table: new StatTable('varka_azure_devour_dmg', charTalentTables.Varka.s2.p16) },
            { table: new StatTable('varka_azure_devour_anemo_dmg', charTalentTables.Varka.s2.p17) },
            { unit: 'sec', table: new StatTable('varka_four_winds_ascension_cd', charTalentTables.Varka.s2.p18) },
            { unit: 'sec', table: new StatTable('cd_press', charTalentTables.Varka.s2.p19) },
            { unit: 'sec', table: new StatTable('cd_hold', charTalentTables.Varka.s2.p20) },
        ],
    },
    burst: {
        gameId: charTalentTables.Varka.s3_id,
        title: 'talent_name.varka_northwind_avatar',
        description: 'talent_descr.varka_northwind_avatar',
        items: [
            { table: new StatTable('burst_1_hit_dmg', charTalentTables.Varka.s3.p1) },
            { table: new StatTable('burst_2_hit_dmg', charTalentTables.Varka.s3.p2) },
            { unit: 'sec', table: new StatTable('cd', charTalentTables.Varka.s3.p3) },
            { unit: '', table: new StatTable('energy_cost', charTalentTables.Varka.s3.p4) },
        ],
    },
});

export const Varka = new DbObjectChar({
    name: 'varka',
    serializeId: 118,
    gameId: 10000128,
    iconClass: 'char-icon-varka',
    rarity: 5,
    element: 'anemo',
    weapon: 'claymore',
    origin: 'mondstadt',
    talents: Talents,
    statTable: charTables.Varka,
    features: [
        // 1. Base NAs / CAs / Plunges
        new FeatureDamageNormal({ multipliers: [ new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_1') }) ] }),
        new FeatureDamageMultihit({ name: 'normal_hit_2', category: 'attack', damageType: 'normal', items: [{ multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_2_1') })] }, { multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_2_2') })] }] }),
        new FeatureDamageNormal({ name: 'normal_hit_2_1', isChild: true, multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_2_1') })] }),
        new FeatureDamageNormal({ name: 'normal_hit_2_2', isChild: true, multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_2_2') })] }),
        new FeatureDamageMultihit({ name: 'normal_hit_3', category: 'attack', damageType: 'normal', items: [{ multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_3_1') })] }, { multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_3_2') })] }] }),
        new FeatureDamageNormal({ name: 'normal_hit_3_1', isChild: true, multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_3_1') })] }),
        new FeatureDamageNormal({ name: 'normal_hit_3_2', isChild: true, multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_3_2') })] }),
        new FeatureDamageMultihit({ name: 'normal_hit_4', category: 'attack', damageType: 'normal', items: [{ multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_4_1') })] }, { multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_4_2') })] }] }),
        new FeatureDamageNormal({ name: 'normal_hit_4_1', isChild: true, multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_4_1') })] }),
        new FeatureDamageNormal({ name: 'normal_hit_4_2', isChild: true, multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_4_2') })] }),
        new FeatureDamageMultihit({ name: 'normal_hit_5', category: 'attack', damageType: 'normal', items: [{ multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_5_1') })] }, { multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_5_2') })] }] }),
        new FeatureDamageNormal({ name: 'normal_hit_5_1', isChild: true, multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_5_1') })] }),
        new FeatureDamageNormal({ name: 'normal_hit_5_2', isChild: true, multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.normal_hit_5_2') })] }),
        new FeatureDamageMultihit({ name: 'charged_hit', category: 'attack', damageType: 'charged', items: [{ multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.charged_hit_1') })] }, { multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.charged_hit_2') })] }] }),
        new FeatureDamageCharged({ name: 'charged_hit_1', isChild: true, multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.charged_hit_1') })] }),
        new FeatureDamageCharged({ name: 'charged_hit_2', isChild: true, multipliers: [new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.charged_hit_2') })] }),
        new FeatureDamagePlungeCollision({ multipliers: [ new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.plunge') }) ] }),
        new FeatureDamagePlungeShockWave({ multipliers: [ new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.plunge_low') }) ] }),
        new FeatureDamagePlungeShockWave({ multipliers: [ new FeatureMultiplier({ leveling: 'char_skill_attack', values: Talents.get('attack.plunge_high') }) ] }),

        // 2. Skill Tap DMG
        new FeatureDamageSkill({ element: 'anemo', multipliers: [ new FeatureMultiplier({ leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_dmg') }) ] }),

        // 3. Sturm und Drang Hits
        new FeatureDamageNormal({ name: 'varka_skill_normal_hit_1', elementSetting: 'party_varka_priority_element_str', category: 'skill', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_normal_hit_1') })] }),
        
        new FeatureDamageNormal({ name: 'varka_skill_normal_hit_2_1', element: 'anemo', category: 'skill', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_normal_hit_2_1') })] }),
        new FeatureDamageNormal({ name: 'varka_skill_normal_hit_2_2', elementSetting: 'party_varka_priority_element_str', category: 'skill', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_normal_hit_2_2') })] }),

        new FeatureDamageNormal({ name: 'varka_skill_normal_hit_3_1', element: 'anemo', category: 'skill', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_normal_hit_3_1') })] }),
        new FeatureDamageNormal({ name: 'varka_skill_normal_hit_3_2', elementSetting: 'party_varka_priority_element_str', category: 'skill', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_normal_hit_3_2') })] }),

        new FeatureDamageNormal({ name: 'varka_skill_normal_hit_4_1', elementSetting: 'party_varka_priority_element_str', category: 'skill', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_normal_hit_4_1') })] }),
        new FeatureDamageNormal({ name: 'varka_skill_normal_hit_4_2', element: 'anemo', category: 'skill', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_normal_hit_4_2') })] }),

        new FeatureDamageNormal({ name: 'varka_skill_normal_hit_5_1', elementSetting: 'party_varka_priority_element_str', category: 'skill', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_normal_hit_5_1') })] }),
        new FeatureDamageNormal({ name: 'varka_skill_normal_hit_5_2', element: 'anemo', category: 'skill', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_normal_hit_5_2') })] }),

        new FeatureDamageCharged({ name: 'varka_skill_charged_hit_1', elementSetting: 'party_varka_priority_element_str', category: 'skill', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_charged_hit_1') })] }),
        new FeatureDamageCharged({ name: 'varka_skill_charged_hit_2', element: 'anemo', category: 'skill', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_skill_charged_hit_2') })] }),

        // 4. Four Winds Ascension and Azure Devour
        new FeatureDamageSkill({ name: 'varka_four_winds_ascension_dmg', elementSetting: 'party_varka_priority_element_str', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_c1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_four_winds_ascension_dmg') })] }),
        new FeatureDamageSkill({ name: 'varka_four_winds_ascension_anemo_dmg', element: 'anemo', multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_c1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_four_winds_ascension_anemo_dmg') })] }),
        new FeatureDamageCharged({ name: 'varka_azure_devour_dmg', category: 'skill', elementSetting: 'party_varka_priority_element_str', hits: 2, multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_c1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_azure_devour_dmg') })] }),
        new FeatureDamageCharged({ name: 'varka_azure_devour_anemo_dmg', element: 'anemo', category: 'skill', hits: 2, multipliers: [new FeatureMultiplierVarkaA1({ scalingSource: 'varka_a1_c1_multiplier', scalingMultiplierCondition: new ConditionAscensionChar({ascension: 1}), leveling: 'char_skill_elemental', values: Talents.get('skill.varka_azure_devour_anemo_dmg') })] }),
        
        // Burst
        new FeatureDamageBurst({ name: 'burst_1_hit_dmg', element: 'anemo', elementSetting: 'party_varka_priority_element_str', multipliers: [new FeatureMultiplier({ leveling: 'char_skill_burst', values: Talents.get('burst.burst_1_hit_dmg') })] }),
        new FeatureDamageBurst({ name: 'burst_2_hit_dmg', element: 'anemo', multipliers: [new FeatureMultiplier({ leveling: 'char_skill_burst', values: Talents.get('burst.burst_2_hit_dmg') })] }),

        // C2 Strike
        new FeatureDamageSkill({
            name: 'varka_when_dawn_breaks_our_journey_shall_take_flight',
            element: 'anemo',
            multipliers: [new FeatureMultiplier({ source: 'constellation2', values: new StatTable('varka_c2_dmg', [800]) })],
            condition: new ConditionConstellation({ constellation: 2 }),
        }),
    ],
    conditions: [
        new ConditionDropdownElement({
            name: 'party_varka_priority_element',
            serializeId: 4,
            rotation: 'party',
            title: 'talent_name.varka_dawn_winds_march',
            description: 'talent_descr.varka_dawn_winds_march',
            multiple: false,
            hideEmpty: false,
            values: [
                { value: 'pyro', serializeId: 1, conditions: [new Condition({ settings: { party_varka_priority_element_str: 'pyro' } })] },
                { value: 'hydro', serializeId: 2, conditions: [new Condition({ settings: { party_varka_priority_element_str: 'hydro' } })] },
                { value: 'electro', serializeId: 3, conditions: [new Condition({ settings: { party_varka_priority_element_str: 'electro' } })] },
                { value: 'cryo', serializeId: 4, conditions: [new Condition({ settings: { party_varka_priority_element_str: 'cryo' } })] },
            ],
            info: { ascension: 1 }
        }),
        new ConditionStacks({
            name: 'varka_azure_fang_oath',
            serializeId: 2,
            title: 'talent_name.varka_winds_vanguard',
            description: 'talent_descr.varka_winds_vanguard',
            maxStacks: 4,
            stats: [
                new StatTable('dmg_normal', [7.5]),
                new StatTable('dmg_charged', [7.5]),
                new StatTable('dmg_skill', [7.5]),
                new StatTableConditions('crit_dmg', [20], [new ConditionConstellation({constellation: 6})]),
            ],
            info: { ascension: 4 },
        }),
        // Witch Homework - makes Varka count as Hexerei
        new ConditionBoolean({
            name: 'varka_witch_homework',
            serializeId: 6,
            title: 'talent_name.varka_dawns_return',
            description: 'talent_descr.varka_dawns_return',
            info: {hexerei: true},
        }),
    ],
    postEffects: [
        new PostEffectStatsVarkaAtk({
            levelSetting: 'char_level',
            from: 'atk_total',
            percent: new StatTable('dmg_anemo', [0.01]),
            statCap: new ValueTable([25]),
            conditions: [
                new ConditionAscensionChar({ascension: 1}),
            ],
        }),
    ],
    constellation: new DbObjectConstellation([
        {
            conditions: [
                new ConditionBoolean({
                    name: 'varka_lyrical_libation',
                    serializeId: 3,
                    title: 'talent_name.varka_come_friend_let_us_dance_beneath_the_moons_soft_glow',
                    description: 'talent_descr.varka_come_friend_let_us_dance_beneath_the_moons_soft_glow',
                    info: { constellation: 1 },
                }),
            ],
        },
        {
            conditions: [
                new ConditionStatic({
                    title: 'talent_name.varka_when_dawn_breaks_our_journey_shall_take_flight',
                    description: 'talent_descr.varka_when_dawn_breaks_our_journey_shall_take_flight',
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
                new ConditionDropdownElementWanderer({
                    name: 'varka_freedom_of_song_element',
                    serializeId: 5,
                    title: 'talent_name.varka_for_none_may_take_from_us_our_freedom_of_song',
                    description: 'talent_descr.varka_for_none_may_take_from_us_our_freedom_of_song',
                    multiple: false,
                    hideEmpty: false,
                    limit: 1,
                    dropdownClass: 'small select-element-multiple',
                    values: [
                        { value: 'pyro', serializeId: 1, conditions: [new Condition({ stats: { dmg_pyro: 20, dmg_anemo: 20 } })] },
                        { value: 'hydro', serializeId: 2, conditions: [new Condition({ stats: { dmg_hydro: 20, dmg_anemo: 20 } })] },
                        { value: 'electro', serializeId: 3, conditions: [new Condition({ stats: { dmg_electro: 20, dmg_anemo: 20 } })] },
                        { value: 'cryo', serializeId: 4, conditions: [new Condition({ stats: { dmg_cryo: 20, dmg_anemo: 20 } })] },
                    ],
                    info: { constellation: 4 },
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
                    title: 'talent_name.varka_beloved_mondstadt_steadfast_you_shall_shine',
                    description: 'talent_descr.varka_beloved_mondstadt_steadfast_you_shall_shine',
                }),
            ],
        },
    ]),
    partyData: {
        conditions: [
            // Witch Homework toggle for party (makes Varka count as Hexerei)
            new ConditionBoolean({
                name: 'party.varka_witch_homework',
                serializeId: 3,
                rotation: 'party',
                title: 'talent_name.varka_dawns_return',
                description: 'talent_descr.varka_dawns_return',
                info: {hexerei: true},
            }),
            new ConditionDropdownElementWanderer({
                name: 'party.varka_freedom_of_song_element',
                serializeId: 2,
                rotation: 'party',
                title: 'talent_name.varka_for_none_may_take_from_us_our_freedom_of_song',
                description: 'talent_descr.varka_for_none_may_take_from_us_our_freedom_of_song',
                multiple: false,
                hideEmpty: false,
                limit: 1,
                dropdownClass: 'small select-element-multiple',
                values: [
                    { value: 'pyro', serializeId: 1, conditions: [new Condition({ stats: { dmg_pyro: 20, dmg_anemo: 20 } })] },
                    { value: 'hydro', serializeId: 2, conditions: [new Condition({ stats: { dmg_hydro: 20, dmg_anemo: 20 } })] },
                    { value: 'electro', serializeId: 3, conditions: [new Condition({ stats: { dmg_electro: 20, dmg_anemo: 20 } })] },
                    { value: 'cryo', serializeId: 4, conditions: [new Condition({ stats: { dmg_cryo: 20, dmg_anemo: 20 } })] },
                ],
                info: { constellation: 4 },
            }),
        ],
    },
});
