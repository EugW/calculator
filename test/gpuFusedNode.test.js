/**
 * Real-GPU fused outcome tests via Dawn Node bindings (`webgpu` npm package).
 * See test/support/gpuNode.js for the layer split. Run with `npm run test:gpu`.
 */
import { GPU_SLOT_NAMES } from '../src/js/classes/GPUOptimizerInputs';
import {
    buildFusedOutcomeSegments,
    decodeDenseComplement,
    resolveDenseRows,
} from '../src/js/classes/ArtifactsSuggest';
import {
    skipWhenNoGPU,
    walkLogicalRegions,
    preparedFusedOptimizer,
    spyOnQueueWrites,
    laneZeroPlan,
    testArtifact as art,
} from './support/gpuNode';

it('dense single dispatch finds the best complement on a real device', async () => {
    if (await skipWhenNoGPU()) return;
    const optimizer = await preparedFusedOptimizer(laneZeroPlan());
    expect(optimizer).not.toBeNull();

    const slots = {
        flower: [art('flower', 'X', 1), art('flower', 'X', 2)],
        plume: [art('plume', 'X', 4)],
        sands: [art('sands', 'X', 8)],
        goblet: [art('goblet', 'X', 0)],
        circlet: [art('circlet', 'X', 16)],
    };
    const outcomes = [art('goblet', 'X', 100), art('goblet', 'X', 200)];
    const result = await optimizer.optimizeForcedOutcomes({slots, buildData: {stats: {}}, setData: {},
        outcomeArtifacts: outcomes, targetSlot: 'goblet', compact: true});
    // c0: 1+4+8+16=29, c1: 2+4+8+16=30.
    expect(result.complementCount).toBe(2);
    expect([...result.bestValues]).toEqual([130, 230]);
    expect([...result.complementIndices]).toEqual([1, 1]);
    optimizer.destroy();
}, 120000);

it('topology pruning excludes the off-topology optimum on device', async () => {
    if (await skipWhenNoGPU()) return;
    const optimizer = await preparedFusedOptimizer(laneZeroPlan());
    expect(optimizer).not.toBeNull();

    const slots = {
        flower: [art('flower', 'X', 1), art('flower', 'Y', 1000)],
        plume: [art('plume', 'X', 4)],
        sands: [art('sands', 'X', 8), art('sands', 'Y', 1000)],
        goblet: [art('goblet', 'X', 0)],
        circlet: [art('circlet', 'X', 16)],
    };
    const outcomes = [art('goblet', 'X', 0)];
    const plan = buildFusedOutcomeSegments(slots, 'goblet', outcomes, {kind: '4pc', sets: ['X']});
    resolveDenseRows(plan);
    // Off-topology Y+Y (2020) must be absent: 3 regions, valid 3.
    expect(plan.regions).toHaveLength(3);
    expect(plan.validCount).toBe(3);
    const prepared = optimizer.prepareForcedOutcomes(outcomes, 'goblet');
    const result = await optimizer.optimizeForcedOutcomes({slots: plan.packedSlots, buildData: {stats: {}},
        setData: {}, preparedOutcomes: prepared,
        targetSlot: 'goblet', densePlan: plan, compact: true});
    try {
        expect(result.complementCount).toBe(3);
        // Regions in depth-first axis order: all-req 29 (c0), free@sands 1021 (c1), free@flower 1028 (c2).
        expect([...result.bestValues]).toEqual([1028]);
        expect([...result.complementIndices]).toEqual([2]);
        // Host decode of the winner agrees with the independent oracle order.
        const refs = GPU_SLOT_NAMES.flatMap((slot) => plan.packedSlots[slot]);
        const oracle = [];
        walkLogicalRegions(slots, 'goblet', outcomes, {kind: '4pc', sets: ['X']}, (picks) => oracle.push(picks));
        const winner = decodeDenseComplement(result.complementIndices[0], plan, refs);
        const oracleSums = oracle.map((picks) => picks.reduce((total, artifact) => total + artifact.calculated.s, 0));
        expect(winner.reduce((total, artifact) => total + artifact.calculated.s, 0))
            .toBe(Math.max(...oracleSums));
    } finally {
        prepared.destroy();
        optimizer.destroy();
    }
}, 120000);

it('exact ties resolve to the smaller dense index on device', async () => {
    if (await skipWhenNoGPU()) return;
    const optimizer = await preparedFusedOptimizer(laneZeroPlan());
    expect(optimizer).not.toBeNull();

    const slots = {
        flower: [art('flower', 'X', 1), art('flower', 'X', 1)],
        plume: [art('plume', 'X', 4)],
        sands: [art('sands', 'X', 8)],
        goblet: [art('goblet', 'X', 0)],
        circlet: [art('circlet', 'X', 16)],
    };
    const outcomes = [art('goblet', 'X', 10)];
    const result = await optimizer.optimizeForcedOutcomes({slots, buildData: {stats: {}}, setData: {},
        outcomeArtifacts: outcomes, targetSlot: 'goblet', compact: true});
    // Both complements sum to 29; deterministic tie-break keeps c0.
    expect([...result.bestValues]).toEqual([39]);
    expect([...result.complementIndices]).toEqual([0]);
    optimizer.destroy();
}, 120000);

it('partial bests initialize to infeasible sentinels on a real queue', async () => {
    if (await skipWhenNoGPU()) return;
    const optimizer = await preparedFusedOptimizer(laneZeroPlan());
    expect(optimizer).not.toBeNull();
    const writes = spyOnQueueWrites(optimizer.device);

    const slots = {
        flower: [art('flower', 'X', 1)],
        plume: [art('plume', 'X', 2)],
        sands: [art('sands', 'X', 3)],
        goblet: [art('goblet', 'X', 0)],
        circlet: [art('circlet', 'X', 4)],
    };
    const outcomes = [art('goblet', 'X', 5), art('goblet', 'X', 6)];
    const result = await optimizer.optimizeForcedOutcomes({slots, buildData: {stats: {}}, setData: {},
        outcomeArtifacts: outcomes, targetSlot: 'goblet', compact: true});
    expect([...result.bestValues]).toEqual([15, 16]);
    // The partial-bests init is a 16-byte-per-cell ArrayBuffer pre-filled
    // with (-Infinity, no build, no chunk, pad) before upload: 1 shard x 2 outcomes here.
    const inits = writes
        .map(([, , data]) => data)
        .filter((data) => data instanceof ArrayBuffer);
    expect(inits).toHaveLength(1);
    expect(inits[0].byteLength).toBe(2 * 16);
    const values = new Float32Array(inits[0]);
    const words = new Uint32Array(inits[0]);
    for (let i = 0; i < words.length; i += 4) {
        expect(values[i]).toBe(-Infinity);
        expect(words[i + 1]).toBe(0xFFFFFFFF);
        expect(words[i + 2]).toBe(0xFFFFFFFF);
    }
    optimizer.destroy();
}, 120000);

it('outcome rows upload once with exact values on a real queue', async () => {
    if (await skipWhenNoGPU()) return;
    const optimizer = await preparedFusedOptimizer(laneZeroPlan());
    expect(optimizer).not.toBeNull();

    const slots = {
        flower: [art('flower', 'X', 1)],
        plume: [art('plume', 'X', 2)],
        sands: [art('sands', 'X', 3)],
        goblet: [art('goblet', 'X', 0)],
        circlet: [art('circlet', 'X', 4)],
    };
    const outcomes = [art('goblet', 'X', 3.5), art('goblet', 'X', 5.25), art('goblet', 'X', 7)];
    const writes = spyOnQueueWrites(optimizer.device);
    const prepared = optimizer.prepareForcedOutcomes(outcomes, 'goblet');
    try {
        const result = await optimizer.optimizeForcedOutcomes({slots, buildData: {stats: {}}, setData: {},
            preparedOutcomes: prepared, targetSlot: 'goblet', compact: true});
        expect([...result.bestValues]).toEqual([13.5, 15.25, 17]);
        const uploads = writes
            .map(([, , data]) => data)
            .filter((data) => data instanceof Float32Array && data.length === 3);
        expect(uploads).toHaveLength(1);
        expect([...uploads[0]]).toEqual([3.5, 5.25, 7]);
    } finally {
        prepared.destroy();
        optimizer.destroy();
    }
}, 120000);

it('a workgroup range crossing a region boundary scores correctly on device', async () => {
    if (await skipWhenNoGPU()) return;
    const optimizer = await preparedFusedOptimizer(laneZeroPlan());
    expect(optimizer).not.toBeNull();

    // 100 X + 1100 Y flowers under 4pc X (target X): region 0 is all-req
    // (c 0..99), region 1 is free@flower (c 100..1199). C=1200 forces 1024
    // shards, so shards 0..175 loop 2 complements each — shard 50 covers
    // c=100,101 and crosses the boundary mid-loop on device.
    const flowers = [];
    for (let i = 0; i < 100; ++i) flowers.push(art('flower', 'X', 1));
    for (let i = 0; i < 1100; ++i) flowers.push(art('flower', 'Y', 2));
    const slots = {
        flower: flowers,
        plume: [art('plume', 'X', 0)],
        sands: [art('sands', 'X', 0)],
        goblet: [art('goblet', 'X', 0)],
        circlet: [art('circlet', 'X', 0)],
    };
    const outcomes = [art('goblet', 'X', 0)];
    const plan = buildFusedOutcomeSegments(slots, 'goblet', outcomes, {kind: '4pc', sets: ['X']});
    resolveDenseRows(plan);
    expect(plan.regions).toHaveLength(2);
    expect(plan.validCount).toBe(1200);
    const progress = jest.fn();
    const prepared = optimizer.prepareForcedOutcomes(outcomes, 'goblet');
    try {
        const result = await optimizer.optimizeForcedOutcomes({slots: plan.packedSlots, buildData: {stats: {}},
            setData: {}, preparedOutcomes: prepared, targetSlot: 'goblet', densePlan: plan,
            compact: true, onProgress: progress, batchWork: 75});
        // First Y piece wins (value 2 at the boundary c=100); 16 pinned
        // batches of 75 builds accumulate cross-batch bests exactly: 15
        // in-loop reports plus the closing 100% report (which exists so
        // consumers never freeze below 100%).
        expect([...result.bestValues]).toEqual([2]);
        expect([...result.complementIndices]).toEqual([100]);
        expect(optimizer.lastOptimizeProfile.batches).toBe(16);
        expect(progress.mock.calls).toHaveLength(16);
        let previous = 0;
        for (const [completed, total] of progress.mock.calls) {
            expect(total).toBe(1200);
            expect(completed).toBeGreaterThan(previous);
            previous = completed;
        }
        expect(previous).toBe(1200);
    } finally {
        prepared.destroy();
        optimizer.destroy();
    }
}, 180000);

it('chunked companion spaces reproduce the single-chunk winners on device', async () => {
    if (await skipWhenNoGPU()) return;
    const optimizer = await preparedFusedOptimizer(laneZeroPlan());
    expect(optimizer).not.toBeNull();
    const values = [5, 1, 9, 9, 3, 7, 2];
    const slots = {
        flower: values.map(value => art('flower', 'X', value)),
        plume: [art('plume', 'X', 0), art('plume', 'X', 20)],
        sands: [art('sands', 'X', 1), art('sands', 'X', 1), art('sands', 'X', 4)],
        goblet: [art('goblet', 'X', 0)],
        circlet: [art('circlet', 'X', 0), art('circlet', 'X', 100)],
    };
    const outcomes = [art('goblet', 'X', 0), art('goblet', 'X', 1000)];
    const run = async chunkLimit => {
        const plan = buildFusedOutcomeSegments(slots, 'goblet', outcomes, undefined, chunkLimit);
        resolveDenseRows(plan);
        const prepared = optimizer.prepareForcedOutcomes(outcomes, 'goblet');
        try {
            const result = await optimizer.optimizeForcedOutcomes({slots: plan.packedSlots, buildData: {stats: {}},
                setData: {}, preparedOutcomes: prepared, targetSlot: 'goblet', densePlan: plan, compact: true});
            const refs = GPU_SLOT_NAMES.flatMap(slot => plan.packedSlots[slot]);
            return {plan, values: [...result.bestValues], winners: [...result.complementIndices].map((local, index) =>
                decodeDenseComplement(plan.chunks[result.chunkIndices[index]].base + local, plan, refs))};
        } finally { prepared.destroy(); }
    };
    try {
        const whole = await run();
        expect(whole.plan.chunks).toHaveLength(1);
        // 9 appears twice among flowers: the tie keeps the earlier build.
        expect(whole.values).toEqual([133, 1133]);
        for (const limit of [7, 5, 1]) {
            const chunked = await run(limit);
            expect(chunked.plan.chunks.length).toBeGreaterThan(1);
            expect(chunked.values).toEqual(whole.values);
            expect(chunked.winners).toEqual(whole.winners);
            expect(optimizer.lastOptimizeProfile.chunks).toBe(chunked.plan.chunks.length);
        }
    } finally {
        optimizer.destroy();
    }
}, 180000);

it('tiny searches take a single batch without a pinned batch size', async () => {
    if (await skipWhenNoGPU()) return;
    const optimizer = await preparedFusedOptimizer(laneZeroPlan());
    expect(optimizer).not.toBeNull();
    const slots = {
        flower: [art('flower', 'X', 1), art('flower', 'X', 2)],
        plume: [art('plume', 'X', 4)],
        sands: [art('sands', 'X', 8)],
        goblet: [art('goblet', 'X', 0)],
        circlet: [art('circlet', 'X', 16)],
    };
    const progress = jest.fn();
    await optimizer.optimizeForcedOutcomes({slots, buildData: {stats: {}}, setData: {},
        outcomeArtifacts: [art('goblet', 'X', 0)], targetSlot: 'goblet', compact: true, onProgress: progress});
    expect(optimizer.lastOptimizeProfile.batches).toBe(1);
    expect(progress.mock.calls).toEqual([[2, 2]]);
    optimizer.destroy();
}, 120000);
