import { BuildData } from "../src/js/classes/Build/Data";
import { loadLegacyTeam } from "../src/js/classes/Legacy/Team";
import { Team } from "../src/js/classes/Team";
import { Mitya } from "../src/js/db/Char/Mitya";
import { DB } from "../src/js/db/DB";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";
import { enemyChange, featureValues, finalStats, makeBuild, makeSolo, pinStats, totalMastery } from "./support/team";

global.DB = DB;
global.UI ||= {Lang: {get: () => ''}};

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

/**
 * Mitya next to a receiver on the field.
 *
 * @returns {{team: Team, receiver: CalcSet, mitya: CalcSet}}
 */
function teamWithMitya(constellation, settings, receiverKey = 'Keqing') {
    const receiver = makeBuild(receiverKey);
    const mitya = makeBuild('Mitya');
    mitya.setCharLevels({level: 90, ascension: 6, constellation});
    mitya.setCharSettings(settings);
    const team = Team.fromMember(receiver);
    team.setMember(1, mitya);
    return {team, receiver, mitya};
}

/**
 * What Mitya's controls give the members: their final stats with them
 * against the same team with his controls off.
 *
 * @param {number} constellation
 * @param {Object} settings his controls
 * @param {Object} [teamSettings] the team's toggles
 * @param {string} [onField] the member on the field: receiver or mitya
 * @returns {{receiver: Function, mitya: Function, members: Object}} the
 *     change of a stat per member, and the team with the controls on
 */
function shared(constellation, settings, teamSettings = {}, onField = 'receiver') {
    const make = (controls) => {
        const result = teamWithMitya(constellation, controls);
        result.team.modifySettings(teamSettings);
        result.team.setOnFieldMember(result[onField]);
        return result;
    };
    const off = make({});
    const on = make(settings);
    const change = (member) => {
        const before = finalStats(off[member]);
        const after = finalStats(on[member]);
        const result = (stat) => after.get(stat) - before.get(stat);
        result.mastery = () => totalMastery(after) - totalMastery(before);
        result.enemy = (stat) => enemyChange(on[member], stat, after);
        return result;
    };
    return {receiver: change('receiver'), mitya: change('mitya'), members: on};
}

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

test("the Detection Core dropdown gets its own full-width control line", () => {
    // One control for the team: the released party row's copy is retired.
    const dropdown = Mitya.getConditions().find((condition) => condition.getName() === "mitya_detection_core");
    expect(dropdown.getType()).toBe("dropdown");
    expect(dropdown.params.dropdownClass).toBe("medium-text");
    expect(dropdown.params.separateControlLine).toBe(true);
    expect(dropdown.getDropdownItems({}).map((item) => [item.value, item.title_str])).toEqual([
        ["steady", "talent_name.mitya_detection_core_steady"],
        ["overloaded", "talent_name.mitya_detection_core_overloaded"],
    ]);

    expect(Mitya.partyData).toBeUndefined();
    expect(Mitya.getLegacyPartyConditions().map((condition) => condition.getId())).toEqual([1, 2, 3, 4, 5, 6]);
    expect(Mitya.getLegacyPartyConditions().every((condition) => condition.isRetired())).toBe(true);
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

        // "All nearby party members": from his Elemental Mastery, for everyone.
        const {receiver, mitya} = teamWithMitya(0, {});
        pinStats([[mitya, 'mastery', mastery]]);
        expect(finalStats(mitya).get("stellarconduct_multi")).toBeCloseTo(expected, 8);
        expect(finalStats(receiver).get("stellarconduct_multi")).toBeCloseTo(expected, 8);
    }
});

test("Top-Secret Protocol counts the Elemental Mastery his own effects give him", () => {
    // It reads his total (md/buff_chains.md): the 30 per Gradient Beacon of
    // his first ascension passive in the Steady State are part of it.
    const {receiver, mitya} = teamWithMitya(0, {});
    pinStats([[mitya, 'mastery', 200]]);
    expect(finalStats(receiver).get("stellarconduct_multi")).toBeCloseTo(0.056, 8);
    mitya.setCharSettings({mitya_detection_core: 'steady', mitya_gradient_beacons: 4});
    expect(totalMastery(finalStats(mitya))).toBeCloseTo(320, 8);
    expect(finalStats(receiver).get("stellarconduct_multi")).toBeCloseTo(0.0896, 8);
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
    const mitya = makeSolo('Mitya');
    const base = finalStats(mitya).get("crit_rate");
    for (const [stacks, expected] of [[1, 0.05], [4, 0.2], [6, 0.2]]) {
        mitya.setCharSettings({mitya_safe_limits_exceeded: stacks});
        const stats = finalStats(mitya);
        expect(stats.get("crit_rate") - base).toBeCloseTo(expected, 10);
        // Game data: Actor_CriticalExtraDelta, the extra part of the stat
        // (md/buff_chains.md), so an effect that reads CRIT Rate premod does
        // not count it.
        expect(stats.get("crit_rate_extra")).toBeCloseTo(expected, 10);
        expect(mitya.getBuildData().stats.get("crit_rate")).toBeCloseTo(base, 10);
    }

    // The passive is his fourth ascension's.
    mitya.setCharLevels({level: 60, ascension: 3, constellation: 0});
    expect(finalStats(mitya).get("crit_rate_extra")).toBe(0);
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

const steadyTeam = {
    mitya_detection_core: 'steady',
    mitya_gradient_beacons: 5,
    mitya_the_observer_seeking_what_is_missing: true,
};

test("Mitya converts Superconduct and shares Beacon, C1, C2 and C6 effects with the team", () => {
    const {receiver, mitya, members} = shared(6, steadyTeam, {polestar_field: true});

    expect(members.receiver.getBuildData().settings.allowed_stellarconduct).toBe(1);
    // Steady State: 30 per Beacon and C2's 123 for all nearby party members.
    expect(receiver.mastery()).toBeCloseTo(150 + 123, 8);
    expect(mitya.mastery()).toBeCloseTo(150 + 123, 8);
    // C1: "your own active character", the receiver here.
    expect(receiver("crit_dmg")).toBeCloseTo(0.4, 10);
    expect(mitya("crit_dmg")).toBeCloseTo(0, 10);
    expect(receiver.enemy("enemy_res_cryo")).toBeCloseTo(-0.2, 10);
    expect(receiver.enemy("enemy_res_electro")).toBeCloseTo(-0.2, 10);
    // C6 has no control: it is his sixth constellation.
    expect(finalStats(members.receiver).get("dmg_stellarconduct_special")).toBeCloseTo(0.2, 10);
    expect(finalStats(members.mitya).get("dmg_stellarconduct_special")).toBeCloseTo(0.2, 10);
});

test("the effects for the active character follow the member on the field", () => {
    const steadyOnMitya = shared(6, steadyTeam, {polestar_field: true}, 'mitya');
    expect(steadyOnMitya.mitya("crit_dmg")).toBeCloseTo(0.4, 10);
    expect(steadyOnMitya.receiver("crit_dmg")).toBeCloseTo(0, 10);
    // The Steady State's Elemental Mastery is everyone's, wherever they are.
    expect(steadyOnMitya.receiver.mastery()).toBeCloseTo(150 + 123, 8);

    const overloadedTeam = {
        mitya_detection_core: 'overloaded',
        mitya_gradient_beacons: 5,
        mitya_the_matter_that_slumbers_beyond_inertness: true,
    };
    // Overloaded: 234 for the active character only, and no Beacon bonus.
    const onReceiver = shared(6, overloadedTeam);
    expect(onReceiver.receiver.mastery()).toBeCloseTo(234, 8);
    expect(onReceiver.mitya.mastery()).toBeCloseTo(0, 8);
    const onMitya = shared(6, overloadedTeam, {}, 'mitya');
    expect(onMitya.receiver.mastery()).toBeCloseTo(0, 8);
    expect(onMitya.mitya.mastery()).toBeCloseTo(234, 8);
});

test("the team's shares need his constellations, a core and the Polestar Field", () => {
    // No Polestar Field: no RES decrease.
    const noField = shared(6, steadyTeam);
    expect(noField.receiver.enemy("enemy_res_cryo")).toBeCloseTo(0, 10);
    expect(noField.receiver.enemy("enemy_res_electro")).toBeCloseTo(0, 10);

    // No core: nothing but C6 and the Stellar-Conduct conversion.
    const noCore = shared(6, {mitya_gradient_beacons: 5, mitya_the_observer_seeking_what_is_missing: true}, {polestar_field: true});
    expect(noCore.receiver.mastery()).toBeCloseTo(0, 8);
    expect(noCore.receiver("crit_dmg")).toBeCloseTo(0, 10);
    expect(noCore.receiver.enemy("enemy_res_electro")).toBeCloseTo(0, 10);
    expect(noCore.members.receiver.getBuildData().settings.allowed_stellarconduct).toBe(1);

    // C0: four Beacons at most, and none of the constellations' shares.
    const c0 = shared(0, steadyTeam, {polestar_field: true});
    expect(c0.receiver.mastery()).toBeCloseTo(120, 8);
    expect(c0.receiver("crit_dmg")).toBeCloseTo(0, 10);
    expect(c0.receiver.enemy("enemy_res_electro")).toBeCloseTo(0, 10);
    expect(finalStats(c0.members.receiver).get("dmg_stellarconduct_special")).toBe(0);
});

test("C6 makes the C4 pulse of a Steady State core 115% too", () => {
    // Game data: Mitya_C4_ExtraAttack multiplies the hit by
    // AS_Constellation_6_StableDamageUp in the core's Steady State. The
    // released calculator leaves the 115% out.
    const settings = {char_constellation: 6, mitya_detection_core: 'steady'};
    const name = "other.mitya_the_isotopes_born_of_decay_stellarconduct";
    expect(getDamage(name, settings).normal).toBeCloseTo(3 * 100 * 1.15 * stellarMastery(100), 5);
    expect(getDamage(name, {...settings, mitya_detection_core: 'overloaded'}).normal)
        .toBeCloseTo(3 * 100 * stellarMastery(100), 5);
    expect(getDamage(name, {...settings, char_constellation: 5}).normal)
        .toBeCloseTo(3 * 100 * stellarMastery(100), 5);

    // In a full build C6 also elevates it by 20%, as every Stellar-Conduct
    // DMG. The same Elemental Mastery in both states: the hit scales on it.
    const pulse = (constellation, core) => {
        const mitya = makeSolo('Mitya');
        mitya.setCharLevels({level: 90, ascension: 6, constellation});
        mitya.setCharSettings({mitya_detection_core: core});
        pinStats([[mitya, 'mastery', 500]]);
        return featureValues(mitya)[name][0];
    };
    expect(pulse(6, 'steady') / pulse(5, 'steady')).toBeCloseTo(1.15 * 1.2, 8);
    expect(pulse(6, 'overloaded') / pulse(5, 'overloaded')).toBeCloseTo(1.2, 8);
});

test("a released link's party row loads as Mitya with the row's controls", () => {
    const load = (row, teamSettings = {}) => {
        const receiver = makeBuild('Keqing');
        const team = Team.fromMember(receiver);
        const report = loadLegacyTeam(team, {
            party: [{charId: Mitya.getId(), settings: row}],
            buffs: {},
            settings: teamSettings,
            dropped: [],
        });
        return {receiver, entry: team.legacy.getBySourceId(Mitya.getId()), report};
    };
    const typed = {mitya_mastery_total: 500};
    const base = load(typed);
    expect(base.entry.getConstellation()).toBe(0);
    expect(base.report.dropped).toEqual([]);
    const before = finalStats(base.receiver);
    // His typed Elemental Mastery is stated: 500 x 0.028% = 14%.
    expect(before.get("stellarconduct_multi")).toBeCloseTo(0.14, 8);

    // The released engine's numbers for the same row: 150 + 123 Elemental
    // Mastery, 40% CRIT DMG, -20% RES and the 20% elevation.
    const steadyRow = load(Object.assign({
        "party.mitya_detection_core": 'steady',
        "party.mitya_gradient_beacons": 5,
        "party.mitya_the_observer_seeking_what_is_missing": true,
        "party.mitya_the_matter_that_slumbers_beyond_inertness": true,
        "party.mitya_elemental_transition_at_the_gate_of_reason": true,
    }, typed), {polestar_field: true});
    expect(steadyRow.report.dropped).toEqual([]);
    expect(steadyRow.entry.getConstellation()).toBe(6);
    const settings = steadyRow.entry.char.getSettings();
    expect(settings.mitya_detection_core).toBe('steady');
    expect(settings.mitya_gradient_beacons).toBe(5);
    const after = finalStats(steadyRow.receiver);
    expect(totalMastery(after) - totalMastery(before)).toBeCloseTo(150 + 123, 8);
    expect(after.get("crit_dmg") - before.get("crit_dmg")).toBeCloseTo(0.4, 10);
    expect(enemyChange(steadyRow.receiver, "enemy_res_cryo", after)).toBeCloseTo(-0.2, 10);
    expect(enemyChange(steadyRow.receiver, "enemy_res_electro", after)).toBeCloseTo(-0.2, 10);
    expect(after.get("dmg_stellarconduct_special")).toBeCloseTo(0.2, 10);
    expect(after.get("stellarconduct_multi")).toBeCloseTo(0.14, 8);

    // Five Beacons alone mean his first constellation, which allows them.
    const beacons = load(Object.assign({
        "party.mitya_detection_core": 'steady',
        "party.mitya_gradient_beacons": 5,
    }, typed));
    expect(beacons.entry.getConstellation()).toBe(1);
    expect(totalMastery(finalStats(beacons.receiver)) - totalMastery(before)).toBeCloseTo(150, 8);

    const overloadedRow = load(Object.assign({
        "party.mitya_detection_core": 'overloaded',
        "party.mitya_gradient_beacons": 5,
        "party.mitya_the_matter_that_slumbers_beyond_inertness": true,
    }, typed));
    expect(totalMastery(finalStats(overloadedRow.receiver)) - totalMastery(before)).toBeCloseTo(234, 8);
});
