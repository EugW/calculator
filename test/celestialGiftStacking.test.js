import { Artifacts } from "../src/js/db/Buffs/Artifacts";
import { DB } from "../src/js/db/DB";
import { Lang } from "../src/js/ui/Lang";

global.window = {};
global.localStorage = {};
global.DB = DB;
require("../src/js/lang/eng.js");
global.UI = {Lang: new Lang()};

function getBuffCondition(name) {
    return Artifacts.getConditions().find((item) => item.getName() === name);
}

function getBuffStats(name, settings) {
    const condition = getBuffCondition(name);

    expect(condition).toBeTruthy();

    return condition.getData(settings).stats;
}

function getBuffDescription(name, settings) {
    const condition = getBuffCondition(name);

    expect(condition).toBeTruthy();

    return condition.getDescription(condition.getStats(settings));
}

function getBuffSelectedValues(name, settings) {
    const condition = getBuffCondition(name);

    expect(condition).toBeTruthy();

    return condition.getSelectedValues(settings);
}

function makeSelfSettings(extraSettings) {
    return {
        char_name: "klee",
        char_element: "pyro",
        klee_witch_homework: true,
        "set.celestial_gift_4": true,
        "set_pieces.celestialgift": 4,
        ...extraSettings,
    };
}

test("celestial gift party bonus does not stack with self bonus for the same element", () => {
    const stats = getBuffStats("set_other.celestial_gift_4", makeSelfSettings({
        "set_other.celestial_gift_4": "pyro",
    }));

    expect(stats.get("dmg_pyro")).toBeCloseTo(0, 5);
});

test("celestial gift party bonus stacks with self bonus for a different element", () => {
    const stats = getBuffStats("set_other.celestial_gift_4", makeSelfSettings({
        "set_other.celestial_gift_4": "hydro",
    }));

    expect(stats.get("dmg_hydro")).toBeCloseTo(20, 5);
});

test("celestial gift same-element party bonus still applies when self bonus is inactive", () => {
    const stats = getBuffStats("set_other.celestial_gift_4", makeSelfSettings({
        "set.celestial_gift_4": false,
        "set_other.celestial_gift_4": "pyro",
    }));

    expect(stats.get("dmg_pyro")).toBeCloseTo(20, 5);
});

test("celestial gift hexerei party bonus only skips the self element", () => {
    const stats = getBuffStats("set_other.celestial_gift_4_hexerei", makeSelfSettings({
        party_char_1: 26,
        "party.venti_witch_homework": true,
        "set_other.celestial_gift_4_hexerei": "pyro;hydro",
    }));

    expect(stats.get("dmg_pyro")).toBeCloseTo(0, 5);
    expect(stats.get("dmg_hydro")).toBeCloseTo(40, 5);
});

test("celestial gift hexerei description keeps its value when self element is skipped", () => {
    const description = getBuffDescription("set_other.celestial_gift_4_hexerei", makeSelfSettings({
        party_char_1: 26,
        "party.venti_witch_homework": true,
        "set_other.celestial_gift_4_hexerei": "pyro;hydro",
    }));

    expect(description).toContain("40%");
    expect(description).not.toContain("?");
});

test("celestial gift party controls inherit selection across hexerei mode switches", () => {
    expect(getBuffSelectedValues("set_other.celestial_gift_4_hexerei", {
        "set_other.celestial_gift_4": "pyro",
    })).toEqual(["pyro"]);

    expect(getBuffSelectedValues("set_other.celestial_gift_4", {
        "set_other.celestial_gift_4_hexerei": "pyro;hydro",
    })).toEqual(["pyro"]);
});
