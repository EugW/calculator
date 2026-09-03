import { DB } from '../src/js/db/DB';
import { buildFusedOutcomeRegions } from '../src/js/classes/ArtifactsSuggest';

global.DB = DB;

const AXES = ['flower', 'plume', 'sands', 'circlet'];
const piece = (setName) => ({
    getSet: () => setName,
    getSetName: () => setName,
});
const makeSlots = (poolsByAxis, targetSet = 'T') => Object.assign({
    goblet: [piece(targetSet)],
}, poolsByAxis);

function signaturesOf(regions) {
    const result = [];
    for (const region of regions) {
        const walk = (depth, picks) => {
            if (depth === AXES.length) {
                result.push(picks.join('/'));
                return;
            }
            for (const artifact of region.slots[AXES[depth]]) {
                picks.push(artifact.getSetName());
                walk(depth + 1, picks);
                picks.pop();
            }
        };
        walk(0, []);
    }
    return result;
}

test('4pc topology regions cover every preserved arrangement of set pieces', () => {
    const slots = makeSlots({
        flower: [piece('T'), piece('X')],
        plume: [piece('T'), piece('X')],
        sands: [piece('T'), piece('X')],
        circlet: [piece('T'), piece('X')],
    });
    const regions = buildFusedOutcomeRegions(slots, 'goblet', [piece('T')], {kind: '4pc', sets: ['T']});
    const signatures = signaturesOf(regions);
    const unique = new Set(signatures);
    // Disjoint regions: no signature appears twice.
    expect(unique.size).toBe(signatures.length);
    // Exactly the complements with >= 3 T pieces (target supplies the 4th):
    // four exactly-3 arrangements plus the all-T arrangement.
    expect(unique.size).toBe(5);
    for (const signature of ['X/T/T/T', 'T/X/T/T', 'T/T/X/T', 'T/T/T/X', 'T/T/T/T']) {
        expect(unique.has(signature)).toBe(true);
    }
    // Explicit slot-offset swap: off-piece flower with the 4pc continuing in
    // plume/sands/circlet (this is the "drop the flower, keep 4pc elsewhere"
    // arrangement).
    expect(unique.has('X/T/T/T')).toBe(true);
    // No combinations outside the preserved topology leak in.
    expect([...unique].every(signature => signature.split('/').filter(s => s === 'T').length >= 3)).toBe(true);
});

test('2+2 topology regions cover both two-piece pairs, including slot swaps', () => {
    const slots = makeSlots({
        flower: [piece('A'), piece('B'), piece('F')],
        plume: [piece('A'), piece('B'), piece('F')],
        sands: [piece('A'), piece('B'), piece('F')],
        circlet: [piece('A'), piece('B'), piece('F')],
    }, 'A');
    const regions = buildFusedOutcomeRegions(slots, 'goblet', [piece('A')], {kind: '2+2', sets: ['A', 'B']});
    const signatures = signaturesOf(regions);
    const unique = new Set(signatures);
    expect(unique.size).toBe(signatures.length);
    // Target contributes one A; complements must supply >= 1 A and >= 2 B.
    let expected = 0;
    for (const a of ['A', 'B', 'F']) for (const b of ['A', 'B', 'F']) for (const c of ['A', 'B', 'F']) for (const d of ['A', 'B', 'F']) {
        const sets = [a, b, c, d];
        const countA = 1 + sets.filter(s => s === 'A').length;
        const countB = sets.filter(s => s === 'B').length;
        if (countA >= 2 && countB >= 2) ++expected;
    }
    expect(unique.size).toBe(expected);
    // A swap arrangement where a B piece sits in the target's baseline slot
    // family and A fills another slot.
    expect(unique.has('B/B/A/A')).toBe(true);
    expect(unique.has('F/B/B/A')).toBe(true);
    expect(unique.has('F/F/B/B')).toBe(false);
});

test('single 2pc topology only requires its own pair', () => {
    const slots = makeSlots({
        flower: [piece('A'), piece('X')],
        plume: [piece('A'), piece('X')],
        sands: [piece('A'), piece('X')],
        circlet: [piece('A'), piece('X')],
    }, 'X');
    const regions = buildFusedOutcomeRegions(slots, 'goblet', [piece('X')], {kind: '2pc', sets: ['A']});
    const unique = new Set(signaturesOf(regions));
    // Target is X, so complements must supply both A pieces (>= 2 A axes).
    expect(unique.size).toBe(11);
    expect([...unique].every(signature => signature.split('/').filter(s => s === 'A').length >= 2)).toBe(true);
});

test('impossible topology remains infeasible instead of searching unrestricted builds', () => {
    const slots = makeSlots({
        flower: [piece('T')],
        plume: [piece('T')],
        sands: [piece('X')],
        circlet: [piece('X')],
    });
    const regions = buildFusedOutcomeRegions(slots, 'goblet', [piece('T')], {kind: '4pc', sets: ['T']});
    expect(regions).toHaveLength(0);
});
