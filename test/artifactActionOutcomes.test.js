import { Artifact } from '../src/js/classes/Artifact';
import { DB } from '../src/js/db/DB';
import { ArtifactActionOutcomeCollector, readArtifactActionOutcome,
    artifactOutcomeLoadout, artifactOutcomeTransferables, artifactOutcomeStats,
    findArtifactActionOutcome } from '../src/js/classes/ArtifactActionOutcomes';

global.DB = DB;
const recipe = {kind: 'craft', slot: 'flower', set: 'GladiatorFinale', mainStat: 'hp', pair: ['crit_rate', 'crit_dmg']};
const artifact = subs => new Artifact(5, 20, recipe.slot, recipe.set, recipe.mainStat, subs);
const best = {value: 120, complement: [0, 1, 2, 3]};

test('packed chunk boundaries, ordering, unconditional mass and read-only complement reconstruction', () => {
    const collector = new ArtifactActionOutcomeCollector({baseValue: 100});
    for (let i = 0; i < 4100; ++i) collector.add({artifact:artifact([{stat:'crit_rate',value:i / 10}]),probability:.0001},
        {...best,value:110 + i});
    const details = collector.finish();
    expect(details.chunks).toHaveLength(2);
    expect(details.length).toBe(4100);
    const first = readArtifactActionOutcome(details, recipe, 0);
    expect(first.value).toBe(4209);
    expect(first.probability).toBe(.0001);
    expect(first.atLeastProbability).toBe(.0001);
    expect(first.artifact.getSubStats()).toEqual([{stat:'crit_rate',value:409.9}]);
    expect(readArtifactActionOutcome(details, recipe, 4099).value).toBe(110);
    expect(readArtifactActionOutcome(details, recipe, 4099).atLeastProbability).toBeCloseTo(.41, 14);
    expect(readArtifactActionOutcome(details, recipe, 4100)).toBeNull();
    expect(findArtifactActionOutcome(details, recipe, {crit_rate: '409.8'})).toBe(1);
    expect(findArtifactActionOutcome(details, recipe, {crit_rate: '0.1'})).toBe(4098);
    const inventory = ['plume', 'sands', 'goblet', 'circlet'];
    expect(artifactOutcomeLoadout(first, inventory)).toEqual([first.artifact, ...inventory]);
    expect(artifactOutcomeTransferables({rows:[{outcomeDetails:details},{error:'none'}]}))
        .toEqual([...details.chunks.map(chunk => chunk.buffer),details.order.buffer,details.atLeastProbabilities.buffer]);
    // Native structured-clone transfer detaches originals and preserves readable records.
    const transferred = structuredClone(details, {transfer:artifactOutcomeTransferables({rows:[{outcomeDetails:details}]})});
    expect(details.chunks[0].byteLength).toBe(0);
    expect(details.atLeastProbabilities.byteLength).toBe(0);
    expect(readArtifactActionOutcome(transferred, recipe, 0).value).toBe(4209);
    expect(readArtifactActionOutcome(transferred, recipe, 4099).atLeastProbability).toBeCloseTo(.41, 14);
});

test('comparison derives selectable stats from every gallery outcome, with no extra prediction metadata', () => {
    const collector = new ArtifactActionOutcomeCollector({baseValue: 100});
    collector.add({artifact: artifact([{stat: 'crit_rate', value: 7.8},
        {stat: 'crit_dmg', value: 15.5}]), probability: .1}, best);
    collector.add({artifact: artifact([{stat: 'crit_rate', value: 7.8}, {stat: 'atk_percent', value: 5.8},
        {stat: 'crit_dmg', value: 15.5}]), probability: .1}, {...best, value: 125});
    const details = structuredClone(collector.finish());
    expect(details).not.toHaveProperty('usefulStats');
    expect(artifactOutcomeStats(details, recipe)).toEqual(['atk_percent', 'crit_rate', 'crit_dmg']);
    expect(findArtifactActionOutcome(details, recipe, {crit_rate: '7.8', crit_dmg: '15.5', atk_percent: '', recharge: 0})).toBe(1);
    expect(findArtifactActionOutcome(details, recipe, {crit_rate: 7.8, crit_dmg: 15.5, atk_percent: 5.8})).toBe(0);
    // Missing lines are not wildcards, and unexpected lines must not be ignored.
    expect(findArtifactActionOutcome(details, recipe, {crit_rate: 7.8})).toBe(-1);
    expect(findArtifactActionOutcome(details, recipe, {crit_rate: 7.8, crit_dmg: 15.5, recharge: 5.2})).toBe(-1);
    expect(findArtifactActionOutcome(details, recipe, {crit_rate: 7.9, crit_dmg: 15.5})).toBe(-1);
});

test('comparison reports missing and non-improving outcomes without falling back to a nearby rank', () => {
    const collector = new ArtifactActionOutcomeCollector({baseValue: 100});
    collector.add({artifact: artifact([{stat: 'crit_rate', value: 3.9}]), probability: .5}, {...best, value: 100});
    collector.add({artifact: artifact([{stat: 'crit_rate', value: 7.8}]), probability: .5}, best);
    const details = collector.finish();
    expect(findArtifactActionOutcome(details, recipe, {crit_rate: 3.9})).toBe(-1);
    for (const value of ['', 0, -1, Infinity, 'invalid']) {
        expect(findArtifactActionOutcome(details, recipe, {crit_rate: value})).toBe(-1);
    }
    collector.discard();
    expect(findArtifactActionOutcome(collector.finish(), recipe, {})).toBe(-1);
});

test('an improving outcome with only VOID lines can be compared with blank inputs', () => {
    const collector = new ArtifactActionOutcomeCollector({baseValue: 100});
    collector.add({artifact: artifact([]), probability: 1}, best);
    const details = collector.finish();
    expect(artifactOutcomeStats(details, recipe)).toEqual([]);
    expect(findArtifactActionOutcome(details, recipe, {})).toBe(0);
});

test('cumulative probabilities include all equal-score states across pages and chunks', () => {
    const collector = new ArtifactActionOutcomeCollector({baseValue:100});
    collector.add({artifact:artifact([{stat:'crit_rate',value:1}]),probability:.01},{...best,value:140});
    for (let i = 0; i < 4100; ++i) collector.add({artifact:artifact([{stat:'crit_rate',value:i / 10}]),probability:.0001},
        {...best,value:130});
    collector.add({artifact:artifact([{stat:'crit_rate',value:2}]),probability:.08},{...best,value:120});
    collector.add({artifact:artifact([]),probability:.5},{value:100});
    const details = collector.finish();
    expect(details.length).toBe(4102);
    expect(readArtifactActionOutcome(details,recipe,0).atLeastProbability).toBe(.01);
    for (const rank of [1,4,5,4095,4096,4100]) {
        expect(readArtifactActionOutcome(details,recipe,rank).atLeastProbability).toBeCloseTo(.42,14);
    }
    expect(readArtifactActionOutcome(details,recipe,4101).atLeastProbability).toBeCloseTo(.5,14);
});

test('retained builds copy four IDs without retaining a view into all outcome complements', () => {
    const first = new ArtifactActionOutcomeCollector({baseValue:100});
    const ids = new Int32Array(400).fill(-1);
    ids.set([0, 1, 2, 3], 100);
    const outcome = {artifact:artifact([]),probability:1};
    first.add(outcome, {...best, complement: ids.subarray(100, 104)});
    ids.fill(99);
    expect(first.finish().builds).toEqual([[0, 1, 2, 3]]);
    first.discard();
    first.add(outcome, best);
    expect(first.finish().length).toBe(1);
});
