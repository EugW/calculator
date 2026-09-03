import { CPostEffect, CVar, CVarIncrease } from "../src/js/classes/Feature2/Compile/Types/Block";
import { CConst, CStat, CVarValue } from "../src/js/classes/Feature2/Compile/Types/Item";
import { CReturn } from "../src/js/classes/Feature2/Compile/Types";
import { CDamageResult, CDamageRotation } from "../src/js/classes/Feature2/Compile/Types/Damage";
import { WGSLFeatureCompiler, WGSLMegaKernelCompiler } from "../src/js/classes/Feature2/WGSLCompiler";

function objectiveAst(marker) {
    return {
        compileWGSL: jest.fn(() => `return vec3<f32>(${marker}.0, ${marker}.0, ${marker}.0);`),
    };
}

function variation({id, index, objective, objectiveStats = [], postEffects = [], constraintStats = []}) {
    return {
        id,
        index,
        objectiveAst: objective,
        objectiveUsedStats: objectiveStats,
        constraintPostEffects: postEffects,
        constraintUsedStats: constraintStats,
    };
}

function plan(variations) {
    return {
        kind: 'optimization-plan',
        variations,
    };
}

function functionBody(kernel, name) {
    const start = kernel.indexOf(`fn ${name}(`);
    const next = kernel.indexOf('\nfn ', start + 1);
    return kernel.slice(start, next < 0 ? kernel.length : next);
}

test('WGSL lowering uses plan indices for objective, constraints, and the exposed map', () => {
    const defaultObjective = objectiveAst(10);
    const setObjective = objectiveAst(20);
    const rechargeFromMastery = new CPostEffect([
        new CStat({stat: 'mastery'}),
    ], {stat: 'recharge', priority: 3});
    const compiler = new WGSLMegaKernelCompiler();

    // Deliberately put index 1 first. Plan indices, not array/Map insertion
    // order, must name functions and lookup values.
    const optimizationPlan = plan([
        variation({
            id: 'set-variation',
            index: 1,
            objective: setObjective,
            objectiveStats: ['recharge'],
            postEffects: [rechargeFromMastery],
            constraintStats: ['recharge_base', 'mastery', 'mastery_base'],
        }),
        variation({
            id: 'default',
            index: 0,
            objective: defaultObjective,
            objectiveStats: ['atk'],
            constraintStats: ['crit_rate'],
        }),
    ]);

    compiler.addOptimizationPlan(optimizationPlan);
    const kernel = compiler.getMegaKernel({});
    const variationMap = compiler.buildVariationMap();
    const statMap = compiler.getStatIndexMap();

    expect(compiler.optimizationPlan).toBe(optimizationPlan);
    expect([...variationMap]).toEqual([
        ['default', 0],
        ['set-variation', 1],
    ]);
    expect(functionBody(kernel, 'eval_v0')).toContain('vec3<f32>(10.0, 10.0, 10.0)');
    expect(functionBody(kernel, 'eval_v1')).toContain('vec3<f32>(20.0, 20.0, 20.0)');
    expect(functionBody(kernel, 'dispatch_variation')).toContain(
        'case 1u: { return eval_v1(stats); }',
    );
    expect(functionBody(kernel, 'dispatch_stat_constraints')).toContain(
        'case 1u: { return check_stat_constraints_v1(stats); }',
    );
    expect(functionBody(kernel, 'check_stat_constraints_v1')).toContain(
        `(*stats)[${statMap.recharge}u] +=`,
    );
});

test('WGSL plan lowering has a canonical stat layout and does not mutate shared AST nodes', () => {
    const effectInput = new CStat({stat: 'z_input'});
    const effect = new CPostEffect([effectInput], {stat: 'm_target', priority: 2});
    const objective = objectiveAst(1);
    const originalEffectItems = effect.items.slice();
    const originalEffectKeys = Object.keys(effect).sort();
    const compiler = new WGSLMegaKernelCompiler();

    compiler.addOptimizationPlan(plan([
        variation({
            id: 'default',
            index: 0,
            objective,
            objectiveStats: ['z_input', 'a_objective'],
            postEffects: [effect],
            constraintStats: ['m_target', 'b_constraint'],
        }),
    ]));

    compiler.getMegaKernel({});
    compiler.getMegaKernel({});

    expect(compiler.getStatIndexMap()).toEqual({
        a_objective: 0,
        b_constraint: 1,
        m_target: 2,
        z_input: 3,
    });
    expect(effect.items).toEqual(originalEffectItems);
    expect(effect.items[0]).toBe(effectInput);
    expect(Object.keys(effect).sort()).toEqual(originalEffectKeys);
});

test('unknown WGSL variation indices fail closed instead of executing variation zero', () => {
    const compiler = new WGSLMegaKernelCompiler();
    compiler.addOptimizationPlan(plan([
        variation({
            id: 'default',
            index: 0,
            objective: objectiveAst(1),
        }),
    ]));

    const kernel = compiler.getMegaKernel({});
    const objectiveDispatch = functionBody(kernel, 'dispatch_variation');
    const constraintDispatch = functionBody(kernel, 'dispatch_stat_constraints');

    expect(objectiveDispatch).toContain(
        'bitcast<f32>(0x7fc00000u | (variation & 0x003fffffu))',
    );
    expect(objectiveDispatch).not.toContain('default: { return eval_v0(stats); }');
    expect(constraintDispatch).toContain('default: { return false; }');
    expect(constraintDispatch).not.toContain(
        'default: { return check_stat_constraints_v0(stats); }',
    );
});

test('legacy addVariation remains compatible with the shared descriptor lowerer', () => {
    const compiler = new WGSLMegaKernelCompiler();
    compiler.addVariation('default', {
        usedStats: ['z_stat', 'a_stat'],
        processed: objectiveAst(7),
        constraintData: {
            postEffects: [],
            usedStats: ['m_stat'],
        },
    });

    const kernel = compiler.getMegaKernel({});

    expect(compiler.getStatIndexMap()).toEqual({a_stat: 0, m_stat: 1, z_stat: 2});
    expect(functionBody(kernel, 'eval_v0')).toContain('vec3<f32>(7.0, 7.0, 7.0)');
    expect([...compiler.buildVariationMap()]).toEqual([['default', 0]]);
});

test('WGSL variable names are independent of AST allocation history and preserve reads and updates', () => {
    const kernels = [];
    const variableNames = [];
    for (let iteration = 0; iteration < 2; ++iteration) {
        // Same readable prefix, distinct variables, with cross-references and an update.
        const first = new CVar([new CConst({value: 2})], {name: 'normal'});
        const second = new CVar([new CConst({value: 3})], {name: 'normal'});
        const objective = new CReturn([
            first, second,
            new CVarIncrease([new CVarValue({ref: second})], {ref: first}),
            new CDamageResult([
                new CVarValue({ref: first}), new CVarValue({ref: second}), new CVarValue({ref: first}),
            ]),
        ]);
        const originalCPUCode = objective.compile({});
        variableNames.push([first.name, second.name]);
        const compiler = new WGSLMegaKernelCompiler();
        compiler.addOptimizationPlan(plan([
            variation({id: 'default', index: 0, objective,
                postEffects: [new CPostEffect([new CStat({stat: 'mastery'})], {stat: 'recharge', priority: 1})],
                constraintStats: ['mastery', 'recharge']}),
            variation({id: 'other', index: 1, objective}),
        ]));
        const kernel = compiler.getMegaKernel({});
        kernels.push(kernel);
        expect(compiler.getMegaKernel({})).toBe(kernel);
        expect(objective.compile({})).toBe(originalCPUCode);
        expect([first.name, second.name]).toEqual(variableNames[iteration]);
        expect(Function('stats', originalCPUCode)({})).toEqual([5, 3, 5]);
        for (const name of ['eval_v0', 'eval_v1']) {
            const body = functionBody(kernel, name);
            expect(body).toContain('var local_0 = 2.0');
            expect(body).toContain('var local_1 = 3.0');
            expect(body).toContain('local_0 += local_1');
            expect(body).toContain('return vec3<f32>(local_0, local_1, local_0)');
        }
        expect(functionBody(kernel, 'check_stat_constraints_v0')).toContain('var local_0 =');
    }
    expect(variableNames[0]).not.toEqual(variableNames[1]);
    expect(kernels[0]).toBe(kernels[1]);
});

test('standalone WGSL functions get fresh variable mappings on every emission', () => {
    const functions = [];
    for (let iteration = 0; iteration < 2; ++iteration) {
        const value = new CVar([new CConst({value: 7})], {name: 'normal'});
        const objective = new CDamageRotation([value], {vars: [
            new CVarValue({ref: value}), new CVarValue({ref: value}), new CVarValue({ref: value}),
        ]});
        const compiler = new WGSLFeatureCompiler(objective);
        compiler.prepareWGSL(null, {dontInsertVariables: true});
        const options = {variableNames: new Map([['unrelated', 'local_0']])};
        const source = compiler.getWGSLCode(options);
        expect(source).toContain('var local_0 = 7.0');
        expect(compiler.getWGSLCode(options)).toBe(source);
        expect(options.variableNames.size).toBe(1);
        functions.push(source);
    }
    expect(functions[0]).toBe(functions[1]);
});
