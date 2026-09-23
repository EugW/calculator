import { Artifact } from "../src/js/classes/Artifact";
import { CalcSet } from "../src/js/classes/CalcSet";
import { Serializer } from "../src/js/classes/Serializer";
import { migrateArtifactPersistence } from "../src/js/classes/StorageMigration/Artifacts";
import { StorageItemArtifacts } from "../src/js/classes/StorageItem/Artifacts";
import { StorageItemChar } from "../src/js/classes/StorageItem/Char";
import { DB } from "../src/js/db/DB";

global.DB = DB;
global.UI = {Lang: {get: () => ""}};

// Exact artifacts from the affected user's backup.
const FLOWER_V1 = "bBxfubbecojGdeBvkEf";
const FLOWER_V2 = "cBxfubbecojGdeBvkEfa";
const FEATHER_V2 = "cBxfucceeEhjDtkIrhva";

// Exact `сайно кондакт` build from the backup. Replacing its v2 flower with
// the corresponding v1 payload recreates a valid pre-v2 saved build.
const CANONICAL_BUILD = "bChDmgbkkkebcefDqDmgbbbhfcBxfubbecojGdeBvkEfacBxfucceeEhjDtkIrhvacBufuddejGtkEudvhxacCbfuedebIbjFkcskHmacBufufkeeHfjDxhxiCnaaDwcbahrdEwgbELkdeefijEvebhccdeBxbcCsCtmhCvCpdCyhdahaabBcbaaabbjaaabcjaaabdiaaabeiaaabMkeaaabBCjeadaaa";
const LEGACY_BUILD = CANONICAL_BUILD.replace(FLOWER_V2, FLOWER_V1);

const MALFORMED_ARTIFACT = {
    data: "!",
    locked: true,
    group: ["keep malformed"],
    futureMetadata: 17,
};

const MALFORMED_BUILD = {
    title: "keep malformed",
    data: "!",
    futureMetadata: 23,
};

class MemoryStorage {
    constructor(data) {
        this.data = Object.assign({}, data);
    }

    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.data, key)
            ? this.data[key]
            : null;
    }

    setItem(key, value) {
        this.data[key] = String(value);
    }
}

class FailingStorage extends MemoryStorage {
    constructor(data, failingKey) {
        super(data);
        this.failingKey = failingKey;
        this.failed = false;
    }

    setItem(key, value) {
        if (key === this.failingKey && !this.failed) {
            this.failed = true;
            throw new Error("simulated write failure");
        }

        super.setItem(key, value);
    }
}

function makeStorage(data) {
    return new MemoryStorage(Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)]),
    ));
}

function readJSON(storage, key) {
    return JSON.parse(storage.getItem(key));
}

function decodeArtifact(hash) {
    return Artifact.deserialize(Serializer.unpack(hash));
}

function buildArtifactHashes(hash) {
    const build = CalcSet.deserialize(Serializer.unpack(hash));
    if (!build) {
        throw new Error("Expected a valid saved build fixture");
    }

    return Object.values(build.getArtifacts())
        .filter((artifact) => artifact)
        .map((artifact) => artifact.getHash());
}

test("canonicalizes the artifact pool while preserving lock, groups, metadata, and order", () => {
    expect(decodeArtifact(FLOWER_V1).getHash()).toBe(FLOWER_V2);
    expect(decodeArtifact(FEATHER_V2).getHash()).toBe(FEATHER_V2);

    const pool = [
        {
            data: FEATHER_V2,
            locked: true,
            group: ["already current"],
        },
        {
            data: FLOWER_V1,
            locked: false,
            group: ["Whispers", "Ночь"],
            futureMetadata: 11,
        },
        MALFORMED_ARTIFACT,
    ];
    const storage = makeStorage({artifact_pool: pool});

    const report = migrateArtifactPersistence(storage);

    expect(report.changed).toBe(true);
    expect(readJSON(storage, "artifact_pool")).toEqual([
        pool[0],
        Object.assign({}, pool[1], {data: FLOWER_V2}),
        MALFORMED_ARTIFACT,
    ]);
});

test("rewrites saved, last, and comparison builds so stored artifacts share canonical hashes", () => {
    const pool = [
        {data: FLOWER_V1, locked: false, group: [""]},
        {data: FEATHER_V2, locked: true, group: [""]},
    ];
    const chars = [
        {title: "сайно кондакт", data: LEGACY_BUILD},
        MALFORMED_BUILD,
    ];
    const settings = {
        last_build: LEGACY_BUILD,
        unrelated_setting: "preserve me",
    };
    const comparisons = [
        {title: "comparison", data: LEGACY_BUILD},
        MALFORMED_BUILD,
    ];
    const storage = makeStorage({
        artifact_pool: pool,
        char: chars,
        settings: settings,
        compare_items: comparisons,
    });

    migrateArtifactPersistence(storage);

    const migratedPool = readJSON(storage, "artifact_pool");
    const migratedChars = readJSON(storage, "char");
    const migratedSettings = readJSON(storage, "settings");
    const migratedComparisons = readJSON(storage, "compare_items");

    expect(migratedPool.map((item) => item.data)).toEqual([
        FLOWER_V2,
        FEATHER_V2,
    ]);
    expect(migratedChars[0]).toEqual({
        title: "сайно кондакт",
        data: CANONICAL_BUILD,
    });
    expect(migratedSettings).toEqual({
        last_build: CANONICAL_BUILD,
        unrelated_setting: "preserve me",
    });
    expect(migratedComparisons[0]).toEqual({
        title: "comparison",
        data: CANONICAL_BUILD,
    });

    const poolHashes = new Set(migratedPool.map((item) => item.data));
    const linkedHashes = buildArtifactHashes(migratedChars[0].data)
        .filter((hash) => poolHashes.has(hash));
    expect(linkedHashes).toEqual([FLOWER_V2, FEATHER_V2]);

    expect(migratedChars[1]).toEqual(MALFORMED_BUILD);
    expect(migratedComparisons[1]).toEqual(MALFORMED_BUILD);
});

test("canonicalizes a free-floating saved-build artifact without adding it to storage", () => {
    const storage = makeStorage({
        artifact_pool: [
            {data: FEATHER_V2, locked: true, group: [""]},
        ],
        char: [
            {title: "free-floating flower", data: LEGACY_BUILD},
        ],
    });

    migrateArtifactPersistence(storage);

    const migratedPool = readJSON(storage, "artifact_pool");
    const migratedBuild = readJSON(storage, "char")[0].data;

    expect(migratedPool).toEqual([
        {data: FEATHER_V2, locked: true, group: [""]},
    ]);
    expect(buildArtifactHashes(migratedBuild)).toEqual(
        expect.arrayContaining([FLOWER_V2, FEATHER_V2]),
    );
    expect(migratedPool.some((item) => item.data === FLOWER_V2)).toBe(false);
});

test("preserves malformed artifact and build payloads instead of dropping them", () => {
    const initial = {
        artifact_pool: [MALFORMED_ARTIFACT],
        char: [MALFORMED_BUILD],
        settings: {
            last_build: "!",
            unrelated_setting: "preserve me",
        },
        compare_items: [MALFORMED_BUILD],
    };
    const storage = makeStorage(initial);
    const before = Object.assign({}, storage.data);

    const report = migrateArtifactPersistence(storage);

    expect(report.changed).toBe(false);
    expect(storage.data).toEqual(before);
});

test("is idempotent after canonicalizing mixed artifact and build versions", () => {
    const storage = makeStorage({
        artifact_pool: [
            {data: FLOWER_V1, locked: false, group: ["Whispers"]},
            {data: FEATHER_V2, locked: true, group: [""]},
        ],
        char: [
            {title: "сайно кондакт", data: LEGACY_BUILD},
        ],
        settings: {last_build: LEGACY_BUILD},
        compare_items: [
            {title: "comparison", data: LEGACY_BUILD},
        ],
    });

    const firstReport = migrateArtifactPersistence(storage);
    const afterFirstMigration = Object.assign({}, storage.data);
    const secondReport = migrateArtifactPersistence(storage);

    expect(firstReport.changed).toBe(true);
    expect(secondReport.changed).toBe(false);
    expect(storage.data).toEqual(afterFirstMigration);
});

test("preserves colliding pool entries instead of silently merging user data", () => {
    const storage = makeStorage({
        artifact_pool: [
            {
                data: FLOWER_V1,
                locked: false,
                group: ["legacy copy"],
            },
            {
                data: FLOWER_V2,
                locked: true,
                group: ["current copy"],
            },
        ],
    });

    migrateArtifactPersistence(storage);

    expect(readJSON(storage, "artifact_pool")).toEqual([
        {
            data: FLOWER_V2,
            locked: false,
            group: ["legacy copy"],
        },
        {
            data: FLOWER_V2,
            locked: true,
            group: ["current copy"],
        },
    ]);
});

test("upgrades the legacy semicolon artifact-pool format", () => {
    const storage = new MemoryStorage({
        artifact_pool: `${FLOWER_V1};z;${FEATHER_V2};`,
    });

    const report = migrateArtifactPersistence(storage);

    expect(report.changed).toBe(true);
    expect(readJSON(storage, "artifact_pool")).toEqual([
        {data: FLOWER_V2, locked: false, group: [""]},
        {data: "z", locked: false, group: [""]},
        {data: FEATHER_V2, locked: false, group: [""]},
    ]);
});

test("does not strip unknown trailing artifact data", () => {
    const artifactWithTrailingData = FLOWER_V1 + "a";
    const pool = [
        {
            data: artifactWithTrailingData,
            locked: false,
            group: ["future payload"],
        },
    ];
    const storage = makeStorage({artifact_pool: pool});

    const report = migrateArtifactPersistence(storage);

    expect(report.changed).toBe(false);
    expect(readJSON(storage, "artifact_pool")).toEqual(pool);
});

test("does not reinterpret punctuation or an unterminated serializer token", () => {
    const pool = [
        {
            data: FLOWER_V1.replace("Bx", "{"),
            locked: false,
            group: ["punctuation"],
        },
        {
            data: FLOWER_V1 + "A",
            locked: false,
            group: ["unterminated token"],
        },
    ];
    const storage = makeStorage({artifact_pool: pool});

    const report = migrateArtifactPersistence(storage);

    expect(report.changed).toBe(false);
    expect(readJSON(storage, "artifact_pool")).toEqual(pool);
});

test("restores earlier keys when a later storage write fails", () => {
    const initial = makeStorage({
        artifact_pool: [
            {data: FLOWER_V1, locked: false, group: [""]},
        ],
        char: [
            {title: "сайно кондакт", data: LEGACY_BUILD},
        ],
    }).data;
    const storage = new FailingStorage(initial, "char");
    const before = Object.assign({}, storage.data);

    const report = migrateArtifactPersistence(storage);

    expect(report.changed).toBe(false);
    expect(report.rolledBack).toBe(true);
    expect(report.errors).toEqual([
        {key: "char", error: "simulated write failure"},
    ]);
    expect(storage.data).toEqual(before);
});

test("locks a legacy pool artifact through its canonical saved-build identity", () => {
    const storage = makeStorage({
        artifact_pool: [
            {data: FLOWER_V1, locked: false, group: [""], futureMetadata: 31},
        ],
    });
    global.localStorage = storage;
    const artifacts = new StorageItemArtifacts();

    artifacts.setLocked([FLOWER_V2], true);

    expect(readJSON(storage, "artifact_pool")[0]).toEqual({
        data: FLOWER_V1,
        locked: true,
        group: [""],
        futureMetadata: 31,
    });
    expect(artifacts.getLocked()).toEqual([FLOWER_V2]);
});

test("applies lock state to every representation of a colliding identity", () => {
    const storage = makeStorage({
        artifact_pool: [
            {data: FLOWER_V1, locked: false, group: ["legacy copy"]},
            {data: FLOWER_V2, locked: false, group: ["current copy"]},
        ],
    });
    global.localStorage = storage;
    const artifacts = new StorageItemArtifacts();

    artifacts.setLocked([FLOWER_V2], true);

    expect(readJSON(storage, "artifact_pool").map((item) => item.locked)).toEqual([
        true,
        true,
    ]);
});

test("storage loaders skip malformed record shapes without crashing", () => {
    const storage = makeStorage({
        artifact_pool: [
            null,
            {},
            {data: FLOWER_V1, locked: false, group: {}},
        ],
        char: [
            null,
            {},
            MALFORMED_BUILD,
        ],
    });
    global.localStorage = storage;

    const artifacts = new StorageItemArtifacts();
    const chars = new StorageItemChar();

    expect(artifacts.listDecoded(1)).toEqual([]);
    expect(chars.listDecoded(1)).toEqual([]);
});
