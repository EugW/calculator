import {GPUOptimizerInputs} from '../src/js/classes/GPUOptimizerInputs';
import {installGPUConstants, makeArtifact, makeSlots, makePreparedOptimizer} from './support/gpuOptimizer';
import {
    GPUArtifactOptimizer,
    countGPUCombinationBatches,
    createGPUCombinationShardPlan,
    iterateGPUCombinationShards,
} from "../src/js/classes/GPUArtifactOptimizer";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { WGSLMegaKernelCompiler } from "../src/js/classes/Feature2/WGSLCompiler";

installGPUConstants();

function makeConstantCompiler() {
    return {
        usedStats: [],
        processed: {
            compileWGSL: () => 'return vec3<f32>(0.0, 0.0, 0.0);',
        },
    };
}

test('constant objectives use a non-empty GPU stat layout', () => {
    const compiler = new WGSLMegaKernelCompiler();
    compiler.addVariation('default', makeConstantCompiler());

    const kernel = compiler.getMegaKernel({});

    expect(Object.keys(compiler.getStatIndexMap())).toHaveLength(1);
    expect(kernel).toContain('const STAT_COUNT: u32 = 1u;');
    expect(kernel).not.toMatch(/array<[^>]+,\s*0>/);
    expect(kernel).not.toContain('array<vec4<f32>, 0>');
    expect(kernel).toContain('bitcast<f32>(0x7fc00000u | (local_idx & 0x003fffffu))');
    expect(kernel).not.toContain('bitcast<f32>(0x7fc00000u);');
});

test('GPU shard plan exactly covers the reported 120.4B pool with u32-safe local indices', () => {
    const counts = {
        flower: 149,
        plume: 164,
        sands: 173,
        goblet: 178,
        circlet: 160,
    };
    const plan = createGPUCombinationShardPlan(counts);
    const shards = [...iterateGPUCombinationShards(plan)];

    expect(plan.totalCombinations).toBe(120397149440);
    expect(plan.splitSlot).toBe('flower');
    expect(plan.suffixCombinations).toBe(808034560);
    expect(plan.splitCount).toBe(5);
    expect(plan.shardCount).toBe(30);
    expect(shards).toHaveLength(30);

    let cursor = 0;
    for (const shard of shards) {
        expect(shard.globalStart).toBe(cursor);
        expect(shard.combinationCount).toBeLessThanOrEqual(0xFFFFFFFF);
        cursor += shard.combinationCount;
    }
    expect(cursor).toBe(plan.totalCombinations);
    expect(shards[0].counts).toEqual([5, 164, 173, 178, 160]);
    expect(shards[29].starts).toEqual([145, 0, 0, 0, 0]);
    expect(shards[29].counts).toEqual([4, 164, 173, 178, 160]);
    expect(countGPUCombinationBatches(plan, 512 * 1024)).toBe(229668);
});

test('GPU shard plan fixes multiple outer axes when the inner suffix exceeds its local limit', () => {
    const plan = createGPUCombinationShardPlan({
        flower: 2,
        plume: 3,
        sands: 4,
        goblet: 5,
        circlet: 6,
    }, 100);
    const shards = [...iterateGPUCombinationShards(plan)];

    expect(plan.splitSlot).toBe('sands');
    expect(plan.prefixCombinations).toBe(6);
    expect(plan.splitCount).toBe(3);
    expect(shards).toHaveLength(12);
    expect(shards[0]).toMatchObject({
        globalStart: 0,
        combinationCount: 90,
        starts: [0, 0, 0, 0, 0],
        counts: [1, 1, 3, 5, 6],
    });
    expect(shards[1]).toMatchObject({
        globalStart: 90,
        combinationCount: 30,
        starts: [0, 0, 3, 0, 0],
        counts: [1, 1, 1, 5, 6],
    });
    expect(shards[2].starts).toEqual([0, 1, 0, 0, 0]);
    expect(shards.at(-1).globalStart + shards.at(-1).combinationCount).toBe(720);
});

test('the exact u32 Cartesian boundary remains one GPU shard', () => {
    const plan = createGPUCombinationShardPlan({
        flower: 0xFFFFFFFF,
        plume: 1,
        sands: 1,
        goblet: 1,
        circlet: 1,
    });

    expect(plan.shardCount).toBe(1);
    expect([...iterateGPUCombinationShards(plan)][0]).toMatchObject({
        globalStart: 0,
        combinationCount: 0xFFFFFFFF,
        counts: [0xFFFFFFFF, 1, 1, 1, 1],
    });
});

test('GPU still rejects global Cartesian indices beyond JavaScript safe integers', async () => {
    const optimizer = makePreparedOptimizer();
    const slots = {
        flower: {length: Number.MAX_SAFE_INTEGER},
        plume: {length: 2},
        sands: {length: 1},
        goblet: {length: 1},
        circlet: {length: 1},
    };

    await expect(optimizer.optimize({
        slots,
        buildData: {stats: {}},
        setData: {},
    })).rejects.toThrow('must fit JavaScript\'s safe-integer index range');
    expect(optimizer.device.createBuffer).not.toHaveBeenCalled();
});

test('GPU execution merges shard-local batches by one global tie index', async () => {
    const optimizer = makePreparedOptimizer([5, 5], {maxShardCombinations: 2});
    const slots = makeSlots(5);
    const progress = [];

    const results = await optimizer.optimize({
        slots,
        buildData: {stats: {}},
        setData: {},
        batchSize: 2,
        limit: 20,
        callback: (...args) => progress.push(args),
    });

    expect(results.slice(0, 3).map((item) => item.combinationIndex)).toEqual([0, 1, 2]);
    expect(results.slice(0, 3).map((item) => item.artifacts[0])).toEqual([
        slots.flower[0],
        slots.flower[1],
        slots.flower[2],
    ]);
    expect(optimizer.lastOptimizeProfile).toMatchObject({
        totalCombinations: 5,
        shardCount: 3,
        numBatches: 3,
    });
    expect(optimizer.lastOptimizeProfile.batches.map((batch) => batch.batchStart)).toEqual([0, 2, 4]);
    expect(optimizer.lastOptimizeProfile.batches.map((batch) => batch.shardBatchStart)).toEqual([0, 0, 0]);
    expect(progress[0]).toEqual([0, 5, 0]);
    expect(progress.at(-1)).toEqual([5, 5, 0]);
});

test.each([
    {
        name: 'one shard with five batches',
        flowerCount: 9,
        maxShardCombinations: 9,
        batchSize: 2,
        shardCount: 1,
        numBatches: 5,
    },
    {
        name: 'three shards with seven batches',
        flowerCount: 12,
        maxShardCombinations: 5,
        batchSize: 2,
        shardCount: 3,
        numBatches: 7,
    },
])(
    'GPU resident top-K reads once per shard for $name',
    async ({flowerCount, maxShardCombinations, batchSize, shardCount, numBatches}) => {
        const optimizer = makePreparedOptimizer([1], {maxShardCombinations});

        await optimizer.optimize({
            slots: makeSlots(flowerCount),
            buildData: {stats: {}},
            setData: {},
            batchSize,
            limit: 20,
        });

        expect(optimizer.lastOptimizeProfile).toMatchObject({
            resultMode: 'gpu-shard-top-k-20',
            shardCount,
            numBatches,
            readbackCount: shardCount,
            shardMergeDispatches: numBatches - shardCount,
            totalReadbackBytes: shardCount * 20 * 8,
        });
        const readbackCopies = optimizer.testGPUCalls.copyBufferToBuffer.mock.calls
            .filter((call) => (call[2].usage & global.GPUBufferUsage.MAP_READ) !== 0);
        expect(optimizer.testGPUCalls.mapAsync).toHaveBeenCalledTimes(shardCount);
        expect(readbackCopies).toHaveLength(shardCount);
        expect(optimizer.testGPUCalls.dispatchWorkgroups).toHaveBeenCalledTimes(
            numBatches + optimizer.lastOptimizeProfile.reductionDispatches
        );
    }
);

test('GPU resident top-K checkpoints long shards without mapping intermediate batches', async () => {
    const optimizer = makePreparedOptimizer([1], {maxShardCombinations: 130});

    await optimizer.optimize({
        slots: makeSlots(130),
        buildData: {stats: {}},
        setData: {},
        batchSize: 1,
        limit: 20,
    });

    expect(optimizer.lastOptimizeProfile).toMatchObject({
        shardCount: 1,
        numBatches: 130,
        readbackCount: 1,
        queueCheckpointCount: 2,
        totalReadbackBytes: 20 * 8,
    });
    expect(optimizer.testGPUCalls.onSubmittedWorkDone).toHaveBeenCalledTimes(2);
    expect(optimizer.testGPUCalls.mapAsync).toHaveBeenCalledTimes(1);
});

test('GPU optimization destroys run-local buffers when a progress callback throws', async () => {
    const optimizer = makePreparedOptimizer([1]);

    await expect(optimizer.optimize({
        slots: makeSlots(2),
        buildData: {stats: {}},
        setData: {},
        batchSize: 1,
        limit: 20,
        callback(completed) {
            if (completed > 0) {
                throw new Error('progress callback failed');
            }
        },
    })).rejects.toThrow('progress callback failed');

    const buffers = optimizer.device.createBuffer.mock.results
        .map((result) => result.value)
        .filter(Boolean);
    expect(buffers.length).toBeGreaterThan(0);
    for (const buffer of buffers) {
        expect(buffer.destroy).toHaveBeenCalledTimes(1);
    }
});

test('large GPU runs bound retained batch profiles and throttle progress messages', async () => {
    const optimizer = makePreparedOptimizer([1], {maxShardCombinations: 1});
    optimizer.now = () => 0;
    const progress = [];

    await optimizer.optimize({
        slots: makeSlots(2050),
        buildData: {stats: {}},
        setData: {},
        batchSize: 1,
        limit: 20,
        callback: (...args) => progress.push(args),
    });

    expect(optimizer.lastOptimizeProfile.numBatches).toBe(2050);
    expect(optimizer.lastOptimizeProfile.batches).toHaveLength(2048);
    expect(optimizer.lastOptimizeProfile.omittedBatchProfiles).toBe(2);
    expect(progress).toEqual([[0, 2050, 0], [2050, 2050, 0]]);
});

test('GPU result merge keeps feasible zero scores and drops the NaN invalid sentinel', async () => {
    const optimizer = makePreparedOptimizer([0, NaN]);
    const slots = makeSlots(2);

    const results = await optimizer.optimize({
        slots,
        buildData: { stats: {} },
        setData: {},
        limit: 20,
    });

    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(0);
    expect(results[0].artifacts[0]).toBe(slots.flower[0]);
});

test('GPU top-K orders equal scores by ascending global combination index', async () => {
    const optimizer = makePreparedOptimizer([1, 2, 0, 5, 5]);
    const slots = makeSlots(5);

    const results = await optimizer.optimize({
        slots,
        buildData: { stats: {} },
        setData: {},
        limit: 20,
    });

    expect(results.slice(0, 3).map((item) => item.value)).toEqual([5, 5, 2]);
    expect(results.slice(0, 3).map((item) => item.artifacts[0])).toEqual([
        slots.flower[3],
        slots.flower[4],
        slots.flower[1],
    ]);
});

test.each([
    [{ stats: { recharge_min: '12abc' } }, 'must be finite'],
    [{ stats: { crit_rate_max: Infinity } }, 'must be finite'],
])('GPU direct callers reject malformed constraints before creating buffers', async (settings, message) => {
    const optimizer = makePreparedOptimizer();

    await expect(optimizer.optimize({
        slots: makeSlots(),
        buildData: { stats: {} },
        setData: {},
        settings,
    })).rejects.toThrow(message);

    expect(optimizer.device.createBuffer).not.toHaveBeenCalled();
});

test('a prepared shared plan rejects semantic overrides at dispatch time', async () => {
    const optimizer = makePreparedOptimizer();
    optimizer.prepared.optimizationPlan = {
        kind: 'optimization-plan',
        objective: {vectorIndex: 2},
        statConstraints: {bounds: []},
        setConstraints: {minValues: {}, maxValues: {}},
    };

    await expect(optimizer.optimize({
        slots: makeSlots(),
        buildData: {stats: {}},
        setData: {},
        damageIndex: 0,
    })).rejects.toThrow('semantics are bound by OptimizationPlan');

    expect(optimizer.device.createBuffer).not.toHaveBeenCalled();
});

test('GPU rejects finite f64 bounds that overflow its f32 uniform ABI', () => {
    const optimizer = new GPUOptimizerInputs();

    expect(() => optimizer.buildConstraintData([{
        stat: 'atk',
        op: 'max',
        value: 1e300,
        isRealTotal: true,
    }], {
        atk: 0,
        atk_base: 1,
        atk_percent: 2,
    })).toThrow('outside the finite f32 domain');
});

test('a failed pipeline re-prepare invalidates the old executable state', async () => {
    const optimizer = new GPUArtifactOptimizer();
    optimizer.context.device = {};
    optimizer.prepared = {};
    optimizer.pipeline = {old: true};
    optimizer.prepared.optimizationPlan = {kind: 'optimization-plan', old: true};

    await expect(optimizer.preparePipeline({
        kind: 'optimization-plan',
        numericPolicy: {gpuArithmetic: 'f64'},
    }, {})).rejects.toThrow('must declare f32 GPU arithmetic');

    expect(optimizer.pipeline).toBeNull();
    expect(optimizer.optimizationPlan).toBeNull();
    expect(optimizer.statIndexMap).toBeNull();
});

test('GPU rejects more than 128 visible sets before lookup-key corruption', async () => {
    const optimizer = makePreparedOptimizer();
    const setMinValues = Object.fromEntries(
        Array.from({length: 128}, (_, index) => [`overflow_set_${index}`, 2])
    );

    await expect(optimizer.optimize({
        slots: makeSlots(),
        buildData: { stats: {} },
        setData: {},
        settings: {setMinValues},
    })).rejects.toThrow('at most 128 visible artifact sets');

    expect(optimizer.device.createBuffer).not.toHaveBeenCalled();
});

test('GPU rejects a zero-sized Cartesian product before creating buffers', async () => {
    const optimizer = makePreparedOptimizer();
    const slots = makeSlots();
    slots.flower = [];

    await expect(optimizer.optimize({
        slots,
        buildData: { stats: {} },
        setData: {},
    })).rejects.toThrow('at least one artifact in every slot');

    expect(optimizer.device.createBuffer).not.toHaveBeenCalled();
});

test('GPU rejects reachable set bonuses outside the 2pc/4pc threshold model', async () => {
    const optimizer = makePreparedOptimizer();

    await expect(optimizer.optimize({
        slots: makeSlots(),
        buildData: { stats: {} },
        setData: {
            test_set: {
                1: {stats: {__test_dummy_stat__: 1}},
            },
        },
    })).rejects.toThrow('does not support a reachable 1-piece effect');

    expect(optimizer.device.createBuffer).not.toHaveBeenCalled();
});

test.each([
    ['zero limit', { limit: 0 }, 'result limit is fixed at 20'],
    ['non-20 limit', { limit: 21 }, 'result limit is fixed at 20'],
    ['damage index', { damageIndex: 3 }, 'damageIndex must be 0, 1, or 2'],
])('GPU optimization validates %s before creating buffers', async (_name, override, message) => {
    const optimizer = makePreparedOptimizer();

    await expect(optimizer.optimize({
        slots: makeSlots(),
        buildData: { stats: {} },
        setData: {},
        ...override,
    })).rejects.toThrow(message);

    expect(optimizer.device.createBuffer).not.toHaveBeenCalled();
});

test.each([0, 21, NaN])(
    'ArtifactsSuggest rejects GPU limit %p before initializing WebGPU',
    async (limit) => {
        const suggester = new ArtifactsSuggest({limit});

        await expect(suggester.getResultGPU()).rejects.toThrow('result limit is fixed at 20');
    }
);

test.each([{}, {limit: undefined}])(
    'ArtifactsSuggest defaults omitted GPU limit to 20',
    (options) => {
        const suggester = new ArtifactsSuggest(options);

        expect(suggester.requestedLimit).toBe(20);
        expect(suggester.limit).toBe(20);
    }
);
