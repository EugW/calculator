import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { WGSLMegaKernelCompiler } from "../src/js/classes/Feature2/WGSLCompiler";
import { Rotation } from "../src/js/classes/Rotation";
import { ROTATION_TEAM } from "../src/js/classes/RotationCompiler";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { ensureDawnNavigator } from './support/gpuNode';
import { makeBuild } from "./support/team";

global.DB = DB;

// A reaction the team deals together (Feature2/Reaction/Team) as a search
// objective: its ranking (sums and maximums of two) lowers to WGSL and gives
// the CPU's values on a device, alone and as a hit of the team's rotation.

const LUNAR_CHARGED = 'reaction.lunarcharged';

function artifacts() {
    const mains = ['hp', 'atk', 'mastery', 'mastery', 'crit_rate'];
    return DB.Artifacts.Slots.getKeys().map((slot, index) => new Artifact(5, 20, slot, 'NoblesseOblige', mains[index],
        [{stat: 'mastery', value: 40}, {stat: 'crit_dmg', value: 14}]));
}

function setup(featureName) {
    const members = ['Fischl', 'Ineffa', 'Xingqiu', 'Kazuha'].map(makeBuild);
    const team = Team.fromMember(members[0]);
    members.slice(1).forEach((member, index) => team.setMember(index + 1, member));
    members[0].replaceArtifacts(artifacts());
    // Ineffa's CRIT Rate is above 100% and constant to the search: its cap
    // is of a constant in the kernel.
    members[1].modifyBuffsSettings({'custom_buffs.crit_rate': 100});
    team.setRotation(new Rotation({items: [
        {type: 'feature', charId: members[1].char.getId(), feature: LUNAR_CHARGED, count: 3, reaction: 0},
        {type: 'feature', charId: members[0].char.getId(), feature: 'attack.normal_hit_1', count: 2, reaction: 0},
    ]}));

    const suggester = new ArtifactsSuggest({
        build: members[0],
        artifacts: Object.values(members[0].getArtifacts()).filter(Boolean),
        featureName,
        featureType: 'average',
        settings: {sets_settings: {}, stats: {}, setMinValues: {}, setMaxValues: {}},
        limit: 20,
        useGPU: true,
        showBeta: true,
    });
    suggester.prepare();
    // The plan gives the equipped build what a fresh view of it does.
    const fresh = members[0].view().getFeatureResultByName(featureName).average;
    const planned = suggester.evaluateArtifactCombination(Object.values(members[0].getArtifacts()).filter(Boolean));
    expect(Math.abs(planned - fresh)).toBeLessThan(fresh * 1e-9);
    return suggester;
}

test.each([LUNAR_CHARGED, ROTATION_TEAM])('%s compiles to WGSL and matches the CPU on a device', async (featureName) => {
    const suggester = setup(featureName);
    const compiler = new WGSLMegaKernelCompiler();
    compiler.addOptimizationPlan(suggester.optimizationPlan);

    const {functions, statCount} = compiler.buildVariationFunctions({});
    const statMap = compiler.getStatIndexMap();
    const stats = Object.fromEntries(Object.keys(statMap).map((stat) => [stat, suggester.buildData.stats[stat] || 0]));
    const expected = Function('stats', suggester.optimizationPlan.variations[0].objectiveAst.compile({}))({...stats});
    // Four contributors, each with a CRIT of its own: the three results differ.
    expect(expected[0]).toBeGreaterThan(0);
    expect(expected[2]).toBeGreaterThan(expected[0]);
    expect(expected[1]).toBeGreaterThan(expected[2]);

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
