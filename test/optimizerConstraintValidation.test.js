import {
    normalizeSetConstraintThresholds,
    normalizeStatConstraintBounds,
} from "../src/js/classes/OptimizerConstraints";

test('stat constraints preserve numeric zero and normalize percentages once', () => {
    const bounds = normalizeStatConstraintBounds({
        crit_rate_min: '0',
        crit_rate_max: 50,
        recharge_min: '',
    });

    expect(bounds.map(({ stat, op, value }) => ({ stat, op, value }))).toEqual([
        { stat: 'crit_rate', op: 'min', value: 0 },
        { stat: 'crit_rate', op: 'max', value: 0.5 },
    ]);
});

test.each([
    [{recharge_min: '12abc'}, 'must be finite'],
    [{crit_rate_max: Infinity}, 'must be finite'],
    [{crit_rate_min: 60, crit_rate_max: 50}, 'min greater than max'],
])('invalid stat bounds are rejected instead of changing backend semantics', (settings, message) => {
    expect(() => normalizeStatConstraintBounds(settings)).toThrow(message);
});

test('more than eight constrained stats is rejected instead of GPU truncation', () => {
    const settings = Object.fromEntries(
        Array.from({length: 9}, (_, index) => [`custom_${index}_min`, index])
    );

    expect(() => normalizeStatConstraintBounds(settings)).toThrow('at most 8 constrained stats');
});

test('set thresholds use strict finite integer domains', () => {
    expect(normalizeSetConstraintThresholds({Required: 0}, {Disabled: 4})).toEqual({
        minValues: {},
        maxValues: {Disabled: 4},
    });
    expect(() => normalizeSetConstraintThresholds({Required: '2pieces'}, {})).toThrow('must be an integer');
    expect(() => normalizeSetConstraintThresholds({}, {Disabled: 0})).toThrow('integer from 1 to 5');
});
