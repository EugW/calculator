/** Best complement per forced outcome; independent of normal top-20 search. */
import {GPUDeviceContext, createGPUStorageBuffer} from './GPUDeviceContext';
import {GPUOptimizerInputs, GPU_SLOT_NAMES} from './GPUOptimizerInputs';
import {gpuNow, lowerGPUProgram, prepareGPUProgram, resolveGPUSemantics} from './GPUOptimizerProgram';
import {getFusedOutcomeKernel} from './Feature2/WGSLFusedOutcome';

export const FUSED_OUTCOME_TILE = 256;
// A chunk's local build index must stay below the 0xFFFFFFFF "no winner"
// sentinel, so a chunk holds at most 0xFFFFFFFF companion builds.
export const FUSED_CHUNK_LIMIT = 0xFFFFFFFF;
// Words per partial best: value bits, chunk-local build index, chunk id, pad.
export const FUSED_BEST_WORDS = 4;
// Time-bounded batches keep each submission far below the Windows GPU
// watchdog (2 s by default) and give ~10 progress updates per second.
export const FUSED_TARGET_BATCH_MS = 100;
// First batch size in outcome x build evaluations, before any rate is known.
export const FUSED_FIRST_BATCH_WORK = 2 ** 26;
const FUSED_MAX_BATCH_GROWTH = 4;
const FUSED_BATCHES_IN_FLIGHT = 2;

// Compiled fused programs per device, keyed by WGSL source. Shader modules,
// the bind group layout and per-slot pipelines are immutable, so every
// optimizer on the device shares them; each run still packs its own
// semantics and buffers. Candidates of a run usually share few distinct
// programs, and pipeline compilation can take seconds for large objectives
// (synchronous outside the browser, which otherwise relies on its own cache).
// Concurrent jobs share one in-flight compile. Bounded LRU.
export const FUSED_PROGRAM_CACHE_SIZE = 16;
const fusedProgramCache = new WeakMap();

function fusedBindGroupLayout(device) {
    return device.createBindGroupLayout({entries: [
        {binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: {type: 'read-only-storage'}},
        {binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: {type: 'read-only-storage'}},
        {binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: {type: 'read-only-storage'}},
        {binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: {type: 'uniform'}},
        {binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: {type: 'read-only-storage'}},
        {binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: {type: 'storage'}},
        {binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: {type: 'read-only-storage'}},
    ]});
}

/**
 * Slice one Cartesian block ({dims[4], localRows[4]}) into blocks of at most
 * `limit` builds. The slowest axis is cut first; when one slice of an axis is
 * still too large, each of its rows is split along the next axis. Blocks come
 * out in the original row-major order, so (chunk, local index) orders builds
 * exactly like one unbounded global index.
 */
export function splitDenseBlock(block, limit = FUSED_CHUNK_LIMIT, axis = 0) {
    const size = block.dims.slice(axis).reduce((total, dim) => total * dim, 1);
    if (size <= limit) return [block];
    const inner = size / block.dims[axis];
    const step = inner > limit ? 1 : Math.floor(limit / inner);
    const parts = [];
    for (let start = 0; start < block.dims[axis]; start += step) {
        const dims = block.dims.slice();
        const localRows = block.localRows.slice();
        dims[axis] = Math.min(step, block.dims[axis] - start);
        localRows[axis] += start;
        const part = {dims, localRows};
        parts.push(...(inner > limit ? splitDenseBlock(part, limit, axis + 1) : [part]));
    }
    return parts;
}

/**
 * Lay blocks out on one global dense index and group consecutive blocks into
 * chunks whose sizes fit u32. regions[].end is global (a JS Number, exact far
 * beyond 2^32); each chunk records its global base, size and region slice.
 */
export function chunkDenseBlocks(blocks, limit = FUSED_CHUNK_LIMIT) {
    const regions = [];
    const chunks = [];
    let end = 0;
    let chunk = null;
    for (const {dims, localRows} of blocks.flatMap(block => splitDenseBlock(block, limit))) {
        if (dims.some(dim => !Number.isInteger(dim) || dim < 1)) continue;
        const size = dims.reduce((total, dim) => total * dim, 1);
        if (!Number.isSafeInteger(end + size)) {
            throw new RangeError(`Dense region Cartesian product must be a safe integer; got ${end + size} combinations`);
        }
        if (!chunk || chunk.count + size > limit) {
            chunk = {base: end, count: 0, regionStart: regions.length, regionEnd: regions.length};
            chunks.push(chunk);
        }
        end += size;
        chunk.count += size;
        chunk.regionEnd = regions.length + 1;
        regions.push({end, divs: [dims[1] * dims[2] * dims[3], dims[2] * dims[3], dims[3]], dims, localRows, size});
    }
    return {regions, chunks, validCount: end};
}

/** Chunk table for plans built without one (a single u32 chunk). */
function densePlanChunks(plan) {
    if (Array.isArray(plan.chunks)) return plan.chunks;
    if (plan.validCount > FUSED_CHUNK_LIMIT) {
        throw new RangeError(`Fused outcome Cartesian product must fit u32; got ${plan.validCount} combinations`);
    }
    return [{base: 0, count: plan.validCount, regionStart: 0, regionEnd: plan.regions.length}];
}

function fusedOutcomeInfo(outcomeArtifacts, targetSlot) {
    if (!GPU_SLOT_NAMES.includes(targetSlot)) {
        throw new RangeError(`Fused outcome target must be an artifact slot; got ${targetSlot}`);
    }
    if (!Array.isArray(outcomeArtifacts) || outcomeArtifacts.length < 1) {
        throw new RangeError('Fused outcome search needs at least one outcome artifact');
    }
    const first = outcomeArtifacts[0];
    return {outcomeCount: outcomeArtifacts.length, outcomeSet: first.getSetName ? first.getSetName() : first.set};
}

function validateFusedOutcome(artifact, targetSlot, outcomeSet, calculated = artifact.calculated) {
    const slot = artifact.getSlot ? artifact.getSlot() : artifact.slot;
    const setName = artifact.getSetName ? artifact.getSetName() : artifact.set;
    if (slot !== targetSlot) {
        throw new RangeError('Every fused outcome must share the target slot');
    }
    if (setName !== outcomeSet) {
        throw new RangeError('Every fused outcome must share one set (fixed set topology)');
    }
    if (!calculated || typeof calculated !== 'object') {
        throw new Error('Fused outcomes must be lowered before upload (missing calculated stats)');
    }
}

/**
 * Mirror of the fused shader's complement decode: row-major over the four
 * non-target slots in GPU_SLOT_NAMES order, last axis fastest (the main
 * row-major convention minus the target axis).
 */
export function decodeFusedOutcomeComplement(index, targetSlot, slotPools) {
    const axes = GPU_SLOT_NAMES.filter((slot) => slot !== targetSlot);
    if (axes.length !== 4 || !axes.every((slot) => Array.isArray(slotPools[slot]))) {
        throw new RangeError('Fused outcome decode needs four complement artifact pools');
    }
    const counts = axes.map((slot) => slotPools[slot].length);
    if (counts.some((count) => !Number.isInteger(count) || count < 1)) {
        throw new RangeError('Fused outcome decode needs a non-empty artifact in every complement slot');
    }
    const divisor1 = counts[1] * counts[2] * counts[3];
    const divisor2 = counts[2] * counts[3];
    const divisor3 = counts[3];
    const picks = [
        Math.floor(index / divisor1),
        Math.floor(index / divisor2) % counts[1],
        Math.floor(index / divisor3) % counts[2],
        index % counts[3],
    ];
    return axes.map((slot, axis) => slotPools[slot][picks[axis]]);
}

/**
 * Pure layout of one chunk's fused params: 8-word header
 * (target_set_id, outcome_count, complement_count, region_count,
 * batch_base, batch_len, chunk_id, pad) + 8 words per region
 * (end, div0..div2, rows[4]). Must match FusedParams/FusedRegion in
 * Feature2/WGSLFusedOutcome.js exactly (header 32B, records 32B stride,
 * rows vec4 at record offset 16). Region ends are rebased to the chunk
 * (`base` is its global start); batch words are rewritten per batch.
 */
export function buildDenseFusedParams({targetSetId, outcomeCount, complementCount, regions, chunkId = 0, base = 0}) {
    if (!Number.isInteger(complementCount) || complementCount < 0 || complementCount > FUSED_CHUNK_LIMIT) {
        throw new RangeError(`Fused outcome chunk must fit u32; got ${complementCount} combinations`);
    }
    const fusedParams = new Uint32Array(8 + 8 * regions.length);
    fusedParams[0] = targetSetId;
    fusedParams[1] = outcomeCount;
    fusedParams[2] = complementCount;
    fusedParams[3] = regions.length;
    fusedParams[6] = chunkId;
    regions.forEach((region, index) => {
        fusedParams.set([region.end - base, ...region.divs, ...region.rows], 8 + 8 * index);
    });
    return fusedParams;
}

/**
 * Single-region dense plan over the full complement space (no topology).
 * Lets direct callers use the dense path without importing the enumerator
 * (which would be a module cycle via ArtifactsSuggest).
 */
function singleDenseRegion(slots, targetSlot, axes) {
    const dims = axes.map((slot) => slots[slot]?.length || 0);
    const {regions, chunks, validCount} = chunkDenseBlocks([{dims, localRows: [0, 0, 0, 0]}]);
    return {axes, packedSlots: slots, regions, chunks, validCount, logical: [{slots, size: validCount}]};
}

/** Pack all run data on the owning CPU worker. No live artifacts cross the GPU boundary. */
export function packForcedOutcomeInputs(prepared, opts) {
    const {
        slots,
        buildData,
        setData,
        outcomeArtifacts,
        targetSlot,
        densePlan: densePlanOpt,
    } = opts;

    const preparedOutcomes = opts.preparedOutcomes;
    const {outcomeSet, outcomeCount} = preparedOutcomes || fusedOutcomeInfo(outcomeArtifacts, targetSlot);
    if (preparedOutcomes) {
        if (preparedOutcomes.destroyed || preparedOutcomes.targetSlot !== targetSlot) {
            throw new Error('Prepared fused outcomes do not match the current GPU pipeline and target slot');
        }
    }
    if (!slots || slots[targetSlot]?.length !== 1) {
        throw new RangeError('Fused outcome search needs one target placeholder row (prepared topology)');
    }
    // One global
    // index space over concatenated regions. Without an explicit plan,
    // run the full space as a single region (no topology).
    const compAxes = GPU_SLOT_NAMES.filter((slot) => slot !== targetSlot);
    const compCounts = compAxes.map((slot) => slots[slot]?.length || 0);
    if (compCounts.some((count) => !Number.isInteger(count) || count < 1)) {
        throw new RangeError('Fused outcome search needs a non-empty artifact in every complement slot');
    }
    const densePlan = densePlanOpt || singleDenseRegion(slots, targetSlot, compAxes);
    if (!densePlan.regions.length || !Number.isSafeInteger(densePlan.validCount) || densePlan.validCount < 1) {
        throw new RangeError('Fused outcome search needs a non-empty dense region plan');
    }
    const complementCount = densePlan.validCount;
    const chunks = densePlanChunks(densePlan);

    const {plan, settings, constraintBounds, damageIndex, variationSource} = resolveGPUSemantics(prepared, opts);
    const inputs = new GPUOptimizerInputs();
    const statIndexMap = prepared.statIndexMap;
    inputs.preBuildSetIdMap(slots, setData, settings, variationSource);
    const constraintData = inputs.buildConstraintData(constraintBounds, statIndexMap);
    for (const logical of densePlan.logical || [{slots, size: complementCount}]) {
        inputs.validateSetBonusModel(setData, logical.slots, variationSource);
    }
    const {buffer: poolData, offsets} = inputs.artifactsToCombinedBuffer(slots, statIndexMap);
    const baseStatsData = inputs.statsToBuffer(buildData.stats, statIndexMap);
    for (const region of densePlan.regions) {
        region.rows = compAxes.map((slot, axis) => offsets[slot] + region.localRows[axis]);
    }
    // One params block per chunk, concatenated; fusedChunks holds
    // (word offset, word count, build count) per chunk.
    const targetSetId = inputs.getSetIdNumber(outcomeSet);
    const blocks = chunks.map((chunk, chunkId) => buildDenseFusedParams({targetSetId, outcomeCount,
        complementCount: chunk.count, regions: densePlan.regions.slice(chunk.regionStart, chunk.regionEnd),
        chunkId, base: chunk.base}));
    const fusedParams = new Uint32Array(blocks.reduce((total, block) => total + block.length, 0));
    const fusedChunks = new Uint32Array(3 * blocks.length);
    let wordOffset = 0;
    blocks.forEach((block, chunkId) => {
        fusedParams.set(block, wordOffset);
        fusedChunks.set([wordOffset, block.length, chunks[chunkId].count], 3 * chunkId);
        wordOffset += block.length;
    });
    return {targetSlot, outcomeSet, outcomeCount, complementCount, poolData,
        variationData: inputs.buildVariationLookup(plan || prepared.variationMap, prepared.featureVariants),
        setBonusData: inputs.setBonusesToBuffer(setData, statIndexMap, settings),
        paramsData: inputs.buildParamsData({statIndexMap, baseStatsData, constraintData, settings, damageIndex}),
        fusedParams, fusedChunks};
}

/** Merge shard winners on the candidate worker using the shader's stable tie-break:
 * higher value, then earlier chunk, then smaller chunk-local build index.
 * complementIndices are chunk-local; chunkIndices select the plan chunk. */
export function reduceForcedOutcomeReadback(readback, outcomeCount, shards, compact = true) {
    if (Object.prototype.toString.call(readback) !== '[object Uint32Array]'
        || readback.length !== outcomeCount * shards * FUSED_BEST_WORDS) {
        throw new RangeError('Invalid fused GPU readback length');
    }
    const values = new Float32Array(readback.buffer, readback.byteOffset, readback.length);
    const words = readback;
    const results = compact ? null : [];
    const bestValues = compact ? new Float32Array(outcomeCount) : null;
    const complementIndices = compact ? new Uint32Array(outcomeCount) : null;
    const chunkIndices = compact ? new Uint32Array(outcomeCount) : null;
    for (let i = 0; i < outcomeCount; ++i) {
        let value = Number.NEGATIVE_INFINITY;
        let complementIndex = 0xFFFFFFFF;
        let chunkIndex = 0xFFFFFFFF;
        for (let s = 0; s < shards; ++s) {
            const at = (s * outcomeCount + i) * FUSED_BEST_WORDS;
            if (!Number.isFinite(values[at])) continue;
            const chunk = words[at + 2];
            if (values[at] > value || (values[at] === value
                && (chunk < chunkIndex || (chunk === chunkIndex && words[at + 1] < complementIndex)))) {
                value = values[at];
                complementIndex = words[at + 1];
                chunkIndex = chunk;
            }
        }
        if (results) results.push({value, complementIndex, chunkIndex});
        else {
            bestValues[i] = value;
            complementIndices[i] = complementIndex;
            chunkIndices[i] = chunkIndex;
        }
    }
    return {results, bestValues, complementIndices, chunkIndices};
}

export class GPUForcedOutcomeOptimizer {
    constructor({context} = {}) {
        this.context = context || new GPUDeviceContext();
        this.ownsContext = !context;
        this.prepared = null;
        this.fusedBindGroupLayout = null;
        this.fusedPipelines = new Map();
    }

    get device() { return this.context.device; }
    get statIndexMap() { return this.prepared?.statIndexMap || null; }
    get optimizationPlan() { return this.prepared?.optimizationPlan || null; }
    get featureVariants() { return this.prepared?.featureVariants || null; }
    get variationMap() { return this.prepared?.variationMap || null; }
    get maxBufferSize() { return this.device?.limits?.maxBufferSize; }
    get maxStorageBufferBindingSize() { return this.device?.limits?.maxStorageBufferBindingSize; }
    now() { return gpuNow(); }

    async initialize() { return this.context.initialize(6); }

    async preparePipeline(source) {
        this.prepared = null;
        this.fusedBindGroupLayout = null;
        this.fusedPipelines = new Map();
        const started = this.now();
        const device = this.device;
        if (!device) throw new Error('WebGPU not initialized');
        const lowered = source?.kind === 'gpu-program' ? source : lowerGPUProgram(source, getFusedOutcomeKernel);
        let programs = fusedProgramCache.get(device);
        if (!programs) fusedProgramCache.set(device, programs = new Map());
        let compiled = programs.get(lowered.code);
        const cached = !!compiled;
        if (cached) {
            programs.delete(lowered.code);
        } else {
            compiled = prepareGPUProgram(this.context, {...lowered, kind: 'gpu-program'}).then(prepared => ({
                module: prepared.module, profile: prepared.profile,
                layout: fusedBindGroupLayout(device), pipelines: new Map(),
            }));
            // A failed compile must not poison later attempts.
            compiled.catch(() => {
                if (programs.get(lowered.code) === compiled) programs.delete(lowered.code);
            });
        }
        programs.set(lowered.code, compiled);
        if (programs.size > FUSED_PROGRAM_CACHE_SIZE) programs.delete(programs.keys().next().value);
        const program = await compiled;
        // Semantics (plan, settings, stat layout) always come from this source.
        this.prepared = Object.freeze({...lowered, device, module: program.module,
            statIndexMap: Object.freeze({...lowered.statIndexMap}), profile: {...lowered.profile, ...program.profile}});
        this.fusedBindGroupLayout = program.layout;
        this.fusedPipelines = program.pipelines;
        this.lastPrepareProfile = {...this.prepared.profile, cached, totalMs: this.now() - started};
    }

    prepareForcedOutcomes(outcomeArtifacts, targetSlot, {getStats, onSetupProgress} = {}) {
        const info = fusedOutcomeInfo(outcomeArtifacts, targetSlot);
        if (!this.device || !this.prepared || this.prepared.device !== this.device) throw new Error('GPU optimizer not prepared');
        const statIndexMap = this.statIndexMap;
        const statCount = Object.keys(statIndexMap).length;
        const bytes = info.outcomeCount * statCount * 4;
        const byteLimit = Math.min(this.maxBufferSize ?? Infinity, this.maxStorageBufferBindingSize ?? Infinity);
        if (bytes > byteLimit || Math.ceil(info.outcomeCount / FUSED_OUTCOME_TILE) > 65535) {
            throw new RangeError('Fused outcome buffers exceed device limits');
        }
        const rows = new Float32Array(info.outcomeCount * statCount);
        if (onSetupProgress) onSetupProgress('lower', 0, info.outcomeCount);
        for (let i = 0; i < info.outcomeCount; ++i) {
            const artifact = outcomeArtifacts[i];
            const calculated = getStats ? getStats(artifact) : artifact.calculated;
            validateFusedOutcome(artifact, targetSlot, info.outcomeSet, calculated);
            for (const [stat, value] of Object.entries(calculated)) {
                const index = statIndexMap[stat];
                if (index !== undefined) rows[i * statCount + index] = value;
            }
            if (onSetupProgress && ((i + 1) & 8191) === 0) {
                onSetupProgress('lower', i + 1, info.outcomeCount);
            }
        }
        if (onSetupProgress) {
            onSetupProgress('lower', info.outcomeCount, info.outcomeCount);
            onSetupProgress('upload');
        }
        const buffer = createGPUStorageBuffer(this.device, rows, 'Fused outcome rows');
        let destroyed = false;
        return Object.freeze({
            ...info, targetSlot, buffer, device: this.device, statIndexMap,
            get destroyed() { return destroyed; },
            destroy() {
                if (!destroyed) buffer.destroy();
                destroyed = true;
            },
        });
    }

    /** Upload worker-packed rows using their shared WGSL stat layout. */
    adoptPreparedOutcomes({outcomeArtifacts, targetSlot, outcomeCount, outcomeSet, rows, mapKeys, onSetupProgress} = {}) {
        const info = outcomeArtifacts ? fusedOutcomeInfo(outcomeArtifacts, targetSlot) : {outcomeCount, outcomeSet};
        if (!GPU_SLOT_NAMES.includes(targetSlot) || !Number.isSafeInteger(info.outcomeCount) || info.outcomeCount < 1
            || typeof info.outcomeSet !== 'string') throw new RangeError('Invalid prepared outcome metadata');
        if (!this.device || !this.prepared || this.prepared.device !== this.device) throw new Error('GPU optimizer not prepared');
        const statIndexMap = this.statIndexMap;
        const statCount = Object.keys(statIndexMap).length;
        if (!Array.isArray(mapKeys) || mapKeys.length !== statCount ||
            mapKeys.some((stat, index) => statIndexMap[stat] !== index)) {
            throw new Error('Adopted outcome rows do not match the current GPU stat layout');
        }
        const bytes = info.outcomeCount * statCount * 4;
        const byteLimit = Math.min(this.maxBufferSize ?? Infinity, this.maxStorageBufferBindingSize ?? Infinity);
        const rowBytes = rows.byteLength;
        if (rowBytes !== bytes) {
            throw new RangeError(`Adopted outcome rows are ${rowBytes} bytes, expected ${bytes}`);
        }
        if (bytes > byteLimit || Math.ceil(info.outcomeCount / FUSED_OUTCOME_TILE) > 65535) {
            throw new RangeError('Fused outcome buffers exceed device limits');
        }
        for (const artifact of outcomeArtifacts || []) {
            const slot = artifact.getSlot ? artifact.getSlot() : artifact.slot;
            const setName = artifact.getSetName ? artifact.getSetName() : artifact.set;
            if (slot !== targetSlot) {
                throw new RangeError('Every fused outcome must share the target slot');
            }
            if (setName !== info.outcomeSet) {
                throw new RangeError('Every fused outcome must share one set (fixed set topology)');
            }
        }
        // Lowering happened in the worker (its progress was forwarded with
        // the lower key); this stage is title-only and must not clobber it.
        if (onSetupProgress) onSetupProgress('upload');
        const buffer = createGPUStorageBuffer(this.device, rows, 'Fused outcome rows');
        let destroyed = false;
        return Object.freeze({
            ...info, targetSlot, buffer, device: this.device, statIndexMap,
            get destroyed() { return destroyed; },
            destroy() {
                if (!destroyed) buffer.destroy();
                destroyed = true;
            },
        });
    }

    async optimizeForcedOutcomes(opts) {
        const {onProgress, preparedOutcomes, outcomeArtifacts} = opts;
        if (preparedOutcomes && (preparedOutcomes.destroyed || preparedOutcomes.device !== this.device ||
            preparedOutcomes.statIndexMap !== this.statIndexMap || preparedOutcomes.targetSlot !== opts.targetSlot)) {
            throw new Error('Prepared fused outcomes do not match the current GPU pipeline and target slot');
        }
        if (!opts.packedInputs && !preparedOutcomes) {
            const info = fusedOutcomeInfo(outcomeArtifacts, opts.targetSlot);
            for (const artifact of outcomeArtifacts) validateFusedOutcome(artifact, opts.targetSlot, info.outcomeSet);
        }
        if (!this.device || !this.prepared || this.prepared.device !== this.device) {
            throw new Error('GPU optimizer not prepared');
        }
        const packed = opts.packedInputs || packForcedOutcomeInputs(this.prepared, opts);
        const {targetSlot, outcomeSet, outcomeCount, complementCount,
            poolData, variationData, setBonusData, paramsData, fusedParams} = packed;
        // (word offset, word count, build count) per chunk; one chunk when absent.
        const fusedChunks = packed.fusedChunks || Uint32Array.of(0, fusedParams.length, complementCount);
        const chunkCount = fusedChunks.length / 3;
        let chunkWords = 0;
        for (let chunk = 0; chunk < chunkCount; ++chunk) chunkWords = Math.max(chunkWords, fusedChunks[3 * chunk + 1]);
        const optimizeStart = this.now();
        const profile = {mode: 'fused-outcomes', targetSlot, outcomeCount, complementCount};

        if (!this.fusedPipelines.get(targetSlot)) {
            const pipeline = this.device.createComputePipeline({
                layout: this.device.createPipelineLayout({bindGroupLayouts: [this.fusedBindGroupLayout]}),
                compute: {module: this.prepared.module, entryPoint: `main_fused_${targetSlot}`},
            });
            this.fusedPipelines.set(targetSlot, pipeline);
        }

        const runBuffers = [];
        const trackBuffer = (buffer) => {
            runBuffers.push(buffer);
            return buffer;
        };
        try {
            const outcomes = preparedOutcomes || (opts.packedInputs
                ? this.adoptPreparedOutcomes({targetSlot, outcomeCount, outcomeSet,
                    rows: packed.outcomeRows, mapKeys: packed.mapKeys, onSetupProgress: opts.onSetupProgress})
                : this.prepareForcedOutcomes(outcomeArtifacts, targetSlot, {onSetupProgress: opts.onSetupProgress}));
            if (!preparedOutcomes) trackBuffer(outcomes);
            const variationLookup = trackBuffer(createGPUStorageBuffer(this.device, variationData));
            const artifactsBuffer = trackBuffer(createGPUStorageBuffer(this.device, poolData));
            const setBonusBuffer = trackBuffer(createGPUStorageBuffer(this.device, setBonusData));
            const paramsBuffer = trackBuffer(this.device.createBuffer({
                size: paramsData.byteLength,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            }));
            this.device.queue.writeBuffer(paramsBuffer, 0, paramsData);
            // Sized for the largest chunk; each chunk rewrites its own block.
            const fusedParamsBuffer = trackBuffer(this.device.createBuffer({
                size: chunkWords * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }));
            // Grid: tiles x shards. Shards add parallelism when few outcome
            // tiles exist; each (tile, shard) tracks its own partial bests so
            // the serialized complement loop stays short and parallel across
            // the device. Shards are capped at 1024 / complementCount and
            // partial storage at 64MB; shard slices always land inside the
            // validated u32 chunk range, so no per-shard overflow is possible.
            const tiles = Math.ceil(outcomeCount / FUSED_OUTCOME_TILE);
            if (tiles > 65535) {
                throw new RangeError('Fused outcome tile count exceeds dispatch limits');
            }
            const maxPartialBytes = 64 * 1024 * 1024;
            const bestBytes = FUSED_BEST_WORDS * 4;
            const maxShardsByMemory = Math.max(1, Math.floor(maxPartialBytes / (bestBytes * outcomeCount)));
            const shards = Math.max(1, Math.min(1024, 65535, Math.max(1, Math.ceil(1024 / tiles)), maxShardsByMemory,
                complementCount));
            const partialCount = shards * outcomeCount;
            const bestInit = new ArrayBuffer(partialCount * bestBytes);
            {
                // (-inf, no build, no chunk, pad): nothing found yet.
                const floats = new Float32Array(bestInit);
                const words = new Uint32Array(bestInit);
                for (let i = 0; i < partialCount; ++i) {
                    floats[i * FUSED_BEST_WORDS] = -Infinity;
                    words[i * FUSED_BEST_WORDS + 1] = 0xFFFFFFFF;
                    words[i * FUSED_BEST_WORDS + 2] = 0xFFFFFFFF;
                }
            }
            const bestsBuffer = trackBuffer(this.device.createBuffer({
                size: bestInit.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            }));
            this.device.queue.writeBuffer(bestsBuffer, 0, bestInit);
            const stagingBuffer = trackBuffer(this.device.createBuffer({
                size: bestInit.byteLength,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
            }));
            for (const sized of [poolData.byteLength, chunkWords * 4, bestInit.byteLength]) {
                if (sized > this.maxBufferSize) {
                    throw new RangeError('Fused outcome buffers exceed device limits');
                }
            }
            const bindGroup = this.device.createBindGroup({
                layout: this.fusedBindGroupLayout,
                entries: [
                    {binding: 0, resource: {buffer: artifactsBuffer}},
                    {binding: 1, resource: {buffer: setBonusBuffer}},
                    {binding: 2, resource: {buffer: variationLookup}},
                    {binding: 4, resource: {buffer: paramsBuffer}},
                    {binding: 5, resource: {buffer: fusedParamsBuffer}},
                    {binding: 6, resource: {buffer: bestsBuffer}},
                    {binding: 7, resource: {buffer: outcomes.buffer}},
                ],
            });
            // Batches slice each chunk's dense build range. Their size follows
            // the measured throughput so every submission stays near
            // FUSED_TARGET_BATCH_MS whatever the outcome and build counts: tiny
            // searches take one batch, huge ones never approach the Windows
            // GPU watchdog. Two batches stay in flight so the device does not
            // idle between them; header writes are ordered on the queue, so
            // rewriting them for the next batch is safe. Bests persist in
            // fused_bests across batches and chunks, so per-cell maxima are exact.
            const pipeline = this.fusedPipelines.get(targetSlot);
            const batchHeader = new Uint32Array(2);
            const inFlight = [];
            // opts.batchWork pins the batch size (tests use it to force many
            // batches on tiny spaces); production batches follow the timer.
            const fixedWork = opts.batchWork;
            let work = fixedWork || FUSED_FIRST_BATCH_WORK;
            let completed = 0;
            let batches = 0;
            let lastDone = null;
            const settle = async () => {
                const batch = inFlight.shift();
                await batch.done;
                const now = this.now();
                // With two batches queued, the device starts this one when the
                // previous one finishes, not when it was submitted.
                const elapsed = now - Math.max(batch.submitted, lastDone ?? batch.submitted);
                lastDone = now;
                completed += batch.length;
                if (elapsed > 0 && !fixedWork) {
                    const target = batch.evaluations / elapsed * FUSED_TARGET_BATCH_MS;
                    work = Math.min(work * FUSED_MAX_BATCH_GROWTH, Math.max(FUSED_FIRST_BATCH_WORK, target));
                }
                if (onProgress && completed < complementCount) onProgress(completed, complementCount);
            };
            for (let chunk = 0; chunk < chunkCount; ++chunk) {
                const wordOffset = fusedChunks[3 * chunk];
                const chunkSize = fusedChunks[3 * chunk + 2];
                this.device.queue.writeBuffer(fusedParamsBuffer, 0, fusedParams, wordOffset, fusedChunks[3 * chunk + 1]);
                for (let batchBase = 0; batchBase < chunkSize;) {
                    const batchLen = Math.max(1, Math.min(chunkSize - batchBase, Math.floor(work / outcomeCount)));
                    batchHeader[0] = batchBase;
                    batchHeader[1] = batchLen;
                    this.device.queue.writeBuffer(fusedParamsBuffer, 16, batchHeader);
                    const commandEncoder = this.device.createCommandEncoder();
                    const passEncoder = commandEncoder.beginComputePass();
                    passEncoder.setPipeline(pipeline);
                    passEncoder.setBindGroup(0, bindGroup);
                    passEncoder.dispatchWorkgroups(tiles, shards);
                    passEncoder.end();
                    this.device.queue.submit([commandEncoder.finish()]);
                    const done = this.context.waitFor(this.device.queue.onSubmittedWorkDone(), this.prepared.device);
                    // A later batch may fail while an earlier one is awaited;
                    // the awaited promise still rethrows its own failure.
                    done.catch(() => {});
                    inFlight.push({done, submitted: this.now(), length: batchLen, evaluations: batchLen * outcomeCount});
                    batchBase += batchLen;
                    ++batches;
                    if (inFlight.length >= FUSED_BATCHES_IN_FLIGHT) await settle();
                }
            }
            while (inFlight.length) await settle();
            // The final batch never reports inside the loop by itself: close
            // the bar explicitly so consumers never freeze below 100%.
            if (onProgress) onProgress(complementCount, complementCount);
            const readbackEncoder = this.device.createCommandEncoder();
            readbackEncoder.copyBufferToBuffer(bestsBuffer, 0, stagingBuffer, 0, bestInit.byteLength);
            this.device.queue.submit([readbackEncoder.finish()]);
            await this.context.waitFor(this.device.queue.onSubmittedWorkDone(), this.prepared.device);
            await this.context.waitFor(stagingBuffer.mapAsync(GPUMapMode.READ), this.prepared.device);
            const mapped = stagingBuffer.getMappedRange();
            // The candidate worker merges shards and rescores while the GPU
            // coordinator starts the next request. Mapped bytes must be copied
            // before unmapping; that copy is transferred to the worker.
            const readback = opts.rawReadback ? new Uint32Array(mapped.slice(0)) : null;
            const reduced = opts.rawReadback ? null
                : reduceForcedOutcomeReadback(new Uint32Array(mapped), outcomeCount, shards, opts.compact === true);
            stagingBuffer.unmap();
            profile.tiles = tiles;
            profile.shards = shards;
            profile.batches = batches;
            profile.chunks = chunkCount;
            profile.stageMs = {totalOptimizeMs: this.now() - optimizeStart};
            this.lastOptimizeProfile = profile;
            if (opts.rawReadback) return {readback, shards, complementCount, outcomeCount, profile};
            return {...reduced, complementCount, outcomeCount};
        } finally {
            for (const buffer of runBuffers) {
                buffer.destroy();
            }
        }
    }

    destroy() {
        // Shared compiled programs stay cached for the device.
        this.prepared = null;
        this.fusedBindGroupLayout = null;
        this.fusedPipelines = new Map();
        if (this.ownsContext) this.context.destroy();
    }
}
