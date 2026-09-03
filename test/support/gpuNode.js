/**
 * Shared Dawn-on-Node setup for real-device GPU tests (`webgpu` npm package).
 *
 * Lets host-logic suites (uploads, sentinel init, readback merge, dispatches)
 * run against a REAL WebGPU device instead of the jest.fn() device in
 * ./gpuOptimizer.js. Rules of the split:
 * - Happy paths (bytes written, winners, ties, wiring): real device here.
 * - Fault injection (throwing uploads, GPU-lost mid-run, destroy counts):
 *   stays on the mock device — a real device cannot fail on demand.
 * - Predictor business logic: stays on the CPU mirror (fast, deterministic).
 *
 * Soft-skips with a warning when the package or an adapter is unavailable.
 * Requires node --experimental-vm-modules (see `npm run test:gpu`).
 */
import { GPUDeviceContext } from '../../src/js/classes/GPUDeviceContext';
import { GPUForcedOutcomeOptimizer } from '../../src/js/classes/GPUForcedOutcomeOptimizer';
import { buildFusedOutcomeRegions } from '../../src/js/classes/ArtifactsSuggest';

let webgpu = null;
let unavailableReason = '';
// Hidden from babel's CommonJS transform (which would rewrite import() to
// require() and fail on this ESM-only package): a real dynamic import at
// runtime. The webgpu entry uses import.meta + createRequire internally, so
// it must also NOT go through babel-jest (no transformIgnorePatterns).
const importESM = new Function('specifier', 'return import(specifier)');

export async function loadWebGPU() {
    if (webgpu || unavailableReason) return webgpu;
    try {
        webgpu = await importESM('webgpu');
    } catch (error) {
        unavailableReason = String(error?.message || error);
    }
    return webgpu;
}

/** True when the caller should return early (warning already logged). */
export async function skipWhenNoGPU() {
    if (!await loadWebGPU()) {
        console.warn('gpuNode: webgpu package unavailable, skipping (' + unavailableReason + ')');
        return true;
    }
    if (!await realDevice()) {
        console.warn('gpuNode: no WebGPU adapter, skipping real-device assertions');
        return true;
    }
    return false;
}

/** A live Dawn device, or null when unavailable. Idempotent per file. */
export async function realDevice() {
    if (!await loadWebGPU()) return null;
    if (!globalThis.navigator?.gpu) {
        Object.assign(globalThis, webgpu.globals);
        globalThis.navigator = {gpu: webgpu.create([])};
    }
    try {
        return await globalThis.navigator.gpu.requestAdapter();
    } catch {
        return null;
    }
}

/** Optimizer bound to a real device, or null when unavailable. */
export async function preparedFusedOptimizer(plan) {
    const adapter = await realDevice();
    if (!adapter) return null;
    const context = new GPUDeviceContext();
    if (!await context.initialize(6)) return null;
    const optimizer = new GPUForcedOutcomeOptimizer({context});
    await optimizer.preparePipeline(plan);
    return optimizer;
}

/**
 * Record-then-delegate spy over the real queue's writeBuffer. Gives
 * mock-style observability (captured args) with real device semantics.
 */
export function spyOnQueueWrites(device) {
    const writes = [];
    const queue = device.queue;
    const original = queue.writeBuffer.bind(queue);
    queue.writeBuffer = (...args) => {
        writes.push(args);
        return original(...args);
    };
    return writes;
}

/** Minimal optimization plan with a lane-0 passthrough objective. */
export function laneZeroPlan() {
    return {
        kind: 'optimization-plan',
        numericPolicy: {gpuArithmetic: 'f32'},
        objective: {vectorIndex: 2},
        statConstraints: {predicates: [], bounds: []},
        setConstraints: {minValues: {}, maxValues: {}},
        variations: [{
            id: 'default', index: 0,
            objectiveAst: {compileWGSL: () =>
                'return vec3<f32>((*stats)[0u], (*stats)[0u], (*stats)[0u]);'},
            objectiveUsedStats: ['s'],
            constraintPostEffects: [], constraintUsedStats: [],
            selector: {terms: []},
        }],
    };
}

export const testArtifact = (slot, set, s) => ({
    slot, set,
    getSlot: () => slot,
    getSetName: () => set,
    calculated: {s},
});

/**
 * Hard requirement for suites that run the production GPU engine: installs
 * Dawn globals + navigator and throws when no adapter exists instead of
 * skipping. Predictor suites use this (no CPU fallback by design).
 */
export async function ensureDawnNavigator() {
    if (!await loadWebGPU()) {
        throw new Error('gpuNode: webgpu package failed to load (' + unavailableReason + ')');
    }
    const adapter = await realDevice();
    if (!adapter) {
        throw new Error('gpuNode: no WebGPU adapter; these suites need a real device');
    }
    return adapter;
}

const LOGICAL_AXES = ['flower', 'plume', 'sands', 'goblet', 'circlet'];

/**
 * Independent nested-loop oracle over logical topology regions.
 *
 * This is NOT an engine: it only enumerates complement arrangements
 * (region by region, row-major) so parity tests can assert the dense segment
 * plan covers exactly the same space in the same order. Engine execution is
 * covered by the real device (test/gpuFusedNode.test.js) and the CDP harness.
 */
export function walkLogicalRegions(slots, slot, outcomeArtifacts, topology, visit) {
    const axes = LOGICAL_AXES.filter((axis) => axis !== slot);
    const regions = buildFusedOutcomeRegions(slots, slot, outcomeArtifacts, topology);
    for (const region of regions) {
        const pools = axes.map((axis) => region.slots[axis]);
        const walk = (depth, picks) => {
            if (depth === axes.length) {
                visit(picks.slice());
                return;
            }
            for (const artifact of pools[depth]) {
                picks.push(artifact);
                walk(depth + 1, picks);
                picks.pop();
            }
        };
        walk(0, []);
    }
    return regions;
}
