import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../src/js/classes/Feature2/Multiplier/Target";
import { Nicole } from "../src/js/db/Char/Nicole";
import { StatTable } from "../src/js/classes/StatTable";

// Team deliveries (Pathfinder's Blessing, Grace of Kenosis, Arcane
// Projections on teammates) are covered in teamNicoleDelivery.test.js.

function getNicoleFeature(name, features = Nicole.getFeatures()) {
    return features.find((feature) => {
        return feature.getName() === name;
    });
}

test("Nicole Arcane Projection uses generic and elemental damage bonuses, but not attack-type bonuses or reactions", () => {
    const feature = getNicoleFeature("other.nicole_arcane_projection");
    const unityFeature = getNicoleFeature("other.nicole_arcane_projection_unity");
    const baseData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        char_element: "pyro",
        char_skill_burst: 1,
        char_constellation: 1,
    }, {
        atk_base: 1000,
    });

    const buffedData = new BuildData({
        char_level: 90,
        enemy_level: 90,
        char_element: "pyro",
        char_skill_burst: 1,
        char_constellation: 1,
        reaction: "vaporize",
    }, {
        atk_base: 1000,
        dmg_all: 0.1,
        dmg_pyro: 0.1,
        dmg_burst: 10,
        dmg_normal: 10,
    });
    buffedData.multipliers = [
        new FeatureMultiplier({
            values: new StatTable("fake_global_base_buff", [1000]),
        }),
        new FeatureMultiplier({
            values: new StatTable("fake_burst_base_buff", [1000]),
            target: new FeatureMultiplierTarget({
                damageTypes: ["burst"],
            }),
        }),
    ];

    const base = feature.getResult(baseData)["other.nicole_arcane_projection"];
    const buffed = feature.getResult(buffedData)["other.nicole_arcane_projection"];
    const unityBase = unityFeature.getResult(baseData)["other.nicole_arcane_projection_unity"];
    const unityBuffed = unityFeature.getResult(buffedData)["other.nicole_arcane_projection_unity"];

    expect(feature.getDamageType()).toBe("");
    expect(feature.getStatsDmgBonus(baseData)).toEqual(["dmg_all", "dmg_pyro*"]);
    expect(buffed.normal).toBeCloseTo(base.normal * 1.2, 5);
    expect(buffed.isReacted).toBe(false);
    expect(unityFeature.getDamageType()).toBe("");
    expect(unityBuffed.normal).toBeCloseTo(unityBase.normal * 1.2, 5);
    expect(unityBuffed.isReacted).toBe(false);
});
