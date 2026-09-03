/** Fused traversal entries over the shared objective/constraint/set helpers. */
export function getFusedOutcomeKernel(compiler, options = {}) {
    const parts = compiler.buildVariationFunctions({});
    return compiler.getKernelPreamble(parts, {resultBuffer: false, setBonusAddressSpace: 'fused-round'})
        + buildFusedOutcomeEntries(parts.statCount, options);
}

// Portable WebGPU minimum for maxComputeWorkgroupStorageSize.
const WORKGROUP_BYTES = 16384;
const TILE = 256;
const MAX_ROUND = 16;

/**
 * Workgroup memory layout. Outcome rows are staged when the whole tile fits
 * next to a round of at least four companion builds; each round builds B
 * companions (stats, rows, live flag, variation) at once so set bonuses run
 * on B lanes in parallel and barriers are paid per round, not per build.
 */
export function fusedOutcomeLayout(statCount, round) {
    const rowBytes = TILE * statCount * 4;
    const roundBytes = size => size * (statCount * 4 + 16 + 4 + 4);
    const largestRound = budget => {
        let size = MAX_ROUND;
        while (size > 1 && roundBytes(size) > budget) size /= 2;
        return roundBytes(size) <= budget ? size : 0;
    };
    const useSharedRows = rowBytes + roundBytes(4) <= WORKGROUP_BYTES;
    const budget = WORKGROUP_BYTES - (useSharedRows ? rowBytes : 0);
    const size = round ?? largestRound(budget);
    if (!Number.isInteger(size) || size < 1 || size > MAX_ROUND || roundBytes(size) > budget) {
        throw new RangeError(`Fused outcome round of ${size} does not fit workgroup memory for ${statCount} stats`);
    }
    return {useSharedRows, round: size};
}

export function buildFusedOutcomeEntries(statCount, {round} = {}) {
    const slots = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
    const layout = fusedOutcomeLayout(statCount, round);
    const {useSharedRows} = layout;
    const B = layout.round;
    return `
// ============================================
// Fused Outcome Buffers (bindings 0,1,2,4 use the shared input ABI)
// ============================================
// Dense region descriptor: 32 bytes; rows holds absolute Artifact indices.
struct FusedRegion {
    end: u32,
    div0: u32,
    div1: u32,
    div2: u32,
    rows: vec4<u32>,
}
struct FusedParams {
    target_set_id: u32,
    outcome_count: u32,
    complement_count: u32,
    region_count: u32,
    // Batch window inside the current chunk, rewritten per submission.
    batch_base: u32,
    batch_len: u32,
    // Chunks split companion spaces above u32; indices are chunk-local.
    chunk_id: u32,
    _pad0: u32,
    // Dense region descriptors: absolute artifact rows + mixed-radix
    // divisors. Region base is the previous record's end.
    regions: array<FusedRegion>,
}
fn find_region(c: u32) -> u32 {
    if (fused.region_count == 1u) { return 0u; }
    var lo = 0u;
    var hi = fused.region_count;
    while (lo < hi) {
        let mid = lo + (hi - lo) / 2u;
        if (c < fused.regions[mid].end) { hi = mid; } else { lo = mid + 1u; }
    }
    return lo;
}
@group(0) @binding(5) var<storage, read> fused: FusedParams;
// Per (shard, outcome): (value bits, chunk-local build index, chunk id, 0).
@group(0) @binding(6) var<storage, read_write> fused_bests: array<vec4<u32>>;
@group(0) @binding(7) var<storage, read> fused_outcomes: array<f32>;
// Workgroup round state (module scope: workgroup address space cannot be
// declared inside a function). One fused entry runs per dispatch, so the
// five target-slot entries can share it.
const FUSED_ROUND: u32 = ${B}u;
var<workgroup> fusedRoundStats: array<f32, ${B * statCount}>;
var<workgroup> fusedRoundRows: array<vec4<u32>, ${B}>;
var<workgroup> fusedRoundLive: array<u32, ${B}>;
var<workgroup> fusedRoundVariation: array<u32, ${B}>;
${useSharedRows ? `// Tile outcome rows staged once per dispatch (256 x statCount).
var<workgroup> fusedOutRows: array<f32, ${TILE * statCount}>;` : ''}
${slots.map((target) => {
    const axes = slots.filter((s) => s !== target);
    const full = slots.map((s) => s === target ? 's_t' : 's_' + axes.indexOf(s));
    return `
// Fused entry for target slot "${target}".
// Grid: x = 256-outcome tiles, y = complement shards. Each workgroup walks
// its shard's slice of the current batch in rounds of FUSED_ROUND companion
// builds: lanes < FUSED_ROUND decode and finish one build each, all lanes
// accumulate, then every lane scores its outcome against the whole round.
@compute @workgroup_size(256)
fn main_fused_${target}(@builtin(local_invocation_id) lid: vec3<u32>,
                        @builtin(workgroup_id) wid: vec3<u32>,
                        @builtin(num_workgroups) num_wg: vec3<u32>) {
    let lane = lid.x;
    let outcomeIdx = wid.x * 256u + lane;
    let owned = outcomeIdx < fused.outcome_count;
    // Runtime-dependent -inf seed: a constant bitcast to infinity is rejected
    // by WGSL constant evaluation on Chromium/Dawn (same rule the main entry
    // works around for its NaN sentinel).
    var myBest = bitcast<f32>(0xff800000u | (lane & 0u));
    var myBestComp = 0xffffffffu;
    // Shard slice of the active batch. Indices stay in u32 by construction:
    // start = batch_base + per*wid.y + min(wid.y, rem) <= batch_base +
    // batch_len <= chunk complement_count <= 0xFFFFFFFF, validated host-side.
    let shards = num_wg.y;
    let per = fused.batch_len / shards;
    let rem = fused.batch_len % shards;
    let start = fused.batch_base + per * wid.y + min(wid.y, rem);
    let count = per + select(0u, 1u, wid.y < rem);
    if (count == 0u) { return; }
    let stop = start + count;
${useSharedRows ? `    // Stage this tile's outcome rows in shared memory once per dispatch;
    // they are re-read for every companion build otherwise.
    for (var i = lane; i < ${TILE * statCount}u; i += 256u) {
        let oi = i / ${statCount}u;
        let si = i % ${statCount}u;
        let oidx = wid.x * 256u + oi;
        if (oidx < fused.outcome_count) {
            fusedOutRows[i] = fused_outcomes[oidx * ${statCount}u + si];
        }
    }` : ''}
    for (var c0 = start; c0 < stop; c0 += FUSED_ROUND) {
        // Barrier 1: the previous round is consumed (and rows are staged).
        workgroupBarrier();
        if (lane < FUSED_ROUND) {
            let c = c0 + lane;
            var live = 0u;
            if (c < stop) {
                // Row-major mixed-radix within the region, last axis fastest:
                // the same convention as the host decodeDenseComplement mirror.
                let rid = find_region(c);
                let region = fused.regions[rid];
                var base = 0u;
                if (rid > 0u) { base = fused.regions[rid - 1u].end; }
                var q = c - base;
                let i0 = q / region.div0;
                q %= region.div0;
                let i1 = q / region.div1;
                q %= region.div1;
                let i2 = q / region.div2;
                let i3 = q % region.div2;
                fusedRoundRows[lane] = region.rows + vec4<u32>(i0, i1, i2, i3);
                live = 1u;
            }
            fusedRoundLive[lane] = live;
        }
        // Barrier 2: round rows visible to the accumulating lanes.
        workgroupBarrier();
        for (var i = lane; i < ${B * statCount}u; i += 256u) {
            let b = i / ${statCount}u;
            let s = i % ${statCount}u;
            if (fusedRoundLive[b] != 0u) {
                let rows = fusedRoundRows[b];
                fusedRoundStats[i] = get_base_stat(s)
                    + artifacts[rows.x].stats[s]
                    + artifacts[rows.y].stats[s]
                    + artifacts[rows.z].stats[s]
                    + artifacts[rows.w].stats[s];
            }
        }
        // Barrier 3: accumulation visible before set bonuses mutate it.
        workgroupBarrier();
        if (lane < FUSED_ROUND && fusedRoundLive[lane] != 0u) {
            let rows = fusedRoundRows[lane];
            let s_t = fused.target_set_id;
            let s_0 = artifacts[rows.x].set_id;
            let s_1 = artifacts[rows.y].set_id;
            let s_2 = artifacts[rows.z].set_id;
            let s_3 = artifacts[rows.w].set_id;
            if (check_set_constraints(${full.join(', ')})) {
                apply_set_bonuses_round(lane * ${statCount}u, ${full.join(', ')});
                fusedRoundVariation[lane] = set_to_variation[compute_set_key(${full.join(', ')})];
            } else {
                fusedRoundLive[lane] = 0u;
            }
        }
        // Barrier 4: bonuses and variations visible to every scoring lane.
        workgroupBarrier();
        if (owned) {
            for (var b = 0u; b < FUSED_ROUND; b++) {
                if (fusedRoundLive[b] == 0u) { continue; }
                let variation = fusedRoundVariation[b];
                var ostats: array<f32, ${statCount}>;
                for (var s = 0u; s < ${statCount}u; s++) {
                    ostats[s] = fusedRoundStats[b * ${statCount}u + s] + ${useSharedRows
                        ? `fusedOutRows[lane * ${statCount}u + s]`
                        : `fused_outcomes[outcomeIdx * ${statCount}u + s]`};
                }
                if (params.has_stat_constraints == 0u || dispatch_stat_constraints(variation, &ostats)) {
                    let damage = dispatch_variation(variation, &ostats);
                    var selected_damage = damage[2];
                    if (params.damage_index == 0u) {
                        selected_damage = damage[0];
                    } else if (params.damage_index == 1u) {
                        selected_damage = damage[1];
                    }
                    // Builds are visited in increasing order, so a strict
                    // improvement keeps the smaller index on exact ties.
                    if ((bitcast<u32>(selected_damage) & 0x7f800000u) != 0x7f800000u
                        && selected_damage > myBest) {
                        myBest = selected_damage;
                        myBestComp = c0 + b;
                    }
                }
            }
        }
    }
    if (owned) {
        // One partial best per (shard, outcome). Batches and chunks run in
        // increasing build order, so an equal value only replaces the stored
        // one from the same chunk with a smaller index: the host's final
        // merge sees the best over all shards, batches and chunks with
        // deterministic ties (value, then chunk, then chunk-local index).
        let slotId = wid.y * fused.outcome_count + outcomeIdx;
        let prev = fused_bests[slotId];
        let prevBest = bitcast<f32>(prev.x);
        if (myBest > prevBest || (myBest == prevBest && prev.z == fused.chunk_id && myBestComp < prev.y)) {
            fused_bests[slotId] = vec4<u32>(bitcast<u32>(myBest), myBestComp, fused.chunk_id, 0u);
        }
    }
}`;
}).join('\n')}
`;
}
