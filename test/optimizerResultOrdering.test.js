import {
    compareOptimizerResults,
    finalizeOptimizerResults,
    remapCombinationIndex,
} from "../src/js/classes/OptimizerResult";

test('worker-local indices remap to the unsplit Cartesian product', () => {
    const globalCounts = {
        flower: 2,
        plume: 1,
        sands: 1,
        goblet: 1,
        circlet: 4,
    };
    const localCounts = Object.assign({}, globalCounts, {circlet: 2});
    const context = {
        splitSlot: 'circlet',
        splitOffset: 2,
        globalCounts,
    };

    expect([0, 1, 2, 3].map((index) => {
        return remapCombinationIndex(index, localCounts, context);
    })).toEqual([2, 3, 6, 7]);
});

test('optimizer ordering is score descending then global index ascending', () => {
    const items = [
        {value: 1, combinationIndex: 5},
        {value: 2, combinationIndex: 8},
        {value: 2, combinationIndex: 3},
    ];

    expect(items.sort(compareOptimizerResults).map((item) => item.combinationIndex)).toEqual([3, 8, 5]);
});

test('artifact worker merge uses the global tie key and hides transport metadata', () => {
    const items = [
        {value: 1, combinationIndex: 5, marker: 'late-low', artifacts: []},
        {value: 5, combinationIndex: 4, marker: 'late-high', artifacts: []},
        {value: 5, combinationIndex: 3, marker: 'early-high', artifacts: []},
        {value: 2, combinationIndex: 1, marker: 'middle', artifacts: []},
    ];

    const results = finalizeOptimizerResults(items, 3);

    expect(results.map((item) => item.marker)).toEqual(['early-high', 'late-high', 'middle']);
    expect(results.every((item) => item.combinationIndex === undefined)).toBe(true);
});
