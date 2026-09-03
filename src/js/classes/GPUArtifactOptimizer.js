/** Normal full-build search and GPU top-20 reduction. */
import {GPUDeviceContext, createGPUStorageBuffer} from './GPUDeviceContext';
import {GPUOptimizerInputs, GPU_SLOT_NAMES} from './GPUOptimizerInputs';
import {gpuNow, prepareGPUProgram, resolveGPUSemantics} from './GPUOptimizerProgram';
import {
    GPU_TOP_K_CAPACITY,
    GPU_TOP_K_ENTRY_BYTES,
    GPU_TOP_K_MAX_BATCH_COMBINATIONS,
    createGPUTopKReductionPlan,
    decodeGPUTopKEntries,
    getGPUEntryTopKShader,
    getGPUScoreTopKShader,
} from "./GPUTopK";

const DEFAULT_BATCH_SIZE = 1024 * 1024;
const MAX_GPU_SHARD_COMBINATIONS = 0xFFFFFFFF;
const MAX_RETAINED_BATCH_PROFILES = 2048;
const GPU_PROGRESS_INTERVAL_MS = 100;
const GPU_QUEUE_CHECKPOINT_BATCHES = 64;
const GPU_SHARD_TOP_K_MERGE_COUNT = GPU_TOP_K_CAPACITY * 2;

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
    constructor({ maxShardCombinations = MAX_GPU_SHARD_COMBINATIONS, context } = {}) {
        if (
            !Number.isSafeInteger(maxShardCombinations) ||
            maxShardCombinations < 1 ||
            maxShardCombinations > MAX_GPU_SHARD_COMBINATIONS
        ) {
            throw new RangeError(
                `GPU shard limit must be an integer from 1 through ${MAX_GPU_SHARD_COMBINATIONS}; got ${maxShardCombinations}`
            );
        }
        this.context = context || new GPUDeviceContext();
        this.ownsContext = !context;
        this.prepared = null;
        this.pipeline = null;
        this.bindGroupLayout = null;
        this.maxShardCombinations = maxShardCombinations;
        this.topKBindGroupLayout = null;
        this.topKScorePipeline = null;
        this.topKEntryPipeline = null;
    }

    get device() { return this.context.device; }
    get statIndexMap() { return this.prepared?.statIndexMap || null; }
    get optimizationPlan() { return this.prepared?.optimizationPlan || null; }
    get featureVariants() { return this.prepared?.featureVariants || null; }
    get variationMap() { return this.prepared?.variationMap || null; }
    get maxBufferSize() { return this.device?.limits?.maxBufferSize; }
    get maxStorageBufferBindingSize() { return this.device?.limits?.maxStorageBufferBindingSize; }
    now() { return gpuNow(); }

    async initialize() {
        const previous = this.device;
        const ready = await this.context.initialize(4);
        if (previous !== this.device) {
            this.pipeline = null;
            this.prepared = null;
            this.topKBindGroupLayout = null;
            this.topKScorePipeline = null;
            this.topKEntryPipeline = null;
        }
        return ready;
    }

    async preparePipeline(planOrFeatureVariants) {
        if (!this.device) {
            throw new Error('WebGPU not initialized');
        }

        this.pipeline = null;
        this.bindGroupLayout = null;
        this.prepared = null;
        const prepareStart = this.now();
        const prepared = await prepareGPUProgram(this.context, planOrFeatureVariants, compiler => compiler.getMegaKernel({}));
        const profile = {...prepared.profile};
        const shaderModule = prepared.module;
        let stageStart;
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
        this.prepared = prepared;
        this.lastPrepareProfile = profile;
    }

    async ensureTopKPipelines() {
        if (this.topKDevice === this.device && this.topKScorePipeline && this.topKEntryPipeline && this.topKBindGroupLayout) {
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
            const info = await this.context.waitFor(module.getCompilationInfo());
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
        this.topKDevice = this.device;
        return {reused: false, totalMs: this.now() - started};
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

    async optimize(opts) {
        const {
            slots,
            buildData,
            setData,
            limit = 20,
            batchSize: requestedBatchSize,
            callback,
        } = opts;

        if (!this.device || !this.pipeline || this.prepared?.device !== this.device) {
            throw new Error('GPU optimizer not prepared');
        }

        const {plan, settings, constraintBounds, damageIndex, variationSource} = resolveGPUSemantics(this.prepared, opts);
        const inputs = new GPUOptimizerInputs();

        if (limit !== GPU_TOP_K_CAPACITY) {
            throw new RangeError(
                `GPU optimizer result limit is fixed at ${GPU_TOP_K_CAPACITY}; got ${limit}`
            );
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
        const constraintData = inputs.buildConstraintData(constraintBounds, this.statIndexMap);
        addStageTime('constraintBuildMs', stageStart);

        stageStart = this.now();
        inputs.validateSetBonusModel(setData, slots, variationSource);
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
        inputs.preBuildSetIdMap(slots, setData, settings, variationSource);
        addStageTime('setIdMapMs', stageStart);

        const runBuffers = [];
        const trackBuffer = (buffer) => {
            runBuffers.push(buffer);
            return buffer;
        };

        try {
        // Now build variation lookup using the set ID mapping
        stageStart = this.now();
        const variationLookup = trackBuffer(createGPUStorageBuffer(this.device,
            inputs.buildVariationLookup(plan || this.variationMap, this.featureVariants)
        ));
        addStageTime('variationLookupUploadMs', stageStart);

        // Create single combined artifact buffer for all slots (saves 4 bindings)
        stageStart = this.now();
        const { buffer: artifactsData, offsets: artifactOffsets } =
            inputs.artifactsToCombinedBuffer(slots, this.statIndexMap);
        const artifactsBuffer = trackBuffer(createGPUStorageBuffer(this.device, artifactsData));
        addStageTime('artifactUploadMs', stageStart);

        // Base stats are now embedded in params uniform buffer
        stageStart = this.now();
        const baseStatsData = inputs.statsToBuffer(buildData.stats, this.statIndexMap);
        addStageTime('baseStatsBuildMs', stageStart);

        // Set bonus buffer - contains static set bonus stats (e.g., +18% ATK from 2-piece)
        // This is applied by apply_set_bonuses() in the shader BEFORE variation dispatch
        // Pass settings to respect setMaxValues (disabled set bonuses)
        stageStart = this.now();
        const setBonusData = inputs.setBonusesToBuffer(setData, this.statIndexMap, settings);
        const setBonusBuffer = trackBuffer(createGPUStorageBuffer(this.device, setBonusData));
        addStageTime('setBonusUploadMs', stageStart);

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
        const paramsData = inputs.buildParamsData({statIndexMap: this.statIndexMap,
            baseStatsData, constraintData, settings, damageIndex});

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
                    await this.context.waitFor(stagingBuffer.mapAsync(GPUMapMode.READ), this.prepared.device);
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
                    await this.context.waitFor(this.device.queue.onSubmittedWorkDone(), this.prepared.device);
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

    destroy() {
        this.pipeline = null;
        this.bindGroupLayout = null;
        this.prepared = null;
        this.topKScorePipeline = null;
        this.topKEntryPipeline = null;
        this.topKBindGroupLayout = null;
        if (this.ownsContext) this.context.destroy();
    }
}
