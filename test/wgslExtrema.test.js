import {CBlock} from '../src/js/classes/Feature2/Compile/Types';
import {CMax, CMin, CMulti} from '../src/js/classes/Feature2/Compile/Types/Block';
import {CConst, CStat} from '../src/js/classes/Feature2/Compile/Types/Item';
import {ensureDawnNavigator, skipWhenNoGPU} from './support/gpuNode';

const constant = value => new CConst({value});
const statIndex = Object.fromEntries(Array.from({length: 6}, (_, index) => [`s${index}`, index]));
const inputs = count => Array.from({length: count}, (_, index) => new CStat({stat: `s${index}`}));

test.each([[CMax, 'max'], [CMin, 'min']])('%s preserves empty, unary, and binary WGSL lowering', (Block, name) => {
    expect(new Block([]).compileWGSL({})).toBeUndefined();
    expect(new Block([new CBlock([])]).compileWGSL({})).toBeUndefined();
    expect(new Block([constant(-3)]).compileWGSL({})).toBe('-3.0');
    expect(new Block([constant(-3), constant(7)]).compileWGSL({})).toBe(`${name}(-3.0, 7.0)`);
    expect(new Block([constant(-3), new CBlock([]), constant(7)]).compileWGSL({})).toBe(`${name}(-3.0, 7.0)`);
});

test.each([[CMax, 'max'], [CMin, 'min']])('%s emits binary calls for three or more surviving operands', (Block, name) => {
    const expression = new Block([constant(-3), new CBlock([]), constant(7), constant(2), constant(-11)]);
    expect(expression.compileWGSL({})).toBe(`${name}(${name}(${name}(-3.0, 7.0), 2.0), -11.0)`);
    expect(Function('return ' + expression.compile({}))()).toBe(name === 'max' ? 7 : -11);
});

test('real WGSL extrema and the capped four-member mastery expression match CPU evaluation', async () => {
    if (await skipWhenNoGPU()) return;
    const adapter = await ensureDawnNavigator();
    const device = await adapter.requestDevice();
    const expressions = [3, 4, 6].flatMap(count => [new CMax(inputs(count)), new CMin(inputs(count))]);
    // Nahida's A1 shape: 25% of the highest member mastery, capped at 250.
    expressions.push(new CMin([new CMulti([constant(0.25), new CMax(inputs(4))]), constant(250)]));
    const rows = [
        [-9, -3, -7, -12, -2, -15],
        [40, 10, 20, 30, 50, 60],
        [10, 40, 20, 30, 5, -1],
        [10, 20, 40, 30, 5, -1],
        [10, 20, 30, 40, 5, -1],
        [0, 0, 0, 0, 0, 0],
        [300, 300, 300, 300, 300, 300],
        [100, 500, 250, 1200, 150, 200],
    ];
    const code = `
@group(0) @binding(0) var<storage, read> input_values: array<f32>;
@group(0) @binding(1) var<storage, read_write> results: array<f32>;
@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    var values: array<f32, 6>;
    for (var i = 0u; i < 6u; i++) { values[i] = input_values[id.x * 6u + i]; }
    ${expressions.map((expression, index) => `results[id.x * ${expressions.length}u + ${index}u] = ${expression.compileWGSL({statIndex, statsVar: 'values'})};`).join('\n    ')}
}`;
    const buffers = [];
    try {
        const module = device.createShaderModule({code});
        const info = await module.getCompilationInfo();
        expect(info.messages.filter(message => message.type === 'error')).toEqual([]);
        const pipeline = await device.createComputePipelineAsync({layout: 'auto', compute: {module, entryPoint: 'main'}});
        const data = new Float32Array(rows.flat());
        const size = rows.length * expressions.length * 4;
        const input = device.createBuffer({size: data.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
        const output = device.createBuffer({size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC});
        const readback = device.createBuffer({size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ});
        buffers.push(input, output, readback);
        device.queue.writeBuffer(input, 0, data);
        const bindings = device.createBindGroup({layout: pipeline.getBindGroupLayout(0), entries: [
            {binding: 0, resource: {buffer: input}}, {binding: 1, resource: {buffer: output}},
        ]});
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline); pass.setBindGroup(0, bindings); pass.dispatchWorkgroups(rows.length); pass.end();
        encoder.copyBufferToBuffer(output, 0, readback, 0, size);
        device.queue.submit([encoder.finish()]);
        await readback.mapAsync(GPUMapMode.READ);
        const actual = [...new Float32Array(readback.getMappedRange())];
        readback.unmap();
        const expected = rows.flatMap(row => {
            const stats = Object.fromEntries(row.map((value, index) => [`s${index}`, value]));
            return expressions.map(expression => Function('stats', 'return ' + expression.compile({}))(stats));
        });
        expect(actual).toEqual(expected);
    } finally {
        buffers.forEach(buffer => buffer.destroy());
        device.destroy();
    }
}, 120000);
