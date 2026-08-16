import fs from "fs";
import path from "path";
import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureDamageStellarSwirl } from "../src/js/classes/Feature2/Damage/StellarSwirl";
import { Vesna } from "../src/js/db/Char/Vesna";
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

function localConditions(constellation = 0) {
    return Vesna.getConditions().concat(Vesna.constellation.getConditions(constellation));
}

function getFeature(name) {
    return Vesna.getFeatures().find((feature) => feature.getName() === name);
}

function getCondition(name, party = false) {
    const conditions = party ? Vesna.getPartyConditions() : Vesna.getAllConditions();
    return conditions.find((condition) => condition.getName() === name);
}

function getDamage(name, settings = {}, stats = {}) {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_anemo: 0,
        char_skill_attack: 1,
        char_skill_elemental: 1,
        char_skill_burst: 1,
        ...settings,
    }, {
        atk_base: 1000,
        ...stats,
    });
    return getFeature(name).getResult(data)[name];
}

test("Vesna is character 128 and is hidden by default", () => {
    expect(DB.Chars.get("Vesna")).toBe(Vesna);
    expect(DB.Chars.getById(128)).toBe(Vesna);
    expect(DB.Chars.getByGameId(10000143)).toBeUndefined();
    expect(DB.Chars.getKeys()).not.toContain("Vesna");
    expect(DB.Chars.getKeys(true)).toContain("Vesna");
    expect(Vesna.getId()).toBe(128);
    expect(Vesna.getGameId()).toEqual([10000143]);
    const ids = DB.Chars.getKeys(true).map((key) => DB.Chars.get(key).getId());
    expect(new Set(ids).size).toBe(ids.length);
});

test("generated tables preserve exact Skill and corrected Burst parameters", () => {
    expect(charTalentTables.Vesna.s1_id).toBe(11431);
    expect(charTalentTables.Vesna.s2_id).toBe(11432);
    expect(charTalentTables.Vesna.s3_id).toBe(11435);

    expect([
        charTalentTables.Vesna.s2.p1[0],
        charTalentTables.Vesna.s2.p2[0],
        charTalentTables.Vesna.s2.p3[0],
        charTalentTables.Vesna.s2.p4[0],
        charTalentTables.Vesna.s2.p5[0],
        charTalentTables.Vesna.s2.p6[0],
        charTalentTables.Vesna.s2.p7[0],
        charTalentTables.Vesna.s2.p8[0],
        charTalentTables.Vesna.s2.p9[0],
        charTalentTables.Vesna.s2.p10[0],
    ]).toEqual([40, 40, 60, 100, 100, 40, 40, 140, 140, 10.4]);
    expect(charTalentTables.Vesna.s2.p12).toEqual([15]);
    expect(charTalentTables.Vesna.s2.p14).toEqual([18]);
    expect(charTalentTables.Vesna.s3.p1[0]).toBe(263.2);
    expect(charTalentTables.Vesna.s3.p2[0]).toBe(263.2);
    expect(charTalentTables.Vesna.s3.p3).toEqual([15]);
    expect(charTalentTables.Vesna.s3.p4).toEqual([60]);
    expect(Object.keys(charTalentTables.Vesna.s3)).toEqual(["p1", "p2", "p3", "p4"]);
});

test("every source L1 ratio lands in the ordinary or direct Stellar branch", () => {
    const spiritBlade = {vesna_spirit_blade: true};
    const radiance = {
        vesna_spirit_blade: true,
        vesna_radiance_stellarswirl: true,
    };
    const ordinaryCases = [
        ["skill.vesna_spirit_blade_inception", 40, {}],
        ["skill.vesna_spirit_blade_pierce", 40, spiritBlade],
        ["skill.vesna_spirit_blade_plunge", 60, spiritBlade],
        ["skill.vesna_spirit_blade_plunge_blade", 100, spiritBlade],
        ["skill.vesna_spirit_blade_dance", 40, spiritBlade],
        ["skill.vesna_spirit_blade_dance_final", 140, spiritBlade],
        ["skill.vesna_spirit_feather", 10.4, spiritBlade],
        ["burst.vesna_spirit_blade_burst", 263.2, {}],
    ];
    for (const [name, ratio, settings] of ordinaryCases) {
        expect(getDamage(name, settings).normal)
            .toBeCloseTo(ratio / 100 * 1000 * 0.5, 5);
    }

    const stellarCases = [
        ["skill.vesna_stellar_spirit_blade_plunge", 100, radiance],
        ["skill.vesna_stellar_spirit_blade_dance", 40, radiance],
        ["skill.vesna_stellar_spirit_blade_dance_final", 140, radiance],
        ["burst.vesna_stellar_spirit_blade_burst", 263.2, {
            vesna_radiance_stellarswirl: true,
        }],
    ];
    for (const [name, ratio, settings] of stellarCases) {
        expect(getDamage(name, settings).normal).toBeCloseTo(ratio / 100 * 1000, 5);
    }
});

test("Radiance makes paired blade and Burst branches exclusive and direct", () => {
    const ordinaryPlunge = getFeature("skill.vesna_spirit_blade_plunge_blade");
    const stellarPlunge = getFeature("skill.vesna_stellar_spirit_blade_plunge");
    const ordinaryBurst = getFeature("burst.vesna_spirit_blade_burst");
    const stellarBurst = getFeature("burst.vesna_stellar_spirit_blade_burst");
    const normal = new BuildData({vesna_spirit_blade: true}, {});
    const radiant = new BuildData({
        vesna_spirit_blade: true,
        vesna_radiance_stellarswirl: true,
    }, {});
    const conductPriority = new BuildData({
        polestar_field: true,
        vesna_spirit_blade: true,
        vesna_radiance_stellarswirl: true,
    }, {});

    expect(ordinaryPlunge.isActive(normal)).toBe(true);
    expect(stellarPlunge.isActive(normal)).toBe(false);
    expect(ordinaryPlunge.isActive(radiant)).toBe(false);
    expect(stellarPlunge.isActive(radiant)).toBe(true);
    expect(ordinaryBurst.isActive(normal)).toBe(true);
    expect(stellarBurst.isActive(normal)).toBe(false);
    expect(ordinaryBurst.isActive(radiant)).toBe(false);
    expect(stellarBurst.isActive(radiant)).toBe(true);
    expect(ordinaryPlunge.isActive(conductPriority)).toBe(true);
    expect(stellarPlunge.isActive(conductPriority)).toBe(false);
    expect(ordinaryBurst.isActive(conductPriority)).toBe(true);
    expect(stellarBurst.isActive(conductPriority)).toBe(false);

    const direct = Vesna.getFeatures().filter((feature) =>
        feature instanceof FeatureDamageStellarSwirl
    );
    expect(direct).toHaveLength(5);
    for (const feature of direct) {
        expect(feature.getTags()).toEqual(expect.arrayContaining([
            "stellarglimmer_direct",
            "stellarswirl_direct",
        ]));
        expect(feature.getTags()).not.toContain("stellarswirl_trigger");
    }
});

test("Spirit Blade exposes duration, Force, infusion, sequence, and clear controls", () => {
    const state = getCondition("vesna_spirit_blade");
    const stateData = state.getData({vesna_spirit_blade: true});
    expect(state.getBuffRotationSection()).toBe("self");
    expect(stateData.settings.attack_infusion).toBe("anemo");
    expect(stateData.stats.get("text_duration")).toBe(15);
    expect(stateData.stats.get("text_value")).toBe(2);

    const force = getCondition("vesna_spirit_blade_force");
    expect(force.getMaxStacks({})).toBe(2);
    expect(force.isActive({vesna_spirit_blade: false, vesna_spirit_blade_force: 2})).toBe(false);
    expect(force.isActive({vesna_spirit_blade: true, vesna_spirit_blade_force: 2})).toBe(true);

    const dance = getCondition("vesna_spirit_blade_dance_uses");
    expect(dance.getMaxValue({char_constellation: 0})).toBe(3);
    expect(dance.getMaxValue({char_constellation: 1})).toBe(4);
    expect(dance.getBuffRotationSection()).toBe("self");

    const clear = getCondition("vesna_unruffled_cleared");
    expect(clear.getData({vesna_unruffled_cleared: true}).settings.vesna_unruffled).toBe(0);
    expect(getCondition("vesna_unruffled").params.description)
        .toBe("talent_descr.vesna_unruffled_1");
    expect(clear.params.description).toBe("talent_descr.vesna_unruffled_2");
    expect(getCondition("vesna_radiance_stellarswirl").getData({
        vesna_radiance_stellarswirl: true,
    }).stats.get("text_duration")).toBe(8);
});

test("A1 is a dynamic original-DMG multiplier and only affects tagged blades", () => {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_anemo: 0,
        char_skill_elemental: 1,
        char_skill_burst: 1,
        char_ascension: 1,
        vesna_spirit_blade: true,
        vesna_unruffled: 6,
    }, {atk_base: 1000});
    applyConditions(data, localConditions(0));
    expect(data.stats.get("vesna_blade_original_multi")).toBe(60);
    data.stats.processPercent();

    expect(getFeature("skill.vesna_spirit_blade_plunge_blade")
        .getResult(data)["skill.vesna_spirit_blade_plunge_blade"].normal)
        .toBeCloseTo(1000 * 0.5 * 1.6, 5);
    expect(getFeature("skill.vesna_spirit_blade_pierce")
        .getResult(data)["skill.vesna_spirit_blade_pierce"].normal)
        .toBeCloseTo(400 * 0.5, 5);
    expect(getFeature("skill.vesna_spirit_blade_plunge")
        .getResult(data)["skill.vesna_spirit_blade_plunge"].normal)
        .toBeCloseTo(600 * 0.5, 5);
    expect(getFeature("burst.vesna_spirit_blade_burst")
        .getResult(data)["burst.vesna_spirit_blade_burst"].normal)
        .toBeCloseTo(2632 * 0.5 * 1.6, 5);

    const differentStacks = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_anemo: 0,
        char_skill_elemental: 1,
        char_ascension: 1,
        vesna_spirit_blade: true,
        vesna_unruffled: 2,
    }, {atk_base: 1000});
    applyConditions(differentStacks, localConditions(0));
    differentStacks.stats.processPercent();
    expect(getFeature("skill.vesna_spirit_blade_plunge_blade")
        .getResult(differentStacks)["skill.vesna_spirit_blade_plunge_blade"].normal)
        .toBeCloseTo(1000 * 0.5 * 1.2, 5);
});

test("C1 and C2 model the extended sequence, free-use text, stacks, and bonuses", () => {
    const c1 = new BuildData({
        char_constellation: 1,
        vesna_spirit_blade: true,
    }, {});
    applyConditions(c1, localConditions(1));
    expect(c1.stats.get("dmg_stellarswirl")).toBe(20);
    expect(getCondition("vesna_spirit_blade_dance_uses").getMaxValue(c1.settings)).toBe(4);

    const c2 = new BuildData({
        char_ascension: 1,
        char_constellation: 2,
        vesna_spirit_blade: true,
        vesna_spirit_blade_force: 1,
        vesna_unruffled: 0,
    }, {});
    applyConditions(c2, localConditions(2));
    expect(c2.settings.vesna_spirit_blade_force).toBe(1);
    expect(c2.settings.vesna_unruffled).toBe(6);
    expect(c2.stats.get("vesna_blade_original_multi")).toBe(60);
    expect(c2.stats.get("atk_percent")).toBe(60);

    const lockedPassive = new BuildData({
        char_ascension: 0,
        char_constellation: 2,
        vesna_spirit_blade: true,
        vesna_unruffled: 6,
    }, {});
    applyConditions(lockedPassive, localConditions(2));
    expect(lockedPassive.stats.get("vesna_blade_original_multi")).toBe(0);
    expect(lockedPassive.stats.get("atk_percent")).toBe(0);

    const cleared = new BuildData({
        char_ascension: 1,
        char_constellation: 2,
        vesna_spirit_blade: true,
        vesna_unruffled: 6,
        vesna_unruffled_cleared: true,
    }, {});
    applyConditions(cleared, localConditions(2));
    expect(cleared.settings.vesna_unruffled).toBe(0);
    expect(cleared.stats.get("vesna_blade_original_multi")).toBe(0);
    expect(cleared.stats.get("atk_percent")).toBe(0);

    const strings = fs.readFileSync(
        path.join(__dirname, "../data/strings/7.1/vesna.csv"),
        "utf8",
    );
    expect(strings).toContain("makes the first Dance cost no Force");
});

test("A4 counts the four-member party and C4 triples both types of bonus", () => {
    const settings = {
        char_ascension: 4,
        vesna_radiance_stellarswirl: true,
        resonance_element_1: "cryo",
        resonance_element_2: "pyro",
        resonance_element_3: "anemo",
    };
    const c0 = new BuildData({...settings, char_constellation: 0}, {});
    applyConditions(c0, localConditions(0));
    expect(c0.settings.vesna_effortless_cryo_anemo_count).toBe(3);
    expect(c0.settings.vesna_effortless_other_count).toBe(1);
    expect(c0.stats.get("atk_percent")).toBe(18);
    expect(c0.stats.get("mastery")).toBe(25);

    const c4 = new BuildData({...settings, char_constellation: 4}, {});
    applyConditions(c4, localConditions(4));
    expect(c4.stats.get("atk_percent")).toBe(54);
    expect(c4.stats.get("mastery")).toBe(75);

    const inactive = new BuildData({...settings, vesna_radiance_stellarswirl: false}, {});
    applyConditions(inactive, localConditions(0));
    expect(inactive.stats.get("atk_percent")).toBe(0);
    expect(inactive.stats.get("mastery")).toBe(0);

    const conductPriority = new BuildData({...settings, polestar_field: true}, {});
    applyConditions(conductPriority, localConditions(0));
    expect(conductPriority.stats.get("atk_percent")).toBe(0);
    expect(conductPriority.stats.get("mastery")).toBe(0);
});

test("Jubilee applies 0.7% per 100 ATK and caps at 14%", () => {
    const self = new BuildData({}, {atk_base: 1000});
    self.postEffects = Vesna.getPostEffects();
    self.applyPostEffects();
    expect(self.stats.get("stellarswirl_multi")).toBeCloseTo(0.07, 5);

    const capped = new BuildData({}, {atk_base: 1000, atk: 3000});
    capped.postEffects = Vesna.getPostEffects();
    capped.applyPostEffects();
    expect(capped.stats.get("stellarswirl_multi")).toBeCloseTo(0.14, 5);

    const inactiveParty = new BuildData({}, {vesna_atk_total: 1000});
    inactiveParty.postEffects = Vesna.getPartyPostEffects();
    inactiveParty.applyPostEffects();
    expect(inactiveParty.stats.get("stellarswirl_multi")).toBe(0);

    const party = new BuildData({"party.vesna_stellar_jubilee": true}, {
        vesna_atk_total: 1000,
    });
    party.postEffects = Vesna.getPartyPostEffects();
    party.applyPostEffects();
    expect(party.stats.get("stellarswirl_multi")).toBeCloseTo(0.07, 5);
});

test("C3/C5 raise Talent levels and C6 models Tread, Feather, and elevation", () => {
    const c5 = new BuildData({char_constellation: 5}, {});
    applyConditions(c5, localConditions(5));
    expect(c5.settings.char_skill_elemental_bonus).toBe(3);
    expect(c5.settings.char_skill_burst_bonus).toBe(3);

    const treadSettings = {
        char_constellation: 6,
        vesna_c6_spirit_blade_tread: true,
    };
    expect(getDamage("skill.vesna_c6_spirit_blade_tread", treadSettings).normal)
        .toBeCloseTo(1500 * 0.5, 5);
    expect(getDamage("skill.vesna_c6_stellar_spirit_blade_tread", treadSettings).normal)
        .toBeCloseTo(2000, 5);

    const feather = getFeature("skill.vesna_c6_tread_spirit_feather");
    expect(feather.isActive(new BuildData(treadSettings, {}))).toBe(false);
    expect(feather.isActive(new BuildData({
        ...treadSettings,
        vesna_spirit_blade: true,
    }, {}))).toBe(true);

    const c6 = new BuildData(treadSettings, {});
    applyConditions(c6, localConditions(6));
    expect(c6.stats.get("dmg_stellarswirl_special")).toBe(20);
    const tread = getCondition("vesna_c6_spirit_blade_tread");
    expect(tread.getBuffRotationSection()).toBe("self");
    expect(tread.getData(treadSettings).stats.get("text_duration")).toBe(5);
    expect(tread.params.description).toBe("talent_descr.vesna_c6_1");
    expect(Vesna.getAllConditions().find((condition) =>
        condition.params.description === "talent_descr.vesna_c6_2"
    ).getType()).toBe("static");
});

test("Vesna uses only its reserved 890-919 Rotation block", () => {
    const rows = Rotation.listNames()
        .filter((name) => name.includes("vesna_"))
        .map((name) => [name, Rotation.getByName(name)]);

    expect(rows).toEqual([
        ["skill.vesna_spirit_blade_inception", 890],
        ["skill.vesna_spirit_blade_pierce", 891],
        ["skill.vesna_spirit_blade_plunge", 892],
        ["skill.vesna_spirit_blade_plunge_blade", 893],
        ["skill.vesna_stellar_spirit_blade_plunge", 894],
        ["skill.vesna_spirit_blade_dance", 895],
        ["skill.vesna_stellar_spirit_blade_dance", 896],
        ["skill.vesna_spirit_blade_dance_final", 897],
        ["skill.vesna_stellar_spirit_blade_dance_final", 898],
        ["skill.vesna_spirit_feather", 899],
        ["burst.vesna_spirit_blade_burst", 900],
        ["burst.vesna_stellar_spirit_blade_burst", 901],
        ["skill.vesna_c6_spirit_blade_tread", 902],
        ["skill.vesna_c6_stellar_spirit_blade_tread", 903],
        ["skill.vesna_c6_tread_spirit_feather", 904],
    ]);
    expect(rows.every(([, id]) => id >= 890 && id <= 919)).toBe(true);
});

test("Vesna localization is generated with a narrow manual allowlist", () => {
    const manualStrings = fs.readFileSync(
        path.join(__dirname, "../data/strings/7.1/vesna.csv"),
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
    expect(generatedNames).toContain("char_name;vesna;Весна;Vesna");
    expect(generatedSkills).toContain("talent_name;vesna_light_step");
    expect(generatedSkills).toContain("talent_descr;vesna_spirit_blade_inception");
    expect(generatedSkills).toContain("talent_name;vesna_spirit_blade_burst");
    expect(generatedTalents).toContain("talent_name;vesna_unruffled");
    expect(generatedTalents).toContain("talent_name;vesna_radiant_fae");
    expect(generatedTalents).toContain("talent_descr;vesna_unruffled_1");
    expect(generatedTalents).toContain("talent_descr;vesna_unruffled_2");
    expect(generatedTalents).toContain("talent_descr;vesna_c6_1");
    expect(generatedTalents).toContain("talent_descr;vesna_c6_2");
    expect(generatedTalents).not.toContain("talent_descr;vesna_unruffled;");
    expect(generatedTalents).not.toContain("talent_descr;vesna_c6;");
    expect(generatedSkills).not.toContain(";n11430001;");
    expect(generatedTalents).not.toContain(";n11430001;");

    const manualNonFeatureKeys = manualStrings.split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map((line) => line.split(";").slice(0, 2).join(";"))
        .filter((key) => !key.startsWith("feature_"));
    expect(manualNonFeatureKeys).toEqual([
        "talent_name;n11430001",
        "talent_descr;n11430001",
        "talent_name;vesna_spirit_blade_force",
        "talent_descr;vesna_spirit_blade_force",
        "talent_name;vesna_spirit_blade_sequence",
        "talent_descr;vesna_spirit_blade_sequence",
        "talent_name;vesna_unruffled_clear",
    ]);
    expect(manualStrings).not.toContain("talent_descr;vesna_unruffled_clear");
    expect(manualStrings).not.toContain("featherlight");

});
