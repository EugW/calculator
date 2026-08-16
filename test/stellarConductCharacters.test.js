import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureDamageStellarConduct } from "../src/js/classes/Feature2/Damage/StellarConduct";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { StatTable } from "../src/js/classes/StatTable";
import { Lang } from "../src/js/ui/Lang";
import { Beidou } from "../src/js/db/Char/Beidou";
import { Cyno } from "../src/js/db/Char/Cyno";
import { Qiqi } from "../src/js/db/Char/Qiqi";
import { Sandrone } from "../src/js/db/Char/Sandrone";
import { Wriothesley } from "../src/js/db/Char/Wriothesley";
import { Xilonen } from "../src/js/db/Char/Xilonen";
import { YaeMiko } from "../src/js/db/Char/YaeMiko";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";

global.window = {};
global.localStorage = {};
require("../src/js/lang/eng.js");
global.UI = {Lang: new Lang()};

function applyConditions(data, conditions) {
    for (const condition of conditions) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
}

function getFeature(char, name) {
    return char.getFeatures().find((feature) => feature.getName() === name);
}

function getCondition(char, name) {
    return char.getAllConditions().find((condition) => condition.getName() === name);
}

test("Beidou C6 party Radiance adds Cryo RES shred and active EM without duplicating Polestar math", () => {
    const data = new BuildData({
        polestar_field: true,
        "party.beidou_radiance_stellarconduct": true,
        "party.beidou_bane_of_the_evil": true,
    }, {});

    applyConditions(data, Beidou.getPartyConditions());

    expect(data.stats.get("enemy_res_electro")).toBe(-15);
    expect(data.stats.get("enemy_res_cryo")).toBe(-15);
    expect(data.stats.get("mastery")).toBe(200);
});

test("Qiqi C6 party Glimpse of Mystery adds flat Stellar-Conduct damage from Qiqi ATK", () => {
    const feature = new FeatureDamageStellarConduct({
        category: "skill",
        element: "cryo",
        multipliers: [
            new FeatureMultiplier({
                values: new StatTable("stellarconduct_test_hit", [100]),
            }),
        ],
    });
    const data = new BuildData({
        enemy_res_cryo: 0,
        "party.qiqi_glimpse_of_mystery": 1,
    }, {
        atk_base: 1000,
        qiqi_atk_total: 1000,
    });
    data.multipliers = Qiqi.getPartyMultipliers();

    const result = feature.getResult(data)["skill.stellarconduct_test_hit"];

    expect(result.normal).toBeCloseTo(7000, 5);
});

test("Qiqi imported Herald coordinated attack row is wired to Radiance Herald", () => {
    const feature = getFeature(Qiqi, "skill.qiqi_herald_of_frost_coordinated_attack");
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_cryo: 0,
        qiqi_herald_of_frost_radiance: true,
    }, {
        atk_base: 1000,
    });

    const result = feature.getResult(data)["skill.qiqi_herald_of_frost_coordinated_attack"];
    const expected = (charTalentTables.Qiqi.s2.p9[0] / 100) * 1000 * 0.5;

    expect(result.normal).toBeCloseTo(expected, 5);
});

test("Qiqi imported Burst Stellar-Conduct row uses direct Stellar-Conduct formula", () => {
    const feature = getFeature(Qiqi, "burst.qiqi_preserver_of_fortune_stellarconduct");
    const data = new BuildData({
        enemy_res_cryo: 0,
        qiqi_radiance_stellarconduct: true,
    }, {
        atk_base: 1000,
    });

    const result = feature.getResult(data)["burst.qiqi_preserver_of_fortune_stellarconduct"];
    const expected = (charTalentTables.Qiqi.s3.p7[0] / 100) * 1000;

    expect(feature.getDamageType()).toBe("stellarconduct");
    expect(result.normal).toBeCloseTo(expected, 5);
});

test("Yae Miko party Sakura level grants the generated C2 EM table", () => {
    const data = new BuildData({
        "party.yae_miko_sesshou_sakura_level": 4,
    }, {});

    applyConditions(data, YaeMiko.getPartyConditions());

    expect(data.stats.get("mastery")).toBe(200);
});

test("Yae Miko enhanced Sesshou Sakura rows add Edict damage to each Sakura level", () => {
    expect(getFeature(YaeMiko, "skill.yae_miko_enhanced_sesshou_sakura")).toBeUndefined();

    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_electro: 0,
        yae_miko_edict_of_cleansing: true,
    }, {
        atk_base: 1000,
    });

    for (const level of [1, 2, 3]) {
        const feature = getFeature(YaeMiko, `skill.yae_miko_enhanced_sesshou_sakura_${level}`);
        const result = feature.getResult(data)[`skill.yae_miko_enhanced_sesshou_sakura_${level}`];
        const expected = ((charTalentTables.YaeMiko.s2[`p${level}`][0] + 80) / 100) * 1000 * 0.5;

        expect(result.normal).toBeCloseTo(expected, 5);
    }

    const level4 = getFeature(YaeMiko, "skill.yae_miko_enhanced_sesshou_sakura_4");
    expect(level4.isActive(data)).toBe(false);

    const c2Data = new BuildData({
        char_constellation: 2,
        char_level: 90,
        enemy_level: 90,
        enemy_res_electro: 0,
        yae_miko_edict_of_cleansing: true,
    }, {
        atk_base: 1000,
    });
    const level4Result = level4.getResult(c2Data)["skill.yae_miko_enhanced_sesshou_sakura_4"];
    const level4Expected = ((charTalentTables.YaeMiko.s2.p4[0] + 80) / 100) * 1000 * 0.5;

    expect(level4Result.normal).toBeCloseTo(level4Expected, 5);
});

test("Cyno Starsame is direct Stellar-Conduct damage with ATK and EM scaling", () => {
    const feature = getFeature(Cyno, "skill.cyno_duststalker_bolt_starsame");
    const data = new BuildData({
        char_ascension: 4,
        enemy_res_electro: 0,
        cyno_wolfs_swiftness: true,
        cyno_radiance_stellarconduct: true,
        polestar_included_hits: 2,
    }, {
        atk_base: 1000,
        mastery: 100,
    });
    data.multipliers = Cyno.getMultipliers();

    const result = feature.getResult(data)["skill.cyno_duststalker_bolt_starsame"];
    const expected = 1.5 * 2000 * (1 + 6 * 100 / (100 + 2000)) + 600;

    expect(feature.getDamageType()).toBe("stellarconduct");
    expect(result.normal).toBeCloseTo(expected, 5);
    expect(result.isReacted).toBe(false);
});

test("Sandrone Light of Rationalisme adds capped base Stellar Glimmer damage from ATK", () => {
    const selfData = new BuildData({}, {
        atk_base: 1500,
        atk: 500,
    });
    selfData.postEffects = Sandrone.getPostEffects();
    selfData.applyPostEffects();

    const partyData = new BuildData({}, {
        sandrone_atk_total: 2000,
    });
    partyData.postEffects = Sandrone.getPartyPostEffects();
    partyData.applyPostEffects();

    expect(selfData.stats.get("stellarglimmer_multi")).toBeCloseTo(0.14, 5);
    expect(partyData.stats.get("stellarglimmer_multi")).toBeCloseTo(0.14, 5);
});

test("Sandrone Radiance switch renders Light of Rationalisme values", () => {
    const condition = getCondition(Sandrone, "sandrone_radiance_stellarconduct");
    const description = condition.getDescription(condition.getStats({}));

    expect(description).toContain("0.7%");
    expect(description).toContain("14%");
    expect(description).not.toContain("?");
    expect(description).not.toContain("%{");
});

test("Sandrone A1 swaps Prism Shot to the refined Stellar-Conduct branch above 50 Decoding Power", () => {
    const normalConduct = getFeature(Sandrone, "skill.sandrone_prism_shot_stellarconduct");
    const refinedConduct = getFeature(Sandrone, "skill.sandrone_refined_prism_shot_stellarconduct");
    const data = new BuildData({
        enemy_res_cryo: 0,
        sandrone_radiance_stellarconduct: true,
        sandrone_decoding_power: 60,
        char_ascension: 1,
    }, {
        atk_base: 1000,
    });

    const normalResult = normalConduct.getResult(data);
    const refinedResult = refinedConduct.getResult(data)["skill.sandrone_refined_prism_shot_stellarconduct"];
    const expected = 4 * (charTalentTables.Sandrone.s2.p2[0] / 100) * 1000;

    expect(normalResult).toEqual({});
    expect(refinedConduct.getDamageType()).toBe("stellarconduct");
    expect(refinedResult.normal).toBeCloseTo(expected, 5);
});

test("Sandrone C1 party toggle grants Stellar Glimmer damage bonus", () => {
    const data = new BuildData({
        "party.sandrone_morrow_after_the_golden_dusk": true,
    }, {});

    applyConditions(data, Sandrone.getPartyConditions());

    expect(data.stats.get("dmg_stellarglimmer")).toBe(30);
});

test("Wriothesley C1 Radiance title-only toggles add feature-local Stellar-Conduct DMG bonus", () => {
    const thirdRepelling = getFeature(Wriothesley, "skill.wriothesley_repelling_fist_3_stellarconduct");
    const repelling = getFeature(Wriothesley, "skill.wriothesley_repelling_fist_5_stellarconduct");
    const luster = getFeature(Wriothesley, "attack.wriothesley_luster_vaulting_fist_stellarconduct");
    const c1Static = Wriothesley.getAllConditions()
        .find((condition) => condition.getTitle() === "Terror for the Evildoers" && condition.getType() === "static");
    const repellingToggle = getCondition(Wriothesley, "wriothesley_c1_next_repelling_stellar_bonus");
    const lusterToggle = getCondition(Wriothesley, "wriothesley_c1_next_luster_bonus");
    const baseSettings = {
        enemy_res_cryo: 0,
        char_constellation: 2,
        char_ascension: 1,
        char_skill_attack: 1,
        char_skill_elemental: 1,
        wriothesley_radiance_stellarconduct: true,
        wriothesley_chilling_penalty: true,
        wriothesley_reckoning_for_sin: 5,
    };
    const baseStats = {
        atk_base: 1000,
        dmg_stellarconduct: 1,
    };
    const c1DmgBonusRatio = 2.5 / 2;

    expect(c1Static.getData({char_ascension: 1}).stats.get("dmg_charged_wriothesley")).toBe(0);
    expect(repellingToggle.getData({
        ...baseSettings,
        wriothesley_c1_next_repelling_stellar_bonus: true,
    }).stats.get("dmg_stellarconduct_wriothesley_c1_repelling")).toBe(50);
    expect(lusterToggle.getData({
        ...baseSettings,
        wriothesley_c1_next_luster_bonus: true,
    }).stats.get("dmg_stellarconduct_wriothesley_c1_luster")).toBe(50);
    expect(repellingToggle.getTitle()).toBe("Luster: Vaulting Fist attack hits an opponent");
    expect(repellingToggle.getDescription()).toBe("");
    expect(lusterToggle.getTitle()).toBe("Fifth attack of Repelling Fist enhanced by Chilling Penalty hits an opponent");
    expect(lusterToggle.getDescription()).toBe("");

    const baseThirdRepelling = thirdRepelling.getResult(new BuildData(baseSettings, baseStats))["skill.wriothesley_repelling_fist_3_stellarconduct"];
    const switchedThirdRepelling = thirdRepelling.getResult(new BuildData({
        ...baseSettings,
        wriothesley_c1_next_repelling_stellar_bonus: true,
        wriothesley_c1_next_luster_bonus: true,
    }, {
        ...baseStats,
        dmg_stellarconduct_wriothesley_c1_repelling: 0.5,
        dmg_stellarconduct_wriothesley_c1_luster: 0.5,
    }))["skill.wriothesley_repelling_fist_3_stellarconduct"];
    const baseRepelling = repelling.getResult(new BuildData(baseSettings, baseStats))["skill.wriothesley_repelling_fist_5_stellarconduct"];
    const switchedRepelling = repelling.getResult(new BuildData({
        ...baseSettings,
        wriothesley_c1_next_repelling_stellar_bonus: true,
    }, {
        ...baseStats,
        dmg_stellarconduct_wriothesley_c1_repelling: 0.5,
    }))["skill.wriothesley_repelling_fist_5_stellarconduct"];
    const baseLuster = luster.getResult(new BuildData(baseSettings, baseStats))["attack.wriothesley_luster_vaulting_fist_stellarconduct"];
    const switchedLuster = luster.getResult(new BuildData({
        ...baseSettings,
        wriothesley_c1_next_luster_bonus: true,
    }, {
        ...baseStats,
        dmg_stellarconduct_wriothesley_c1_luster: 0.5,
    }))["attack.wriothesley_luster_vaulting_fist_stellarconduct"];

    expect(switchedThirdRepelling.normal).toBeCloseTo(baseThirdRepelling.normal, 5);
    expect(switchedRepelling.normal).toBeCloseTo(baseRepelling.normal * c1DmgBonusRatio, 5);
    expect(switchedLuster.normal).toBeCloseTo(baseLuster.normal * c1DmgBonusRatio, 5);
});

test("Wriothesley C6 Repelling icicle is 20 percent of the enhanced 5th Stellar-Conduct hit", () => {
    const repelling = getFeature(Wriothesley, "skill.wriothesley_repelling_fist_5_stellarconduct");
    const icicle = getFeature(Wriothesley, "skill.wriothesley_c6_repelling_icicle_stellarconduct");
    const data = new BuildData({
        enemy_res_cryo: 0,
        char_constellation: 6,
        char_ascension: 1,
        char_skill_attack: 1,
        char_skill_elemental: 1,
        wriothesley_radiance_stellarconduct: true,
        wriothesley_chilling_penalty: true,
        wriothesley_reckoning_for_sin: 5,
        wriothesley_c1_next_repelling_stellar_bonus: true,
    }, {
        atk_base: 1000,
        dmg_stellarconduct_wriothesley_c1_repelling: 0.5,
    });

    const repellingResult = repelling.getResult(data)["skill.wriothesley_repelling_fist_5_stellarconduct"];
    const icicleResult = icicle.getResult(data)["skill.wriothesley_c6_repelling_icicle_stellarconduct"];

    expect(icicleResult.normal).toBeCloseTo(repellingResult.normal * 0.2, 5);
});

test("Wriothesley C6 Radiance description uses the current 20 percent icicle value", () => {
    const description = UI.Lang.get("talent_descr.wriothesley_esteem_for_the_innocent_buffed");

    expect(description).toContain("at 20% of its original DMG");
    expect(description).not.toContain("at 60% of its original DMG");
});

test("Stellar-Conduct does not consume Xilonen C4 base damage bonus", () => {
    const feature = new FeatureDamageStellarConduct({
        category: "skill",
        element: "cryo",
        multipliers: [
            new FeatureMultiplier({
                values: new StatTable("stellarconduct_test_hit", [100]),
            }),
        ],
    });
    const baseData = new BuildData({
        enemy_res_cryo: 0,
    }, {
        atk_base: 1000,
        xilonen_def_total: 2000,
    });
    const xilonenData = new BuildData({
        enemy_res_cryo: 0,
        "party.xilonen_suchitls_trance": true,
    }, {
        atk_base: 1000,
        xilonen_def_total: 2000,
    });
    xilonenData.multipliers = Xilonen.getPartyMultipliers();

    const baseResult = feature.getResult(baseData)["skill.stellarconduct_test_hit"];
    const xilonenResult = feature.getResult(xilonenData)["skill.stellarconduct_test_hit"];

    expect(xilonenResult.normal).toBeCloseTo(baseResult.normal, 5);
});
