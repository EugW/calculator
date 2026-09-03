const GALLERY_DB_NAME = 'genshin_calc';
const GALLERY_DB_VERSION = 1;
const GALLERY_STORE = 'artifact_action_results';
const OPEN_TIMEOUT_MS = 10000;

let databasePromise = null;
let databaseSource = null;

/** False outside browsers (jest, SSR) or where IndexedDB is unavailable. */
export function historyGallerySupported() {
    return typeof indexedDB !== 'undefined' && typeof IDBKeyRange !== 'undefined';
}

function openGalleryDatabase() {
    if (!historyGallerySupported()) return Promise.reject(new Error('indexeddb_unavailable'));
    // Key the cached open on the IndexedDB object identity: a rejected open
    // must not poison later calls, and tests swap the global between cases.
    if (!databasePromise || databaseSource !== indexedDB) {
        databaseSource = indexedDB;
        databasePromise = new Promise((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    reject(new Error('indexeddb_open_timeout'));
                }
            }, OPEN_TIMEOUT_MS);
            const finish = (callback, value) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                callback(value);
            };
            try {
                const request = indexedDB.open(GALLERY_DB_NAME, GALLERY_DB_VERSION);
                request.onupgradeneeded = () => {
                    const database = request.result;
                    if (!database.objectStoreNames.contains(GALLERY_STORE)) {
                        database.createObjectStore(GALLERY_STORE);
                    }
                };
                request.onsuccess = () => finish(resolve, request.result);
                request.onerror = () => finish(reject, request.error || new Error('indexeddb_open_failed'));
                // onblocked is advisory: onsuccess still follows once other
                // tabs release the old version, guarded by the timeout above.
            } catch (error) {
                finish(reject, error);
            }
        });
        // A rejected open (private mode, timeout) must not poison later calls.
        databasePromise.catch(() => {
            if (databaseSource === indexedDB) {
                databasePromise = null;
                databaseSource = null;
            }
        });
    }
    return databasePromise;
}

function runGalleryRequest(mode, operation) {
    return openGalleryDatabase().then(database => new Promise((resolve, reject) => {
        let transaction;
        try {
            transaction = database.transaction(GALLERY_STORE, mode);
        } catch (error) {
            reject(error);
            return;
        }
        let request;
        try {
            request = operation(transaction.objectStore(GALLERY_STORE));
        } catch (error) {
            reject(error);
            return;
        }
        // A successful request can still be rolled back when its transaction
        // commits (for example on quota failure). Publish success only once
        // the transaction has completed, for reads as well as writes.
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = () => reject(transaction.error || new Error('indexeddb_transaction_aborted'));
        transaction.onerror = () => reject(transaction.error || new Error('indexeddb_transaction_failed'));
        request.onerror = () => reject(request.error || new Error('indexeddb_request_failed'));
    }));
}

/**
 * Full prediction results, stored by structured clone: packed winner buffers
 * (Float64Array/Uint32Array chunks) survive as real typed arrays, unlike a
 * localStorage JSON round trip. One atomic put per entry id.
 */
export function putHistoryGallery(id, result) {
    return runGalleryRequest('readwrite', store => store.put(result, id));
}

/** Structured-cloned result, or null when the entry was never stored. */
export function getHistoryGallery(id) {
    return runGalleryRequest('readonly', store => store.get(id)).then(result => result ?? null);
}

/** Resolves even when nothing was stored under the id. */
export function deleteHistoryGallery(id) {
    return runGalleryRequest('readwrite', store => store.delete(id)).then(() => true);
}
