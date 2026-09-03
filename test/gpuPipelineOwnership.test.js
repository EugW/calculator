import {GPUArtifactOptimizer} from '../src/js/classes/GPUArtifactOptimizer';
import {GPUForcedOutcomeOptimizer} from '../src/js/classes/GPUForcedOutcomeOptimizer';
import {GPUDeviceContext} from '../src/js/classes/GPUDeviceContext';
import {GPUOptimizerInputs} from '../src/js/classes/GPUOptimizerInputs';
import {installGPUConstants, makeSlots, makePreparedOptimizer} from './support/gpuOptimizer';

installGPUConstants();

const source = () => ({default: {usedStats: [], setInfo: [], processed: {
    compileWGSL: () => 'return vec3<f32>(0.0, 0.0, 0.0);',
}}});
const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return {promise, resolve};
};
const originalNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
afterEach(() => {
    if (originalNavigator) Object.defineProperty(global, 'navigator', originalNavigator);
    else delete global.navigator;
});

function installAdapter(device, storageBuffers = 8) {
    const lost = deferred();
    device.lost = lost.promise;
    device.limits = {maxStorageBuffersPerShaderStage: Math.min(6, storageBuffers),
        maxStorageBufferBindingSize: 128 * 1024 * 1024, maxBufferSize: 256 * 1024 * 1024};
    const adapter = {limits: {...device.limits, maxStorageBuffersPerShaderStage: storageBuffers},
        requestDevice: jest.fn(async () => device)};
    const gpu = {requestAdapter: jest.fn(async () => adapter)};
    Object.defineProperty(global, 'navigator', {configurable: true, value: {gpu}});
    return {adapter, gpu, lost};
}

function searchOptions() {
    const slots = makeSlots();
    for (const [slot, artifacts] of Object.entries(slots)) artifacts[0].slot = slot;
    return {slots, buildData: {stats: {}}, setData: {}, targetSlot: 'goblet', outcomeArtifacts: slots.goblet};
}

test('fused-only preparation and execution compile no normal evaluator or top-20 reducers', async () => {
    const {device} = makePreparedOptimizer();
    const context = new GPUDeviceContext();
    context.device = device;
    const fused = new GPUForcedOutcomeOptimizer({context});
    await fused.preparePipeline(source());
    await fused.optimizeForcedOutcomes(searchOptions());
    const modules = device.createShaderModule.mock.calls.map(([descriptor]) => descriptor.code);
    expect(modules).toHaveLength(1);
    expect(modules[0]).toContain('fn main_fused_goblet(');
    expect(modules[0]).not.toContain('fn main(');
    expect(modules[0]).not.toContain('result_values');
    expect(modules[0]).not.toContain('fused_progress');
    expect(modules[0]).not.toContain('dispatch_variation_w');
    expect(device.createComputePipeline.mock.calls.map(([descriptor]) => descriptor.compute.entryPoint))
        .toEqual(['main_fused_goblet']);
    expect(fused).not.toHaveProperty('pipeline');
    expect(fused).not.toHaveProperty('topKScorePipeline');
    expect(Object.isFrozen(fused.prepared.statIndexMap)).toBe(true);
});

test('normal and fused programs coexist without overwriting each other on one device', async () => {
    const {device} = makePreparedOptimizer();
    const context = new GPUDeviceContext();
    context.device = device;
    const normal = new GPUArtifactOptimizer({context});
    const fused = new GPUForcedOutcomeOptimizer({context});
    await normal.preparePipeline(source());
    await normal.optimize(searchOptions());
    const program = normal.prepared;
    const pipeline = normal.pipeline;
    const reducer = normal.topKScorePipeline;
    expect(device.createShaderModule).toHaveBeenCalledTimes(3);
    for (const [descriptor] of device.createShaderModule.mock.calls) expect(descriptor.code).not.toContain('main_fused');
    await fused.preparePipeline(source());
    await fused.optimizeForcedOutcomes(searchOptions());
    expect(normal.prepared).toBe(program);
    expect(normal.pipeline).toBe(pipeline);
    expect(normal.topKScorePipeline).toBe(reducer);
    fused.destroy();
    expect(device.destroy).not.toHaveBeenCalled();
    await normal.optimize(searchOptions());
    expect(normal.lastOptimizeProfile.topKPipelineReused).toBe(true);
    normal.destroy();
    expect(device.destroy).not.toHaveBeenCalled();
    context.destroy();
    expect(device.destroy).toHaveBeenCalledTimes(1);
});

test('independent encoders preserve region-local set numbering', () => {
    const first = new GPUOptimizerInputs();
    const second = new GPUOptimizerInputs();
    const slots = makeSlots();
    first.preBuildSetIdMap(slots, {}, {});
    const originalId = first.getSetIdNumber('test_set');
    second.preBuildSetIdMap(slots, {a_set: {}}, {});
    expect(second.getSetIdNumber('test_set')).not.toBe(originalId);
    expect(first.getSetIdNumber('test_set')).toBe(originalId);
});

test.each([4, 6, 8])('device acquisition shares the device and negotiates %i available storage bindings', async available => {
    const {device} = makePreparedOptimizer();
    const {adapter, gpu} = installAdapter(device, available);
    const context = new GPUDeviceContext();
    const normal = new GPUArtifactOptimizer({context});
    const fused = new GPUForcedOutcomeOptimizer({context});
    expect(await Promise.all([normal.initialize(), fused.initialize()])).toEqual([true, available >= 6]);
    expect(gpu.requestAdapter).toHaveBeenCalledTimes(1);
    expect(adapter.requestDevice).toHaveBeenCalledTimes(1);
    expect(adapter.requestDevice.mock.calls[0][0].requiredLimits.maxStorageBuffersPerShaderStage)
        .toBe(Math.min(available, 6));
    context.destroy();
});

test.each([GPUArtifactOptimizer, GPUForcedOutcomeOptimizer])('an engine owns a device only when created without a shared context: %p', Engine => {
    const engine = new Engine();
    const {device} = makePreparedOptimizer();
    engine.context.device = device;
    engine.destroy();
    engine.destroy();
    expect(device.destroy).toHaveBeenCalledTimes(1);
});

test('device loss rejects a stalled fused dispatch and releases all per-run buffers', async () => {
    const {device} = makePreparedOptimizer();
    const {lost} = installAdapter(device);
    const context = new GPUDeviceContext();
    await context.initialize(6);
    const fused = new GPUForcedOutcomeOptimizer({context});
    await fused.preparePipeline(source());
    device.queue.onSubmittedWorkDone.mockImplementation(() => new Promise(() => {}));
    const result = fused.optimizeForcedOutcomes(searchOptions());
    const rejected = expect(result).rejects.toThrow('WebGPU device lost: test loss');
    expect(context.pending.size).toBe(1);
    lost.resolve({message: 'test loss'});
    await rejected;
    expect(context.device).toBeNull();
    expect(context.pending.size).toBe(0);
    for (const {value: buffer} of device.createBuffer.mock.results) expect(buffer.destroy).toHaveBeenCalledTimes(1);
});

test('normal reducers are recreated after the shared device is replaced by another engine', async () => {
    const first = makePreparedOptimizer().device;
    const {lost} = installAdapter(first);
    const context = new GPUDeviceContext();
    const normal = new GPUArtifactOptimizer({context});
    await normal.initialize();
    await normal.preparePipeline(source());
    await normal.optimize(searchOptions());
    const oldReducer = normal.topKScorePipeline;
    lost.resolve({message: 'replaced'});
    await Promise.resolve();
    const second = makePreparedOptimizer().device;
    installAdapter(second);
    const fused = new GPUForcedOutcomeOptimizer({context});
    await fused.initialize();
    await expect(normal.optimize(searchOptions())).rejects.toThrow('not prepared');
    await normal.preparePipeline(source());
    await normal.optimize(searchOptions());
    expect(normal.topKScorePipeline).not.toBe(oldReducer);
    expect(normal.topKDevice).toBe(second);
    expect(second.createShaderModule).toHaveBeenCalledTimes(3);
    context.destroy();
});

test('destroy during acquisition releases the eventual device instead of adopting it', async () => {
    const {device} = makePreparedOptimizer();
    const {adapter} = installAdapter(device);
    const acquired = deferred();
    adapter.requestDevice.mockReturnValue(acquired.promise);
    const context = new GPUDeviceContext();
    const initialized = context.initialize();
    await Promise.resolve();
    context.destroy();
    acquired.resolve(device);
    expect(await initialized).toBe(false);
    expect(context.device).toBeNull();
    expect(device.destroy).toHaveBeenCalledTimes(1);
});

test('fused programs compile once per device and source; semantics stay per caller', async () => {
    const {device} = makePreparedOptimizer();
    const context = new GPUDeviceContext();
    context.device = device;
    const first = new GPUForcedOutcomeOptimizer({context});
    await first.preparePipeline(source());
    await first.optimizeForcedOutcomes(searchOptions());
    first.destroy();
    const second = new GPUForcedOutcomeOptimizer({context});
    await second.preparePipeline(source());
    expect(second.lastPrepareProfile.cached).toBe(true);
    await second.optimizeForcedOutcomes(searchOptions());
    expect(device.createShaderModule).toHaveBeenCalledTimes(1);
    expect(device.createComputePipeline).toHaveBeenCalledTimes(1);
    // A different objective is a different program.
    const other = new GPUForcedOutcomeOptimizer({context});
    await other.preparePipeline({default: {usedStats: [], setInfo: [], processed: {
        compileWGSL: () => 'return vec3<f32>(1.0, 1.0, 1.0);'}}});
    expect(device.createShaderModule).toHaveBeenCalledTimes(2);
    expect(other.prepared.module).not.toBe(second.prepared.module);
    // A failed compile is not cached.
    const failing = source();
    failing.default.processed.compileWGSL = () => 'return vec3<f32>(2.0, 2.0, 2.0);';
    device.createShaderModule.mockImplementationOnce(() => { throw new Error('compile failed'); });
    await expect(new GPUForcedOutcomeOptimizer({context}).preparePipeline(failing)).rejects.toThrow('compile failed');
    const retry = new GPUForcedOutcomeOptimizer({context});
    await retry.preparePipeline(failing);
    expect(retry.lastPrepareProfile.cached).toBe(false);
    // Another device never sees these programs.
    const {device: fresh} = makePreparedOptimizer();
    const freshContext = new GPUDeviceContext();
    freshContext.device = fresh;
    await new GPUForcedOutcomeOptimizer({context: freshContext}).preparePipeline(source());
    expect(fresh.createShaderModule).toHaveBeenCalledTimes(1);
});
