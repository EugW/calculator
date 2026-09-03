import { Artifact } from '../src/js/classes/Artifact';
import { DB } from '../src/js/db/DB';
import { actionProbabilityBlocks, artifactRollSums, enhancementAllocations, getReshapeInputs,
    hallowedExegesisTransition, randomCraftSubstats, blockRollDistributions } from '../src/js/classes/ArtifactActionProbability';

global.DB = DB;
const pair = ['crit_rate', 'crit_dmg'];
function source() {
    const artifact = new Artifact(5, 20, 'flower', 'GladiatorFinale', 'hp', [
        {stat: 'crit_rate', value: 16.3}, {stat: 'crit_dmg', value: 5.4},
        {stat: 'atk', value: 14}, {stat: 'def', value: 16},
    ]);
    artifact.setMetadata({initialValues: {crit_rate: 2.72, crit_dmg: 5.44, atk: 13.62, def: 16.2}, totalRolls: 8, elixirCrafted: false});
    return artifact;
}

test.each([
    [4, 2, {2: .6875, 3: .25, 4: .0625}],
    [5, 2, {2: .5, 3: .3125, 4: .15625, 5: .03125}],
    [4, 3, {3: .9375, 4: .0625}],
    [5, 3, {3: .8125, 4: .15625, 5: .03125}],
    [4, 4, {4: 1}], [5, 4, {4: .96875, 5: .03125}],
])('backloaded allocation L=%i floor=%i', (rolls, floor, expected) => {
    const hits = {};
    for (const item of enhancementAllocations(rolls, floor)) {
        const hit = item.counts[0] + item.counts[1];
        hits[hit] = (hits[hit] || 0) + item.probability;
        expect(item.counts.reduce((a, b) => a + b)).toBe(rolls);
    }
    expect(hits).toEqual(expected);
});

test('random missing lines are sequential weighted draws without replacement', () => {
    const choices = randomCraftSubstats('hp', pair);
    expect(choices.reduce((sum, item) => sum + item.probability, 0)).toBeCloseTo(1, 13);
    const item = choices.find(item => item.stats.join('/') === 'atk/def');
    const total = 6 + 6 + 4 * 5;
    expect(item.probability).toBeCloseTo(6 * 6 / total * (2 / (total - 6)), 13);
    expect(choices.every(item => !item.stats.some(stat => ['hp', ...pair].includes(stat)))).toBe(true);
});

test('global meter applies payment before triggering and carries overflow', () => {
    expect(hallowedExegesisTransition(4, 0, 'flower')).toMatchObject({floor: 2, points: 5, trigger: 0});
    expect(hallowedExegesisTransition(5, 0, 'goblet')).toMatchObject({floor: 3, points: 1, trigger: 1});
    expect(hallowedExegesisTransition(4, 2, 'goblet')).toMatchObject({floor: 4, points: 0, trigger: 0});
    expect(() => hallowedExegesisTransition(6, 0, 'flower')).toThrow();
});

test('crafted mixed-start PMF sums to one and conditions on 3/4 lines', () => {
    const blocks = actionProbabilityBlocks({kind: 'craft', slot: 'flower', set: 'GladiatorFinale', mainStat: 'hp', pair});
    expect(blocks.reduce((sum, item) => sum + item.probability, 0)).toBeCloseTo(1, 12);
    expect(blocks.filter(item => item.initialLines === 4).reduce((sum, item) => sum + item.probability, 0)).toBeCloseTo(.34, 12);
});

test('reshape preserves base tiers, but new enhancement quality is uncapped and uniform', () => {
    const artifact = source();
    expect(getReshapeInputs(artifact)).toMatchObject({initialLines: 3, baseValues: {crit_rate: 2.72}});
    const blocks = actionProbabilityBlocks({kind: 'reshape', artifact, slot: artifact.slot,
        set: artifact.set, mainStat: artifact.mainStat, pair, floor: 2});
    const block = blocks.find(item => item.counts[0] === 4);
    const cr = blockRollDistributions(block)[0];
    expect(Math.max(...cr.map(item => item.units))).toBeCloseTo((2.72 + 4 * 3.89) * 100, 9);
    expect(artifactRollSums('crit_rate', 1).map(item => item.probability)).toEqual([.25, .25, .25, .25]);
});

test('missing history is not inferred, and crafted choices stay locked', () => {
    const artifact = source();
    artifact.setMetadata({});
    expect(() => getReshapeInputs(artifact)).toThrow('reshape_missing_start');
    const crafted = source();
    crafted.setMetadata({...crafted.getMetadata(), elixirCrafted: true, definedSubstats: pair});
    expect(getReshapeInputs(crafted).lockedPair).toEqual([...pair].sort());
    expect(() => actionProbabilityBlocks({kind: 'reshape', artifact: crafted, slot: crafted.slot,
        set: crafted.set, mainStat: crafted.mainStat, pair: ['atk', 'def'], floor: 2})).toThrow('reshape_locked_pair');
});
