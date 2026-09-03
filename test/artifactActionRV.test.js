import { Artifact } from '../src/js/classes/Artifact';
import { ArtifactsSuggest, buildFusedOutcomeRegions } from '../src/js/classes/ArtifactsSuggest';
import { CalcSet } from '../src/js/classes/CalcSet';
import { DB } from '../src/js/db/DB';
import { evaluateArtifactActionPredictions } from '../src/js/classes/ArtifactActionPredictor';
import { artifactMatchesRV, normalizeArtifactRVRange } from '../src/js/classes/ArtifactUsefulRV';
import { countProjectedArtifactAction, projectArtifactAction, iterateProjectedArtifactAction } from '../src/js/classes/ArtifactActionProjection';
import { unionArtifactActionOutcomes } from '../src/js/classes/ArtifactActionUnion';
import { readArtifactActionOutcome } from '../src/js/classes/ArtifactActionOutcomes';
import { ensureDawnNavigator } from './support/gpuNode';

global.DB = DB;
// Production forced-outcome engine on Dawn (no CPU fallback by design).
jest.setTimeout(180000);
beforeAll(async () => {
    await ensureDawnNavigator();
}, 120000);
const range = (min, max) => normalizeArtifactRVRange({enabled: true, min, max});
const used = ['crit_dmg'];
const craft = {kind: 'craft', slot: 'flower', set: 'GladiatorFinale', mainStat: 'hp', pair: ['crit_dmg', 'def']};
const mains = {flower: 'hp', plume: 'atk', sands: 'atk_percent', goblet: 'dmg_phys', circlet: 'crit_rate'};
function setup() {
    const baseBuild = new CalcSet();
    baseBuild.setChar(DB.Chars.get('Jean'));
    baseBuild.setEnemy(DB.Enemies.getFirst().getFirst());
    const inventory = Object.entries(mains).map(([slot, main]) => new Artifact(5, 20, slot, 'GladiatorFinale', main, []));
    inventory.forEach(artifact => baseBuild.setArtifact(artifact));
    return {baseBuild, inventory, feature: 'stats.crit_dmg', retainOutcomes: true, useGPU: false};
}
function source(level = 20) {
    const artifact = new Artifact(5, level, 'flower', 'GladiatorFinale', 'hp', [
        {stat: 'crit_dmg', value: 7.8}, {stat: 'atk', value: 19}, {stat: 'def', value: 23},
        {stat: 'hp_percent', value: level === 20 ? 35 : 29.2}]);
    artifact.setMetadata({totalRolls: 4 + level / 4, elixirCrafted: false,
        initialValues: {crit_dmg: 7.77, atk: 19.45, def: 23.15, hp_percent: 5.83}});
    return artifact;
}
const craftParams = {kind: 'craft', set: craft.set, craftSlots: ['flower'],
    craftAffixes: {flower: {mainStat: ['hp'], substats: [['crit_dmg'], ['def']]}}};

test('projected counts and per-recipe/start probabilities match filtering a full reference', () => {
    const recipes = [craft, {...craft, pair: ['crit_dmg', 'hp_percent']}, {...craft, pair: ['def', 'hp_percent']}];
    const rv = range(300, 310);
    const references = recipes.map(action => [...iterateProjectedArtifactAction(projectArtifactAction(action, used))]
        .filter(outcome => artifactMatchesRV(outcome.artifact, used, rv)));
    const models = recipes.map(action => projectArtifactAction(action, used, undefined, rv));
    models.forEach((model, index) => expect(countProjectedArtifactAction(model)).toBe(references[index].length));
    const union = unionArtifactActionOutcomes(models, used);
    expect(union.entries.length).toBeLessThan(references.reduce((sum, r) => sum + r.length, 0));
    for (let recipe = 0; recipe < recipes.length; ++recipe) {
        const reference = references[recipe];
        const mass = reference.reduce((sum, row) => sum + row.probability, 0);
        let normalizedMass = 0;
        for (let k = union.recipeOffsets[recipe]; k < union.recipeOffsets[recipe + 1]; ++k) {
            const artifact = union.entries[union.entryIndices[k]].artifact;
            const expected = reference.find(row => row.artifact.getHash() === artifact.getHash());
            expect(union.probabilities[k]).toBeCloseTo(expected.probability / mass, 12);
            expect(union.threeLineProbabilities[k]).toBeCloseTo(expected.initialProbabilities[3] / mass, 12);
            normalizedMass += union.probabilities[k];
        }
        if (reference.length) expect(normalizedMass).toBeCloseTo(1, 12);
    }
    const disabled = projectArtifactAction(craft, used, undefined, {enabled: false, min: 900});
    expect([...iterateProjectedArtifactAction(disabled)]).toEqual([...iterateProjectedArtifactAction(projectArtifactAction(craft, used))]);
});

test.each(['craft', 'reshape', 'upgrade'])('%s filters before fused search and conditions every gallery probability and gain', async kind => {
    const params = {...setup(), ...(kind === 'craft' ? craftParams : {kind,
        ...(kind === 'reshape' ? {reshapeTargets: [{id: 'source', artifact: source(), selectedSubstats: ['crit_dmg', 'def']}]}
            : {upgradeTargets: [source(16)]})})};
    const original = await evaluateArtifactActionPredictions(params);
    const rv = kind === 'upgrade' ? range(170, 200) : range(300, 310);
    const reference = [];
    const originalRow = original.rows[0];
    for (let i = 0; i < originalRow.outcomeDetails.length; ++i) {
        const outcome = readArtifactActionOutcome(originalRow.outcomeDetails, originalRow, i);
        if (artifactMatchesRV(outcome.artifact, used, rv)) reference.push(outcome);
    }
    expect(reference.length).toBeGreaterThan(0);
    const mass = reference.reduce((sum, row) => sum + row.probability, 0);
    expect(mass).toBeLessThan(1);
    const spy = jest.spyOn(ArtifactsSuggest.prototype, 'getResultGPUForcedOutcomes');
    const filtered = await evaluateArtifactActionPredictions({...params, rvFilters: {outcomes: rv}});
    expect(filtered.baseValue).toBe(original.baseValue);
    const row = filtered.rows[0];
    expect(row.error).toBeUndefined();
    expect(spy.mock.calls).toHaveLength(1);
    expect(spy.mock.calls[0][1].every(artifact => artifactMatchesRV(artifact, used, rv))).toBe(true);
    spy.mockRestore();
    expect(row.outcomeDetails.length).toBe(reference.length);
    expect(row.probabilitySum).toBeCloseTo(1, 12);
    expect(row.improveChance).toBeCloseTo(1, 12);
    expect(row.absoluteGain).toBeCloseTo(reference.reduce((sum, item) => sum + item.probability * (item.value - original.baseValue), 0) / mass, 10);
    for (let i = 0; i < row.outcomeDetails.length; ++i) {
        const outcome = readArtifactActionOutcome(row.outcomeDetails, row, i);
        expect(outcome.probability).toBeCloseTo(reference[i].probability / mass, 12);
        expect(outcome.value).toBe(reference[i].value);
    }
    expect(readArtifactActionOutcome(row.outcomeDetails, row, row.outcomeDetails.length - 1).atLeastProbability).toBeCloseTo(1, 12);
});

test('companion bounds leave baseline intact and never constrain the forced artifact', async () => {
    const params = {...setup(), kind: 'reshape', reshapeTargets: [{id: 'source', artifact: source(), selectedSubstats: ['crit_dmg', 'def']}]};
    for (const artifact of params.inventory) if (artifact.slot !== 'flower') artifact.subStats = [{stat: 'crit_dmg', value: 7.8}];
    const stronger = new Artifact(5, 20, 'plume', 'GladiatorFinale', 'atk', [{stat: 'crit_dmg', value: 15.5}]);
    params.inventory.push(stronger);
    const original = await evaluateArtifactActionPredictions(params);
    const engine = ArtifactsSuggest.prototype.getResultGPUForcedOutcomes;
    const spy = jest.spyOn(ArtifactsSuggest.prototype, 'getResultGPUForcedOutcomes').mockImplementation(function(slot, artifacts, opts) {
        for (const other of Object.keys(mains).filter(other => other !== slot)) {
            expect(this.slots[other].every(item => artifactMatchesRV(item, used, range(100, 100)))).toBe(true);
        }
        expect(artifacts.some(item => !artifactMatchesRV(item, used, range(100, 100)))).toBe(true);
        return engine.call(this, slot, artifacts, opts);
    });
    const result = await evaluateArtifactActionPredictions({...params, rvFilters: {companions: range(100, 100)}});
    expect(result.baseValue).toBe(original.baseValue);
    expect(result.rows[0].combinationsPerOutcome).toBe(1);
    expect(result.rows[0].absoluteGain).toBeLessThan(original.rows[0].absoluteGain);
    spy.mockRestore();
});

test('4★ Instructor upgrade uses its own tiers and filters final RV, not the source RV', async () => {
    const artifact = new Artifact(4, 12, 'flower', 'Instructor', 'hp', [
        {stat: 'crit_dmg', value: 6.2}, {stat: 'atk', value: 16}, {stat: 'def', value: 19},
        {stat: 'hp_percent', value: 14}]);
    artifact.setMetadata({totalRolls: 6, elixirCrafted: false,
        initialValues: {crit_dmg: 6.22, atk: 15.56, def: 18.52, hp_percent: 4.66}});
    expect(artifactMatchesRV(artifact, used, range(170, 200))).toBe(false);
    const result = await evaluateArtifactActionPredictions({...setup(), kind: 'upgrade', upgradeTargets: [artifact],
        rvFilters: {outcomes: range(170, 200)}});
    const row = result.rows[0];
    expect(row.error).toBeUndefined();
    expect(row.totalOutcomes).toBe(4);
    expect(row.improveChance).toBeCloseTo(1, 12);
    for (let rank = 0; rank < 4; ++rank) {
        const outcome = readArtifactActionOutcome(row.outcomeDetails, row, rank);
        expect(outcome.artifact.rarity).toBe(4);
        expect(artifactMatchesRV(outcome.artifact, used, range(170, 200))).toBe(true);
        expect(outcome.probability).toBeCloseTo(.25, 12);
    }
});

test('disabled filters reproduce complete prediction rows and search counts', async () => {
    const params = {...setup(), ...craftParams};
    const original = await evaluateArtifactActionPredictions(params);
    const disabled = await evaluateArtifactActionPredictions({...params,
        rvFilters: {outcomes: {enabled: false, min: 901}, companions: {enabled: false, max: -1}}});
    expect(disabled).toEqual(original);
});

test('a recipe with no accepted mass is omitted without corrupting a surviving recipe', async () => {
    const result = await evaluateArtifactActionPredictions({...setup(), ...craftParams,
        craftAffixes: {flower: {substats: [['crit_dmg', 'hp_percent'], ['def']]}},
        rvFilters: {outcomes: range(0, 0)}});
    expect(result.rows[0].error).toBeUndefined();
    expect(result.rows[0].recipesEvaluated).toBe(2);
    expect(result.rows[0].alternatives).toHaveLength(1);
    expect(result.rows[0].pair).toEqual(expect.arrayContaining(['hp_percent', 'def']));
    expect(result.rows[0].probabilitySum).toBeCloseTo(1, 12);
});

test('the frozen useful mask includes stats required only by feasibility constraints', async () => {
    const params = {...setup(), kind: 'reshape', reshapeTargets: [{id: 'source', artifact: source(), selectedSubstats: ['crit_dmg', 'def']}],
        optimizerSettings: {stats: {def_min: 1}}};
    for (const artifact of params.inventory) artifact.subStats = [{stat: 'def', value: 23}];
    const engine = ArtifactsSuggest.prototype.getResultGPUForcedOutcomes;
    const spy = jest.spyOn(ArtifactsSuggest.prototype, 'getResultGPUForcedOutcomes').mockImplementation(function(slot, artifacts, opts) {
        expect(this.usedStats).toContain('def');
        expect(this.slots.plume).toHaveLength(1); // its 100 useful RV comes entirely from DEF
        return engine.call(this, slot, artifacts, opts);
    });
    const result = await evaluateArtifactActionPredictions({...params, rvFilters: {companions: range(100, 100)}});
    expect(result.rows[0].error).toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
});

test.each(['craft', 'reshape', 'upgrade'])('%s skips GPU search for empty outcome or companion ranges', async kind => {
    const params = {...setup(), ...(kind === 'craft' ? craftParams : {kind,
        ...(kind === 'reshape' ? {reshapeTargets: [{id: 'source', artifact: source(), selectedSubstats: ['crit_dmg', 'def']}]}
            : {upgradeTargets: [source(16)]})})};
    const spy = jest.spyOn(ArtifactsSuggest.prototype, 'getResultGPUForcedOutcomes');
    const empty = await evaluateArtifactActionPredictions({...params, rvFilters: {outcomes: range(901, null)}});
    expect(empty.rows[0].error).toBe('action_rv_no_outcomes');
    const noPool = await evaluateArtifactActionPredictions({...params, rvFilters: {companions: range(1, null)},
        inventory: params.inventory.filter(item => item.slot !== 'plume')}); // equipped fallback must also fail
    expect(noPool.rows[0].error).toBe('action_rv_no_companions');
    expect(Artifact.deserialize(noPool.outcomeInventory[noPool.baselineArtifacts[1]]).slot).toBe('plume');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
});

test('impossible preserved topology stays infeasible and the real engine skips GPU initialization', async () => {
    const slots = Object.fromEntries(Object.entries(mains).map(([slot, main]) =>
        [slot, [new Artifact(5, 20, slot, 'WandererTroupe', main, [])]]));
    const topology = {kind: '4pc', sets: ['GladiatorFinale']};
    expect(buildFusedOutcomeRegions(slots, 'flower', slots.flower, topology)).toEqual([]);
    const prepareForcedOutcomeOptimizer = jest.fn(() => { throw new Error('must not initialize GPU'); });
    const result = await ArtifactsSuggest.prototype.getResultGPUForcedOutcomes.call({slots, prepareForcedOutcomeOptimizer},
        'flower', slots.flower, {topology});
    expect(prepareForcedOutcomeOptimizer).not.toHaveBeenCalled();
    expect(result.scored).toEqual([{value: -Infinity, artifacts: null}]);
});
