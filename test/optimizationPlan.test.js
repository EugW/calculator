import {
    compareOptimizationPlanResults,
    createOptimizationPlan,
    createOptimizationPlanConstraints,
    isOptimizationScoreValid,
    resolveOptimizationPlanVariation,
} from "../src/js/classes/OptimizationPlan";

function makeVariation(overrides = {}) {
    return Object.assign({
        id: 'default',
        objectiveAst: {kind: 'objective-ast'},
        objectiveUsedStats: [],
        constraintPostEffects: [],
        constraintUsedStats: [],
        constraintTargetStats: [],
        setInfo: [],
    }, overrides);
}

test('builds a canonical frozen backend-neutral plan from shared normalizers', () => {
    const effect = {kind: 'test-post-effect'};
    const objectiveAst = {kind: 'prepared-objective'};
    const plan = createOptimizationPlan({
        settings: {
            stats: {
                crit_rate_max: '80',
                atk_min: '1,000'.replace(',', ''),
            },
            setMinValues: {RequiredSet: '2', IgnoredZero: 0},
            setMaxValues: {DisabledSet: '4'},
        },
        objective: 'crit',
        variations: [
            makeVariation({
                id: 'zeta',
                objectiveAst,
                objectiveUsedStats: ['crit_dmg', 'crit_rate'],
                constraintPostEffects: [effect],
                constraintUsedStats: ['atk_percent', 'atk', 'atk_base', 'crit_rate_base', 'crit_rate'],
                constraintTargetStats: ['atk_percent', 'atk', 'atk_base', 'crit_rate_base', 'crit_rate'],
                setInfo: [{setName: 'ZetaSet', pieces: 2}],
            }),
            makeVariation({
                constraintUsedStats: ['atk_percent', 'atk', 'atk_base', 'crit_rate_base', 'crit_rate'],
                constraintTargetStats: ['atk_percent', 'atk', 'atk_base', 'crit_rate_base', 'crit_rate'],
            }),
        ],
    });

    expect(plan.objective).toEqual({component: 'crit', vectorIndex: 1});
    expect(plan.numericPolicy).toEqual({
        cpuArithmetic: 'f64',
        gpuArithmetic: 'f32',
        authority: 'cpu-f64',
        cpuMode: 'authoritative-reference',
        gpuMode: 'fast-approximate',
        feasibilityBoundary: 'backend-native',
        nearTieRanking: 'backend-native',
        crossBackendParity: 'not-guaranteed-at-boundaries-or-near-ties',
        determinism: 'within-backend',
        gpuF32CanProveF64Optimality: false,
        f64OptimalityProof: 'requires-f64-or-conservative-proof-safe-bounds',
    });
    expect(plan.ordering).toMatchObject({
        cartesianSlotOrder: ['flower', 'plume', 'sands', 'goblet', 'circlet'],
        cartesianIndexOrder: 'last-slot-fastest',
        cartesianIndexDomain: 'nonnegative-safe-integer',
    });
    expect(plan.statConstraints.bounds.map((bound) => [bound.stat, bound.op, bound.value])).toEqual([
        ['atk', 'min', 1000],
        ['crit_rate', 'max', 0.8],
    ]);
    expect(plan.statConstraints.predicates).toEqual([
        expect.objectContaining({
            kind: 'stat-range-predicate',
            stat: 'atk',
            minimumInclusive: 1000,
            maximumInclusive: null,
        }),
        expect.objectContaining({
            kind: 'stat-range-predicate',
            stat: 'crit_rate',
            minimumInclusive: null,
            maximumInclusive: 0.8,
        }),
    ]);
    expect(plan.setConstraints).toMatchObject({
        minValues: {RequiredSet: 2},
        maxValues: {DisabledSet: 4},
        predicates: [
            {
                kind: 'set-count-range-predicate',
                setName: 'DisabledSet',
                minimumInclusive: null,
                maximumExclusive: 4,
            },
            {
                kind: 'set-count-range-predicate',
                setName: 'RequiredSet',
                minimumInclusive: 2,
                maximumExclusive: null,
            },
        ],
    });
    expect(plan.variations.map((variation) => [variation.id, variation.index])).toEqual([
        ['default', 0],
        ['zeta', 1],
    ]);
    expect(plan.variations[1].objectiveAst).toBe(objectiveAst);
    expect(plan.variations[1].constraintPostEffects[0]).toBe(effect);
    expect(plan.variations[1].selector).toEqual({
        kind: 'all-set-piece-thresholds',
        terms: [{
            kind: 'set-piece-threshold',
            setName: 'ZetaSet',
            minimumInclusive: 2,
        }],
    });
    expect(Object.isFrozen(objectiveAst)).toBe(false);
    expect(Object.isFrozen(effect)).toBe(false);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.statConstraints.bounds[0].components)).toBe(true);
    expect(Object.isFrozen(plan.variations[1].constraintPostEffects)).toBe(true);
});

test('represents finite-score validity and delegates deterministic production ordering', () => {
    expect(isOptimizationScoreValid(0)).toBe(true);
    expect(isOptimizationScoreValid(-12.5)).toBe(true);
    expect(isOptimizationScoreValid(Number.NaN)).toBe(false);
    expect(isOptimizationScoreValid(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isOptimizationScoreValid('1')).toBe(false);

    const candidates = [
        {value: 5, combinationIndex: 9},
        {value: -1, combinationIndex: 0},
        {value: 5, combinationIndex: 2},
        {value: 0, combinationIndex: 1},
    ];
    candidates.sort(compareOptimizationPlanResults);
    expect(candidates.map((candidate) => candidate.combinationIndex)).toEqual([2, 9, 1, 0]);
});

test('reuses a canonical constraint fragment without reparsing when rebinding objectives', () => {
    const constraints = createOptimizationPlanConstraints({
        stats: {atk_min: '100'},
        setMinValues: {Alpha: '2'},
    });
    const normal = createOptimizationPlan({
        constraints,
        objective: 'normal',
        variations: [makeVariation({
            constraintUsedStats: ['atk', 'atk_base', 'atk_percent'],
            constraintTargetStats: ['atk', 'atk_base', 'atk_percent'],
        })],
    });
    const crit = createOptimizationPlan({
        constraints,
        objective: 'crit',
        variations: [makeVariation({
            constraintUsedStats: ['atk', 'atk_base', 'atk_percent'],
            constraintTargetStats: ['atk', 'atk_base', 'atk_percent'],
        })],
    });

    expect(normal.statConstraints).toBe(constraints.statConstraints);
    expect(crit.setConstraints).toBe(constraints.setConstraints);
    expect(normal.objective.vectorIndex).toBe(0);
    expect(crit.objective.vectorIndex).toBe(1);
    expect(() => createOptimizationPlan({
        constraints: {},
        objective: 'average',
        variations: [makeVariation()],
    })).toThrow(/must come from createOptimizationPlanConstraints/);
});

test.each([
    ['unknown objective', {objective: 'charged'}, /objective must be/],
    ['missing default variation', {
        variations: [makeVariation({id: 'only'})],
    }, /Default optimization variation/],
    ['duplicate variation ID', {
        variations: [makeVariation(), makeVariation()],
    }, /Duplicate optimization variation ID/],
    ['missing target dependency', {
        settings: {stats: {atk_min: 1}},
        variations: [makeVariation()],
    }, /constraintTargetStats is missing/],
    ['missing used dependency', {
        settings: {stats: {atk_min: 1}},
        variations: [makeVariation({
            constraintTargetStats: ['atk_base', 'atk', 'atk_percent'],
            constraintUsedStats: ['atk_base', 'atk'],
        })],
    }, /constraintUsedStats is missing/],
    ['primitive AST node', {
        variations: [makeVariation({constraintPostEffects: [42]})],
    }, /must be an AST object/],
    ['primitive objective AST', {
        variations: [makeVariation({objectiveAst: 'compiled elsewhere'})],
    }, /objectiveAst must be an AST object/],
])('rejects %s', (name, overrides, expected) => {
    const input = Object.assign({
        settings: {},
        objective: 'average',
        variations: [makeVariation()],
    }, overrides);
    expect(() => createOptimizationPlan(input)).toThrow(expected);
});

test('variation selectors are threshold-based, unique, and unambiguous', () => {
    const alpha = makeVariation({
        id: 'alpha',
        setInfo: [{setName: 'AlphaSet', pieces: 2}],
    });
    const beta = makeVariation({
        id: 'beta',
        setInfo: [{setName: 'BetaSet', pieces: 2}],
    });

    expect(() => createOptimizationPlan({
        settings: {},
        objective: 'average',
        variations: [makeVariation(), alpha, beta],
    })).toThrow(/overlap without a unique most-specific variation/);

    const combined = makeVariation({
        id: 'alpha-beta',
        setInfo: [
            {setName: 'BetaSet', pieces: 2},
            {setName: 'AlphaSet', pieces: 2},
        ],
    });
    const plan = createOptimizationPlan({
        settings: {},
        objective: 'average',
        variations: [beta, combined, makeVariation(), alpha],
    });
    expect(plan.variations.map((variation) => variation.id)).toEqual([
        'default',
        'alpha',
        'alpha-beta',
        'beta',
    ]);
});

test('resolves threshold selectors by unique specificity for every physical set state', () => {
    const plan = createOptimizationPlan({
        settings: {},
        objective: 'average',
        variations: [
            makeVariation(),
            makeVariation({
                id: 'alpha-2',
                setInfo: [{setName: 'AlphaSet', pieces: 2}],
            }),
            makeVariation({
                id: 'alpha-4',
                setInfo: [{setName: 'AlphaSet', pieces: 4}],
            }),
            makeVariation({
                id: 'beta-2',
                setInfo: [{setName: 'BetaSet', pieces: 2}],
            }),
            makeVariation({
                id: 'alpha-beta',
                setInfo: [
                    {setName: 'AlphaSet', pieces: 2},
                    {setName: 'BetaSet', pieces: 2},
                ],
            }),
        ],
    });

    expect(resolveOptimizationPlanVariation(plan, {}).id).toBe('default');
    expect(resolveOptimizationPlanVariation(plan, {AlphaSet: 2}).id).toBe('alpha-2');
    expect(resolveOptimizationPlanVariation(plan, {AlphaSet: 4}).id).toBe('alpha-4');
    expect(resolveOptimizationPlanVariation(plan, {AlphaSet: 2, StaticSet: 2}).id).toBe('alpha-2');
    expect(resolveOptimizationPlanVariation(plan, {AlphaSet: 2, BetaSet: 2}).id).toBe('alpha-beta');
    expect(resolveOptimizationPlanVariation(plan, new Map([['BetaSet', 2]])).id).toBe('beta-2');
    expect(resolveOptimizationPlanVariation(plan, {AlphaSet: -1})).toBeUndefined();
});

test('rejects constraint inputs through shared strict parser rules and plan invariants', () => {
    expect(() => createOptimizationPlan({
        settings: {stats: {atk_min: 'not-a-number'}},
        objective: 'normal',
        variations: [makeVariation()],
    })).toThrow(/must be finite/);

    expect(() => createOptimizationPlan({
        settings: {
            setMinValues: {SameSet: 4},
            setMaxValues: {SameSet: 4},
        },
        objective: 'normal',
        variations: [makeVariation()],
    })).toThrow(/unsatisfiable/);

    expect(() => createOptimizationPlan({
        settings: {setMinValues: {RequiredSet: 6}},
        objective: 'normal',
        variations: [makeVariation()],
    })).toThrow(/integer from 0 to 5/);
});
