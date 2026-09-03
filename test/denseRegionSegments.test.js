import { DB } from '../src/js/db/DB';
import {
    buildFusedOutcomeSegments,
    decodeDenseComplement,
    resolveDenseRows,
} from '../src/js/classes/ArtifactsSuggest';
import { GPU_SLOT_NAMES, GPUOptimizerInputs } from '../src/js/classes/GPUOptimizerInputs';
import { decodeFusedOutcomeComplement, buildDenseFusedParams } from '../src/js/classes/GPUForcedOutcomeOptimizer';
import { walkLogicalRegions } from './support/gpuNode';

global.DB = DB;

const piece = (setName) => ({
    getSet: () => setName,
    getSetName: () => setName,
});
const makeSlots = (poolsByAxis, targetSet = 'T') => Object.assign({
    goblet: [piece(targetSet)],
}, poolsByAxis);

const signature = (picks) => picks.map((artifact) => artifact.getSetName()).join('/');

function denseSignatures(plan, artifactRefs) {
    const result = [];
    for (let c = 0; c < plan.validCount; ++c) {
        result.push(signature(decodeDenseComplement(c, plan, artifactRefs)));
    }
    return result;
}

function oracleSignatures(slots, target, outcomes, topology) {
    const result = [];
    walkLogicalRegions(slots, target, outcomes, topology, (picks) => {
        result.push(signature(picks));
    });
    return result;
}

function refsOf(plan) {
    return GPU_SLOT_NAMES.flatMap((slot) => plan.packedSlots[slot]);
}

test('dense plan packs 4pc regions into one exact index space', () => {
    const slots = makeSlots({
        flower: [piece('T'), piece('X')],
        plume: [piece('T'), piece('X')],
        sands: [piece('T'), piece('X')],
        circlet: [piece('T'), piece('X')],
    });
    const outcomes = [piece('T')];
    const plan = buildFusedOutcomeSegments(slots, 'goblet', outcomes, {kind: '4pc', sets: ['T']});
    expect(plan.regions).toHaveLength(5);
    expect(plan.validCount).toBe(5);
    expect(plan.validCount).toBe(plan.logical.reduce((total, region) => total + region.size, 0));
    const ends = plan.regions.map((region) => region.end);
    expect([...ends].sort((a, b) => a - b)).toEqual(ends);
    expect(ends.at(-1)).toBe(plan.validCount);
    resolveDenseRows(plan);
    // Exact sequence agreement with the logical-region nested loops
    // (region order, then row-major within each region).
    expect(denseSignatures(plan, refsOf(plan)))
        .toEqual(oracleSignatures(slots, 'goblet', outcomes, {kind: '4pc', sets: ['T']}));
    // Region transitions land on recorded ends: last combo of one region and
    // first combo of the next share no complement arrangement.
    const seen = new Set();
    for (let c = 0; c < plan.validCount; ++c) {
        const key = signature(decodeDenseComplement(c, plan, refsOf(plan)));
        expect(seen.has(key)).toBe(false);
        seen.add(key);
    }
    expect(seen.size).toBe(5);
});

test('dense decode matches the legacy complement decode without topology', () => {
    const slots = makeSlots({
        flower: [piece('A'), piece('B')],
        plume: [piece('A')],
        sands: [piece('A'), piece('B')],
        circlet: [piece('A'), piece('B'), piece('C')],
    });
    const plan = buildFusedOutcomeSegments(slots, 'goblet', [piece('A')], undefined);
    expect(plan.regions).toHaveLength(1);
    expect(plan.validCount).toBe(12);
    resolveDenseRows(plan);
    const refs = refsOf(plan);
    for (let c = 0; c < plan.validCount; ++c) {
        expect(decodeDenseComplement(c, plan, refs))
            .toEqual(decodeFusedOutcomeComplement(c, 'goblet', slots));
    }
    expect(() => decodeDenseComplement(-1, plan, refs)).toThrow();
    expect(() => decodeDenseComplement(plan.validCount, plan, refs)).toThrow();
});

test('dense plan concatenates multiple topology specs in order', () => {
    const slots = makeSlots({
        flower: [piece('T'), piece('A')],
        plume: [piece('T'), piece('A')],
        sands: [piece('T'), piece('X')],
        circlet: [piece('T'), piece('X')],
    }, 'T');
    const outcomes = [piece('T')];
    const topology = [{kind: '4pc', sets: ['T']}, {kind: '2pc', sets: ['A']}];
    const plan = buildFusedOutcomeSegments(slots, 'goblet', outcomes, topology);
    expect(plan.regions.length).toBeGreaterThan(1);
    expect(plan.validCount).toBe(plan.logical.reduce((total, region) => total + region.size, 0));
    resolveDenseRows(plan);
    expect(denseSignatures(plan, refsOf(plan))).toEqual(oracleSignatures(slots, 'goblet', outcomes, topology));
});

test('impossible topology packs to an empty plan, never the full space', () => {
    const slots = makeSlots({
        flower: [piece('T')],
        plume: [piece('T')],
        sands: [piece('X')],
        circlet: [piece('X')],
    });
    const plan = buildFusedOutcomeSegments(slots, 'goblet', [piece('T')], {kind: '4pc', sets: ['T']});
    expect(plan.regions).toHaveLength(0);
    expect(plan.validCount).toBe(0);
});

test('resolved rows match the combined artifact buffer layout', () => {
    const slots = makeSlots({
        flower: [piece('T'), piece('X')],
        plume: [piece('T')],
        sands: [piece('X'), piece('T')],
        circlet: [piece('T')],
    });
    const plan = buildFusedOutcomeSegments(slots, 'goblet', [piece('T')], {kind: '4pc', sets: ['T']});
    const inputs = new GPUOptimizerInputs();
    const {offsets} = inputs.artifactsToCombinedBuffer(plan.packedSlots, {});
    resolveDenseRows(plan);
    for (const region of plan.regions) {
        region.localRows.forEach((local, axis) => {
            const slot = plan.axes[axis];
            expect(region.rows[axis]).toBe(offsets[slot] + local);
        });
        const [d0, d1, d2, d3] = region.dims;
        expect(region.divs).toEqual([d1 * d2 * d3, d2 * d3, d3]);
        expect(region.size).toBe(d0 * d1 * d2 * d3);
    }
});

test('fused params buffer layout matches the WGSL FusedParams ABI', () => {
    // 8-word header + 8 words per record; must match FusedRegion/FusedParams
    // in Feature2/WGSLFusedOutcome.js (header 32B, 32B record stride, rows
    // vec4 at record offset 16, batch words at header words 4..5).
    const words = buildDenseFusedParams({targetSetId: 7, outcomeCount: 3, complementCount: 12,
        regions: [
            {end: 5, divs: [4, 2, 1], rows: [10, 20, 30, 40]},
            {end: 12, divs: [2, 1, 1], rows: [50, 60, 70, 80]},
        ]});
    expect(words).toBeInstanceOf(Uint32Array);
    expect(words.length).toBe(8 + 2 * 8);
    expect([...words.slice(0, 8)]).toEqual([7, 3, 12, 2, 0, 0, 0, 0]);
    expect([...words.slice(8, 16)]).toEqual([5, 4, 2, 1, 10, 20, 30, 40]);
    expect([...words.slice(16, 24)]).toEqual([12, 2, 1, 1, 50, 60, 70, 80]);
});

test('oversized blocks split into u32 chunks without changing the enumeration order', () => {
    const slots = makeSlots({
        flower: [piece('A'), piece('B'), piece('C')],
        plume: [piece('D'), piece('E')],
        sands: [piece('F'), piece('G'), piece('H')],
        circlet: [piece('I'), piece('J')],
    });
    const outcomes = [piece('T')];
    const whole = resolveDenseRows(buildFusedOutcomeSegments(slots, 'goblet', outcomes));
    expect(whole.chunks).toEqual([{base: 0, count: 36, regionStart: 0, regionEnd: 1}]);
    // A limit smaller than one flower slice (12 builds) also splits plumes.
    for (const limit of [36, 20, 12, 7, 5, 1]) {
        const plan = resolveDenseRows(buildFusedOutcomeSegments(slots, 'goblet', outcomes, undefined, limit));
        expect(plan.validCount).toBe(36);
        expect(plan.chunks.every(chunk => chunk.count <= limit)).toBe(true);
        expect(plan.chunks.reduce((total, chunk) => total + chunk.count, 0)).toBe(36);
        plan.chunks.forEach((chunk, index) => {
            expect(chunk.base).toBe(index ? plan.chunks[index - 1].base + plan.chunks[index - 1].count : 0);
            expect(plan.regions[chunk.regionEnd - 1].end).toBe(chunk.base + chunk.count);
        });
        // Global dense order equals the unsplit Cartesian order.
        expect(denseSignatures(plan, refsOf(plan))).toEqual(denseSignatures(whole, refsOf(whole)));
    }
});

test('chunk params rebase region ends and carry the chunk id', () => {
    const words = buildDenseFusedParams({targetSetId: 2, outcomeCount: 5, complementCount: 6, chunkId: 3, base: 10,
        regions: [{end: 13, divs: [1, 1, 1], rows: [0, 1, 2, 3]}, {end: 16, divs: [1, 1, 1], rows: [4, 5, 6, 7]}]});
    expect([...words.slice(0, 8)]).toEqual([2, 5, 6, 2, 0, 0, 3, 0]);
    expect(words[8]).toBe(3);
    expect(words[16]).toBe(6);
    expect(() => buildDenseFusedParams({targetSetId: 0, outcomeCount: 1, complementCount: 2 ** 32, regions: []}))
        .toThrow('fit u32');
});

test('a companion space above u32 plans into chunks instead of failing', () => {
    const pool = count => Array.from({length: count}, () => piece('X'));
    // 300^4 = 8.1e9 builds: more than one u32 index space.
    const plan = buildFusedOutcomeSegments(makeSlots({flower: pool(300), plume: pool(300), sands: pool(300),
        circlet: pool(300)}), 'goblet', [piece('T')]);
    expect(plan.validCount).toBe(300 ** 4);
    expect(plan.chunks.length).toBeGreaterThan(1);
    expect(plan.chunks.every(chunk => chunk.count <= 0xFFFFFFFF)).toBe(true);
    const last = plan.chunks.at(-1);
    expect(last.base + last.count).toBe(300 ** 4);
    resolveDenseRows(plan);
    const refs = refsOf(plan);
    expect(decodeDenseComplement(300 ** 4 - 1, plan, refs)).toHaveLength(4);
});
