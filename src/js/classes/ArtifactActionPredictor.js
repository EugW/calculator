import { ArtifactsSuggest } from './ArtifactsSuggest';
import { artifactReshapeSources } from './ArtifactReshapeSources';
import { makeArtifactOptimizerSettings } from './ArtifactOptimizerSettings';
import { ACTION_SLOTS, ARTIFACT_ACTION_MODEL } from './ArtifactActionProbability';
import { normalizeArtifactRVFilters } from './ArtifactUsefulRV';
import { makeArtifactReshapeRecipes } from './ArtifactActionPrep';
import { ArtifactPrepPool } from './ArtifactPrepPool';
export { actionBlockDistributions } from './ArtifactActionProjection';
export { makeArtifactActionRecipes, makeArtifactReshapeRecipes, countArtifactActionOutcomes,
    iterateArtifactActionOutcomes, createArtifactActionAccumulator } from './ArtifactActionPrep';

/** Default to one candidate worker; explicit choices can use all logical cores. */
export function normalizePrepWorkers(value) {
    const parsed = parseInt(value, 10);
    const cores = globalThis.navigator?.hardwareConcurrency;
    const maximum = Number.isSafeInteger(cores) && cores > 0 ? cores : 1;
    return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : 1;
}

/**
 * Reshape/upgrade candidates that share a target slot and set search the same
 * companion pools with the same optimizer preparation, so they run as one
 * search group (one prepared suggester, one union, one fused search). Groups
 * keep candidate order. The largest groups are halved only while fewer groups
 * than prep workers exist, so extra workers still get work.
 */
export function groupArtifactActionTargets(targets, workers = 1) {
    const byKey = new Map();
    const groups = [];
    targets.forEach((target, index) => {
        const key = target.slot + '\u0001' + target.set;
        let group = byKey.get(key);
        if (!group) {
            group = {slot: target.slot, indices: []};
            byKey.set(key, group);
            groups.push(group);
        }
        group.indices.push(index);
    });
    while (groups.length < workers) {
        let largest = 0;
        groups.forEach((group, index) => {
            if (group.indices.length > groups[largest].indices.length) largest = index;
        });
        const group = groups[largest];
        if (group.indices.length < 2) break;
        const half = Math.ceil(group.indices.length / 2);
        groups.splice(largest + 1, 0, {slot: group.slot, indices: group.indices.slice(half)});
        group.indices = group.indices.slice(0, half);
    }
    return groups;
}

function bestCPUResult(suggester, results) {
    let best = {value: -Infinity};
    for (const result of results) {
        const value = suggester.evaluateArtifactCombination(result.artifacts);
        if (Number.isFinite(value) && value > best.value) best = {value, artifacts: result.artifacts};
    }
    return best;
}

/**
 * Exact craft/reshape/upgrade prediction. Every distinct outcome in a candidate's
 * union is searched exactly once by the fused forced-outcome engine, then
 * scattered into per-recipe accumulators by its probability masses. The
 * normal optimizer is used only for the baseline build. There is no sampling,
 * no reuse cache, and no coverage budget. There is no default outcome-count
 * cap; callers can opt into a post-dedup budget with maxUnionEntries.
 *
 * Upgrade candidates enumerate max-level variants with exact probabilities
 * conditional on current rolls and the documented history priors, deduplicating with
 * the same VOID outcome key as craft/reshape, so optimizer-invisible stat
 * differences never cost a fused search. Reshape/upgrade candidates sharing a
 * slot and set are searched together (groupArtifactActionTargets); every
 * candidate still gets its own row, statistics and gallery.
 *
 * Topology preservation is optional (default on in the UI): when enabled, the
 * outcome search only evaluates complements that preserve the baseline build's
 * set-bonus topology, plus (for craft) a 4-piece set of the crafted artifact
 * when that set is not part of the baseline topology.
 */
export async function evaluateArtifactActionPredictions(params) {
    const rvFilters = normalizeArtifactRVFilters(params.rvFilters);
    const inventory = params.inventory || [];
    const retainOutcomes = params.retainOutcomes === true;
    const outcomeInventory = inventory.slice();
    const inventoryIds = new Map(inventory.map((artifact, index) => [artifact, index]));
    const inventoryHashIds = new Map(inventory.map((artifact, index) => [artifact.getHash(), index]));
    const artifactId = artifact => {
        if (!artifact || artifact.isEmpty) return -1;
        let id = inventoryIds.get(artifact) ?? inventoryHashIds.get(artifact.getHash());
        // Equipped fallbacks can legitimately be outside the optimizer's
        // filtered inventory. Save them for baseline/loadout reconstruction
        // without putting them into any filtered search pool.
        if (id === undefined) {
            id = outcomeInventory.length;
            outcomeInventory.push(artifact);
            inventoryIds.set(artifact, id);
            inventoryHashIds.set(artifact.getHash(), id);
        }
        return id;
    };
    const rows = [];
    // One entry per searched candidate (craft: per slot), in candidate order.
    const targets = [];
    const reshaping = params.kind === 'reshape';
    const upgrading = params.kind === 'upgrade';
    const targeted = reshaping || upgrading;
    if (reshaping) {
        if (params.reshapeTargets !== undefined && !Array.isArray(params.reshapeTargets)) throw new Error('action_invalid_targets');
        const sources = artifactReshapeSources(params.reshapeTargets ?? params.baseBuild.getArtifacts(),
            params.reshapeTargets === undefined ? params.pairs : {});
        for (const source of sources) {
            const identity = {slot: source.slot, targetId: source.id};
            if (source.error) rows.push({...identity, error: source.error});
            else targets.push({...identity, set: source.artifact.set,
                recipes: makeArtifactReshapeRecipes(params, source.artifact, source.selectedSubstats)});
        }
    } else if (upgrading) {
        if (!Array.isArray(params.upgradeTargets)) throw new Error('action_invalid_upgrades');
        for (const candidate of params.upgradeTargets) {
            if (!candidate || typeof candidate.getSlot !== 'function' || typeof candidate.getHash !== 'function'
                || typeof candidate.getSet !== 'function' || typeof candidate.getMainStat !== 'function'
                || typeof candidate.getLevel !== 'function' || typeof candidate.getRarity !== 'function') {
                throw new Error('action_invalid_upgrades');
            }
            const slot = candidate.getSlot();
            targets.push({slot, set: candidate.getSet(), targetId: candidate.getHash(), candidate,
                recipes: [{kind: 'upgrade', slot, set: candidate.getSet(), mainStat: candidate.getMainStat(),
                    level: candidate.getLevel(), rarity: candidate.getRarity()}]});
        }
    } else {
        if (params.kind !== 'craft') throw new Error('Unknown artifact action');
        const craftSlots = params.craftSlots === undefined ? ACTION_SLOTS : params.craftSlots;
        if (!Array.isArray(craftSlots) || craftSlots.some(slot => !ACTION_SLOTS.includes(slot))) {
            throw new Error('action_invalid_slots');
        }
        for (const slot of craftSlots) targets.push({slot});
    }
    if (!targets.length) return {rows, rvFilters, model: ARTIFACT_ACTION_MODEL};
    const requestedWorkers = normalizePrepWorkers(params.prepWorkers);
    const groups = targeted ? groupArtifactActionTargets(targets, requestedWorkers)
        : targets.map((target, index) => ({slot: target.slot, indices: [index]}));
    const workerCount = Math.min(requestedWorkers, groups.length);
    let slotsCompleted = 0;
    const report = progress => params.onProgress?.({...progress, slotsCompleted, slotsTotal: targets.length, workerCount,
        ...(targeted ? {unit: 'artifacts'} : {})});
    const options = {build: params.baseBuild, featureName: params.feature, featureType: params.featureType || 'average',
        useGPU: params.useGPU === true, gpuBatchSize: params.gpuBatchSize, showBeta: params.showBeta, limit: 20};
    const baseline = new ArtifactsSuggest({...options, artifacts: inventory,
        settings: makeArtifactOptimizerSettings(params.baseBuild, inventory, params.optimizerSettings)});
    baseline.prepare();
    if (!params.useGPU && baseline.totalCombinations > 1000000) throw new Error('action_webgpu_required');
    const baselineProgress = (current, total) => report({key: 'baseline', phase: 'baseline', current, total});
    baselineProgress(0, baseline.totalCombinations);
    const baselineResults = params.useGPU ? await baseline.getResultGPU(baselineProgress) : baseline.getResult(baselineProgress);
    const baselineBest = bestCPUResult(baseline, baselineResults);
    const baseValue = baselineBest.value;
    if (!Number.isFinite(baseValue)) throw new Error('action_no_baseline');
    // Optional topology preservation: infer the baseline build's set-bonus
    // topology (4pc / 2pc+2pc / single 2pc). Craft additionally preserves a
    // 4-piece topology of the crafted set when it differs from the baseline's.
    const baselineTopology = params.pruneOutcomeSets ? inferBaselineTopology(baselineBest) : null;
    const topologySpecs = baselineTopology ? [baselineTopology] : [];
    if (params.pruneOutcomeSets && !reshaping && params.set && !(baselineTopology?.sets || []).includes(params.set)) {
        topologySpecs.push({kind: '4pc', sets: [params.set]});
    }
    // Give every worker the same immutable identity table. Equipped fallbacks
    // are registered before scheduling so completion order cannot change IDs.
    for (const slot of ACTION_SLOTS) {
        if (!inventory.some(artifact => artifact.slot === slot)) artifactId(params.baseBuild.getArtifacts()[slot]);
    }
    for (const artifact of baselineBest.artifacts) artifactId(artifact);
    const inventoryHashes = outcomeInventory.map(artifact => artifact.getHash());
    const serializedInventory = inventory.map(artifact => artifact.serialize());
    const serializedBuild = params.baseBuild.serialize();
    let stopped = false;
    const gpuRuns = new Set();
    const executeGPU = (request, onProgress) => {
        // Every ready candidate starts immediately on the shared device.
        // Each job owns its optimizer/buffers; track it only for failure cleanup.
        const run = (async () => {
            if (stopped) throw new Error('Artifact action prediction stopped');
            const optimizer = await baseline.createForcedOutcomeOptimizer();
            try {
                if (stopped) throw new Error('Artifact action prediction stopped');
                await optimizer.preparePipeline(request.program);
                if (stopped) throw new Error('Artifact action prediction stopped');
                return await optimizer.optimizeForcedOutcomes({packedInputs: request.inputs, rawReadback: true,
                    onProgress: (current, total) => onProgress({phase: 'search', current, total}),
                    onSetupProgress: () => onProgress({phase: 'upload'})});
            } finally { optimizer.destroy(); }
        })();
        gpuRuns.add(run);
        const finished = () => gpuRuns.delete(run);
        run.then(finished, finished);
        return run;
    };
    const pool = new ArtifactPrepPool({size: workerCount, workerFactory: params.prepWorkerFactory, executeGPU});
    const candidateRows = new Array(targets.length);
    // A group's progress applies to every member's candidate segment.
    const forward = (group, update) => {
        if (stopped) return;
        if (update.phase === 'slot_complete') slotsCompleted += group.indices.length;
        const [lead] = group.indices;
        report({...update, candidateIndex: lead, candidateIndices: group.indices, slot: group.slot,
            ...(targeted ? {targetId: targets[lead].targetId, targetIndex: lead + 1} : {})});
    };
    let nextGroup = 0;
    try {
        await Promise.all(Array.from({length: workerCount}, async () => {
            while (!stopped && nextGroup < groups.length) {
                const group = groups[nextGroup++];
                const members = targeted ? group.indices.map(index => {
                    const {targetId, candidate, recipes} = targets[index];
                    return {targetId, candidate: candidate?.serialize(),
                        recipes: recipes.map(recipe => recipe.artifact
                            ? {...recipe, artifact: recipe.artifact.serialize()} : recipe)};
                }) : undefined;
                const input = {kind: params.kind, set: params.set, feature: params.feature, featureType: params.featureType,
                    showBeta: params.showBeta, optimizerSettings: params.optimizerSettings, craftAffixes: params.craftAffixes,
                    fourLineChance: params.fourLineChance, maxUnionEntries: params.maxUnionEntries,
                    debugForced: params.debugForced, baseValue, rvFilters, topologySpecs, retainOutcomes,
                    build: serializedBuild, inventory: serializedInventory, inventoryHashes,
                    group: {slot: group.slot, ...(members ? {members} : {})}};
                const result = await pool.run({input, onProgress: update => forward(group, update)});
                group.indices.forEach((index, member) => { candidateRows[index] = result.rows[member]; });
            }
        }));
    } finally {
        stopped = true;
        pool.destroy();
        await Promise.allSettled([...gpuRuns]);
    }
    // Live progress follows completion order; result ties retain candidate order.
    rows.push(...candidateRows);
    rows.sort((a, b) => (b.absoluteGain ?? -Infinity) - (a.absoluteGain ?? -Infinity));
    const baselineArtifacts = retainOutcomes
        ? ACTION_SLOTS.map(slot => artifactId(baselineBest.artifacts.find(art => art?.slot === slot))) : null;
    return {rows, baseValue, rvFilters, model: ARTIFACT_ACTION_MODEL,
        ...(retainOutcomes ? {outcomeInventory: outcomeInventory.map(artifact => artifact.serialize()), baselineArtifacts} : {}),
        search: 'fused-gpu-forced-cpu-rescored', recipeSearch: 'all-eligible'};
}

/**
 * Baseline set-bonus topology: which sets contribute a 4pc or 2pc bonus.
 * Returns null when the build has no 2pc bonus at all (nothing to preserve).
 */
function inferBaselineTopology(best) {
    if (!Array.isArray(best?.artifacts)) return null;
    const counts = new Map();
    for (const artifact of best.artifacts) {
        if (!artifact) continue;
        const setName = artifact.getSetName ? artifact.getSetName() : artifact.set;
        counts.set(setName, (counts.get(setName) || 0) + 1);
    }
    const sorted = [...counts.entries()]
        .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])));
    if (sorted.length && sorted[0][1] >= 4) return {kind: '4pc', sets: [sorted[0][0]]};
    const pairs = sorted.filter(([, count]) => count >= 2).map(([setName]) => setName).slice(0, 2);
    if (pairs.length === 2) return {kind: '2+2', sets: pairs};
    if (pairs.length === 1) return {kind: '2pc', sets: pairs};
    return null;
}
