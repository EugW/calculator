import { Artifact } from "../Artifact";
import { Serializer } from "../Serializer";

export const CODES = {
    OK: 0,
    ERROR_INVALID_FILE: 1,
    ERROR_INVALID_FORMAT: 2,
};

export class ImporterGood {
    process(text) {
        let json;
        let errorsCnt = 0;
        let successCnt = 0;
        let items = [];
        let hashes = {};

        try {
            json = JSON.parse(text);
        } catch(e) {
            return {code: CODES.ERROR_INVALID_FILE};
        }

        if (!json || typeof json !== 'object' || json.format !== 'GOOD') {
            return {code: CODES.ERROR_INVALID_FORMAT};
        }

        if (!Array.isArray(json.artifacts)) {
            return {code: CODES.ERROR_INVALID_FORMAT};
        }

        for (const item of json.artifacts) {
            let art;
            try { art = Artifact.fromGood(item); } catch (error) { art = null; }
            if (art) {
                let hash = Serializer.pack(art);
                if (hash && !hashes[hash]) {
                    hashes[hash] = 1;
                    ++successCnt;
                    items.push(art);
                }
            } else {
                ++errorsCnt;
            }
        }

        return {
            code: CODES.OK,
            items: items,
            counts: {
                success: successCnt,
                errors: errorsCnt,
            },
        };
    }

    static export(items) {
        let result = {
            format: "GOOD",
            version: 3,
            artifacts: [],
        };

        for (const item of items) {
            let data = item.toGood();
            if (data) {
                result.artifacts.push(data);
            }
        }

        return result;
    }
}

// Match unchanged combat stats separately from the full storage payload. Unknown
// metadata can be enriched, but conflicting known histories are distinct items.
// Calculator locks exclude artifacts from suggestions, while GOOD locks mirror
// the in-game flag. New imports stay unlocked unless the user opts into game locks.
export function prepareGoodImportAdded(items, {applyLocks = false, groupNames = [""]} = {}) {
    for (let item of items) {
        item.setGroups(groupNames);
        if (!applyLocks) {
            item.setLocked(false);
        }
    }
    return items;
}

export function planArtifactImport(existing, incoming) {
    const result = {added: [], updated: [], matched: [], missing: []};
    const seen = new Set();
    const buckets = new Map();
    for (const artifact of existing) {
        const key = artifact.getStatsHash();
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push({previous: artifact, artifact});
    }
    for (const artifact of incoming) {
        const key = artifact.getStatsHash();
        if (!buckets.has(key)) buckets.set(key, []);
        const candidates = buckets.get(key);
        const compatible = candidates.map(entry => ({entry, enriched: entry.artifact.enrichFrom(artifact)}))
            .filter(item => item.enriched);
        const exact = compatible.find(item => item.entry.artifact.getHash() === artifact.getHash());
        // A less informative source cannot establish which same-stat artifact
        // is missing. Never offer deletion of those ambiguous candidates.
        for (const {entry} of compatible) if (entry.previous) seen.add(entry.previous);
        const match = exact || (compatible.length === 1 ? compatible[0] : null);
        if (match) {
            // Match later records against the staged metadata, not the original
            // unknown entry. Two conflicting incoming histories must not both
            // overwrite that same entry in a single import batch.
            match.entry.artifact = match.enriched;
        } else {
            const alreadyRepresented = compatible.some(({entry, enriched}) => entry.artifact.getHash() === enriched.getHash());
            if (!alreadyRepresented) candidates.push({previous: null, artifact});
        }
    }
    for (const entries of buckets.values()) {
        for (const {previous, artifact} of entries) {
            if (!previous) result.added.push(artifact);
            else if (seen.has(previous)) {
                if (previous.getHash() === artifact.getHash()) result.matched.push(previous);
                else result.updated.push({previous, artifact});
            }
        }
    }
    result.missing = existing.filter(item => !seen.has(item));
    return result;
}
