const KEY = 'artifact_baseline_acknowledgements';
const LIMIT = 64;

function read(storage) {
    try {
        const data = JSON.parse((storage || globalThis.localStorage)?.getItem(KEY) || 'null');
        return data?.version === 1 && Array.isArray(data.fingerprints)
            ? data.fingerprints.filter(value => typeof value === 'string' && value).slice(-LIMIT) : [];
    } catch {
        return [];
    }
}

/** An acknowledgement is specific to the complete baseline request fingerprint. */
export function isArtifactBaselineAcknowledged(fingerprint, storage) {
    return typeof fingerprint === 'string' && read(storage).includes(fingerprint);
}

export function acknowledgeArtifactBaseline(fingerprint, storage) {
    if (typeof fingerprint !== 'string' || !fingerprint) return;
    try {
        const fingerprints = read(storage).filter(value => value !== fingerprint).concat(fingerprint).slice(-LIMIT);
        (storage || globalThis.localStorage)?.setItem(KEY, JSON.stringify({version: 1, fingerprints}));
    } catch {
        // A disabled/full local store must not prevent continuing the prediction.
    }
}
