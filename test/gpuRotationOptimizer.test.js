import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { CalcSet } from "../src/js/classes/CalcSet";
import { WGSLMegaKernelCompiler } from "../src/js/classes/Feature2/WGSLCompiler";
import { Serializer } from "../src/js/classes/Serializer";
import { DB } from "../src/js/db/DB";
import { ensureDawnNavigator } from './support/gpuNode';

global.DB = DB;

const ROTATION_BUILD = 'blDwggkkkdbcdDcDmgfbbfcBefubbedtgCgiCnkPoachfuccedveBpkMwhBqachfudgekKegGbbKjeCgachfuepekNtjBfgCbfCoachfufkejBjdqhCsgIcabgdCicGhcbcdqrdErlbIWuckjkdcelfigkhDvgbCGmcdefgBoEjgbFXwcdbefbhkmCbCcCriBifBhCBwBgfBfDZOiCdfCeBDPgCnbCoBDPgCpbCyhdabaabIqbbdyemdbb';

test('GPU optimizer compiles a serialized rotation objective and matches CPU evaluation on device', async () => {
    const build = CalcSet.deserialize(Serializer.unpack(ROTATION_BUILD));
    const artifacts = Object.values(build.getArtifacts()).filter(Boolean);
    const suggester = new ArtifactsSuggest({
        build,
        artifacts,
        featureName: 'rotation.total',
        featureType: 'average',
        settings: {
            sets_settings: {},
            stats: {},
            setMinValues: {},
            setMaxValues: {},
        },
        limit: 20,
        useGPU: true,
        showBeta: true,
    });

    suggester.prepare();

    const compiler = new WGSLMegaKernelCompiler();
    compiler.addOptimizationPlan(suggester.optimizationPlan);

    const kernel = compiler.getMegaKernel({});
    expect(compiler.getMegaKernel({})).toBe(kernel);
    const {functions, statCount} = compiler.buildVariationFunctions({});
    const statMap = compiler.getStatIndexMap();
    const stats = Object.fromEntries(Object.keys(statMap).map(stat => [stat, suggester.buildData.stats[stat] || 0]));
    const expected = Function('stats', suggester.optimizationPlan.variations[0].objectiveAst.compile({}))({...stats});
    expect(expected[2]).toBeGreaterThan(0);

    const adapter = await ensureDawnNavigator();
    const device = await adapter.requestDevice();
    const input = device.createBuffer({size: statCount * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    const output = device.createBuffer({size: 12, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC});
    const readback = device.createBuffer({size: 12, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST});
    try {
        const values = new Float32Array(statCount);
        for (const [stat, index] of Object.entries(statMap)) values[index] = stats[stat];
        device.queue.writeBuffer(input, 0, values);
        const module = device.createShaderModule({code: `
${functions.join('\n')}
@group(0) @binding(0) var<storage, read> input_stats: array<f32>;
@group(0) @binding(1) var<storage, read_write> scores: array<f32>;
@compute @workgroup_size(1) fn main() {
    var stats: array<f32, ${statCount}>;
    for (var i = 0u; i < ${statCount}u; i++) { stats[i] = input_stats[i]; }
    let result = eval_v0(&stats);
    scores[0] = result.x; scores[1] = result.y; scores[2] = result.z;
}`});
        const pipeline = await device.createComputePipelineAsync({layout: 'auto', compute: {module, entryPoint: 'main'}});
        const bindGroup = device.createBindGroup({layout: pipeline.getBindGroupLayout(0), entries: [
            {binding: 0, resource: {buffer: input}}, {binding: 1, resource: {buffer: output}},
        ]});
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(1);
        pass.end();
        encoder.copyBufferToBuffer(output, 0, readback, 0, 12);
        device.queue.submit([encoder.finish()]);
        await readback.mapAsync(GPUMapMode.READ);
        const actual = new Float32Array(readback.getMappedRange());
        for (let i = 0; i < 3; ++i) {
            expect(Math.abs(actual[i] - expected[i])).toBeLessThan(Math.max(1, Math.abs(expected[i])) * 1e-4);
        }
        readback.unmap();
    } finally {
        input.destroy(); output.destroy(); readback.destroy(); device.destroy();
    }
}, 120000);
