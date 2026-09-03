import { StorageItem } from "../StorageItem";
import { deleteHistoryGallery, getHistoryGallery, historyGallerySupported, putHistoryGallery } from "../ActionHistoryGallery";

export const ARTIFACT_ACTION_HISTORY_LIMIT = 30;
// Total estimated gallery bytes across entries; oldest entries (and their
// IndexedDB blobs) are evicted first when either budget is exceeded.
export const ARTIFACT_ACTION_HISTORY_BLOB_BUDGET = 256 * 1024 * 1024;
const HISTORY_VERSION = 2;
const HISTORY_KINDS = ['craft', 'reshape', 'upgrade'];

/**
 * Completed craft/reshape/upgrade runs. The localStorage index stays lean
 * (identity, timestamp, context, row/best/byte counters); full results —
 * including packed winner galleries that cannot survive a JSON round trip —
 * live as structured-cloned blobs in IndexedDB under the same id. Legacy
 * version-1 entries (stripped result embedded, gallery-less) remain readable.
 */
export class StorageItemArtifactActionHistory extends StorageItem {
    constructor() {
        super('artifact_action_history');
    }

    validateItem(item) {
        if (!item || typeof item !== 'object') return null;
        if (!HISTORY_KINDS.includes(item.kind)) return null;
        if (!Number.isFinite(item.timestamp) || typeof item.id !== 'string' || !item.id) return null;
        if (item.version === 1) {
            if (!item.result || !Array.isArray(item.result.rows)) return null;
            return item;
        }
        if (item.version !== HISTORY_VERSION) return null;
        if (item.context !== undefined && (typeof item.context !== 'object' || item.context === null)) return null;
        if (!Number.isFinite(item.rows) || (item.best !== null && !Number.isFinite(item.best))) return null;
        if (typeof item.gallery !== 'boolean' || !Number.isFinite(item.bytes)) return null;
        return item;
    }

    listEntries(kind) {
        return this.items.filter(item => !kind || item.kind === kind).slice().reverse();
    }

    getEntry(id) {
        return this.items.find(item => item.id === id) || null;
    }

    async saveRun({kind, feature, featureType, context, result}) {
        if (this.error) return null;
        if (!HISTORY_KINDS.includes(kind) || !result || !Array.isArray(result.rows)) return null;
        if (historyGallerySupported()) {
            try {
                return await this.saveGalleryRun({kind, feature, featureType, context, result});
            } catch {
                // IndexedDB unwritable (private mode, timeout, quota even for
                // one blob): fall through to the gallery-less localStorage entry.
            }
        }
        return this.saveStrippedRun({kind, feature, featureType, context, result});
    }

    async saveGalleryRun({kind, feature, featureType, context, result}) {
        const id = makeHistoryId();
        const {forcedDebug, forcedProfile, ...clean} = result;
        await putHistoryGallery(id, clean);
        const entry = {version: HISTORY_VERSION, id, timestamp: Date.now(), kind,
            feature: feature || '', featureType: featureType || 'average',
            context: context && typeof context === 'object' ? context : {},
            rows: countScoredRows(result), best: bestFiniteScore(result),
            bytes: estimateHistoryBlobBytes(result), gallery: true};
        const snapshot = this.items.slice();
        this.items.push(entry);
        this.evictForLimits();
        if (this.save() !== true || !this.items.includes(entry)) {
            this.items = snapshot;
            try { await deleteHistoryGallery(id); } catch { /* rollback is best-effort */ }
            throw new Error('history_index_unwritable');
        }
        await this.deleteRemovedGalleries(snapshot);
        return entry;
    }

    async saveStrippedRun({kind, feature, featureType, context, result}) {
        const stripped = stripArtifactActionResultForHistory(result);
        if (!stripped) return null;
        const entry = {version: 1, id: makeHistoryId(), timestamp: Date.now(), kind,
            feature: feature || '', featureType: featureType || 'average',
            context: context && typeof context === 'object' ? context : {}, result: stripped};
        const snapshot = this.items.slice();
        this.items.push(entry);
        while (this.items.length > ARTIFACT_ACTION_HISTORY_LIMIT) this.items.shift();
        let status = this.save();
        while (status === 'quota' && this.items.length > 1) {
            this.items.shift();
            status = this.save();
        }
        if (status !== true || !this.items.includes(entry)) {
            this.items = snapshot;
            return null;
        }
        await this.deleteRemovedGalleries(snapshot);
        return entry;
    }

    evictForLimits() {
        const overBudget = () => this.items.length > ARTIFACT_ACTION_HISTORY_LIMIT
            || this.items.reduce((sum, item) => sum + (item.bytes || 0), 0) > ARTIFACT_ACTION_HISTORY_BLOB_BUDGET;
        while (this.items.length > 1 && overBudget()) {
            this.items.shift();
        }
    }

    async deleteRemovedGalleries(previous) {
        // The index is already durable. Failed cleanup leaves an orphaned blob,
        // never a live history entry whose results were deleted by rollback.
        const retained = new Set(this.items.map(item => item.id));
        for (const item of previous) {
            if (item.gallery && !retained.has(item.id)) {
                try { await deleteHistoryGallery(item.id); } catch { /* blob GC is best-effort */ }
            }
        }
    }

    async openRun(id) {
        const entry = this.getEntry(id);
        if (!entry) return null;
        if (entry.version === 1) return {entry, result: entry.result, gallery: false};
        try {
            const result = await getHistoryGallery(id);
            if (!result || !Array.isArray(result.rows)) return {entry, result: null, gallery: true};
            return {entry, result, gallery: true};
        } catch {
            return {entry, result: null, gallery: true};
        }
    }

    async removeRun(id) {
        if (this.error) return false;
        const index = this.items.findIndex(item => item.id === id);
        if (index < 0) return false;
        const snapshot = this.items.slice();
        this.items.splice(index, 1);
        if (this.save() !== true) {
            this.items = snapshot;
            return false;
        }
        await this.deleteRemovedGalleries(snapshot);
        return true;
    }

    save() {
        if (typeof localStorage === 'undefined') return true;
        try {
            localStorage.setItem(this.keyName, JSON.stringify(this.items));
            return true;
        } catch (error) {
            return error?.name === 'QuotaExceededError' ? 'quota' : false;
        }
    }
}

export function historyEntryRowCount(entry) {
    if (!entry) return 0;
    if (Number.isFinite(entry.rows)) return entry.rows;
    return countScoredRows(entry.result);
}

export function historyEntryBest(entry) {
    if (!entry) return null;
    if (entry.best === null || Number.isFinite(entry.best)) return entry.best;
    return bestFiniteScore(entry.result);
}

export function historyEntryHasGallery(entry) {
    return !!entry && entry.version !== 1 && entry.gallery === true;
}

export function bestFiniteScore(result) {
    const scores = (result?.rows || []).filter(row => row && !row.error)
        .map(row => row.score).filter(Number.isFinite);
    return scores.length ? Math.max(...scores) : null;
}

export function countScoredRows(result) {
    return (result?.rows || []).filter(row => row && !row.error).length;
}

/** Rough guardrail for the blob budget: packed buffer bytes plus the JSON
 * size of everything else. Precision does not matter; the browser enforces
 * its real quota on top.
 */
export function estimateHistoryBlobBytes(result) {
    let bytes = 0;
    try {
        for (const row of result?.rows || []) {
            const details = row?.outcomeDetails;
            if (!details) continue;
            for (const chunk of details.chunks || []) bytes += chunk?.byteLength || 0;
            bytes += details.order?.byteLength || 0;
            bytes += details.atLeastProbabilities?.byteLength || 0;
            for (const build of details.builds || []) bytes += (build?.length || 0) * 8;
        }
        bytes += JSON.stringify(stripArtifactActionResultForHistory(result))?.length || 0;
    } catch {
        // Guardrail only; never fail the save on measurement.
    }
    return bytes;
}

/**
 * Gallery-less fallback for environments without IndexedDB: drop per-row
 * outcome galleries (packed transfer buffers), the serialized outcome
 * inventory and baseline indices they decode against, and debug-only
 * forced-engine dumps. The row click affordance keys off outcomeDetails, so
 * fallback rows automatically render without the gallery browser.
 * Non-finite numbers cannot survive the localStorage round trip; normalize
 * them the way the UI already displays them (as missing).
 */
export function stripArtifactActionResultForHistory(result) {
    if (!result || typeof result !== 'object' || !Array.isArray(result.rows)) return null;
    const {outcomeDetails, outcomeInventory, baselineArtifacts, forcedDebug, forcedProfile, ...rest} = result;
    const rows = result.rows.map(row => {
        if (!row || typeof row !== 'object') return row;
        const {outcomeDetails: details, ...rowRest} = row;
        return rowRest;
    });
    return JSON.parse(JSON.stringify({ ...rest, rows }, (key, value) =>
        typeof value === 'number' && !Number.isFinite(value) ? null : value));
}

function makeHistoryId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
