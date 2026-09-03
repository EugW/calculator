import {GPU_SLOT_NAMES} from '../src/js/classes/GPUOptimizerInputs';
import {getFusedOutcomeKernel, buildFusedOutcomeEntries, fusedOutcomeLayout} from '../src/js/classes/Feature2/WGSLFusedOutcome';
import { DB } from '../src/js/db/DB';
import { WGSLMegaKernelCompiler } from '../src/js/classes/Feature2/WGSLCompiler';
import {
    FUSED_OUTCOME_TILE,
    decodeFusedOutcomeComplement,
    GPUForcedOutcomeOptimizer,
} from '../src/js/classes/GPUForcedOutcomeOptimizer';

global.DB = DB;

function fakeArtifact(slot, set) {
    return {
        slot, set,
        getSlot: () => slot,
        getSet: () => set,
        getSetName: () => set,
        calculated: {crit_rate: 0.05},
        concatFunc: () => {},
    };
}

function tinyPools() {
    return {
        flower: [fakeArtifact('flower', 'GladiatorFinale'), fakeArtifact('flower', 'WandererTroupe')],
        plume: [fakeArtifact('plume', 'GladiatorFinale')],
        sands: [fakeArtifact('sands', 'GladiatorFinale'), fakeArtifact('sands', 'GladiatorFinale')],
        goblet: [fakeArtifact('goblet', 'GladiatorFinale')],
        circlet: [fakeArtifact('circlet', 'GladiatorFinale'), fakeArtifact('circlet', 'GladiatorFinale'), fakeArtifact('circlet', 'WandererTroupe')],
    };
}

test('main kernel output is unchanged (no fused entries on the main path)', () => {
    const compiler = new WGSLMegaKernelCompiler();
    expect(compiler.getMegaKernel({})).not.toContain('main_fused');
    expect(compiler.getMegaKernel({})).toContain('fn main(');
});

test('fused kernel carries one entry per target slot over shared helpers', () => {
    const compiler = new WGSLMegaKernelCompiler();
    const code = getFusedOutcomeKernel(compiler);
    for (const slot of ['flower', 'plume', 'sands', 'goblet', 'circlet']) {
        expect(code).toContain(`fn main_fused_${slot}(`);
    }
    expect(code).not.toContain('fn main(');
    expect(code).toContain('fused_bests[slotId]');
    expect(code).not.toContain('fused_progress');
    expect(code).toContain('workgroupBarrier();');
    // Sharded grid: x = outcome tiles, y = complement shards.
    expect(code).toContain('let shards = num_wg.y;');
    expect(code).toContain('let start = fused.batch_base + per * wid.y + min(wid.y, rem);');
    // Companion builds are walked in rounds of FUSED_ROUND builds.
    expect(code).toContain('for (var c0 = start; c0 < stop; c0 += FUSED_ROUND)');
    // Dense region descriptors appended to binding 5 (no new binding: the
    // device caps storage bindings at six).
    expect(code).toContain('struct FusedRegion {');
    expect(code).toContain('regions: array<FusedRegion>');
    expect(code).toContain('fn find_region(c: u32)');
    expect(code).toContain('region.rows + vec4<u32>(i0, i1, i2, i3)');
    expect(code).not.toContain('comp_base');
    expect(code).not.toContain('comp_counts');
    expect(code).not.toContain('comp_offsets');
    // Deterministic ties: smaller (chunk, dense index) wins across shards,
    // batches and chunks.
    expect(code).toContain('prev.z == fused.chunk_id && myBestComp < prev.y');
    expect(code).toContain('var<storage, read_write> fused_bests: array<vec4<u32>>');
    // Four barriers per round per slot: rewrite gate, round rows visible,
    // accumulation visible, set bonuses/variations visible.
    expect(code.split('workgroupBarrier();').length - 1).toBe(20);
    expect(code).toContain('@binding(5)');
    expect(code).toContain('@binding(7)');
    expect(code).toContain('@binding(7) var<storage, read> fused_outcomes: array<f32>');
    expect(code).not.toContain('outcome_base');
    expect(code).toContain('fn apply_set_bonuses_round(offset: u32,');
    expect(code).toContain('fusedRoundStats[offset + s] += set_bonuses');
    expect(code).not.toContain('fn check_stat_constraints_w(');
    expect(code).not.toContain('fn dispatch_variation_w(');
    expect(code).not.toContain('fn dispatch_stat_constraints_w(');
    // Per-outcome bests need no atomics: single writer per outcome slot.
    expect(code).not.toContain('atomicMax');
});

test.each([1, 16])('fused outcome reads use independent stat rows for %i stats', statCount => {
    const code = buildFusedOutcomeEntries(statCount);
    if (statCount === 1) {
        expect(code).toContain('fusedOutRows[i] = fused_outcomes[oidx * 1u + si]');
    } else {
        expect(code).not.toContain('fusedOutRows');
        expect(code).toContain('fused_outcomes[outcomeIdx * 16u + s]');
    }
    expect(code).not.toContain('outcome_base');
});

test.each([
    [1, true, 16], [6, true, 16], [15, true, 8], [16, false, 16], [64, false, 16],
])('fused round layout for %i stats: shared rows %s, round %i', (statCount, shared, round) => {
    expect(fusedOutcomeLayout(statCount)).toEqual({useSharedRows: shared, round});
    const code = buildFusedOutcomeEntries(statCount);
    expect(code).toContain(`const FUSED_ROUND: u32 = ${round}u;`);
    expect(code.includes('var<workgroup> fusedOutRows')).toBe(shared);
    // Every round fits the portable 16KB workgroup budget.
    const bytes = (shared ? 256 * statCount * 4 : 0) + round * (statCount * 4 + 24);
    expect(bytes).toBeLessThanOrEqual(16384);
    expect(() => fusedOutcomeLayout(15, 16)).toThrow('does not fit');
    expect(fusedOutcomeLayout(6, 1).round).toBe(1);
});

test('fused complement decode mirrors row-major order minus the target axis', () => {
    const pools = tinyPools();
    // Goblet target: flower x plume x sands x circlet = 2x1x2x3 = 12, circlet fastest.
    expect(decodeFusedOutcomeComplement(0, 'goblet', pools).map(a => a.slot))
        .toEqual(['flower', 'plume', 'sands', 'circlet']);
    expect(decodeFusedOutcomeComplement(0, 'goblet', pools)).toEqual(
        [pools.flower[0], pools.plume[0], pools.sands[0], pools.circlet[0]]);
    expect(decodeFusedOutcomeComplement(1, 'goblet', pools)[3]).toBe(pools.circlet[1]);
    expect(decodeFusedOutcomeComplement(3, 'goblet', pools)[2]).toBe(pools.sands[1]);
    // Flower target: plume x sands x goblet x circlet = 1x2x1x3 = 6.
    expect(decodeFusedOutcomeComplement(0, 'flower', pools).map(a => a.slot))
        .toEqual(['plume', 'sands', 'goblet', 'circlet']);
    expect(decodeFusedOutcomeComplement(5, 'flower', pools)).toEqual(
        [pools.plume[0], pools.sands[1], pools.goblet[0], pools.circlet[2]]);
    expect(() => decodeFusedOutcomeComplement(0, 'goblet', {...pools, sands: []})).toThrow();
    expect(() => decodeFusedOutcomeComplement(0, 'noslot', pools)).toThrow();
});

test('fused input validation fails fast without a device', async () => {
    const optimizer = new GPUForcedOutcomeOptimizer();
    const pools = tinyPools();
    const good = [fakeArtifact('goblet', 'GladiatorFinale')];
    await expect(optimizer.optimizeForcedOutcomes({
        slots: pools, buildData: {}, setData: {}, outcomeArtifacts: [], targetSlot: 'goblet',
    })).rejects.toThrow('at least one outcome');
    await expect(optimizer.optimizeForcedOutcomes({
        slots: pools, buildData: {}, setData: {},
        outcomeArtifacts: [fakeArtifact('circlet', 'GladiatorFinale')], targetSlot: 'goblet',
    })).rejects.toThrow('share the target slot');
    await expect(optimizer.optimizeForcedOutcomes({
        slots: pools, buildData: {}, setData: {},
        outcomeArtifacts: [fakeArtifact('goblet', 'GladiatorFinale'), fakeArtifact('goblet', 'WandererTroupe')],
        targetSlot: 'goblet',
    })).rejects.toThrow('one set');
    await expect(optimizer.optimizeForcedOutcomes({
        slots: pools, buildData: {}, setData: {}, outcomeArtifacts: good, targetSlot: 'noslot',
    })).rejects.toThrow('artifact slot');
    const unlocked = {getSlot: () => 'goblet', getSetName: () => 'GladiatorFinale'};
    await expect(optimizer.optimizeForcedOutcomes({
        slots: pools, buildData: {}, setData: {}, outcomeArtifacts: [unlocked], targetSlot: 'goblet',
    })).rejects.toThrow('lowered');
    // Valid inputs pass validation and reach the device gate.
    await expect(optimizer.optimizeForcedOutcomes({
        slots: pools, buildData: {}, setData: {}, outcomeArtifacts: good, targetSlot: 'goblet',
    })).rejects.toThrow('not prepared');
    expect(FUSED_OUTCOME_TILE).toBe(256);
    expect(GPU_SLOT_NAMES).toEqual(['flower', 'plume', 'sands', 'goblet', 'circlet']);
});
