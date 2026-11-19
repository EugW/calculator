import { BuildData } from "../src/js/classes/Build/Data";
import { Rotation } from "../src/js/classes/Rotation";
import { Zibai } from "../src/js/db/Char/Zibai";
import { DB } from "../src/js/db/DB";
import { charTalentTables } from "../src/js/db/generated/CharTalentTables";

global.DB = DB;

const PHASE_SHIFT = {zibai_lunar_phase_shift: true};

function makeData(settings = {}, stats = {}) {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_geo: 0,
        enemy_res_phys: 0,
        char_skill_attack: 1,
        char_skill_elemental: 1,
        char_skill_burst: 1,
        ...settings,
    }, {
        atk_base: 1000,
        def_base: 1000,
        ...stats,
    });
    data.multipliers = [];
    data.stats.processPercent();
    return data;
}

// Mirrors CalcSet#getFeatureByName: the first active feature with that name wins.
function getActiveFeatures(name, data) {
    return Zibai.getFeatures().filter((feature) => feature.getName() === name && feature.isActive(data));
}

function getDamage(name, settings = {}, stats = {}) {
    const data = makeData(settings, stats);
    const [feature] = getActiveFeatures(name, data);
    return feature.getResult(data)[name].normal;
}

const shiftNormals = [
    ["attack.normal_hit_1", charTalentTables.Zibai.s2.p6[0], charTalentTables.Zibai.s1.p1[0]],
    ["attack.normal_hit_2", charTalentTables.Zibai.s2.p7[0], charTalentTables.Zibai.s1.p2[0]],
    ["attack.normal_hit_3", charTalentTables.Zibai.s2.p8[0], charTalentTables.Zibai.s1.p3[0]],
    ["attack.normal_hit_4", charTalentTables.Zibai.s2.p10[0], charTalentTables.Zibai.s1.p5[0]],
];
const shiftCharged = ["attack.charged_hit", charTalentTables.Zibai.s2.p11[0], charTalentTables.Zibai.s1.p6[0]];

test.each([...shiftNormals, shiftCharged])("%s has exactly one active variant in either mode", (name) => {
    const physical = getActiveFeatures(name, makeData());
    expect(physical).toHaveLength(1);
    expect(physical[0].getElement(makeData())).toBe("phys");

    const geo = getActiveFeatures(name, makeData(PHASE_SHIFT));
    expect(geo).toHaveLength(1);
    expect(geo[0].getElement(makeData(PHASE_SHIFT))).toBe("geo");
});

test.each(shiftNormals)("%s outside Lunar Phase Shift is physical ATK scaling", (name, _shift, attack) => {
    expect(getDamage(name)).toBeCloseTo(attack / 100 * 1000 * 0.5, 5);
});

test.each(shiftNormals)("%s in Lunar Phase Shift is Geo Normal Attack DMG off DEF and the Skill level", (name, value) => {
    const [feature] = getActiveFeatures(name, makeData(PHASE_SHIFT));
    expect(feature.getDamageType()).toBe("normal");

    const base = value / 100 * 1000 * 0.5;
    expect(getDamage(name, PHASE_SHIFT)).toBeCloseTo(base, 5);
    expect(getDamage(name, {...PHASE_SHIFT, char_skill_attack: 10})).toBeCloseTo(base, 5);
    expect(getDamage(name, PHASE_SHIFT, {dmg_normal: 40})).toBeCloseTo(base * 1.4, 5);
    expect(getDamage(name, PHASE_SHIFT, {dmg_normal_geo: 40})).toBeCloseTo(base * 1.4, 5);
    expect(getDamage(name, PHASE_SHIFT, {dmg_skill: 40})).toBeCloseTo(base, 5);
    expect(getDamage(name, PHASE_SHIFT, {dmg_charged: 40})).toBeCloseTo(base, 5);
});

test("Lunar Phase Shift Charged Attack is Geo Charged Attack DMG", () => {
    const [name, value] = shiftCharged;
    const [feature] = getActiveFeatures(name, makeData(PHASE_SHIFT));
    expect(feature.getDamageType()).toBe("charged");

    const base = value / 100 * 1000 * 0.5;
    expect(getDamage(name, PHASE_SHIFT)).toBeCloseTo(base, 5);
    expect(getDamage(name, PHASE_SHIFT, {dmg_charged: 40})).toBeCloseTo(base * 1.4, 5);
    expect(getDamage(name, PHASE_SHIFT, {dmg_skill: 40})).toBeCloseTo(base, 5);
    expect(getDamage(name, PHASE_SHIFT, {dmg_normal: 40})).toBeCloseTo(base, 5);
});

test("Lunar Phase Shift hits stay Geo under other infusions", () => {
    const data = makeData({...PHASE_SHIFT, attack_infusion: "pyro"});
    for (const [name] of [...shiftNormals, shiftCharged]) {
        const [feature] = getActiveFeatures(name, data);
        expect(feature.getElement(data)).toBe("geo");
    }
});

test("plunges, Spirit Steed's Stride and the 4th-hit Additional DMG do not depend on the mode", () => {
    for (const name of [
        "attack.plunge", "attack.plunge_low", "attack.plunge_high",
        "skill.zibai_spirit_steed_hit_1", "skill.zibai_spirit_steed_hit_2",
        "skill.zibai_lunar_phase_shift_4th_additional",
    ]) {
        expect(getActiveFeatures(name, makeData())).toHaveLength(1);
        expect(getActiveFeatures(name, makeData(PHASE_SHIFT))).toHaveLength(1);
    }
});

test("Attack rows keep their order when switching modes", () => {
    const attackOrder = (data) => Zibai.getFeatures()
        .filter((feature) => feature.category === "attack" && feature.isActive(data))
        .map((feature) => feature.getName());
    const expected = [
        "attack.normal_hit_1", "attack.normal_hit_2", "attack.normal_hit_3", "attack.normal_hit_4",
        "attack.charged_hit", "attack.plunge", "attack.plunge_low", "attack.plunge_high",
    ];

    expect(attackOrder(makeData())).toEqual(expected);
    expect(attackOrder(makeData(PHASE_SHIFT))).toEqual(expected);
});

test.each([
    [657, "attack.normal_hit_1", 1],
    [658, "attack.normal_hit_2", 2],
    [659, "attack.normal_hit_3", 3],
    [660, "attack.normal_hit_4", 4],
    [661, "attack.charged_hit", 12],
])("saved rotation id %i loads as %s and re-saves as id %i", (oldId, name, newId) => {
    // version 3, reserved, 1 item: disabled, collapsed, type=feature, id, count, reaction
    const rotation = Rotation.deserialize([3, 0, 1, 0, 0, 1, oldId, 2, 0]);
    expect(rotation.getItems()).toHaveLength(1);
    expect(rotation.getItems()[0].feature).toBe(name);
    expect(rotation.serialize()).toEqual([3, 0, 1, 0, 0, 1, newId, 2, 0]);
});
