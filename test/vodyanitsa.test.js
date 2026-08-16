import fs from "fs";
import path from "path";
import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureDamageStellarSwirl } from "../src/js/classes/Feature2/Damage/StellarSwirl";
import { Vodyanitsa } from "../src/js/db/Char/Vodyanitsa";
import { DB } from "../src/js/db/DB";
import { Rotation } from "../src/js/db/Features/Rotation";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";

function getFeature(name) {
    return Vodyanitsa.getFeatures().find((feature) => feature.getName() === name);
}

function getCondition(name, party = false) {
    const conditions = party ? Vodyanitsa.getPartyConditions() : Vodyanitsa.getAllConditions();
    return conditions.find((condition) => condition.getName() === name);
}

function applyConditions(data, conditions) {
    for (const condition of conditions) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
}

test("Vodyanitsa is character 127 and is hidden by default", () => {
    expect(DB.Chars.get("Vodyanitsa")).toBe(Vodyanitsa);
    expect(DB.Chars.getById(127)).toBe(Vodyanitsa);
    expect(DB.Chars.getKeys()).not.toContain("Vodyanitsa");
    expect(DB.Chars.getKeys(true)).toContain("Vodyanitsa");
    expect(DB.Chars.getByGameId(10000140)).toBeUndefined();
    expect(Vodyanitsa.getId()).toBe(127);
    expect(Vodyanitsa.getGameId()).toEqual([10000140]);
    const ids = DB.Chars.getKeys(true).map((key) => DB.Chars.get(key).getId());
    expect(new Set(ids).size).toBe(ids.length);
});

test("generated rows preserve Vodyanitsa's HP kit and skill timing", () => {
    expect(charTalentTables.Vodyanitsa.s1_id).toBe(11401);
    expect(charTalentTables.Vodyanitsa.s2_id).toBe(11402);
    expect(charTalentTables.Vodyanitsa.s3_id).toBe(11405);
    expect(charTalentTables.Vodyanitsa.s2.p2).toEqual([16]);
    expect(charTalentTables.Vodyanitsa.s2.p3).toEqual([3]);
    expect(charTalentTables.Vodyanitsa.s2.p7).toEqual([1.5]);
    expect(charTalentTables.Vodyanitsa.s3.p2[0]).toBe(48);
    expect(charTalentTables.Vodyanitsa.s3.p3).toEqual([15]);
    expect(charTalentTables.Vodyanitsa.s3.p4).toEqual([60]);

    const hpAscension = Vodyanitsa.statTable.find((table) => table.getName() === "hp_percent");
    expect(hpAscension.getValue(90, 6)).toBeCloseTo(28.8, 5);
});

test("Microphone hits, healing, RES shred, and Burst resonance use source values", () => {
    const damageData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_hydro: 0,
        char_skill_elemental: 10,
        char_skill_burst: 1,
    }, {
        hp_base: 50000,
    });

    const initial = getFeature("skill.vodyanitsa_overture_initial_dmg")
        .getResult(damageData)["skill.vodyanitsa_overture_initial_dmg"];
    const microphone = getFeature("skill.vodyanitsa_microphone_dmg")
        .getResult(damageData)["skill.vodyanitsa_microphone_dmg"];
    const heal = getFeature("skill.vodyanitsa_microphone_heal")
        .getResult(damageData)["skill.vodyanitsa_microphone_heal"];

    expect(initial.normal).toBeCloseTo(50000 * 0.058896 * 0.5, 5);
    expect(microphone.normal).toBeCloseTo(initial.normal, 5);
    expect(heal.normal).toBeCloseTo(50000 * 0.0504 + 593.2278, 5);

    const skillState = getCondition("vodyanitsa_microphone_summons");
    const shred = skillState.getData({
        char_skill_elemental: 10,
        vodyanitsa_microphone_summons: true,
    }).stats;
    expect(shred.get("enemy_res_hydro")).toBe(-26);
    expect(shred.get("enemy_res_cryo")).toBe(-26);

    const burst = getFeature("burst.vodyanitsa_aria_dmg");
    const withoutMicrophone = burst.getResult(damageData)["burst.vodyanitsa_aria_dmg"];
    const withMicrophone = burst.getResult(new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_hydro: 0,
        char_skill_burst: 1,
        vodyanitsa_microphone_summons: true,
    }, {
        hp_base: 50000,
    }))["burst.vodyanitsa_aria_dmg"];

    expect(withoutMicrophone.normal).toBeCloseTo(50000 * 0.456768 * 0.5, 5);
    expect(withMicrophone.normal - withoutMicrophone.normal).toBeCloseTo(50000 * 0.48 * 0.5, 5);
});

test("A1 requires the Microphone state and applies the 6-second Anemo shred window", () => {
    const mutant = getCondition("vodyanitsa_mutant_anemogranum");

    expect(mutant.getData({
        char_ascension: 1,
        vodyanitsa_mutant_anemogranum: true,
    }).stats.get("enemy_res_anemo")).toBe(0);
    expect(mutant.getData({
        char_ascension: 1,
        vodyanitsa_microphone_summons: true,
        vodyanitsa_mutant_anemogranum: true,
    }).stats.get("enemy_res_anemo")).toBe(-30);
});

test("A4 Solo switches from capped Hydro/Cryo flat damage to Stellar Swirl flat damage", () => {
    const normal = getFeature("attack.normal_hit_1");
    const directData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_hydro: 0,
        char_skill_attack: 1,
        char_ascension: 4,
        vodyanitsa_microphone_summons: true,
        vodyanitsa_solo: 17,
    }, {
        atk_base: 1000,
        hp_base: 100000,
    });
    directData.multipliers = Vodyanitsa.getMultipliers();

    const direct = normal.getResult(directData)["attack.normal_hit_1"];
    const directBase = charTalentTables.Vodyanitsa.s1.p1[0] / 100 * 1000;
    expect(direct.normal).toBeCloseTo((directBase + 3500) * 0.5, 5);

    const staleSolo = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_hydro: 0,
        char_skill_attack: 1,
        char_ascension: 4,
        vodyanitsa_solo: 17,
    }, {
        atk_base: 1000,
        hp_base: 100000,
    });
    staleSolo.multipliers = Vodyanitsa.getMultipliers();
    expect(normal.getResult(staleSolo)["attack.normal_hit_1"].normal)
        .toBeCloseTo(directBase * 0.5, 5);

    const stellarFeature = new FeatureDamageStellarSwirl({
        category: 'reaction',
        name: 'vodyanitsa_a4_test',
        element: 'anemo',
        tags: ['stellarswirl_immediate'],
    });
    const stellarData = new BuildData({
        enemy_res_anemo: 10,
        char_ascension: 4,
        vodyanitsa_microphone_summons: true,
        vodyanitsa_mutant_anemogranum: true,
        vodyanitsa_solo: 17,
    }, {
        hp_base: 100000,
        crit_rate_base: 1,
        crit_dmg_base: 0.5,
        dmg_stellarswirl_special: 0.25,
    });
    stellarData.multipliers = Vodyanitsa.getMultipliers();

    const stellar = stellarFeature.getResult(stellarData)["reaction.vodyanitsa_a4_test"];
    const stellarBase = stellarFeature.getResult(new BuildData({
        enemy_res_anemo: 10,
    }, {
        crit_rate_base: 1,
        crit_dmg_base: 0.5,
        dmg_stellarswirl_special: 0.25,
    }))["reaction.vodyanitsa_a4_test"];
    const stellarFlatAfterResAndElevation = 6500 * 0.9 * 1.25;
    expect(stellar.normal - stellarBase.normal).toBeCloseTo(stellarFlatAfterResAndElevation, 5);
    expect(stellar.crit - stellarBase.crit).toBeCloseTo(stellarFlatAfterResAndElevation * 1.5, 5);

    const directAfterMutantData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_hydro: 0,
        char_skill_attack: 1,
        char_ascension: 4,
        vodyanitsa_microphone_summons: true,
        vodyanitsa_mutant_anemogranum: true,
        vodyanitsa_solo: 17,
    }, {
        atk_base: 1000,
        hp_base: 100000,
    });
    directAfterMutantData.multipliers = Vodyanitsa.getMultipliers();
    const directAfterMutant = normal.getResult(directAfterMutantData)["attack.normal_hit_1"];
    expect(directAfterMutant.normal).toBeCloseTo(directBase * 0.5, 5);
});

test("party Concerto uses Vodyanitsa holder HP and switches to Stellar mode", () => {
    const normal = getFeature("attack.normal_hit_1");
    const directData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_hydro: 0,
        char_skill_attack: 1,
        "party.vodyanitsa_microphone_summons": true,
        "party.vodyanitsa_concerto": 10,
    }, {
        vodyanitsa_hp_total: 100000,
    });
    directData.multipliers = Vodyanitsa.getPartyMultipliers();
    expect(normal.getResult(directData)["attack.normal_hit_1"].normal).toBeCloseTo(1750, 5);

    const stellarFeature = new FeatureDamageStellarSwirl({
        category: 'reaction',
        name: 'vodyanitsa_party_a4_test',
        element: 'anemo',
        tags: ['stellarswirl_immediate'],
    });
    const stellarData = new BuildData({
        enemy_res_anemo: 0,
        "party.vodyanitsa_microphone_summons": true,
        "party.vodyanitsa_mutant_anemogranum": true,
        "party.vodyanitsa_concerto": 10,
    }, {
        vodyanitsa_hp_total: 100000,
    });
    stellarData.multipliers = Vodyanitsa.getPartyMultipliers();
    const stellar = stellarFeature.getResult(stellarData)["reaction.vodyanitsa_party_a4_test"];
    const stellarBase = stellarFeature.getResult(new BuildData({
        enemy_res_anemo: 0,
    }, {}))["reaction.vodyanitsa_party_a4_test"];
    expect(stellar.normal - stellarBase.normal).toBeCloseTo(6500, 5);

    expect(getCondition("vodyanitsa_solo").getMaxStacks({})).toBe(17);
    expect(getCondition("party.vodyanitsa_concerto", true).getMaxStacks({})).toBe(10);
});

test("C1 derives flat ATK from Vodyanitsa HP for self and party", () => {
    const local = new BuildData({
        char_constellation: 1,
        vodyanitsa_c1_healing: true,
    }, {
        hp_base: 50000,
    });
    local.postEffects = Vodyanitsa.getPostEffects();
    local.applyPostEffects();
    expect(local.stats.get("atk")).toBeCloseTo(350, 5);

    const party = new BuildData({
        "party.vodyanitsa_c1_healing": true,
    }, {
        vodyanitsa_hp_total: 50000,
    });
    party.postEffects = Vodyanitsa.getPartyPostEffects();
    party.applyPostEffects();
    expect(party.stats.get("atk")).toBeCloseTo(350, 5);
});

test("C2 selects Hydro/Cryo CRIT DMG or additive Stellar Swirl DMG", () => {
    const stale = new BuildData({
        vodyanitsa_c2_microphone_hit: true,
    }, {});
    applyConditions(stale, Vodyanitsa.constellation.getConditions(2));
    expect(stale.stats.get("crit_dmg_hydro")).toBe(0);
    expect(stale.stats.get("dmg_stellarswirl")).toBe(0);

    const normal = new BuildData({
        vodyanitsa_microphone_summons: true,
        vodyanitsa_c2_microphone_hit: true,
    }, {});
    applyConditions(normal, Vodyanitsa.constellation.getConditions(2));
    expect(normal.stats.get("crit_dmg_hydro")).toBe(50);
    expect(normal.stats.get("crit_dmg_cryo")).toBe(50);
    expect(normal.stats.get("dmg_stellarswirl")).toBe(0);

    const mutant = new BuildData({
        vodyanitsa_microphone_summons: true,
        vodyanitsa_mutant_anemogranum: true,
        vodyanitsa_c2_microphone_hit: true,
    }, {});
    applyConditions(mutant, Vodyanitsa.constellation.getConditions(2));
    expect(mutant.stats.get("crit_dmg_hydro")).toBe(0);
    expect(mutant.stats.get("crit_dmg_cryo")).toBe(0);
    expect(mutant.stats.get("dmg_stellarswirl")).toBe(60);

    const party = new BuildData({
        "party.vodyanitsa_microphone_summons": true,
        "party.vodyanitsa_mutant_anemogranum": true,
        "party.vodyanitsa_c2_microphone_hit": true,
    }, {});
    applyConditions(party, Vodyanitsa.getPartyConditions());
    expect(party.stats.get("dmg_stellarswirl")).toBe(60);
    expect(party.stats.get("crit_dmg_hydro")).toBe(0);
});

test("C4 models its low-HP healing branch and three independent HP stacks", () => {
    expect(getCondition("vodyanitsa_c4_target_below_40").params.description)
        .toBe("talent_descr.vodyanitsa_c4_1");
    expect(getCondition("vodyanitsa_c4_hp_stacks").params.description)
        .toBe("talent_descr.vodyanitsa_c4_2");
    const data = new BuildData({
        vodyanitsa_c4_target_below_40: true,
        vodyanitsa_c4_hp_stacks: 4,
    }, {});
    applyConditions(data, Vodyanitsa.constellation.getConditions(4));

    expect(data.stats.get("healing")).toBe(50);
    expect(data.stats.get("hp_percent")).toBe(60);
    expect(data.settings.vodyanitsa_c4_hp_stacks).toBe(3);
});

test("C6 adds party Hydro/Cryo DMG and Stellar Swirl elevation while Microphone is active", () => {
    const local = new BuildData({
        vodyanitsa_microphone_summons: true,
    }, {});
    applyConditions(local, Vodyanitsa.constellation.getConditions(6));
    expect(local.stats.get("dmg_hydro")).toBe(50);
    expect(local.stats.get("dmg_cryo")).toBe(50);
    expect(local.stats.get("dmg_stellarswirl_special")).toBe(25);

    const party = new BuildData({
        "party.vodyanitsa_microphone_summons": true,
        "party.vodyanitsa_c6_microphone_summons": true,
    }, {});
    applyConditions(party, Vodyanitsa.getPartyConditions());
    expect(party.stats.get("dmg_hydro")).toBe(50);
    expect(party.stats.get("dmg_cryo")).toBe(50);
    expect(party.stats.get("dmg_stellarswirl_special")).toBe(25);

    const inactive = getCondition("party.vodyanitsa_c6_microphone_summons", true)
        .getData({"party.vodyanitsa_c6_microphone_summons": true}).stats;
    expect(inactive.get("dmg_hydro")).toBe(0);
});

test("Vodyanitsa uses only its reserved 860-889 Rotation block", () => {
    const rows = Rotation.listNames()
        .filter((name) => name.includes("vodyanitsa_"))
        .map((name) => [name, Rotation.getByName(name)]);

    expect(rows).toEqual([
        ["skill.vodyanitsa_overture_initial_dmg", 860],
        ["skill.vodyanitsa_microphone_dmg", 861],
        ["skill.vodyanitsa_microphone_heal", 862],
        ["burst.vodyanitsa_aria_dmg", 863],
    ]);
    expect(rows.every(([, id]) => id >= 860 && id <= 889)).toBe(true);
    expect(rows.some(([, id]) => id >= 772 && id <= 859)).toBe(false);
});

test("Vodyanitsa localization is generated with only calculator text manual", () => {
    const manualStrings = fs.readFileSync(
        path.join(__dirname, "../data/strings/7.1/vodyanitsa.csv"),
        "utf8",
    );
    const generatedNames = fs.readFileSync(
        path.join(__dirname, "../data/strings/generated/char_names.csv"),
        "utf8",
    );
    const generatedSkills = fs.readFileSync(
        path.join(__dirname, "../data/strings/generated/char_skills.csv"),
        "utf8",
    );
    const generatedTalents = fs.readFileSync(
        path.join(__dirname, "../data/strings/generated/char_talents.csv"),
        "utf8",
    );
    expect(generatedNames).toContain("char_name;vodyanitsa;Водяница;Vodyanitsa");
    expect(generatedSkills).toContain("talent_name;vodyanitsa_waltz_of_the_water_imp");
    expect(generatedSkills).toContain("talent_name;n11400001");
    expect(generatedSkills).toContain("talent_descr;n11400002");
    expect(generatedTalents).toContain("talent_name;vodyanitsa_ascension_talent_1");
    expect(generatedTalents).toContain("talent_name;vodyanitsa_c1");
    expect(generatedTalents).toContain("talent_descr;vodyanitsa_c4_1");
    expect(generatedTalents).toContain("talent_descr;vodyanitsa_c4_2");
    expect(generatedTalents).not.toContain("talent_descr;vodyanitsa_c4;");
    expect(generatedTalents).toContain("talent_descr;vodyanitsa_c6");

    const manualNonFeatureKeys = manualStrings.split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map((line) => line.split(";").slice(0, 2).join(";"))
        .filter((key) => !key.startsWith("feature_"));
    expect(manualNonFeatureKeys).toEqual([
        "talent_name;vodyanitsa_microphone_summons",
        "talent_descr;vodyanitsa_microphone_summons",
    ]);
    expect(manualStrings).toContain("feature_skill;vodyanitsa_microphone_heal");
    expect(manualStrings).toContain("feature_burst;vodyanitsa_aria_dmg");

});
