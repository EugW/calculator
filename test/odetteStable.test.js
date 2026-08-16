import fs from "fs";
import path from "path";
import { BuildData } from "../src/js/classes/Build/Data";
import { Odette } from "../src/js/db/Char/Odette";
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
    return Odette.getConditions().concat(Odette.constellation.getConditions(constellation));
}

function getFeature(name) {
    return Odette.getFeatures().find((feature) => feature.getName() === name);
}

function getCondition(name, party = false) {
    const conditions = party ? Odette.getPartyConditions() : Odette.getAllConditions();
    return conditions.find((condition) => condition.getName() === name);
}

function getDamage(name, settings = {}) {
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
    });
    const result = getFeature(name).getResult(data);
    return result[name];
}

test("Odette is stable serialize 126 and game character 10000150", () => {
    expect(DB.Chars.get("Odette")).toBe(Odette);
    expect(DB.Chars.getById(126)).toBe(Odette);
    expect(DB.Chars.getByGameId(10000150)).toBe(Odette);
    expect(DB.Chars.getKeys()).toContain("Odette");
    expect(Odette.getId()).toBe(126);
    expect(Odette.getGameId()).toEqual([10000150]);
});

test("Odette's ordinary Skill, Double, Coda, and Burst rows use every generated L1 ratio", () => {
    const ordinaryCases = [
        ["skill.odette_phantom_night_dancers", charTalentTables.Odette.s2.p1[0], {}],
        ["skill.odette_coda_dot", charTalentTables.Odette.s2.p2[0], {
            odette_solo_dance_double: true,
            odette_coda_at_dawns_tolling: true,
        }],
        ["skill.odette_plume", charTalentTables.Odette.s2.p5[0], {
            odette_solo_dance_double: true,
        }],
        ["skill.odette_wing", charTalentTables.Odette.s2.p8[0], {
            odette_solo_dance_double: true,
        }],
        ["burst.odette_bluebird_slash", charTalentTables.Odette.s3.p1[0], {}],
        ["burst.odette_bluebird_final_slash", charTalentTables.Odette.s3.p2[0], {}],
    ];

    for (const [name, ratio, settings] of ordinaryCases) {
        expect(getDamage(name, settings).normal).toBeCloseTo(ratio / 100 * 1000 * 0.5, 5);
    }

    const conductSettings = {
        polestar_field: true,
        odette_solo_dance_double: true,
        odette_coda_at_dawns_tolling: true,
        odette_radiance_stellarconduct: true,
    };
    const swirlSettings = {
        odette_solo_dance_double: true,
        odette_coda_at_dawns_tolling: true,
        odette_radiance_stellarswirl: true,
    };
    const stellarCases = [
        ["skill.odette_coda_stellarconduct", charTalentTables.Odette.s2.p3[0], {
            odette_solo_dance_double: true,
            odette_coda_at_dawns_tolling: true,
        }],
        ["skill.odette_coda_stellarswirl", charTalentTables.Odette.s2.p4[0], swirlSettings],
        ["skill.odette_plume_stellarconduct", charTalentTables.Odette.s2.p6[0], conductSettings],
        ["skill.odette_plume_stellarswirl", charTalentTables.Odette.s2.p7[0], swirlSettings],
        ["skill.odette_wing_stellarconduct", charTalentTables.Odette.s2.p9[0], conductSettings],
        ["skill.odette_wing_stellarswirl", charTalentTables.Odette.s2.p10[0], swirlSettings],
    ];

    for (const [name, ratio, settings] of stellarCases) {
        expect(getDamage(name, settings).normal).toBeCloseTo(ratio / 100 * 1000, 5);
    }
});

test("Coda defaults to Conduct and Radiance branches are exclusive with Conduct priority", () => {
    const codaConduct = getFeature("skill.odette_coda_stellarconduct");
    const codaSwirl = getFeature("skill.odette_coda_stellarswirl");
    const base = {
        odette_solo_dance_double: true,
        odette_coda_at_dawns_tolling: true,
    };

    const noRadiance = new BuildData(base, {});
    expect(codaConduct.isActive(noRadiance)).toBe(true);
    expect(codaSwirl.isActive(noRadiance)).toBe(false);

    const swirl = new BuildData({...base, odette_radiance_stellarswirl: true}, {});
    expect(codaConduct.isActive(swirl)).toBe(false);
    expect(codaSwirl.isActive(swirl)).toBe(true);

    const both = new BuildData({
        ...base,
        polestar_field: true,
        odette_radiance_stellarconduct: true,
        odette_radiance_stellarswirl: true,
    }, {});
    expect(both.settings.odette_radiance_stellarswirl).toBe(false);
    expect(codaConduct.isActive(both)).toBe(true);
    expect(codaSwirl.isActive(both)).toBe(false);

    const conductPlume = getFeature("skill.odette_plume_stellarconduct");
    expect(conductPlume.isActive(new BuildData({
        ...base,
        odette_radiance_stellarconduct: true,
    }, {}))).toBe(false);
    expect(conductPlume.isActive(both)).toBe(true);
});

test("Double and Coda are explicit rotation states with the stable 6s and 20s values", () => {
    const double = getCondition("odette_solo_dance_double");
    const coda = getCondition("odette_coda_at_dawns_tolling");

    expect(double.getBuffRotationSection()).toBe("self");
    expect(coda.getBuffRotationSection()).toBe("self");
    expect(coda.getData({
        odette_solo_dance_double: true,
        odette_coda_at_dawns_tolling: true,
    }).stats.get("text_duration")).toBe(6);
    expect(charTalentTables.Odette.s2.p11[0]).toBe(20);
    expect(charTalentTables.Odette.s3.p5[0]).toBe(20);
});

test("Marvelous Splendor models self-to-party transfer, C1 capacity, and C2 ATK per stack", () => {
    const c0 = new BuildData({
        char_ascension: 1,
        char_constellation: 0,
        odette_marvelous_splendor: 6,
    }, {});
    applyConditions(c0, localConditions(0));
    expect(c0.settings.odette_marvelous_splendor).toBe(4);
    expect(c0.stats.get("dmg_stellarglimmer")).toBe(60);
    expect(c0.stats.get("atk_percent")).toBe(0);

    const c2 = new BuildData({
        char_ascension: 1,
        char_constellation: 2,
        odette_marvelous_splendor: 6,
    }, {});
    applyConditions(c2, localConditions(2));
    expect(c2.stats.get("dmg_stellarglimmer")).toBe(90);
    expect(c2.stats.get("atk_percent")).toBe(42);

    const transferred = new BuildData({
        "party.odette_c1_splendor": true,
        "party.odette_c2_splendor": true,
        "party.odette_marvelous_splendor": 3,
    }, {});
    applyConditions(transferred, Odette.getPartyConditions());
    expect(transferred.stats.get("dmg_stellarglimmer")).toBe(45);
    expect(transferred.stats.get("atk_percent")).toBe(21);

    expect(getCondition("odette_marvelous_splendor").getBuffRotationSection()).toBe("self");
    expect(getCondition("party.odette_marvelous_splendor", true).getBuffRotationSection()).toBe("party");
});

test("A4 increases original Glimmer base damage above 1000 ATK and caps at 30%", () => {
    const scaled = new BuildData({char_ascension: 4}, {
        atk_base: 1000,
        atk: 1000,
    });
    scaled.postEffects = Odette.getPostEffects();
    scaled.applyPostEffects();
    expect(scaled.stats.get("stellarglimmer_multi")).toBeCloseTo(0.15, 5);

    const capped = new BuildData({char_ascension: 4}, {
        atk_base: 1000,
        atk: 3000,
    });
    capped.postEffects = Odette.getPostEffects();
    capped.applyPostEffects();
    expect(capped.stats.get("stellarglimmer_multi")).toBeCloseTo(0.3, 5);

    const threshold = new BuildData({char_ascension: 4}, {atk_base: 1000});
    threshold.postEffects = Odette.getPostEffects();
    threshold.applyPostEffects();
    expect(threshold.stats.get("stellarglimmer_multi")).toBe(0);
});

test("Radiance converts the branch and adds the capped 0.7%-per-100-ATK base bonus", () => {
    const self = new BuildData({
        polestar_field: true,
        odette_radiance_stellarconduct: true,
    }, {
        atk_base: 1000,
    });
    self.postEffects = Odette.getPostEffects();
    self.applyPostEffects();
    expect(self.stats.get("stellarglimmer_multi")).toBeCloseTo(0.07, 5);

    const capped = new BuildData({odette_radiance_stellarswirl: true}, {
        atk_base: 1000,
        atk: 2000,
    });
    capped.postEffects = Odette.getPostEffects();
    capped.applyPostEffects();
    expect(capped.stats.get("stellarglimmer_multi")).toBeCloseTo(0.14, 5);

    const party = new BuildData({
        polestar_field: true,
        "party.odette_radiance_stellarconduct": true,
    }, {
        odette_atk_total: 1000,
    });
    party.postEffects = Odette.getPartyPostEffects();
    party.applyPostEffects();
    expect(party.stats.get("stellarglimmer_multi")).toBeCloseTo(0.07, 5);

});

test("Snow Swan uses generated burst p3, C4 grants half, and C5 adds three levels", () => {
    const self = new BuildData({
        char_skill_burst: 1,
        odette_snow_swans_dream: true,
    }, {});
    applyConditions(self, Odette.getConditions());
    expect(self.stats.get("dmg_stellarglimmer")).toBe(charTalentTables.Odette.s3.p3[0]);

    const party = new BuildData({
        odette_char_skill_burst: 1,
        "party.odette_snow_swans_dream": true,
    }, {});
    applyConditions(party, Odette.getPartyConditions());
    expect(party.stats.get("dmg_stellarglimmer")).toBe(charTalentTables.Odette.s3.p3[0] * 0.5);

    const partyLevel10 = new BuildData({
        odette_char_skill_burst: 10,
        "party.odette_snow_swans_dream": true,
    }, {});
    applyConditions(partyLevel10, Odette.getPartyConditions());
    expect(partyLevel10.stats.get("dmg_stellarglimmer"))
        .toBe(charTalentTables.Odette.s3.p3[9] * 0.5);

    const partyC5 = new BuildData({
        odette_char_skill_burst: 10,
        "party.odette_constellation_5": true,
        "party.odette_snow_swans_dream": true,
    }, {});
    applyConditions(partyC5, Odette.getPartyConditions());
    expect(partyC5.settings.odette_char_skill_burst_bonus).toBe(3);
    expect(partyC5.stats.get("dmg_stellarglimmer"))
        .toBe(charTalentTables.Odette.s3.p3[12] * 0.5);

    const c5 = getCondition("party.odette_constellation_5", true);
    expect(c5.getId()).toBe(12);
    expect(c5.getInfo()).toEqual({constellation: 5});
});

test("C1 and C4 direct Stellar branches use their exact source ratios", () => {
    const coda = {
        char_constellation: 1,
        odette_solo_dance_double: true,
        odette_coda_at_dawns_tolling: true,
    };
    expect(getDamage("skill.odette_c1_coda_stellarconduct", coda).normal).toBeCloseTo(3000, 5);
    expect(getDamage("skill.odette_c1_coda_stellarswirl", {
        ...coda,
        odette_radiance_stellarswirl: true,
    }).normal).toBeCloseTo(4500, 5);

    expect(getDamage("other.odette_c4_coordinated_stellarconduct", {
        char_constellation: 4,
    }).normal).toBeCloseTo(660, 5);
    expect(getDamage("other.odette_c4_coordinated_stellarswirl", {
        char_constellation: 4,
        odette_radiance_stellarswirl: true,
    }).normal).toBeCloseTo(990, 5);
});

test("C2 Double RES shred follows the exclusive Conduct and Swirl element pairs", () => {
    const conduct = new BuildData({
        char_constellation: 2,
        polestar_field: true,
        odette_solo_dance_double: true,
        odette_radiance_stellarconduct: true,
        odette_radiance_stellarswirl: true,
    }, {});
    applyConditions(conduct, localConditions(2));
    expect(conduct.settings.odette_radiance_stellarswirl).toBe(false);
    expect(conduct.stats.get("enemy_res_cryo")).toBe(-20);
    expect(conduct.stats.get("enemy_res_electro")).toBe(-20);
    expect(conduct.stats.get("enemy_res_anemo")).toBe(0);

    const swirl = new BuildData({
        char_constellation: 2,
        odette_solo_dance_double: true,
        odette_radiance_stellarswirl: true,
    }, {});
    applyConditions(swirl, localConditions(2));
    expect(swirl.stats.get("enemy_res_cryo")).toBe(-20);
    expect(swirl.stats.get("enemy_res_anemo")).toBe(-20);
    expect(swirl.stats.get("enemy_res_electro")).toBe(0);

    const party = new BuildData({
        polestar_field: true,
        "party.odette_c2_splendor": true,
        "party.odette_solo_dance_double": true,
        "party.odette_radiance_stellarconduct": true,
    }, {});
    applyConditions(party, Odette.getPartyConditions());
    expect(party.stats.get("enemy_res_cryo")).toBe(-20);
    expect(party.stats.get("enemy_res_electro")).toBe(-20);
});

test("C6 stops modeled self decay and applies 25% affected plus 20% Odette elevation", () => {
    const c6 = new BuildData({
        char_ascension: 1,
        char_constellation: 6,
        odette_marvelous_splendor: 4,
        odette_all_party_marvelous_splendor: true,
    }, {});
    applyConditions(c6, localConditions(6));
    expect(c6.stats.get("dmg_stellarglimmer_special")).toBe(45);
    expect(getCondition("odette_all_party_marvelous_splendor").getBuffRotationSection()).toBe("self");

    const noSelfStacks = new BuildData({char_constellation: 6}, {});
    applyConditions(noSelfStacks, localConditions(6));
    expect(noSelfStacks.stats.get("dmg_stellarglimmer_special")).toBe(20);

    const party = new BuildData({
        "party.odette_c6_splendor": true,
        "party.odette_marvelous_splendor": 1,
    }, {});
    applyConditions(party, Odette.getPartyConditions());
    expect(party.stats.get("dmg_stellarglimmer_special")).toBe(25);
});

test("Odette uses only reserved Rotation IDs 830-859", () => {
    const rows = Rotation.listNames()
        .filter((name) => name.includes("odette_"))
        .map((name) => [name, Rotation.getByName(name)]);
    const ids = rows.map(([, id]) => id);

    expect(ids).toEqual([
        830, 831, 832, 833, 834, 835, 836, 837,
        838, 839, 840, 841, 842, 843, 844, 845,
    ]);
    expect(ids.every((id) => id >= 830 && id <= 859)).toBe(true);
});

test("Odette manual labels complement canonical generated source strings", () => {
    const manual = fs.readFileSync(
        path.join(__dirname, "../data/strings/7.0/odette.csv"),
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
        "feature_skill;odette_coda_stellarconduct",
        "feature_skill;odette_coda_stellarswirl",
        "feature_skill;odette_plume_stellarconduct",
        "feature_skill;odette_wing_stellarswirl",
        "feature_burst;odette_snow_swans_dream_bonus",
        "feature_other;odette_c4_coordinated_stellarconduct",
        "feature_other;odette_c4_coordinated_stellarswirl",
        "talent_name;odette_snow_swans_dream",
    ]) {
        expect(manual).toContain(key);
    }

    expect(generatedSkills).toContain("talent_descr;n11500002");
    expect(generatedSkills).toContain("loses 1 stack of name{Marvelous Splendor} every 1 second");
    expect(generatedTalents).toContain("talent_descr;odette_dance_of_aurore_1");
    expect(generatedTalents).toContain("talent_descr;odette_dance_of_aurore_2");
    expect(generatedTalents).toContain("talent_descr;odette_dance_of_aurore_3");
    expect(generatedTalents).toContain(
        "Stellar-Conduct reaction DMG at %{text_percent_dmg_1} of Odette's name{ATK}",
    );
    expect(generatedTalents).toContain("Stellar anemo{Swirl} reaction DMG at 99% of Odette's name{ATK}");
    expect(generatedTalents).toContain("talent_descr;odette_on_this_danceless_morn_she_gazes_at_her_reflection_1");
    expect(generatedTalents).toContain("talent_descr;odette_on_this_danceless_morn_she_gazes_at_her_reflection_2");
    expect(generatedTalents).toContain("talent_descr;odette_put_out_my_hand_and_touched_the_face_of_the_divine_1");
    expect(generatedTalents).toContain("talent_descr;odette_put_out_my_hand_and_touched_the_face_of_the_divine_2");
    expect(generatedTalents).toContain("talent_descr;odette_put_out_my_hand_and_touched_the_face_of_the_divine_3");
    expect(generatedTalents).toContain("elevated} by %{text_percent}");
    expect(generatedTalents).not.toContain("talent_descr;odette_dance_of_aurore;");
    expect(generatedTalents).not.toContain("talent_descr;odette_on_this_danceless_morn_she_gazes_at_her_reflection;");
    expect(generatedTalents).not.toContain("talent_descr;odette_put_out_my_hand_and_touched_the_face_of_the_divine;");
    expect(getCondition("odette_radiance_stellarconduct").params.description)
        .toBe("talent_descr.odette_dance_of_aurore_1");
    expect(getCondition("odette_radiance_stellarswirl").params.description)
        .toBe("talent_descr.odette_dance_of_aurore_2");
    expect(Odette.getAllConditions().find((condition) =>
        condition.params.description === "talent_descr.odette_dance_of_aurore_3"
    ).getType()).toBe("static");
    expect(getCondition("odette_all_party_marvelous_splendor").params.description)
        .toBe("talent_descr.odette_put_out_my_hand_and_touched_the_face_of_the_divine_1");
    expect(Odette.getAllConditions().find((condition) =>
        condition.params.description
            === "talent_descr.odette_put_out_my_hand_and_touched_the_face_of_the_divine_3"
    ).getType()).toBe("static");
    expect(getCondition("party.odette_c6_splendor", true).params.description)
        .toBe("talent_descr.odette_put_out_my_hand_and_touched_the_face_of_the_divine_2");
});
