import { ARTIFACT_ACTION_HISTORY_LIMIT, StorageItemArtifactActionHistory,
    bestFiniteScore, countScoredRows, estimateHistoryBlobBytes, historyEntryBest,
    historyEntryHasGallery, historyEntryRowCount,
    stripArtifactActionResultForHistory } from '../src/js/classes/StorageItem/ArtifactActionHistory';
import { putHistoryGallery } from '../src/js/classes/ActionHistoryGallery';

class MemoryStorage {
    constructor(data) {
        this.data = Object.assign({}, data);
    }
    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
    }
    setItem(key, value) {
        this.data[key] = String(value);
    }
    removeItem(key) {
        delete this.data[key];
    }
}

class FlakyStorage extends MemoryStorage {
    constructor(data) {
        super(data);
        this.failures = 0;
    }
    failNext(count = 1) {
        this.failures = count;
    }
    setItem(key, value) {
        if (this.failures > 0) {
            --this.failures;
            const error = new Error('quota exceeded');
            error.name = 'QuotaExceededError';
            throw error;
        }
        super.setItem(key, value);
    }
}

function asyncRequest(run, complete) {
    const request = {onsuccess: null, onerror: null, result: undefined, error: undefined};
    queueMicrotask(() => {
        try {
            request.result = run();
            if (request.onsuccess) request.onsuccess({target: request});
            if (complete) queueMicrotask(complete);
        } catch (error) {
            request.error = error;
            if (request.onerror) request.onerror({target: request});
        }
    });
    return request;
}

class FakeIDBObjectStore {
    constructor(tables, complete) {
        this.tables = tables;
        this.complete = complete;
    }
    put(value, key) {
        return asyncRequest(() => { this.tables.set(key, value); }, this.complete);
    }
    get(key) {
        return asyncRequest(() => (this.tables.has(key) ? this.tables.get(key) : undefined), this.complete);
    }
    delete(key) {
        return asyncRequest(() => { this.tables.delete(key); }, this.complete);
    }
}

function makeFakeIndexedDB({failOpen = false, failCommit = false, deferCommit = false} = {}) {
    const tables = new Map();
    const transactions = [];
    return {
        tables, transactions,
        open(name, version) {
            const request = {onsuccess: null, onerror: null, onupgradeneeded: null, result: undefined, error: undefined};
            queueMicrotask(() => {
                if (failOpen) {
                    request.error = new Error('denied');
                    if (request.onerror) request.onerror({target: request});
                    return;
                }
                request.result = {
                    objectStoreNames: {contains: () => true},
                    createObjectStore: () => {},
                    transaction: (store, mode) => {
                        const staged = new Map(tables);
                        const transaction = {
                            finish() {
                                if (failCommit && mode === 'readwrite') {
                                    transaction.error = new Error('commit failed');
                                    transaction.onabort?.();
                                } else {
                                    if (mode === 'readwrite') {
                                        tables.clear();
                                        for (const [key, value] of staged) tables.set(key, value);
                                    }
                                    transaction.oncomplete?.();
                                }
                            },
                            objectStore: () => new FakeIDBObjectStore(staged, () => {
                                if (!deferCommit) transaction.finish();
                            }),
                        };
                        transactions.push(transaction);
                        return transaction;
                    },
                };
                if (request.onupgradeneeded) request.onupgradeneeded({target: request});
                if (request.onsuccess) request.onsuccess({target: request});
            });
            return request;
        },
    };
}

function enableFakeIndexedDB(options) {
    const fake = makeFakeIndexedDB(options);
    global.indexedDB = fake;
    global.IDBKeyRange = {};
    return fake;
}

function makeGalleryResult(score = 0.1) {
    return {rows: [{kind: 'craft', slot: 'flower', set: 'GladiatorFinale', mainStat: 'hp',
        pair: ['crit_rate', 'crit_dmg'], absoluteGain: 10, expectedValue: 110, score,
        improveChance: 0.5, infeasibleChance: 0, forcedExpectedValue: 105, baseValue: 100,
        outcomes: 5, probabilitySum: 1, enumeratedOutcomes: 5, gainPerCost: 1,
        alternatives: [], recipesEvaluated: 1, totalOutcomes: 5, combinationsPerOutcome: 2,
        coverageCombinations: '10', optimizerEvaluations: 5, cacheHits: 0, combinationTotal: '10',
        outcomeMode: 'exact', searchMode: 'exact',
        outcomeDetails: {chunks: [Float64Array.from([110, 0.5, 0, 15, 7.8, 12.4, 0, 0])],
            order: Uint32Array.from([0]), atLeastProbabilities: Float64Array.from([0.5]), builds: [[[1, 2]]], length: 1}}],
    baseValue: 100, model: 'test-model', search: 'test', recipeSearch: 'test',
    outcomeInventory: [[5, 20]], baselineArtifacts: [0]};
}

function makeResult(score = 0.1) {
    const result = makeGalleryResult(score);
    delete result.rows[0].outcomeDetails;
    delete result.outcomeInventory;
    delete result.baselineArtifacts;
    return result;
}

beforeEach(() => {
    global.localStorage = new MemoryStorage();
    delete global.indexedDB;
    delete global.IDBKeyRange;
});
afterEach(() => {
    delete global.localStorage;
    delete global.indexedDB;
    delete global.IDBKeyRange;
});

test('saves entries and lists them newest-first, filtered by kind', async () => {
    const history = new StorageItemArtifactActionHistory();
    const first = await history.saveRun({kind: 'craft', feature: 'f', context: {set: 'GladiatorFinale'}, result: makeResult(0.1)});
    const second = await history.saveRun({kind: 'upgrade', feature: 'f', context: {}, result: makeResult(0.2)});
    expect(first.id).toBeTruthy();
    expect(second.timestamp).toBeGreaterThanOrEqual(first.timestamp);
    expect(history.listEntries().map(item => item.id)).toEqual([second.id, first.id]);
    expect(history.listEntries('craft').map(item => item.id)).toEqual([first.id]);
    expect(history.getEntry(second.id)).toEqual(second);
    expect(history.getEntry('missing')).toBeNull();
});

test('rejects invalid kinds and results', async () => {
    const history = new StorageItemArtifactActionHistory();
    expect(await history.saveRun({kind: 'bogus', result: makeResult()})).toBeNull();
    expect(await history.saveRun({kind: 'craft', result: null})).toBeNull();
    expect(await history.saveRun({kind: 'craft', result: {rows: 'nope'}})).toBeNull();
    expect(history.listEntries()).toHaveLength(0);
});

test('gallery path persists packed buffers and restores the browser inputs', async () => {
    const fake = enableFakeIndexedDB();
    const history = new StorageItemArtifactActionHistory();
    const entry = await history.saveRun({kind: 'craft', feature: 'f', context: {set: 'GladiatorFinale'}, result: makeGalleryResult(0.3)});
    expect(entry.gallery).toBe(true);
    expect(entry.version).toBe(2);
    expect(fake.tables.has(entry.id)).toBe(true);
    const opened = await history.openRun(entry.id);
    expect(opened.gallery).toBe(true);
    const details = opened.result.rows[0].outcomeDetails;
    expect(details.chunks[0]).toBeInstanceOf(Float64Array);
    expect(details.order).toBeInstanceOf(Uint32Array);
    expect(Array.from(details.chunks[0].slice(0, 2))).toEqual([110, 0.5]);
    expect(opened.result.outcomeInventory).toEqual([[5, 20]]);
    expect(opened.result.baselineArtifacts).toEqual([0]);
});

test('falls back to stripped entries without IndexedDB', async () => {
    const history = new StorageItemArtifactActionHistory();
    const entry = await history.saveRun({kind: 'craft', result: makeGalleryResult(0.1)});
    expect(entry.version).toBe(1);
    expect(entry.result.rows[0].outcomeDetails).toBeUndefined();
    const opened = await history.openRun(entry.id);
    expect(opened.gallery).toBe(false);
    expect(opened.result.rows).toHaveLength(1);
});

test.each([false, true])('RV snapshots survive saved results (IndexedDB: %s)', async indexed => {
    if (indexed) enableFakeIndexedDB();
    const history = new StorageItemArtifactActionHistory();
    const result = makeGalleryResult();
    result.rvFilters = {outcomes: {enabled: true, min: 500, max: null}, companions: {enabled: false, min: null, max: null}};
    const entry = await history.saveRun({kind: 'craft', result});
    const opened = await history.openRun(entry.id);
    expect(opened.result.rvFilters).toEqual(result.rvFilters);
});

test('falls back to stripped entries when the gallery open fails', async () => {
    enableFakeIndexedDB({failOpen: true});
    const history = new StorageItemArtifactActionHistory();
    const entry = await history.saveRun({kind: 'upgrade', result: makeGalleryResult(0.1)});
    expect(entry.version).toBe(1);
    expect(entry.result.rows[0].outcomeDetails).toBeUndefined();
});

test('strips galleries, debug dumps and non-finite numbers', () => {
    const result = makeGalleryResult();
    result.rows[0].score = Infinity;
    result.forcedDebug = {v: 1};
    const stripped = stripArtifactActionResultForHistory(result);
    expect(stripped.rows[0].outcomeDetails).toBeUndefined();
    expect(stripped.rows[0].score).toBeNull();
    expect(stripped.outcomeInventory).toBeUndefined();
    expect(stripped.baselineArtifacts).toBeUndefined();
    expect(stripped.forcedDebug).toBeUndefined();
    expect(stripped.rows[0].absoluteGain).toBe(10);
    expect(stripArtifactActionResultForHistory(null)).toBeNull();
});

test('enforces the entry cap, evicting oldest first', async () => {
    const history = new StorageItemArtifactActionHistory();
    const ids = [];
    for (let index = 0; index < ARTIFACT_ACTION_HISTORY_LIMIT + 3; ++index) {
        ids.push((await history.saveRun({kind: 'craft', result: makeResult()})).id);
    }
    expect(history.listEntries()).toHaveLength(ARTIFACT_ACTION_HISTORY_LIMIT);
    expect(history.getEntry(ids[0])).toBeNull();
    expect(history.getEntry(ids[2])).toBeNull();
    expect(history.getEntry(ids[ids.length - 1])).not.toBeNull();
});

test('cap eviction also deletes gallery blobs', async () => {
    const fake = enableFakeIndexedDB();
    const history = new StorageItemArtifactActionHistory();
    const ids = [];
    for (let index = 0; index < ARTIFACT_ACTION_HISTORY_LIMIT + 2; ++index) {
        ids.push((await history.saveRun({kind: 'craft', result: makeGalleryResult()})).id);
    }
    expect(history.listEntries()).toHaveLength(ARTIFACT_ACTION_HISTORY_LIMIT);
    expect(fake.tables.has(ids[0])).toBe(false);
    expect(fake.tables.has(ids[1])).toBe(false);
    expect(fake.tables.has(ids[ids.length - 1])).toBe(true);
});

test('evicts oldest entries when the localStorage quota is exceeded', async () => {
    const storage = new FlakyStorage();
    global.localStorage = storage;
    const history = new StorageItemArtifactActionHistory();
    const first = await history.saveRun({kind: 'craft', result: makeResult(0.1)});
    expect(first).not.toBeNull();
    storage.failNext(1);
    const second = await history.saveRun({kind: 'craft', result: makeResult(0.2)});
    expect(second).not.toBeNull();
    expect(history.getEntry(first.id)).toBeNull();
    expect(history.listEntries().map(item => item.id)).toEqual([second.id]);
});

test('restores the previous list when persistence keeps failing', async () => {
    const storage = new FlakyStorage();
    global.localStorage = storage;
    const history = new StorageItemArtifactActionHistory();
    const first = await history.saveRun({kind: 'craft', result: makeResult()});
    storage.failNext(100);
    expect(await history.saveRun({kind: 'craft', result: makeResult()})).toBeNull();
    expect(history.listEntries().map(item => item.id)).toEqual([first.id]);
});

test('removes entries by id, including their gallery blobs', async () => {
    const fake = enableFakeIndexedDB();
    const history = new StorageItemArtifactActionHistory();
    const entry = await history.saveRun({kind: 'reshape', result: makeGalleryResult()});
    expect(await history.removeRun('missing')).toBe(false);
    expect(await history.removeRun(entry.id)).toBe(true);
    expect(history.listEntries()).toHaveLength(0);
    expect(fake.tables.has(entry.id)).toBe(false);
});

test('opening a missing gallery reports no result', async () => {
    enableFakeIndexedDB();
    const history = new StorageItemArtifactActionHistory();
    const entry = await history.saveRun({kind: 'craft', result: makeGalleryResult()});
    expect((await history.openRun(entry.id)).result).not.toBeNull();
    expect(await history.openRun('missing')).toBeNull();
});

test('reload skips malformed stored records', async () => {
    const history = new StorageItemArtifactActionHistory();
    await history.saveRun({kind: 'craft', result: makeResult()});
    const raw = JSON.parse(global.localStorage.getItem('artifact_action_history'));
    raw.push(null, {version: 3, kind: 'craft'}, {version: 2, kind: 'craft'},
        {version: 2, kind: 'craft', id: 'x', timestamp: 1, rows: 1, best: 0.1, bytes: 10, gallery: true},
        {version: 1, kind: 'craft', id: 'y', timestamp: 1, result: {rows: 'nope'}});
    global.localStorage.setItem('artifact_action_history', JSON.stringify(raw));
    const reloaded = new StorageItemArtifactActionHistory();
    expect(reloaded.listEntries().map(item => item.id)).toHaveLength(2);
});

test('entry view helpers cover both index and legacy shapes', async () => {
    const history = new StorageItemArtifactActionHistory();
    const legacy = await history.saveRun({kind: 'upgrade', result: makeResult(0.25)});
    expect(historyEntryRowCount(legacy)).toBe(1);
    expect(historyEntryBest(legacy)).toBeCloseTo(0.25, 10);
    expect(historyEntryHasGallery(legacy)).toBe(false);
    enableFakeIndexedDB();
    const modern = await history.saveRun({kind: 'upgrade', result: makeGalleryResult(0.4)});
    expect(historyEntryRowCount(modern)).toBe(1);
    expect(historyEntryBest(modern)).toBeCloseTo(0.4, 10);
    expect(historyEntryHasGallery(modern)).toBe(true);
    expect(historyEntryRowCount(null)).toBe(0);
    expect(historyEntryBest(null)).toBeNull();
    expect(bestFiniteScore({rows: [{error: 'x', score: 1}]})).toBeNull();
    expect(countScoredRows({rows: [{score: 1}, {error: 'x'}]})).toBe(1);
});

test('blob byte estimates count packed buffers', () => {
    const bytes = estimateHistoryBlobBytes(makeGalleryResult());
    // One 8-double chunk + order + cumulative arrays, plus the JSON rest.
    expect(bytes).toBeGreaterThan(8 * 8 + 4 + 8);
});

test('gallery writes remain pending until the transaction commits', async () => {
    const fake = enableFakeIndexedDB({deferCommit: true});
    let resolved = false;
    const pending = putHistoryGallery('pending', makeGalleryResult()).then(() => { resolved = true; });
    for (let i = 0; i < 10; ++i) await Promise.resolve();
    expect(resolved).toBe(false);
    expect(fake.tables.has('pending')).toBe(false);
    fake.transactions[0].finish();
    await pending;
    expect(resolved).toBe(true);
    expect(fake.tables.has('pending')).toBe(true);
});

test('an abort after request success saves the stripped fallback instead of a dangling gallery', async () => {
    const fake = enableFakeIndexedDB({failCommit: true});
    const history = new StorageItemArtifactActionHistory();
    const entry = await history.saveRun({kind: 'craft', result: makeGalleryResult()});
    expect(entry.version).toBe(1);
    expect(fake.tables.size).toBe(0);
    expect((await history.openRun(entry.id)).result.rows).toHaveLength(1);
});

test('failed index persistence preserves every old gallery even after planned cap eviction', async () => {
    const fake = enableFakeIndexedDB();
    const history = new StorageItemArtifactActionHistory();
    for (let i = 0; i < ARTIFACT_ACTION_HISTORY_LIMIT; ++i) {
        await history.saveRun({kind: 'craft', result: makeGalleryResult()});
    }
    const oldIds = history.listEntries().map(entry => entry.id);
    const oldIndex = localStorage.getItem(history.keyName);
    history.save = () => false;
    expect(await history.saveRun({kind: 'craft', result: makeGalleryResult()})).toBeNull();
    expect(history.listEntries().map(entry => entry.id)).toEqual(oldIds);
    expect([...fake.tables.keys()].sort()).toEqual([...oldIds].sort());
    expect(localStorage.getItem(history.keyName)).toBe(oldIndex);
    for (const id of oldIds) expect((await history.openRun(id)).result).not.toBeNull();
});

test('failed index removal preserves the entry and its gallery', async () => {
    const fake = enableFakeIndexedDB();
    const history = new StorageItemArtifactActionHistory();
    const entry = await history.saveRun({kind: 'reshape', result: makeGalleryResult()});
    history.save = () => false;
    expect(await history.removeRun(entry.id)).toBe(false);
    expect(history.getEntry(entry.id)).toBe(entry);
    expect(fake.tables.has(entry.id)).toBe(true);
});
