import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { CalcSet } from "../src/js/classes/CalcSet";
import { CPostEffect } from "../src/js/classes/Feature2/Compile/Types/Block";
import { CStat } from "../src/js/classes/Feature2/Compile/Types/Item";
import { WGSLMegaKernelCompiler } from "../src/js/classes/Feature2/WGSLCompiler";
import { DB } from "../src/js/db/DB";

global.DB = DB;

function makeSyntheticCompiler(postEffects, constraintStats) {
    return {
        // Deliberately omit constraint-only stats here. The mega-kernel must
        // merge constraintData.usedStats into its physical layout itself.
        usedStats: [],
        constraintData: {
            postEffects,
            usedStats: constraintStats,
        },
        processed: {
            compileWGSL: () => 'return vec3<f32>(1.0, 2.0, 3.0);',
        },
    };
}

function functionBody(kernel, name) {
    const start = kernel.indexOf(`fn ${name}(`);
    const next = kernel.indexOf('\nfn ', start + 1);
    return kernel.slice(start, next < 0 ? kernel.length : next);
}

test('WGSL constraints restore only post-effect targets before objective evaluation', () => {
    const rechargeFromMastery = new CPostEffect([
        new CStat({stat: 'mastery'}),
    ], {stat: 'recharge', priority: 3});
    const compiler = new WGSLMegaKernelCompiler();

    compiler.addVariation('default', makeSyntheticCompiler(
        [rechargeFromMastery],
        ['recharge', 'recharge_base', 'mastery', 'mastery_base'],
    ));

    const kernel = compiler.getMegaKernel({});
    const statMap = compiler.getStatIndexMap();
    const constraintFunction = functionBody(kernel, 'check_stat_constraints_v0');
    const mainFunction = functionBody(kernel, 'main');
    const rechargeOriginal = `constraint_original_${statMap.recharge}`;

    expect(statMap).toEqual(expect.objectContaining({
        recharge: expect.any(Number),
        recharge_base: expect.any(Number),
        mastery: expect.any(Number),
        mastery_base: expect.any(Number),
    }));
    expect(constraintFunction).toContain(`(*stats)[${statMap.mastery}u]`);
    expect(constraintFunction).toContain(`(*stats)[${statMap.recharge}u] +=`);
    expect(constraintFunction).toContain(
        `let ${rechargeOriginal} = (*stats)[${statMap.recharge}u];`,
    );
    expect(constraintFunction).toContain('let constraint_accepted = check_stat_constraints(stats);');
    expect(constraintFunction).toContain(
        `(*stats)[${statMap.recharge}u] = ${rechargeOriginal};`,
    );
    expect(constraintFunction).not.toContain(`constraint_original_${statMap.mastery}`);
    expect(constraintFunction.indexOf(`let ${rechargeOriginal}`)).toBeLessThan(
        constraintFunction.indexOf(`(*stats)[${statMap.recharge}u] +=`),
    );
    expect(constraintFunction.indexOf('check_stat_constraints(stats)')).toBeLessThan(
        constraintFunction.indexOf(`(*stats)[${statMap.recharge}u] = ${rechargeOriginal}`),
    );

    expect(kernel).toContain('fn dispatch_stat_constraints(');
    expect(kernel).toContain('case 0u: { return check_stat_constraints_v0(stats); }');
    expect(kernel).toContain('if (!(total >= c.min_value && total <= c.max_value))');
    expect(kernel).toContain('(bitcast<u32>(total) & 0x7f800000u) == 0x7f800000u');
    expect(mainFunction).toContain('if (params.has_stat_constraints != 0u) {');
    expect(mainFunction).not.toContain('constraint_stats');
    expect(mainFunction).toContain('dispatch_stat_constraints(variation, &stats)');
    expect(mainFunction).toContain('dispatch_variation(variation, &stats)');
    expect(mainFunction.indexOf('let variation =')).toBeLessThan(
        mainFunction.indexOf('dispatch_stat_constraints(variation, &stats)'),
    );
});

test('WGSL constraint restoration snapshots a repeated target exactly once', () => {
    const first = new CPostEffect([
        new CStat({stat: 'mastery'}),
    ], {stat: 'recharge', priority: 2});
    const second = new CPostEffect([
        new CStat({stat: 'recharge_base'}),
    ], {stat: 'recharge', priority: 3});
    const compiler = new WGSLMegaKernelCompiler();
    compiler.addVariation('default', makeSyntheticCompiler(
        [first, second],
        ['recharge', 'recharge_base', 'mastery'],
    ));

    const kernel = compiler.getMegaKernel({});
    const statMap = compiler.getStatIndexMap();
    const constraintFunction = functionBody(kernel, 'check_stat_constraints_v0');
    const original = `constraint_original_${statMap.recharge}`;

    expect(constraintFunction.match(new RegExp(`let ${original} =`, 'g'))).toHaveLength(1);
    expect(constraintFunction.match(new RegExp(`= ${original};`, 'g'))).toHaveLength(1);
    expect(constraintFunction.match(
        new RegExp(`\\(\\*stats\\)\\[${statMap.recharge}u\\] \\+=`, 'g'),
    )).toHaveLength(2);
});

test('WGSL constraints without post effects allocate no restoration temporaries', () => {
    const compiler = new WGSLMegaKernelCompiler();
    compiler.addVariation('default', makeSyntheticCompiler([], ['recharge']));

    const constraintFunction = functionBody(
        compiler.getMegaKernel({}),
        'check_stat_constraints_v0',
    );

    expect(constraintFunction).not.toContain('constraint_original_');
    expect(constraintFunction).toContain('let constraint_accepted = check_stat_constraints(stats);');
});

test('WGSL constraint dispatch uses the same indices as objective dispatch', () => {
    const compiler = new WGSLMegaKernelCompiler();
    compiler.addVariation('default', makeSyntheticCompiler([], []));
    compiler.addVariation('set-variation', makeSyntheticCompiler([], []));

    const kernel = compiler.getMegaKernel({});
    const objectiveDispatch = functionBody(kernel, 'dispatch_variation');
    const constraintDispatch = functionBody(kernel, 'dispatch_stat_constraints');

    expect(objectiveDispatch).toContain('case 0u: { return eval_v0(stats); }');
    expect(objectiveDispatch).toContain('case 1u: { return eval_v1(stats); }');
    expect(constraintDispatch).toContain('case 0u: { return check_stat_constraints_v0(stats); }');
    expect(constraintDispatch).toContain('case 1u: { return check_stat_constraints_v1(stats); }');
});

test('Hu Tao active skill metadata compiles HP-dependent ATK constraint adjustment', () => {
    const build = new CalcSet();
    build.setChar(DB.Chars.get('Hutao'));
    build.setEnemy(DB.Enemies.getFirst().getFirst());
    build.setCharSettings({hutao_paramita_papilio: true});

    const mainStats = {
        flower: 'hp',
        plume: 'atk',
        sands: 'hp_percent',
        goblet: 'dmg_pyro',
        circlet: 'crit_rate',
    };
    const artifacts = Object.entries(mainStats).map(([slot, mainStat]) => {
        return new Artifact(5, 20, slot, 'GladiatorFinale', mainStat, []);
    });
    const suggester = new ArtifactsSuggest({
        build,
        artifacts,
        featureName: 'attack.normal_hit_1',
        featureType: 'average',
        settings: {
            sets_settings: {},
            stats: {atk_min: 1},
            setMinValues: {},
            setMaxValues: {},
        },
        useGPU: false,
    });

    suggester.prepare();

    const variant = suggester.featureVariants.default;
    expect(variant.constraintData.postEffects.some((item) => item.stat == 'atk')).toBe(true);
    expect(variant.constraintData.usedStats).toEqual(expect.arrayContaining([
        'atk',
        'atk_base',
        'atk_percent',
        'hp',
        'hp_base',
        'hp_percent',
    ]));

    const compiler = new WGSLMegaKernelCompiler();
    compiler.addVariation('default', variant);
    const kernel = compiler.getMegaKernel({});
    const statMap = compiler.getStatIndexMap();
    const constraintFunction = functionBody(kernel, 'check_stat_constraints_v0');
    const atkOriginal = `constraint_original_${statMap.atk}`;

    expect(constraintFunction).toContain(`(*stats)[${statMap.hp_base}u]`);
    expect(constraintFunction).toContain(`(*stats)[${statMap.hp_percent}u]`);
    expect(constraintFunction).toContain(`(*stats)[${statMap.hp}u]`);
    expect(constraintFunction).toContain(`(*stats)[${statMap.atk}u] +=`);
    expect(constraintFunction).toContain(
        `let ${atkOriginal} = (*stats)[${statMap.atk}u];`,
    );
    expect(constraintFunction).toContain(`(*stats)[${statMap.atk}u] = ${atkOriginal};`);
});
