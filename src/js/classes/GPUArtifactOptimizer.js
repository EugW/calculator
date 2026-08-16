/**
 * GPU-Accelerated Artifact Optimizer
 * Uses WebGPU compute shaders to evaluate artifact combinations
 */

import { WGSLMegaKernelCompiler } from "./Feature2/WGSLCompiler";
import {
    MAX_GPU_STAT_CONSTRAINTS,
    normalizeSetConstraintThresholds,
    normalizeStatConstraintBounds,
} from "./OptimizerConstraints";
import { resolveOptimizationPlanVariation } from "./OptimizationPlan";
import {
    GPU_TOP_K_CAPACITY,
    GPU_TOP_K_ENTRY_BYTES,
    GPU_TOP_K_MAX_BATCH_COMBINATIONS,
    createGPUTopKReductionPlan,
    decodeGPUTopKEntries,
    getGPUEntryTopKShader,
    getGPUScoreTopKShader,
} from "./GPUTopK";

const MAX_GPU_SET_COUNT = 128;
const SET_BONUS_LEVELS = MAX_GPU_SET_COUNT * 2;
const VARIATION_LOOKUP_SIZE = 257 + MAX_GPU_SET_COUNT * MAX_GPU_SET_COUNT;
const DEFAULT_BATCH_SIZE = 1024 * 1024;
const MAX_GPU_SHARD_COMBINATIONS = 0xFFFFFFFF;
const MAX_RETAINED_BATCH_PROFILES = 2048;
const GPU_PROGRESS_INTERVAL_MS = 100;
const GPU_QUEUE_CHECKPOINT_BATCHES = 64;
const GPU_SHARD_TOP_K_MERGE_COUNT = GPU_TOP_K_CAPACITY * 2;
const GPU_SLOT_NAMES = Object.freeze(['flower', 'plume', 'sands', 'goblet', 'circlet']);

/**
 * Plan a row-major Cartesian traversal as contiguous shards whose local linear
 * indices fit WGSL's u32 arithmetic. Global indices remain safe JavaScript
 * integers and are never sent to the shader.
 *
 * @param {Object} counts - Artifact counts keyed by slot name
 * @param {number} maxShardCombinations - Inclusive per-shard product limit
 * @returns {Object}
 */
export function createGPUCombinationShardPlan(
    counts,
    maxShardCombinations = MAX_GPU_SHARD_COMBINATIONS
) {
    if (
        !Number.isSafeInteger(maxShardCombinations) ||
        maxShardCombinations < 1 ||
        maxShardCombinations > MAX_GPU_SHARD_COMBINATIONS
    ) {
        throw new RangeError(
            `GPU shard limit must be an integer from 1 through ${MAX_GPU_SHARD_COMBINATIONS}; got ${maxShardCombinations}`
        );
    }

    const dimensions = GPU_SLOT_NAMES.map((slot) => counts[slot]);
    let totalCombinations = 1;
    for (let axis = 0; axis < dimensions.length; axis++) {
        const count = dimensions[axis];
        if (!Number.isSafeInteger(count) || count < 1) {
            throw new RangeError(
                `GPU optimizer requires a positive safe-integer ${GPU_SLOT_NAMES[axis]} count; got ${count}`
            );
        }
        totalCombinations *= count;
        if (!Number.isSafeInteger(totalCombinations)) {
            throw new RangeError(
                `GPU optimizer Cartesian product exceeds JavaScript's safe-integer index range at ${totalCombinations} combinations`
            );
        }
    }

    let splitAxis = dimensions.length - 1;
    let suffixCombinations = 1;
    for (let axis = dimensions.length - 1; axis >= 0; axis--) {
        if (suffixCombinations <= maxShardCombinations) {
            splitAxis = axis;
        }
        if (axis > 0) {
            const nextSuffix = suffixCombinations * dimensions[axis];
            if (nextSuffix > maxShardCombinations) {
                break;
            }
            suffixCombinations = nextSuffix;
        }
    }

    let prefixCombinations = 1;
    for (let axis = 0; axis < splitAxis; axis++) {
        prefixCombinations *= dimensions[axis];
    }

    const splitCount = Math.min(
        dimensions[splitAxis],
        Math.floor(maxShardCombinations / suffixCombinations)
    );
    const shardsPerPrefix = Math.ceil(dimensions[splitAxis] / splitCount);
    const shardCount = prefixCombinations * shardsPerPrefix;

    return Object.freeze({
        dimensions: Object.freeze(dimensions),
        totalCombinations,
        maxShardCombinations,
        splitAxis,
        splitSlot: GPU_SLOT_NAMES[splitAxis],
        suffixCombinations,
        prefixCombinations,
        splitCount,
        shardsPerPrefix,
        shardCount,
        maximumShardCombinations: Math.min(
            totalCombinations,
            splitCount * suffixCombinations
        ),
    });
}

/**
 * Lazily enumerate shard descriptors in the original row-major order.
 * Each descriptor covers [globalStart, globalStart + combinationCount).
 *
 * @param {Object} plan
 */
export function* iterateGPUCombinationShards(plan) {
    const {
        dimensions,
        splitAxis,
        prefixCombinations,
        splitCount,
        suffixCombinations,
    } = plan;
    let globalStart = 0;
    let shardIndex = 0;

    for (let prefixIndex = 0; prefixIndex < prefixCombinations; prefixIndex++) {
        const prefixStarts = new Array(dimensions.length).fill(0);
        let remainingPrefix = prefixIndex;
        for (let axis = splitAxis - 1; axis >= 0; axis--) {
            prefixStarts[axis] = remainingPrefix % dimensions[axis];
            remainingPrefix = Math.floor(remainingPrefix / dimensions[axis]);
        }

        for (let start = 0; start < dimensions[splitAxis]; start += splitCount) {
            const starts = prefixStarts.slice();
            const shardCounts = dimensions.slice();
            for (let axis = 0; axis < splitAxis; axis++) {
                shardCounts[axis] = 1;
            }
            starts[splitAxis] = start;
            shardCounts[splitAxis] = Math.min(
                splitCount,
                dimensions[splitAxis] - start
            );
            const combinationCount = shardCounts[splitAxis] * suffixCombinations;

            yield {
                index: shardIndex++,
                globalStart,
                combinationCount,
                starts,
                counts: shardCounts,
            };
            globalStart += combinationCount;
        }
    }
}

/**
 * Count batches without materializing the shard list.
 *
 * @param {Object} plan
 * @param {number} batchSize
 * @returns {number}
 */
export function countGPUCombinationBatches(plan, batchSize) {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
        throw new RangeError(`GPU batch size must be a positive safe integer; got ${batchSize}`);
    }

    const fullShardCount = Math.floor(plan.dimensions[plan.splitAxis] / plan.splitCount);
    const remainder = plan.dimensions[plan.splitAxis] % plan.splitCount;
    const fullShardBatches = Math.ceil(
        plan.splitCount * plan.suffixCombinations / batchSize
    );
    const remainderBatches = remainder === 0
        ? 0
        : Math.ceil(remainder * plan.suffixCombinations / batchSize);

    return plan.prefixCombinations * (
        fullShardCount * fullShardBatches + remainderBatches
    );
}

/**
 * Check if WebGPU is available
 * @returns {Promise<boolean>}
 */
export async function isWebGPUAvailable() {
    if (!navigator.gpu) {
        return false;
    }
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return adapter !== null;
    } catch (e) {
        return false;
    }
}

/**
 * GPU-accelerated artifact optimizer
 */
export class GPUArtifactOptimizer {
    constructor({ maxShardCombinations = MAX_GPU_SHARD_COMBINATIONS } = {}) {
        if (
            !Number.isSafeInteger(maxShardCombinations) ||
            maxShardCombinations < 1 ||
            maxShardCombinations > MAX_GPU_SHARD_COMBINATIONS
        ) {
            throw new RangeError(
                `GPU shard limit must be an integer from 1 through ${MAX_GPU_SHARD_COMBINATIONS}; got ${maxShardCombinations}`
            );
        }
        this.device = null;
        this.pipeline = null;
        this.bindGroupLayout = null;
        this.megaKernel = null;
        this.statIndexMap = null;
        this.variationMap = null;
        this.optimizationPlan = null;
        this.maxShardCombinations = maxShardCombinations;
        this.topKBindGroupLayout = null;
        this.topKScorePipeline = null;
        this.topKEntryPipeline = null;
    }

    now() {
        return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    }

    /**
     * Prepare the feature-independent score/entry reduction pipelines once per
     * device. Every GPU optimization uses this fixed-width top-20 path.
     *
     * @returns {Promise<Object>}
     */
    async ensureTopKPipelines() {
        if (this.topKScorePipeline && this.topKEntryPipeline && this.topKBindGroupLayout) {
            return {reused: true, totalMs: 0};
        }

        const started = this.now();
        this.topKBindGroupLayout = null;
        this.topKScorePipeline = null;
        this.topKEntryPipeline = null;

        const scoreModule = this.device.createShaderModule({
            code: getGPUScoreTopKShader(),
        });
        const entryModule = this.device.createShaderModule({
            code: getGPUEntryTopKShader(),
        });
        const moduleEntries = [
            ['score', scoreModule],
            ['entry', entryModule],
        ];
        for (const [name, module] of moduleEntries) {
            const info = await module.getCompilationInfo();
            for (const message of info.messages) {
                if (message.type === 'error') {
                    throw new Error(
                        `WGSL top-K ${name} reduction compilation failed: ${message.message}`
                    );
                }
                if (message.type === 'warning') {
                    console.warn(`WGSL top-K ${name} reduction warning:`, message.message);
                }
            }
        }

        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
            ],
        });
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
        });
        const scorePipeline = this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: {module: scoreModule, entryPoint: 'main'},
        });
        const entryPipeline = this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: {module: entryModule, entryPoint: 'main'},
        });

        this.topKBindGroupLayout = bindGroupLayout;
        this.topKScorePipeline = scorePipeline;
        this.topKEntryPipeline = entryPipeline;
        return {reused: false, totalMs: this.now() - started};
    }

    /**
     * Initialize WebGPU device
     * @returns {Promise<boolean>}
     */
    async initialize() {
        if (!navigator.gpu) {
            console.warn('WebGPU not supported');
            return false;
        }

        try {
            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance',
            });

            if (!adapter) {
                console.warn('No WebGPU adapter found');
                return false;
            }

            // We now use only 4 storage buffers (3 read-only + 1 read-write)
            // Down from 9, for broader device compatibility
            const requiredStorageBuffers = 4;
            if (adapter.limits.maxStorageBuffersPerShaderStage < requiredStorageBuffers) {
                console.warn(`WebGPU adapter only supports ${adapter.limits.maxStorageBuffersPerShaderStage} storage buffers, need ${requiredStorageBuffers}`);
                return false;
            }

            const device = await adapter.requestDevice({
                requiredLimits: {
                    maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
                    maxBufferSize: adapter.limits.maxBufferSize,
                    maxStorageBuffersPerShaderStage: requiredStorageBuffers,
                },
            });
            this.device = device;
            this.topKBindGroupLayout = null;
            this.topKScorePipeline = null;
            this.topKEntryPipeline = null;

            // Store limits for autoscaling
            this.maxStorageBufferBindingSize = adapter.limits.maxStorageBufferBindingSize;
            this.maxBufferSize = adapter.limits.maxBufferSize;

            device.lost.then((info) => {
                console.error('WebGPU device lost:', info.message);
                if (this.device === device) {
                    this.device = null;
                    this.topKBindGroupLayout = null;
                    this.topKScorePipeline = null;
                    this.topKEntryPipeline = null;
                }
            });

            return true;
        } catch (e) {
            console.error('WebGPU initialization failed:', e);
            return false;
        }
    }

    /**
     * Prepare the compute pipeline from a canonical shared optimization plan.
     * A legacy feature-variant map is accepted only for isolated compatibility
     * tests; production callers bind all semantics through OptimizationPlan.
     * @param {Object} planOrFeatureVariants
     * @param {Object} buildData - Build data with base stats
     */
    async preparePipeline(planOrFeatureVariants, buildData) {
        if (!this.device) {
            throw new Error('WebGPU not initialized');
        }

        // A failed re-prepare must never leave an old executable pipeline
        // paired with newly supplied semantics or layouts.
        this.pipeline = null;
        this.bindGroupLayout = null;
        this.megaKernel = null;
        this.statIndexMap = null;
        this.variationMap = null;
        this.optimizationPlan = null;
        this.featureVariants = null;

        const profile = {};
        const prepareStart = this.now();
        let stageStart = this.now();

        const isPlan = planOrFeatureVariants?.kind === 'optimization-plan';
        const optimizationPlan = isPlan ? planOrFeatureVariants : null;
        if (isPlan) {
            validateOptimizationPlanForGPU(optimizationPlan);
        }
        this.optimizationPlan = optimizationPlan;
        this.featureVariants = isPlan ? null : planOrFeatureVariants;

        // Build mega-kernel from all variations
        this.megaKernel = new WGSLMegaKernelCompiler();

        if (isPlan) {
            this.megaKernel.addOptimizationPlan(this.optimizationPlan);
        } else {
            for (const [variationId, compiler] of Object.entries(planOrFeatureVariants)) {
                this.megaKernel.addVariation(variationId, compiler);
            }
        }

        const kernelCode = this.megaKernel.getMegaKernel({});
        this.statIndexMap = this.megaKernel.getStatIndexMap();
        this.variationMap = this.megaKernel.buildVariationMap();
        profile.kernelBuildMs = this.now() - stageStart;

        // Create shader module
        stageStart = this.now();
        const shaderModule = this.device.createShaderModule({
            code: kernelCode,
        });
        profile.createShaderModuleMs = this.now() - stageStart;

        // Check for compilation errors
        stageStart = this.now();
        const compilationInfo = await shaderModule.getCompilationInfo();
        profile.compilationInfoMs = this.now() - stageStart;
        for (const message of compilationInfo.messages) {
            if (message.type === 'error') {
                console.error('WGSL compilation error:', message.message);
                throw new Error(`WGSL compilation failed: ${message.message}`);
            } else if (message.type === 'warning') {
                console.warn('WGSL warning:', message.message);
            }
        }

        // Create bind group layout
        // Consolidated bindings: 0=combined_artifacts, 1=set_bonuses, 2=variation_lookup,
        //                        3=result_values, 4=params (uniform with base_stats and constraints)
        stageStart = this.now();
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },  // combined artifacts
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },  // set_bonuses
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },  // set_to_variation
                { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },            // result_values
                { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },            // params
            ],
        });
        profile.createBindGroupLayoutMs = this.now() - stageStart;

        // Create pipeline
        const pipelineDescriptor = {
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [this.bindGroupLayout],
            }),
            compute: {
                module: shaderModule,
                entryPoint: 'main',
            },
        };

        stageStart = this.now();
        this.pipeline = this.device.createComputePipeline(pipelineDescriptor);
        profile.pipelineMode = 'sync';
        profile.createPipelineMs = this.now() - stageStart;
        profile.totalMs = this.now() - prepareStart;
        profile.variationCount = isPlan
            ? this.optimizationPlan.variations.length
            : Object.keys(planOrFeatureVariants).length;
        profile.statCount = Object.keys(this.statIndexMap).length;
        profile.kernelCodeLength = kernelCode.length;
        this.lastPrepareProfile = profile;
    }

    /**
     * Convert artifacts to GPU buffer format
     * @param {Array} artifacts - Array of artifacts
     * @param {Object} statIndexMap - Stat name to index mapping
     * @returns {ArrayBuffer}
     */
    artifactsToBuffer(artifacts, statIndexMap) {
        const statCount = Object.keys(statIndexMap).length;
        // No padding - just stats + set_id
        const artifactSize = statCount + 1;
        const bytesPerArtifact = artifactSize * 4;

        // Create ArrayBuffer and views for both f32 and u32 access
        const arrayBuffer = new ArrayBuffer(artifacts.length * bytesPerArtifact);
        const floatView = new Float32Array(arrayBuffer);
        const uintView = new Uint32Array(arrayBuffer);

        for (let i = 0; i < artifacts.length; i++) {
            const art = artifacts[i];
            const offset = i * artifactSize;

            // Copy stats as f32
            if (art.calculated) {
                for (const [stat, value] of Object.entries(art.calculated)) {
                    const idx = statIndexMap[stat];
                    if (idx !== undefined) {
                        floatView[offset + idx] = value;
                    }
                }
            }

            // Set ID as u32 (NOT as float!)
            const setName = art.getSetName ? art.getSetName() : art.set;
            const setId = this.getSetIdNumber(setName);
            uintView[offset + statCount] = setId;
            // Padding stays as 0
        }

        return floatView;
    }

    /**
     * Combine all artifact slots into a single buffer with offsets
     * Reduces 5 bindings to 1 for broader device compatibility
     * @param {Object} slots - Artifact slots
     * @param {Object} statIndexMap - Stat name to index mapping
     * @returns {Object} { buffer, offsets, counts }
     */
    artifactsToCombinedBuffer(slots, statIndexMap) {
        const statCount = Object.keys(statIndexMap).length;
        const artifactSize = statCount + 1;
        const slotNames = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
        const counts = {};
        const offsets = {};
        
        let totalArtifacts = 0;
        for (const slot of slotNames) {
            offsets[slot] = totalArtifacts;
            counts[slot] = slots[slot].length;
            totalArtifacts += slots[slot].length;
        }
        
        const arrayBuffer = new ArrayBuffer(totalArtifacts * artifactSize * 4);
        const floatView = new Float32Array(arrayBuffer);
        const uintView = new Uint32Array(arrayBuffer);
        
        let globalIndex = 0;
        for (const slot of slotNames) {
            for (const art of slots[slot]) {
                const offset = globalIndex * artifactSize;
                if (art.calculated) {
                    for (const [stat, value] of Object.entries(art.calculated)) {
                        const idx = statIndexMap[stat];
                        if (idx !== undefined) {
                            floatView[offset + idx] = value;
                        }
                    }
                }
                const setName = art.getSetName ? art.getSetName() : art.set;
                uintView[offset + statCount] = this.getSetIdNumber(setName);
                globalIndex++;
            }
        }
        
        return { buffer: floatView, offsets, counts };
    }

    /**
     * Convert set name to numeric ID
     * @param {string} setName
     * @returns {number}
     */
    getSetIdNumber(setName) {
        if (!this._setIdMap) {
            this._setIdMap = new Map();
            this._setIdCounter = 0;
        }
        if (!this._setIdMap.has(setName)) {
            this._setIdMap.set(setName, this._setIdCounter++);
        }
        return this._setIdMap.get(setName);
    }

    /**
     * Pre-scan all GPU-visible set names to build a deterministic set ID mapping.
     * @param {Object} slots - Artifact slots
     * @param {Object} setData - Set bonus data from ArtifactsSuggest
     * @param {Object} settings - Suggester settings with min/max set constraints
     * @param {Object} variationSource - OptimizationPlan or legacy variants
     */
    preBuildSetIdMap(slots, setData = {}, settings = {}, variationSource = {}) {
        this._setIdMap = new Map();
        this._setIdCounter = 0;
        const setNames = new Set();

        for (const slotName of Object.keys(slots)) {
            for (const art of slots[slotName]) {
                // Get set name - could be property or method
                const setName = art.getSetName ? art.getSetName() : art.set;
                if (setName) {
                    setNames.add(setName);
                }
            }
        }

        for (const setName of Object.keys(setData || {})) {
            setNames.add(setName);
        }

        for (const setName of Object.keys(settings.setMinValues || {})) {
            setNames.add(setName);
        }

        for (const setName of Object.keys(settings.setMaxValues || {})) {
            setNames.add(setName);
        }

        for (const setInfo of getVariationSetInfo(variationSource)) {
            for (const { setName } of setInfo) {
                if (setName) {
                    setNames.add(setName);
                }
            }
        }

        for (const setName of Array.from(setNames).sort()) {
            this._setIdMap.set(setName, this._setIdCounter++);
        }

        if (this._setIdCounter > MAX_GPU_SET_COUNT) {
            throw new RangeError(
                `GPU optimizer supports at most ${MAX_GPU_SET_COUNT} visible artifact sets; got ${this._setIdCounter}`
            );
        }
    }

    /**
     * Compute the set key the same way the GPU shader does
     * @param {number[]} setIds - Array of 5 set IDs
     * @returns {number}
     */
    computeSetKeyFromIds(setIds) {
        // Count pieces per set
        const counts = {};
        for (const id of setIds) {
            if (id !== undefined && id < 128) {
                counts[id] = (counts[id] || 0) + 1;
            }
        }

        // Compact collision-free key:
        //   0             -> default/no dynamic set
        //   1+s           -> one 2pc set
        //   129+s         -> one 4pc set
        //   257+lo*128+hi -> two 2pc sets, lo < hi
        const sortedSetIds = Object.keys(counts).map(Number).sort((a, b) => a - b);
        const twoPieceSets = [];

        for (const setId of sortedSetIds) {
            const count = counts[setId];
            if (count >= 4) {
                return 129 + setId;
            } else if (count >= 2) {
                twoPieceSets.push(setId);
            }
        }

        if (twoPieceSets.length >= 2) {
            return 257 + twoPieceSets[0] * MAX_GPU_SET_COUNT + twoPieceSets[1];
        }
        if (twoPieceSets.length === 1) {
            return 1 + twoPieceSets[0];
        }

        return 0;
    }

    /**
     * Convert base stats to GPU buffer format
     * @param {Object} stats - Stats object
     * @param {Object} statIndexMap - Stat name to index mapping
     * @returns {Float32Array}
     */
    statsToBuffer(stats, statIndexMap) {
        const statCount = Object.keys(statIndexMap).length;
        const buffer = new Float32Array(statCount);

        for (const [stat, idx] of Object.entries(statIndexMap)) {
            buffer[idx] = stats[stat] || 0;
        }

        return buffer;
    }

    /**
     * Build set bonus buffer
     * The shader applies bonuses separately: 2-piece at index set_id*2, 4-piece at set_id*2+1
     * When count >= 4, BOTH indices are added, so we need to store:
     *   - Index set_id*2: 2-piece bonus stats
     *   - Index set_id*2+1: ADDITIONAL 4-piece stats (delta from 2-piece)
     *
     * setData[setId][pieces].stats contains CUMULATIVE stats up to that piece count
     * So setData[setId][4].stats = 2pc + 4pc stats combined
     * We need to compute the delta for 4-piece
     *
     * Respects settings.setMaxValues to skip disabled set bonuses:
     * - setMaxValues[setName] = N means "don't apply >= N piece bonus"
     * - If setMaxValues['marechausse_hunter'] = 4, skip the 4pc bonus
     * - If setMaxValues['some_set'] = 2, skip both 2pc and 4pc bonuses
     *
     * @param {Object} setData - Set bonus data from ArtifactsSuggest
     * @param {Object} statIndexMap - Stat name to index mapping
     * @param {Object} settings - Settings with setMaxValues for disabled sets
     * @returns {Float32Array}
     */
    setBonusesToBuffer(setData, statIndexMap, settings = {}) {
        const statCount = Object.keys(statIndexMap).length;
        // 128 possible set IDs * 2 bonus levels.
        const buffer = new Float32Array(SET_BONUS_LEVELS * statCount);

        if (!setData) {
            console.warn('GPU: setData is null/undefined!');
            return buffer;
        }

        const setMaxValues = settings.setMaxValues || {};

        for (const [setId, piecesData] of Object.entries(setData)) {
            const setIdNum = this.getSetIdNumber(setId);
            if (setIdNum >= MAX_GPU_SET_COUNT) {
                continue;
            }

            // Check if this set is limited by setMaxValues
            // setMaxValues keys match setData keys directly (e.g., "MarechausseeHunter")
            const maxPieces = setMaxValues[setId];
            const maxPiecesNum = maxPieces !== undefined ? parseInt(maxPieces, 10) : Infinity;

            // Get 2-piece stats (if any)
            const twopiece = piecesData['2'];
            const fourpiece = piecesData['4'];

            // Store 2-piece bonus at index setIdNum * 2
            // Skip if setMaxValues limits us to < 2 pieces
            const skip2pc = maxPiecesNum <= 2;
            if (twopiece && twopiece.stats && !skip2pc) {
                const offset = setIdNum * 2 * statCount;
                for (const [stat, value] of Object.entries(twopiece.stats)) {
                    const idx = statIndexMap[stat];
                    if (idx !== undefined) {
                        buffer[offset + idx] = value;
                    }
                }
            }

            // Store 4-piece DELTA at index setIdNum * 2 + 1
            // Skip if setMaxValues limits us to < 4 pieces
            const skip4pc = maxPiecesNum <= 4;
            if (fourpiece && fourpiece.stats && !skip4pc) {
                const offset = (setIdNum * 2 + 1) * statCount;
                const twopieceStats = twopiece ? twopiece.stats : {};

                for (const [stat, value] of Object.entries(fourpiece.stats)) {
                    const idx = statIndexMap[stat];
                    if (idx !== undefined) {
                        // Store the delta: 4pc cumulative minus 2pc
                        const twopieceValue = twopieceStats[stat] || 0;
                        const deltaValue = value - twopieceValue;
                        buffer[offset + idx] = deltaValue;
                    }
                }
            }
        }

        return buffer;
    }

    /**
     * Build stat constraint data for the params uniform buffer from the shared,
     * strictly normalized CPU/GPU bounds.
     *
     * @param {Array.<Object>} normalizedBounds
     * @param {Object} statIndexMap - Stat name to array index mapping
     * @returns {Object} - { data: number[], count: number }
     */
    buildConstraintData(normalizedBounds, statIndexMap) {
        const constraints = [];
        const statBounds = new Map();

        if (!Array.isArray(normalizedBounds)) {
            throw new TypeError('GPU optimizer constraint bounds must be an array');
        }

        for (const bound of normalizedBounds) {
            if (
                !bound ||
                typeof bound.stat !== 'string' ||
                !bound.stat ||
                (bound.op !== 'min' && bound.op !== 'max') ||
                !Number.isFinite(bound.value)
            ) {
                throw new RangeError('GPU optimizer received an invalid normalized stat constraint');
            }
            const f32Value = Math.fround(bound.value);
            if (!Number.isFinite(f32Value)) {
                throw new RangeError(
                    `GPU optimizer constraint ${bound.stat}_${bound.op}=${bound.value} is outside the finite f32 domain`
                );
            }

            if (!statBounds.has(bound.stat)) {
                statBounds.set(bound.stat, {
                    min: undefined,
                    max: undefined,
                    isRealTotal: !!bound.isRealTotal,
                });
            }
            const grouped = statBounds.get(bound.stat);
            if (grouped.isRealTotal !== !!bound.isRealTotal) {
                throw new RangeError(`GPU optimizer constraint metadata disagrees for "${bound.stat}"`);
            }
            grouped[bound.op] = f32Value;
        }

        if (statBounds.size > MAX_GPU_STAT_CONSTRAINTS) {
            throw new RangeError(
                `GPU optimizer supports at most ${MAX_GPU_STAT_CONSTRAINTS} constrained stats; got ${statBounds.size}`
            );
        }

        for (const [stat, bounds] of statBounds) {
            if (bounds.min !== undefined && bounds.max !== undefined && bounds.min > bounds.max) {
                throw new RangeError(`GPU optimizer constraint "${stat}" has min greater than max`);
            }

            const statIndex = statIndexMap[stat];
            const baseIndex = statIndexMap[stat + '_base'];
            const pctIndex = bounds.isRealTotal ? statIndexMap[stat + '_percent'] : undefined;

            // A missing lane must reject the run, never silently remove a user
            // constraint and expand the feasible set.
            if (statIndex === undefined || baseIndex === undefined) {
                throw new RangeError(`GPU constraint stat "${stat}" is missing from the shader stat layout`);
            }
            if (bounds.isRealTotal && pctIndex === undefined) {
                throw new RangeError(`GPU constraint stat "${stat}_percent" is missing from the shader stat layout`);
            }

            constraints.push({
                stat_index: statIndex,
                stat_base_index: baseIndex,
                stat_pct_index: bounds.isRealTotal ? pctIndex : 0xFFFFFFFF,
                min_value: bounds.min !== undefined ? bounds.min : -3.4e38,
                max_value: bounds.max !== undefined ? bounds.max : 3.4e38,
                is_real_total: bounds.isRealTotal ? 1 : 0,
            });
        }

        // Build flat array for uniform buffer
        // Each constraint: [stat_index, base_index, pct_index, is_real_total, min_value(f32 bits), max_value(f32 bits), pad, pad]
        // Fixed size: 8 constraints * 8 values = 64 u32s
        const CONSTRAINT_SIZE = 8;
        const data = new Uint32Array(MAX_GPU_STAT_CONSTRAINTS * CONSTRAINT_SIZE);
        const floatView = new Float32Array(data.buffer);

        for (let i = 0; i < constraints.length; i++) {
            const c = constraints[i];
            const offset = i * CONSTRAINT_SIZE;

            data[offset + 0] = c.stat_index;
            data[offset + 1] = c.stat_base_index;
            data[offset + 2] = c.stat_pct_index;
            data[offset + 3] = c.is_real_total;
            floatView[offset + 4] = c.min_value;
            floatView[offset + 5] = c.max_value;
            data[offset + 6] = 0;
            data[offset + 7] = 0;
        }

        return { data, count: constraints.length };
    }

    /**
     * Build set flags array for the params uniform buffer.
     * Handles both setMaxValues (disabled set bonuses) and setMinValues (required sets).
     * Returns a 128-entry array where each entry encodes constraints for one set.
     *
     * Flag encoding per set:
     *   bits 0-7:  max_pieces (0=unlimited, 2=reject >=2pc, 4=reject >=4pc)
     *   bits 8-15: min_pieces (0=none required, 2=require 2+, 4=require 4+)
     *
     * @param {Object} settings - Settings with setMaxValues and setMinValues
     * @returns {Uint32Array} - 128-entry flags array
     */
    buildSetFlagsData(settings) {
        const flags = new Uint32Array(128);
        const setMaxValues = settings.setMaxValues || {};
        const setMinValues = settings.setMinValues || {};

        // Add max constraints (disabled sets): reject if count >= pieces
        for (const [setName, pieces] of Object.entries(setMaxValues)) {
            const setId = this._setIdMap ? this._setIdMap.get(setName) : undefined;
            if (setId === undefined || setId >= 128) {
                console.warn(`GPU set flags: set "${setName}" not found or out of range`);
                continue;
            }

            const piecesNum = parseInt(pieces, 10);
            // Store in bits 0-7
            flags[setId] = (flags[setId] & 0xFF00) | (piecesNum & 0xFF);
        }

        // Add min constraints (required sets): reject if count < pieces
        for (const [setName, pieces] of Object.entries(setMinValues)) {
            const setId = this._setIdMap ? this._setIdMap.get(setName) : undefined;
            if (setId === undefined || setId >= 128) {
                console.warn(`GPU set flags: required set "${setName}" not found or out of range`);
                continue;
            }

            const piecesNum = parseInt(pieces, 10);
            // Store in bits 8-15
            flags[setId] = (flags[setId] & 0x00FF) | ((piecesNum & 0xFF) << 8);
        }

        return flags;
    }

    hasSetMinConstraints(settings) {
        return Object.keys(settings.setMinValues || {}).length > 0 ? 1 : 0;
    }

    hasSetMaxConstraints(settings) {
        return Object.keys(settings.setMaxValues || {}).length > 0 ? 1 : 0;
    }

    resolveBatchSize(value, totalCombinations) {
        let requested = parseInt(value, 10);
        if (!requested || requested < 1) {
            requested = DEFAULT_BATCH_SIZE;
        }

        const maxBufferBytes = Math.min(
            this.maxStorageBufferBindingSize || requested * 4,
            this.maxBufferSize || requested * 4
        );
        const maxBatchByLimits = Math.max(1, Math.floor(maxBufferBytes / 4));

        return Math.max(1, Math.min(requested, totalCombinations, maxBatchByLimits));
    }

    /**
     * Build variation lookup table
     * Uses the same key encoding as the GPU shader
     * @param {Object|Map} planOrVariationMap - Shared plan or legacy mapping
     * @param {Object} featureVariants - Feature variants with setInfo
     * @returns {Uint32Array}
     */
    buildVariationLookup(planOrVariationMap, featureVariants) {
        if (planOrVariationMap?.kind === 'optimization-plan') {
            return this.buildPlanVariationLookup(planOrVariationMap);
        }

        const variationMap = planOrVariationMap;
        const buffer = new Uint32Array(VARIATION_LOOKUP_SIZE);
        const entries = [];
        let defaultVariation = 0;

        for (const [variationId, idx] of variationMap) {
            // Get set info directly from the compiler (more reliable than parsing)
            const compiler = featureVariants[variationId];
            const setInfo = compiler?.setInfo || [];

            if (setInfo.length === 0) {
                defaultVariation = idx;
                entries.push({ idx, key: 0, setInfo, setIds: [] });
                continue;
            }

            // Build array of set IDs (repeated by piece count)
            const setIds = [];
            for (const { setName, pieces } of setInfo) {
                const setId = this._setIdMap ? this._setIdMap.get(setName) : undefined;
                if (setId !== undefined) {
                    for (let i = 0; i < pieces; i++) {
                        setIds.push(setId);
                    }
                }
            }

            // Compute key the same way GPU does
            const key = this.computeSetKeyFromIds(setIds);
            if (key < buffer.length) {
                entries.push({ idx, key, setInfo, setIds });
            } else {
                console.warn(`GPU variation key ${key} is outside lookup size ${buffer.length}`);
            }
        }

        // Every unrecognized physical set state must use the semantic default,
        // even if future compiler ordering no longer assigns it variation 0.
        buffer.fill(defaultVariation);

        // A semantic single-dynamic-2pc variation remains active when the
        // other two pieces form an ordinary static set. The shader key includes
        // both physical 2pc sets, while compiler.setInfo intentionally lists
        // only variation-bearing sets, so populate those equivalent aliases.
        const dynamicTwoPieceSetIds = new Set();
        for (const entry of entries) {
            const semanticSetIds = [...new Set(entry.setIds)];
            if (entry.setInfo.length === 1 && semanticSetIds.length === 1 && Number(entry.setInfo[0].pieces) === 2) {
                dynamicTwoPieceSetIds.add(semanticSetIds[0]);
            }
        }

        const visibleSetIds = this._setIdMap
            ? [...this._setIdMap.values()].filter((setId) => setId < MAX_GPU_SET_COUNT)
            : [];

        for (const entry of entries) {
            const semanticSetIds = [...new Set(entry.setIds)];
            if (entry.setInfo.length !== 1 || semanticSetIds.length !== 1 || Number(entry.setInfo[0].pieces) !== 2) {
                continue;
            }

            const dynamicSetId = semanticSetIds[0];
            for (const partnerSetId of visibleSetIds) {
                if (partnerSetId === dynamicSetId || dynamicTwoPieceSetIds.has(partnerSetId)) {
                    continue;
                }

                const lo = Math.min(dynamicSetId, partnerSetId);
                const hi = Math.max(dynamicSetId, partnerSetId);
                buffer[257 + lo * MAX_GPU_SET_COUNT + hi] = entry.idx;
            }
        }

        // Explicit semantic entries, especially two-dynamic-2pc combinations,
        // always override the physical aliases above.
        for (const entry of entries) {
            buffer[entry.key] = entry.idx;
        }

        return buffer;
    }

    /**
     * Lower every representable compact GPU set key through the shared plan's
     * pure threshold-selector oracle. Unlike the former alias patching, this
     * also keeps a 2pc semantic variation active for a physical 4pc state and
     * lets an explicit 4pc or mixed-2pc selector win by specificity.
     */
    buildPlanVariationLookup(plan) {
        const buffer = new Uint32Array(VARIATION_LOOKUP_SIZE);
        const invalidVariation = 0xFFFFFFFF;
        const resolveIndex = (counts) => {
            const variation = resolveOptimizationPlanVariation(plan, counts);
            return variation ? variation.index : invalidVariation;
        };
        const defaultIndex = resolveIndex({});
        if (defaultIndex === invalidVariation) {
            throw new RangeError('Optimization plan has no unambiguous default variation');
        }
        buffer.fill(defaultIndex);

        const visibleSets = this._setIdMap
            ? [...this._setIdMap.entries()]
                .filter(([, setId]) => setId < MAX_GPU_SET_COUNT)
                .sort((left, right) => left[1] - right[1])
            : [];

        for (const [setName, setId] of visibleSets) {
            buffer[1 + setId] = resolveIndex({[setName]: 2});
            buffer[129 + setId] = resolveIndex({[setName]: 4});
        }

        for (let i = 0; i < visibleSets.length; ++i) {
            const [leftName, leftId] = visibleSets[i];
            for (let j = i + 1; j < visibleSets.length; ++j) {
                const [rightName, rightId] = visibleSets[j];
                const lo = Math.min(leftId, rightId);
                const hi = Math.max(leftId, rightId);
                buffer[257 + lo * MAX_GPU_SET_COUNT + hi] = resolveIndex({
                    [leftName]: 2,
                    [rightName]: 2,
                });
            }
        }

        return buffer;
    }

    /**
     * The compact shader model has cumulative thresholds at 2pc and 4pc.
     * Reject reachable 1pc/3pc/5pc changes explicitly instead of silently
     * scoring them as the nearest 2pc/4pc state.
     */
    validateSetBonusModel(setData = {}, slots = {}, variationSource = {}) {
        const reachablePieces = new Map();
        for (const [slotName, artifacts] of Object.entries(slots || {})) {
            const seenInSlot = new Set();
            for (const art of artifacts || []) {
                const setName = art.getSetName ? art.getSetName() : art.set;
                if (setName) {
                    seenInSlot.add(setName);
                }
            }
            for (const setName of seenInSlot) {
                reachablePieces.set(setName, (reachablePieces.get(setName) || 0) + 1);
            }
        }

        for (const [setName, piecesData] of Object.entries(setData || {})) {
            const reachable = reachablePieces.get(setName) || 0;
            if (reachable >= 1 && !setBonusEntriesEqual(piecesData?.['1'], undefined)) {
                throw new RangeError(`GPU optimizer does not support a reachable 1-piece effect for set "${setName}"`);
            }
            if (reachable >= 3 && !setBonusEntriesEqual(piecesData?.['3'], piecesData?.['2'])) {
                throw new RangeError(`GPU optimizer does not support a distinct 3-piece effect for set "${setName}"`);
            }
            if (reachable >= 5 && !setBonusEntriesEqual(piecesData?.['5'], piecesData?.['4'])) {
                throw new RangeError(`GPU optimizer does not support a distinct 5-piece effect for set "${setName}"`);
            }
        }

        for (const setInfo of getVariationSetInfo(variationSource)) {
            for (const { setName, pieces } of setInfo) {
                const threshold = Number(pieces);
                if (threshold !== 2 && threshold !== 4) {
                    throw new RangeError(
                        `GPU optimizer variation for set "${setName}" uses unsupported ${pieces}-piece semantics`
                    );
                }
            }
        }
    }

    /**
     * Run the GPU optimization in batches to prevent OOM
     * @param {Object} opts - Options including artifacts, buildData, etc.
     * @returns {Promise<Array>} - Top results
     */
    async optimize(opts) {
        const {
            slots,
            buildData,
            setData,
            settings: requestedSettings,
            limit = 20,
            damageIndex: requestedDamageIndex,
            batchSize: requestedBatchSize,
            callback,
            constraintBounds: requestedConstraintBounds,
        } = opts;

        if (!this.device || !this.pipeline) {
            throw new Error('GPU optimizer not prepared');
        }

        const plan = this.optimizationPlan;
        if (plan && (
            Object.prototype.hasOwnProperty.call(opts, 'settings') ||
            Object.prototype.hasOwnProperty.call(opts, 'damageIndex') ||
            Object.prototype.hasOwnProperty.call(opts, 'constraintBounds')
        )) {
            throw new TypeError(
                'GPU optimizer semantics are bound by OptimizationPlan; settings, damageIndex, and constraintBounds cannot be overridden'
            );
        }
        const rawSettings = plan
            ? {
                setMinValues: plan.setConstraints.minValues,
                setMaxValues: plan.setConstraints.maxValues,
            }
            : (requestedSettings || {});
        const damageIndex = plan
            ? plan.objective.vectorIndex
            : (requestedDamageIndex === undefined ? 2 : requestedDamageIndex);
        const constraintBounds = plan
            ? plan.statConstraints.bounds
            : requestedConstraintBounds;
        const variationSource = plan || this.featureVariants;

        if (limit !== GPU_TOP_K_CAPACITY) {
            throw new RangeError(
                `GPU optimizer result limit is fixed at ${GPU_TOP_K_CAPACITY}; got ${limit}`
            );
        }
        if (!Number.isInteger(damageIndex) || damageIndex < 0 || damageIndex > 2) {
            throw new RangeError(`GPU optimizer damageIndex must be 0, 1, or 2, got ${damageIndex}`);
        }

        const profile = {
            totalCombinations: 0,
            shardCount: 0,
            numBatches: 0,
            resultMode: 'gpu-shard-top-k-20',
            totalReadbackBytes: 0,
            readbackCount: 0,
            reductionDispatches: 0,
            shardMergeDispatches: 0,
            queueCheckpointCount: 0,
            stageMs: {},
            batches: [],
            omittedBatchProfiles: 0,
            batchTimingTotalsMs: {
                paramsWriteMs: 0,
                encodeSubmitMs: 0,
                queueWaitMs: 0,
                completionWaitMs: 0,
                cpuTopKMs: 0,
            },
        };
        const optimizeStart = this.now();
        const addStageTime = (name, start) => {
            profile.stageMs[name] = (profile.stageMs[name] || 0) + this.now() - start;
        };
        let stageStart;

        // Calculate total combinations
        const counts = {
            flower: slots.flower.length,
            plume: slots.plume.length,
            sands: slots.sands.length,
            goblet: slots.goblet.length,
            circlet: slots.circlet.length,
        };
        const totalCombinations = counts.flower * counts.plume * counts.sands * counts.goblet * counts.circlet;
        if (totalCombinations < 1) {
            throw new RangeError(`GPU optimizer requires at least one artifact in every slot; got ${totalCombinations} combinations`);
        }
        if (!Number.isSafeInteger(totalCombinations)) {
            throw new RangeError(
                `GPU optimizer Cartesian product must fit JavaScript's safe-integer index range; got ${totalCombinations} combinations`
            );
        }
        const shardPlan = createGPUCombinationShardPlan(
            counts,
            this.maxShardCombinations
        );
        profile.totalCombinations = totalCombinations;
        profile.shardCount = shardPlan.shardCount;
        profile.maxShardCombinations = shardPlan.maximumShardCombinations;
        profile.shardSplitSlot = shardPlan.splitSlot;

        // Production passes the exact bounds parsed by ArtifactsSuggest. Direct
        // API callers are normalized strictly and validated before allocating
        // any GPU buffers.
        stageStart = this.now();
        const normalizedConstraintBounds = constraintBounds === undefined
            ? normalizeStatConstraintBounds(rawSettings.stats)
            : constraintBounds;
        const constraintData = this.buildConstraintData(normalizedConstraintBounds, this.statIndexMap);
        const constraintCount = constraintData.count;
        const hasStatConstraints = constraintCount > 0 ? 1 : 0;
        addStageTime('constraintBuildMs', stageStart);

        stageStart = this.now();
        const normalizedSetConstraints = plan ? null : normalizeSetConstraintThresholds(
            rawSettings.setMinValues,
            rawSettings.setMaxValues
        );
        const settings = plan
            ? rawSettings
            : Object.assign({}, rawSettings, {
                setMinValues: normalizedSetConstraints.minValues,
                setMaxValues: normalizedSetConstraints.maxValues,
            });
        this.validateSetBonusModel(setData, slots, variationSource);
        addStageTime('setModelValidationMs', stageStart);

        if (callback) {
            callback(0, totalCombinations, 0);
        }
        let lastProgressCallbackAt = this.now();

        // Compile the feature-independent reduction before allocating any
        // per-run buffers so a shader/pipeline failure cannot leak them.
        stageStart = this.now();
        const topKPrepareProfile = await this.ensureTopKPipelines();
        profile.topKPipelineReused = topKPrepareProfile.reused;
        profile.topKPipelinePrepareMs = topKPrepareProfile.totalMs;
        addStageTime('topKPipelinePrepareMs', stageStart);

        // Pre-build set ID mapping before any buffer encodes set names.
        stageStart = this.now();
        this.preBuildSetIdMap(slots, setData, settings, variationSource);
        addStageTime('setIdMapMs', stageStart);

        const runBuffers = [];
        const trackBuffer = (buffer) => {
            runBuffers.push(buffer);
            return buffer;
        };

        try {
        // Now build variation lookup using the set ID mapping
        stageStart = this.now();
        const variationLookup = trackBuffer(this.createStorageBuffer(
            this.buildVariationLookup(plan || this.variationMap, this.featureVariants)
        ));
        addStageTime('variationLookupUploadMs', stageStart);

        // Create single combined artifact buffer for all slots (saves 4 bindings)
        stageStart = this.now();
        const { buffer: artifactsData, offsets: artifactOffsets } =
            this.artifactsToCombinedBuffer(slots, this.statIndexMap);
        const artifactsBuffer = trackBuffer(this.createStorageBuffer(artifactsData));
        addStageTime('artifactUploadMs', stageStart);

        // Base stats are now embedded in params uniform buffer
        stageStart = this.now();
        const baseStatsData = this.statsToBuffer(buildData.stats, this.statIndexMap);
        addStageTime('baseStatsBuildMs', stageStart);

        // Set bonus buffer - contains static set bonus stats (e.g., +18% ATK from 2-piece)
        // This is applied by apply_set_bonuses() in the shader BEFORE variation dispatch
        // Pass settings to respect setMaxValues (disabled set bonuses)
        stageStart = this.now();
        const setBonusData = this.setBonusesToBuffer(setData, this.statIndexMap, settings);
        const setBonusBuffer = trackBuffer(this.createStorageBuffer(setBonusData));
        addStageTime('setBonusUploadMs', stageStart);

        // Set flags for disabled/required sets (128 entries, one per possible set)
        // Embedded in params uniform buffer
        stageStart = this.now();
        const setFlagsData = this.buildSetFlagsData(settings);
        const hasSetMinConstraints = this.hasSetMinConstraints(settings);
        const hasSetMaxConstraints = this.hasSetMaxConstraints(settings);
        addStageTime('setFlagsBuildMs', stageStart);

        const batchSize = this.resolveBatchSize(
            requestedBatchSize,
            Math.min(
                shardPlan.maximumShardCombinations,
                GPU_TOP_K_MAX_BATCH_COMBINATIONS
            )
        );
        const numBatches = countGPUCombinationBatches(shardPlan, batchSize);
        profile.numBatches = numBatches;
        profile.batchSize = batchSize;
        profile.requestedBatchSize = requestedBatchSize || 'auto';

        // Accumulate top-K across all batches
        let globalTopK = [];
        let globalMinValue = 0;
        let globalMinIndex = -1;
        let processedCount = 0;
        const recomputeGlobalMin = () => {
            globalMinIndex = 0;
            globalMinValue = globalTopK[0].value;
            for (let i = 1; i < globalTopK.length; i++) {
                if (
                    globalTopK[i].value < globalMinValue ||
                    (
                        globalTopK[i].value === globalMinValue &&
                        globalTopK[i].index > globalTopK[globalMinIndex].index
                    )
                ) {
                    globalMinValue = globalTopK[i].value;
                    globalMinIndex = i;
                }
            }
        };

        // Reusable buffers for batches
        stageStart = this.now();
        const maxBatchCount = Math.min(
            batchSize,
            shardPlan.maximumShardCombinations
        );
        const resultValuesBuffer = trackBuffer(this.device.createBuffer({
            size: maxBatchCount * 4,
            usage: GPUBufferUsage.STORAGE,
        }));

        const maxReductionPlan = createGPUTopKReductionPlan(maxBatchCount);
        const candidateBufferSize =
            maxReductionPlan.candidateCapacity * GPU_TOP_K_ENTRY_BYTES;
        const candidateBuffers = {
            a: trackBuffer(this.device.createBuffer({
                size: candidateBufferSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            })),
            b: trackBuffer(this.device.createBuffer({
                size: candidateBufferSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            })),
        };
        const reductionParamsBuffers = maxReductionPlan.passes.map(() => {
            return trackBuffer(this.device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            }));
        });
        const topKResources = {
            maxReductionPlan,
            candidateBuffers,
            reductionParamsBuffers,
            scoreBindGroup: null,
            entryBindGroups: [],
            shardMergeBindGroup: null,
        };
        profile.topKCandidateCapacity = maxReductionPlan.candidateCapacity;
        profile.maxReductionPasses = maxReductionPlan.passes.length;

        const stagingBufferSize = GPU_TOP_K_CAPACITY * GPU_TOP_K_ENTRY_BYTES;
        const shardTopKBuffer = trackBuffer(this.device.createBuffer({
            size: stagingBufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        }));
        const shardMergeInputBuffer = trackBuffer(this.device.createBuffer({
            size: GPU_SHARD_TOP_K_MERGE_COUNT * GPU_TOP_K_ENTRY_BYTES,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        }));
        const shardMergeParamsBuffer = trackBuffer(this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        }));
        this.device.queue.writeBuffer(
            shardMergeParamsBuffer,
            0,
            new Uint32Array([GPU_SHARD_TOP_K_MERGE_COUNT, 0, 0, 0])
        );
        const stagingBuffer = trackBuffer(this.device.createBuffer({
            size: stagingBufferSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        }));
        addStageTime('batchBufferCreateMs', stageStart);

        // Params uniform buffer with batch offset, artifact offsets, base_stats, and constraints.
        // Must match ComputeParams struct layout (aligned to 16 bytes).
        stageStart = this.now();
        const statCount = Object.keys(this.statIndexMap).length;
        const baseStatsAligned = Math.ceil(statCount / 4) * 4;
        const headerSize = 20; // 18 u32s + 2 padding u32s before vec4-aligned base_stats
        const totalParamsSize = headerSize + baseStatsAligned + 64 + 128;

        const paramsData = new Uint32Array(totalParamsSize);
        const paramsFloatView = new Float32Array(paramsData.buffer);

        paramsData[8] = damageIndex;
        paramsData[9] = constraintCount;
        paramsData[15] = statCount;
        paramsData[16] = hasSetMinConstraints;
        paramsData[17] = hasSetMaxConstraints;
        paramsData[18] = hasStatConstraints;

        for (let i = 0; i < baseStatsData.length; i++) {
            paramsFloatView[headerSize + i] = baseStatsData[i];
        }

        const constraintOffset = headerSize + baseStatsAligned;
        paramsData.set(constraintData.data, constraintOffset);
        paramsData.set(setFlagsData, constraintOffset + 64);

        const paramsBuffer = trackBuffer(this.device.createBuffer({
            size: paramsData.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        }));
        this.device.queue.writeBuffer(paramsBuffer, 0, paramsData);
        const shardHeaderData = paramsData.subarray(0, 15);
        const batchHeaderData = new Uint32Array(2);

        const bindGroup = this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: artifactsBuffer } },    // combined artifacts
                { binding: 1, resource: { buffer: setBonusBuffer } },     // set_bonuses
                { binding: 2, resource: { buffer: variationLookup } },    // set_to_variation
                { binding: 3, resource: { buffer: resultValuesBuffer } }, // result_values
                { binding: 4, resource: { buffer: paramsBuffer } },       // params (with base_stats)
            ],
        });
        topKResources.scoreBindGroup = this.device.createBindGroup({
            layout: this.topKBindGroupLayout,
            entries: [
                {binding: 0, resource: {buffer: resultValuesBuffer}},
                {binding: 1, resource: {buffer: topKResources.candidateBuffers.a}},
                {binding: 2, resource: {buffer: topKResources.reductionParamsBuffers[0]}},
            ],
        });
        for (let passIndex = 1; passIndex < topKResources.maxReductionPlan.passes.length; passIndex++) {
            const pass = topKResources.maxReductionPlan.passes[passIndex];
            topKResources.entryBindGroups[passIndex] = this.device.createBindGroup({
                layout: this.topKBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: {buffer: topKResources.candidateBuffers[pass.inputBuffer]},
                    },
                    {
                        binding: 1,
                        resource: {buffer: topKResources.candidateBuffers[pass.outputBuffer]},
                    },
                    {
                        binding: 2,
                        resource: {buffer: topKResources.reductionParamsBuffers[passIndex]},
                    },
                ],
            });
        }
        topKResources.shardMergeBindGroup = this.device.createBindGroup({
            layout: this.topKBindGroupLayout,
            entries: [
                {binding: 0, resource: {buffer: shardMergeInputBuffer}},
                {binding: 1, resource: {buffer: shardTopKBuffer}},
                {binding: 2, resource: {buffer: shardMergeParamsBuffer}},
            ],
        });
        addStageTime('paramsAndBindGroupCreateMs', stageStart);

        const mergeCandidate = (value, globalIndex) => {
            if (!Number.isFinite(value)) return;
            if (globalTopK.length < limit) {
                globalTopK.push({value, index: globalIndex});
                if (globalTopK.length === limit) {
                    recomputeGlobalMin();
                }
                return;
            }
            if (
                value > globalMinValue ||
                (value === globalMinValue && globalIndex < globalTopK[globalMinIndex].index)
            ) {
                globalTopK[globalMinIndex] = {value, index: globalIndex};
                recomputeGlobalMin();
            }
        };
        const retainBatchProfile = (batchProfile) => {
            for (const timing of Object.keys(profile.batchTimingTotalsMs)) {
                profile.batchTimingTotalsMs[timing] += batchProfile[timing] || 0;
            }
            if (profile.batches.length < MAX_RETAINED_BATCH_PROFILES) {
                profile.batches.push(batchProfile);
            } else {
                profile.omittedBatchProfiles++;
            }
        };
        const reportProgress = (completedCount) => {
            processedCount = completedCount;
            const progressNow = this.now();
            if (
                callback && (
                    processedCount === totalCombinations ||
                    progressNow - lastProgressCallbackAt >= GPU_PROGRESS_INTERVAL_MS
                )
            ) {
                callback(processedCount, totalCombinations, 0);
                lastProgressCallbackAt = progressNow;
            }
        };

        let batch = 0;
        for (const shard of iterateGPUCombinationShards(shardPlan)) {
            stageStart = this.now();
            for (let axis = 0; axis < GPU_SLOT_NAMES.length; axis++) {
                const slotName = GPU_SLOT_NAMES[axis];
                paramsData[axis] = shard.counts[axis];
                paramsData[10 + axis] = artifactOffsets[slotName] + shard.starts[axis];
            }
            paramsData[5] = shard.combinationCount;
            this.device.queue.writeBuffer(paramsBuffer, 0, shardHeaderData);
            addStageTime('shardParamsWriteMs', stageStart);

            let shardBatch = 0;
            for (
                let shardBatchStart = 0;
                shardBatchStart < shard.combinationCount;
                shardBatchStart += batchSize
            ) {
                const shardBatchEnd = Math.min(
                    shardBatchStart + batchSize,
                    shard.combinationCount
                );
                const globalBatchStart = shard.globalStart + shardBatchStart;
                const globalBatchEnd = shard.globalStart + shardBatchEnd;
                const batchCount = shardBatchEnd - shardBatchStart;
                const isFirstShardBatch = shardBatch === 0;
                const isLastShardBatch = shardBatchEnd === shard.combinationCount;
                const workgroupCount = Math.ceil(batchCount / 256);
                const maxWorkgroupsPerDim = 65535;
                const workgroupX = Math.min(workgroupCount, maxWorkgroupsPerDim);
                const workgroupY = Math.ceil(workgroupCount / maxWorkgroupsPerDim);
                const batchProfile = {
                    batch,
                    shard: shard.index,
                    batchStart: globalBatchStart,
                    shardBatchStart,
                    batchCount,
                };

                stageStart = this.now();
                batchHeaderData[0] = shardBatchStart;
                batchHeaderData[1] = batchCount;
                this.device.queue.writeBuffer(paramsBuffer, 6 * 4, batchHeaderData);
                const reductionPlan = createGPUTopKReductionPlan(batchCount);
                for (let passIndex = 0; passIndex < reductionPlan.passes.length; passIndex++) {
                    const reductionParams = new Uint32Array(4);
                    reductionParams[0] = reductionPlan.passes[passIndex].inputCount;
                    if (passIndex === 0) {
                        reductionParams[1] = shardBatchStart;
                    }
                    this.device.queue.writeBuffer(
                        topKResources.reductionParamsBuffers[passIndex],
                        0,
                        reductionParams
                    );
                }
                batchProfile.reductionPasses = reductionPlan.passes.length;
                profile.reductionDispatches += reductionPlan.passes.length;
                batchProfile.paramsWriteMs = this.now() - stageStart;

                // Encode and submit compute pass
                stageStart = this.now();
                const commandEncoder = this.device.createCommandEncoder();
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(this.pipeline);
                passEncoder.setBindGroup(0, bindGroup);

                // Dispatch workgroups
                if (workgroupCount <= maxWorkgroupsPerDim) {
                    passEncoder.dispatchWorkgroups(workgroupCount);
                } else {
                    passEncoder.dispatchWorkgroups(workgroupX, workgroupY);
                }
                passEncoder.end();

                for (let passIndex = 0; passIndex < reductionPlan.passes.length; passIndex++) {
                    const reductionPass = commandEncoder.beginComputePass();
                    reductionPass.setPipeline(
                        passIndex === 0
                            ? this.topKScorePipeline
                            : this.topKEntryPipeline
                    );
                    reductionPass.setBindGroup(
                        0,
                        passIndex === 0
                            ? topKResources.scoreBindGroup
                            : topKResources.entryBindGroups[passIndex]
                    );
                    reductionPass.dispatchWorkgroups(
                        reductionPlan.passes[passIndex].workgroupCount
                    );
                    reductionPass.end();
                }
                const readbackBuffer =
                    topKResources.candidateBuffers[reductionPlan.finalBuffer];
                const readbackBytes = GPU_TOP_K_CAPACITY * GPU_TOP_K_ENTRY_BYTES;

                if (isFirstShardBatch) {
                    // Seed the resident shard state with the first batch's
                    // exact top-20. This overwrites every entry left by the
                    // previous shard, so no separate clear pass is required.
                    commandEncoder.copyBufferToBuffer(
                        readbackBuffer,
                        0,
                        shardTopKBuffer,
                        0,
                        readbackBytes
                    );
                    batchProfile.shardMergePasses = 0;
                } else {
                    // Merge the prior shard top-20 with this batch top-20 on
                    // the GPU. TopK(A union B) is exact from TopK(A) and
                    // TopK(B) under the shared deterministic total order.
                    commandEncoder.copyBufferToBuffer(
                        shardTopKBuffer,
                        0,
                        shardMergeInputBuffer,
                        0,
                        readbackBytes
                    );
                    commandEncoder.copyBufferToBuffer(
                        readbackBuffer,
                        0,
                        shardMergeInputBuffer,
                        readbackBytes,
                        readbackBytes
                    );
                    const mergePass = commandEncoder.beginComputePass();
                    mergePass.setPipeline(this.topKEntryPipeline);
                    mergePass.setBindGroup(0, topKResources.shardMergeBindGroup);
                    mergePass.dispatchWorkgroups(1);
                    mergePass.end();
                    batchProfile.shardMergePasses = 1;
                    profile.shardMergeDispatches++;
                    profile.reductionDispatches++;
                }

                // Only the completed shard top-20 leaves the GPU.
                if (isLastShardBatch) {
                    commandEncoder.copyBufferToBuffer(
                        shardTopKBuffer,
                        0,
                        stagingBuffer,
                        0,
                        readbackBytes
                    );
                    batchProfile.readbackBytes = readbackBytes;
                    profile.totalReadbackBytes += readbackBytes;
                    profile.readbackCount++;
                } else {
                    batchProfile.readbackBytes = 0;
                }
                this.device.queue.submit([commandEncoder.finish()]);
                batchProfile.encodeSubmitMs = this.now() - stageStart;

                batch++;
                shardBatch++;

                if (isLastShardBatch) {
                    const mapStart = this.now();
                    await stagingBuffer.mapAsync(GPUMapMode.READ);
                    // mapAsync resolves only after the shard copy and all
                    // preceding GPU work complete. This is completion-wait
                    // time, not CPU mapping overhead.
                    batchProfile.completionWaitMs = this.now() - mapStart;
                    const mappedRange = stagingBuffer.getMappedRange();

                    stageStart = this.now();
                    const candidates = decodeGPUTopKEntries(
                        mappedRange,
                        shard.globalStart,
                        shard.combinationCount
                    );
                    for (const candidate of candidates) {
                        mergeCandidate(candidate.value, candidate.index);
                    }
                    batchProfile.cpuTopKMs = this.now() - stageStart;
                    stagingBuffer.unmap();
                    reportProgress(globalBatchEnd);
                } else if (shardBatch % GPU_QUEUE_CHECKPOINT_BATCHES === 0) {
                    // Bound pending submissions without transferring data.
                    // This preserves UI progress on multi-billion shards while
                    // keeping the shard top-20 resident until its final batch.
                    const queueWaitStart = this.now();
                    await this.device.queue.onSubmittedWorkDone();
                    batchProfile.queueWaitMs = this.now() - queueWaitStart;
                    profile.queueCheckpointCount++;
                    reportProgress(globalBatchEnd);
                }

                retainBatchProfile(batchProfile);
            }
        }

        // Sort final results
        globalTopK.sort((a, b) => b.value - a.value || a.index - b.index);

        // Decode artifact indices
        const results = [];
        for (const { value, index } of globalTopK) {
            const artifacts = this.decodeArtifactIndices(index, slots, counts);
            results.push({ value, artifacts, combinationIndex: index });
        }

        profile.stageMs.totalOptimizeMs = this.now() - optimizeStart;
        profile.resultCount = results.length;
        this.lastOptimizeProfile = profile;

        return results;
        } finally {
            for (const buffer of runBuffers) {
                buffer.destroy();
            }
        }
    }

    /**
     * Create a storage buffer from typed array
     * @param {TypedArray} data
     * @returns {GPUBuffer}
     */
    createStorageBuffer(data) {
        const buffer = this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(buffer, 0, data);
        return buffer;
    }

    /**
     * Decode combination index to artifact array
     * @param {number} index
     * @param {Object} slots
     * @param {Object} counts
     * @returns {Array}
     */
    decodeArtifactIndices(index, slots, counts) {
        const n1 = counts.plume;
        const n2 = counts.sands;
        const n3 = counts.goblet;
        const n4 = counts.circlet;

        const divisor1 = n1 * n2 * n3 * n4;
        const divisor2 = n2 * n3 * n4;
        const divisor3 = n3 * n4;
        const divisor4 = n4;

        const i0 = Math.floor(index / divisor1);
        const i1 = Math.floor((index / divisor2)) % n1;
        const i2 = Math.floor((index / divisor3)) % n2;
        const i3 = Math.floor((index / divisor4)) % n3;
        const i4 = index % n4;

        return [
            slots.flower[i0],
            slots.plume[i1],
            slots.sands[i2],
            slots.goblet[i3],
            slots.circlet[i4],
        ];
    }

    /**
     * Clean up GPU resources
     */
    destroy() {
        if (this.device) {
            this.device.destroy();
            this.device = null;
        }
        this.pipeline = null;
        this.bindGroupLayout = null;
        this.topKScorePipeline = null;
        this.topKEntryPipeline = null;
        this.topKBindGroupLayout = null;
    }
}

function setBonusEntriesEqual(left, right) {
    const leftVariation = left?.variation || '';
    const rightVariation = right?.variation || '';
    if (leftVariation !== rightVariation) {
        return false;
    }

    const leftStats = left?.stats || {};
    const rightStats = right?.stats || {};
    const statNames = new Set([...Object.keys(leftStats), ...Object.keys(rightStats)]);
    for (const stat of statNames) {
        if (/^text_/.test(stat)) {
            continue;
        }
        const leftValue = Number(leftStats[stat] || 0);
        const rightValue = Number(rightStats[stat] || 0);
        if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
            return false;
        }
        const tolerance = 1e-7 * Math.max(1, Math.abs(leftValue), Math.abs(rightValue));
        if (Math.abs(leftValue - rightValue) > tolerance) {
            return false;
        }
    }
    return true;
}

function getVariationSetInfo(source) {
    if (source?.kind === 'optimization-plan') {
        return source.variations.map((variation) => {
            return variation.selector.terms.map((term) => ({
                setName: term.setName,
                pieces: term.minimumInclusive,
            }));
        });
    }

    return Object.values(source || {}).map((variation) => variation?.setInfo || []);
}

function validateOptimizationPlanForGPU(plan) {
    if (plan.numericPolicy?.gpuArithmetic !== 'f32') {
        throw new RangeError('GPU optimization plan must declare f32 GPU arithmetic');
    }
    if (!Number.isInteger(plan.objective?.vectorIndex) || plan.objective.vectorIndex < 0 || plan.objective.vectorIndex > 2) {
        throw new RangeError('GPU optimization plan objective vector index is invalid');
    }
    if (!Array.isArray(plan.statConstraints?.predicates)) {
        throw new TypeError('GPU optimization plan has no stat constraint predicates');
    }
    if (plan.statConstraints.predicates.length > MAX_GPU_STAT_CONSTRAINTS) {
        throw new RangeError(
            `GPU optimizer supports at most ${MAX_GPU_STAT_CONSTRAINTS} constrained stats; got ${plan.statConstraints.predicates.length}`
        );
    }

    for (const variation of plan.variations || []) {
        for (const term of variation.selector?.terms || []) {
            if (term.minimumInclusive !== 2 && term.minimumInclusive !== 4) {
                throw new RangeError(
                    `GPU optimizer variation for set "${term.setName}" uses unsupported ${term.minimumInclusive}-piece semantics`
                );
            }
        }
    }
}
