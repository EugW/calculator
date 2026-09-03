import { Artifact } from './Artifact';
import { ACTION_SLOTS, SUBSTAT_WEIGHTS } from './ArtifactActionProbability';

const STATS = Object.keys(SUBSTAT_WEIGHTS);
const WIDTH = 8; // score, probability, complement ID, stat mask, four displayed values
const CHUNK_SIZE = 4096;
const galleryStats = new WeakMap();

/** Gallery slider steps. Shared by the outcome gallery modal so rank mapping
 * stays in one place and unit-testable without JSX transforms.
 * AtLeast chances span orders of magnitude (best ~1e-6%, worst ~tens of %),
 * so a log-chance slider wastes most travel on the rare tail. The slider maps
 * linearly to gallery rank instead; the label still shows the true chance.
 */
export const GALLERY_SLIDER_STEPS = 200;

/** Gallery-driven [min, max] of the 'this or better' chance, for tick labels. */
export function outcomeChanceRange(details) {
    const length = details?.length || 0;
    if (length < 2 || !details.atLeastProbabilities) return null;
    const min = details.atLeastProbabilities[0];
    const max = details.atLeastProbabilities[length - 1];
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || !(max > min)) return null;
    return {min, max};
}

/** Slider position for a gallery rank. Rank 0 is the rarest best outcome. */
export function rankToSliderPos(rank, length, steps = GALLERY_SLIDER_STEPS) {
    if (!Number.isFinite(rank) || !Number.isFinite(length) || length < 2) return 0;
    const clamped = Math.max(0, Math.min(length - 1, Math.round(rank)));
    return Math.max(0, Math.min(steps, Math.round(clamped / (length - 1) * steps)));
}

/** Gallery rank for a slider position. Each step moves a similar card count. */
export function sliderPosToRank(pos, length, steps = GALLERY_SLIDER_STEPS) {
    if (!Number.isFinite(length) || length < 2) return 0;
    const clamped = Math.max(0, Math.min(steps, Number.isFinite(pos) ? pos : 0));
    return Math.max(0, Math.min(length - 1, Math.round(clamped / steps * (length - 1))));
}

/** Best (lowest) rank whose 'this or better' chance reaches the target. */
export function rankForChance(details, target) {
    let low = 0, high = details.length - 1, rank = high;
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (details.atLeastProbabilities[mid] >= target) { rank = mid; high = mid - 1; }
        else low = mid + 1;
    }
    return rank;
}

/** Read the union of displayed lines: craft recipes can have different extra stats.
 * Cache against the immutable gallery, without adding fields to worker results.
 */
export function artifactOutcomeStats(details, recipe) {
    if (!galleryStats.has(details)) {
        let mask = 0;
        for (let id = 0; id < details.length; ++id) {
            mask |= details.chunks[Math.floor(id / CHUNK_SIZE)][id % CHUNK_SIZE * WIDTH + 3];
        }
        galleryStats.set(details, STATS.filter((stat, index) => mask & (1 << index)));
    }
    return galleryStats.get(details).filter(stat => stat !== recipe.mainStat);
}

/** Exact displayed lines; blank/zero means absent, never a wildcard.
 * Search packed records directly so even large galleries need no Artifact copies.
 */
export function findArtifactActionOutcome(details, recipe, values) {
    const expected = STATS.map(stat => stat !== recipe.mainStat ? Number(values[stat] ?? 0) : 0);
    if (expected.some(value => !Number.isFinite(value) || value < 0)) return -1;
    const expectedMask = expected.reduce((mask, value, index) => value > 0 ? mask | (1 << index) : mask, 0);
    for (let rank = 0; rank < details.length; ++rank) {
        const id = details.order[rank];
        const data = details.chunks[Math.floor(id / CHUNK_SIZE)];
        const offset = id % CHUNK_SIZE * WIDTH;
        const mask = data[offset + 3];
        if (mask !== expectedMask) continue;
        let next = offset + 4;
        let matches = true;
        for (let index = 0; index < STATS.length; ++index) {
            if (!(mask & (1 << index))) continue;
            const value = data[next++];
            if (Math.abs(value - expected[index]) > 1e-8) {
                matches = false;
                break;
            }
        }
        if (matches) return rank;
    }
    return -1;
}

/** Positive improving outcomes only. Callers sum each recipe's incidences per
 * unique union vector before appending; complements are stored once and no
 * CalcSet/Artifact is retained per outcome.
 */
export class ArtifactActionOutcomeCollector {
    constructor({baseValue}) {
        this.baseValue = baseValue;
        this.chunks = [];
        this.length = 0;
        this.builds = [];
        this.buildIds = new Map();
    }

    add(outcome, best) {
        if (!Number.isFinite(best.value) || best.value - this.baseValue <= 1e-6) return;
        const subs = outcome.artifact.getSubStats();
        let mask = 0;
        const values = [];
        STATS.forEach((stat, index) => {
            const sub = subs.find(sub => sub.stat === stat);
            if (sub) { mask |= 1 << index; values.push(sub.value); }
        });
        const buildKey = best.complement.join('/');
        let build = this.buildIds.get(buildKey);
        if (build === undefined) {
            build = this.builds.length;
            this.buildIds.set(buildKey, build);
            // Callers may pass a view into the whole union's packed IDs.
            // Retain only these four IDs, not that view's entire backing store.
            this.builds.push(Array.from(best.complement));
        }
        if (this.length % CHUNK_SIZE === 0) {
            this.chunks.push(new Float64Array(CHUNK_SIZE * WIDTH));
        }
        const chunk = this.chunks[Math.floor(this.length / CHUNK_SIZE)];
        const offset = this.length % CHUNK_SIZE * WIDTH;
        chunk.set([best.value, outcome.probability, build, mask, ...values], offset);
        ++this.length;
    }

    discard() {
        this.chunks = [];
        this.length = 0;
        this.buildIds.clear();
        this.builds = [];
    }

    finish() {
        const order = Uint32Array.from({length: this.length}, (_, i) => i);
        const score = i => this.chunks[Math.floor(i / CHUNK_SIZE)][i % CHUNK_SIZE * WIDTH];
        order.sort((a, b) => score(b) - score(a) || a - b);
        const atLeastProbabilities = new Float64Array(this.length);
        let mass = 0, correction = 0;
        for (let start = 0; start < order.length;) {
            let end = start;
            do {
                const id = order[end];
                const weight = this.chunks[Math.floor(id / CHUNK_SIZE)][id % CHUNK_SIZE * WIDTH + 1];
                // Compensated summation preserves tiny PMF weights in large lists.
                const adjusted = weight - correction;
                const total = mass + adjusted;
                correction = (total - mass) - adjusted;
                mass = total;
                ++end;
            } while (end < order.length && score(order[end]) === score(order[start]));
            // Include the entire exact-score tie, even across page/chunk boundaries.
            atLeastProbabilities.fill(Math.min(1, mass), start, end);
            start = end;
        }
        this.buildIds.clear();
        return {chunks: this.chunks, order, atLeastProbabilities, builds: this.builds, length: this.length};
    }
}

export function readArtifactActionOutcome(details, recipe, rank) {
    if (!Number.isInteger(rank) || rank < 0 || rank >= details.length) return null;
    const id = details.order[rank];
    const data = details.chunks[Math.floor(id / CHUNK_SIZE)];
    const offset = id % CHUNK_SIZE * WIDTH;
    const substats = [];
    let next = offset + 4;
    STATS.forEach((stat, i) => {
        if (data[offset + 3] & (1 << i)) substats.push({stat, value: data[next++]});
    });
    // Upgrade rows carry their candidate rarity; craft/reshape projections are
    // always 5-star level-20 pieces, matching the historical default.
    const rarity = recipe.rarity ?? 5;
    const level = recipe.rarity ? DB.Artifacts.Rarity[rarity - 1].maxLevel : 20;
    return {rank, value: data[offset], probability: data[offset + 1],
        atLeastProbability: details.atLeastProbabilities[rank],
        complement: details.builds[data[offset + 2]],
        artifact: new Artifact(rarity, level, recipe.slot, recipe.set, recipe.mainStat, substats)};
}

export function artifactOutcomeLoadout(outcome, inventory) {
    let i = 0;
    return ACTION_SLOTS.map(slot => slot === outcome.artifact.slot ? outcome.artifact : inventory[outcome.complement[i++]]);
}

/** Transfer, rather than clone, the large packed buffers across the worker boundary. */
export function artifactOutcomeTransferables(result) {
    return result.rows.flatMap(row => row.outcomeDetails
        ? [...row.outcomeDetails.chunks.map(chunk => chunk.buffer), row.outcomeDetails.order.buffer,
            row.outcomeDetails.atLeastProbabilities.buffer] : []);
}
