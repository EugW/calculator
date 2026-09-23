import { BuildData } from "../src/js/classes/Build/Data";
import { ConditionDropdownTravelerResonated, getTravelerResonatedValues } from "../src/js/classes/Condition/Dropdown/TravelerResonated";
import { TravelerAnemo } from "../src/js/db/Char/TravelerAnemo";
import { TravelerGeo } from "../src/js/db/Char/TravelerGeo";
import { TravelerElectro } from "../src/js/db/Char/TravelerElectro";
import { TravelerDendro } from "../src/js/db/Char/TravelerDendro";
import { TravelerHydro } from "../src/js/db/Char/TravelerHydro";
import { TravelerPyro } from "../src/js/db/Char/TravelerPyro";
import { TravelerCryo } from "../src/js/db/Char/TravelerCryo";

const travelers = [
    [TravelerAnemo, 'traveler_anemo_resonated_elements', 6],
    [TravelerGeo, 'traveler_geo_resonated_elements', 6],
    [TravelerElectro, 'traveler_electro_resonated_elements', 6],
    [TravelerDendro, 'traveler_dendro_resonated_elements', 7],
    [TravelerHydro, 'traveler_hydro_resonated_elements', 6],
    [TravelerPyro, 'traveler_pyro_resonated_elements', 8],
    [TravelerCryo, 'traveler_cryo_resonated_elements', 6],
];

function applyConditions(data, conditions) {
    for (const condition of conditions) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
}

for (const [char, condName, expectedId] of travelers) {
    test(`${condName} exists with shared n10050001 strings and id ${expectedId}`, () => {
        const cond = char.getAllConditions().find((c) => c.getName() === condName);
        expect(cond).toBeDefined();
        expect(cond).toBeInstanceOf(ConditionDropdownTravelerResonated);
        expect(cond.getId()).toBe(expectedId);
        expect(cond.params.title).toBe('talent_name.n10050001');
        expect(cond.params.description).toBe('talent_descr.n10050001');
        expect(cond.isMultiple()).toBe(true);
        expect(cond.params.values).toHaveLength(7);
    });
}

for (const [char, condName] of travelers) {
    test(`${condName} applies exact resonated stats`, () => {
        const cond = char.getAllConditions().find((c) => c.getName() === condName);
        const data = new BuildData({
            [condName]: "anemo;geo;electro;dendro;hydro;pyro;cryo",
        }, {});
        applyConditions(data, [cond]);
        expect(data.stats.get("crit_rate")).toBe(10);
        expect(data.stats.get("def_percent")).toBe(20);
        expect(data.stats.get("recharge")).toBe(20);
        expect(data.stats.get("mastery")).toBe(60);
        expect(data.stats.get("hp_percent")).toBe(20);
        expect(data.stats.get("atk_percent")).toBe(20);
        expect(data.stats.get("crit_dmg")).toBe(20);
    });
}

test("resonated multi-select bitmask round-trips", () => {
    const cond = TravelerPyro.getAllConditions().find((c) => c.getName() === 'traveler_pyro_resonated_elements');
    expect(cond.getSelectedId({
        traveler_pyro_resonated_elements: "anemo;electro;dendro;cryo",
    })).toBe(1 + 4 + 8 + 64);
    expect(cond.getValueById(1 + 4 + 8 + 64)).toBe("anemo;electro;dendro;cryo");
});

test("helper returns fresh identical values per call", () => {
    const a = getTravelerResonatedValues();
    const b = getTravelerResonatedValues();
    expect(a).not.toBe(b);
    expect(a.map((v) => v.value)).toEqual(['anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo']);
    expect(a.map((v) => v.serializeId)).toEqual([1, 2, 3, 4, 5, 6, 7]);
});
