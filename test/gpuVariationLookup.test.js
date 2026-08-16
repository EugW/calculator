import { GPUArtifactOptimizer } from "../src/js/classes/GPUArtifactOptimizer";
import { createOptimizationPlan } from "../src/js/classes/OptimizationPlan";

function planVariation(id, setInfo = []) {
    return {
        id,
        objectiveAst: {},
        objectiveUsedStats: [],
        constraintPostEffects: [],
        constraintUsedStats: [],
        constraintTargetStats: [],
        setInfo,
    };
}

function makePlan(variations) {
    return createOptimizationPlan({
        settings: {},
        objective: 'average',
        variations,
    });
}

test("GPU variation keys are canonical for two 2pc sets", () => {
    const optimizer = new GPUArtifactOptimizer();
    const expected = 257 + 3 * 128 + 10;

    expect(optimizer.computeSetKeyFromIds([3, 3, 10, 10, 1])).toBe(expected);
    expect(optimizer.computeSetKeyFromIds([10, 10, 3, 3, 1])).toBe(expected);
});

test("GPU variation keys do not collide between high single 2pc and high two 2pc sets", () => {
    const optimizer = new GPUArtifactOptimizer();

    expect(optimizer.computeSetKeyFromIds([63, 63, 1, 2, 3])).toBe(64);
    expect(optimizer.computeSetKeyFromIds([62, 62, 63, 63, 1])).toBe(257 + 62 * 128 + 63);
});

test("GPU variation lookup uses direct keys without modulo folding", () => {
    const optimizer = new GPUArtifactOptimizer();
    optimizer._setIdMap = new Map([
        ["HighA", 62],
        ["HighB", 63],
    ]);

    const variationMap = new Map([
        ["default", 0],
        ["HighB2", 1],
        ["HighA2-HighB2", 2],
    ]);
    const featureVariants = {
        default: { setInfo: [] },
        HighB2: { setInfo: [{ setName: "HighB", pieces: 2 }] },
        "HighA2-HighB2": {
            setInfo: [
                { setName: "HighA", pieces: 2 },
                { setName: "HighB", pieces: 2 },
            ],
        },
    };

    const lookup = optimizer.buildVariationLookup(variationMap, featureVariants);

    expect(lookup[64]).toBe(1);
    expect(lookup[257 + 62 * 128 + 63]).toBe(2);
});

test("a dynamic 2pc variation remains active beside an ordinary static 2pc set", () => {
    const optimizer = new GPUArtifactOptimizer();
    optimizer._setIdMap = new Map([
        ["StaticSet", 3],
        ["DynamicSet", 10],
    ]);

    const variationMap = new Map([
        ["default", 0],
        ["DynamicSet2", 1],
    ]);
    const featureVariants = {
        default: { setInfo: [] },
        DynamicSet2: { setInfo: [{ setName: "DynamicSet", pieces: 2 }] },
    };

    const lookup = optimizer.buildVariationLookup(variationMap, featureVariants);
    const mixedKey = 257 + 3 * 128 + 10;

    expect(lookup[1 + 10]).toBe(1);
    expect(lookup[mixedKey]).toBe(1);
});

test("missing lookup states use the semantic default even when it is not variation zero", () => {
    const optimizer = new GPUArtifactOptimizer();
    optimizer._setIdMap = new Map([["DynamicSet", 10]]);

    const variationMap = new Map([
        ["unrelated", 0],
        ["DynamicSet2", 1],
        ["default", 2],
    ]);
    const featureVariants = {
        unrelated: { setInfo: [{ setName: "DynamicSet", pieces: 4 }] },
        DynamicSet2: { setInfo: [{ setName: "DynamicSet", pieces: 2 }] },
        default: { setInfo: [] },
    };

    const lookup = optimizer.buildVariationLookup(variationMap, featureVariants);

    expect(lookup[0]).toBe(2);
    expect(lookup[5000]).toBe(2);
});

test("plan lookup resolves every physical key by threshold specificity", () => {
    const optimizer = new GPUArtifactOptimizer();
    optimizer._setIdMap = new Map([
        ['Alpha', 3],
        ['Beta', 10],
        ['Static', 12],
    ]);
    const plan = makePlan([
        planVariation('default'),
        planVariation('alpha-2', [{setName: 'Alpha', pieces: 2}]),
        planVariation('alpha-4', [{setName: 'Alpha', pieces: 4}]),
        planVariation('beta-2', [{setName: 'Beta', pieces: 2}]),
        planVariation('alpha-beta', [
            {setName: 'Alpha', pieces: 2},
            {setName: 'Beta', pieces: 2},
        ]),
    ]);

    const lookup = optimizer.buildVariationLookup(plan);
    const byId = Object.fromEntries(plan.variations.map((variation) => [variation.id, variation.index]));

    expect(lookup[1 + 3]).toBe(byId['alpha-2']);
    expect(lookup[129 + 3]).toBe(byId['alpha-4']);
    expect(lookup[129 + 10]).toBe(byId['beta-2']);
    expect(lookup[257 + 3 * 128 + 10]).toBe(byId['alpha-beta']);
    expect(lookup[257 + 3 * 128 + 12]).toBe(byId['alpha-2']);
});
