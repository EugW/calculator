// Separate from build/storage blobs: these are browser-wide optimizer preferences,
// not artifact data, prediction parameters, results, or a preset payload.
export const ARTIFACT_SUGGEST_PREFERENCES_KEY = 'artifact_suggest_settings';
const VERSION = 1;
const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const isMap = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeKey = key => !['__proto__', 'prototype', 'constructor'].includes(key);
const isBoolean = value => typeof value === 'boolean';
const isScalar = value => typeof value === 'string' || isBoolean(value) || Number.isFinite(value);
const isLevel = value => Number.isInteger(value) && value >= 0 && value <= 20;

function pickMap(value, validValue, validKey = safeKey) {
    if (!isMap(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([key, item]) => safeKey(key) && validKey(key) && validValue(item)));
}

/** Only persist the main optimizer's editable controls. Validate each field so a
 * damaged value cannot replace the whole settings tree or erase new defaults.
 */
export function normalizeArtifactSuggestPreferences(value) {
    const data = isMap(value) ? value : {};
    const settings = isMap(data.settings) ? data.settings : {};
    const filter = isMap(settings.filter) ? settings.filter : {};
    const mainStats = isMap(filter.main_stats) ? filter.main_stats : {};
    const result = {settings: {
        stats: pickMap(settings.stats, value => value === '' ||
            ((typeof value === 'string' && /^\d+(?:\.\d*)?$/.test(value) || Number.isFinite(value))
                && Number.isFinite(Number(value)) && Number(value) >= 0),
            key => /^(recharge|crit_rate|crit_dmg|atk|def|hp|mastery)_(min|max)$/.test(key)),
        groups: pickMap(settings.groups, isBoolean),
        slots: pickMap(settings.slots, isBoolean, key => SLOTS.includes(key)),
        sets: pickMap(settings.sets, isBoolean, key => /^[A-Za-z0-9_]+-[1-5]$/.test(key)),
        sets_settings: pickMap(settings.sets_settings, isScalar),
        required_sets: pickMap(settings.required_sets, value => typeof value === 'string' && /^[A-Za-z0-9_]*$/.test(value),
            key => key === 'set1' || key === 'set2'),
        filter: {main_stats: Object.fromEntries(SLOTS.filter(slot => isMap(mainStats[slot]))
            .map(slot => [slot, pickMap(mainStats[slot], isBoolean)]))},
    }};
    for (const key of ['min_level', 'max_level']) if (isLevel(filter[key])) result.settings.filter[key] = filter[key];
    if (['normal', 'crit', 'average'].includes(data.featureType)) result.featureType = data.featureType;
    if (Number.isInteger(data.maxThreads) && data.maxThreads >= 1 && data.maxThreads <= 16) result.maxThreads = data.maxThreads;
    if (isBoolean(data.useGPU)) result.useGPU = data.useGPU;
    return result;
}

/** Current inventory/database defaults first, saved choices second. Missing new
 * sets, groups, slots and main stats remain enabled rather than disappearing.
 */
export function restoreArtifactSuggestPreferences(defaults, saved) {
    const clean = normalizeArtifactSuggestPreferences(saved);
    const settings = {};
    for (const key of ['stats', 'groups', 'slots', 'sets', 'sets_settings', 'required_sets']) {
        settings[key] = {...defaults.settings[key], ...clean.settings[key]};
    }
    settings.filter = {...defaults.settings.filter, ...clean.settings.filter, main_stats: {}};
    for (const [slot, stats] of Object.entries(defaults.settings.filter.main_stats)) {
        settings.filter.main_stats[slot] = {...stats, ...pickMap(clean.settings.filter.main_stats[slot], isBoolean,
            key => Object.prototype.hasOwnProperty.call(stats, key))};
    }
    return {...clean, settings};
}

export function loadArtifactSuggestPreferences(storage) {
    try {
        const data = JSON.parse((storage || globalThis.localStorage)?.getItem(ARTIFACT_SUGGEST_PREFERENCES_KEY) || 'null');
        return isMap(data) && data.version === VERSION ? normalizeArtifactSuggestPreferences(data) : null;
    } catch (error) {
        return null;
    }
}

export function saveArtifactSuggestPreferences(preferences, storage) {
    try {
        const target = storage || globalThis.localStorage;
        if (!target) return false;
        target.setItem(ARTIFACT_SUGGEST_PREFERENCES_KEY, JSON.stringify({version: VERSION,
            ...normalizeArtifactSuggestPreferences(preferences)}));
        return true;
    } catch (error) {
        // Disabled storage/quota errors must not prevent editing or optimization.
        return false;
    }
}
