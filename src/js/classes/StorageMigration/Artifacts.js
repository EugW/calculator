import { Artifact } from "../Artifact";
import { CalcSet } from "../CalcSet";
import { Serializer } from "../Serializer";

// v2 remains byte-stable for artifacts without provenance; known metadata uses v3.
const TARGET_ARTIFACT_VERSIONS = [2, 3];

const STORAGE_TARGETS = [
    {
        key: 'artifact_pool',
        migrate: migrateArtifactPool,
    },
    {
        key: 'char',
        migrate: migrateBuildList,
    },
    {
        key: 'settings',
        migrate: migrateSettings,
    },
    {
        key: 'compare_items',
        migrate: migrateBuildList,
    },
];

/**
 * Canonicalize every locally persisted artifact before StorageItem instances
 * expose their data to the rest of the application.
 *
 * The migration deliberately has no one-shot version marker. It is
 * idempotent, and running it at every startup also normalizes legacy data
 * introduced later through an older browser profile or another ingress path.
 * Its target artifact version is fixed, so a future serializer change must
 * explicitly opt into a new migration instead of rewriting data implicitly.
 * Every target is prepared and verified before the first write. If a write
 * fails, already written keys are restored on a best-effort basis.
 */
export function migrateArtifactPersistence(storage) {
    let report = {
        changed: false,
        rolledBack: false,
        writes: [],
        targets: {},
        errors: [],
    };

    if (!storage || typeof storage.getItem != 'function' || typeof storage.setItem != 'function') {
        report.errors.push({key: '', error: 'Storage is unavailable'});
        return report;
    }

    let pending = [];
    let stagingFailed = false;

    for (const target of STORAGE_TARGETS) {
        let raw;
        try {
            raw = storage.getItem(target.key);
        } catch (error) {
            report.errors.push({key: target.key, error: getErrorMessage(error)});
            stagingFailed = true;
            continue;
        }

        let targetReport = createTargetReport();
        report.targets[target.key] = targetReport;

        if (typeof raw != 'string' || !raw) {
            continue;
        }

        let migrated;
        try {
            migrated = target.migrate(raw, targetReport);
        } catch (error) {
            targetReport.errors++;
            report.errors.push({key: target.key, error: getErrorMessage(error)});
            stagingFailed = true;
            continue;
        }

        if (typeof migrated == 'string' && migrated != raw) {
            pending.push({
                key: target.key,
                before: raw,
                after: migrated,
            });
        }
    }

    if (stagingFailed) {
        return report;
    }

    let written = [];
    try {
        for (const item of pending) {
            storage.setItem(item.key, item.after);
            written.push(item);
        }
    } catch (error) {
        report.errors.push({key: written.length < pending.length ? pending[written.length].key : '', error: getErrorMessage(error)});
        if (written.length) {
            report.rolledBack = rollbackWrites(storage, written, report.errors);
        }
        return report;
    }

    report.changed = pending.length > 0;
    report.writes = pending.map((item) => item.key);
    return report;
}

function migrateArtifactPool(raw, report) {
    let items = parseJson(raw);
    let legacyFormat = false;

    if (!Array.isArray(items)) {
        items = parseLegacyArtifactPool(raw);
        if (!items) {
            report.errors++;
            return raw;
        }

        legacyFormat = true;
        report.legacyFormat = true;
    }

    let changed = false;
    let canonicalCounts = {};
    let result = items.map((item) => {
        report.records++;

        if (!isStorageRecord(item)) {
            report.skipped++;
            return item;
        }

        let canonical = canonicalArtifactData(item.data);
        if (!canonical) {
            report.skipped++;
            return item;
        }

        report.valid++;
        canonicalCounts[canonical] = (canonicalCounts[canonical] || 0) + 1;

        if (canonical == item.data) {
            return item;
        }

        changed = true;
        report.migrated++;
        return Object.assign({}, item, {data: canonical});
    });

    for (const count of Object.values(canonicalCounts)) {
        if (count > 1) {
            report.collisions += count - 1;
        }
    }

    return changed || legacyFormat ? JSON.stringify(result) : raw;
}

function migrateBuildList(raw, report) {
    let items = parseJson(raw);
    if (!Array.isArray(items)) {
        report.errors++;
        return raw;
    }

    let changed = false;
    let result = items.map((item) => {
        report.records++;

        if (!isStorageRecord(item)) {
            report.skipped++;
            return item;
        }

        let canonical = canonicalBuildData(item.data);
        if (!canonical) {
            report.skipped++;
            return item;
        }

        report.valid++;
        if (canonical == item.data) {
            return item;
        }

        changed = true;
        report.migrated++;
        return Object.assign({}, item, {data: canonical});
    });

    return changed ? JSON.stringify(result) : raw;
}

function migrateSettings(raw, report) {
    let settings = parseJson(raw);
    if (!settings || typeof settings != 'object' || Array.isArray(settings)) {
        report.errors++;
        return raw;
    }

    let lastBuild = settings.last_build;
    if (typeof lastBuild != 'string' || !lastBuild) {
        return raw;
    }

    report.records++;
    let canonical = canonicalBuildData(lastBuild);
    if (!canonical) {
        report.skipped++;
        return raw;
    }

    report.valid++;
    if (canonical == lastBuild) {
        return raw;
    }

    report.migrated++;
    return JSON.stringify(Object.assign({}, settings, {last_build: canonical}));
}

function canonicalArtifactData(data) {
    return canonicalData(
        data,
        (input) => Artifact.deserialize(input),
        (artifact) => artifactUsesTargetVersion(artifact),
    );
}

function canonicalBuildData(data) {
    return canonicalData(
        data,
        (input) => CalcSet.deserialize(input),
        (build) => buildUsesTargetArtifactVersion(build),
    );
}

function canonicalData(data, deserialize, validateObject) {
    if (typeof data != 'string' || !hasValidSerializerShape(data)) {
        return null;
    }

    let input;
    try {
        input = Serializer.unpack(data);
    } catch (error) {
        return null;
    }
    if (!input) {
        return null;
    }

    let object;
    try {
        object = deserialize(input);
    } catch (error) {
        return null;
    }
    if (!object || input.length) {
        return null;
    }

    try {
        if (!validateObject(object)) {
            return null;
        }
    } catch (error) {
        return null;
    }

    let canonical;
    try {
        canonical = Serializer.pack(object);
    } catch (error) {
        return null;
    }
    if (!canonical) {
        return null;
    }

    // Verify both readability and idempotency before staging a write.
    try {
        let verifiedInput = Serializer.unpack(canonical);
        let verified = verifiedInput ? deserialize(verifiedInput) : null;
        if (!verified || verifiedInput.length || !validateObject(verified) || Serializer.pack(verified) != canonical) {
            return null;
        }
    } catch (error) {
        return null;
    }

    return canonical;
}

function artifactUsesTargetVersion(artifact) {
    let serialized = artifact.serialize();
    return Array.isArray(serialized) && TARGET_ARTIFACT_VERSIONS.includes(serialized[0]);
}

function buildUsesTargetArtifactVersion(build) {
    let hasArtifacts = false;

    for (const artifact of Object.values(build.getArtifacts())) {
        if (!artifact) {
            continue;
        }

        hasArtifacts = true;
        if (!artifactUsesTargetVersion(artifact)) {
            return false;
        }
    }

    // Builds without artifacts have no identity to migrate. Leaving them byte
    // stable also avoids persisting unrelated CalcSet normalizations.
    return hasArtifacts;
}

function rollbackWrites(storage, written, errors) {
    let success = true;

    for (let i = written.length - 1; i >= 0; --i) {
        try {
            storage.setItem(written[i].key, written[i].before);
        } catch (error) {
            success = false;
            errors.push({key: written[i].key, error: 'Rollback failed: '+ getErrorMessage(error)});
        }
    }

    return success;
}

function createTargetReport() {
    return {
        records: 0,
        valid: 0,
        migrated: 0,
        skipped: 0,
        collisions: 0,
        errors: 0,
        legacyFormat: false,
    };
}

function parseLegacyArtifactPool(raw) {
    // ArtifactStorage historically persisted hashes as a semicolon-delimited
    // string. Only recognize the serializer alphabet here, so malformed JSON
    // or arbitrary strings are not accidentally rewritten into pool records.
    if (!/^[A-Za-z\x00;]+$/.test(raw) || !/[A-Za-z\x00]/.test(raw)) {
        return null;
    }

    let items = [];
    for (const data of raw.split(';')) {
        if (!data) {
            continue;
        }

        items.push({
            data: data,
            locked: false,
            group: [''],
        });
    }

    return items.length ? items : null;
}

function hasValidSerializerShape(data) {
    // Every packed integer ends in a lowercase letter. Reject punctuation and
    // unterminated uppercase runs before Serializer.unpack(), whose historical
    // range guard is intentionally permissive for old data recovery.
    return /^(?:[A-Z]*(?:[a-z]|\x00))+$/.test(data);
}

function isStorageRecord(item) {
    return !!item && typeof item == 'object' && !Array.isArray(item) && typeof item.data == 'string';
}

function parseJson(raw) {
    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

function getErrorMessage(error) {
    if (error && error.message) {
        return error.message;
    }
    return ''+ error;
}
