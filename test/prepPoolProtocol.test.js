import { ArtifactPrepPool } from '../src/js/classes/ArtifactPrepPool';
import { Artifact } from '../src/js/classes/Artifact';
import { CalcSet } from '../src/js/classes/CalcSet';
import { normalizeArtifactRVFilters } from '../src/js/classes/ArtifactUsefulRV';
import { DB } from '../src/js/db/DB';
import { makeFakePrepWorker } from './support/prepWorkerFake';

global.DB = DB;
const build = new CalcSet();
build.setChar(DB.Chars.get('Jean'));
build.setEnemy(DB.Enemies.getFirst().getFirst());
const inventory = Object.entries({flower: 'hp', plume: 'atk', sands: 'atk_percent', goblet: 'dmg_phys', circlet: 'crit_dmg'})
    .map(([slot, main]) => new Artifact(5, 20, slot, 'GladiatorFinale', main, []));
const input = {kind: 'craft', set: 'GladiatorFinale', feature: 'stats.crit_dmg', baseValue: 1,
    build: build.serialize(), inventory: inventory.map(art => art.serialize()),
    inventoryHashes: inventory.map(art => art.getHash()), group: {slot: 'flower'},
    craftAffixes: {flower: {mainStat: 'hp', substats: ['crit_dmg', 'def']}},
    rvFilters: normalizeArtifactRVFilters(), topologySpecs: [], retainOutcomes: false};
function executeGPU({inputs}) {
    const readback = new Uint32Array(inputs.outcomeCount * 4);
    const floats = new Float32Array(readback.buffer);
    for (let i = 0; i < inputs.outcomeCount; ++i) {
        floats[i * 4] = -Infinity;
        readback[i * 4 + 1] = readback[i * 4 + 2] = 0xFFFFFFFF;
    }
    return {readback, outcomeCount: inputs.outcomeCount, shards: 1, complementCount: inputs.complementCount};
}

test('candidate keeps CPU state and exchanges only numeric GPU inputs and final output', async () => {
    const worker = makeFakePrepWorker();
    const progress = [];
    const gpu = jest.fn(async request => {
        expect(request.program.kind).toBe('gpu-program');
        expect(request.inputs.outcomeRows).toBeInstanceOf(Float32Array);
        expect(request.inputs.poolData).toBeInstanceOf(Float32Array);
        expect(request.inputs).not.toHaveProperty('artifacts');
        expect(request).not.toHaveProperty('union');
        return executeGPU(request);
    });
    const pool = new ArtifactPrepPool({executeGPU, workerFactory: () => worker, executeGPU: gpu});
    try {
        const result = await pool.run({input, onProgress: update => progress.push(update)});
        expect(result.rows[0].totalOutcomes).toBeGreaterThan(0);
        expect(result.rows[0].optimizerEvaluations).toBe(result.rows[0].totalOutcomes);
        expect(result.rows[0].probabilitySum).toBeCloseTo(1, 12);
        expect(gpu).toHaveBeenCalledTimes(1);
        expect(worker.messages.map(message => message.type)).toEqual(['CANDIDATE', 'GPU_RESULT']);
        expect(worker.sent.filter(message => message.type !== 'PROGRESS').map(message => message.type))
            .toEqual(['GPU_REQUEST', 'DONE']);
        expect(progress).toContainEqual(expect.objectContaining({key: 'lower', slot: 'flower',
            current: result.rows[0].totalOutcomes, total: result.rows[0].totalOutcomes}));
    } finally { pool.destroy(); }
});

test('concurrent calls reserve different workers before asynchronous construction', async () => {
    const workers = [];
    let release, bothStarted;
    const hold = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { bothStarted = resolve; });
    let running = 0;
    const pool = new ArtifactPrepPool({size: 2, executeGPU, workerFactory: async () => {
        await Promise.resolve();
        const worker = makeFakePrepWorker({beforePrep: () => {
            if (++running === 2) bothStarted();
            return hold;
        }});
        workers.push(worker);
        return worker;
    }});
    try {
        const progress = [];
        const onProgress = update => progress.push(update);
        const first = pool.run({input, onProgress}), second = pool.run({input, onProgress});
        await expect(pool.run({input})).rejects.toThrow('exhausted');
        await started;
        expect(workers).toHaveLength(2);
        expect(workers.map(worker => worker.messages.length)).toEqual([1, 1]);
        expect(progress.map(({workerId, jobId}) => ({workerId, jobId}))).toEqual([
            {workerId: 0, jobId: 'candidate-1'}, {workerId: 1, jobId: 'candidate-2'},
        ]);
        release();
        const results = await Promise.all([first, second]);
        expect(results[0]).toEqual(results[1]);
        await pool.run({input, onProgress});
        expect(workers).toHaveLength(2);
        for (const [jobId, workerId] of [['candidate-1', 0], ['candidate-2', 1], ['candidate-3', 0]]) {
            const updates = progress.filter(update => update.jobId === jobId);
            expect(updates.every(update => update.workerId === workerId)).toBe(true);
            expect(updates[0].phase).toBe('prepare');
            expect(updates.at(-1).phase).toBe('slot_complete');
        }
    } finally { release(); pool.destroy(); }
    expect(workers.every(worker => worker.terminated)).toBe(true);
});

test('preparation errors reject and release the worker reservation', async () => {
    const pool = new ArtifactPrepPool({executeGPU, workerFactory: () => makeFakePrepWorker()});
    try {
        await expect(pool.run({input: {...input, group: {slot: 'flower', recipes: [null]}}})).rejects.toThrow();
        await expect(pool.run({input})).resolves.toHaveProperty(['rows', 0, 'totalOutcomes']);
        await expect(pool.run({input: {...input, maxUnionEntries: 1}})).rejects.toThrow('action_outcomes_too_large;flower');
    } finally { pool.destroy(); }
});

test('destroy rejects a pending job and terminates a worker that finishes spawning late', async () => {
    let release, started;
    const spawning = new Promise(resolve => { started = resolve; });
    const factoryResult = new Promise(resolve => { release = resolve; });
    const pool = new ArtifactPrepPool({executeGPU, workerFactory: () => { started(); return factoryResult; }});
    const pending = pool.run({input});
    const rejection = expect(pending).rejects.toThrow('destroyed');
    await spawning;
    pool.destroy();
    await rejection;
    const worker = makeFakePrepWorker();
    release(worker);
    await factoryResult;
    await Promise.resolve();
    expect(worker.terminated).toBe(true);
    expect(worker.messages).toHaveLength(0);
});

test('worker stays reserved until GPU reply and final rescore, and GPU errors allow reuse', async () => {
    let release, requested;
    const hold = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { requested = resolve; });
    const gpu = jest.fn(async request => { requested(); await hold; return executeGPU(request); });
    const worker = makeFakePrepWorker();
    const pool = new ArtifactPrepPool({workerFactory: () => worker, executeGPU: gpu});
    try {
        const first = pool.run({input});
        await started;
        await expect(pool.run({input})).rejects.toThrow('exhausted');
        expect(worker.sent.some(message => message.type === 'DONE')).toBe(false);
        release();
        await first;
        gpu.mockRejectedValueOnce(new Error('GPU compilation failed'));
        await expect(pool.run({input})).rejects.toThrow('GPU compilation failed');
        await expect(pool.run({input})).resolves.toHaveProperty(['rows', 0, 'totalOutcomes']);
    } finally { release(); pool.destroy(); }
});

test('destroy while waiting for the GPU rejects the candidate and ignores its late reply', async () => {
    let release, requested;
    const hold = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { requested = resolve; });
    const worker = makeFakePrepWorker();
    const pool = new ArtifactPrepPool({workerFactory: () => worker,
        executeGPU: async request => { requested(); await hold; return executeGPU(request); }});
    const pending = pool.run({input});
    const rejection = expect(pending).rejects.toThrow('destroyed');
    await started;
    pool.destroy();
    await rejection;
    release();
    await new Promise(resolve => setImmediate(resolve));
    expect(worker.terminated).toBe(true);
    expect(worker.messages.map(message => message.type)).toEqual(['CANDIDATE']);
});
