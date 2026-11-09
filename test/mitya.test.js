import { BuildData } from "../src/js/classes/Build/Data";
import { Mitya } from "../src/js/db/Char/Mitya";
import { DB } from "../src/js/db/DB";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";

function applyConditions(data, conditions) {
    for (const condition of conditions) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
}

function localConditions(constellation = 0) {
    return Mitya.getConditions().concat(Mitya.constellation.getConditions(constellation));
}

function getFeature(name) {
    return Mitya.getFeatures().find((feature) => feature.getName() === name);
}

function makeData(settings = {}, stats = {}) {
    return new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_electro: 0,
        char_skill_attack: 1,
        char_skill_elemental: 1,
        char_skill_burst: 1,
        ...settings,
    }, {
        atk_base: 1000,
        mastery: 100,
        ...stats,
    });
}

function getDamage(name, settings = {}, stats = {}) {
    return getFeature(name).getResult(makeData(settings, stats))[name];
}

// Stellar-Conduct DMG Bonus from Elemental Mastery: 6 * EM / (EM + 2000).
function stellarMastery(mastery) {
    return 1 + 6 * mastery / (mastery + 2000);
}

const overloaded = {mitya_detection_core: 'overloaded', mitya_gradient_beacons: 1};
const steady = {mitya_detection_core: 'steady'};

test("Mitya is character 129 and is available by default", () => {
    expect(DB.Chars.get("Mitya")).toBe(Mitya);
    expect(DB.Chars.getById(129)).toBe(Mitya);
    expect(DB.Chars.getByGameId(10000136)).toBe(Mitya);
    expect(DB.Chars.getKeys()).toContain("Mitya");
    expect(Mitya.getId()).toBe(129);
    expect(Mitya.getGameId()).toEqual([10000136]);
    expect(Mitya.element).toBe("electro");
    expect(Mitya.weapon).toBe("catalyst");
    const ids = DB.Chars.getKeys(true).map((key) => DB.Chars.get(key).getId());
    expect(new Set(ids).size).toBe(ids.length);
});

test("Detection Core dropdowns get their own full-width control line", () => {
    const dropdowns = [
        Mitya.getConditions().find((condition) => condition.getName() === "mitya_detection_core"),
        Mitya.getPartyConditions().find((condition) => condition.getName() === "party.mitya_detection_core"),
    ];
    for (const dropdown of dropdowns) {
        expect(dropdown.getType()).toBe("dropdown");
        expect(dropdown.params.dropdownClass).toBe("medium-text");
        expect(dropdown.params.separateControlLine).toBe(true);
        expect(dropdown.getDropdownItems({}).map((item) => [item.value, item.title_str])).toEqual([
            ["steady", "talent_name.mitya_detection_core_steady"],
            ["overloaded", "talent_name.mitya_detection_core_overloaded"],
        ]);
    }
});

test("generated tables keep the 7.2 Chain Reaction, Variable Detection and Gradient Theory rows", () => {
    expect(charTalentTables.Mitya.s1_id).toBe(11361);
    expect(charTalentTables.Mitya.s2_id).toBe(11362);
    expect(charTalentTables.Mitya.s3_id).toBe(11364);
    expect(charTalentTables.Mitya.s1.p9[0]).toBe(168);
    expect(charTalentTables.Mitya.s1.p10[0]).toBe(224);
    expect([
        charTalentTables.Mitya.s2.p3[0],
        charTalentTables.Mitya.s2.p4[0],
        charTalentTables.Mitya.s2.p5[0],
    ]).toEqual([72, 80, 92]);
    expect(charTalentTables.Mitya.s3.p1[0]).toBe(333.6);
    expect(charTalentTables.Mitya.s3.p2[0]).toBe(667.2);
});

test("Gradient Theory scales with both ATK and Elemental Mastery", () => {
    const result = getDamage("burst.burst_dmg");
    expect(result.normal).toBeCloseTo((3.336 * 1000 + 6.672 * 100) * 0.5, 5);
});

test("Gradient Detonation needs an Overloaded core and a Beacon", () => {
    expect(getFeature("attack.mitya_gradient_detonation").getResult(makeData())).toEqual({});
    expect(getFeature("attack.mitya_gradient_detonation").getResult(makeData({
        mitya_detection_core: 'overloaded',
        mitya_gradient_beacons: 0,
    }))).toEqual({});
    expect(getFeature("attack.mitya_gradient_detonation_stellarconduct").getResult(makeData({
        mitya_detection_core: 'steady',
        mitya_gradient_beacons: 2,
    }))).toEqual({});

    const ordinary = getDamage("attack.mitya_gradient_detonation", overloaded);
    expect(ordinary.normal).toBeCloseTo(1.68 * 1000 * 0.5, 5);

    const feature = getFeature("attack.mitya_gradient_detonation_stellarconduct");
    const stellar = getDamage("attack.mitya_gradient_detonation_stellarconduct", overloaded);
    expect(feature.getDamageType()).toBe("stellarconduct");
    expect(stellar.normal).toBeCloseTo(2.24 * 100 * stellarMastery(100), 5);
    expect(stellar.isReacted).toBe(false);
});

test("Steady State core rows are EM-based Stellar-Conduct and C6 makes them 115%", () => {
    expect(getDamage("skill.mitya_steady_state_core", steady).normal)
        .toBeCloseTo(0.72 * 1000 * 0.5, 5);
    expect(getDamage("skill.mitya_steady_state_core_beacon_stellarconduct", steady).normal)
        .toBeCloseTo(0.8 * 100 * stellarMastery(100), 5);

    const detonation = getDamage("skill.mitya_steady_state_core_detonation_stellarconduct", {
        ...steady,
        mitya_gradient_beacons: 4,
    });
    expect(detonation.normal).toBeCloseTo(0.92 * 100 * 4 * stellarMastery(100), 5);

    const c6 = {char_constellation: 6};
    expect(getDamage("skill.mitya_steady_state_core", {...steady, ...c6}).normal)
        .toBeCloseTo(0.72 * 1000 * 0.5 * 1.15, 5);
    expect(getDamage("skill.mitya_steady_state_core_detonation_stellarconduct", {
        ...steady,
        ...c6,
        mitya_gradient_beacons: 4,
    }).normal).toBeCloseTo(0.92 * 100 * 4 * 1.15 * stellarMastery(100), 5);
    // The Overloaded core does not get the Steady State multiplier.
    expect(getDamage("attack.mitya_gradient_detonation", {...overloaded, ...c6}).normal)
        .toBeCloseTo(1.68 * 1000 * 0.5, 5);
});

test("Top-Secret Protocol adds capped Base Stellar-Conduct DMG from Mitya's EM", () => {
    for (const [mastery, expected] of [[250, 0.07], [500, 0.14], [800, 0.14]]) {
        const selfData = new BuildData({}, {mastery});
        selfData.postEffects = Mitya.getPostEffects();
        selfData.applyPostEffects();
        expect(selfData.stats.get("stellarconduct_multi")).toBeCloseTo(expected, 5);

        const partyData = new BuildData({}, {mitya_mastery_total: mastery});
        partyData.postEffects = Mitya.getPartyPostEffects();
        partyData.applyPostEffects();
        expect(partyData.stats.get("stellarconduct_multi")).toBeCloseTo(expected, 5);
    }
});

test("Baseline Stress Test gives Steady State EM per Beacon and C1 raises the Beacon cap", () => {
    const data = makeData({
        char_ascension: 1,
        mitya_detection_core: 'steady',
        mitya_gradient_beacons: 5,
    }, {mastery: 0});
    applyConditions(data, localConditions(0));
    expect(data.settings.mitya_gradient_beacons).toBe(4);
    expect(data.stats.get("mastery")).toBe(120);

    const c1 = makeData({
        char_ascension: 1,
        char_constellation: 1,
        mitya_detection_core: 'steady',
        mitya_gradient_beacons: 5,
    }, {mastery: 0});
    applyConditions(c1, localConditions(1));
    expect(c1.stats.get("mastery")).toBe(150);

    const overloadedData = makeData({
        char_ascension: 1,
        mitya_detection_core: 'overloaded',
        mitya_gradient_beacons: 4,
    }, {mastery: 0});
    applyConditions(overloadedData, localConditions(0));
    expect(overloadedData.stats.get("mastery")).toBe(0);
});

test("Safe Limits Exceeded stacks CRIT Rate up to four times", () => {
    const data = makeData({char_ascension: 4, mitya_safe_limits_exceeded: 6});
    applyConditions(data, localConditions(0));
    expect(data.stats.get("crit_rate")).toBe(20);
});

test("C1 and C2 core effects follow the Detection Core state", () => {
    const steadyData = makeData({
        char_constellation: 2,
        mitya_detection_core: 'steady',
        mitya_the_observer_seeking_what_is_missing: true,
        polestar_field: true,
    }, {mastery: 0});
    applyConditions(steadyData, localConditions(2));
    expect(steadyData.stats.get("crit_dmg")).toBe(40);
    expect(steadyData.stats.get("mastery")).toBe(123);
    expect(steadyData.stats.get("enemy_res_cryo")).toBe(-20);
    expect(steadyData.stats.get("enemy_res_electro")).toBe(-20);

    const overloadedData = makeData({
        char_constellation: 2,
        mitya_detection_core: 'overloaded',
        mitya_the_matter_that_slumbers_beyond_inertness: true,
    }, {mastery: 0});
    applyConditions(overloadedData, localConditions(2));
    expect(overloadedData.stats.get("mastery")).toBe(234);
    expect(overloadedData.stats.get("enemy_res_electro")).toBe(0);

    const noCore = makeData({
        char_constellation: 2,
        mitya_the_observer_seeking_what_is_missing: true,
        polestar_field: true,
    }, {mastery: 0});
    applyConditions(noCore, localConditions(2));
    expect(noCore.stats.get("crit_dmg")).toBe(0);
    expect(noCore.stats.get("enemy_res_electro")).toBe(0);
});

test("C4 Detection Core pulse is 300% EM Stellar-Conduct DMG and C6 Elevates Stellar-Conduct", () => {
    expect(getFeature("other.mitya_the_isotopes_born_of_decay_stellarconduct")
        .getResult(makeData({char_constellation: 4}))).toEqual({});
    const pulse = getDamage("other.mitya_the_isotopes_born_of_decay_stellarconduct", {
        char_constellation: 4,
        mitya_detection_core: 'steady',
    });
    expect(pulse.normal).toBeCloseTo(3 * 100 * stellarMastery(100), 5);

    const data = makeData({char_constellation: 6});
    applyConditions(data, localConditions(6));
    expect(data.stats.get("dmg_stellarconduct_special")).toBe(20);
});

test("party Mitya converts Superconduct and shares Beacon, C1, C2 and C6 effects", () => {
    const data = makeData({
        "party.mitya_detection_core": 'steady',
        "party.mitya_gradient_beacons": 5,
        "party.mitya_the_observer_seeking_what_is_missing": true,
        "party.mitya_the_matter_that_slumbers_beyond_inertness": true,
        "party.mitya_elemental_transition_at_the_gate_of_reason": true,
        polestar_field: true,
    }, {mastery: 0});
    applyConditions(data, Mitya.getPartyConditions());

    expect(data.settings.allowed_stellarconduct).toBe(1);
    expect(data.stats.get("mastery")).toBe(150 + 123);
    expect(data.stats.get("crit_dmg")).toBe(40);
    expect(data.stats.get("enemy_res_cryo")).toBe(-20);
    expect(data.stats.get("enemy_res_electro")).toBe(-20);
    expect(data.stats.get("dmg_stellarconduct_special")).toBe(20);

    const overloadedParty = makeData({
        "party.mitya_detection_core": 'overloaded',
        "party.mitya_gradient_beacons": 5,
        "party.mitya_the_matter_that_slumbers_beyond_inertness": true,
    }, {mastery: 0});
    applyConditions(overloadedParty, Mitya.getPartyConditions());
    expect(overloadedParty.stats.get("mastery")).toBe(234);
});
