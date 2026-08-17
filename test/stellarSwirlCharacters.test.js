import { BuildData } from "../src/js/classes/Build/Data";
import { CalcSet } from "../src/js/classes/CalcSet";
import { Serializer } from "../src/js/classes/Serializer";
import { FeatureDamageStellarConduct } from "../src/js/classes/Feature2/Damage/StellarConduct";
import { FeatureDamageStellarSwirl } from "../src/js/classes/Feature2/Damage/StellarSwirl";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { StatTable } from "../src/js/classes/StatTable";
import { Diona } from "../src/js/db/Char/Diona";
import { Ifa } from "../src/js/db/Char/Ifa";
import { Mizuki } from "../src/js/db/Char/Mizuki";
import { Qiqi } from "../src/js/db/Char/Qiqi";
import { Sandrone } from "../src/js/db/Char/Sandrone";
import { Reactions } from "../src/js/db/Features/Reactions";
import { DB } from "../src/js/db/DB";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";

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

test("Cryo Swirl consumes its element-specific bonus and Diona branches by exclusive Radiance mode", () => {
    const cryoSwirl = Reactions.find((feature) => feature.getName() === "reaction.swirl_cryo");
    expect(cryoSwirl.getStatsReactionBonus()).toContain("dmg_reaction_swirl_cryo");

    const swirlData = new BuildData({
        char_constellation: 6,
        diona_radiance_stellarswirl: true,
        diona_cats_tail_radiance: true,
    }, {});
    applyConditions(swirlData, Diona.getAllConditions());

    expect(swirlData.stats.get("dmg_reaction_swirl_cryo")).toBe(40);
    expect(swirlData.stats.get("dmg_stellarswirl")).toBe(40);
    expect(swirlData.stats.get("dmg_stellarconduct")).toBe(0);

    const priorityData = new BuildData({
        char_constellation: 6,
        diona_radiance_stellarconduct: true,
        diona_radiance_stellarswirl: true,
        diona_cats_tail_radiance: true,
    }, {});
    applyConditions(priorityData, Diona.getAllConditions());

    expect(priorityData.stats.get("dmg_stellarconduct")).toBe(40);
    expect(priorityData.stats.get("dmg_stellarswirl")).toBe(0);
});

test("Qiqi C6 umbrella flat damage reaches each direct subtype exactly once", () => {
    const features = [FeatureDamageStellarConduct, FeatureDamageStellarSwirl].map((Damage) => new Damage({
        category: "skill",
        element: "cryo",
        multipliers: [
            new FeatureMultiplier({
                values: new StatTable("qiqi_stellar_test", [100]),
            }),
        ],
    }));

    for (const feature of features) {
        const data = new BuildData({
            enemy_res_cryo: 0,
            "party.qiqi_glimpse_of_mystery": 1,
        }, {
            atk_base: 1000,
            qiqi_atk_total: 1000,
        });
        data.multipliers = Qiqi.getPartyMultipliers();

        expect(feature.getResult(data)["skill.qiqi_stellar_test"].normal).toBeCloseTo(7000, 5);
    }
});

test("Mizuki normalizes per-100-EM skill tables without a 100x reaction buff", () => {
    expect(charTalentTables.Mizuki.s2.p2[0]).toBe(18);
    expect(charTalentTables.Mizuki.s2.p6[0]).toBe(1.8);

    const data = new BuildData({
        char_skill_elemental: 1,
        mizuki_dreamdrifter: true,
    }, {
        mastery: 1000,
    });
    data.postEffects = Mizuki.getPostEffects();
    data.applyPostEffects();

    expect(data.stats.get("dmg_reaction_swirl")).toBeCloseTo(1.8, 5);
    expect(data.stats.get("dmg_stellarswirl")).toBeCloseTo(0.18, 5);
});

test("Mizuki C1 uses 1100/550 flat reaction ratios and swaps its extra hit under Swirl Radiance", () => {
    const ordinaryFlat = Mizuki.getMultipliers().find((item) => item.target.tags.includes("swirl"));
    const stellarFlat = Mizuki.getMultipliers().find((item) => item.target.tags.includes("stellarswirl_immediate"));
    expect(ordinaryFlat.values.getValue(1)).toBe(1100);
    expect(stellarFlat.values.getValue(1)).toBe(550);

    const ordinary = getFeature(Mizuki, "other.mizuki_moonlit_dream_attack");
    const stellar = getFeature(Mizuki, "other.mizuki_moonlit_dream_stellarswirl");
    const normalData = new BuildData({
        char_constellation: 1,
        mizuki_dreamdrifter: true,
        mizuki_in_mist_like_waters: true,
    }, {});
    const stellarData = new BuildData({
        char_constellation: 1,
        mizuki_dreamdrifter: true,
        mizuki_in_mist_like_waters: true,
        mizuki_radiance_stellarswirl: true,
    }, {});

    expect(ordinary.isActive(normalData)).toBe(true);
    expect(stellar.isActive(normalData)).toBe(false);
    expect(ordinary.isActive(stellarData)).toBe(false);
    expect(stellar.isActive(stellarData)).toBe(true);
    expect(stellar.multipliers[0].values.getValue(1)).toBe(400);
});

test("Mizuki pending 6.7 effects cover Vast, C2 RES, C4 healing, and capped C6 self CRIT", () => {
    const vast = getFeature(Mizuki, "other.mizuki_vast_be_the_dream_dmg");
    const vastStellar = getFeature(Mizuki, "other.mizuki_vast_be_the_dream_stellarswirl");
    const vastData = new BuildData({
        mizuki_dreamdrifter: true,
        mizuki_vast_be_the_dream: true,
        mizuki_radiance_stellarswirl: true,
    }, {});
    expect(vast.isActive(vastData)).toBe(true);
    expect(vastStellar.isActive(vastData)).toBe(true);
    expect(vastStellar.multipliers[0].values.getValue(1)).toBe(1000);

    const vastCondition = Mizuki.getAllConditions().find((condition) =>
        condition.getName() === 'mizuki_vast_be_the_dream'
    );
    const radianceCondition = Mizuki.getAllConditions().find((condition) =>
        condition.getName() === 'mizuki_radiance_stellarswirl'
    );
    expect(vastCondition.params.description)
        .toBe('talent_descr.yumemizuki_mizuki_vast_be_the_dream_1');
    expect(radianceCondition.params.title).toBe('talent_name.radiance_stellarswirl');
    expect(radianceCondition.params.description)
        .toBe('talent_descr.yumemizuki_mizuki_vast_be_the_dream_2');
    expect(Mizuki.getAllConditions().find((condition) =>
        condition.params.description === 'talent_descr.yumemizuki_mizuki_vast_be_the_dream_3'
    ).getType()).toBe('static');

    const c2Data = new BuildData({
        char_constellation: 2,
        mizuki_dreamdrifter: true,
    }, {});
    applyConditions(c2Data, Mizuki.getAllConditions());
    for (const element of ["pyro", "hydro", "cryo", "electro", "anemo"]) {
        expect(c2Data.stats.get(`enemy_res_${element}`)).toBe(-20);
    }

    const c4Heal = getFeature(Mizuki, "other.mizuki_buds_warm_lucid_springs_heal");
    expect(c4Heal.multipliers[0].values.getValue(1)).toBe(266);

    for (const [mastery, critRate, critDmg] of [[500, 0, 0], [1000, 0.2, 0.8], [2000, 0.2, 0.8]]) {
        const critData = new BuildData({
            char_constellation: 6,
            mizuki_dreamdrifter: true,
        }, {mastery});
        critData.postEffects = Mizuki.getPostEffects();
        critData.applyPostEffects();
        expect(critData.stats.get("crit_rate")).toBeCloseTo(critRate, 5);
        expect(critData.stats.get("crit_dmg")).toBeCloseTo(critDmg, 5);
    }
});

test("Mizuki party data shares 10% EM and fixed 30/100 versus 10/20 subtype CRIT", () => {
    const selfData = new BuildData({
        mizuki_dreamdrifter: true,
    }, {
        mastery: 1155,
    });
    selfData.postEffects = Mizuki.getPostEffects();
    selfData.applyPostEffects();
    expect(selfData.stats.get("mastery")).toBeCloseTo(1270.5, 5);

    const data = new BuildData({
        "party.mizuki_dreamdrifter": true,
        "party.mizuki_the_heart_lingers_long": true,
    }, {
        mizuki_mastery: 1000,
    });
    applyConditions(data, Mizuki.getPartyConditions());
    data.postEffects = Mizuki.getPartyPostEffects();
    data.applyPostEffects();

    expect(data.stats.get("mastery")).toBe(100);
    expect(data.stats.get("crit_rate_swirl")).toBe(30);
    expect(data.stats.get("crit_dmg_swirl")).toBe(100);
    expect(data.stats.get("crit_rate_stellarswirl")).toBe(10);
    expect(data.stats.get("crit_dmg_stellarswirl")).toBe(20);
});

test("supplied Mizuki URL applies Vast's self EM effect", () => {
    const previousDB = global.DB;
    global.DB = DB;

    try {
        const build = CalcSet.deserialize(Serializer.unpack(
            "bDxDwgakkkebcefBrbabaaabcbaerdEvbbbExaEwcdgDagCpdCyhdaadaaa",
        ));
        const data = build.getBuildData();
        data.applyPostEffects();

        expect(build.char.getSettings()).toMatchObject({
            mizuki_dreamdrifter: true,
            mizuki_vast_be_the_dream: true,
        });
        expect(data.stats.getTotal("mastery")).toBeCloseTo(236.72, 5);
    } finally {
        global.DB = previousDB;
    }
});

test("Sandrone Swirl direct tables and constellation rows stay exactly 1.5x Conduct", () => {
    for (let level = 0; level < charTalentTables.Sandrone.s1.p6.length; ++level) {
        expect(charTalentTables.Sandrone.s1.p11[level]).toBeCloseTo(charTalentTables.Sandrone.s1.p6[level] * 1.5, 3);
        expect(charTalentTables.Sandrone.s2.p4[level]).toBeCloseTo(charTalentTables.Sandrone.s2.p2[level] * 1.5, 3);
        expect(charTalentTables.Sandrone.s3.p6[level]).toBeCloseTo(charTalentTables.Sandrone.s3.p3[level] * 1.5, 3);
    }

    const cannonConduct = getFeature(Sandrone, "other.sandrone_prismatic_resonance_cannon_stellarconduct");
    const cannonSwirl = getFeature(Sandrone, "other.sandrone_prismatic_resonance_cannon_stellarswirl");
    const clusterConduct = getFeature(Sandrone, "attack.sandrone_condensed_cluster_beam_stellarconduct");
    const clusterSwirl = getFeature(Sandrone, "attack.sandrone_condensed_cluster_beam_stellarswirl");
    expect(cannonSwirl.multipliers[0].values.getValue(1)).toBe(cannonConduct.multipliers[0].values.getValue(1) * 1.5);
    expect(clusterSwirl.multipliers[0].values.getValue(1)).toBe(clusterConduct.multipliers[0].values.getValue(1) * 1.5);
});

test("Sandrone uses umbrella base/additive/elevation stats and Conduct priority", () => {
    const data = new BuildData({
        char_constellation: 6,
        sandrone_morrow_after_the_golden_dusk: true,
        sandrone_decoding: true,
        sandrone_radiance_stellarconduct: true,
        sandrone_radiance_stellarswirl: true,
    }, {
        atk_base: 2000,
    });
    applyConditions(data, Sandrone.getAllConditions());
    data.postEffects = Sandrone.getPostEffects();
    data.applyPostEffects();

    expect(data.stats.get("dmg_stellarglimmer")).toBe(30);
    expect(data.stats.get("stellarglimmer_multi")).toBeCloseTo(0.14, 5);
    expect(data.stats.get("dmg_stellarglimmer_special")).toBe(20);
    expect(getFeature(Sandrone, "attack.sandrone_condensed_beam_stellarconduct").isActive(data)).toBe(true);
    expect(getFeature(Sandrone, "attack.sandrone_condensed_beam_stellarswirl").isActive(data)).toBe(false);
});

test("Ifa Rescue Essentials adds a separate 0.24% Stellar Swirl bonus per point", () => {
    const data = new BuildData({
        char_ascension: 1,
        "common.nightsoul_blessing_state": true,
        ifa_field_medics_vision: 150,
    }, {
        ifa_field_medics_vision: 150,
    });
    data.postEffects = Ifa.getPostEffects();
    data.applyPostEffects();

    expect(data.stats.get("dmg_reaction_swirl")).toBeCloseTo(2.25, 5);
    expect(data.stats.get("dmg_reaction_lunarcharged")).toBeCloseTo(0.3, 5);
    expect(data.stats.get("dmg_stellarswirl")).toBeCloseTo(0.36, 5);
});
