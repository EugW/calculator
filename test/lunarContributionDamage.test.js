import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../src/js/classes/Feature2/Multiplier/Target";
import { FeatureReactionLunarCharged } from "../src/js/classes/Feature2/Reaction/Transformative/Lunar/Charged";
import { FeatureReactionLunarChargedLike } from "../src/js/classes/Feature2/Reaction/Transformative/Lunar/ChargedLike";
import { FeatureReactionLunarCrystallize } from "../src/js/classes/Feature2/Reaction/Transformative/Lunar/Crystallize";
import { reactionDamageValues } from "../src/js/db/generated/ElementScale";
import { Reactions } from "../src/js/db/Features/Reactions";
import { StatTable } from "../src/js/classes/StatTable";

function makeData(element, tag) {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 90,
        ["enemy_res_" + element]: 0,
    }, {
        atk_base: 1000,
    });

    data.multipliers = [
        new FeatureMultiplier({
            scaling: "atk_base",
            values: new StatTable("lunar_contribution_flat", [100]),
            target: new FeatureMultiplierTarget({
                tags: [tag],
                options: ["reaction_flat"],
            }),
        }),
    ];

    return data;
}

test("Lunar-Charged contribution uses 3x reaction rate and weights base plus flat damage", () => {
    const feature = new FeatureReactionLunarCharged({
        name: "test_lunarcharged_contribution",
        element: "electro",
        penalty: 0.6,
    });
    const data = makeData("electro", "lunarcharged_reaction");

    const result = feature.getResult(data)["reaction.test_lunarcharged_contribution"];
    const expected = (reactionDamageValues.getValue(90) * 3 + 1000) * 0.6;

    expect(result.normal).toBeCloseTo(expected, 5);
});

test("configured lunar contribution features use the new contribution weights", () => {
    const byName = Object.fromEntries(Reactions.map((feature) => [feature.name, feature]));

    expect(byName.lunarcharged_contrubution.getReactionRate()).toBe(3);
    expect(byName.lunarcharged_contrubution.getContributionWeight()).toBeCloseTo(0.6, 5);
    expect(byName.lunarcharged_contrubution_2.getContributionWeight()).toBeCloseTo(0.3, 5);
    expect(byName.lunarcharged_contrubution_12.getContributionWeight()).toBeCloseTo(0.05, 5);

    expect(byName.lunarcrystallize_contrubution.getReactionRate()).toBe(1.6);
    expect(byName.lunarcrystallize_contrubution.getContributionWeight()).toBeCloseTo(0.6, 5);
    expect(byName.lunarcrystallize_contrubution_2.getContributionWeight()).toBeCloseTo(0.3, 5);
    expect(byName.lunarcrystallize_contrubution_12.getContributionWeight()).toBeCloseTo(0.05, 5);
});

test("Lunar-Crystallize contribution uses 1.6x reaction rate and weights base plus flat damage", () => {
    const feature = new FeatureReactionLunarCrystallize({
        name: "test_lunarcrystallize_contribution",
        element: "geo",
        penalty: 0.05,
    });
    const data = makeData("geo", "lunarcrystallize_reaction");

    const result = feature.getResult(data)["reaction.test_lunarcrystallize_contribution"];
    const expected = (reactionDamageValues.getValue(90) * 1.6 + 1000) * 0.05;

    expect(result.normal).toBeCloseTo(expected, 5);
});

test("Lunar-Charged direct damage does not inherit contribution weighting", () => {
    const feature = new FeatureReactionLunarChargedLike({
        name: "test_lunarcharged_direct",
        category: "skill",
        element: "electro",
        multipliers: [
            new FeatureMultiplier({
                scaling: "atk_base",
                values: new StatTable("lunar_direct_base", [100]),
            }),
        ],
    });
    const data = makeData("electro", "lunarcharged_reaction");

    const result = feature.getResult(data)["skill.test_lunarcharged_direct"];
    const expected = 1000 * 3 + 1000;

    expect(result.normal).toBeCloseTo(expected, 5);
});
