/**
 * Exact GPU/f32 top-K reduction helpers.
 *
 * GPU optimization has one public result-limit contract: 20. Keeping this
 * capacity static lets every GPU run use the same reduction and readback path.
 */

import {
    GPU_TOP_K_CAPACITY,
    GPU_TOP_K_MAX_BATCH_COMBINATIONS,
    GPU_TOP_K_WORKGROUP_SIZE,
} from "./GPUOptimizerContract";

export {
    GPU_TOP_K_CAPACITY,
    GPU_TOP_K_MAX_BATCH_COMBINATIONS,
    GPU_TOP_K_WORKGROUP_SIZE,
};
export const GPU_TOP_K_ENTRY_WORDS = 2;
export const GPU_TOP_K_ENTRY_BYTES = GPU_TOP_K_ENTRY_WORDS * 4;

/**
 * Plan score -> entry and entry -> entry reduction passes.
 *
 * @param {number} inputCount
 * @returns {Object}
 */
export function createGPUTopKReductionPlan(inputCount) {
    if (
        !Number.isSafeInteger(inputCount) ||
        inputCount < 1 ||
        inputCount > GPU_TOP_K_MAX_BATCH_COMBINATIONS
    ) {
        throw new RangeError(
            `GPU top-K input count must be a positive integer at or below ` +
            `${GPU_TOP_K_MAX_BATCH_COMBINATIONS}; got ${inputCount}`
        );
    }

    const passes = [];
    let currentCount = inputCount;
    let inputBuffer = 'scores';
    let outputBuffer = 'a';

    do {
        const workgroupCount = Math.ceil(currentCount / GPU_TOP_K_WORKGROUP_SIZE);
        const outputCount = workgroupCount * GPU_TOP_K_CAPACITY;
        passes.push(Object.freeze({
            kind: inputBuffer === 'scores' ? 'scores' : 'entries',
            inputBuffer,
            outputBuffer,
            inputCount: currentCount,
            workgroupCount,
            outputCount,
        }));

        currentCount = outputCount;
        inputBuffer = outputBuffer;
        outputBuffer = outputBuffer === 'a' ? 'b' : 'a';
    } while (currentCount > GPU_TOP_K_CAPACITY);

    return Object.freeze({
        inputCount,
        candidateCapacity: passes[0].outputCount,
        passes: Object.freeze(passes),
        finalBuffer: passes[passes.length - 1].outputBuffer,
        finalCount: GPU_TOP_K_CAPACITY,
    });
}

/**
 * Decode interleaved {f32 score, u32 batch-local index} entries.
 *
 * @param {ArrayBuffer} buffer
 * @param {number} globalBatchStart
 * @param {number} batchCount
 * @returns {Array}
 */
export function decodeGPUTopKEntries(
    buffer,
    globalBatchStart,
    batchCount = Number.MAX_SAFE_INTEGER
) {
    const values = new Float32Array(buffer);
    const words = new Uint32Array(buffer);
    const results = [];
    const count = Math.min(
        GPU_TOP_K_CAPACITY,
        Math.floor(buffer.byteLength / GPU_TOP_K_ENTRY_BYTES)
    );

    for (let i = 0; i < count; i++) {
        const value = values[i * GPU_TOP_K_ENTRY_WORDS];
        if (!Number.isFinite(value)) continue;
        const batchLocalIndex = words[i * GPU_TOP_K_ENTRY_WORDS + 1];
        if (batchLocalIndex >= batchCount) continue;
        results.push({
            value,
            index: globalBatchStart + batchLocalIndex,
        });
    }

    return results;
}

const TOP_K_COMMON_WGSL = `
const TOP_K: u32 = ${GPU_TOP_K_CAPACITY}u;
const WORKGROUP_SIZE: u32 = ${GPU_TOP_K_WORKGROUP_SIZE}u;

struct TopKEntry {
    value: f32,
    index: u32,
}

struct ReductionParams {
    input_count: u32,
    index_offset: u32,
    _pad1: u32,
    _pad2: u32,
}

var<workgroup> sort_entries: array<TopKEntry, ${GPU_TOP_K_WORKGROUP_SIZE}>;

fn invalid_entry(seed: u32) -> TopKEntry {
    // Keep the NaN payload runtime-dependent. Chromium/Dawn rejects constant
    // NaN construction during WGSL constant evaluation.
    return TopKEntry(
        bitcast<f32>(0x7fc00000u | (seed & 0x003fffffu)),
        0xffffffffu
    );
}

fn entry_is_valid(entry: TopKEntry) -> bool {
    return (bitcast<u32>(entry.value) & 0x7f800000u) != 0x7f800000u;
}

fn entry_is_better(left: TopKEntry, right: TopKEntry) -> bool {
    let left_valid = entry_is_valid(left);
    let right_valid = entry_is_valid(right);
    if (left_valid != right_valid) {
        return left_valid;
    }
    if (!left_valid) {
        return left.index < right.index;
    }
    if (left.value > right.value) {
        return true;
    }
    if (left.value < right.value) {
        return false;
    }
    return left.index < right.index;
}

fn sort_workgroup(local_index: u32) {
    // Bitonic network. The final order is best first according to the complete
    // deterministic (finite, score descending, index ascending) key.
    for (var width = 2u; width <= WORKGROUP_SIZE; width *= 2u) {
        for (var stride = width / 2u; stride > 0u; stride /= 2u) {
            let partner = local_index ^ stride;
            if (partner > local_index) {
                let left = sort_entries[local_index];
                let right = sort_entries[partner];
                let better_first = (local_index & width) == 0u;
                let should_swap = select(
                    entry_is_better(left, right),
                    entry_is_better(right, left),
                    better_first
                );
                if (should_swap) {
                    sort_entries[local_index] = right;
                    sort_entries[partner] = left;
                }
            }
            workgroupBarrier();
        }
    }
}
`;

/**
 * First reduction pass: f32 scores -> TopKEntry candidates.
 *
 * @returns {string}
 */
export function getGPUScoreTopKShader() {
    return `${TOP_K_COMMON_WGSL}
@group(0) @binding(0) var<storage, read> input_scores: array<f32>;
@group(0) @binding(1) var<storage, read_write> output_entries: array<TopKEntry>;
@group(0) @binding(2) var<uniform> params: ReductionParams;

@compute @workgroup_size(${GPU_TOP_K_WORKGROUP_SIZE})
fn main(
    @builtin(local_invocation_index) local_index: u32,
    @builtin(workgroup_id) workgroup_id: vec3<u32>
) {
    let input_index = workgroup_id.x * WORKGROUP_SIZE + local_index;
    var entry = invalid_entry(input_index);
    if (input_index < params.input_count) {
        entry = TopKEntry(
            input_scores[input_index],
            params.index_offset + input_index
        );
    }
    sort_entries[local_index] = entry;
    workgroupBarrier();
    sort_workgroup(local_index);

    if (local_index < TOP_K) {
        output_entries[workgroup_id.x * TOP_K + local_index] = sort_entries[local_index];
    }
}
`;
}

/**
 * Later reduction passes: TopKEntry candidates -> fewer candidates.
 *
 * @returns {string}
 */
export function getGPUEntryTopKShader() {
    return `${TOP_K_COMMON_WGSL}
@group(0) @binding(0) var<storage, read> input_entries: array<TopKEntry>;
@group(0) @binding(1) var<storage, read_write> output_entries: array<TopKEntry>;
@group(0) @binding(2) var<uniform> params: ReductionParams;

@compute @workgroup_size(${GPU_TOP_K_WORKGROUP_SIZE})
fn main(
    @builtin(local_invocation_index) local_index: u32,
    @builtin(workgroup_id) workgroup_id: vec3<u32>
) {
    let input_index = workgroup_id.x * WORKGROUP_SIZE + local_index;
    var entry = invalid_entry(input_index);
    if (input_index < params.input_count) {
        entry = input_entries[input_index];
    }
    sort_entries[local_index] = entry;
    workgroupBarrier();
    sort_workgroup(local_index);

    if (local_index < TOP_K) {
        output_entries[workgroup_id.x * TOP_K + local_index] = sort_entries[local_index];
    }
}
`;
}
