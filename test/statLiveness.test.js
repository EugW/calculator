import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { CalcSet } from "../src/js/classes/CalcSet";
import { FeatureCompiler } from "../src/js/classes/Feature2/Compiler";
import {
    CStatIncrease,
    CStatSet,
    CSum,
    CValueCap,
} from "../src/js/classes/Feature2/Compile/Types/Block";
import { CStat } from "../src/js/classes/Feature2/Compile/Types/Item";
import { CBlock } from "../src/js/classes/Feature2/Compile/Types";
import {
    WGSLFeatureCompiler,
    WGSLMegaKernelCompiler,
} from "../src/js/classes/Feature2/WGSLCompiler";
import { DB } from "../src/js/db/DB";

global.DB = DB;

const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const MAIN_STATS = {
    flower: 'hp',
    plume: 'atk',
    sands: 'mastery',
    goblet: 'dmg_phys',
    circlet: 'crit_rate',
};

function prepareCompiler(tree, opts = {}) {
    const compiler = new FeatureCompiler(tree);
    compiler.prepare(null, Object.assign({
        dontInsertVariables: true,
    }, opts));
    return compiler;
}

function expectStats(actual, expected) {
    expect([...actual].sort()).toEqual([...expected].sort());
}

function makeJeanXiphosSuggester() {
    const build = new CalcSet();
    build.setChar(DB.Chars.get('Jean'));
    build.setEnemy(DB.Enemies.getFirst().getFirst());
    build.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    build.setWeaponSettings({whisper_of_the_jinn: true});

    const artifacts = SLOTS.map((slot) => {
        return new Artifact(5, 20, slot, 'GladiatorFinale', MAIN_STATS[slot], []);
    });

    return new ArtifactsSuggest({
        build,
        artifacts,
        featureName: 'attack.normal_hit_1',
        featureType: 'average',
        settings: {
            sets_settings: {},
            stats: {recharge_min: 100},
            setMinValues: {},
            setMaxValues: {},
        },
        limit: 20,
        useGPU: false,
        showBeta: true,
    });
}

test('post-folding liveness removes stats replaced by static constants', () => {
    const compiler = prepareCompiler(new CSum([
        new CStat({stat: 'folded', value: 12}),
        new CStat({stat: 'dynamic'}),
    ]), {
        staticStats: ['folded'],
    });

    expectStats(compiler.usedStats, ['dynamic']);
});

test('post-folding liveness retains direct reads and assignment destinations', () => {
    const compiler = prepareCompiler(new CBlock([
        new CStatSet([
            new CStat({stat: 'assignment_input'}),
        ], {stat: 'assignment_target'}),
        new CStat({stat: 'direct_read'}),
    ], {noReturn: true}));

    expectStats(compiler.usedStats, [
        'assignment_input',
        'assignment_target',
        'direct_read',
    ]);
});

test('renamed stat increases retain their implicit source read and destination write', () => {
    const compiler = prepareCompiler(new CBlock([
        new CStatIncrease([
            new CStat({stat: 'delta'}),
        ], {
            stat: 'rotation_source',
            newName: 'rotation_destination',
        }),
    ], {noReturn: true}));

    expectStats(compiler.usedStats, [
        'delta',
        'rotation_destination',
        'rotation_source',
    ]);
});

test('dynamic value-cap expressions participate in stat liveness', () => {
    const compiler = prepareCompiler(new CValueCap([
        new CStat({stat: 'uncapped_value'}),
    ], {
        value: new CStat({stat: 'dynamic_cap'}),
    }));

    expectStats(compiler.usedStats, [
        'dynamic_cap',
        'uncapped_value',
    ]);
});

test('standalone WGSL preparation uses exact final-AST liveness', () => {
    const compiler = new WGSLFeatureCompiler(new CBlock([
        new CStatIncrease([
            new CStat({stat: 'delta'}),
        ], {
            stat: 'rotation_source',
            newName: 'rotation_destination',
        }),
        new CStat({stat: 'folded', value: 12}),
    ], {noReturn: true}));

    compiler.prepareWGSL(null, {
        dontInsertVariables: true,
        staticStats: ['folded'],
    });

    expectStats(Object.keys(compiler.getStatIndexMap()), [
        'delta',
        'rotation_destination',
        'rotation_source',
    ]);
    expect(() => compiler.getWGSLCode({})).not.toThrow();
});

test('constraint-only dependencies stay out of objective liveness but enter the GPU layout', () => {
    const suggester = makeJeanXiphosSuggester();
    suggester.prepare();

    const variation = suggester.optimizationPlan.variations.find((item) => {
        return item.id == 'default';
    });
    const constraintOnlyStats = [
        'mastery',
        'mastery_base',
        'recharge',
        'recharge_base',
    ];
    const objectiveStats = [
        'atk',
        'atk_percent',
        'crit_dmg',
        'crit_rate',
        'dmg_normal',
        'dmg_phys',
    ];

    expectStats(variation.objectiveUsedStats, objectiveStats);
    expect(variation.constraintUsedStats).toEqual(expect.arrayContaining(constraintOnlyStats));
    for (const stat of constraintOnlyStats) {
        expect(variation.objectiveUsedStats).not.toContain(stat);
    }

    const compiler = new WGSLMegaKernelCompiler();
    compiler.addOptimizationPlan(suggester.optimizationPlan);
    const statMap = compiler.getStatIndexMap();
    expect(statMap).toEqual(expect.objectContaining(
        Object.fromEntries(constraintOnlyStats.map((stat) => [stat, expect.any(Number)])),
    ));
    expectStats(Object.keys(statMap), [...objectiveStats, ...constraintOnlyStats]);
});
