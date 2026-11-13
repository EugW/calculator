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
 *
 * On Windows the device is Vulkan's when the system has a Vulkan loader (see
 * dawnBackends): the kernel of a real search does not compile on Dawn's
 * default there. DAWN_BACKEND (d3d12, vulkan, ...) names another.
 */
import { copyFileSync, existsSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

/**
 * The backends to ask Dawn for, in order; '' is its own choice.
 *
 * On Windows that choice is D3D12, whose shaders the package can only compile
 * with FXC (it has no DXC): FXC fails on a kernel of several set variations
 * of a team rotation, which Vulkan compiles.
 */
function dawnBackends() {
    if (process.env.DAWN_BACKEND) return [process.env.DAWN_BACKEND];
    return process.platform == 'win32' && vulkanLoaderBesideDawn() ? ['vulkan', ''] : [''];
}

/**
 * Dawn loads its DLLs only from beside dawn.node, so the system's Vulkan
 * loader is copied there once; it finds the drivers wherever it is.
 *
 * @returns {boolean} whether Dawn can load Vulkan
 */
function vulkanLoaderBesideDawn() {
    try {
        const target = join(dirname(require.resolve('webgpu')), 'dist', 'win32-' + process.arch, 'vulkan-1.dll');
        const source = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'vulkan-1.dll');
        if (!existsSync(target) && existsSync(source)) {
            // Test files run in parallel: none may load half a copy.
            const partial = target + '.' + process.pid + '.tmp';
            copyFileSync(source, partial);
            try {
                renameSync(partial, target);
            } catch {
                rmSync(partial, {force: true});
            }
        }
        return existsSync(target);
    } catch {
        return false;
    }
}

async function requestAdapter() {
    try {
        return await globalThis.navigator.gpu.requestAdapter();
    } catch {
        return null;
    }
}

/** A live Dawn device, or null when unavailable. Idempotent per file. */
export async function realDevice() {
    if (!await loadWebGPU()) return null;
    if (!globalThis.navigator?.gpu) {
        Object.assign(globalThis, webgpu.globals);
        for (const backend of dawnBackends()) {
            globalThis.navigator = {gpu: webgpu.create(backend ? ['backend=' + backend] : [])};
            if (await requestAdapter()) break;
        }
    }
    return requestAdapter();
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
