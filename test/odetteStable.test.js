import fs from "fs";
import path from "path";
import { BuildData } from "../src/js/classes/Build/Data";
import { CalcSet } from "../src/js/classes/CalcSet";
import { Odette } from "../src/js/db/Char/Odette";
import { DB } from "../src/js/db/DB";
import { Rotation } from "../src/js/db/Features/Rotation";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";
import { Serializer } from "../src/js/classes/Serializer";
import { Team } from "../src/js/classes/Team";
import { finalStats, makeBuild, enemyChange } from "./support/team";

global.DB = DB;

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

function getCondition(name) {
    const conditions = Odette.getAllConditions();
    return conditions.find((condition) => condition.getName() === name);
}

function getDamage(name, settings = {}) {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
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

    const transferredReceiver = makeBuild('Ayaka');
    const transferredCarrier = makeBuild('Odette');
    const transferredTeam = Team.fromMember(transferredReceiver);
    transferredTeam.setMember(1, transferredCarrier);
    transferredCarrier.setCharLevels({level: 90, ascension: 6, constellation: 2});
    // Odette's own stacks stay hers; the transferred stacks are a separate
    // count held by the other members.
    transferredCarrier.setCharSettings({odette_marvelous_splendor: 4});
    expect(finalStats(transferredReceiver).get("dmg_stellarglimmer")).toBe(0);
    expect(finalStats(transferredCarrier).get("dmg_stellarglimmer")).toBeCloseTo(0.6, 10);
    transferredCarrier.setCharSettings({odette_marvelous_splendor: 1, odette_marvelous_splendor_others: 3});
    expect(finalStats(transferredReceiver).get("dmg_stellarglimmer")).toBeCloseTo(0.45, 10);
    // C2 ATK per stack (3 stacks * 7%): receiver base atk_percent is 0 in makeBuild.
    expect(finalStats(transferredReceiver).get("atk_percent")).toBeCloseTo(0.21, 10);
    expect(finalStats(transferredCarrier).get("dmg_stellarglimmer")).toBeCloseTo(0.15, 10);

    expect(getCondition("odette_marvelous_splendor").getBuffRotationSection()).toBe("self");
    expect(getCondition("odette_marvelous_splendor_others").getBuffRotationSection()).toBe("self");
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

    // Party model retired: Swirl radiance base (no polestar needed) delivers to a real team.
    const radianceReceiver = makeBuild('Ayaka');
    const radianceCarrier = makeBuild('Odette');
    const radianceTeam = Team.fromMember(radianceReceiver);
    radianceTeam.setMember(1, radianceCarrier);
    radianceCarrier.setCharSettings({odette_radiance_stellarswirl: true});
    const carrierStats = finalStats(radianceCarrier);
    radianceCarrier.modifyBuffsSettings({
        'custom_buffs.atk': 1000 - carrierStats.get('atk_base') - carrierStats.get('atk'),
    });
    expect(finalStats(radianceReceiver).get("stellarglimmer_multi")).toBeCloseTo(0.07, 5);

});

test("Snow Swan uses generated burst p3, C4 grants half, and C5 adds three levels", () => {
    const self = new BuildData({
        char_skill_burst: 1,
        odette_snow_swans_dream: true,
    }, {});
    applyConditions(self, Odette.getConditions());
    expect(self.stats.get("dmg_stellarglimmer")).toBe(charTalentTables.Odette.s3.p3[0]);

    const selfC5 = new BuildData({
        char_constellation: 5,
        char_skill_burst: 10,
        odette_snow_swans_dream: true,
    }, {});
    applyConditions(selfC5, Odette.getConditions());
    expect(selfC5.settings.char_skill_burst_bonus).toBe(3);
    // Standalone BuildData applies both SELF (100%) and OTHERS (50%) since receivers
    // need a team to exclude the source; real-team self coverage is below via snowTeam.
    // Keep the canonical 100% reference for the SELF branch by subtracting the OTHERS half.
    expect(selfC5.stats.get("dmg_stellarglimmer") - charTalentTables.Odette.s3.p3[12] * 0.5)
        .toBe(charTalentTables.Odette.s3.p3[12]);

    // Party model retired: C4 team half now delivers to real teams (live burst, C5 included).
    function snowTeam(burst, constellation) {
        const receiver = makeBuild('Ayaka');
        const carrier = makeBuild('Odette');
        const team = Team.fromMember(receiver);
        team.setMember(1, carrier);
        carrier.setCharLevels({level: 90, ascension: 6, constellation});
        carrier.setCharSkills({attack: 10, elemental: 10, burst});
        carrier.setCharSettings({odette_snow_swans_dream: true});
        return finalStats(receiver).get("dmg_stellarglimmer");
    }
    expect(snowTeam(1, 4)).toBeCloseTo(charTalentTables.Odette.s3.p3[0] * 0.5 / 100, 10);
    expect(snowTeam(10, 4)).toBeCloseTo(charTalentTables.Odette.s3.p3[9] * 0.5 / 100, 10);
    expect(snowTeam(10, 5)).toBeCloseTo(charTalentTables.Odette.s3.p3[12] * 0.5 / 100, 10);

    // Party C5 ID 12 is retired now that the source's live burst carries the bonus.
    const retiredC5 = Odette.getLegacyPartyConditions().find((condition) => condition.getId() === 12);
    expect(retiredC5).toBeDefined();
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

    // Party model retired: C2 Swirl shred now delivers to a real team (no polestar needed).
    const shredReceiver = makeBuild('Ayaka');
    const shredCarrier = makeBuild('Odette');
    const shredTeam = Team.fromMember(shredReceiver);
    shredTeam.setMember(1, shredCarrier);
    shredCarrier.setCharLevels({level: 90, ascension: 6, constellation: 2});
    shredCarrier.setCharSettings({
        odette_solo_dance_double: true,
        odette_radiance_stellarswirl: true,
    });
    expect(enemyChange(shredReceiver, "enemy_res_cryo")).toBeCloseTo(-0.2, 10);
    expect(enemyChange(shredReceiver, "enemy_res_anemo")).toBeCloseTo(-0.2, 10);
});

test("C6 applies 25% to the modeled all-party Splendor state plus 20% to Odette", () => {
    const c6 = new BuildData({
        char_ascension: 1,
        char_constellation: 6,
        odette_all_party_marvelous_splendor: true,
    }, {});
    applyConditions(c6, localConditions(6));
    expect(c6.stats.get("dmg_stellarglimmer_special")).toBe(45);
    expect(getCondition("odette_all_party_marvelous_splendor").getBuffRotationSection()).toBe("self");

    const noAllPartyState = new BuildData({char_constellation: 6}, {});
    applyConditions(noAllPartyState, localConditions(6));
    expect(noAllPartyState.stats.get("dmg_stellarglimmer_special")).toBe(20);

    // Party model retired: C6 25% now delivers to a real team (fraction 0.25).
    const c6Receiver = makeBuild('Ayaka');
    const c6Carrier = makeBuild('Odette');
    const c6Team = Team.fromMember(c6Receiver);
    c6Team.setMember(1, c6Carrier);
    c6Carrier.setCharLevels({level: 90, ascension: 6, constellation: 6});
    c6Carrier.setCharSettings({odette_all_party_marvelous_splendor: true});
    expect(finalStats(c6Receiver).get("dmg_stellarglimmer_special")).toBeCloseTo(0.25, 10);
});

test("supplied C6 URL restores the all-party Splendor state as 45% elevation", () => {
    const previousDB = global.DB;
    global.DB = DB;

    try {
        const build = CalcSet.deserialize(Serializer.unpack(
            "bEwDwggkkkebcdibbabaaabcbagrcEvaExaCsCtmDagCpdCyhdaadaaa",
        ));
        Team.fromMember(build);

        expect(build.char.getId()).toBe(Odette.getId());
        expect(build.char.getSettings()).toMatchObject({
            odette_all_party_marvelous_splendor: true,
        });
        expect(build.char.getSettings()).not.toHaveProperty("odette_marvelous_splendor");
        const data = build.getBuildData();
        expect(data.settings.char_skill_burst_bonus).toBe(3);
        expect(data.stats.get("dmg_stellarglimmer")).toBe(0.62);
        expect(data.stats.get("dmg_stellarglimmer_special")).toBe(0.45);
    } finally {
        global.DB = previousDB;
    }
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
    // Party C6 retired now that the source toggle delivers to the team.
});
