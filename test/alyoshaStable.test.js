import fs from "fs";
import path from "path";
import { BuildData } from "../src/js/classes/Build/Data";
import { Alyosha } from "../src/js/db/Char/Alyosha";
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
    return Alyosha.getFeatures().find((feature) => feature.getName() === name);
}

function getCondition(name, party = false) {
    const conditions = party ? Alyosha.getPartyConditions() : Alyosha.getAllConditions();
    return conditions.find((condition) => condition.getName() === name);
}

function damageResult(name, talentLevel = 1) {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_electro: 0,
        char_skill_elemental: talentLevel,
        char_skill_burst: talentLevel,
    }, {
        atk_base: 1000,
    });

    return getFeature(name).getResult(data)[name];
}

test("Alyosha is registered as stable serialize 125 and game character 10000148", () => {
    expect(DB.Chars.get("Alyosha")).toBe(Alyosha);
    expect(DB.Chars.getById(125)).toBe(Alyosha);
    expect(DB.Chars.getByGameId(10000148)).toBe(Alyosha);
    expect(DB.Chars.getKeys()).toContain("Alyosha");
    expect(Alyosha.getId()).toBe(125);
    expect(Alyosha.getGameId()).toEqual([10000148]);
});

test("Alyosha tap, hold, Fulgurite field, and Tugarin use the stable talent rows", () => {
    const cases = [
        ["skill.alyosha_thunderbolt_strike_press", charTalentTables.Alyosha.s2.p1[0]],
        ["skill.alyosha_thunderbolt_strike_hold", charTalentTables.Alyosha.s2.p2[0]],
        ["burst.alyosha_fulgurite_hunting_field", charTalentTables.Alyosha.s3.p1[0]],
        ["burst.alyosha_tugarin", charTalentTables.Alyosha.s3.p2[0]],
    ];

    for (const [name, multiplier] of cases) {
        expect(damageResult(name).normal).toBeCloseTo(multiplier / 100 * 1000 * 0.5, 5);
    }
});

test("Hunter's Precision uses skill p5, is party-wide, and only reaches two stacks at C6", () => {
    const c0 = new BuildData({
        char_constellation: 0,
        char_skill_elemental: 1,
        alyosha_hunters_precision: 2,
    }, {});
    applyConditions(c0, Alyosha.getConditions());

    expect(c0.settings.alyosha_hunters_precision).toBe(1);
    expect(c0.stats.get("atk_percent")).toBeCloseTo(charTalentTables.Alyosha.s2.p5[0], 5);
    expect(c0.stats.get("mastery")).toBe(0);

    const c3 = new BuildData({
        char_constellation: 3,
        char_skill_elemental: 10,
        alyosha_hunters_precision: 1,
    }, {});
    applyConditions(c3, Alyosha.getConditions());
    expect(c3.settings.char_skill_elemental_bonus).toBe(3);
    expect(c3.stats.get("atk_percent")).toBeCloseTo(charTalentTables.Alyosha.s2.p5[12], 5);

    const c6 = new BuildData({
        char_constellation: 6,
        char_skill_elemental: 1,
        alyosha_hunters_precision: 2,
    }, {});
    applyConditions(c6, Alyosha.getConditions());

    expect(c6.stats.get("atk_percent")).toBeCloseTo(charTalentTables.Alyosha.s2.p5[3] * 2, 5);
    expect(c6.stats.get("mastery")).toBe(100);

    const party = new BuildData({
        alyosha_char_skill_elemental: 10,
        "party.alyosha_constellation_3": true,
        "party.alyosha_hunters_precision": 2,
        "party.alyosha_standard_reclaimed": true,
    }, {});
    applyConditions(party, Alyosha.getPartyConditions());

    expect(party.settings.alyosha_char_skill_elemental_bonus).toBe(3);
    expect(party.stats.get("atk_percent")).toBeCloseTo(charTalentTables.Alyosha.s2.p5[12] * 2, 5);
    expect(party.stats.get("mastery")).toBe(100);

    const c3Toggle = getCondition("party.alyosha_constellation_3", true);
    expect(c3Toggle.getId()).toBe(5);
    expect(c3Toggle.getInfo()).toEqual({constellation: 3});
});

test("Polestar Precision grants 20% Stellar-Conduct DMG for each Precision stack", () => {
    const oneStack = new BuildData({
        polestar_field: true,
        alyosha_hunters_precision: 1,
        alyosha_radiance_stellarconduct: true,
        char_skill_elemental: 1,
    }, {});
    applyConditions(oneStack, Alyosha.getConditions());

    expect(oneStack.settings.allowed_stellarconduct).toBe(1);
    expect(oneStack.stats.get("dmg_stellarconduct")).toBe(20);

    const twoStacks = new BuildData({
        char_constellation: 6,
        polestar_field: true,
        alyosha_hunters_precision: 2,
        alyosha_radiance_stellarconduct: true,
        char_skill_elemental: 1,
    }, {});
    applyConditions(twoStacks, Alyosha.getConditions());
    expect(twoStacks.stats.get("dmg_stellarconduct")).toBe(40);

    const noPrecision = new BuildData({
        polestar_field: true,
        alyosha_radiance_stellarconduct: true,
        char_skill_elemental: 1,
    }, {});
    applyConditions(noPrecision, Alyosha.getConditions());
    expect(noPrecision.stats.get("dmg_stellarconduct")).toBe(0);

    const noField = new BuildData({
        alyosha_hunters_precision: 1,
        alyosha_radiance_stellarconduct: true,
        char_skill_elemental: 1,
    }, {});
    applyConditions(noField, Alyosha.getConditions());
    expect(noField.settings.allowed_stellarconduct).toBeUndefined();
    expect(noField.stats.get("dmg_stellarconduct")).toBe(0);

    const partyOneStack = new BuildData({
        polestar_field: true,
        alyosha_char_skill_elemental: 1,
        "party.alyosha_hunters_precision": 1,
        "party.alyosha_radiance_stellarconduct": true,
    }, {});
    applyConditions(partyOneStack, Alyosha.getPartyConditions());
    expect(partyOneStack.stats.get("dmg_stellarconduct")).toBe(20);

    const partyTwoStacks = new BuildData({
        polestar_field: true,
        alyosha_char_skill_elemental: 1,
        "party.alyosha_hunters_precision": 2,
        "party.alyosha_radiance_stellarconduct": true,
        "party.alyosha_standard_reclaimed": true,
    }, {});
    applyConditions(partyTwoStacks, Alyosha.getPartyConditions());
    expect(partyTwoStacks.stats.get("dmg_stellarconduct")).toBe(40);
});

test("Suffer the Winter Wheat Will scales Skill and Burst from ER and caps both at 70%", () => {
    const scaled = new BuildData({char_ascension: 4}, {recharge: 1.5});
    scaled.postEffects = Alyosha.getPostEffects();
    scaled.applyPostEffects();

    expect(scaled.stats.get("dmg_skill")).toBeCloseTo(0.525, 5);
    expect(scaled.stats.get("dmg_burst")).toBeCloseTo(0.525, 5);

    const capped = new BuildData({char_ascension: 4}, {recharge: 3});
    capped.postEffects = Alyosha.getPostEffects();
    capped.applyPostEffects();

    expect(capped.stats.get("dmg_skill")).toBeCloseTo(0.7, 5);
    expect(capped.stats.get("dmg_burst")).toBeCloseTo(0.7, 5);

    const locked = new BuildData({char_ascension: 3}, {recharge: 3});
    locked.postEffects = Alyosha.getPostEffects();
    locked.applyPostEffects();
    expect(locked.stats.get("dmg_skill")).toBe(0);
    expect(locked.stats.get("dmg_burst")).toBe(0);
});

test("Tugarin healing and C1 energy expose their per-trigger stable values", () => {
    const a1Data = new BuildData({char_ascension: 1}, {atk_base: 1000});
    const a1 = getFeature("other.alyosha_tugarin_active_heal").getResult(a1Data);
    expect(a1["other.alyosha_tugarin_active_heal"].normal).toBeCloseTo(1200, 5);

    const c4Data = new BuildData({char_constellation: 4}, {atk_base: 1000});
    const c4 = getFeature("other.alyosha_tugarin_lowest_hp_heal").getResult(c4Data);
    expect(c4["other.alyosha_tugarin_lowest_hp_heal"].normal).toBeCloseTo(600, 5);

    const c1Data = new BuildData({char_constellation: 1}, {});
    const c1 = getFeature("other.alyosha_frostvale_energy").getResult(c1Data);
    expect(c1["other.alyosha_frostvale_energy"].normal).toBe(15);
});

test("Alyosha uses only the reserved 783-799 Rotation ID block", () => {
    const rows = Rotation.listNames()
        .filter((name) => name.includes("alyosha_"))
        .map((name) => [name, Rotation.getByName(name)]);

    expect(rows).toEqual([
        ["skill.alyosha_thunderbolt_strike_press", 783],
        ["skill.alyosha_thunderbolt_strike_hold", 784],
        ["burst.alyosha_fulgurite_hunting_field", 785],
        ["burst.alyosha_tugarin", 786],
    ]);
    expect(rows.every(([, id]) => id >= 783 && id <= 799)).toBe(true);
    expect(rows.some(([, id]) => id >= 772 && id <= 782)).toBe(false);
});

test("Alyosha imports Hunter's Mark while keeping calculator-only states manual", () => {
    const manual = fs.readFileSync(
        path.join(__dirname, "../data/strings/7.0/alyosha.csv"),
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

    for (const key of [
        "feature_skill;alyosha_thunderbolt_strike_press",
        "feature_skill;alyosha_thunderbolt_strike_hold",
        "feature_burst;alyosha_fulgurite_hunting_field",
        "feature_burst;alyosha_tugarin",
        "feature_other;alyosha_tugarin_active_heal",
        "feature_other;alyosha_tugarin_lowest_hp_heal",
        "feature_other;alyosha_frostvale_energy",
        "feature_other;alyosha_suffer_the_winter_wheat_will_bonus",
        "talent_descr;alyosha_hunters_precision",
    ]) {
        expect(manual).toContain(key);
    }
    expect(manual).not.toContain("talent_name;alyosha_hunters_mark");
    expect(manual).not.toContain("talent_descr;alyosha_hunters_mark");
    expect(generatedSkills).toContain("talent_name;n11480001;Метка охотника;Hunter's Mark");
    expect(generatedSkills).toContain("talent_descr;n11480001");

    expect(generatedTalents).toContain("talent_descr;alyosha_howl_from_afar");
    expect(generatedTalents).toContain("This effect does not activate existing skill{Hunter's Marks}.");

    const c2 = Alyosha.getAllConditions().find(
        (condition) => condition.params.description === "talent_descr.alyosha_howl_from_afar",
    );
    expect(c2).toBeDefined();
    expect(c2.getData({char_constellation: 2}).stats.get("text_duration")).toBe(6);
    expect(Alyosha.getAllConditions().some(
        (condition) => condition.params.description === "talent_descr.n11480001",
    )).toBe(true);
    expect(getCondition("alyosha_hunters_precision")).toBeDefined();
    expect(getCondition("party.alyosha_hunters_precision", true)).toBeDefined();
});
