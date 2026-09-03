import {GPUForcedOutcomeOptimizer} from '../src/js/classes/GPUForcedOutcomeOptimizer';
import {ArtifactsSuggest} from '../src/js/classes/ArtifactsSuggest';
import {installGPUConstants, makeSlots, makePreparedOptimizer} from './support/gpuOptimizer';

installGPUConstants();

test('fused uploads obey COPY_DST validation and initialize infeasible-result sentinels', async () => {
    const optimizer = makePreparedFusedOptimizer();
    optimizer.fusedBindGroupLayout = {};
    optimizer.fusedPipelines.set('goblet', {});
    optimizer.device.queue.writeBuffer.mockImplementation((buffer) => {
        if (!(buffer.usage & GPUBufferUsage.COPY_DST)) throw new Error('writeBuffer requires COPY_DST');
    });
    const slots = makeSlots();
    for (const [slot, artifacts] of Object.entries(slots)) for (const artifact of artifacts) artifact.slot = slot;
    await optimizer.optimizeForcedOutcomes({slots, buildData: {stats: {}}, setData: {},
        outcomeArtifacts: slots.goblet, targetSlot: 'goblet'});
    const initialization = optimizer.device.queue.writeBuffer.mock.calls.find(([, , data]) => data instanceof ArrayBuffer);
    expect(initialization).toBeDefined();
    const values = new Float32Array(initialization[2]);
    const words = new Uint32Array(initialization[2]);
    for (let i = 0; i < words.length; i += 4) {
        expect(values[i]).toBe(-Infinity);
        expect(words[i + 1]).toBe(0xFFFFFFFF);
        expect(words[i + 2]).toBe(0xFFFFFFFF);
    }
});

function makePreparedFusedOptimizer() {
    const optimizer = makePreparedOptimizer([], {}, GPUForcedOutcomeOptimizer);
    optimizer.fusedBindGroupLayout = {};
    optimizer.fusedPipelines.set('goblet', {});
    return optimizer;
}

function makeFusedSuggester(optimizer) {
    const suggester = Object.create(ArtifactsSuggest.prototype);
    suggester.slots = makeSlots();
    for (const [slot, artifacts] of Object.entries(suggester.slots)) {
        artifacts[0].slot = slot;
        if (slot !== 'goblet') {
            artifacts.push({...artifacts[0], set: 'another_set'}, {...artifacts[0], set: 'off_set'});
        }
    }
    suggester.buildData = {stats: {}};
    suggester.setData = {};
    suggester.prepareForcedOutcomeOptimizer = jest.fn(async () => optimizer);
    suggester.prepareExplicitArtifact = jest.fn(artifact => {
        artifact.calculated = {__test_dummy_stat__: artifact.score};
    });
    return suggester;
}

const outcomeArtifact = score => ({slot: 'goblet', set: 'test_set', score,
    calcOptimizerStats: jest.fn(() => ({__test_dummy_stat__: score}))});

test.each([
    [undefined, 1, 81],
    [{kind: '4pc', sets: ['test_set']}, 5, 9],
    [{kind: '2+2', sets: ['test_set', 'another_set']}, 22, 22],
])('fused preparation counts and uploads unique outcomes once across topology %j', async (topology, regions, complements) => {
    const optimizer = makePreparedFusedOptimizer();
    const suggester = makeFusedSuggester(optimizer);
    const outcomes = [3.5, 5.25, 7].map(outcomeArtifact);
    const onSetupProgress = jest.fn();
    const result = await suggester.getResultGPUForcedOutcomes('goblet', outcomes, {topology, onSetupProgress});

    expect(result.regions).toHaveLength(regions);
    expect(result.complementCount).toBe(complements);
    expect(result.scored).toHaveLength(outcomes.length);
    expect(suggester.prepareExplicitArtifact).not.toHaveBeenCalled();
    for (const artifact of outcomes) {
        expect(artifact.calcOptimizerStats).toHaveBeenCalledTimes(1);
        expect(artifact.calculated).toBeUndefined();
    }
    expect(onSetupProgress.mock.calls).toEqual([['lower', 0, 3], ['lower', 3, 3], ['upload']]);
    const buffers = optimizer.device.createBuffer.mock.results.map(({value}) => value);
    const outcomeBuffers = buffers.filter(buffer => buffer.label === 'Fused outcome rows');
    expect(outcomeBuffers).toHaveLength(1);
    const writes = optimizer.device.queue.writeBuffer.mock.calls.filter(([buffer]) => buffer === outcomeBuffers[0]);
    expect(writes).toHaveLength(1);
    expect([...writes[0][2]]).toEqual([3.5, 5.25, 7]);
    const bindings = optimizer.device.createBindGroup.mock.calls.map(([group]) =>
        group.entries.find(entry => entry.binding === 7).resource.buffer);
    expect(bindings).toEqual([outcomeBuffers[0]]);
    for (const buffer of buffers) expect(buffer.destroy).toHaveBeenCalledTimes(1);
});

test('a failed run releases both shared outcomes and run buffers', async () => {
    const optimizer = makePreparedFusedOptimizer();
    const suggester = makeFusedSuggester(optimizer);
    // The single dense run fails on its first batch await.
    optimizer.testGPUCalls.onSubmittedWorkDone.mockRejectedValueOnce(new Error('GPU lost'));
    await expect(suggester.getResultGPUForcedOutcomes('goblet', [
        outcomeArtifact(1),
    ], {topology: {kind: '4pc', sets: ['test_set']}})).rejects.toThrow('GPU lost');
    expect(optimizer.device.createBindGroup).toHaveBeenCalledTimes(1);
    for (const {value: buffer} of optimizer.device.createBuffer.mock.results) {
        expect(buffer.destroy).toHaveBeenCalledTimes(1);
    }
});

test('prepared rows preserve stat order, zero missing stats, and report bounded progress', () => {
    const optimizer = makePreparedFusedOptimizer();
    optimizer.prepared.statIndexMap = {atk: 0, crit_rate: 1};
    const outcomes = Array.from({length: 8193}, () => ({slot: 'goblet', set: 'test_set',
        calculated: {irrelevant: 100, crit_rate: 7.8}}));
    outcomes[0].calculated = {crit_rate: 3.9, atk: 19};
    const onSetupProgress = jest.fn();
    const prepared = optimizer.prepareForcedOutcomes(outcomes, 'goblet', {onSetupProgress});
    const rows = optimizer.device.queue.writeBuffer.mock.calls[0][2];
    expect([...rows.slice(0, 4)]).toEqual([19, Math.fround(3.9), 0, Math.fround(7.8)]);
    expect(rows).toHaveLength(8193 * 2);
    expect(onSetupProgress.mock.calls).toEqual([
        ['lower', 0, 8193], ['lower', 8192, 8193], ['lower', 8193, 8193], ['upload'],
    ]);
    prepared.destroy();
    prepared.destroy();
    expect(prepared.buffer.destroy).toHaveBeenCalledTimes(1);
});

test.each(['destroyed', 'device', 'layout', 'slot'])('prepared outcomes reject a stale %s', async stale => {
    const optimizer = makePreparedFusedOptimizer();
    const prepared = optimizer.prepareForcedOutcomes([
        {slot: 'goblet', set: 'test_set', calculated: {}},
    ], 'goblet');
    if (stale === 'destroyed') prepared.destroy();
    if (stale === 'device') optimizer.context.device = {};
    if (stale === 'layout') optimizer.prepared.statIndexMap = {...optimizer.statIndexMap};
    await expect(optimizer.optimizeForcedOutcomes({slots: makeSlots(), buildData: {stats: {}}, setData: {},
        preparedOutcomes: prepared, targetSlot: stale === 'slot' ? 'flower' : 'goblet'}))
        .rejects.toThrow('do not match');
    prepared.destroy();
});

test('outcome storage limits are checked before allocation, and failed uploads release buffers', () => {
    const optimizer = makePreparedFusedOptimizer();
    const outcomes = [{slot: 'goblet', set: 'test_set', calculated: {}}];
    optimizer.device.limits.maxStorageBufferBindingSize = 3;
    expect(() => optimizer.prepareForcedOutcomes(outcomes, 'goblet')).toThrow('device limits');
    expect(optimizer.device.createBuffer).not.toHaveBeenCalled();
    optimizer.device.limits.maxStorageBufferBindingSize = 100;
    optimizer.device.queue.writeBuffer.mockImplementation(() => { throw new Error('upload failed'); });
    expect(() => optimizer.prepareForcedOutcomes(outcomes, 'goblet')).toThrow('upload failed');
    expect(optimizer.device.createBuffer.mock.results[0].value.destroy).toHaveBeenCalledTimes(1);
});

test('compact GPU readback preserves shard maxima, zero scores, ties and infeasible sentinels after unmap', async () => {
    const optimizer = makePreparedFusedOptimizer();
    const original = optimizer.device.createBuffer.getMockImplementation();
    optimizer.device.createBuffer.mockImplementation(descriptor => {
        const buffer = original(descriptor);
        if (descriptor.usage & GPUBufferUsage.MAP_READ) {
            const mapped = new ArrayBuffer(descriptor.size);
            const floats = new Float32Array(mapped);
            const words = new Uint32Array(mapped);
            // (value, chunk-local index, chunk, pad) per (shard, outcome).
            for (let i = 0; i < floats.length; i += 4) { floats[i] = -Infinity; words[i + 1] = words[i + 2] = 0xFFFFFFFF; }
            floats[0] = 10; words[1] = 0; words[2] = 0;
            floats[4] = 0; words[5] = 1; words[6] = 0;
            floats[12] = 12; words[13] = 0; words[14] = 0;
            floats[24] = 12; words[25] = 1; words[26] = 0; // later equal shard must not replace the winner
            buffer.getMappedRange.mockReturnValue(mapped);
            buffer.unmap.mockImplementation(() => structuredClone(mapped, {transfer: [mapped]}));
        }
        return buffer;
    });
    const slots = makeSlots(2);
    for (const [slot, artifacts] of Object.entries(slots)) for (const artifact of artifacts) artifact.slot = slot;
    const result = await optimizer.optimizeForcedOutcomes({slots, buildData: {stats: {}}, setData: {},
        outcomeArtifacts: [slots.goblet[0], slots.goblet[0], slots.goblet[0]], targetSlot: 'goblet', compact: true});
    expect(result.results).toBeNull();
    expect([...result.bestValues]).toEqual([12, 0, -Infinity]);
    expect([...result.complementIndices]).toEqual([0, 1, 0xFFFFFFFF]);
});

test('streamed f64 outcomes include infeasible results without allocating a scored object array', async () => {
    const optimizer = makePreparedFusedOptimizer();
    const suggester = makeFusedSuggester(optimizer);
    optimizer.optimizeForcedOutcomes = jest.fn(async () => ({
        bestValues: new Float32Array([3, -Infinity]), complementIndices: new Uint32Array([0, 0xFFFFFFFF]),
        chunkIndices: new Uint32Array([0, 0xFFFFFFFF]), complementCount: 81,
    }));
    const outcomes = [outcomeArtifact(3), outcomeArtifact(4)];
    suggester.createForcedOutcomeScorer = jest.fn((slot, set) => {
        expect([slot, set]).toEqual(['goblet', 'test_set']);
        return (outcome, key, decode) => {
            expect(outcome).toBe(outcomes[0]);
            expect(key).toBe(0);
            return {value: 3.0000000001, complement: decode()};
        };
    });
    const onOutcome = jest.fn();
    const result = await suggester.getResultGPUForcedOutcomes('goblet', outcomes, {onOutcome, debug: true});
    expect(result.scored).toBeNull();
    expect(result.rescoreRejected).toBe(0);
    expect(onOutcome.mock.calls[0]).toEqual([0, 3.0000000001,
        ['flower', 'plume', 'sands', 'circlet'].map(slot => suggester.slots[slot][0]), false]);
    expect(onOutcome.mock.calls[1]).toEqual([1, -Infinity, null, false]);
    expect(result.raw).toEqual([{v: 3, c: 0}, {v: 'NEG_INF', c: 0xFFFFFFFF}]);
    expect(suggester.prepareExplicitArtifact).not.toHaveBeenCalled();
});

test('batch sizes follow measured throughput: capped growth, never below the first batch', async () => {
    const {FUSED_FIRST_BATCH_WORK} = await import('../src/js/classes/GPUForcedOutcomeOptimizer');
    const batchLengths = async tick => {
        const optimizer = makePreparedFusedOptimizer();
        let clock = 0;
        optimizer.now = () => (clock += tick);
        // The engine reuses its header array; a real queue copies on write.
        const headers = [];
        optimizer.device.queue.writeBuffer.mockImplementation((buffer, offset, data) => {
            if (offset === 16 && data instanceof Uint32Array && data.length === 2) headers.push(data[1]);
        });
        const slots = makeSlots();
        for (const [slot, artifacts] of Object.entries(slots)) for (const artifact of artifacts) artifact.slot = slot;
        // One outcome over a 3e9-build space: batch length == batch work.
        const plan = {regions: [{end: 3e9, divs: [1, 1, 1], localRows: [0, 0, 0, 0]}], validCount: 3e9,
            chunks: [{base: 0, count: 3e9, regionStart: 0, regionEnd: 1}], logical: [{slots, size: 3e9}]};
        await optimizer.optimizeForcedOutcomes({slots, buildData: {stats: {}}, setData: {},
            outcomeArtifacts: slots.goblet, targetSlot: 'goblet', densePlan: plan});
        return headers;
    };
    // A fast device: every batch may grow, but at most 4x per completion.
    const fast = await batchLengths(0.001);
    expect(fast[0]).toBe(FUSED_FIRST_BATCH_WORK);
    for (let i = 1; i < fast.length - 1; ++i) expect(fast[i]).toBeLessThanOrEqual(fast[i - 1] * 4);
    expect(Math.max(...fast)).toBeGreaterThan(FUSED_FIRST_BATCH_WORK * 16);
    // A slow device keeps the first batch size instead of shrinking to nothing.
    const slow = await batchLengths(1000);
    expect(slow.slice(0, -1).every(length => length === FUSED_FIRST_BATCH_WORK)).toBe(true);
});
