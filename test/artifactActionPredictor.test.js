import { Artifact } from '../src/js/classes/Artifact';
import { ArtifactsSuggest } from '../src/js/classes/ArtifactsSuggest';
import { CalcSet } from '../src/js/classes/CalcSet';
import { DB } from '../src/js/db/DB';
import { makeArtifactOptimizerSettings } from '../src/js/classes/ArtifactOptimizerSettings';
import { ArtifactActionOutcomeCollector, artifactOutcomeLoadout, readArtifactActionOutcome } from '../src/js/classes/ArtifactActionOutcomes';
import { createArtifactActionAccumulator, iterateArtifactActionOutcomes, countArtifactActionOutcomes,
    makeArtifactActionRecipes, evaluateArtifactActionPredictions } from '../src/js/classes/ArtifactActionPredictor';
import { ensureDawnNavigator } from './support/gpuNode';
import { projectArtifactAction, iterateProjectedArtifactActionValues, makeProjectedArtifact } from '../src/js/classes/ArtifactActionProjection';
import { artifactActionOutcomeKey } from '../src/js/classes/ArtifactActionUnion';

global.DB = DB;
// Production forced-outcome engine on Dawn (no CPU fallback by design).
jest.setTimeout(180000);
beforeAll(async () => {
    await ensureDawnNavigator();
}, 120000);
const feature = 'attack.normal_hit_1';
const mains = {flower: 'hp', plume: 'atk', sands: 'atk_percent', goblet: 'dmg_phys', circlet: 'crit_dmg'};
const makeArtifact = (slot, set = 'GladiatorFinale', main = mains[slot], subs = []) => new Artifact(5, 20, slot, set, main, subs);
function setup() {
    const build = new CalcSet();
    build.setChar(DB.Chars.get('Jean'));
    build.setEnemy(DB.Enemies.getFirst().getFirst());
    const inventory = Object.keys(mains).map(slot => makeArtifact(slot));
    for (const artifact of inventory) build.setArtifact(artifact);
    inventory.push(makeArtifact('flower', 'WandererTroupe', 'hp', [{stat: 'atk_percent', value: 23.3}]));
    return {build, inventory};
}
function prepare(build, inventory) {
    const s = new ArtifactsSuggest({build, artifacts: inventory, featureName: feature, featureType: 'average',
        settings: makeArtifactOptimizerSettings(build, inventory), limit: 20, useGPU: false, showBeta: true});
    s.prepare();
    return s;
}
function reshapeSource() {
    // All substats irrelevant to Jean's physical normal attack: projection is exact and keeps this fixture tiny.
    const artifact = makeArtifact('goblet', 'GladiatorFinale', 'dmg_phys', [
        {stat: 'hp', value: 1046}, {stat: 'def', value: 16}, {stat: 'def_percent', value: 5.1}, {stat: 'recharge', value: 4.5}]);
    artifact.setMetadata({initialValues: {hp: 209.13, def: 16.2, def_percent: 5.1, recharge: 4.53},
        totalRolls: 8, elixirCrafted: false});
    return artifact;
}

test('retained outcomes preserve empty complement slots as missing inventory IDs', async () => {
    const {build} = setup();
    build.clearArtifacts();
    const result = await evaluateArtifactActionPredictions({kind: 'reshape',
        baseBuild: build, inventory: [makeArtifact('goblet')], feature: 'stats.hp', useGPU: false, retainOutcomes: true,
        reshapeTargets: [{id: 'source', artifact: reshapeSource(), selectedSubstats: ['hp', 'def']}]});
    expect(result.baselineArtifacts).toEqual([-1, -1, -1, 0, -1]);
    const row = result.rows[0];
    expect(row.outcomeDetails.length).toBeGreaterThan(0);
    const outcome = readArtifactActionOutcome(row.outcomeDetails, row, 0);
    expect(outcome.complement).toEqual([-1, -1, -1, -1]);
    const loadout = artifactOutcomeLoadout(outcome, result.outcomeInventory);
    expect(loadout.filter(Boolean)).toHaveLength(1);
    expect(loadout[3]).toBe(outcome.artifact);
});

test('gallery sums every same-recipe incidence of a deduplicated crit-value outcome', async () => {
    const {build, inventory} = setup();
    const artifact = makeArtifact('goblet', 'GladiatorFinale', 'dmg_phys', [
        {stat: 'crit_rate', value: 7.8}, {stat: 'crit_dmg', value: 23.3},
        {stat: 'def', value: 46}, {stat: 'hp', value: 299}]);
    artifact.setMetadata({totalRolls: 8, elixirCrafted: false,
        initialValues: {crit_rate: 3.89, crit_dmg: 7.77, def: 23.15, hp: 298.75}});
    const result = await evaluateArtifactActionPredictions({kind: 'reshape', baseBuild: build, inventory,
        feature: 'stats.crit_value', useGPU: false, retainOutcomes: true,
        reshapeTargets: [{id: 'crit', artifact, selectedSubstats: ['crit_rate', 'crit_dmg']}]});
    const row = result.rows[0];
    const projected = projectArtifactAction({kind: 'reshape', slot: 'goblet', set: artifact.set,
        mainStat: artifact.mainStat, artifact, pair: ['crit_rate', 'crit_dmg'], floor: 2}, ['crit_value']);
    const masses = new Map();
    for (const outcome of iterateProjectedArtifactActionValues(projected)) {
        const vector = makeProjectedArtifact(projected.action, outcome.stats, outcome.values);
        const key = artifactActionOutcomeKey(vector, ['crit_value']);
        masses.set(key, (masses.get(key) || 0) + outcome.probability);
    }
    expect(row.outcomeDetails.length).toBe(186);
    expect(row.outcomeDetails.length).toBe(row.totalOutcomes);
    const seen = new Set();
    for (let rank = 0; rank < row.outcomeDetails.length; ++rank) {
        const outcome = readArtifactActionOutcome(row.outcomeDetails, row, rank);
        const key = artifactActionOutcomeKey(outcome.artifact, ['crit_value']);
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(outcome.probability).toBeCloseTo(masses.get(key), 12);
    }
    expect(readArtifactActionOutcome(row.outcomeDetails, row, row.outcomeDetails.length - 1).atLeastProbability)
        .toBeCloseTo(row.improveChance, 12);
});

test('craft searches every legal main and pair, without shortlists', () => {
    const params = {kind: 'craft', set: 'GladiatorFinale'};
    for (const slot of Object.keys(mains)) {
        const recipes = makeArtifactActionRecipes(params, slot);
        expect([...new Set(recipes.map(recipe => recipe.mainStat))]).toEqual(DB.Artifacts.Slots.get(slot).mainStats);
        for (const main of DB.Artifacts.Slots.get(slot).mainStats) {
            const count = DB.Artifacts.Substats.get(main) ? 36 : 45;
            expect(recipes.filter(recipe => recipe.mainStat === main)).toHaveLength(count);
        }
    }
});

test('full reshaping scans every selected-pair outcome and compares against optimized inventory, not equipped', async () => {
    const {build, inventory} = setup();
    const artifact = reshapeSource();
    build.setArtifact(artifact);
    inventory.push(artifact);
    const params = {kind: 'reshape', mode: 'full', baseBuild: build, inventory, feature, useGPU: false,
        points: 4, trigger: 2, pairs: {goblet: ['hp', 'def']}};
    const expectedBaseline = prepare(build, inventory).getResult()[0].value;
    const equipped = build.getFeatureResultByName(feature).average;
    expect(expectedBaseline).toBeGreaterThan(equipped);
    const progress = [];
    const result = await evaluateArtifactActionPredictions({...params, onProgress: data => progress.push(data)});
    const row = result.rows.find(row => row.slot === 'goblet');
    expect(result.search).toBe('fused-gpu-forced-cpu-rescored');
    expect(result.baseValue).toBeCloseTo(expectedBaseline, 10);
    expect(row.recipesEvaluated).toBe(1);
    expect(row.probabilitySum).toBeCloseTo(1, 10);
    expect(row.absoluteGain).toBeCloseTo(0, 10);
    expect(row.improveChance).toBe(0);
    expect(row.floor).toBe(4);
    expect(row.coverageCombinations).toBe(String(row.outcomes * row.combinationsPerOutcome));
    expect(row.optimizerEvaluations).toBe(1);
    expect(row.cacheHits).toBe(0);
    expect(row.combinationTotal).toBe(String(row.combinationsPerOutcome));
    expect(result.rows.filter(row => row.error)).toHaveLength(4);
    expect(progress.every(data => data.slotsTotal === 1)).toBe(true);
    expect(progress[0]).toMatchObject({phase: 'baseline', slotsCompleted: 0});
    expect(progress.at(-1)).toMatchObject({phase: 'slot_complete', slotsCompleted: 1,
        completedWork: {totalOutcomes: row.totalOutcomes, cacheHits: 0, optimizerEvaluations: 1}});
    expect(progress.find(data => data.phase === 'count')).toMatchObject({recipes: 1, recipe: 1});
    const automatic = await evaluateArtifactActionPredictions({...params, pairs: {}});
    const automaticRow = automatic.rows.find(row => row.slot === 'goblet');
    expect(automaticRow.alternatives).toHaveLength(6);
    expect(automaticRow.recipesEvaluated).toBe(6);
    // Union branch: all six all-VOID recipes share one numerical vector —
    // one search, no LRU traffic. Per-recipe masses still sum to 1 each.
    expect(automaticRow.totalOutcomes).toBe(1);
    expect(automaticRow.optimizerEvaluations).toBe(1);
    expect(automaticRow.cacheHits).toBe(0);
});

test('all recipes retain statistics but only the winning recipe allocates gallery rows', async () => {
    const {build, inventory} = setup();
    const add = jest.spyOn(ArtifactActionOutcomeCollector.prototype, 'add');
    try {
        const result = await evaluateArtifactActionPredictions({kind: 'reshape', baseBuild: build, inventory,
            feature: 'stats.hp', useGPU: false, retainOutcomes: true,
            reshapeTargets: [{id: 'source', artifact: reshapeSource(), selectedSubstats: [null, null]}]});
        const row = result.rows[0];
        expect(row.alternatives).toHaveLength(6);
        for (const alternative of row.alternatives) {
            expect(alternative.probabilitySum).toBeCloseTo(1, 12);
            expect(alternative.absoluteGain).toBeGreaterThan(0);
        }
        expect(row.outcomeDetails.length).toBeGreaterThan(0);
        expect(add).toHaveBeenCalledTimes(row.outcomeDetails.length);
        expect(readArtifactActionOutcome(row.outcomeDetails, row, row.outcomeDetails.length - 1).atLeastProbability)
            .toBeCloseTo(row.improveChance, 12);
    } finally { add.mockRestore(); }
});

test('craft slot progress is independent of per-slot outcomes and retains completed workload', async () => {
    const {build, inventory} = setup();
    const progress = [];
    const result = await evaluateArtifactActionPredictions({kind: 'craft', set: 'GladiatorFinale',
        baseBuild: build, inventory, feature, useGPU: false,
        craftAffixes: Object.fromEntries(Object.entries(mains).map(([slot, mainStat]) =>
            [slot, {mainStat, substats: ['def', 'def_percent']}])),
        onProgress: data => progress.push(data)});
    expect(result.rows).toHaveLength(5);
    expect(progress[0]).toMatchObject({phase: 'baseline', slotsCompleted: 0, slotsTotal: 5});
    expect(progress.every(data => data.slotsTotal === 5)).toBe(true);
    expect(progress.filter(data => data.phase === 'slot_complete').map(data => data.slotsCompleted)).toEqual([1, 2, 3, 4, 5]);
    for (let index = 1; index < progress.length; ++index) {
        expect(progress[index].slotsCompleted).toBeGreaterThanOrEqual(progress[index - 1].slotsCompleted);
    }
    for (const update of progress.filter(data => data.phase === 'slot_complete')) {
        const row = result.rows.find(row => row.slot === update.slot);
        expect(update.completedWork).toEqual({totalOutcomes: row.totalOutcomes,
            combinationsPerOutcome: row.combinationsPerOutcome, combinationTotal: row.coverageCombinations,
            optimizerEvaluations: row.optimizerEvaluations, cacheHits: 0, recipe: 1, recipes: 1,
            prepareCurrent: update.completedWork.prepareCurrent, prepareTotal: update.completedWork.prepareTotal});
        expect(update.completedWork.prepareTotal).toBeGreaterThan(0);
        expect(update.completedWork.prepareCurrent).toBe(update.completedWork.prepareTotal);
    }
});

test('craft is exact: every recipe is enumerated once through the union with full mass', async () => {
    const {build, inventory} = setup();
    const progress = [];
    const affixes = Object.fromEntries(Object.entries(mains).map(([slot, mainStat]) =>
        [slot, {mainStat, substats: ['def', 'def_percent']}]));
    affixes.goblet = {mainStat: 'dmg_phys', substats: ['crit_rate', 'crit_dmg']};
    const params = {kind: 'craft', set: 'GladiatorFinale', baseBuild: build, inventory, feature, useGPU: false,
        craftAffixes: affixes};
    const result = await evaluateArtifactActionPredictions({...params, onProgress: data => progress.push(data)});
    const row = result.rows.find(row => row.slot === 'goblet');
    expect(row.recipesEvaluated).toBe(1);
    expect(row.outcomeMode).toBe('exact');
    expect(row.searchMode).toBe('exact');
    expect(row.cacheHits).toBe(0);
    expect(row.probabilitySum).toBeCloseTo(1, 10);
    expect(row.outcomes).toBe(row.totalOutcomes);
    expect(row.optimizerEvaluations).toBe(row.totalOutcomes);
    expect(row.samples).toBeUndefined();
    expect(row.improveChanceInterval).toBeUndefined();
    expect(progress.every(data => ['baseline', 'count', 'prepare', 'lower', 'upload', 'full', 'rescore', 'gallery', 'slot_complete'].includes(data.phase))).toBe(true);
    expect(progress.some(data => data.union === true)).toBe(true);
    expect(await evaluateArtifactActionPredictions(params)).toEqual(result);
});

test('craft with both-topology preservation reports the union of topology specs', async () => {
    const {build, inventory} = setup();
    const affixes = Object.fromEntries(Object.entries(mains).map(([slot, mainStat]) =>
        [slot, {mainStat, substats: ['def', 'def_percent']}]));
    affixes.goblet = {mainStat: 'dmg_phys', substats: ['crit_rate', 'crit_dmg']};
    const params = {kind: 'craft', set: 'WandererTroupe', baseBuild: build, inventory, feature, useGPU: false,
        pruneOutcomeSets: true, craftAffixes: affixes};
    const result = await evaluateArtifactActionPredictions(params);
    const row = result.rows.find(row => row.slot === 'goblet');
    // Baseline fixture topology is 4pc Gladiator; crafting WandererTroupe adds
    // the crafted set's own 4-piece spec.
    expect(row.preservedTopology).toMatchObject({kind: 'union', specs: [
        {kind: '4pc', sets: ['GladiatorFinale']}, {kind: '4pc', sets: ['WandererTroupe']}]});
    const disabled = await evaluateArtifactActionPredictions({...params, pruneOutcomeSets: false});
    expect(disabled.rows.find(item => item.slot === 'goblet').preservedTopology).toBeUndefined();
    // Reported combinations are searched (post-pruning), not the full product:
    // the pruned union searches strictly fewer complements per outcome.
    const full = disabled.rows.find(item => item.slot === 'goblet');
    expect(row.combinationsPerOutcome).toBeLessThan(full.combinationsPerOutcome);
    expect(row.coverageCombinations).toBe(String(BigInt(row.combinationsPerOutcome) * BigInt(row.totalOutcomes)));
});

test('an explicit craft outcome budget reports the exact per-slot measurement', async () => {
    const {build, inventory} = setup();
    await expect(evaluateArtifactActionPredictions({kind: 'craft', set: 'GladiatorFinale',
        baseBuild: build, inventory, feature, useGPU: false,
        maxUnionEntries: 10}))
        .rejects.toThrow(/^action_outcomes_too_large;flower;11;10;\d+$/);
});

test('upgrade fuses exact max-level variants and compares against the optimized baseline', async () => {
    const {build, inventory} = setup();
    const candidate = makeArtifact('circlet', 'GladiatorFinale', 'crit_rate', [
        {stat: 'crit_dmg', value: 7.8}, {stat: 'atk_percent', value: 5.8}, {stat: 'def', value: 23}]);
    candidate.level = 0;
    candidate.unactivatedSubstats = [{stat: 'hp', value: 299}];
    candidate.setMetadata({totalRolls: 3, elixirCrafted: false,
        initialValues: {crit_dmg: 7.8, atk_percent: 5.8, def: 23, hp: 299}});
    inventory.push(candidate);
    const params = {kind: 'upgrade', baseBuild: build, inventory, feature, useGPU: false,
        upgradeTargets: [candidate], pruneOutcomeSets: true};
    const expectedBaseline = prepare(build, inventory).getResult()[0].value;
    const progress = [];
    const result = await evaluateArtifactActionPredictions({...params, onProgress: data => progress.push(data)});
    expect(result.search).toBe('fused-gpu-forced-cpu-rescored');
    expect(result.baseValue).toBeCloseTo(expectedBaseline, 10);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.kind).toBe('upgrade');
    expect(row.slot).toBe('circlet');
    expect(row.targetId).toBe(candidate.getHash());
    expect(row.outcomeMode).toBe('exact');
    expect(row.searchMode).toBe('exact');
    expect(row.recipesEvaluated).toBe(1);
    expect(row.probabilitySum).toBeCloseTo(1, 10);
    expect(row.outcomes).toBe(row.totalOutcomes);
    expect(row.optimizerEvaluations).toBe(row.totalOutcomes);
    expect(row.gainPerCost).toBeUndefined();
    // Baseline fixture topology is 4pc Gladiator; the upgraded piece keeps its set.
    expect(row.preservedTopology).toEqual({kind: '4pc', sets: ['GladiatorFinale']});
    expect(progress.every(data => ['baseline', 'count', 'prepare', 'lower', 'upload', 'full', 'rescore', 'gallery', 'slot_complete'].includes(data.phase))).toBe(true);
    expect(progress.at(-1)).toMatchObject({phase: 'slot_complete', slotsCompleted: 1});
});

test('upgrade rejects invalid candidate lists before touching the optimizer', async () => {
    const {build, inventory} = setup();
    await expect(evaluateArtifactActionPredictions({kind: 'upgrade', baseBuild: build, inventory, feature}))
        .rejects.toThrow('action_invalid_upgrades');
    await expect(evaluateArtifactActionPredictions({kind: 'upgrade', baseBuild: build, inventory, feature,
        upgradeTargets: [{slot: 'circlet'}]}))
        .rejects.toThrow('action_invalid_upgrades');
});

test('the fused outcome engine launches once per craft slot, never over the five-piece space', async () => {
    const {build, inventory} = setup();
    const affixes = Object.fromEntries(Object.entries(mains).map(([slot, mainStat]) =>
        [slot, {mainStat, substats: ['def', 'def_percent']}]));
    affixes.goblet = {mainStat: 'dmg_phys', substats: ['crit_rate', 'crit_dmg']};
    const spy = jest.spyOn(ArtifactsSuggest.prototype, 'getResultGPUForcedOutcomes');
    let calls = [];
    try {
        await evaluateArtifactActionPredictions({kind: 'craft', set: 'GladiatorFinale',
            baseBuild: build, inventory, feature, useGPU: false, craftAffixes: affixes});
        calls = spy.mock.calls.slice();
    } finally {
        spy.mockRestore();
    }
    expect(calls).toHaveLength(5);
    expect(calls.map(call => call[0])).toEqual(['flower', 'plume', 'sands', 'goblet', 'circlet']);
    for (const [slot, outcomes] of calls) {
        expect(outcomes.length).toBeGreaterThan(0);
        for (const artifact of outcomes) {
            expect(artifact.slot).toBe(slot);
            expect(artifact.getSetName()).toBe('GladiatorFinale');
        }
    }
});

test('craftSlots excludes slots from recipes, engine launches and results', async () => {
    const {build, inventory} = setup();
    const affixes = Object.fromEntries(Object.entries(mains).map(([slot, mainStat]) =>
        [slot, {mainStat, substats: ['def', 'def_percent']}]));
    const spy = jest.spyOn(ArtifactsSuggest.prototype, 'getResultGPUForcedOutcomes');
    let calls = [];
    let result;
    try {
        result = await evaluateArtifactActionPredictions({kind: 'craft', set: 'GladiatorFinale',
            baseBuild: build, inventory, feature, useGPU: false, craftAffixes: affixes,
            craftSlots: ['goblet', 'circlet']});
        calls = spy.mock.calls.slice();
    } finally {
        spy.mockRestore();
    }
    expect(calls.map(call => call[0])).toEqual(['goblet', 'circlet']);
    expect(new Set(result.rows.map(row => row.slot))).toEqual(new Set(['goblet', 'circlet']));
    expect(result.rows.every(row => row.recipesEvaluated === 1)).toBe(true);
    // Excluding every slot produces no work instead of falling back to all five.
    expect((await evaluateArtifactActionPredictions({kind: 'craft', set: 'GladiatorFinale',
        baseBuild: build, inventory, feature, useGPU: false, craftAffixes: affixes, craftSlots: []})).rows).toEqual([]);
    await expect(evaluateArtifactActionPredictions({kind: 'craft', set: 'GladiatorFinale',
        baseBuild: build, inventory, feature, useGPU: false, craftAffixes: affixes,
        craftSlots: ['goblet', 'nope']})).rejects.toThrow('action_invalid_slots');
});

test('an invalid upgrade candidate is explained without blocking a valid candidate', async () => {
    const {build, inventory} = setup();
    const valid = new Artifact(5, 16, 'flower', 'GladiatorFinale', 'hp', [
        {stat: 'crit_rate', value: 3.9}, {stat: 'crit_dmg', value: 7.8},
        {stat: 'atk_percent', value: 5.8}, {stat: 'def', value: 93}]);
    valid.setMetadata({totalRolls: 7, elixirCrafted: false, initialValues: {crit_rate: 3.9, crit_dmg: 7.8, atk_percent: 5.8, def: 23}});
    const invalid = valid.clone();
    invalid.setMetadata({elixirCrafted: true});
    const progress = [];
    const result = await evaluateArtifactActionPredictions({kind: 'upgrade', baseBuild: build, inventory, feature,
        useGPU: false, upgradeTargets: [invalid, valid], onProgress: data => progress.push(data)});
    expect(result.rows).toHaveLength(2);
    expect(result.rows.find(row => row.targetId === invalid.getHash()).error).toBe('action_upgrade_missing_pair');
    const row = result.rows.find(row => row.targetId === valid.getHash());
    expect(row.error).toBeUndefined();
    expect(row.probabilitySum).toBeCloseTo(1, 12);
    expect(row.upgradeAssumptions.craftedStatus).toBeNull();
    expect(row.upgradeModel).toBe('weighted-reveals-conditioned-raw-rolls-backloaded-v1');
    expect(progress.at(-1)).toMatchObject({phase: 'slot_complete', slotsCompleted: 2});
});

test('reshape ignores sampling parameters and always enumerates fully', async () => {
    const {build, inventory} = setup();
    const artifact = reshapeSource();
    build.setArtifact(artifact);
    inventory.push(artifact);
    // Sampling knobs are accepted for API compatibility but have no effect.
    const params = {kind: 'reshape', mode: 'approximate', samples: 32, baseBuild: build, inventory, feature,
        useGPU: false, seed: 7, points: 4, trigger: 2, coveragePercent: 0.05, adaptive: true};
    const result = await evaluateArtifactActionPredictions(params);
    const row = result.rows.find(row => row.slot === 'goblet');
    expect(row.outcomeMode).toBe('exact');
    expect(row.searchMode).toBe('exact');
    expect(row.alternatives).toHaveLength(6);
    expect(row.probabilitySum).toBeCloseTo(1, 10);
    expect(row.totalOutcomes).toBe(1);
    expect(row.optimizerEvaluations).toBe(1);
    expect(row.cacheHits).toBe(0);
    expect(row.samples).toBeUndefined();
    expect(await evaluateArtifactActionPredictions(params)).toEqual(result);
});

test('legacy sampling parameters are ignored for craft too', async () => {
    const {build, inventory} = setup();
    const affixes = Object.fromEntries(Object.entries(mains).map(([slot, mainStat]) =>
        [slot, {mainStat, substats: ['def', 'def_percent']}]));
    affixes.goblet = {mainStat: 'dmg_phys', substats: ['crit_rate', 'crit_dmg']};
    const params = {kind: 'craft', set: 'GladiatorFinale', baseBuild: build, inventory, feature, useGPU: false,
        craftAffixes: affixes,
        mode: 'approximate', coveragePercent: 0.001, samples: 16, seed: 3, adaptive: true};
    const result = await evaluateArtifactActionPredictions(params);
    const row = result.rows.find(row => row.slot === 'goblet');
    expect(row.outcomeMode).toBe('exact');
    expect(row.optimizerEvaluations).toBe(row.totalOutcomes);
    expect(row.samples).toBeUndefined();
    result.rows.forEach(item => expect(item.cacheHits).toBe(0));
});

test('automatic reshape checks all six pairs and preserves crafted lock', () => {
    const {build} = setup();
    const artifact = reshapeSource();
    build.setArtifact(artifact);
    const params = {kind: 'reshape', baseBuild: build};
    expect(makeArtifactActionRecipes(params, 'goblet')).toHaveLength(6);
    artifact.setMetadata({...artifact.getMetadata(), elixirCrafted: true, definedSubstats: ['hp', 'def']});
    const recipes = makeArtifactActionRecipes(params, 'goblet');
    expect(recipes).toHaveLength(1);
    expect(recipes[0].pair).toEqual(['def', 'hp']);
    expect(makeArtifactActionRecipes({...params, pairs: {goblet: ['recharge', null]}}, 'goblet')).toEqual(recipes);
});

test('reshape recipe filtering is independent of dropdown order and never duplicates pairs', () => {
    const {build} = setup();
    const artifact = reshapeSource();
    build.setArtifact(artifact);
    const params = {kind: 'reshape', baseBuild: build};
    const all = makeArtifactActionRecipes(params, 'goblet');
    expect(makeArtifactActionRecipes({...params, pairs: {goblet: [null, null]}}, 'goblet')).toEqual(all);
    for (const {stat} of artifact.getSubStats()) {
        const matching = all.filter(recipe => recipe.pair.includes(stat));
        expect(matching).toHaveLength(3);
        for (const selection of [[stat, null], [null, stat]]) {
            expect(makeArtifactActionRecipes({...params, pairs: {goblet: selection}}, 'goblet')).toEqual(matching);
        }
    }
    expect(makeArtifactActionRecipes({...params, pairs: {goblet: ['def', 'hp']}}, 'goblet'))
        .toEqual(makeArtifactActionRecipes({...params, pairs: {goblet: ['hp', 'def']}}, 'goblet'));
});

test('full reshape with one fixed stat ranks only its three legal partners', async () => {
    const {build, inventory} = setup();
    const artifact = reshapeSource();
    build.setArtifact(artifact);
    inventory.push(artifact);
    const params = {kind: 'reshape', baseBuild: build, inventory, feature, useGPU: false,
        points: 4, trigger: 2, pairs: {goblet: ['hp', null]}};
    const progress = [];
    const result = await evaluateArtifactActionPredictions({...params, onProgress: event => progress.push(event)});
    const row = result.rows.find(row => row.slot === 'goblet');
    expect(row.recipesEvaluated).toBe(3);
    expect(row.pair).toContain('hp');
    expect(row.alternatives).toHaveLength(3);
    expect(row.outcomeMode).toBe('exact');
    expect(row.totalOutcomes).toBe(1);
    expect(row.cacheHits).toBe(0);
    for (const alternative of row.alternatives) {
        expect(alternative.pair).toContain('hp');
        expect(alternative.probabilitySum).toBeCloseTo(1, 10);
        // Auto compares complete recipes, not the best partner for each random outcome.
        const manual = await evaluateArtifactActionPredictions({...params, pairs: {goblet: alternative.pair}});
        const manualRow = manual.rows.find(item => item.slot === 'goblet');
        expect(alternative.absoluteGain).toBeCloseTo(manualRow.absoluteGain, 10);
        expect(alternative.improveChance).toBe(manualRow.improveChance);
    }
    expect(await evaluateArtifactActionPredictions({...params, pairs: {goblet: [null, 'hp']}})).toEqual(result);
    expect(progress.filter(event => event.recipes).every(event => event.recipes === 3)).toBe(true);
});

test('projected outcome iterator retains mass and count, and fallback handles infeasible outcomes', () => {
    const action = {kind: 'craft', slot: 'flower', set: 'GladiatorFinale', mainStat: 'hp', pair: ['crit_rate', 'crit_dmg']};
    const accumulator = createArtifactActionAccumulator(100);
    let count = 0;
    for (const outcome of iterateArtifactActionOutcomes(action, [])) { accumulator.add(outcome, -Infinity); ++count; }
    const result = accumulator.result();
    expect(count).toBe(countArtifactActionOutcomes(action, []));
    expect(result.probabilitySum).toBeCloseTo(1, 10);
    expect(result.absoluteGain).toBe(0);
    expect(result.infeasibleChance).toBe(1);
    expect(result.forcedExpectedValue).toBeNull();
    expect(Object.keys(result.conditionedStarts)).toEqual(['3', '4']);
});

test('full reshape ranks more than five explicit targets independently, including repeated slots and different sets', async () => {
    const {build, inventory} = setup();
    const equipped = reshapeSource();
    build.setArtifact(equipped);
    inventory.push(equipped);
    const reshapeTargets = Array.from({length: 7}, (_, index) => {
        const artifact = reshapeSource();
        artifact.set = index % 2 ? 'WandererTroupe' : 'GladiatorFinale';
        artifact.mainStat = index % 3 ? 'dmg_geo' : 'dmg_phys';
        artifact.setMetadata({...artifact.getMetadata(), totalRolls: index % 2 ? 9 : 8,
            ...(index === 0 ? {elixirCrafted: true, definedSubstats: ['hp', 'def']} : {})});
        return {id: 'target-' + index, artifact,
            selectedSubstats: index === 1 ? ['hp', null] : index === 2 ? [null, null] : ['def_percent', 'recharge']};
    });
    const hashes = inventory.map(artifact => artifact.getHash());
    const sources = reshapeTargets.map(target => target.artifact.serialize());
    const progress = [];
    const params = {kind: 'reshape', baseBuild: build, inventory, feature, useGPU: false,
        points: 4, trigger: 2, reshapeTargets};
    const preparation = jest.spyOn(ArtifactsSuggest.prototype, 'prepare');
    let result;
    try {
        result = await evaluateArtifactActionPredictions({...params, onProgress: event => progress.push(event)});
        // One baseline plus one shared search per slot/set group: the seven
        // goblets alternate between two sets.
        expect(preparation).toHaveBeenCalledTimes(3);
    } finally { preparation.mockRestore(); }
    expect(result.rows).toHaveLength(7);
    expect(new Set(result.rows.map(row => row.targetId)).size).toBe(7);
    expect(result.baseValue).toBeCloseTo(prepare(build, inventory).getResult()[0].value, 10);
    expect(progress.every(event => event.unit === 'artifacts' && event.slotsTotal === 7)).toBe(true);
    // Each shared search completes all of its candidates at once and reports
    // progress for every member's segment.
    const completions = progress.filter(event => event.phase === 'slot_complete');
    expect(completions.map(event => event.slotsCompleted)).toEqual([4, 7]);
    expect(completions.map(event => event.candidateIndices)).toEqual([[0, 2, 4, 6], [1, 3, 5]]);
    // Sharing a search never changes any candidate's row (checked below).
    for (const target of reshapeTargets) {
        const row = result.rows.find(item => item.targetId === target.id);
        const alone = await evaluateArtifactActionPredictions({...params, reshapeTargets: [target]});
        expect(row).toEqual(alone.rows[0]);
        expect(row.transition).toMatchObject({beforePoints: 4, beforeTrigger: 2, points: 0, trigger: 0, floor: 4});
        expect(row.conditionedStarts).toHaveProperty(String(target.artifact.getInitialLineCount()));
    }
    expect(result.rows.find(row => row.targetId === 'target-0').pair).toEqual(['def', 'hp']);
    expect(result.rows.find(row => row.targetId === 'target-1').recipesEvaluated).toBe(3);
    expect(result.rows.find(row => row.targetId === 'target-2').recipesEvaluated).toBe(6);
    expect(inventory.map(artifact => artifact.getHash())).toEqual(hashes);
    expect(reshapeTargets.map(target => target.artifact.serialize())).toEqual(sources);
});

test('removing all targets never falls back to equipped artifacts; unavailable sources keep their IDs', async () => {
    const {build, inventory} = setup();
    build.setArtifact(reshapeSource());
    const params = {kind: 'reshape', baseBuild: build, inventory, feature, useGPU: false};
    expect((await evaluateArtifactActionPredictions({...params, reshapeTargets: []})).rows).toEqual([]);
    const invalid = reshapeSource();
    invalid.setMetadata({});
    const result = await evaluateArtifactActionPredictions({...params, reshapeTargets: [{id: 'unavailable', artifact: invalid}]});
    expect(result.rows).toEqual([{targetId: 'unavailable', slot: 'goblet', error: 'reshape_missing_start'}]);
    expect(result.baseValue).toBeUndefined();
    await expect(evaluateArtifactActionPredictions({...params, reshapeTargets: {}})).rejects.toThrow('action_invalid_targets');
});

test('an unequipped target can beat the shared baseline without replacing the source in storage', async () => {
    const {build, inventory} = setup();
    const artifact = makeArtifact('goblet', 'GladiatorFinale', 'dmg_phys', [
        {stat: 'crit_rate', value: 2.7}, {stat: 'crit_dmg', value: 5.4}, {stat: 'def', value: 81}, {stat: 'def_percent', value: 5.1}]);
    artifact.setMetadata({initialValues: {crit_rate: 2.72, crit_dmg: 5.44, def: 16.2, def_percent: 5.1},
        totalRolls: 8, elixirCrafted: false});
    inventory.push(artifact);
    const equipped = build.getArtifacts().goblet.getHash(), original = artifact.getHash();
    const result = await evaluateArtifactActionPredictions({kind: 'reshape', baseBuild: build, inventory, feature,
        useGPU: false, mode: 'full', points: 4, trigger: 2,
        reshapeTargets: [{id: 'off-build', artifact, selectedSubstats: ['crit_rate', 'crit_dmg']}]});
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({targetId: 'off-build', slot: 'goblet'});
    expect(result.rows[0].absoluteGain).toBeGreaterThan(0);
    expect(result.rows[0].baseValue).toBe(result.baseValue);
    expect(build.getArtifacts().goblet.getHash()).toBe(equipped);
    expect(artifact.getHash()).toBe(original);
});

test('full details retain all positive states of the winning recipe with exact loadouts', async () => {
    const {build, inventory} = setup();
    inventory.find(artifact => artifact.set === 'WandererTroupe').addStat('crit_rate', 3.5);
    inventory.push(makeArtifact('circlet', 'GladiatorFinale', 'crit_rate'));
    const artifact = makeArtifact('goblet', 'GladiatorFinale', 'dmg_phys', [
        {stat:'crit_rate',value:2.7},{stat:'hp',value:209},{stat:'def',value:81},{stat:'def_percent',value:5.1}]);
    artifact.setMetadata({initialValues:{crit_rate:2.72,hp:209.13,def:16.2,def_percent:5.1},totalRolls:8,elixirCrafted:false});
    inventory.push(artifact);
    const params = {kind:'reshape',baseBuild:build,inventory,feature,useGPU:false,
        reshapeTargets:[{id:'test',artifact,selectedSubstats:[null,null]}]};
    const plain = await evaluateArtifactActionPredictions(params);
    const result = await evaluateArtifactActionPredictions({...params,retainOutcomes:true});
    const row = result.rows[0];
    const {outcomeDetails:details, ...summary} = row;
    expect(summary).toEqual(plain.rows[0]);
    expect(row.pair).toEqual(row.alternatives[0].pair);
    expect(row.alternatives.every(item => !item.outcomeDetails)).toBe(true);
    expect(details.length).toBeGreaterThan(5);
    const restored = result.outcomeInventory.map(data => Artifact.deserialize([...data]));
    const scorer = prepare(build, inventory);
    expect(scorer.evaluateArtifactCombination(result.baselineArtifacts.map(id => restored[id]))).toBeCloseTo(result.baseValue, 10);
    let probability = 0, gain = 0, last = Infinity, cumulative = 0;
    const hashes = new Set();
    for (let i = 0; i < details.length; ++i) {
        const outcome = readArtifactActionOutcome(details, row, i);
        expect(outcome.value).toBeLessThanOrEqual(last);
        expect(outcome.value).toBeGreaterThan(result.baseValue);
        expect(outcome.probability).toBeGreaterThan(0);
        expect(outcome.atLeastProbability).toBeGreaterThanOrEqual(cumulative);
        expect(outcome.atLeastProbability).toBeLessThanOrEqual(1);
        if (outcome.value === last) expect(outcome.atLeastProbability).toBe(cumulative);
        cumulative = outcome.atLeastProbability;
        expect(hashes.has(outcome.artifact.getStatsHash())).toBe(false);
        hashes.add(outcome.artifact.getStatsHash());
        last = outcome.value;
        probability += outcome.probability;
        gain += (outcome.value - result.baseValue) * outcome.probability;
        expect(scorer.evaluateArtifactCombination(artifactOutcomeLoadout(outcome, restored))).toBeCloseTo(outcome.value, 10);
    }
    expect(gain).toBeCloseTo(row.absoluteGain, 10);
    expect(cumulative).toBeCloseTo(row.improveChance, 12);
    expect(probability).toBeCloseTo(row.improveChance, 12);
    // CR-heavy target outcomes genuinely switch to the CD circlet; lower CR
    // outcomes need the CR circlet. A single fixed complement cannot pass.
    expect(new Set(details.builds.map(ids => restored[ids[3]].mainStat)))
        .toEqual(new Set(['crit_rate', 'crit_dmg']));
});

test('all-VOID reshape enumerates one exact positive outcome', async () => {
    const {build, inventory} = setup();
    inventory.find(artifact => artifact.slot === 'goblet').mainStat = 'dmg_geo';
    const artifact = reshapeSource();
    const result = await evaluateArtifactActionPredictions({kind:'reshape',baseBuild:build,inventory,feature,
        useGPU:false,retainOutcomes:true,reshapeTargets:[{id:'void',artifact}]});
    const row = result.rows[0];
    expect(row.outcomeMode).toBe('exact');
    expect(row.absoluteGain).toBeGreaterThan(0);
    expect(row.optimizerEvaluations).toBe(1);
    expect(row.cacheHits).toBe(0);
    expect(row.outcomeDetails.length).toBe(1);
    const outcome = readArtifactActionOutcome(row.outcomeDetails,row,0);
    expect(outcome.occurrences).toBeUndefined();
    expect(outcome.probability).toBeCloseTo(1, 12);
    expect(outcome.artifact.getSubStats()).toEqual([]);
    expect(outcome.complement).toHaveLength(4);
});

test('targets group by slot and set in candidate order and split only for idle workers', async () => {
    const {groupArtifactActionTargets} = await import('../src/js/classes/ArtifactActionPredictor');
    const targets = [['goblet', 'A'], ['flower', 'A'], ['goblet', 'A'], ['goblet', 'B'], ['goblet', 'A'], ['flower', 'A']]
        .map(([slot, set]) => ({slot, set}));
    expect(groupArtifactActionTargets(targets).map(group => [group.slot, group.indices]))
        .toEqual([['goblet', [0, 2, 4]], ['flower', [1, 5]], ['goblet', [3]]]);
    expect(groupArtifactActionTargets(targets, 4).map(group => group.indices))
        .toEqual([[0, 2], [4], [1, 5], [3]]);
    expect(groupArtifactActionTargets(targets, 16).flatMap(group => group.indices).sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(groupArtifactActionTargets(targets, 16)).toHaveLength(6);
});

test('upgrade candidates sharing a slot and set search once and keep their standalone rows', async () => {
    const {build, inventory} = setup();
    const make = (subs, inactive, initial) => {
        const candidate = makeArtifact('circlet', 'GladiatorFinale', 'crit_rate', subs);
        candidate.level = 0;
        candidate.unactivatedSubstats = inactive;
        candidate.setMetadata({totalRolls: 3, elixirCrafted: false, initialValues: initial});
        return candidate;
    };
    const candidates = [
        make([{stat: 'crit_dmg', value: 7.8}, {stat: 'atk_percent', value: 5.8}, {stat: 'def', value: 23}],
            [{stat: 'hp', value: 299}], {crit_dmg: 7.8, atk_percent: 5.8, def: 23, hp: 299}),
        make([{stat: 'crit_dmg', value: 6.2}, {stat: 'atk', value: 19}, {stat: 'hp', value: 239}],
            [{stat: 'recharge', value: 5.2}], {crit_dmg: 6.2, atk: 19, hp: 239, recharge: 5.2}),
    ];
    // An invalid candidate in the same group keeps its own error row.
    const broken = make([{stat: 'crit_dmg', value: 7.8}, {stat: 'def', value: 23}, {stat: 'hp', value: 299}],
        [], {crit_dmg: 7.8, def: 23, hp: 299});
    inventory.push(...candidates, broken);
    const params = {kind: 'upgrade', baseBuild: build, inventory, feature, useGPU: false, pruneOutcomeSets: true,
        retainOutcomes: true};
    const preparation = jest.spyOn(ArtifactsSuggest.prototype, 'prepare');
    let shared;
    try {
        shared = await evaluateArtifactActionPredictions({...params, upgradeTargets: [...candidates, broken]});
        expect(preparation).toHaveBeenCalledTimes(2);
    } finally { preparation.mockRestore(); }
    expect(shared.rows).toHaveLength(3);
    expect(shared.rows.find(row => row.targetId === broken.getHash()).error).toBe('action_upgrade_missing_unactivated');
    for (const candidate of candidates) {
        const alone = await evaluateArtifactActionPredictions({...params, upgradeTargets: [candidate]});
        expect(shared.rows.find(row => row.targetId === candidate.getHash())).toEqual(alone.rows[0]);
    }
});
