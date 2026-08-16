/**
 * WGSL Feature Compiler
 * Compiles feature trees to WGSL code for WebGPU compute shaders
 */

import { CBlock } from "./Compile/Types";
import { FeatureCompiler, getAssignedStats } from "./Compiler";
import { buildStatIndexMap, resetWGSLVariables } from "./Compile/WGSL";

const VARIATION_LOOKUP_SIZE = 257 + 128 * 128;
const SET_BONUS_LEVELS = 128 * 2;
const DUMMY_LAYOUT_STAT = '__wgsl_dummy_layout_stat__';

/**
 * Compiler that generates WGSL code from feature trees
 */
export class WGSLFeatureCompiler extends FeatureCompiler {
    constructor(tree, postItems, variationId) {
        super(tree, postItems);
        this.variationId = variationId || 0;
    }

    /**
     * Prepare for WGSL compilation
     * @param {Object} data - Build data
     * @param {Object} opts - Compilation options
     */
    prepareWGSL(data, opts) {
        opts = Object.assign({}, opts);
        resetWGSLVariables();

        let isRotation = this.tree.getType() == 'damage_rotation_result';
        let resultTree = this.tree.makeResult();

        let postTree;
        if (!isRotation) {
            postTree = this.makePostTree(opts);
        }

        this.processed = new CBlock();

        if (!opts.dontProcessTree) {
            this.processBlock(resultTree, opts);
            if (postTree) {
                this.processBlock(postTree, opts);
            }
        }

        if (postTree) {
            this.processed.items.push(postTree);
        }
        this.processed.items.push(resultTree);

        if (postTree && postTree.revert && postTree.revert.length) {
            let last = this.processed.items[this.processed.items.length - 1];

            if (last.appendChildren) {
                last.appendChildren(...postTree.revert);
            } else {
                this.processed.items.push(...postTree.revert);
            }
        }

        // Processing may fold stat reads away or introduce assignment lanes.
        // Rebuild liveness from the final AST before freezing the standalone
        // WGSL layout, matching the shared FeatureCompiler path.
        this._collectProcessedStats();
        this.statIndexMap = buildStatIndexMap(this.usedStats);
    }

    /**
     * Get WGSL code for this feature variation
     * @param {Object} opts - WGSL compilation options
     * @returns {string}
     */
    getWGSLCode(opts) {
        opts = Object.assign({}, opts, {
            statIndex: this.statIndexMap,
            statsVar: '(*stats)',
        });

        return this.processed.compileWGSL(opts);
    }

    /**
     * Generate complete WGSL function for this variation
     * @param {Object} opts
     * @returns {string}
     */
    getWGSLFunction(opts) {
        const statCount = Object.keys(this.statIndexMap).length;
        const bodyCode = this.getWGSLCode(opts);

        return `
fn eval_v${this.variationId}(stats: ptr<function, array<f32, ${statCount}>>) -> vec3<f32> {
    ${bodyCode}
}`;
    }

    /**
     * Get the stat index mapping
     * @returns {Object}
     */
    getStatIndexMap() {
        return this.statIndexMap;
    }
}

/**
 * Compile multiple feature variations to a mega-kernel
 */
export class WGSLMegaKernelCompiler {
    constructor() {
        this.variations = new Map();
        this.globalStatIndexMap = {};
        this.statCount = 0;
        this.optimizationPlan = null;
    }

    /**
     * Add a feature variation
     * @param {string} variationId - Unique variation identifier
     * @param {FeatureCompiler} compiler - The prepared compiler
     */
    addVariation(variationId, compiler) {
        if (this.optimizationPlan) {
            throw new Error('Cannot add a legacy WGSL variation after binding an optimization plan');
        }

        const existing = this.variations.get(variationId);
        const index = existing ? existing.index : this.variations.size;
        const constraintData = compiler.constraintData || {};
        this.variations.set(variationId, {
            id: variationId,
            index,
            objectiveAst: compiler.processed,
            objectiveUsedStats: compiler.usedStats || [],
            constraintPostEffects: constraintData.postEffects || [],
            constraintUsedStats: constraintData.usedStats || [],
        });
        this.rebuildStatLayout();
    }

    /**
     * Bind the backend-neutral optimizer IR. Variation indices and AST
     * references come directly from the plan; this lowerer only chooses WGSL
     * storage layout and emits backend code.
     *
     * @param {Object} plan - OptimizationPlan created by createOptimizationPlan
     */
    addOptimizationPlan(plan) {
        if (!plan || plan.kind !== 'optimization-plan' || !Array.isArray(plan.variations)) {
            throw new TypeError('WGSL optimization plan must contain a variations array');
        }
        if (this.variations.size !== 0 || this.optimizationPlan) {
            throw new Error('WGSL mega-kernel already has bound variations');
        }

        const indices = new Set();
        const ids = new Set();
        for (const variation of plan.variations) {
            if (!variation || typeof variation.id !== 'string') {
                throw new TypeError('WGSL optimization plan variation must have a string ID');
            }
            if (!Number.isInteger(variation.index) || variation.index < 0) {
                throw new RangeError(`WGSL optimization variation "${variation.id}" has an invalid index`);
            }
            if (ids.has(variation.id) || indices.has(variation.index)) {
                throw new RangeError('WGSL optimization plan variation IDs and indices must be unique');
            }
            if (!variation.objectiveAst || typeof variation.objectiveAst.compileWGSL !== 'function') {
                throw new TypeError(`WGSL optimization variation "${variation.id}" has no compilable objective AST`);
            }

            ids.add(variation.id);
            indices.add(variation.index);
            this.variations.set(variation.id, {
                id: variation.id,
                index: variation.index,
                objectiveAst: variation.objectiveAst,
                objectiveUsedStats: variation.objectiveUsedStats || [],
                constraintPostEffects: variation.constraintPostEffects || [],
                constraintUsedStats: variation.constraintUsedStats || [],
            });
        }

        if (this.variations.size === 0) {
            throw new RangeError('WGSL optimization plan must contain at least one variation');
        }
        for (let index = 0; index < this.variations.size; ++index) {
            if (!indices.has(index)) {
                throw new RangeError('WGSL optimization plan variation indices must be contiguous from zero');
            }
        }

        this.optimizationPlan = plan;
        this.rebuildStatLayout();
    }

    /**
     * Rebuild a stable physical layout from semantic dependency sets. Sorting
     * makes the same plan produce the same layout regardless of caller object
     * or Map insertion order.
     */
    rebuildStatLayout() {
        const usedStats = new Set();
        for (const variation of this.variations.values()) {
            for (const stat of variation.objectiveUsedStats || []) usedStats.add(stat);
            for (const stat of variation.constraintUsedStats || []) usedStats.add(stat);
        }

        this.globalStatIndexMap = {};
        this.statCount = 0;
        for (const stat of [...usedStats].sort(compareStrings)) {
            this.globalStatIndexMap[stat] = this.statCount++;
        }
    }

    /**
     * Build all variation functions with unified stat indexing
     * @param {Object} opts
     * @returns {Object} - { functions: string[], dispatchSwitch: string, statIndexMap: Object }
     */
    buildVariationFunctions(opts) {
        // WGSL does not allow zero-sized arrays, and WebGPU does not allow
        // zero-byte storage buffers. Constant-valued features legitimately use
        // no stats, so reserve one inert physical lane for that layout. Mutate
        // the shared map/count together so the host-side artifact, set-bonus,
        // and uniform buffers use the exact same structure as the shader.
        if (this.statCount === 0) {
            this.globalStatIndexMap[DUMMY_LAYOUT_STAT] = 0;
            this.statCount = 1;
        }

        const functions = [];
        const switchCases = [];
        const constraintFunctions = [];
        const constraintSwitchCases = [];
        const variations = [...this.variations.values()]
            .sort((left, right) => left.index - right.index);

        for (const variation of variations) {
            const varIdx = variation.index;
            // Create WGSL compiler with unified stat map
            const wgslOpts = Object.assign({}, opts, {
                statIndex: this.globalStatIndexMap,
                statsVar: '(*stats)',
            });

            resetWGSLVariables();

            const bodyCode = variation.objectiveAst.compileWGSL(wgslOpts);

            // Build a fresh assignment tree from the CPU constraint metadata.
            // The companion function snapshots the exact lanes it writes,
            // applies only post effects that can affect constrained stats,
            // evaluates the runtime uniform bounds, and restores those lanes.
            const constraintPostEffects = variation.constraintPostEffects || [];
            const [constraintAssign] = constraintPostEffects.length
                ? FeatureCompiler.postTreeBlocks(constraintPostEffects)
                : [[]];
            const constraintAssignBlock = new CBlock(constraintAssign, {noReturn: true});
            const constraintWrittenStats = getAssignedStats(constraintAssignBlock)
                .map((stat) => {
                    const index = this.globalStatIndexMap[stat];
                    if (!Number.isInteger(index)) {
                        throw new Error(
                            `WGSL constraint assignment stat "${stat}" is missing from the physical layout`
                        );
                    }
                    return {stat, index};
                })
                .sort((left, right) => left.index - right.index);
            resetWGSLVariables();
            const constraintAssignCode = constraintAssign.length
                ? constraintAssignBlock.compileWGSL(wgslOpts)
                : '';
            const constraintSaveCode = constraintWrittenStats.map(({index}) => {
                return `    let constraint_original_${index} = (*stats)[${index}u];`;
            }).join('\n');
            const constraintRestoreCode = constraintWrittenStats.map(({index}) => {
                return `    (*stats)[${index}u] = constraint_original_${index};`;
            }).join('\n');

            functions.push(`
fn eval_v${varIdx}(stats: ptr<function, array<f32, ${this.statCount}>>) -> vec3<f32> {
    ${bodyCode}
}`);

            constraintFunctions.push(`
fn check_stat_constraints_v${varIdx}(stats: ptr<function, array<f32, ${this.statCount}>>) -> bool {
${constraintSaveCode}${constraintSaveCode ? '\n' : ''}
    ${constraintAssignCode}${constraintAssignCode ? ';' : ''}
    let constraint_accepted = check_stat_constraints(stats);
${constraintRestoreCode}${constraintRestoreCode ? '\n' : ''}
    return constraint_accepted;
}`);

            switchCases.push(`        case ${varIdx}u: { return eval_v${varIdx}(stats); }`);
            constraintSwitchCases.push(`        case ${varIdx}u: { return check_stat_constraints_v${varIdx}(stats); }`);
        }

        const dispatchSwitch = `
fn dispatch_variation(variation: u32, stats: ptr<function, array<f32, ${this.statCount}>>) -> vec3<f32> {
    switch (variation) {
${switchCases.join('\n')}
        default: {
            let invalid = bitcast<f32>(0x7fc00000u | (variation & 0x003fffffu));
            return vec3<f32>(invalid, invalid, invalid);
        }
    }
}`;

        const constraintDispatchSwitch = `
fn dispatch_stat_constraints(variation: u32, stats: ptr<function, array<f32, ${this.statCount}>>) -> bool {
    switch (variation) {
${constraintSwitchCases.join('\n')}
        default: { return false; }
    }
}`;

        return {
            functions,
            dispatchSwitch,
            constraintFunctions,
            constraintDispatchSwitch,
            statIndexMap: this.globalStatIndexMap,
            statCount: this.statCount,
        };
    }

    /**
     * Get the complete mega-kernel code
     * @param {Object} artifactOpts - Options for artifact buffer layout
     * @returns {string}
     */
    getMegaKernel(artifactOpts) {
        const {
            functions,
            dispatchSwitch,
            constraintFunctions,
            constraintDispatchSwitch,
            statCount,
        } = this.buildVariationFunctions({});

        const variationMap = this.buildVariationMap();

        return `
// ============================================
// Auto-generated WGSL Mega-Kernel
// Stat count: ${statCount}
// Variations: ${this.variations.size}
// ============================================

const STAT_COUNT: u32 = ${statCount}u;
// Artifact data structure (no padding for memory efficiency)
struct Artifact {
    stats: array<f32, ${statCount}>,
    set_id: u32,
}

// Stat constraint for min/max validation
// Layout: [stat_index, base_index, pct_index, is_real_total, min_value, max_value, pad, pad]
struct StatConstraint {
    stat_index: u32,
    stat_base_index: u32,
    stat_pct_index: u32,
    is_real_total: u32,
    min_value: f32,
    max_value: f32,
    _pad1: u32,
    _pad2: u32,
}

// Consolidated bindings (5 total: 3 storage read + 1 storage read-write + 1 uniform)
@group(0) @binding(0) var<storage, read> artifacts: array<Artifact>;        // Combined all slots
@group(0) @binding(1) var<storage, read> set_bonuses: array<array<f32, ${statCount}>, ${SET_BONUS_LEVELS}>;
@group(0) @binding(2) var<storage, read> set_to_variation: array<u32, ${VARIATION_LOOKUP_SIZE}>;
@group(0) @binding(3) var<storage, read_write> result_values: array<f32>;
@group(0) @binding(4) var<uniform> params: ComputeParams;

struct ComputeParams {
    flower_count: u32,
    plume_count: u32,
    sands_count: u32,
    goblet_count: u32,
    circlet_count: u32,
    total_combinations: u32,  // Shard-local Cartesian product (always u32-safe)
    batch_offset: u32,        // Offset inside the current shard
    batch_size: u32,
    damage_index: u32,        // 0=normal, 1=crit, 2=average
    constraint_count: u32,    // Number of stat constraints to check
    flower_offset: u32,       // Offset into artifacts array
    plume_offset: u32,
    sands_offset: u32,
    goblet_offset: u32,
    circlet_offset: u32,
    stat_count: u32,          // For shader to know array sizes
    has_set_min_constraints: u32,
    has_set_max_constraints: u32,
    has_stat_constraints: u32,
    _pad2: u32,
    // Base stats are stored after header (accessed via get_base_stat helper)
    // Alignment padding to 16 bytes, then base_stats, constraints, set_flags
    base_stats: array<vec4<f32>, ${Math.ceil(statCount / 4)}>,
    // Inline stat constraints (max 8): saves a storage buffer slot
    constraints: array<StatConstraint, 8>,
    // Set flags for all 128 possible sets, packed as vec4<u32> for 16-byte alignment
    // Each u32: bits 0-7 = max_pieces (0=unlimited, 2/4=reject if >= N pieces)
    //           bits 8-15 = min_pieces (0=none, 2/4=require >= N pieces)
    // Access: set_flags[set_id / 4][set_id % 4]
    set_flags: array<vec4<u32>, 32>,
}

// Helper to read base stat by flat index from vec4-packed array
fn get_base_stat(idx: u32) -> f32 {
    let vec_idx = idx / 4u;
    let component = idx % 4u;
    let v = params.base_stats[vec_idx];
    switch (component) {
        case 0u: { return v.x; }
        case 1u: { return v.y; }
        case 2u: { return v.z; }
        default: { return v.w; }
    }
}

// Helper to read set flag by set_id
fn get_set_flag(set_id: u32) -> u32 {
    let vec_idx = set_id / 4u;
    let component = set_id % 4u;
    let v = params.set_flags[vec_idx];
    switch (component) {
        case 0u: { return v.x; }
        case 1u: { return v.y; }
        case 2u: { return v.z; }
        default: { return v.w; }
    }
}

// ============================================
// Variation Functions
// ============================================
${functions.join('\n')}

// ============================================
// Dispatch Switch
// ============================================
${dispatchSwitch}

// ============================================
// Variation-Specific Constraint Functions
// ============================================
${constraintFunctions.join('\n')}
${constraintDispatchSwitch}

// ============================================
// Set Counting and Variation Lookup (O(5) optimized)
// ============================================

// Helper: count how many times a set_id appears among the 5 artifacts
fn count_set(set_id: u32, s0: u32, s1: u32, s2: u32, s3: u32, s4: u32) -> u32 {
    var count = 0u;
    if (s0 == set_id) { count++; }
    if (s1 == set_id) { count++; }
    if (s2 == set_id) { count++; }
    if (s3 == set_id) { count++; }
    if (s4 == set_id) { count++; }
    return count;
}

fn compute_set_key(s0: u32, s1: u32, s2: u32, s3: u32, s4: u32) -> u32 {
    // Compact collision-free key:
    //   0                  -> default/no dynamic set
    //   1 + set_id         -> one 2pc set
    //   129 + set_id       -> one 4pc set
    //   257 + lo*128 + hi  -> two 2pc sets, lo < hi
    var four_piece_set = 128u;
    var two_piece_a = 128u;
    var two_piece_b = 128u;
    
    // Process each unique set ID (skip duplicates)
    let sets = array<u32, 5>(s0, s1, s2, s3, s4);
    for (var i = 0u; i < 5u; i++) {
        let set_id = sets[i];
        if (set_id >= 128u) { continue; }
        
        // Skip if we've already processed this set_id
        var already_processed = false;
        for (var j = 0u; j < i; j++) {
            if (sets[j] == set_id) { already_processed = true; break; }
        }
        if (already_processed) { continue; }
        
        let count = count_set(set_id, s0, s1, s2, s3, s4);
        if (count >= 4u) {
            if (set_id < four_piece_set) {
                four_piece_set = set_id;
            }
        } else if (count >= 2u) {
            if (set_id < two_piece_a) {
                two_piece_b = two_piece_a;
                two_piece_a = set_id;
            } else if (set_id != two_piece_a && set_id < two_piece_b) {
                two_piece_b = set_id;
            }
        }
    }
    
    if (four_piece_set < 128u) {
        return 129u + four_piece_set;
    }
    if (two_piece_b < 128u) {
        return 257u + two_piece_a * 128u + two_piece_b;
    }
    if (two_piece_a < 128u) {
        return 1u + two_piece_a;
    }

    return 0u;
}

fn apply_set_bonuses(stats: ptr<function, array<f32, ${statCount}>>, s0: u32, s1: u32, s2: u32, s3: u32, s4: u32) {
    // Only check the 5 set IDs that are actually present
    let sets = array<u32, 5>(s0, s1, s2, s3, s4);
    for (var i = 0u; i < 5u; i++) {
        let set_id = sets[i];
        if (set_id >= 128u) { continue; }
        
        // Skip if we've already processed this set_id
        var already_processed = false;
        for (var j = 0u; j < i; j++) {
            if (sets[j] == set_id) { already_processed = true; break; }
        }
        if (already_processed) { continue; }
        
        let count = count_set(set_id, s0, s1, s2, s3, s4);
        if (count >= 2u) {
            // Apply 2-piece bonus (index = set_id * 2)
            let bonus_idx_2 = set_id * 2u;
            for (var s = 0u; s < ${statCount}u; s++) {
                (*stats)[s] += set_bonuses[bonus_idx_2][s];
            }
        }
        if (count >= 4u) {
            // Apply 4-piece bonus (index = set_id * 2 + 1)
            let bonus_idx_4 = set_id * 2u + 1u;
            for (var s = 0u; s < ${statCount}u; s++) {
                (*stats)[s] += set_bonuses[bonus_idx_4][s];
            }
        }
    }
}

// ============================================
// Stat Constraint Validation
// ============================================
fn check_stat_constraints(stats: ptr<function, array<f32, ${statCount}>>) -> bool {
    // Early return if no constraints
    if (params.constraint_count == 0u) {
        return true;
    }

    for (var i = 0u; i < params.constraint_count; i++) {
        let c = params.constraints[i];

        var total: f32;
        if (c.is_real_total == 1u) {
            // hp, atk, def: base * (1 + percent) + flat
            let base_val = (*stats)[c.stat_base_index];
            let pct_val = (*stats)[c.stat_pct_index];
            let flat_val = (*stats)[c.stat_index];
            total = base_val * (1.0 + pct_val) + flat_val;
        } else {
            // crit_rate, crit_dmg, recharge, mastery: base + flat
            let base_val = (*stats)[c.stat_base_index];
            let flat_val = (*stats)[c.stat_index];
            total = base_val + flat_val;
        }

        // Exponent bits of all ones identify both infinities and NaNs. The
        // semantic plan requires finite transformed totals even when a bound
        // itself is near the edge of the f32 domain.
        if ((bitcast<u32>(total) & 0x7f800000u) == 0x7f800000u) {
            return false;
        }

        // Negating the complete accepted interval makes this fail closed for
        // NaN totals or bounds: all ordered comparisons with NaN are false.
        if (!(total >= c.min_value && total <= c.max_value)) {
            return false;
        }
    }
    return true;
}

// ============================================
// Set Constraint Validation (O(5) for max + full scan for min)
// ============================================
fn check_set_constraints(s0: u32, s1: u32, s2: u32, s3: u32, s4: u32) -> bool {
    if (params.has_set_max_constraints == 0u && params.has_set_min_constraints == 0u) {
        return true;
    }

    // Phase 1: Check max constraints (disabled sets) - O(5)
    // Only need to check sets present in the combination
    if (params.has_set_max_constraints != 0u) {
        let sets = array<u32, 5>(s0, s1, s2, s3, s4);
        for (var i = 0u; i < 5u; i++) {
            let set_id = sets[i];
            if (set_id >= 128u) { continue; }
            
            // Skip if we've already processed this set_id
            var already_processed = false;
            for (var j = 0u; j < i; j++) {
                if (sets[j] == set_id) { already_processed = true; break; }
            }
            if (already_processed) { continue; }
            
            let flags = get_set_flag(set_id);
            if (flags == 0u) { continue; }
            
            let max_pcs = flags & 0xFFu;
            if (max_pcs > 0u) {
                let count = count_set(set_id, s0, s1, s2, s3, s4);
                if (count >= max_pcs) {
                    return false;
                }
            }
        }
    }
    
    // Phase 2: Check min constraints (required sets) - scan all 128 flags
    // Must check ALL sets because a required set may have 0 pieces in the combination
    if (params.has_set_min_constraints == 0u) {
        return true;
    }

    for (var set_id = 0u; set_id < 128u; set_id++) {
        let flags = get_set_flag(set_id);
        let min_pcs = (flags >> 8u) & 0xFFu;
        if (min_pcs == 0u) { continue; }
        
        let count = count_set(set_id, s0, s1, s2, s3, s4);
        if (count < min_pcs) {
            return false;
        }
    }
    
    return true;
}

// ============================================
// Main Compute Kernel
// ============================================
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(num_workgroups) num_wg: vec3<u32>) {
    // Support 2D dispatch for large combination counts
    let local_idx = gid.x + gid.y * num_wg.x * 256u;

    // Early exit if out of batch bounds
    if (local_idx >= params.batch_size) {
        return;
    }

    // Shard-local combination index (batch_offset + local index). The host
    // owns the JavaScript-safe global index and merges shard results with it.
    let combo_idx = params.batch_offset + local_idx;

    // Decode combination indices from linear index
    let n1 = params.plume_count;
    let n2 = params.sands_count;
    let n3 = params.goblet_count;
    let n4 = params.circlet_count;

    let divisor_1 = n1 * n2 * n3 * n4;
    let divisor_2 = n2 * n3 * n4;
    let divisor_3 = n3 * n4;
    let divisor_4 = n4;

    let i0 = combo_idx / divisor_1;
    let i1 = (combo_idx / divisor_2) % n1;
    let i2 = (combo_idx / divisor_3) % n2;
    let i3 = (combo_idx / divisor_4) % n3;
    let i4 = combo_idx % n4;

    // Bounds check
    if (i0 >= params.flower_count) {
        return;
    }

    // Load only set IDs first so set constraints can early-out without copying
    // full Artifact structs and stat arrays for invalid combinations.
    let flower_idx = params.flower_offset + i0;
    let plume_idx = params.plume_offset + i1;
    let sands_idx = params.sands_offset + i2;
    let goblet_idx = params.goblet_offset + i3;
    let circlet_idx = params.circlet_offset + i4;

    let s0 = artifacts[flower_idx].set_id;
    let s1 = artifacts[plume_idx].set_id;
    let s2 = artifacts[sands_idx].set_id;
    let s3 = artifacts[goblet_idx].set_id;
    let s4 = artifacts[circlet_idx].set_id;

    // Check set constraints before stat accumulation to avoid work on invalid combinations.
    if (!check_set_constraints(s0, s1, s2, s3, s4)) {
        // Invalidity is separate from the numeric score: zero is a valid
        // objective value, and a feature may also produce a finite negative
        // value. The host discards only non-finite result entries.
        // Make the NaN payload runtime-dependent. A constant bitcast to NaN is
        // rejected by WGSL constant evaluation on Chromium/Dawn.
        result_values[local_idx] = bitcast<f32>(0x7fc00000u | (local_idx & 0x003fffffu));
        return;
    }

    // Initialize stats from base stats and artifact stats in one pass.
    // Read stats directly from storage by artifact index instead of copying
    // whole Artifact structs into private variables. This avoids a large
    // per-invocation private copy of five stat arrays and helps occupancy.
    var stats: array<f32, ${statCount}>;
    for (var s = 0u; s < ${statCount}u; s++) {
        stats[s] = get_base_stat(s)
            + artifacts[flower_idx].stats[s]
            + artifacts[plume_idx].stats[s]
            + artifacts[sands_idx].stats[s]
            + artifacts[goblet_idx].stats[s]
            + artifacts[circlet_idx].stats[s];
    }

    // Apply static set bonus stats before variation dispatch, matching CPU sdata.concatFunc.
    apply_set_bonuses(&stats, s0, s1, s2, s3, s4);

    let set_key = compute_set_key(s0, s1, s2, s3, s4);
    let variation = set_to_variation[set_key];

    // Constraints use active combat stats, matching the CPU path. Each
    // variation-specific checker snapshots only the lanes it mutates and
    // restores them by assignment, keeping the objective input bit-exact.
    if (params.has_stat_constraints != 0u) {
        if (!dispatch_stat_constraints(variation, &stats)) {
            result_values[local_idx] = bitcast<f32>(0x7fc00000u | (local_idx & 0x003fffffu));
            return;
        }
    }

    let damage = dispatch_variation(variation, &stats);

    // Store result based on damage_index: 0=normal, 1=crit, 2=average
    var selected_damage = damage[2];  // default to average
    if (params.damage_index == 0u) {
        selected_damage = damage[0];  // normal
    } else if (params.damage_index == 1u) {
        selected_damage = damage[1];  // crit
    }

    result_values[local_idx] = selected_damage;
}
`;
    }

    /**
     * Build variation ID to index mapping
     * @returns {Map}
     */
    buildVariationMap() {
        const map = new Map();
        for (const variation of [...this.variations.values()]
            .sort((left, right) => left.index - right.index)) {
            map.set(variation.id, variation.index);
        }
        return map;
    }

    /**
     * Get stat index map
     * @returns {Object}
     */
    getStatIndexMap() {
        return this.globalStatIndexMap;
    }
}

function compareStrings(left, right) {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
}
