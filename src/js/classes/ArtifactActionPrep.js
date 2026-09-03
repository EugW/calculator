import { CalcSet } from './CalcSet';
import { lowerGPUProgram } from './GPUOptimizerProgram';
import { getFusedOutcomeKernel } from './Feature2/WGSLFusedOutcome';
import { artifactCraftRecipeMatches, getArtifactCraftAffixes } from './ArtifactCraftAffixes';
import { getArtifactReshapeSelection } from './ArtifactReshapeSources';
import { makeArtifactOptimizerSettings } from './ArtifactOptimizerSettings';
import { ACTION_SLOTS, SUBSTAT_WEIGHTS, isUsedArtifactStat,
    hallowedExegesisTransition, substatPairs } from './ArtifactActionProbability';
import { getArtifactMaxLevel } from './ArtifactUpgradePredictor';
import { ARTIFACT_UPGRADE_MODEL } from './ArtifactUpgradeProbability';
import { ArtifactActionOutcomeCollector, artifactOutcomeTransferables } from './ArtifactActionOutcomes';
import { Artifact } from "./Artifact";
import { ArtifactsSuggest, buildFusedOutcomeSegments } from "./ArtifactsSuggest";
import {
    projectArtifactAction,
    countProjectedArtifactAction, iterateProjectedArtifactAction,
} from "./ArtifactActionProjection";
import {
    unionArtifactActionOutcomes,
    collectArtifactUpgradeVariants,
    createArtifactUpgradeUnion,
} from "./ArtifactActionUnion";
import { artifactMatchesRV, artifactSubstatsMatchRV } from "./ArtifactUsefulRV";

/**
 * Craft recipes are the legitimate in-game elixir inputs. Auto (empty) selectors
 * only expand to stats inside the optimizer's dependency closure, mirroring the
 * VOID projection: an Auto choice never proposes a stat the calculation ignores.
 * Explicit choices always win. If the useful set leaves no legal recipe (for
 * example only one useful substat exists), fall back to the full expansion so
 * the slot still reports options instead of silently disappearing.
 */
export function makeArtifactActionRecipes(params, slot, usedStats) {
    if (params.kind === 'craft') {
        const set = DB.Artifacts.Sets.get(params.set);
        if (!set || set.maxRarity !== 5 || !set.canEquipSlot(slot)) throw new Error('action_invalid_set');
        const selected = getArtifactCraftAffixes(slot, params.craftAffixes?.[slot]);
        const allMains = DB.Artifacts.Slots.get(slot).mainStats;
        const isStatUseful = usedStats ? stat => isUsedArtifactStat(usedStats, stat) : null;
        const mains = selected.mainStat.length || !isStatUseful ? allMains : allMains.filter(isStatUseful);
        const expand = (candidateMains, useful) => candidateMains.flatMap(mainStat =>
            substatPairs(Object.keys(SUBSTAT_WEIGHTS).filter(stat => stat !== mainStat))
                .filter(pair => artifactCraftRecipeMatches(selected, mainStat, pair, useful)).map(pair => ({
                kind: 'craft', slot, set: params.set, mainStat, pair, fourLineChance: params.fourLineChance ?? 0.34,
            })));
        const recipes = expand(mains, isStatUseful);
        return recipes.length || !isStatUseful ? recipes : expand(allMains, null);
    }
    if (params.kind !== 'reshape') throw new Error('Unknown artifact action');
    return makeArtifactReshapeRecipes(params, params.baseBuild.getArtifacts()[slot], params.pairs?.[slot]);
}

export function makeArtifactReshapeRecipes(params, artifact, selectedSubstats) {
    const {inputs, pairs} = getArtifactReshapeSelection(artifact, selectedSubstats);
    const slot = artifact.slot;
    const transition = hallowedExegesisTransition(params.points ?? 0, params.trigger ?? 0, slot);
    return pairs.map(pair => ({kind: 'reshape', slot, set: artifact.set, mainStat: artifact.mainStat,
        pair, artifact, ...transition, transition, lockedPair: !!inputs.lockedPair}));
}

export function countArtifactActionOutcomes(action, usedStats) {
    return countProjectedArtifactAction(projectArtifactAction(action, usedStats));
}

/** Exact objective-projected states, streamed, never inserted into storage. */
export function* iterateArtifactActionOutcomes(action, usedStats) {
    yield* iterateProjectedArtifactAction(projectArtifactAction(action, usedStats));
}

/** Exact per-recipe accumulator: probability-weighted realized gain, chance
 * to improve, and the 3-/4-line conditioned split. No sampling fields exist
 * because prediction is always exact. `rejected` marks outcomes whose GPU
 * winner failed the f64 rescore; they stay infeasible and are also reported
 * separately as rescoreRejectedChance.
 */
export function createArtifactActionAccumulator(baseValue) {
    if (!Number.isFinite(baseValue)) throw new RangeError('A feasible inventory baseline is required');
    const cases = {};
    let outcomes = 0;
    return {
        add(outcome, forced, rejected = false) {
            const gain = Number.isFinite(forced) ? Math.max(0, forced - baseValue) : 0;
            const starts = outcome.initialProbabilities || {[outcome.initialLines]: outcome.probability};
            for (const [start, p] of Object.entries(starts)) {
                if (!p) continue;
                const acc = cases[start] ||= {mass: 0, gain: 0, improve: 0, feasible: 0, forced: 0, rejected: 0};
                acc.mass += p;
                acc.gain += p * gain;
                if (gain > 1e-6) acc.improve += p;
                if (Number.isFinite(forced)) { acc.feasible += p; acc.forced += p * forced; }
                if (rejected) acc.rejected += p;
            }
            ++outcomes;
        },
        result() {
            const sum = Object.values(cases).reduce((sum, acc) => {
                for (const key of Object.keys(sum)) sum[key] += acc[key];
                return sum;
            }, {mass: 0, gain: 0, improve: 0, feasible: 0, forced: 0, rejected: 0});
            if (!(sum.mass > 0) || Math.abs(sum.mass - 1) > 1e-7) throw new Error(`Invalid artifact probability mass: ${sum.mass}`);
            const summarize = acc => ({
                absoluteGain: acc.gain / acc.mass,
                expectedValue: baseValue + acc.gain / acc.mass,
                score: baseValue ? acc.gain / acc.mass / Math.abs(baseValue) : 0,
                improveChance: Math.min(1, acc.improve / acc.mass),
                infeasibleChance: Math.max(0, 1 - acc.feasible / acc.mass),
                forcedExpectedValue: acc.feasible ? acc.forced / acc.feasible : null,
                rescoreRejectedChance: Math.min(1, acc.rejected / acc.mass),
            });
            return {...summarize(sum), baseValue, outcomes, probabilitySum: sum.mass,
                conditionedStarts: Object.fromEntries(Object.entries(cases).map(([start, acc]) => [start, summarize(acc)]))};
        },
    };
}

/**
 * One worker owns preparation, the GPU await, rescoring and gallery assembly
 * for one search group: a craft slot, or reshape/upgrade candidates that share
 * a target slot and set (`group.members`). Such candidates have the same
 * companion pools, and optimizer preparation reads only the target slot's
 * set, so the group shares one prepared suggester, one outcome union in which
 * every member's recipes are slices, and one fused GPU search. Returns one
 * row per member, in member order.
 */
export async function evaluateArtifactActionCandidate(input, {executeGPU, onProgress = () => {}}) {
    const params = {...input, baseBuild: CalcSet.deserialize(input.build)};
    const inventory = input.inventory.map(data => Artifact.deserialize(data));
    const {slot} = input.group;
    const members = (input.group.members || [input.group]).map(member => {
        const revived = revivePrepInput(member);
        return {targetId: member.targetId, candidate: revived.candidate,
            recipes: member.recipes ? revived.recipes : undefined};
    });
    const upgrading = params.kind === 'upgrade';
    const targeted = upgrading || params.kind === 'reshape';
    const {baseValue, rvFilters, topologySpecs, retainOutcomes} = input;
    const inventoryHashIds = new Map(input.inventoryHashes.map((hash, index) => [hash, index]));
    const inventoryIds = new Map(inventory.map((artifact, index) => [artifact, index]));
    const artifactId = artifact => {
        if (!artifact || artifact.isEmpty) return -1;
        const id = inventoryIds.get(artifact) ?? inventoryHashIds.get(artifact.getHash());
        if (id === undefined) throw new Error('Candidate companion is outside the inventory snapshot');
        return id;
    };
    const report = update => onProgress({...update, slot});
    const options = {build: params.baseBuild, featureName: params.feature, featureType: params.featureType || 'average',
        showBeta: params.showBeta, limit: 20};
    const noSearch = (member, error, upgradeError = false) => {
        const {artifact, ...description} = member.recipes?.[0] || {};
        return upgradeError ? {...member.recipes[0], targetId: member.targetId, error}
            : {...description, slot, ...(targeted ? {targetId: member.targetId} : {}), error,
                totalOutcomes: 0, optimizerEvaluations: 0};
    };
    const leader = members[0];
    const first = leader.recipes?.[0];
    const placeholder = upgrading
        ? new Artifact(leader.candidate.getRarity(), getArtifactMaxLevel(leader.candidate), slot,
            leader.candidate.getSet(), leader.candidate.getMainStat(), [])
        : new Artifact(5, 20, slot, first ? first.set : params.set,
            first ? first.mainStat : DB.Artifacts.Slots.get(slot).mainStats[0], []);
    const poolArtifacts = inventory.filter(artifact => artifact.slot !== slot).concat(placeholder);
    const suggester = new ArtifactsSuggest({...options, artifacts: poolArtifacts,
        settings: makeArtifactOptimizerSettings(params.baseBuild, poolArtifacts, params.optimizerSettings)});
    suggester.prepare();
    // Auto selectors need the prepared suggester's dependency closure, so
    // craft recipes are expanded after prepare() instead of at group build.
    for (const member of members) member.recipes ||= makeArtifactActionRecipes(params, slot, suggester.usedStats);
    if (rvFilters.companions.enabled) {
        for (const other of ACTION_SLOTS) if (other !== slot) {
            suggester.slots[other] = suggester.slots[other]
                .filter(artifact => artifactMatchesRV(artifact, suggester.usedStats, rvFilters.companions));
        }
        suggester.totalCombinations = ACTION_SLOTS.reduce((product, other) => product * suggester.slots[other].length, 1);
        if (!suggester.totalCombinations) {
            return {rows: members.map(member => noSearch(member, 'action_rv_no_companions'))};
        }
    }

    // Members that cannot be searched get their own error row; the rest share
    // the search. Upgrade variants join the union member by member and are
    // dropped at once, so a group never holds more than one variant list.
    const rows = new Array(members.length);
    const active = [];
    let upgradeStates = 0;
    const upgradeUnion = upgrading ? createArtifactUpgradeUnion(suggester.usedStats, {
        maxEntries: params.maxUnionEntries, retainKeys: false, conditional: rvFilters.outcomes.enabled,
        onProgress: (current, entries) => report({key: 'prepare', phase: 'prepare', slot, current,
            total: upgradeStates, entries, prepareCurrent: current, prepareTotal: upgradeStates,
            recipes: members.length, recipe: active.length + 1}),
    }) : null;
    members.forEach((member, index) => {
        const projected = projectSlotRecipes({upgrading, recipes: member.recipes, candidate: member.candidate,
            usedStats: suggester.usedStats, rvFilters, report, slot});
        if (projected.error) {
            rows[index] = noSearch(member, projected.error, true);
            return;
        }
        const states = projected.counts.reduce((sum, count) => sum + count, 0);
        if (rvFilters.outcomes.enabled && states === 0) {
            rows[index] = noSearch(member, 'action_rv_no_outcomes');
            return;
        }
        if (upgradeUnion) {
            upgradeStates += states;
            withUnionBudget(slot, members.length, () => upgradeUnion.add(member.candidate, projected.variants));
            projected.variants = null;
        }
        active.push({member, index, ...projected});
    });
    if (!active.length) return {rows};
    const recipes = active.flatMap(item => item.member.recipes);
    const counts = active.flatMap(item => item.counts);
    const totalStates = counts.reduce((sum, count) => sum + count, 0);
    const union = upgradeUnion ? upgradeUnion.finish() : buildSlotUnion({items: active,
        usedStats: suggester.usedStats, maxEntries: params.maxUnionEntries, report, slot,
        recipeCount: recipes.length, totalStates});
    for (const item of active) item.projections = null;
    const unionEntries = union.entries;
    const totalOutcomes = unionEntries.length;
    const planned = planSlotSearchSpace({slots: suggester.slots, slot, unionEntries, topologySpecs});
    const {outcomeArtifacts, segmentPlan, combinationsPerOutcome, coverageCombinations} = planned;
    const accumulators = recipes.map(() => createArtifactActionAccumulator(baseValue));
    const activeRecipe = index => union.recipeOffsets[index] < union.recipeOffsets[index + 1];
    // Values may be -Infinity for infeasible outcomes; the accumulator
    // treats those as zero realized gain.
    const bestByEntry = new Float64Array(totalOutcomes).fill(Number.NEGATIVE_INFINITY);
    const rejectedByEntry = new Uint8Array(totalOutcomes);
    const bestComplements = retainOutcomes ? new Int32Array(totalOutcomes * 4).fill(-1) : null;
    let optimizerEvaluations = 0;
    let lastReport = 0;
    let loweredTotal = totalOutcomes;
    const progress = (current, total) => {
        const now = Date.now();
        if (current !== 0 && current !== total && now - lastReport < 100) return;
        lastReport = now;
        report({key: 'search', phase: 'full', slot, current, total,
            combinationTotal: coverageCombinations, combinationsPerOutcome, cacheHits: 0, optimizerEvaluations,
            totalOutcomes, recipe: recipes.length, recipes: recipes.length, union: true,
            lowered: loweredTotal, loweredTotal,
            prepareCurrent: totalStates, prepareTotal: totalStates});
    };
    // Announce the run with an empty search slice: the bar stays 0/0
    // until the first real batch report (see onProgress below).
    progress(0, 0);
    // Fused outcome engine only: one complement-major GPU run for the whole
    // union, then f64 CPU rescore per winner. onOutcome consumes the final
    // rescored winners; it never launches a search per outcome. The pool
    // worker keeps all CPU state through the GPU await and rescore.
    const program = lowerGPUProgram(suggester.optimizationPlan, getFusedOutcomeKernel);
    const outcomeRows = packOutcomeRows(outcomeArtifacts, suggester.usedStats, program.statIndexMap, {onProgress: report});
    const forced = await suggester.getResultGPUForcedOutcomes(slot, outcomeArtifacts,
        {...(params.debugForced ? {debug: true} : {}), ...(topologySpecs.length ? {topology: topologySpecs} : {}),
            ...(segmentPlan ? {densePlan: segmentPlan} : {}),
            executeGPU, preparedProgram: program,
            preparedRows: {rows: outcomeRows, mapKeys: Object.keys(program.statIndexMap)},
            onOutcome: (entryIndex, value, complement, rejected) => {
                ++optimizerEvaluations;
                bestByEntry[entryIndex] = value;
                if (rejected) rejectedByEntry[entryIndex] = 1;
                if (complement && bestComplements) {
                    let axis = 0;
                    for (const other of ACTION_SLOTS) if (other !== slot) {
                        bestComplements[entryIndex * 4 + axis++] = artifactId(complement.find(art => art?.slot === other));
                    }
                }
            },
            // GPU-native units: the fused loop iterates companion builds
            // (complements), scoring all outcomes against each one. Pass
            // the engine counters through untouched — no rescaling into
            // pair-evaluations (C*K), which is a derived stat, not the
            // loop the bar tracks.
            onProgress: (completedComplements, totalComplements) => progress(completedComplements, totalComplements),
            onSetupProgress: (stage, current, total) => {
                if (stage === 'lower') loweredTotal = total;
                // Keyed only when counts exist: the bare upload event is
                // title-only and must not clobber the pinned lower slice.
                report({...(stage === 'lower' ? {key: 'lower'} : {}), phase: stage, slot, current, total,
                    lowered: stage === 'lower' ? current : loweredTotal, loweredTotal,
                    prepareCurrent: totalStates, prepareTotal: totalStates,
                    totalOutcomes, recipe: recipes.length, recipes: recipes.length});
            },
            onRescoreProgress: (current, total) => report({key: 'rescore', phase: 'rescore', slot, current, total,
                lowered: loweredTotal, loweredTotal, optimizerEvaluations,
                prepareCurrent: totalStates, prepareTotal: totalStates,
                totalOutcomes, recipe: recipes.length, recipes: recipes.length})});
    const forcedProfile = {
        complementCount: forced.complementCount,
        regions: forced.regions,
        optimizeMs: forced.profile?.stageMs?.totalOptimizeMs,
        tiles: forced.profile?.tiles,
        shards: forced.profile?.shards,
        batches: forced.profile?.batches,
        chunks: forced.profile?.chunks,
    };
    // Recipe-major scatter: each incidence knows its recipe and entry, so
    // one linear pass over the CSR arrays fills every accumulator with the
    // entry's searched value. Upgrade variants are max-level finals, so they
    // carry no 3-/4-line conditioning.
    for (let index = 0; index < recipes.length; ++index) {
        const accumulator = accumulators[index];
        for (let k = union.recipeOffsets[index]; k < union.recipeOffsets[index + 1]; ++k) {
            const entryIndex = union.entryIndices[k];
            const probability = union.probabilities[k];
            const p3 = union.threeLineProbabilities[k];
            accumulator.add({artifact: unionEntries[entryIndex].artifact, probability,
                initialProbabilities: upgrading ? {max: probability} : {3: p3, 4: Math.max(0, probability - p3)}},
            bestByEntry[entryIndex], rejectedByEntry[entryIndex] === 1);
        }
    }
    // Gallery build is a real synchronous stage over hundreds of thousands
    // of entries: report it explicitly instead of leaving the title on a
    // stale phase. Only each member's winning recipe gets a gallery; losing
    // recipes never allocate gallery rows or complement maps.
    const galleryTotal = retainOutcomes ? active.length : 0;
    const collectGallery = winningIndex => {
        const collector = new ArtifactActionOutcomeCollector({baseValue});
        const add = (entryIndex, probability, artifact = unionEntries[entryIndex].artifact) => collector.add(
            {artifact, probability},
            {value: bestByEntry[entryIndex], complement: bestComplements.subarray(entryIndex * 4, entryIndex * 4 + 4)});
        const from = union.recipeOffsets[winningIndex];
        const to = union.recipeOffsets[winningIndex + 1];
        if (upgrading) {
            // One slice per candidate, one incidence per entry: keep the
            // candidate's own variant for display.
            for (let k = from; k < to; ++k) add(union.entryIndices[k], union.probabilities[k], union.incidenceArtifacts[k]);
            return collector.finish();
        }
        // Preserve per-entry gallery merging (e.g. equal crit_value)
        // independently of the separate 3-/4-line statistical masses.
        const masses = new Float64Array(totalOutcomes);
        const touched = new Uint32Array(to - from);
        let touchedCount = 0;
        for (let k = from; k < to; ++k) {
            const entryIndex = union.entryIndices[k];
            const probability = union.probabilities[k];
            if (probability > 0) {
                if (masses[entryIndex] === 0) touched[touchedCount++] = entryIndex;
                masses[entryIndex] += probability;
            }
        }
        for (let k = 0; k < touchedCount; ++k) add(touched[k], masses[touched[k]]);
        return collector.finish();
    };
    if (galleryTotal) report({key: 'gallery', phase: 'gallery', slot, current: 0, total: galleryTotal});
    const seen = new Uint32Array(totalOutcomes);
    let recipeStart = 0;
    active.forEach((item, at) => {
        const memberRecipes = item.member.recipes;
        const indices = memberRecipes.map((_, offset) => recipeStart + offset).filter(activeRecipe);
        recipeStart += memberRecipes.length;
        if (!indices.length) {
            rows[item.index] = noSearch(item.member, 'action_rv_no_outcomes');
            return;
        }
        // Distinct union entries this member reaches: each was searched once.
        let memberOutcomes = 0;
        for (const index of indices) {
            for (let k = union.recipeOffsets[index]; k < union.recipeOffsets[index + 1]; ++k) {
                if (seen[union.entryIndices[k]] !== at + 1) {
                    seen[union.entryIndices[k]] = at + 1;
                    ++memberOutcomes;
                }
            }
        }
        const stats = new Map(indices.map(index => [index, accumulators[index].result()]));
        let winningIndex = indices[0];
        for (const index of indices) {
            const candidate = stats.get(index);
            const winner = stats.get(winningIndex);
            if (candidate.absoluteGain > winner.absoluteGain
                || (candidate.absoluteGain === winner.absoluteGain && candidate.improveChance > winner.improveChance)) {
                winningIndex = index;
            }
        }
        const alternatives = indices.map(index => {
            const {artifact, ...description} = recipes[index];
            return {...description, ...stats.get(index), enumeratedOutcomes: counts[index]};
        }).sort((a, b) => b.absoluteGain - a.absoluteGain || b.improveChance - a.improveChance);
        const outcomeDetails = retainOutcomes ? collectGallery(winningIndex) : null;
        if (retainOutcomes) report({key: 'gallery', phase: 'gallery', slot, current: at + 1, total: galleryTotal});
        rows[item.index] = {...alternatives[0], alternatives, recipesEvaluated: memberRecipes.length,
            ...(outcomeDetails ? {outcomeDetails} : {}),
            ...(targeted ? {targetId: item.member.targetId} : {}),
            ...(upgrading ? {upgradeAssumptions: item.upgradeAssumptions, upgradeModel: ARTIFACT_UPGRADE_MODEL} : {}),
            outcomeMode: 'exact', searchMode: 'exact',
            totalOutcomes: memberOutcomes, combinationsPerOutcome,
            coverageCombinations: (BigInt(combinationsPerOutcome) * BigInt(memberOutcomes)).toString(),
            optimizerEvaluations: memberOutcomes, cacheHits: 0,
            ...(params.debugForced ? {forcedDebug: forced.raw, forcedProfile} : {}),
            ...(topologySpecs.length ? {preservedTopology: topologySpecs.length === 1
                ? topologySpecs[0] : {kind: 'union', specs: topologySpecs}} : {}),
            combinationTotal: (BigInt(combinationsPerOutcome) * BigInt(memberOutcomes)).toString()};
    });
    return {rows, completedWork: {totalOutcomes, combinationsPerOutcome, combinationTotal: coverageCombinations,
        optimizerEvaluations, cacheHits: 0, recipe: recipes.length, recipes: recipes.length,
        prepareCurrent: totalStates, prepareTotal: totalStates}};
}

/**
 * Revive worker job inputs: recipes whose `artifact` (reshape source) and
 * the upgrade `candidate` travel serialized (deserialize() shifts its
 * input, so copies are taken). Craft recipes are already plain data.
 * The scheduler ALWAYS serializes these, even for inline execution, so
 * every run proves transfer-shape serializability.
 */
export function revivePrepInput({recipes, candidate}) {
    const liveRecipes = (recipes || []).map(recipe => {
        if (recipe && Array.isArray(recipe.artifact)) {
            return {...recipe, artifact: Artifact.deserialize([...recipe.artifact])};
        }
        return recipe;
    });
    const liveCandidate = Array.isArray(candidate) ? Artifact.deserialize([...candidate]) : candidate;
    return {recipes: liveRecipes, candidate: liveCandidate};
}

/**
 * Pack lowered outcome rows for the GPU with the exact calcOptimizerStats
 * lowering, shared by the candidate worker and the pool inline fallback.
 * Does not retain artifact caches.
 */
export function packOutcomeRows(outcomeArtifacts, usedStats, statIndexMap, {onProgress} = {}) {
    const statCount = Object.keys(statIndexMap).length;
    const rows = new Float32Array(outcomeArtifacts.length * statCount);
    const lower = Artifact.createOptimizerStatsLowering(usedStats);
    for (let i = 0; i < outcomeArtifacts.length; ++i) {
        const {keys, values, length} = lower(outcomeArtifacts[i]);
        for (let at = 0; at < length; ++at) {
            const index = statIndexMap[keys[at]];
            if (index !== undefined) rows[i * statCount + index] = values[at];
        }
        if (onProgress && ((i + 1) & 8191) === 0) {
            onProgress({key: 'lower', phase: 'lower', current: i + 1, total: outcomeArtifacts.length});
        }
    }
    if (onProgress) onProgress({key: 'lower', phase: 'lower', current: outcomeArtifacts.length, total: outcomeArtifacts.length});
    return rows;
}

/**
 * Project one member's recipes (craft/reshape) or enumerate its upgrade
 * variants. Emits the same title-only count reports as the inline loop.
 * Upgrade validation failures return {error} for the caller to route
 * through its noSearch path.
 */
export function projectSlotRecipes({upgrading, recipes, candidate, usedStats, rvFilters, report, slot}) {
    const counts = [];
    const projections = [];
    let variants = null;
    let upgradeAssumptions;
    if (upgrading) {
        // Upgrade enumeration is stat-agnostic: weighted roll identities
        // and conditional allocations. VOID projection happens in the
        // union, so the count phase reports raw exact-distinct variants.
        try {
            variants = collectArtifactUpgradeVariants(candidate, rvFilters.outcomes.enabled
                ? subStats => artifactSubstatsMatchRV(subStats, candidate.rarity, usedStats, rvFilters.outcomes)
                : undefined);
            upgradeAssumptions = variants.assumptions;
        } catch (error) {
            if (!String(error.message).startsWith('action_upgrade_')) throw error;
            return {error: error.message, counts, projections, variants: null, upgradeAssumptions: undefined};
        }
        counts.push(variants.length);
        // Title-only: recipe counting is instant next to union
        // deduplication; no bar, no counters.
        report({phase: 'count', slot, recipes: recipes.length, recipe: 1});
    } else for (let index = 0; index < recipes.length; ++index) {
        const projection = projectArtifactAction(recipes[index], usedStats, undefined, rvFilters.outcomes);
        projections.push(projection);
        counts.push(countProjectedArtifactAction(projection));
        if (index % 10 === 0 || index + 1 === recipes.length) {
            report({phase: 'count', slot, recipes: recipes.length, recipe: index + 1});
        }
    }
    return {counts, projections, variants, upgradeAssumptions};
}

/** Rethrow an explicit union budget failure in its machine-readable
 * action_outcomes_too_large;slot;entries;limit;recipes form. */
function withUnionBudget(slot, recipeCount, build) {
    try {
        return build();
    } catch (error) {
        if (String(error?.message).startsWith('action_outcomes_too_large')) {
            const [, entries, entryLimit] = String(error.message).split(';');
            throw new Error(['action_outcomes_too_large', slot, entries, entryLimit, recipeCount].join(';'));
        }
        throw error;
    }
}

/**
 * Build one deduplicated union over every active member's projected
 * craft/reshape recipes, in recipe order.
 */
export function buildSlotUnion({items, usedStats, maxEntries, report, slot, recipeCount, totalStates}) {
    // Preparation stage: the union walks every projected state of every
    // recipe on this thread. Report incidence progress so the long
    // deduplication wait is visible before the search starts.
    report({key: 'prepare', phase: 'prepare', slot, current: 0, total: totalStates, entries: 0,
        prepareCurrent: 0, prepareTotal: totalStates, recipes: recipeCount, recipe: 0});
    const prepareProgress = (current, entries, recipe = 0) => report({key: 'prepare', phase: 'prepare', slot,
        current, total: totalStates, entries, prepareCurrent: current, prepareTotal: totalStates,
        recipes: recipeCount, recipe: recipe + 1});
    // An explicit budget applies to the exact post-dedup union. The union
    // stays single-threaded: every generated state is keyed and deduped on
    // the fly into one map, so no duplicate outcome vector is ever stored.
    return withUnionBudget(slot, recipeCount, () => unionArtifactActionOutcomes(items.flatMap(item => item.projections),
        usedStats, {maxEntries, retainKeys: false, incidenceCount: totalStates, onProgress: prepareProgress}));
}

/**
 * Searched (post-pruning) complement space from the same segment plan the
 * engine will run: without topology the full Cartesian product, with
 * topology only the preserved regions.
 */
export function planSlotSearchSpace({slots, slot, unionEntries, topologySpecs}) {
    const outcomeArtifacts = unionEntries.map(entry => entry.artifact);
    const segmentPlan = outcomeArtifacts.length
        ? buildFusedOutcomeSegments(slots, slot, outcomeArtifacts,
            topologySpecs.length ? topologySpecs : undefined)
        : null;
    const combinationsPerOutcome = segmentPlan ? segmentPlan.validCount : 0;
    const coverageCombinations = (BigInt(combinationsPerOutcome) * BigInt(unionEntries.length)).toString();
    return {outcomeArtifacts, segmentPlan, combinationsPerOutcome, coverageCombinations};
}

/** The same candidate protocol is used by the browser worker and transport tests. */
export function createArtifactCandidateHandler(send) {
    let active = null;
    return async ({data}) => {
        if (data?.type !== 'CANDIDATE') {
            if (!active || data?.jobId !== active.jobId || !active.gpu) return;
            if (data.type === 'GPU_PROGRESS') active.gpu.onProgress?.(data.update);
            else if (data.type === 'GPU_RESULT') active.gpu.resolve(data.result);
            else if (data.type === 'GPU_ERROR') active.gpu.reject(new Error(data.message));
            return;
        }
        const {jobId, input} = data;
        if (active) {
            send({type: 'ERROR', jobId, message: 'Candidate worker is already busy'});
            return;
        }
        const job = active = {jobId, gpu: null};
        try {
            const result = await evaluateArtifactActionCandidate(input, {
                onProgress: update => send({type: 'PROGRESS', jobId, update}),
                executeGPU: (request, onProgress) => new Promise((resolve, reject) => {
                    job.gpu = {resolve, reject, onProgress};
                    const transfer = Object.values(request.inputs).filter(ArrayBuffer.isView).map(view => view.buffer);
                    send({type: 'GPU_REQUEST', jobId, request}, transfer);
                }),
            });
            active = null;
            send({type: 'DONE', jobId, result}, artifactOutcomeTransferables(result));
        } catch (error) {
            active = null;
            send({type: 'ERROR', jobId, message: error?.message || String(error)});
        }
    };
}
