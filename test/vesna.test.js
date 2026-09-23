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

test("Vesna is character 128 and is available by default", () => {
    expect(DB.Chars.get("Vesna")).toBe(Vesna);
    expect(DB.Chars.getById(128)).toBe(Vesna);
    expect(DB.Chars.getByGameId(10000143)).toBe(Vesna);
    expect(DB.Chars.getKeys()).toContain("Vesna");
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
    ]).toEqual([40, 40, 60, 112, 112, 44.8, 44.8, 156.8, 156.8, 10.4]);
    expect(charTalentTables.Vesna.s2.p12).toEqual([15]);
    expect(charTalentTables.Vesna.s2.p14).toEqual([18]);
    expect(charTalentTables.Vesna.s3.p1[0]).toBe(263.2);
    expect(charTalentTables.Vesna.s3.p2[0]).toBe(263.2);
    expect(charTalentTables.Vesna.s3.p3).toEqual([15]);
    expect(charTalentTables.Vesna.s3.p4).toEqual([60]);
    expect(Object.keys(charTalentTables.Vesna.s3)).toEqual(["p1", "p2", "p3", "p4"]);
});

test("every source L1 ratio lands in the ordinary or direct Stellar branch", () => {
    const armedForAction = {vesna_armed_for_action: true};
    const radiance = {
        vesna_armed_for_action: true,
        vesna_radiance_stellarswirl: true,
    };
    const ordinaryCases = [
        ["skill.vesna_the_art_of_victory", 40, {}],
        ["skill.vesna_windborne_sword_lv1", 40, armedForAction],
        ["skill.vesna_windborne_sword_lv2", 60, armedForAction],
        ["skill.vesna_windborne_sword_lv2_spirit_blade", 112, armedForAction],
        ["skill.vesna_windborne_sword_lv3", 44.8, armedForAction],
        ["skill.vesna_windborne_sword_lv3_final", 156.8, armedForAction],
        ["skill.vesna_wind_pinion", 10.4, armedForAction],
        ["burst.vesna_for_the_tsaritsa", 263.2, {}],
    ];
    for (const [name, ratio, settings] of ordinaryCases) {
        expect(getDamage(name, settings).normal)
            .toBeCloseTo(ratio / 100 * 1000 * 0.5, 5);
    }

    const stellarCases = [
        ["skill.vesna_windborne_sword_lv2_spirit_blade_stellar", 112, radiance],
        ["skill.vesna_windborne_sword_lv3_stellar", 44.8, radiance],
        ["skill.vesna_windborne_sword_lv3_final_stellar", 156.8, radiance],
        ["burst.vesna_for_the_tsaritsa_stellar", 263.2, {
            vesna_radiance_stellarswirl: true,
        }],
    ];
    for (const [name, ratio, settings] of stellarCases) {
        expect(getDamage(name, settings).normal).toBeCloseTo(ratio / 100 * 1000, 5);
    }
});

test("Radiance makes paired blade and Burst branches exclusive and direct", () => {
    const ordinaryPlunge = getFeature("skill.vesna_windborne_sword_lv2_spirit_blade");
    const stellarPlunge = getFeature("skill.vesna_windborne_sword_lv2_spirit_blade_stellar");
    const ordinaryBurst = getFeature("burst.vesna_for_the_tsaritsa");
    const stellarBurst = getFeature("burst.vesna_for_the_tsaritsa_stellar");
    const normal = new BuildData({vesna_armed_for_action: true}, {});
    const radiant = new BuildData({
        vesna_armed_for_action: true,
        vesna_radiance_stellarswirl: true,
    }, {});
    const conductPriority = new BuildData({
        polestar_field: true,
        vesna_armed_for_action: true,
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

test("Spirit Blade exposes duration, Force, infusion, and sequence controls", () => {
    const state = getCondition("vesna_armed_for_action");
    const stateData = state.getData({vesna_armed_for_action: true});
    expect(state.getBuffRotationSection()).toBe("self");
    expect(stateData.settings.attack_infusion).toBe("anemo");
    expect(stateData.stats.get("text_duration")).toBe(15);
    expect(stateData.stats.get("text_value")).toBe(2);

    const force = getCondition("vesna_sword_energy");
    expect(force.getMaxStacks({})).toBe(2);
    expect(force.isActive({vesna_armed_for_action: false, vesna_sword_energy: 2})).toBe(false);
    expect(force.isActive({vesna_armed_for_action: true, vesna_sword_energy: 2})).toBe(true);

    const dance = getCondition("vesna_windborne_sword_uses");
    expect(dance.getMaxValue({char_constellation: 0})).toBe(3);
    expect(dance.getMaxValue({char_constellation: 1})).toBe(4);
    expect(dance.getBuffRotationSection()).toBe("self");

    const clear = getCondition("vesna_disciplinary_action_cleared");
    expect(clear.isHidden({})).toBe(true);
    expect(clear.getBuffRotationSection()).toBe("");
    expect(clear.getData({vesna_disciplinary_action_cleared: true}).settings).toEqual({});
    expect(getCondition("vesna_disciplinary_action").params.description)
        .toBe("talent_descr.vesna_rite_of_springs_procession_1");
    expect(clear.params.title).toBeUndefined();
    expect(clear.params.description).toBeUndefined();
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
        vesna_armed_for_action: true,
        vesna_disciplinary_action: 6,
    }, {atk_base: 1000});
    applyConditions(data, localConditions(0));
    expect(data.stats.get("vesna_disciplinary_action_multi")).toBe(60);
    data.stats.processPercent();

    expect(getFeature("skill.vesna_windborne_sword_lv2_spirit_blade")
        .getResult(data)["skill.vesna_windborne_sword_lv2_spirit_blade"].normal)
        .toBeCloseTo(1000 * 0.56 * 1.6, 5);
    expect(getFeature("skill.vesna_windborne_sword_lv1")
        .getResult(data)["skill.vesna_windborne_sword_lv1"].normal)
        .toBeCloseTo(400 * 0.5, 5);
    expect(getFeature("skill.vesna_windborne_sword_lv2")
        .getResult(data)["skill.vesna_windborne_sword_lv2"].normal)
        .toBeCloseTo(600 * 0.5, 5);
    expect(getFeature("burst.vesna_for_the_tsaritsa")
        .getResult(data)["burst.vesna_for_the_tsaritsa"].normal)
        .toBeCloseTo(2632 * 0.5 * 1.6, 5);
    expect(getFeature("skill.vesna_wind_pinion")
        .getResult(data)["skill.vesna_wind_pinion"].normal)
        .toBeCloseTo(104 * 0.5, 5);
    data.settings.char_constellation = 6;
    data.settings.vesna_c6_transpose = true;
    expect(getFeature("skill.vesna_c6_transpose_wind_pinion")
        .getResult(data)["skill.vesna_c6_transpose_wind_pinion"].normal)
        .toBeCloseTo(104 * 0.5, 5);

    const differentStacks = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_anemo: 0,
        char_skill_elemental: 1,
        char_ascension: 1,
        vesna_armed_for_action: true,
        vesna_disciplinary_action: 2,
    }, {atk_base: 1000});
    applyConditions(differentStacks, localConditions(0));
    differentStacks.stats.processPercent();
    expect(getFeature("skill.vesna_windborne_sword_lv2_spirit_blade")
        .getResult(differentStacks)["skill.vesna_windborne_sword_lv2_spirit_blade"].normal)
        .toBeCloseTo(1000 * 0.56 * 1.2, 5);
});

test("C1 and C2 model the extended sequence, free-use text, stacks, and bonuses", () => {
    const c1 = new BuildData({
        char_constellation: 1,
        vesna_armed_for_action: true,
    }, {});
    applyConditions(c1, localConditions(1));
    expect(c1.stats.get("dmg_stellarswirl")).toBe(20);
    expect(getCondition("vesna_windborne_sword_uses").getMaxValue(c1.settings)).toBe(4);

    const c2 = new BuildData({
        char_ascension: 1,
        char_constellation: 2,
        vesna_armed_for_action: true,
        vesna_sword_energy: 1,
        vesna_disciplinary_action: 6,
    }, {});
    applyConditions(c2, localConditions(2));
    expect(c2.settings.vesna_sword_energy).toBe(1);
    expect(c2.settings.vesna_disciplinary_action).toBe(6);
    expect(c2.stats.get("vesna_disciplinary_action_multi")).toBe(60);
    expect(c2.stats.get("atk_percent")).toBe(40);

    const lockedPassive = new BuildData({
        char_ascension: 0,
        char_constellation: 2,
        vesna_armed_for_action: true,
        vesna_disciplinary_action: 6,
    }, {});
    applyConditions(lockedPassive, localConditions(2));
    expect(lockedPassive.stats.get("vesna_disciplinary_action_multi")).toBe(0);
    expect(lockedPassive.stats.get("atk_percent")).toBe(0);

    const cleared = new BuildData({
        char_ascension: 1,
        char_constellation: 2,
        vesna_armed_for_action: true,
        vesna_disciplinary_action: 6,
        vesna_disciplinary_action_cleared: true,
    }, {});
    applyConditions(cleared, localConditions(2));
    expect(cleared.settings.vesna_disciplinary_action).toBe(6);
    expect(cleared.stats.get("vesna_disciplinary_action_multi")).toBe(60);
    expect(cleared.stats.get("atk_percent")).toBe(40);

    const strings = fs.readFileSync(
        path.join(__dirname, "../data/strings/generated/char_talents.csv"),
        "utf8",
    );
    expect(strings).toContain("talent_name;vesna_winters_farewell_feast");
});

test.each([0, 2, 6])("manual Disciplinary Action stacks are respected during Armed for Action at C%i", (constellation) => {
    const stacks = getCondition("vesna_disciplinary_action");
    for (const count of [6, 5, 3, 0, 1, 6]) {
        const data = new BuildData({
            char_ascension: 1,
            char_constellation: constellation,
            vesna_armed_for_action: true,
            vesna_disciplinary_action: count,
        }, {});
        applyConditions(data, localConditions(constellation));
        expect(stacks.getStacksCnt(data.settings)).toBe(count);
        expect(data.settings.vesna_disciplinary_action).toBe(count);
        expect(data.stats.get("vesna_disciplinary_action_multi")).toBe(count * 10);
        expect(data.stats.get("atk_percent")).toBe(constellation >= 2 && count === 6 ? 40 : 0);
    }
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
    expect(c0.settings.vesna_truth_prevails_cryo_anemo_count).toBe(3);
    expect(c0.settings.vesna_truth_prevails_other_count).toBe(1);
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
        vesna_c6_transpose: true,
    };
    expect(getDamage("skill.vesna_c6_transpose", treadSettings).normal)
        .toBeCloseTo(1500 * 0.5, 5);
    expect(getDamage("skill.vesna_c6_transpose_spirit_blade", treadSettings).normal)
        .toBeCloseTo(2000 * 0.5, 5);
    expect(getDamage("skill.vesna_c6_transpose_stellar", treadSettings)).toBeUndefined();
    const radiant = {...treadSettings, vesna_radiance_stellarswirl: true};
    expect(getDamage("skill.vesna_c6_transpose_spirit_blade", radiant)).toBeUndefined();
    expect(getDamage("skill.vesna_c6_transpose_stellar", radiant).normal)
        .toBeCloseTo(2000, 5);

    const feather = getFeature("skill.vesna_c6_transpose_wind_pinion");
    expect(feather.isActive(new BuildData(treadSettings, {}))).toBe(false);
    expect(feather.isActive(new BuildData({
        ...treadSettings,
        vesna_armed_for_action: true,
    }, {}))).toBe(true);

    const c6 = new BuildData(treadSettings, {});
    applyConditions(c6, localConditions(6));
    expect(c6.stats.get("dmg_stellarswirl_special")).toBe(20);
    const tread = getCondition("vesna_c6_transpose");
    expect(tread.getBuffRotationSection()).toBe("self");
    expect(tread.getData(treadSettings).stats.get("text_duration")).toBe(5);
    expect(tread.params.description).toBe("talent_descr.vesna_unwavering_ardor_1");
    expect(Vesna.getAllConditions().find((condition) =>
        condition.params.description === "talent_descr.vesna_unwavering_ardor_2"
    ).getType()).toBe("static");
});

test("Vesna uses only its reserved 890-919 Rotation block", () => {
    const rows = Rotation.listNames()
        .filter((name) => name.includes("vesna_"))
        .map((name) => [name, Rotation.getByName(name)]);

    expect(rows).toEqual([
        ["skill.vesna_the_art_of_victory", 890],
        ["skill.vesna_windborne_sword_lv1", 891],
        ["skill.vesna_windborne_sword_lv2", 892],
        ["skill.vesna_windborne_sword_lv2_spirit_blade", 893],
        ["skill.vesna_windborne_sword_lv2_spirit_blade_stellar", 894],
        ["skill.vesna_windborne_sword_lv3", 895],
        ["skill.vesna_windborne_sword_lv3_stellar", 896],
        ["skill.vesna_windborne_sword_lv3_final", 897],
        ["skill.vesna_windborne_sword_lv3_final_stellar", 898],
        ["skill.vesna_wind_pinion", 899],
        ["burst.vesna_for_the_tsaritsa", 900],
        ["burst.vesna_for_the_tsaritsa_stellar", 901],
        ["skill.vesna_c6_transpose", 902],
        ["skill.vesna_c6_transpose_stellar", 903],
        ["skill.vesna_c6_transpose_wind_pinion", 904],
        ["skill.vesna_c6_transpose_spirit_blade", 905],
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
    expect(generatedSkills).toContain("talent_name;vesna_vila_blade_dance");
    expect(generatedSkills).toContain("talent_descr;vesna_the_art_of_victory");
    expect(generatedSkills).toContain("talent_name;vesna_for_the_tsaritsa");
    expect(generatedTalents).toContain("talent_name;vesna_rite_of_springs_procession");
    expect(generatedTalents).toContain("talent_name;vesna_splendid_prelude");
    expect(generatedTalents).toContain("talent_descr;vesna_rite_of_springs_procession_1");
    expect(generatedTalents).toContain("talent_descr;vesna_rite_of_springs_procession_2");
    expect(generatedTalents).toContain("talent_descr;vesna_unwavering_ardor_1");
    expect(generatedTalents).toContain("talent_descr;vesna_unwavering_ardor_2");
    expect(generatedTalents).not.toContain("talent_descr;vesna_rite_of_springs_procession;");
    expect(generatedTalents).not.toContain("talent_descr;vesna_unwavering_ardor;");
    expect(generatedSkills).toContain("talent_name;n11430001");
    expect(generatedTalents).not.toContain(";n11430001;");

    const manualNonFeatureKeys = manualStrings.split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map((line) => line.split(";").slice(0, 2).join(";"))
        .filter((key) => !key.startsWith("feature_"));
    expect(manualNonFeatureKeys).toEqual([
        "talent_name;vesna_sword_energy",
        "talent_descr;vesna_sword_energy",
        "talent_name;vesna_windborne_sword_level",
        "talent_descr;vesna_windborne_sword_level",
    ]);
    expect(manualStrings).not.toContain("talent_descr;vesna_disciplinary_action_clear");
    expect(manualStrings).not.toContain("featherlight");

});
