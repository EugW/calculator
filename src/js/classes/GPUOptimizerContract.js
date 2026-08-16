import { DEFAULT_OPTIMIZER_RESULT_LIMIT } from "./OptimizerResult";

export const GPU_TOP_K_CAPACITY = DEFAULT_OPTIMIZER_RESULT_LIMIT;
export const GPU_TOP_K_WORKGROUP_SIZE = 256;
// The reducer dispatches one one-dimensional workgroup per 256 inputs. Keep
// batches within WebGPU's portable per-dimension workgroup limit.
export const GPU_TOP_K_MAX_BATCH_COMBINATIONS =
    65535 * GPU_TOP_K_WORKGROUP_SIZE;

/**
 * Normalize stored/UI GPU batch settings to the executable reducer domain.
 * Legacy 16M-128M values are clamped to the current portable maximum instead
 * of displaying as Auto while executing with a different effective size.
 */
export function normalizeGPUOptimizerBatchSize(value) {
    if (value === undefined || value === null || value === '' || value === 'auto') {
        return 'auto';
    }

    const parsed = parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
        return 'auto';
    }

    return String(Math.min(parsed, GPU_TOP_K_MAX_BATCH_COMBINATIONS));
}
