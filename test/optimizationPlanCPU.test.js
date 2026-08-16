import { CPostEffect } from "../src/js/classes/Feature2/Compile/Types/Block";
import { CConst, CStat } from "../src/js/classes/Feature2/Compile/Types/Item";
import { createOptimizationPlan } from "../src/js/classes/OptimizationPlan";
import {
    compileOptimizationPlanCPU,
    lowerOptimizationPlanCPU,
    OptimizationPlanCPU,
} from "../src/js/classes/OptimizationPlanCPU";
import { Stats } from "../src/js/classes/Stats";

function makeObjectiveAst(code = 'return [stats.normal, stats.crit, stats.average]') {
    return {
        compile() {
            return code;
        },
    };
}

function makeVariation(overrides = {}) {
    return Object.assign({
        id: 'default',
        objectiveAst: makeObjectiveAst(),
        objectiveUsedStats: ['normal', 'crit', 'average'],
        constraintPostEffects: [],
        constraintUsedStats: [],
        constraintTargetStats: [],
        setInfo: [],
    }, overrides);
}

function makePlan(overrides = {}) {
    return createOptimizationPlan(Object.assign({
        settings: {},
        objective: 'average',
        variations: [makeVariation()],
    }, overrides));
}

test('compiles specialized prefix and complete set-feasibility predicates', () => {
    const lowered = lowerOptimizationPlanCPU(makePlan({
        settings: {
            setMinValues: {Alpha: 2},
            setMaxValues: {Beta: 4},
        },
    }));

    expect(lowered).toBeInstanceOf(OptimizationPlanCPU);
    expect(compileOptimizationPlanCPU).toBe(lowerOptimizationPlanCPU);
    expect(lowered.variationsById.default).toBe(lowered.variations[0]);
    expect(Object.isFrozen(lowered.variationsById)).toBe(true);
    expect(lowered.rejectsSetPrefix({Alpha: 1, Beta: 3})).toBe(false);
    expect(lowered.rejectsSetPrefix({Beta: 4})).toBe(true);
    expect(lowered.rejectsCompleteSets({Alpha: 1, Beta: 3})).toBe(true);
    expect(lowered.rejectsCompleteSets({Alpha: 2, Beta: 3})).toBe(false);
    expect(lowered.rejectsCompleteSets({Alpha: 2, Beta: 4})).toBe(true);

    // Malformed and physically impossible external states fail closed.
    expect(lowered.rejectsSetPrefix(null)).toBe(true);
    expect(lowered.rejectsCompleteSets(new Map([['Alpha', 2]]))).toBe(true);
    expect(lowered.rejectsCompleteSets({Alpha: 2.5})).toBe(true);
    expect(lowered.rejectsCompleteSets({Alpha: 3, Beta: 3})).toBe(true);
});

test('resolves variation selectors by the unique-most-specific rule', () => {
    const plan = makePlan({
        variations: [
            makeVariation(),
            makeVariation({
                id: 'alpha',
                setInfo: [{setName: 'Alpha', pieces: 2}],
            }),
            makeVariation({
                id: 'beta',
                setInfo: [{setName: 'Beta', pieces: 2}],
            }),
            makeVariation({
                id: 'alpha-beta',
                setInfo: [
                    {setName: 'Alpha', pieces: 2},
                    {setName: 'Beta', pieces: 2},
                ],
            }),
        ],
    });
    const lowered = lowerOptimizationPlanCPU(plan);

    expect(lowered.resolveVariationId({})).toBe('default');
    expect(lowered.resolveVariationId({Alpha: 2})).toBe('alpha');
    expect(lowered.resolveVariationId({Beta: 2})).toBe('beta');
    expect(lowered.resolveVariationId({Alpha: 2, Beta: 2})).toBe('alpha-beta');
    expect(lowered.resolveVariationId({Alpha: Number.NaN})).toBeUndefined();
    expect(lowered.resolveVariationId(new Map([['Alpha', 2]]))).toBeUndefined();
    expect(lowered.resolveVariationId({Alpha: 3, Beta: 3})).toBeUndefined();

    for (const state of [{}, {Alpha: 2}, {Beta: 2}, {Alpha: 2, Beta: 2}]) {
        expect(lowered.resolveVariationIdTrusted(state)).toBe(lowered.resolveVariationId(state));
    }

    // Defense in depth: a corrupt/hand-authored plan with two incomparable
    // matching maxima is rejected instead of depending on variation order.
    const ambiguousPlan = Object.assign({}, plan, {
        variations: plan.variations.filter((variation) => variation.id !== 'alpha-beta'),
    });
    expect(
        lowerOptimizationPlanCPU(ambiguousPlan)
            .resolveVariationId({Alpha: 2, Beta: 2})
    ).toBeUndefined();
});

test('selects the planned objective component and discards non-finite scores', () => {
    let compileCalls = 0;
    const objectiveAst = {
        compile() {
            compileCalls += 1;
            return 'return [stats.normal, stats.crit, stats.average]';
        },
    };
    const lowered = lowerOptimizationPlanCPU(makePlan({
        objective: 'crit',
        variations: [makeVariation({objectiveAst})],
    }));

    expect(compileCalls).toBe(1);
    expect(lowered.evaluateScore('default', new Stats({
        normal: 10,
        crit: -2,
        average: 30,
    }))).toBe(-2);
    expect(lowered.evaluateScore('default', new Stats({crit: 0}))).toBe(0);
    expect(lowered.evaluateScore('default', new Stats({crit: Number.NaN}))).toBeUndefined();
    expect(lowered.evaluateScore('default', new Stats({crit: Number.POSITIVE_INFINITY}))).toBeUndefined();
});

test('applies constraint effects on reusable scratch stats in numeric priority order', () => {
    const priority2 = new CPostEffect([
        new CStat({stat: 'recharge'}),
    ], {stat: 'mastery', priority: 2});
    const priority10 = new CPostEffect([
        new CStat({stat: 'mastery'}),
    ], {stat: 'mastery', priority: 10});
    const originalItems2 = priority2.items;
    const originalItems10 = priority10.items;
    const originalChild2 = priority2.items[0];
    const originalChild10 = priority10.items[0];

    const plan = makePlan({
        settings: {stats: {mastery_min: 2}},
        variations: [makeVariation({
            constraintPostEffects: [priority10, priority2],
            constraintUsedStats: ['mastery', 'mastery_base', 'recharge'],
            constraintTargetStats: ['mastery', 'mastery_base'],
        })],
    });
    const lowered = lowerOptimizationPlanCPU(plan);

    // Priority 2 first makes mastery=1; priority 10 then reads it and reaches 2.
    const passing = new Stats({mastery: 0, mastery_base: 0, recharge: 1});
    const passingSnapshot = Object.assign({}, passing);
    expect(lowered.checkStats('default', passing)).toBe(true);
    expect(Object.assign({}, passing)).toEqual(passingSnapshot);

    // A second evaluation overwrites every scratch dependency; recharge=1
    // from the previous candidate must not leak into this candidate.
    const failing = new Stats({mastery: 0, mastery_base: 0, recharge: 0});
    expect(lowered.checkStats('default', failing)).toBe(false);

    // Lowering constructs wrapper nodes but never prepares/processes the
    // canonical semantic AST itself.
    expect(priority2.items).toBe(originalItems2);
    expect(priority10.items).toBe(originalItems10);
    expect(priority2.items[0]).toBe(originalChild2);
    expect(priority10.items[0]).toBe(originalChild10);
    expect(plan.variations[0].constraintPostEffects[0]).toBe(priority10);
});

test('finite-checks transformed constraint totals and fails closed for unknown variations', () => {
    const lowered = lowerOptimizationPlanCPU(makePlan({
        settings: {stats: {mastery_min: 1, mastery_max: 2}},
        variations: [makeVariation({
            objectiveAst: makeObjectiveAst('return [stats.score, stats.score, stats.score]'),
            objectiveUsedStats: ['score'],
            constraintUsedStats: ['mastery', 'mastery_base'],
            constraintTargetStats: ['mastery', 'mastery_base'],
        })],
    }));

    expect(lowered.evaluate('default', new Stats({
        mastery: 1,
        mastery_base: 0,
        score: -3,
    }))).toBe(-3);
    expect(lowered.checkStats('default', new Stats({
        mastery: Number.NaN,
        mastery_base: 0,
    }))).toBe(false);
    expect(lowered.checkStats('default', new Stats({
        mastery: Number.POSITIVE_INFINITY,
        mastery_base: 0,
    }))).toBe(false);
    expect(lowered.evaluate('default', new Stats({
        mastery: 1,
        mastery_base: 0,
        score: Number.POSITIVE_INFINITY,
    }))).toBeUndefined();

    expect(lowered.getVariation('missing')).toBeUndefined();
    expect(lowered.checkStats('missing', new Stats())).toBe(false);
    expect(lowered.evaluateScore('missing', new Stats())).toBeUndefined();
    expect(lowered.evaluate('missing', new Stats())).toBeUndefined();
});

test('lowering validates its executable inputs without mutating the plan', () => {
    expect(() => lowerOptimizationPlanCPU({})).toThrow(/requires an optimization-plan/);

    const wrongArithmetic = Object.assign({}, makePlan(), {
        numericPolicy: {cpuArithmetic: 'f32'},
    });
    expect(() => lowerOptimizationPlanCPU(wrongArithmetic)).toThrow(/requires f64 CPU arithmetic/);

    const plan = makePlan({
        variations: [makeVariation({objectiveAst: {kind: 'not-executable'}})],
    });
    expect(() => lowerOptimizationPlanCPU(plan)).toThrow(/must provide compile/);
    expect(plan.variations[0].objectiveAst).toEqual({kind: 'not-executable'});
});
