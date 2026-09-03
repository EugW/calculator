import { Artifact } from './Artifact';
import { actionProbabilityBlocks, blockRollDistributions, countBlockOutcomes, isUsedArtifactStat } from './ArtifactActionProbability';
import { artifactSubstatRV, normalizeArtifactRVRange } from './ArtifactUsefulRV';

/** Merge rolls only after applying the same display rounding as real artifacts. */
export function actionBlockDistributions(block, usedStats) {
    return blockRollDistributions(block, usedStats).map((distribution, index) => {
        const scale = DB.Artifacts.Substats.get(block.stats[index]).type === 'percent' ? 10 : 1;
        const values = new Map();
        for (const item of distribution) {
            const value = Math.round((item.units / 100 + 1e-8) * scale) / scale;
            values.set(value, (values.get(value) || 0) + item.probability);
        }
        return Array.from(values, ([value, probability]) => ({value, probability})).sort((a, b) => a.value - b.value);
    });
}

/** Marginalize VOID identities/allocations BEFORE expanding roll-quality products.
 * Original blocks still decide weighted identity draws and selected-row guarantees.
 * Only then can irrelevant rows disappear, with their probability summed, not lost.
 * Memory depends on compact roll-count blocks, never the number of final pieces.
 */
export function projectArtifactAction(action, usedStats, source = actionProbabilityBlocks(action), rvRange) {
    const range = normalizeArtifactRVRange(rvRange);
    const scalarCache = new Map();
    const groups = new Map();
    let sourceOutcomes = 0;
    for (const block of source) {
        const dimensions = [];
        for (let index = 0; index < block.stats.length; ++index) {
            const stat = block.stats[index];
            if (!isUsedArtifactStat(usedStats, stat)) continue;
            const count = block.counts[index] + (block.freshBases ? 1 : 0);
            const base = block.baseValues[stat] || 0;
            const key = `${stat}/${count}/${base}`;
            if (!scalarCache.has(key)) {
                scalarCache.set(key, actionBlockDistributions({stats: [stat], counts: [block.counts[index]],
                    freshBases: block.freshBases, baseValues: block.baseValues})[0]);
            }
            dimensions.push({stat, key, values: scalarCache.get(key)});
        }
        dimensions.sort((a, b) => a.stat.localeCompare(b.stat));
        sourceOutcomes += countBlockOutcomes(dimensions.map(dimension => dimension.values));
        const support = dimensions.map(dimension => dimension.stat).join('/');
        if (!groups.has(support)) groups.set(support, {stats: dimensions.map(dimension => dimension.stat), blocks: new Map()});
        const group = groups.get(support);
        const key = dimensions.map(dimension => dimension.key).join('|');
        if (!group.blocks.has(key)) group.blocks.set(key, {
            distributions: dimensions.map(dimension => dimension.values), initialProbabilities: {3: 0, 4: 0},
        });
        group.blocks.get(key).initialProbabilities[block.initialLines] += block.probability;
    }
    return {action, sourceOutcomes, sourceBlocks: source.length, ...(range.enabled ? {rvRange: range} : {}),
        groups: Array.from(groups.values(), group => ({...group, blocks: Array.from(group.blocks.values())}))};
}

// Conservative suffix bounds prune rejected branches without adding VOID back.
function groupRVBounds(stats, blocks, range) {
    if (!range?.enabled) return null;
    const min = new Array(stats.length + 1).fill(0), max = min.slice();
    for (let depth = stats.length - 1; depth >= 0; --depth) {
        let low = Infinity, high = 0;
        for (const block of blocks) for (const {value} of block.distributions[depth]) {
            const rv = artifactSubstatRV(stats[depth], value);
            low = Math.min(low, rv);
            high = Math.max(high, rv);
        }
        min[depth] = min[depth + 1] + low;
        max[depth] = max[depth + 1] + high;
    }
    return {min, max, allows: (depth, rv) => rv + min[depth] <= (range.max ?? Infinity)
        && rv + max[depth] >= (range.min ?? 0)};
}

/** Count a union of Cartesian products without visiting every final vector.
 * Values admitting the same remaining blocks share a memoized suffix count.
 * Useful rows always have positive bases, so different stat supports are disjoint.
 */
export function countProjectedArtifactAction(model) {
    let total = 0;
    for (const {stats, blocks} of model.groups) {
        const memo = new Map();
        const bounds = groupRVBounds(stats, blocks, model.rvRange);
        const count = (depth, ids, rv = 0) => {
            if (bounds && !bounds.allows(depth, rv)) return 0;
            if (depth === stats.length) return 1;
            if (ids.length === 1 && !bounds) return countBlockOutcomes(blocks[ids[0]].distributions.slice(depth));
            const key = `${depth}/${ids.join(',')}/${rv}`;
            if (memo.has(key)) return memo.get(key);
            const byValue = new Map();
            for (const id of ids) for (const {value} of blocks[id].distributions[depth]) {
                if (!byValue.has(value)) byValue.set(value, []);
                byValue.get(value).push(id);
            }
            const suffixes = new Map();
            for (const [value, child] of byValue) {
                const nextRV = bounds ? rv + artifactSubstatRV(stats[depth], value) : 0;
                const signature = child.join(',') + '/' + nextRV;
                if (!suffixes.has(signature)) suffixes.set(signature, {ids: child, multiplicity: 0, rv: nextRV});
                ++suffixes.get(signature).multiplicity;
            }
            let result = 0;
            for (const suffix of suffixes.values()) result += suffix.multiplicity * count(depth + 1, suffix.ids, suffix.rv);
            // Eviction repeats counting only; it cannot change the exact support.
            if (memo.size >= 50000) memo.clear();
            memo.set(key, result);
            return result;
        };
        total += count(0, blocks.map((block, index) => index));
    }
    return total;
}

function makeArtifact(action, stats, values) {
    return new Artifact(5, 20, action.slot, action.set, action.mainStat,
        stats.map((stat, index) => ({stat, value: values[index]})));
}

/** Projected outcome artifacts are always 5-star level-20 action pieces. */
export function makeProjectedArtifact(action, stats, values) {
    return makeArtifact(action, stats, values);
}

/** Raw projected leaves without artifacts: duplicates can be keyed and discarded
 * before anything is constructed. Artifacts are only needed for union entries.
 */
export function* iterateProjectedArtifactActionValues(model) {
    for (const {stats, blocks} of model.groups) {
        const bounds = groupRVBounds(stats, blocks, model.rvRange);
        function* visit(depth, entries, values, rv = 0) {
            if (bounds && !bounds.allows(depth, rv)) return;
            if (depth === stats.length) {
                const initialProbabilities = {3: 0, 4: 0};
                for (const {block, weight} of entries) for (const start of [3, 4]) {
                    initialProbabilities[start] += weight * block.initialProbabilities[start];
                }
                yield {stats, values, initialProbabilities,
                    initialLines: !initialProbabilities[3] ? 4 : !initialProbabilities[4] ? 3 : undefined,
                    probability: initialProbabilities[3] + initialProbabilities[4]};
                return;
            }
            const children = new Map();
            for (const {block, weight} of entries) for (const {value, probability} of block.distributions[depth]) {
                if (!children.has(value)) children.set(value, []);
                children.get(value).push({block, weight: weight * probability});
            }
            for (const [value, child] of children) yield* visit(depth + 1, child, values.concat(value),
                bounds ? rv + artifactSubstatRV(stats[depth], value) : 0);
        }
        yield* visit(0, blocks.map(block => ({block, weight: 1})), []);
    }
}

/** A sparse probability trie: overlapping products share prefixes and each leaf
 * is yielded once. No full-PMF map or inventory of hypothetical artifacts exists.
 * Joint start masses let one piece represent both 3- and 4-line histories safely.
 */
export function* iterateProjectedArtifactAction(model) {
    for (const outcome of iterateProjectedArtifactActionValues(model)) {
        yield {artifact: makeArtifact(model.action, outcome.stats, outcome.values),
            initialProbabilities: outcome.initialProbabilities,
            initialLines: outcome.initialLines,
            probability: outcome.probability};
    }
}
