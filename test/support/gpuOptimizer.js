import {GPUArtifactOptimizer} from '../../src/js/classes/GPUArtifactOptimizer';

export function installGPUConstants() {
    const previousGPUBufferUsage = global.GPUBufferUsage;
    const previousGPUMapMode = global.GPUMapMode;
    const previousGPUShaderStage = global.GPUShaderStage;

    beforeAll(() => {
        global.GPUBufferUsage = {
            STORAGE: 1,
            COPY_SRC: 2,
            COPY_DST: 4,
            MAP_READ: 8,
            UNIFORM: 16,
        };
        global.GPUMapMode = { READ: 1 };
        global.GPUShaderStage = {COMPUTE: 1};
    });

    afterAll(() => {
        global.GPUBufferUsage = previousGPUBufferUsage;
        global.GPUMapMode = previousGPUMapMode;
        global.GPUShaderStage = previousGPUShaderStage;
    });


}

export function makeArtifact(id) {
    return {
        id,
        set: 'test_set',
        calculated: {},
    };
}

export function makeSlots(flowerCount = 1) {
    return {
        flower: Array.from({ length: flowerCount }, (_, index) => makeArtifact(`flower-${index}`)),
        plume: [makeArtifact('plume')],
        sands: [makeArtifact('sands')],
        goblet: [makeArtifact('goblet')],
        circlet: [makeArtifact('circlet')],
    };
}

export function makePreparedOptimizer(mappedResults = [], optimizerOptions = {}, Engine = GPUArtifactOptimizer) {
    const optimizer = new Engine(optimizerOptions);
    const gpuCalls = {
        mapAsync: jest.fn(() => Promise.resolve()),
        onSubmittedWorkDone: jest.fn(() => Promise.resolve()),
        copyBufferToBuffer: jest.fn(),
        dispatchWorkgroups: jest.fn(),
    };
    const mappedResultSequence = Array.isArray(mappedResults[0])
        ? mappedResults
        : [mappedResults];
    let mappedResultIndex = 0;

    const writeMappedResults = (mappedData, values) => {
        const floatValues = new Float32Array(mappedData);
        const words = new Uint32Array(mappedData);
        for (let index = 0; index < mappedData.byteLength / 8; index++) {
            floatValues[index * 2] = NaN;
            words[index * 2 + 1] = 0xFFFFFFFF;
        }

        const reducedResults = values
            .map((value, index) => ({value, index}))
            .filter((item) => Number.isFinite(item.value))
            .sort((left, right) => right.value - left.value || left.index - right.index)
            .slice(0, 20);
        for (let index = 0; index < Math.min(reducedResults.length, mappedData.byteLength / 8); index++) {
            floatValues[index * 2] = reducedResults[index].value;
            words[index * 2 + 1] = reducedResults[index].index;
        }
    };

    const device = {
        limits: {},
        destroy: jest.fn(),
        createShaderModule: jest.fn(() => ({getCompilationInfo: async () => ({messages: []})})),
        createBindGroupLayout: jest.fn(descriptor => descriptor),
        createPipelineLayout: jest.fn(descriptor => descriptor),
        createComputePipeline: jest.fn(descriptor => descriptor),
        queue: {
            writeBuffer: jest.fn(),
            submit: jest.fn(),
            onSubmittedWorkDone: gpuCalls.onSubmittedWorkDone,
        },
        createBuffer: jest.fn(({ size, usage, label }) => {
            const mappedData = new ArrayBuffer(size);
            const isMapRead = (usage & global.GPUBufferUsage.MAP_READ) !== 0;

            return {
                label,
                usage,
                destroy: jest.fn(),
                getMappedRange: jest.fn(() => {
                    if (isMapRead) {
                        const values = mappedResultSequence[Math.min(
                            mappedResultIndex,
                            mappedResultSequence.length - 1
                        )] || [];
                        writeMappedResults(mappedData, values);
                        mappedResultIndex++;
                    }
                    return mappedData;
                }),
                mapAsync: gpuCalls.mapAsync,
                unmap: jest.fn(),
            };
        }),
        createBindGroup: jest.fn(() => ({})),
        createCommandEncoder: jest.fn(() => ({
            beginComputePass: jest.fn(() => ({
                setPipeline: jest.fn(),
                setBindGroup: jest.fn(),
                dispatchWorkgroups: gpuCalls.dispatchWorkgroups,
                end: jest.fn(),
            })),
            copyBufferToBuffer: gpuCalls.copyBufferToBuffer,
            finish: jest.fn(() => ({})),
        })),
    };

    optimizer.context.device = device;
    if (Engine === GPUArtifactOptimizer) {
        optimizer.topKDevice = device;
        optimizer.pipeline = {};
        optimizer.topKScorePipeline = {};
        optimizer.topKEntryPipeline = {};
        optimizer.topKBindGroupLayout = {};
    }
    optimizer.prepared = {device, module: {},
        featureVariants: {default: {setInfo: []}}, variationMap: new Map([['default', 0]]),
        statIndexMap: {__test_dummy_stat__: 0}};
    optimizer.testGPUCalls = gpuCalls;

    return optimizer;
}
