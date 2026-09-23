import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureDamageStellarConduct } from "../src/js/classes/Feature2/Damage/StellarConduct";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { FeatureMultiplierStellarConduct } from "../src/js/classes/Feature2/Multiplier/StellarConduct";
import { FeatureMultiplierTarget } from "../src/js/classes/Feature2/Multiplier/Target";
import { StatTable } from "../src/js/classes/StatTable";

function makeStellarConductFeature() {
    return new FeatureDamageStellarConduct({
        category: "skill",
        element: "cryo",
        multipliers: [
            new FeatureMultiplier({
                values: new StatTable("stellarconduct_test_hit", [100]),
            }),
        ],
    });
}

test("Stellar-Conduct direct damage follows its direct formula and ignores ordinary DMG and DEF buckets", () => {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_cryo: 10,
        stellarconduct_hit_count: 3,
        reaction: "melt",
    }, {
        atk_base: 1000,
        mastery: 500,
        stellarglimmer_multi: 0.1,
        stellarconduct_multi: 0.2,
        stellarswirl_multi: 9,
        dmg_stellarglimmer: 0.2,
        dmg_stellarconduct: 0.3,
        dmg_stellarswirl: 9,
        dmg_all: 10,
        dmg_skill: 10,
        dmg_cryo: 10,
        enemy_def_reduce: 0.9,
        crit_rate_base: 1,
        crit_dmg_base: 1,
        crit_dmg_stellarglimmer: 0.2,
        crit_dmg_stellarswirl: 9,
        dmg_stellarglimmer_special: 0.1,
        dmg_stellarconduct_special: 0.4,
        dmg_stellarswirl_special: 9,
    });

    const result = makeStellarConductFeature().getResult(data)["skill.stellarconduct_test_hit"];
    const baseMultiplier = 1.55;
    const baseBonus = 1.3;
    const masteryAndDmgBonus = 1 + 6 * 500 / (500 + 2000) + 0.2 + 0.3;
    const resistance = 0.9;
    const elevation = 1.5;
    const expected = baseMultiplier * 1000 * baseBonus * masteryAndDmgBonus * resistance * elevation;

    expect(result.normal).toBeCloseTo(expected, 5);
    expect(result.crit).toBeCloseTo(expected * 2.2, 5);
    expect(result.isReacted).toBe(false);
    expect(result.element).toBe("cryo");
    expect(result.isDamage).toBe(true);
    expect(result.nameStyle).toBe("stellar-conduct-cryo");
});

test("Stellar-Conduct flat direct bonuses are added before elevation", () => {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        enemy_res_cryo: 0,
        stellarconduct_hit_count: 0,
    }, {
        atk_base: 1000,
        dmg_stellarconduct_special: 0.5,
    });
    data.multipliers = [
        new FeatureMultiplier({
            values: new StatTable("stellarconduct_flat_bonus", [100]),
            target: new FeatureMultiplierTarget({
                tags: ["stellarconduct_direct"],
                options: ["stellarconduct_flat"],
            }),
        }),
    ];

    const result = makeStellarConductFeature().getResult(data)["skill.stellarconduct_test_hit"];

    expect(result.normal).toBeCloseTo((1000 + 1000) * 1.5, 5);
});

test("Stellar-Conduct explicit zero hit count overrides Polestar fallback", () => {
    const data = new BuildData({
        stellarconduct_hit_count: 0,
        polestar_included_hits: 10,
    }, {});

    expect(FeatureMultiplierStellarConduct.getHitCount(data)).toBe(0);
});
