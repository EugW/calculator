import {
    GPU_TOP_K_CAPACITY,
    GPU_TOP_K_ENTRY_BYTES,
    GPU_TOP_K_MAX_BATCH_COMBINATIONS,
    createGPUTopKReductionPlan,
    decodeGPUTopKEntries,
    getGPUEntryTopKShader,
    getGPUScoreTopKShader,
} from "../src/js/classes/GPUTopK";
import { normalizeGPUOptimizerBatchSize } from "../src/js/classes/GPUOptimizerContract";

test.each([
    [1, [20]],
    [20, [20]],
    [21, [20]],
    [256, [20]],
    [257, [40, 20]],
    [512 * 1024, [40960, 3200, 260, 40, 20]],
])('GPU top-K plan reduces %i scores to exact fixed-width stages', (inputCount, outputs) => {
    const plan = createGPUTopKReductionPlan(inputCount);

    expect(plan.passes.map((pass) => pass.outputCount)).toEqual(outputs);
    expect(plan.passes[0].kind).toBe('scores');
    expect(plan.passes.slice(1).every((pass) => pass.kind === 'entries')).toBe(true);
    expect(plan.finalCount).toBe(GPU_TOP_K_CAPACITY);
    expect(plan.finalBuffer).toBe(plan.passes.at(-1).outputBuffer);
});

test('GPU top-K entry decoding restores safe global indices and excludes non-finite scores', () => {
    const buffer = new ArrayBuffer(GPU_TOP_K_CAPACITY * GPU_TOP_K_ENTRY_BYTES);
    const values = new Float32Array(buffer);
    const words = new Uint32Array(buffer);
    const entries = [
        [9, 7],
        [8, 20],
        [0, 2],
        [-3, 5],
        [NaN, 1],
        [Infinity, 3],
        [-Infinity, 4],
    ];
    for (let index = 0; index < entries.length; index++) {
        values[index * 2] = entries[index][0];
        words[index * 2 + 1] = entries[index][1];
    }
    for (let index = entries.length; index < GPU_TOP_K_CAPACITY; index++) {
        values[index * 2] = NaN;
        words[index * 2 + 1] = 0xFFFFFFFF;
    }

    expect(decodeGPUTopKEntries(buffer, 120397149440, 20)).toEqual([
        {value: 9, index: 120397149447},
        {value: 0, index: 120397149442},
        {value: -3, index: 120397149445},
    ]);
});

test('GPU top-K shaders use the deterministic finite-score and ascending-index key', () => {
    const scoreShader = getGPUScoreTopKShader();
    const entryShader = getGPUEntryTopKShader();

    for (const shader of [scoreShader, entryShader]) {
        expect(shader).toContain('left.value > right.value');
        expect(shader).toContain('return left.index < right.index;');
        expect(shader).toContain('& 0x7f800000u');
        expect(shader).toContain('workgroupBarrier();');
        expect(shader).toContain(`array<TopKEntry, 256>`);
    }
    expect(scoreShader).toContain('index_offset: u32');
    expect(scoreShader).toContain('input_scores[input_index]');
    expect(scoreShader).toContain('params.index_offset + input_index');
    expect(entryShader).toContain('entry = input_entries[input_index]');
    expect(entryShader).not.toContain('params.index_offset + input_index');
});

test('GPU top-K planner accepts the portable maximum one-dimensional dispatch', () => {
    const plan = createGPUTopKReductionPlan(GPU_TOP_K_MAX_BATCH_COMBINATIONS);

    expect(plan.passes[0].workgroupCount).toBe(65535);
});

test.each([
    0,
    -1,
    1.5,
    GPU_TOP_K_MAX_BATCH_COMBINATIONS + 1,
    0xFFFFFFFF,
    Number.MAX_SAFE_INTEGER,
])(
    'GPU top-K planner rejects unsupported input count %p',
    (inputCount) => {
        expect(() => createGPUTopKReductionPlan(inputCount)).toThrow('at or below');
    }
);

test.each([
    [undefined, 'auto'],
    ['auto', 'auto'],
    ['1048576', '1048576'],
    ['16777216', String(GPU_TOP_K_MAX_BATCH_COMBINATIONS)],
    ['33554432', String(GPU_TOP_K_MAX_BATCH_COMBINATIONS)],
    ['134217728', String(GPU_TOP_K_MAX_BATCH_COMBINATIONS)],
])('GPU batch setting %p normalizes to the executable value %p', (value, expected) => {
    expect(normalizeGPUOptimizerBatchSize(value)).toBe(expected);
});
