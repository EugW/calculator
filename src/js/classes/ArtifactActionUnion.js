import { isPercent } from './Stats';
import { getArtifactMaxLevel, visitMaxUpgradeVariants } from './ArtifactUpgradePredictor';
import { iterateProjectedArtifactActionValues, makeProjectedArtifact } from './ArtifactActionProjection';

const KEY_SEP = '\u0001';

/** Key exactly the prepared numerical inputs and target topology, not recipe/history.
 * usedStats is the optimizer's dependency closure, INCLUDING feasibility constraints.
 * Two vectors that differ only in VOID (unused) stats produce the same key.
 */
export function artifactActionOutcomeKey(artifact, usedStats) {
    const builder = createArtifactActionOutcomeKey(usedStats, {
        rarity: artifact.rarity, level: artifact.level,
    });
    return builder.key(artifact, artifact.subStats.map(sub => sub.stat), artifact.subStats.map(sub => sub.value));
}

/** Fast exact key builder for projected outcomes. Replicates
 * `Artifact#calcCache` + zero filtering + percent normalization without creating
 * a Stats object, sorting keys or JSON-encoding per incidence. Values are
 * accumulated in the same order and precision as `calcStats`, so equivalence
 * classes (and therefore union order) are identical to the artifact-based key.
 *
 * Main-stat contributions and the derived crit_value aggregate are applied for
 * every used stat, including stats that only arrive through the main stat.
 */
export function createArtifactActionOutcomeKey(usedStats, options = {}) {
    const rarity = options.rarity ?? 5;
    const level = options.level ?? 20;
    const stats = usedStats ? [...new Set(usedStats)].sort() : [];
    const percent = stats.map(isPercent);
    const index = new Map(stats.map((stat, at) => [stat, at]));
    const critRate = index.get('crit_rate');
    const critDmg = index.get('crit_dmg');
    const critValue = index.get('crit_value');
    const mainCache = new Map();
    const planCache = new WeakMap();
    const values = new Float64Array(stats.length);
    const groupPlan = outcomeStats => {
        let plan = planCache.get(outcomeStats);
        if (!plan) {
            plan = Int32Array.from(outcomeStats, stat => index.has(stat) ? index.get(stat) : -1);
            planCache.set(outcomeStats, plan);
        }
        return plan;
    };
    const mainPlan = mainStat => {
        let plan = mainCache.get(mainStat);
        if (!plan) {
            plan = {values: new Float64Array(stats.length), rate: 0, dmg: 0};
            const mainData = DB.Artifacts.Mainstats.get(mainStat);
            if (mainData) {
                const value = mainData.values[rarity - 1].getValue(level);
                const at = index.get(mainStat);
                if (at !== undefined) plan.values[at] = value;
                if (mainStat === 'crit_rate') plan.rate = value;
                if (mainStat === 'crit_dmg') plan.dmg = value;
            }
            mainCache.set(mainStat, plan);
        }
        return plan;
    };
    return {
        stats,
        key(action, outcomeStats, outcomeValues) {
            values.fill(0);
            const main = mainPlan(action.mainStat);
            let rate = main.rate;
            let dmg = main.dmg;
            for (let at = 0; at < stats.length; ++at) values[at] = main.values[at];
            const plan = groupPlan(outcomeStats);
            for (let at = 0; at < plan.length; ++at) {
                const stat = outcomeStats[at];
                const data = DB.Artifacts.Substats.get(stat);
                const value = data ? data.getPreciseValue(outcomeValues[at], rarity) : outcomeValues[at];
                if (plan[at] >= 0) values[plan[at]] += value;
                if (stat === 'crit_rate') rate += value;
                else if (stat === 'crit_dmg') dmg += value;
            }
            let key = action.slot + KEY_SEP + action.set + KEY_SEP + action.mainStat;
            for (let at = 0; at < stats.length; ++at) {
                const value = values[at];
                if (value === 0) continue;
                key += KEY_SEP + stats[at] + KEY_SEP + (percent[at] ? value / 100 : value);
            }
            if (critValue !== undefined) {
                const value = 2 * rate + dmg;
                if (value !== 0) key += KEY_SEP + 'crit_value' + KEY_SEP + value / 100;
            }
            return key;
        },
    };
}

/**
 * Exact per-candidate outcome union (OutcomeSpace) in compact recipe-major CSR.
 *
 * `entries` holds each distinct VOID-projected vector once, in the order the
 * engine searches them. Incidences are stored grouped by the recipe that
 * reaches them:
 *   recipeOffsets[r] .. recipeOffsets[r+1]      -> incidence slice of recipe r
 *   entryIndices[k]                             -> union entry reached
 *   probabilities[k]                            -> that recipe's exact mass
 *   threeLineProbabilities[k]                   -> the 3-line share
 * Incidences always equal the summed per-recipe projected states (the memory
 * identity), while `entries.length` is the true post-dedup outcome count.
 *
 * Optional `maxEntries` bounds the distinct post-dedup outcomes to search.
 * There is no default entry cap or pre-union cap: the union itself performs
 * deduplication, so recipes may overlap freely. Exceeding an explicit budget throws
 * `action_outcomes_too_large`; the predictor rethrows it with slot context.
 */
export function unionArtifactActionOutcomes(models, usedStats, options = {}) {
    const maxEntries = options.maxEntries ?? Number.MAX_SAFE_INTEGER;
    const onProgress = options.onProgress;
    const keyBuilder = createArtifactActionOutcomeKey(usedStats);
    const byKey = new Map();
    const entries = [];
    const recipeOffsets = [];
    const preallocated = options.incidenceCount !== undefined;
    let entryIndices = preallocated ? new Uint32Array(options.incidenceCount) : [];
    let probabilities = preallocated ? new Float64Array(options.incidenceCount) : [];
    let threeLineProbabilities = preallocated ? new Float64Array(options.incidenceCount) : [];
    let incidences = 0;
    const grow = array => {
        const next = new array.constructor(Math.max(1024, array.length * 2));
        next.set(array);
        return next;
    };
    const recipeCount = models.length;
    for (let recipeIndex = 0; recipeIndex < recipeCount; ++recipeIndex) {
        const model = models[recipeIndex];
        recipeOffsets.push(incidences);
        let acceptedMass = 0;
        for (const outcome of iterateProjectedArtifactActionValues(model)) {
            const key = keyBuilder.key(model.action, outcome.stats, outcome.values);
            let entryIndex = byKey.get(key);
            if (entryIndex === undefined) {
                if (entries.length >= maxEntries) {
                    throw new Error(['action_outcomes_too_large', entries.length + 1, maxEntries].join(';'));
                }
                entryIndex = entries.length;
                byKey.set(key, entryIndex);
                entries.push({artifact: makeProjectedArtifact(model.action, outcome.stats, outcome.values),
                    ...(options.retainKeys === false ? {} : {key})});
            }
            // The predictor already counted exact incidences. Allocate their
            // final typed storage once instead of retaining three growing JS
            // arrays alongside their final copies. A mismatched estimate can
            // grow; the allocation hint never limits enumeration.
            if (preallocated && incidences === entryIndices.length) {
                entryIndices = grow(entryIndices);
                probabilities = grow(probabilities);
                threeLineProbabilities = grow(threeLineProbabilities);
            }
            entryIndices[incidences] = entryIndex;
            probabilities[incidences] = outcome.probability;
            acceptedMass += outcome.probability;
            threeLineProbabilities[incidences] = outcome.initialProbabilities
                ? outcome.initialProbabilities[3]
                : (outcome.initialLines === 3 ? outcome.probability : 0);
            ++incidences;
            if (onProgress && (incidences & 8191) === 0) {
                onProgress(incidences, entries.length, recipeIndex);
            }
        }
        // Conditional distribution of this recipe's accepted subset. Scale the
        // joint start masses too, before either scoring or gallery collection.
        if (model.rvRange?.enabled && acceptedMass > 0) {
            for (let at = recipeOffsets[recipeIndex]; at < incidences; ++at) {
                probabilities[at] /= acceptedMass;
                threeLineProbabilities[at] /= acceptedMass;
            }
        }
    }
    recipeOffsets.push(incidences);
    if (onProgress) onProgress(incidences, entries.length, recipeCount - 1);
    return {
        entries,
        recipeCount,
        recipeOffsets: Uint32Array.from(recipeOffsets),
        entryIndices: preallocated ? entryIndices.subarray(0, incidences) : Uint32Array.from(entryIndices),
        probabilities: preallocated ? probabilities.subarray(0, incidences) : Float64Array.from(probabilities),
        threeLineProbabilities: preallocated ? threeLineProbabilities.subarray(0, incidences) : Float64Array.from(threeLineProbabilities),
    };
}

/**
 * Exact max-level upgrade variants of one candidate artifact, with
 * probabilities conditional on its current roll history.
 */
export function collectArtifactUpgradeVariants(candidate, acceptSubstats) {
    const variants = [];
    variants.assumptions = visitMaxUpgradeVariants(candidate, item => variants.push(item), acceptSubstats);
    return variants;
}

/**
 * Exact union of max-level upgrade variants for candidates that share a slot
 * and set, in the same recipe-major CSR as unionArtifactActionOutcomes: each
 * candidate is one recipe slice. Enumeration is stat-agnostic; deduplication
 * uses the shared VOID outcome key built with each candidate's own rarity and
 * max level, so variants that differ only in optimizer-invisible stats merge
 * into one entry (also across candidates) and are searched once.
 *
 * Entries keep a real variant artifact, and incidenceArtifacts keeps each
 * candidate's own variant for its gallery. With `conditional` (the outcome RV
 * filter) each candidate's accepted mass is renormalized to 1; otherwise it
 * must already be 1. Optional `maxEntries` bounds the distinct outcomes and
 * throws the same `action_outcomes_too_large` shape as the action union.
 */
export function unionArtifactUpgradeOutcomes(members, usedStats, options = {}) {
    const union = createArtifactUpgradeUnion(usedStats, options);
    for (const {candidate, variants} of members) union.add(candidate, variants);
    return union.finish();
}

/** Incremental form: add each candidate's variants, then drop them. Only
 * distinct entries and one incidence per (candidate, entry) are retained. */
export function createArtifactUpgradeUnion(usedStats, options = {}) {
    const maxEntries = options.maxEntries ?? Number.MAX_SAFE_INTEGER;
    const onProgress = options.onProgress;
    const byKey = new Map();
    const entries = [];
    const recipeOffsets = [];
    const entryIndices = [];
    const probabilities = [];
    const incidenceArtifacts = [];
    let states = 0;
    let processed = 0;
    const add = (candidate, variants) => {
        const action = {slot: candidate.getSlot(), set: candidate.getSet(), mainStat: candidate.getMainStat()};
        const keyBuilder = createArtifactActionOutcomeKey(usedStats,
            {rarity: candidate.getRarity(), level: getArtifactMaxLevel(candidate)});
        const start = entryIndices.length;
        recipeOffsets.push(start);
        // Distinct displayed variants can share one VOID key: sum them.
        const slice = new Map();
        let mass = 0;
        for (const {artifact: variant, probability} of variants) {
            ++states;
            if (!probability) continue;
            const key = keyBuilder.key(action,
                variant.subStats.map(sub => sub.stat), variant.subStats.map(sub => sub.value));
            let entryIndex = byKey.get(key);
            if (entryIndex === undefined) {
                if (entries.length >= maxEntries) {
                    throw new Error(['action_outcomes_too_large', entries.length + 1, maxEntries].join(';'));
                }
                entryIndex = entries.length;
                byKey.set(key, entryIndex);
                entries.push({artifact: variant, ...(options.retainKeys === false ? {} : {key})});
            }
            let at = slice.get(entryIndex);
            if (at === undefined) {
                at = entryIndices.length;
                slice.set(entryIndex, at);
                entryIndices.push(entryIndex);
                probabilities.push(0);
                incidenceArtifacts.push(variant);
            }
            probabilities[at] += probability;
            mass += probability;
            if ((++processed & 8191) === 0 && onProgress) onProgress(processed, entries.length);
        }
        if (options.conditional) {
            if (mass > 0) for (let at = start; at < probabilities.length; ++at) probabilities[at] /= mass;
        } else if (Math.abs(mass - 1) > 1e-9) {
            throw new Error(`Invalid upgrade probability mass: ${mass}`);
        }
    };
    const finish = () => {
        if (onProgress) onProgress(processed, entries.length);
        return {entries, recipeCount: recipeOffsets.length,
            recipeOffsets: Uint32Array.from([...recipeOffsets, entryIndices.length]),
            entryIndices: Uint32Array.from(entryIndices), probabilities: Float64Array.from(probabilities),
            threeLineProbabilities: new Float64Array(entryIndices.length), incidenceArtifacts, states};
    };
    return {add, finish};
}
