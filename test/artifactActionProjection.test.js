import { Artifact } from '../src/js/classes/Artifact';
import { ArtifactsSuggest } from '../src/js/classes/ArtifactsSuggest';
import { CalcSet } from '../src/js/classes/CalcSet';
import { DB } from '../src/js/db/DB';
import { makeArtifactOptimizerSettings } from '../src/js/classes/ArtifactOptimizerSettings';
import { actionProbabilityBlocks, blockRollDistributions } from '../src/js/classes/ArtifactActionProbability';
import { projectArtifactAction, countProjectedArtifactAction, iterateProjectedArtifactAction } from '../src/js/classes/ArtifactActionProjection';
import { createArtifactActionAccumulator, evaluateArtifactActionPredictions } from '../src/js/classes/ArtifactActionPredictor';
import { ensureDawnNavigator } from './support/gpuNode';

global.DB = DB;
// Production forced-outcome engine on Dawn (no CPU fallback by design).
jest.setTimeout(180000);
beforeAll(async () => {
    await ensureDawnNavigator();
}, 120000);
const craft = {kind: 'craft', slot: 'flower', set: 'GladiatorFinale', mainStat: 'hp', pair: ['crit_rate', 'crit_dmg']};
const key = subs => JSON.stringify(subs.map(({stat, value}) => [stat, value]).sort((a, b) => a[0].localeCompare(b[0])));

// Pre-VOID implementation, deliberately retaining all identity/allocation paths.
// Aggregate only in this small-fixture oracle, never in production.
function reference(action, usedStats) {
    const pmf = new Map();
    let count = 0;
    for (const block of actionProbabilityBlocks(action)) {
        const ds = blockRollDistributions(block, usedStats).map((distribution, index) => {
            const scale = DB.Artifacts.Substats.get(block.stats[index]).type === 'percent' ? 10 : 1;
            const merged = new Map();
            for (const item of distribution) {
                const value = Math.round((item.units / 100 + 1e-8) * scale) / scale;
                merged.set(value, (merged.get(value) || 0) + item.probability);
            }
            return Array.from(merged, ([value, probability]) => ({value, probability}));
        });
        for (const a of ds[0]) for (const b of ds[1]) for (const c of ds[2]) for (const d of ds[3]) {
            const values = [a, b, c, d];
            const subs = block.stats.map((stat, index) => ({stat, value: values[index].value})).filter(sub => sub.value !== 0);
            const id = key(subs);
            if (!pmf.has(id)) pmf.set(id, {3: 0, 4: 0});
            pmf.get(id)[block.initialLines] += block.probability * a.probability * b.probability * c.probability * d.probability;
            ++count;
        }
    }
    return {pmf, count};
}

function reshape(initialLines = 3, floor = 2, pair = ['crit_dmg', 'def']) {
    const artifact = new Artifact(5, 20, 'goblet', 'GladiatorFinale', 'dmg_geo', [
        {stat: 'crit_rate', value: 2.7}, {stat: 'crit_dmg', value: 27.2},
        {stat: 'def', value: 16}, {stat: 'hp', value: 209},
    ]);
    artifact.setMetadata({initialValues: {crit_rate: 2.72, crit_dmg: 5.44, def: 16.2, hp: 209.13},
        totalRolls: initialLines + 5, elixirCrafted: false});
    return {kind: 'reshape', slot: artifact.slot, set: artifact.set, mainStat: artifact.mainStat, artifact, pair, floor};
}

function check(action, usedStats) {
    const expected = reference(action, usedStats);
    const model = projectArtifactAction(action, usedStats);
    expect(model.sourceOutcomes).toBe(expected.count);
    expect(countProjectedArtifactAction(model)).toBe(expected.pmf.size);
    const seen = new Set();
    const mass = {3: 0, 4: 0};
    for (const outcome of iterateProjectedArtifactAction(model)) {
        const id = key(outcome.artifact.getSubStats());
        expect(seen.has(id)).toBe(false);
        seen.add(id);
        expect(expected.pmf.has(id)).toBe(true);
        for (const start of [3, 4]) {
            expect(outcome.initialProbabilities[start]).toBeCloseTo(expected.pmf.get(id)[start], 12);
            mass[start] += outcome.initialProbabilities[start];
        }
        expect(outcome.probability).toBeCloseTo(outcome.initialProbabilities[3] + outcome.initialProbabilities[4], 14);
    }
    expect(seen.size).toBe(expected.pmf.size);
    expect(mass[3] + mass[4]).toBeCloseTo(1, 11);
    return {model, mass};
}

test('craft merges unused identities, allocations and overlapping 3/4-line quality sums exactly', () => {
    const {model, mass} = check(craft, ['crit_rate', 'crit_dmg']);
    expect(model.groups).toHaveLength(1);
    expect(model.groups[0].blocks.length).toBeLessThan(model.sourceBlocks / 10);
    expect(countProjectedArtifactAction(model)).toBeLessThan(model.sourceOutcomes / 10);
    expect(mass[3]).toBeCloseTo(.66, 12);
    expect(mass[4]).toBeCloseTo(.34, 12);
});

test.each([
    [[], ['crit_rate', 'crit_dmg']],
    [['crit_rate'], ['crit_rate', 'def']],
    [['hp_percent', 'recharge'], ['def', 'def_percent']],
    [['crit_value'], ['crit_rate', 'crit_dmg']],
])('projection respects useful/dependency stats %j with pair %j', (usedStats, pair) => {
    check({...craft, pair}, usedStats);
});

test.each([0, 1])('craft fixed four-line chance %s preserves only the real start case', fourLineChance => {
    const {mass} = check({...craft, fourLineChance}, ['crit_rate']);
    expect(mass[fourLineChance ? 3 : 4]).toBe(0);
});

test.each([3, 4].flatMap(lines => [2, 3, 4].flatMap(floor => [
    [lines, floor, ['crit_dmg', 'def']], [lines, floor, ['crit_dmg', 'hp']], [lines, floor, ['crit_rate', 'hp']],
])))('reshape %s-line floor %s pair %j preserves selected versus unselected VOID behavior', (lines, floor, pair) => {
    check(reshape(lines, floor, pair), ['crit_dmg', 'def']);
});

test('all-VOID craft is one piece but preserves conditional-start statistics', () => {
    const outcomes = Array.from(iterateProjectedArtifactAction(projectArtifactAction(craft, [])));
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].artifact.getSubStats()).toEqual([]);
    expect(outcomes[0].initialProbabilities[3]).toBeCloseTo(.66, 12);
    expect(outcomes[0].initialProbabilities[4]).toBeCloseTo(.34, 12);
    const acc = createArtifactActionAccumulator(100);
    acc.add(outcomes[0], 120);
    const result = acc.result();
    expect(result.outcomes).toBe(1);
    expect(result.absoluteGain).toBeCloseTo(20, 12);
    expect(Object.keys(result.conditionedStarts)).toEqual(['3', '4']);
    for (const conditional of Object.values(result.conditionedStarts)) {
        expect(conditional.absoluteGain).toBeCloseTo(20, 12);
        expect(conditional.improveChance).toBe(1);
    }
});

test('four useful dimensions also have an exact unique support and PMF', () => {
    check(reshape(3, 2), undefined);
});

test('VOID does not erase the nonlinear high-tail advantage of a selected irrelevant row', () => {
    const gains = [];
    for (const pair of [['crit_dmg', 'def'], ['crit_dmg', 'hp']]) {
        const acc = createArtifactActionAccumulator(12420);
        for (const outcome of iterateProjectedArtifactAction(projectArtifactAction(reshape(3, 2, pair), ['crit_dmg', 'def']))) {
            const stats = Object.fromEntries(outcome.artifact.getSubStats().map(sub => [sub.stat, sub.value]));
            // The fixed build stats already include this artifact's initial rolls.
            acc.add(outcome, (3000 + stats.def - 16) * (4 + (stats.crit_dmg - 5.4) / 100));
        }
        gains.push(acc.result());
    }
    expect(gains[0].forcedExpectedValue).toBeGreaterThan(gains[1].forcedExpectedValue);
    expect(gains[1].absoluteGain).toBeGreaterThan(gains[0].absoluteGain);
});

test('all-useful counting and lazy enumeration do not materialize a full PMF', () => {
    const model = projectArtifactAction(craft);
    const count = countProjectedArtifactAction(model);
    expect(count).toBeGreaterThan(1000000);
    expect(count).toBeLessThanOrEqual(model.sourceOutcomes);
    expect(model.groups.reduce((sum, group) => sum + group.blocks.length, 0)).toBeLessThan(5000);
    const iterator = iterateProjectedArtifactAction(model);
    for (let i = 0; i < 10; ++i) expect(iterator.next().value.artifact.getSubStats()).toHaveLength(4);
    iterator.return();
});

test('Full replacement-aware predictions match the old PMF through the actual CPU optimizer', async () => {
    const action = reshape(3, 2, ['crit_dmg', 'hp']);
    const build = new CalcSet();
    build.setChar(DB.Chars.get('Jean'));
    build.setEnemy(DB.Enemies.getFirst().getFirst());
    const mains = {flower: 'hp', plume: 'atk', sands: 'atk_percent', circlet: 'crit_dmg'};
    const inventory = Object.entries(mains).map(([slot, main]) => new Artifact(5, 20, slot, 'GladiatorFinale', main, []));
    inventory.push(action.artifact);
    for (const artifact of inventory) build.setArtifact(artifact);
    inventory.push(new Artifact(5, 20, 'flower', 'WandererTroupe', 'hp', [{stat: 'atk_percent', value: 23.3}]));
    inventory.push(new Artifact(5, 20, 'circlet', 'WandererTroupe', 'crit_rate', []));
    const feature = 'attack.normal_hit_1';
    const options = {build, artifacts: inventory, featureName: feature, featureType: 'average', useGPU: false, limit: 20,
        settings: makeArtifactOptimizerSettings(build, inventory)};
    const baseline = new ArtifactsSuggest(options);
    baseline.prepare();
    const baseValue = baseline.getResult()[0].value;
    const referenceOptimizer = new ArtifactsSuggest(options);
    referenceOptimizer.prepare();
    const expected = createArtifactActionAccumulator(baseValue);
    for (const [id, masses] of reference(action, referenceOptimizer.usedStats).pmf) {
        const artifact = new Artifact(5, 20, action.slot, action.set, action.mainStat,
            JSON.parse(id).map(([stat, value]) => ({stat, value})));
        referenceOptimizer.slots.goblet = [artifact];
        referenceOptimizer.prepareExplicitArtifact(artifact);
        const score = referenceOptimizer.getResult()[0]?.value ?? -Infinity;
        for (const start of [3, 4]) if (masses[start]) expected.add({initialLines: start, probability: masses[start]}, score);
    }
    const result = await evaluateArtifactActionPredictions({kind: 'reshape', mode: 'full', baseBuild: build,
        inventory, feature, useGPU: false, pairs: {goblet: action.pair}, points: 0, trigger: 0});
    const row = result.rows.find(row => row.slot === 'goblet');
    expect(row.absoluteGain).toBeGreaterThan(0);
    for (const field of ['absoluteGain', 'improveChance', 'forcedExpectedValue', 'infeasibleChance']) {
        expect(row[field]).toBeCloseTo(expected.result()[field], 9);
    }
    expect(row.cacheHits).toBe(0); // Already unique before even consulting the GPU/CPU score cache.
});
