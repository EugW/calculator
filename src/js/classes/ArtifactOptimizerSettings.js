import { normalizeSetConstraintThresholds } from "./OptimizerConstraints";
import { Condition } from "./Condition";

/**
 * Convert the Best Artifact tab's raw settings model into the canonical
 * fragment consumed by ArtifactsSuggest. Inventory filters are applied by the
 * UI before this point; this helper is deliberately concerned only with
 * optimizer conditions and feasibility constraints.
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
        sets_settings: cloneSettingsMap(
            settings.sets_settings,
            'Artifact optimizer set condition settings'
        ),
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
 * Derive safe condition defaults for every reachable set, then optionally
 * overlay the live Best Artifact optimizer settings. This retains current
 * build choices for settings absent from that tab while making its explicit
 * condition and feasibility selections authoritative.
 */
export function makeArtifactOptimizerSettings(baseBuild, artifacts, rawOptimizerSettings) {
    if (!baseBuild || !baseBuild.artifacts) {
        throw new TypeError('A base build is required to derive artifact optimizer settings');
    }

    let setSlots = {};
    for (let artifact of mergeArtifactInventory(artifacts || [], getEquippedArtifacts(baseBuild))) {
        let setName = artifact.getSet();
        setSlots[setName] ||= new Set();
        setSlots[setName].add(artifact.getSlot());
    }

    let conditions = [];
    for (let [setName, slots] of Object.entries(setSlots)) {
        let set = DB.Artifacts.Sets.get(setName);
        if (!set) {
            continue;
        }

        let byPieces = set.getConditionsByPieces();
        for (let pieces = 1; pieces <= slots.size; ++pieces) {
            for (let condition of byPieces[pieces] || []) {
                if (condition && condition.isSerializable()) {
                    conditions.push(condition);
                }
            }
        }
    }

    // Piece counters are derived from the equipped artifacts by
    // CalcObjectArtifacts#getSettings(). They must be recomputed for every
    // explicit tuple; carrying the old counters into the cleared optimizer
    // build can leave a set-gated post-effect active after that set is swapped
    // away. Preserve only actual user condition selections here.
    let buildSettings = withoutDerivedArtifactSetCounts(baseBuild.getSettings());
    let artifactSettings = withoutDerivedArtifactSetCounts(baseBuild.artifacts.getSettings());
    let setSettings = Condition.allConditionsOn(conditions, buildSettings);
    Object.assign(setSettings, artifactSettings);
    let optimizerSettings = normalizeArtifactOptimizerSettings(rawOptimizerSettings);
    Object.assign(setSettings, optimizerSettings.sets_settings);

    return Object.assign({}, optimizerSettings, {
        sets_settings: setSettings,
    });
}

function withoutDerivedArtifactSetCounts(settings) {
    return Object.fromEntries(Object.entries(settings || {}).filter(([name]) => {
        return !name.startsWith('set_pieces.');
    }));
}

function mergeArtifactInventory(...lists) {
    let result = [];
    let used = new Set();

    for (let artifacts of lists) {
        for (let artifact of artifacts || []) {
            if (!artifact || typeof artifact.getHash !== 'function') {
                continue;
            }

            let key = `${artifact.getSlot()}:${artifact.getHash()}`;
            if (used.has(key)) {
                continue;
            }
            used.add(key);
            result.push(artifact);
        }
    }

    return result;
}

function getEquippedArtifacts(build) {
    if (!build || typeof build.getArtifacts !== 'function') {
        return [];
    }

    return Object.values(build.getArtifacts()).filter(Boolean);
}
