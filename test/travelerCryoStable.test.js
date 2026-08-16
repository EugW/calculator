import fs from "fs";
import path from "path";
import { BuildData } from "../src/js/classes/Build/Data";
import { CalcObjectCharacter } from "../src/js/classes/CalcObject/Character";
import { FeatureDamageStellarConduct } from "../src/js/classes/Feature2/Damage/StellarConduct";
import { FeatureDamageStellarSwirl } from "../src/js/classes/Feature2/Damage/StellarSwirl";
import { TravelerCryo } from "../src/js/db/Char/TravelerCryo";
import { DB } from "../src/js/db/DB";
import { Rotation } from "../src/js/db/Features/Rotation";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";

function applyConditions(data, conditions) {
    for (const condition of conditions) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
}

function getFeature(name) {
    return TravelerCryo.getFeatures().find((feature) => feature.getName() === name);
}

function getCondition(name, party = false) {
    const conditions = party ? TravelerCryo.getPartyConditions() : TravelerCryo.getAllConditions();
    return conditions.find((condition) => condition.getName() === name);
}

function damage(name, settings = {}, stats = {}) {
    const feature = getFeature(name);
    feature.compiled = undefined;

    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_cryo: 0,
        char_skill_attack: 1,
        char_skill_elemental: 1,
        char_skill_burst: 1,
        ...settings,
    }, {
        atk_base: 1000,
        ...stats,
    });
    data.multipliers = TravelerCryo.getMultipliers();
    data.postEffects = TravelerCryo.getPostEffects();

    return feature.getResult(data)[name];
}

test("Cryo Traveler is stable serialize 124 and resolves both Traveler game IDs by Cryo depot", () => {
    expect(DB.Chars.get("TravelerCryo")).toBe(TravelerCryo);
    expect(DB.Chars.getById(124)).toBe(TravelerCryo);
    expect(DB.Chars.getByGameId(10000005, 505)).toBe(TravelerCryo);
    expect(DB.Chars.getByGameId(10000007, 705)).toBe(TravelerCryo);
    expect(TravelerCryo.getId()).toBe(124);
    expect(TravelerCryo.getGameId()).toEqual([10000005, 10000007]);
    expect(TravelerCryo.depotIds).toEqual([505, 705]);
});

test("Frostpierce Star exposes the generated skill and crystal rows and C4 changes 12s to 15s", () => {
    const skill = getFeature("skill.traveler_cryo_skill_dmg");
    const crystal = getFeature("skill.traveler_cryo_ice_crystal_dmg");
    expect(skill.multipliers[0].values.getValue(1)).toBe(charTalentTables.TravelerCryo.s2.p1[0]);
    expect(crystal.multipliers[0].values.getValue(1)).toBe(charTalentTables.TravelerCryo.s2.p2[0]);
    expect(crystal.isActive(new BuildData({}, {}))).toBe(false);
    expect(crystal.isActive(new BuildData({traveler_cryo_frostpierce_star: true}, {}))).toBe(true);

    const duration = getFeature("skill.traveler_cryo_frostpierce_star_duration");
    duration.compiled = undefined;
    expect(duration.getResult(new BuildData({char_skill_elemental: 1}, {}))[
        "skill.traveler_cryo_frostpierce_star_duration"
    ].normal).toBe(12);
    duration.compiled = undefined;
    expect(duration.getResult(new BuildData({char_constellation: 4, char_skill_elemental: 1}, {}))[
        "skill.traveler_cryo_frostpierce_star_duration"
    ].normal).toBe(15);
});

test("Radiance is exclusive with Conduct priority", () => {
    const ordinary = getFeature("burst.traveler_cryo_ice_javelin");
    const conduct = getFeature("burst.traveler_cryo_ice_javelin_stellarconduct");
    const swirl = getFeature("burst.traveler_cryo_ice_javelin_stellarswirl");

    const normalData = new BuildData({}, {});
    expect(ordinary.isActive(normalData)).toBe(true);
    expect(conduct.isActive(normalData)).toBe(false);
    expect(swirl.isActive(normalData)).toBe(false);

    const swirlData = new BuildData({traveler_cryo_radiance_stellarswirl: true}, {});
    expect(ordinary.isActive(swirlData)).toBe(false);
    expect(conduct.isActive(swirlData)).toBe(false);
    expect(swirl.isActive(swirlData)).toBe(true);

    const priorityData = new BuildData({
        traveler_cryo_radiance_stellarconduct: true,
        traveler_cryo_radiance_stellarswirl: true,
    }, {});
    expect(conduct.isActive(priorityData)).toBe(true);
    expect(swirl.isActive(priorityData)).toBe(false);

});

test.each([
    ["burst.traveler_cryo_ice_javelin", "burst.traveler_cryo_frostbound_javelin_total", {}],
    [
        "burst.traveler_cryo_ice_javelin_stellarconduct",
        "burst.traveler_cryo_frostbound_javelin_stellarconduct_total",
        {traveler_cryo_radiance_stellarconduct: true},
    ],
    [
        "burst.traveler_cryo_ice_javelin_stellarswirl",
        "burst.traveler_cryo_frostbound_javelin_stellarswirl_total",
        {traveler_cryo_radiance_stellarswirl: true},
    ],
])("%s consumes Frostglow and its total gains two strikes only at 8", (singleName, totalName, mode) => {
    for (const [stacks, strikeCount] of [[0, 3], [7, 3], [8, 5], [99, 5]]) {
        const settings = {...mode, traveler_cryo_frostglow: stacks};
        const single = damage(singleName, settings).normal;
        const total = damage(totalName, settings).normal;
        expect(total).toBeCloseTo(single * strikeCount, 5);
    }
});

test("Illusory Frostmirror and Lucent Ice derive from total ATK and cap at 7% and 160 EM", () => {
    const capped = new BuildData({char_ascension: 4}, {atk_base: 2000});
    capped.postEffects = TravelerCryo.getPostEffects();
    capped.applyPostEffects();
    expect(capped.stats.get("stellarglimmer_multi")).toBeCloseTo(0.07, 6);
    expect(capped.stats.get("mastery")).toBe(160);

    const scaled = new BuildData({char_ascension: 4}, {atk_base: 1000});
    scaled.postEffects = TravelerCryo.getPostEffects();
    scaled.applyPostEffects();
    expect(scaled.stats.get("stellarglimmer_multi")).toBeCloseTo(0.035, 6);
    expect(scaled.stats.get("mastery")).toBe(80);

    const party = new BuildData({traveler_cryo_atk_total: 2000}, {});
    applyConditions(party, TravelerCryo.getPartyConditions());
    party.postEffects = TravelerCryo.getPartyPostEffects();
    party.applyPostEffects();
    expect(party.stats.get("stellarglimmer_multi")).toBeCloseTo(0.07, 6);
});

test("Ever-Keen Frost infuses and adds 80% ATK to ordinary attacks but excludes Freezing Ice", () => {
    const activeSettings = {
        char_ascension: 1,
        polestar_field: true,
        traveler_cryo_frostpierce_star: true,
        traveler_cryo_radiance_stellarconduct: true,
    };
    const data = new BuildData(activeSettings, {});
    applyConditions(data, TravelerCryo.getAllConditions());
    expect(data.settings.attack_infusion).toBe("cryo");

    const a1 = TravelerCryo.getMultipliers()[0];
    expect(a1.values.getValue(1)).toBe(80);
    expect(a1.isActive(data)).toBe(true);
    expect(a1.target.isMatchFeature(getFeature("attack.normal_hit_1"), data)).toBe(true);
    expect(a1.target.isMatchFeature(getFeature("attack.traveler_cryo_freezing_ice"), data)).toBe(false);

    const baseline = damage("attack.normal_hit_1", {});
    const enhanced = damage("attack.normal_hit_1", activeSettings);
    expect(enhanced.normal - baseline.normal).toBeCloseTo(400, 5);
});

test("Foreign Permafrost requires 3 Icepoint and swaps the whole charged attack by Radiance mode", () => {
    const ordinary = getFeature("attack.traveler_cryo_freezing_ice");
    const conduct = getFeature("attack.traveler_cryo_freezing_ice_stellarconduct");
    const swirl = getFeature("attack.traveler_cryo_freezing_ice_stellarswirl");

    expect(ordinary.isActive(new BuildData({traveler_cryo_icepoint: 2}, {}))).toBe(false);
    expect(ordinary.isActive(new BuildData({traveler_cryo_icepoint: 3}, {}))).toBe(true);
    expect(ordinary.multipliers.map(item => item.values.getValue(1))).toEqual([
        charTalentTables.TravelerCryo.s1.p6[0],
        charTalentTables.TravelerCryo.s1.p7[0],
        140,
    ]);

    const conductData = new BuildData({
        traveler_cryo_icepoint: 3,
        traveler_cryo_radiance_stellarconduct: true,
    }, {});
    expect(ordinary.isActive(conductData)).toBe(false);
    expect(conduct.isActive(conductData)).toBe(true);
    expect(swirl.isActive(conductData)).toBe(false);

    const frostglow = getFeature("other.traveler_cryo_freezing_ice_frostglow");
    expect(frostglow.getResult(conductData)["other.traveler_cryo_freezing_ice_frostglow"].normal).toBe(2);
    const cooldown = getFeature("other.traveler_cryo_freezing_ice_cooldown");
    expect(cooldown.getResult(conductData)["other.traveler_cryo_freezing_ice_cooldown"].normal).toBe(15);
});

test("C1/C2/C6 expose energy, active-party EM, and other-party umbrella Glimmer DMG", () => {
    const c1 = getFeature("other.traveler_cryo_somber_freeze_energy");
    const c1Data = new BuildData({
        char_constellation: 1,
        traveler_cryo_radiance_stellarswirl: true,
    }, {});
    expect(c1.getResult(c1Data)["other.traveler_cryo_somber_freeze_energy"].normal).toBe(5);

    for (const [level, mastery] of [[1, 60], [2, 120]]) {
        const self = new BuildData({
            char_constellation: 2,
            traveler_cryo_frostfall_reverberation: level,
        }, {});
        applyConditions(self, TravelerCryo.getAllConditions());
        expect(self.stats.get("mastery")).toBe(mastery);

        const party = new BuildData({"party.traveler_cryo_frostfall_reverberation": level}, {});
        applyConditions(party, TravelerCryo.getPartyConditions());
        expect(party.stats.get("mastery")).toBe(mastery);
    }

    const c6 = new BuildData({"party.traveler_cryo_brumal_grimfrost": 8}, {});
    applyConditions(c6, TravelerCryo.getPartyConditions());
    expect(c6.stats.get("dmg_stellarglimmer")).toBe(40);
    expect(c6.stats.get("dmg_stellarconduct")).toBe(0);
    expect(c6.stats.get("dmg_stellarswirl")).toBe(0);
});

test("prior resonance enhancements serialize as one seven-bit multi-select and apply exact stats", () => {
    const resonance = getCondition("traveler_cryo_resonated_elements");
    expect(resonance.getId()).toBe(6);
    expect(resonance.getSelectedId({
        traveler_cryo_resonated_elements: "anemo;electro;dendro;cryo",
    })).toBe(1 + 4 + 8 + 64);
    expect(resonance.getValueById(1 + 4 + 8 + 64)).toBe("anemo;electro;dendro;cryo");

    const data = new BuildData({
        traveler_cryo_resonated_elements: "anemo;geo;electro;dendro;hydro;pyro;cryo",
    }, {});
    applyConditions(data, TravelerCryo.getAllConditions());
    expect(data.stats.get("crit_rate")).toBe(10);
    expect(data.stats.get("def_percent")).toBe(20);
    expect(data.stats.get("recharge")).toBe(20);
    expect(data.stats.get("mastery")).toBe(60);
    expect(data.stats.get("hp_percent")).toBe(20);
    expect(data.stats.get("atk_percent")).toBe(20);
    expect(data.stats.get("crit_dmg")).toBe(20);
});

test("Cryo Traveler condition IDs are immutable and unique across self and party scopes", () => {
    const self = TravelerCryo.getAllConditions().filter(condition => condition.getId());
    expect(self.map(condition => [condition.getName(), condition.getId()])).toEqual([
        ["traveler_cryo_radiance_stellarconduct", 1],
        ["traveler_cryo_radiance_stellarswirl", 2],
        ["traveler_cryo_frostpierce_star", 3],
        ["traveler_cryo_frostglow", 4],
        ["traveler_cryo_icepoint", 5],
        ["traveler_cryo_resonated_elements", 6],
        ["traveler_swordfighting_techniques", 9],
        ["traveler_special_training", 10],
        ["traveler_cryo_frostfall_reverberation", 8],
    ]);
    expect(new Set(self.map(condition => condition.getId())).size).toBe(self.length);

    const party = TravelerCryo.getPartyConditions().filter(condition => condition.getId());
    expect(party.map(condition => [condition.getName(), condition.getId()])).toEqual([
        ["traveler_cryo_atk_total", 1],
        ["party.traveler_cryo_frostfall_reverberation", 2],
        ["party.traveler_cryo_brumal_grimfrost", 3],
    ]);
});

test("Cryo Traveler settings round-trip through character serialization", () => {
    const previousDb = global.DB;
    global.DB = DB;
    try {
        const calc = new CalcObjectCharacter();
        calc.set(TravelerCryo);
        calc.setLevels({level: 90, ascension: 6, constellation: 6});
        calc.setSkills({attack: 9, elemental: 10, burst: 10});

        const saved = calc.serialize({
            polestar_field: true,
            traveler_cryo_radiance_stellarconduct: true,
            traveler_cryo_frostpierce_star: true,
            traveler_cryo_frostglow: 8,
            traveler_cryo_icepoint: 3,
            traveler_cryo_resonated_elements: "anemo;electro;dendro;cryo",
            traveler_cryo_frostfall_reverberation: 2,
            traveler_swordfighting_techniques: true,
            traveler_special_training: true,
        });
        expect(saved[0]).toBe(124);

        const restored = CalcObjectCharacter.deserialize([...saved]);
        expect(restored.get()).toBe(TravelerCryo);
        expect(restored.getSettings()).toMatchObject({
            char_id: 124,
            traveler_cryo_radiance_stellarconduct: true,
            traveler_cryo_frostpierce_star: true,
            traveler_cryo_frostglow: 8,
            traveler_cryo_icepoint: 3,
            traveler_cryo_resonated_elements: "anemo;electro;dendro;cryo",
            traveler_cryo_frostfall_reverberation: 2,
            traveler_swordfighting_techniques: true,
            traveler_special_training: true,
        });
    } finally {
        global.DB = previousDb;
    }
});

test("Cryo Traveler uses only reserved Rotation IDs 800-829", () => {
    const rows = Rotation.listNames()
        .filter(name => name.includes("traveler_cryo_"))
        .map(name => [name, Rotation.getByName(name)]);

    expect(rows).toEqual([
        ["skill.traveler_cryo_skill_dmg", 800],
        ["skill.traveler_cryo_ice_crystal_dmg", 801],
        ["attack.traveler_cryo_freezing_ice", 802],
        ["attack.traveler_cryo_freezing_ice_stellarconduct", 803],
        ["attack.traveler_cryo_freezing_ice_stellarswirl", 804],
        ["burst.traveler_cryo_ice_javelin", 805],
        ["burst.traveler_cryo_frostbound_javelin_total", 806],
        ["burst.traveler_cryo_ice_javelin_stellarconduct", 807],
        ["burst.traveler_cryo_frostbound_javelin_stellarconduct_total", 808],
        ["burst.traveler_cryo_ice_javelin_stellarswirl", 809],
        ["burst.traveler_cryo_frostbound_javelin_stellarswirl_total", 810],
    ]);
    expect(rows.every(([, id]) => id >= 800 && id <= 829)).toBe(true);
});

test("Cryo Traveler imports its name and Foreign Permafrost without manual aliases", () => {
    const manual = fs.readFileSync(
        path.join(__dirname, "../data/strings/7.0/traveler_cryo.csv"),
        "utf8",
    );
    const generatedNames = fs.readFileSync(
        path.join(__dirname, "../data/strings/generated/char_names.csv"),
        "utf8",
    );
    const generatedTalents = fs.readFileSync(
        path.join(__dirname, "../data/strings/generated/char_talents.csv"),
        "utf8",
    );

    for (const key of [
        "feature_skill;traveler_cryo_skill_dmg",
        "feature_skill;traveler_cryo_ice_crystal_dmg",
        "feature_attack;traveler_cryo_freezing_ice_stellarconduct",
        "feature_attack;traveler_cryo_freezing_ice_stellarswirl",
        "feature_burst;traveler_cryo_frostbound_javelin_stellarconduct_total",
        "feature_burst;traveler_cryo_frostbound_javelin_stellarswirl_total",
        "feature_other;traveler_cryo_somber_freeze_energy",
        "talent_name;traveler_cryo_icepoint",
    ]) {
        expect(manual).toContain(key);
    }

    expect(manual).not.toContain("char_name;traveler_cryo");
    expect(manual).not.toContain("talent_descr;traveler_foreign_permafrost_clean");
    expect(generatedNames).toContain("char_name;traveler_cryo;Путешественник;Traveler");
    expect(generatedTalents).toContain("talent_descr;traveler_illusory_frostmirror_1");
    expect(generatedTalents).toContain("talent_descr;traveler_illusory_frostmirror_2");
    expect(generatedTalents).toContain("talent_descr;traveler_illusory_frostmirror_3");
    expect(generatedTalents).toContain("talent_descr;traveler_foreign_permafrost_1");
    expect(generatedTalents).toContain("talent_descr;traveler_foreign_permafrost_2");
    expect(generatedTalents).not.toContain("talent_descr;traveler_illusory_frostmirror;");
    expect(generatedTalents).not.toContain("talent_descr;traveler_foreign_permafrost;");
    expect(getCondition("traveler_cryo_radiance_stellarconduct").params.description)
        .toBe("talent_descr.traveler_illusory_frostmirror_1");
    expect(getCondition("traveler_cryo_radiance_stellarswirl").params.description)
        .toBe("talent_descr.traveler_illusory_frostmirror_2");
    expect(TravelerCryo.getAllConditions().find((condition) =>
        condition.params.description === "talent_descr.traveler_illusory_frostmirror_3"
    ).getType()).toBe("static");
    expect(getCondition("traveler_cryo_icepoint").params.description)
        .toBe("talent_descr.traveler_foreign_permafrost_2");
    expect(generatedTalents).toContain("skill{n11500004:Radiance: Stellar Glimmer}");
    expect(generatedTalents).not.toContain(
        "skill{n11500004:skill{Radiance: Stellar Glimmer}}",
    );
});

test("direct Burst and Freezing Ice rows use the matching Glimmer damage classes", () => {
    for (const name of [
        "attack.traveler_cryo_freezing_ice_stellarconduct",
        "burst.traveler_cryo_ice_javelin_stellarconduct",
        "burst.traveler_cryo_frostbound_javelin_stellarconduct_total",
    ]) {
        expect(getFeature(name)).toBeInstanceOf(FeatureDamageStellarConduct);
    }
    for (const name of [
        "attack.traveler_cryo_freezing_ice_stellarswirl",
        "burst.traveler_cryo_ice_javelin_stellarswirl",
        "burst.traveler_cryo_frostbound_javelin_stellarswirl_total",
    ]) {
        expect(getFeature(name)).toBeInstanceOf(FeatureDamageStellarSwirl);
    }
});
