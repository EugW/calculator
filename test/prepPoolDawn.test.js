import { Artifact } from '../src/js/classes/Artifact';
import { CalcSet } from '../src/js/classes/CalcSet';
import { DB } from '../src/js/db/DB';
import { evaluateArtifactActionPredictions } from '../src/js/classes/ArtifactActionPredictor';
import { ArtifactsSuggest } from '../src/js/classes/ArtifactsSuggest';
import { GPUOptimizerInputs } from '../src/js/classes/GPUOptimizerInputs';
import { makeFakePrepWorker } from './support/prepWorkerFake';
import { ensureDawnNavigator } from './support/gpuNode';

global.DB = DB;

beforeAll(async () => {
    await ensureDawnNavigator();
    Object.defineProperty(globalThis.navigator, 'hardwareConcurrency', {configurable: true, value: 4});
}, 120000);
afterEach(() => jest.restoreAllMocks());

function emptyReadback(inputs) {
    const readback = new Uint32Array(inputs.outcomeCount * 4);
    const floats = new Float32Array(readback.buffer);
    for (let i = 0; i < inputs.outcomeCount; ++i) {
        floats[i * 4] = -Infinity;
        readback[i * 4 + 1] = readback[i * 4 + 2] = 0xFFFFFFFF;
    }
    return {readback, outcomeCount: inputs.outcomeCount, shards: 1, complementCount: inputs.complementCount};
}

// Real Dawn execution with the production candidate message handler and
// structured-cloned/transferred messages. Browser smoke covers actual threads.
const feature = 'attack.normal_hit_1';
const mains = {flower: 'hp', plume: 'atk', sands: 'atk_percent', goblet: 'dmg_phys', circlet: 'crit_dmg'};
const makeArtifact = (slot, set = 'GladiatorFinale', main = mains[slot], subs = []) =>
    new Artifact(5, 20, slot, set, main, subs);

function setup() {
    const build = new CalcSet();
    build.setChar(DB.Chars.get('Jean'));
    build.setEnemy(DB.Enemies.getFirst().getFirst());
    const inventory = Object.keys(mains).map(slot => makeArtifact(slot));
    for (const artifact of inventory) build.setArtifact(artifact);
    inventory.push(makeArtifact('flower', 'WandererTroupe', 'hp', [{stat: 'atk_percent', value: 23.3}]));
    return {build, inventory};
}

const affixes = Object.fromEntries(Object.entries(mains).map(([slot, mainStat]) =>
    [slot, {mainStat, substats: ['def', 'def_percent']}]));

async function craftFlower(extra = {}) {
    const {build, inventory} = setup();
    const progress = [];
    const result = await evaluateArtifactActionPredictions({kind: 'craft', set: 'GladiatorFinale',
        baseBuild: build, inventory, feature, useGPU: false, craftSlots: ['flower'],
        craftAffixes: affixes, onProgress: data => progress.push(data), ...extra});
    return {result, progress};
}

test('pool scheduler is deterministic across pool sizes', async () => {
    const one = await craftFlower({prepWorkers: 1, prepWorkerFactory: () => makeFakePrepWorker()});
    const two = await craftFlower({prepWorkers: 2, prepWorkerFactory: () => makeFakePrepWorker()});
    expect(two.result.rows).toEqual(one.result.rows);
    expect(two.result.rows).toHaveLength(1);
    const row = two.result.rows[0];
    expect(row.slot).toBe('flower');
    expect(row.error).toBeUndefined();
    expect(row.totalOutcomes).toBeGreaterThan(0);
    expect(row.optimizerEvaluations).toBe(row.totalOutcomes);
    // Prepare progress flowed through the pool with real counters.
    const prepared = two.progress.filter(data => data.key === 'prepare');
    expect(prepared.length).toBeGreaterThan(0);
    expect(prepared.at(-1).current).toBe(prepared.at(-1).total);
}, 180000);

test('multiple candidates remain identical when prep finishes out of order', async () => {
    const extra = {feature: 'stats.crit_dmg', craftSlots: ['flower', 'plume', 'sands'], retainOutcomes: true};
    const serial = await craftFlower({...extra, prepWorkers: 1, prepWorkerFactory: () => makeFakePrepWorker()});
    let releaseFlower;
    const plumeDone = new Promise(resolve => { releaseFlower = resolve; });
    const completed = [];
    const parallel = await craftFlower({...extra, prepWorkers: 2, prepWorkerFactory: () => {
        const worker = makeFakePrepWorker({beforePrep: message => message.input.group.slot === 'flower' ? plumeDone : undefined});
        worker.addEventListener('message', ({data}) => {
            if (data.type !== 'DONE') return;
            const slot = worker.messages.find(message => message.jobId === data.jobId).input.group.slot;
            completed.push(slot);
            if (slot === 'plume') releaseFlower();
        });
        return worker;
    }});
    expect(completed[0]).toBe('plume');
    expect(parallel.result).toEqual(serial.result);
    expect(parallel.progress.filter(update => update.phase === 'slot_complete').map(update => update.slot))
        .toEqual(completed);
    expect(parallel.progress.filter(update => update.phase === 'slot_complete').map(update => update.slotsCompleted))
        .toEqual([1, 2, 3]);
    const firstComplete = parallel.progress.findIndex(update => update.phase === 'slot_complete');
    expect(parallel.progress.slice(0, firstComplete).some(update => update.slot === 'plume' && update.key === 'lower'))
        .toBe(true);
    expect(parallel.progress.filter(update => update.slot === 'plume').every(update => update.workerId === 1)).toBe(true);
    expect(parallel.progress.every(update => update.workerCount === 2)).toBe(true);
    for (const slot of extra.craftSlots) {
        expect(parallel.progress.filter(update => update.slot === slot)
            .every(update => update.candidateIndex === extra.craftSlots.indexOf(slot))).toBe(true);
        expect(parallel.progress.some(update => update.slot === slot && update.key === 'lower'
            && update.current > 0 && update.current === update.total)).toBe(true);
    }
}, 180000);

test('each candidate owns companion caches and preserves stats needed by GPU upload', async () => {
    const {build, inventory} = setup();
    inventory.pop();
    for (const artifact of inventory) {
        if (artifact.slot !== 'flower') artifact.set = 'EmblemofSeveredFate';
        if (artifact.slot === 'sands') artifact.addStat('recharge', 22);
    }
    const snapshots = [];
    let baselineCaches;
    const pack = GPUOptimizerInputs.prototype.artifactsToCombinedBuffer;
    jest.spyOn(GPUOptimizerInputs.prototype, 'artifactsToCombinedBuffer').mockImplementation(function(slots, map) {
        if (map.recharge !== undefined) {
            const sands = slots.sands[0];
            expect(inventory.includes(sands)).toBe(false);
            snapshots.push({actual: sands.calculated.recharge,
                expected: sands.calcOptimizerStats(Object.keys(map)).recharge});
        }
        return pack.call(this, slots, map);
    });
    await craftFlower({baseBuild: build, inventory, feature: 'burst.burst_dmg',
        craftSlots: ['flower', 'plume'], prepWorkers: 2, prepWorkerFactory: () => {
            baselineCaches ||= inventory.map(artifact => artifact.calculated);
            return makeFakePrepWorker();
        }});
    inventory.forEach((artifact, index) => expect(artifact.calculated).toBe(baselineCaches[index]));
    expect(snapshots.length).toBeGreaterThan(0);
    for (const {actual, expected} of snapshots) {
        expect(expected).toBeGreaterThan(0);
        expect(actual).toBe(expected);
    }
}, 180000);

test('GPU compile failure returns to the candidate and rejects with the original error', async () => {
    const createWorker = jest.fn(() => makeFakePrepWorker());
    const optimizer = {preparePipeline: jest.fn().mockRejectedValue(new Error('synthetic compile failure')),
        destroy: jest.fn()};
    jest.spyOn(ArtifactsSuggest.prototype, 'createForcedOutcomeOptimizer').mockResolvedValue(optimizer);
    await expect(craftFlower({prepWorkerFactory: createWorker})).rejects.toThrow('synthetic compile failure');
    expect(optimizer.destroy).toHaveBeenCalled();
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(createWorker.mock.results[0].value.terminated).toBe(true);
});

test.each([1, 2])('worker count %i bounds the whole candidate lifecycle, including GPU waiting and rescore', async count => {
    let releaseFirst, firstReply, secondGPU;
    const hold = new Promise(resolve => { releaseFirst = resolve; });
    const awaitingRescore = new Promise(resolve => { firstReply = resolve; });
    const secondStarted = new Promise(resolve => { secondGPU = resolve; });
    let active = 0, maxActive = 0, runs = 0;
    const workers = [];
    const events = [];
    jest.spyOn(ArtifactsSuggest.prototype, 'createForcedOutcomeOptimizer').mockImplementation(async () => ({
        preparePipeline: async () => {}, destroy() {},
        optimizeForcedOutcomes: async ({packedInputs}) => {
            maxActive = Math.max(maxActive, ++active);
            const run = ++runs;
            events.push(`gpu-${run}`);
            if (run === 2) secondGPU();
            await new Promise(resolve => setImmediate(resolve));
            const readback = new Uint32Array(packedInputs.outcomeCount * 4);
            const floats = new Float32Array(readback.buffer);
            for (let i = 0; i < packedInputs.outcomeCount; ++i) {
                floats[i * 4] = -Infinity;
                readback[i * 4 + 1] = readback[i * 4 + 2] = 0xFFFFFFFF;
            }
            --active;
            return {readback, outcomeCount: packedInputs.outcomeCount, shards: 1,
                complementCount: packedInputs.complementCount};
        },
    }));
    let firstWorker = true;
    const run = craftFlower({feature: 'stats.crit_dmg', craftSlots: ['flower', 'plume'], prepWorkers: count,
        prepWorkerFactory: () => {
            const gate = firstWorker;
            firstWorker = false;
            let held = false;
            const worker = makeFakePrepWorker({beforeGPUResult: async () => {
                if (gate && !held) { held = true; firstReply(); await hold; }
            }});
            worker.addEventListener('message', ({data}) => {
                if (data.type === 'DONE') events.push(`done-${data.result.rows[0].slot}`);
            });
            workers.push(worker);
            return worker;
        }});
    try {
        await awaitingRescore;
        if (count === 2) await secondStarted;
        await new Promise(resolve => setImmediate(resolve));
        expect(workers).toHaveLength(count);
        expect(runs).toBe(count);
        expect(events).not.toContain('done-flower');
        if (count === 1) expect(workers[0].messages.filter(message => message.type === 'CANDIDATE')).toHaveLength(1);
    } finally { releaseFirst(); }
    const {result} = await run;
    expect(result.rows).toHaveLength(2);
    expect(maxActive).toBeLessThanOrEqual(count);
    if (count === 1) expect(events.indexOf('done-flower')).toBeLessThan(events.indexOf('gpu-2'));
    else expect(events.indexOf('gpu-2')).toBeLessThan(events.indexOf('done-flower'));
    expect(workers.every(worker => worker.terminated)).toBe(true);
});

test('pool upgrade path carries assumptions and masses intact', async () => {
    const {build, inventory} = setup();
    const candidate = makeArtifact('circlet', 'GladiatorFinale', 'crit_rate', [
        {stat: 'crit_dmg', value: 7.8}, {stat: 'atk_percent', value: 5.8}, {stat: 'def', value: 23}]);
    candidate.level = 0;
    candidate.unactivatedSubstats = [{stat: 'hp', value: 299}];
    candidate.setMetadata({totalRolls: 3, elixirCrafted: false,
        initialValues: {crit_dmg: 7.8, atk_percent: 5.8, def: 23, hp: 299}});
    inventory.push(candidate);
    const params = {kind: 'upgrade', baseBuild: build, inventory, feature, useGPU: false,
        upgradeTargets: [candidate], prepWorkers: 2, prepWorkerFactory: () => makeFakePrepWorker()};
    const first = await evaluateArtifactActionPredictions(params);
    const second = await evaluateArtifactActionPredictions(params);
    expect(first.rows).toEqual(second.rows);
    expect(first.rows).toHaveLength(1);
    const row = first.rows[0];
    expect(row.kind).toBe('upgrade');
    expect(row.upgradeAssumptions).toBeDefined();
    expect(row.totalOutcomes).toBeGreaterThan(0);
}, 180000);

test.each([1, 2, 4])('all %i ready workers start GPU jobs without waiting for another job', async prepWorkers => {
    let active = 0, maximum = 0, starts = 0, release, admitted;
    const hold = new Promise(resolve => { release = resolve; });
    const ready = new Promise(resolve => { admitted = resolve; });
    const optimizers = [];
    const create = jest.spyOn(ArtifactsSuggest.prototype, 'createForcedOutcomeOptimizer').mockImplementation(async () => {
        maximum = Math.max(maximum, ++active);
        const optimizer = {
            preparePipeline: async () => {
                if (++starts === prepWorkers) admitted();
                await hold;
            },
            optimizeForcedOutcomes: async ({packedInputs}) => {
                await new Promise(resolve => setImmediate(resolve));
                return emptyReadback(packedInputs);
            },
            destroy: jest.fn(() => { --active; }),
        };
        optimizers.push(optimizer);
        return optimizer;
    });
    const run = craftFlower({feature: 'stats.crit_dmg', craftSlots: Object.keys(mains), prepWorkers,
        prepWorkerFactory: () => makeFakePrepWorker()});
    try {
        await ready;
        await new Promise(resolve => setImmediate(resolve));
        expect(create).toHaveBeenCalledTimes(prepWorkers);
    } finally { release(); }
    const {result} = await run;
    expect(result.rows).toHaveLength(5);
    expect(create).toHaveBeenCalledTimes(5);
    expect(maximum).toBe(prepWorkers);
    expect(active).toBe(0);
    expect(optimizers.every(optimizer => optimizer.destroy.mock.calls.length === 1)).toBe(true);
});

test('failure drains all in-flight GPU jobs before returning the error', async () => {
    let release, started, terminated;
    const hold = new Promise(resolve => { release = resolve; });
    const ready = new Promise(resolve => { started = resolve; });
    const stopped = new Promise(resolve => { terminated = resolve; });
    const optimizers = [];
    let runs = 0;
    jest.spyOn(ArtifactsSuggest.prototype, 'createForcedOutcomeOptimizer').mockImplementation(async () => {
        const optimizer = {preparePipeline: async () => {}, destroy: jest.fn(),
            optimizeForcedOutcomes: async ({packedInputs}) => {
                if (++runs === 3) started();
                await hold;
                return emptyReadback(packedInputs);
            }};
        optimizers.push(optimizer);
        return optimizer;
    });
    const workers = [];
    const run = craftFlower({feature: 'stats.crit_dmg', craftSlots: ['flower', 'plume', 'sands', 'goblet'],
        prepWorkers: 4, prepWorkerFactory: () => {
            const worker = makeFakePrepWorker({beforePrep: async message => {
                if (message.input.group.slot === 'goblet') {
                    await ready;
                    throw new Error('failure with GPU jobs pending');
                }
            }});
            const terminate = worker.terminate;
            worker.terminate = () => { terminate(); terminated(); };
            workers.push(worker);
            return worker;
        }});
    const rejected = expect(run).rejects.toThrow('failure with GPU jobs pending');
    try {
        await stopped;
        expect(optimizers).toHaveLength(3);
        expect(optimizers.every(optimizer => optimizer.destroy.mock.calls.length === 0)).toBe(true);
        expect(workers.every(worker => worker.terminated)).toBe(true);
    } finally { release(); }
    await rejected;
    expect(optimizers).toHaveLength(3);
    expect(optimizers.every(optimizer => optimizer.destroy.mock.calls.length === 1)).toBe(true);
});

test('overlapping Upgrade GPU jobs share one device and preserve rows and gallery', async () => {
    const {build, inventory} = setup();
    const targets = ['flower', 'plume', 'sands', 'goblet'].map(slot => {
        const artifact = new Artifact(5, 0, slot, 'GladiatorFinale', mains[slot], [{stat: 'crit_dmg', value: 7.8},
            {stat: 'def', value: 23}, {stat: 'def_percent', value: 7.3}, {stat: 'recharge', value: 6.5}]);
        artifact.setMetadata({totalRolls: 4, elixirCrafted: false,
            initialValues: {crit_dmg: 7.8, def: 23, def_percent: 7.3, recharge: 6.5}});
        return artifact;
    });
    const params = {kind: 'upgrade', baseBuild: build, inventory, feature: 'stats.crit_dmg', useGPU: false,
        upgradeTargets: targets, retainOutcomes: true, prepWorkers: 4, prepWorkerFactory: () => makeFakePrepWorker()};
    const serial = await evaluateArtifactActionPredictions({...params, prepWorkers: 1});
    const devices = new Set();
    let active = 0, maximum = 0, release;
    const hold = new Promise(resolve => { release = resolve; });
    const create = ArtifactsSuggest.prototype.createForcedOutcomeOptimizer;
    jest.spyOn(ArtifactsSuggest.prototype, 'createForcedOutcomeOptimizer').mockImplementation(async function() {
        const optimizer = await create.call(this);
        devices.add(optimizer.device);
        const optimize = optimizer.optimizeForcedOutcomes.bind(optimizer);
        optimizer.optimizeForcedOutcomes = async opts => {
            maximum = Math.max(maximum, ++active);
            if (active === 4) release();
            await hold;
            try { return await optimize(opts); }
            finally { --active; }
        };
        return optimizer;
    });
    const parallel = await evaluateArtifactActionPredictions(params);
    expect(parallel).toEqual(serial);
    expect(parallel.rows.every(row => !row.error && row.outcomeDetails)).toBe(true);
    expect(maximum).toBe(4);
    expect(devices.size).toBe(1);
}, 180000);

test('prep worker failure surfaces as a run error', async () => {
    const {build, inventory} = setup();
    await expect(evaluateArtifactActionPredictions({kind: 'craft', set: 'GladiatorFinale',
        baseBuild: build, inventory, feature, useGPU: false, craftSlots: ['flower'],
        craftAffixes: affixes, prepWorkers: 2,
        prepWorkerFactory: () => makeFakePrepWorker({failPrep: 'synthetic prep failure'})}))
        .rejects.toThrow('synthetic prep failure');
}, 180000);
