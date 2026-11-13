import { normalizeSetConstraintThresholds } from "./OptimizerConstraints";

/**
 * Convert the Best Artifact tab's raw settings model into the canonical
 * fragment consumed by ArtifactsSuggest. Inventory filters are applied by the
 * UI before this point; this helper is deliberately concerned only with
 * feasibility constraints. Set effects are not settings of a search: they
 * read the member's set-bonus profile (ArtifactSetProfile).
 *
 * The legacy UI describes required sets as two 2-piece selections and disabled
 * set bonuses as `${setName}-${pieces}` toggles. Canonical callers may instead
 * provide setMinValues/setMaxValues directly. Presence of the corresponding
 * legacy field wins, matching WorkerFactorySuggestArtifacts' historical reset
 * and rebuild behavior.
 */
export function normalizeArtifactOptimizerSettings(rawSettings) {
    let settings = rawSettings == null ? {} : rawSettings;
    assertSettingsMap(settings, 'Artifact optimizer settings');

    let setMinValues = hasOwn(settings, 'required_sets')
        ? makeRequiredSetMinimums(settings.required_sets)
        : cloneSettingsMap(settings.setMinValues, 'Artifact optimizer set minimums');
    let setMaxValues = hasOwn(settings, 'sets')
        ? makeDisabledSetMaximums(settings.sets)
        : cloneSettingsMap(settings.setMaxValues, 'Artifact optimizer set maximums');
    let normalizedSets = normalizeSetConstraintThresholds(setMinValues, setMaxValues);

    return {
        stats: cloneSettingsMap(settings.stats, 'Artifact optimizer stat constraints'),
        setMinValues: normalizedSets.minValues,
        setMaxValues: normalizedSets.maxValues,
    };
}

function makeRequiredSetMinimums(rawRequiredSets) {

    let requiredSets = rawRequiredSets == null ? {} : rawRequiredSets;
    assertSettingsMap(requiredSets, 'Artifact optimizer required sets');

    let result = {};
    for (let setName of [requiredSets.set1, requiredSets.set2]) {
        if (!setName) {
            continue;
        }
        result[setName] = (result[setName] || 0) + 2;
    }
    return result;
}

function makeDisabledSetMaximums(rawSetToggles) {
    let setToggles = rawSetToggles == null ? {} : rawSetToggles;
    assertSettingsMap(setToggles, 'Artifact optimizer set toggles');

    let result = {};
    for (let [id, enabled] of Object.entries(setToggles)) {
        if (enabled) {
            continue;
        }

        let match = /^(.*)-(\d+)$/.exec(id);
        if (!match || !match[1]) {
            throw new RangeError(`Invalid artifact optimizer set toggle "${id}"`);
        }

        let setName = match[1];
        let pieces = Number(match[2]);
        if (!hasOwn(result, setName) || pieces < result[setName]) {
            result[setName] = pieces;
        }
    }
    return result;
}

function cloneSettingsMap(value, label) {
    if (value == null) {
        return {};
    }
    assertSettingsMap(value, label);
    return Object.assign({}, value);
}

function assertSettingsMap(value, label) {
    if (typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object`);
    }
}

function hasOwn(value, name) {
    return Object.prototype.hasOwnProperty.call(value, name);
}

/**
 * The Best Artifact tab's constraints for a search it does not run itself
 * (Craft, Reshape, Upgrade).
 *
 * @param {Object} [rawOptimizerSettings] the tab's settings
 * @returns {Object} canonical constraints (normalizeArtifactOptimizerSettings)
 */
export function makeArtifactOptimizerSettings(rawOptimizerSettings) {
    return normalizeArtifactOptimizerSettings(rawOptimizerSettings);
}
