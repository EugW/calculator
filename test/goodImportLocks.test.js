import { Artifact } from '../src/js/classes/Artifact';
import { planArtifactImport, prepareGoodImportAdded } from '../src/js/classes/Importer/Good';
import { StorageItemArtifacts } from '../src/js/classes/StorageItem/Artifacts';
import { DB } from '../src/js/db/DB';

global.DB = DB;
global.UI = {Lang: {get: () => ''}};

function craftedGood(overrides = {}) {
    return {
        setKey: 'FinaleOfTheDeepGalleries', slotKey: 'goblet', mainStatKey: 'cryo_dmg_',
        level: 20, rarity: 5, lock: true, totalRolls: 8, elixerCrafted: true,
        substats: [
            {key: 'critRate_', value: 11.3, initialValue: 3.9},
            {key: 'critDMG_', value: 13.2, initialValue: 6.2},
            {key: 'atk', value: 27, initialValue: 14},
            {key: 'enerRech_', value: 5.8, initialValue: 5.8},
        ],
        ...overrides,
    };
}

class MemoryStorage {
    data = {};
    getItem(key) { return this.data[key] ?? null; }
    setItem(key, value) { this.data[key] = String(value); }
}
beforeEach(() => { global.localStorage = new MemoryStorage(); });
afterEach(() => { delete global.localStorage; });

test('GOOD model still carries game lock, but new imports default to unlocked', () => {
    const locked = Artifact.fromGood(craftedGood({lock: true}));
    expect(locked.isLocked()).toBe(true);

    const asAdded = planArtifactImport([], [locked]);
    expect(asAdded.added).toHaveLength(1);
    expect(asAdded.added[0].isLocked()).toBe(true);

    // Default GOOD import path: opt-in off strips game locks from new items.
    prepareGoodImportAdded(asAdded.added, {applyLocks: false, groupNames: ['']});
    expect(asAdded.added[0].isLocked()).toBe(false);

    const store = new StorageItemArtifacts();
    store.addArtifacts(asAdded.added);
    expect(store.listArtifacts()).toHaveLength(1);
    expect(store.listArtifacts()[0].isLocked()).toBe(false);
});

test('opting into game locks preserves them for new imports', () => {
    const locked = Artifact.fromGood(craftedGood({lock: true}));
    const asAdded = planArtifactImport([], [locked]);
    prepareGoodImportAdded(asAdded.added, {applyLocks: true, groupNames: ['']});
    expect(asAdded.added[0].isLocked()).toBe(true);

    const store = new StorageItemArtifacts();
    store.addArtifacts(asAdded.added);
    expect(store.listArtifacts()[0].isLocked()).toBe(true);
});

test('enrichment never overwrites existing inventory locks in either direction', () => {
    const legacyLocked = Artifact.fromGood(craftedGood({lock: true}));
    legacyLocked.setMetadata({});
    legacyLocked.setLocked(true);
    legacyLocked.setGroups(['Keep']);
    const freshUnlocked = Artifact.fromGood(craftedGood({lock: false}));

    const store = new StorageItemArtifacts();
    store.addArtifacts([legacyLocked]);
    const plan = planArtifactImport(store.listArtifacts(), [freshUnlocked]);
    expect(plan.updated).toHaveLength(1);
    store.updateMetadata(plan.updated);
    expect(store.listArtifacts()[0].isLocked()).toBe(true);

    // Isolate second scenario with a fresh storage namespace.
    global.localStorage = new MemoryStorage();
    const legacyUnlocked = Artifact.fromGood(craftedGood({lock: false}));
    legacyUnlocked.setMetadata({});
    legacyUnlocked.setLocked(false);
    const freshLocked = Artifact.fromGood(craftedGood({lock: true}));
    const storeB = new StorageItemArtifacts();
    storeB.addArtifacts([legacyUnlocked]);
    const planB = planArtifactImport(storeB.listArtifacts(), [freshLocked]);
    expect(planB.updated).toHaveLength(1);
    storeB.updateMetadata(planB.updated);
    expect(storeB.listArtifacts()[0].isLocked()).toBe(false);
});
