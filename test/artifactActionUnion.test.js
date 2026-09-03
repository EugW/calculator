import { Artifact } from '../src/js/classes/Artifact';
import { DB } from '../src/js/db/DB';
import { projectArtifactAction, countProjectedArtifactAction, iterateProjectedArtifactAction,
  iterateProjectedArtifactActionValues, makeProjectedArtifact } from '../src/js/classes/ArtifactActionProjection';
import { artifactActionOutcomeKey, createArtifactActionOutcomeKey,
  unionArtifactActionOutcomes, collectArtifactUpgradeVariants, unionArtifactUpgradeOutcomes } from '../src/js/classes/ArtifactActionUnion';

global.DB = DB;

// Useful stats kept, so recipes overlap partially but not fully.
const usedStats = ['crit_rate', 'crit_dmg'];
function source(pair) {
  const artifact = new Artifact(5, 20, 'goblet', 'GladiatorFinale', 'dmg_phys', [
    {stat: 'crit_rate', value: 7.8}, {stat: 'crit_dmg', value: 18.7},
    {stat: 'def', value: 39}, {stat: 'hp', value: 299}]);
  artifact.setMetadata({initialValues: {crit_rate: 3.9, crit_dmg: 5.4, def: 23, hp: 299},
    totalRolls: 8, elixirCrafted: false});
  return {kind: 'reshape', slot: 'goblet', set: 'GladiatorFinale', mainStat: 'dmg_phys',
    pair, artifact, floor: 2, cost: 2};
}

/** key -> per-recipe mass, reconstructed from the recipe-major CSR arrays. */
function massesByKey(union) {
  const result = new Map();
  for (let recipe = 0; recipe < union.recipeCount; ++recipe) {
    for (let k = union.recipeOffsets[recipe]; k < union.recipeOffsets[recipe + 1]; ++k) {
      const entry = union.entries[union.entryIndices[k]];
      let masses = result.get(entry.key);
      if (!masses) { masses = new Array(union.recipeCount).fill(null); result.set(entry.key, masses); }
      masses[recipe] = {
        probability: union.probabilities[k],
        initialProbabilities: {3: union.threeLineProbabilities[k],
          4: Math.max(0, union.probabilities[k] - union.threeLineProbabilities[k])},
      };
    }
  }
  return result;
}

test('union dedupes shared keys, conserves per-recipe mass and reports incidences', () => {
  const recipes = [['crit_rate', 'crit_dmg'], ['crit_rate', 'def'], ['crit_dmg', 'def']]
    .map(pair => source(pair));
  const models = recipes.map(action => projectArtifactAction(action, usedStats));
  const counts = models.map(model => countProjectedArtifactAction(model));
  expect(counts.every(n => n > 1)).toBe(true);

  // Independent sequential reference: key -> mass per recipe.
  const reference = models.map(model => {
    const masses = new Map();
    for (const outcome of iterateProjectedArtifactAction(model)) {
      const key = artifactActionOutcomeKey(outcome.artifact, usedStats);
      expect(masses.has(key)).toBe(false); // trie already yields uniques
      masses.set(key, {probability: outcome.probability,
        initialProbabilities: outcome.initialProbabilities, initialLines: outcome.initialLines});
    }
    return masses;
  });

  const union = unionArtifactActionOutcomes(models, usedStats);
  const entries = union.entries;
  const unionKeys = new Set(entries.map(entry => entry.key));
  expect(unionKeys.size).toBe(entries.length);
  // Strictly fewer searches than the sequential sum (overlap exists).
  const sum = counts.reduce((a, b) => a + b, 0);
  expect(entries.length).toBeLessThan(sum);
  // Incidences are exactly the pre-dedup summed states (memory identity).
  const incidences = union.entryIndices.length;
  expect(incidences).toBe(sum);
  expect(union.probabilities.length).toBe(sum);
  expect(union.threeLineProbabilities.length).toBe(sum);
  // Every sequential key is present exactly once with identical per-recipe mass.
  const byKey = massesByKey(union);
  reference.forEach((masses, index) => {
    let total = 0;
    for (const [key, mass] of masses) {
      const actual = byKey.get(key)[index];
      expect(actual).not.toBeNull();
      expect(actual.probability).toBeCloseTo(mass.probability, 12);
      expect(actual.initialProbabilities[3]).toBeCloseTo(mass.initialProbabilities[3], 12);
      expect(actual.initialProbabilities[4]).toBeCloseTo(mass.initialProbabilities[4], 12);
      total += mass.probability;
    }
    expect(total).toBeCloseTo(1, 12);
  });
  // Every incidence maps to the right recipe and sums to its own recipe mass.
  const recipeMass = new Array(models.length).fill(0);
  for (let recipe = 0; recipe < union.recipeCount; ++recipe) {
    for (let k = union.recipeOffsets[recipe]; k < union.recipeOffsets[recipe + 1]; ++k) {
      recipeMass[recipe] += union.probabilities[k];
    }
  }
  for (const total of recipeMass) expect(total).toBeCloseTo(1, 12);
});

test('single-recipe union is the identity', () => {
  const models = [projectArtifactAction(source(['crit_rate', 'crit_dmg']), usedStats)];
  const union = unionArtifactActionOutcomes(models, usedStats);
  expect(union.entries.length).toBe(countProjectedArtifactAction(models[0]));
  expect(union.entryIndices.length).toBe(union.entries.length);
  expect(union.probabilities.length).toBe(union.entries.length);
});

test.each([0, 1, 'exact', 'overestimate'])('typed incidence allocation (%s) preserves all vectors and statistical masses', estimate => {
  const models = [['crit_rate', 'crit_dmg'], ['crit_rate', 'def'], ['crit_dmg', 'def']]
    .map(pair => projectArtifactAction(source(pair), usedStats));
  const reference = unionArtifactActionOutcomes(models, usedStats);
  const count = reference.entryIndices.length;
  const compact = unionArtifactActionOutcomes(models, usedStats, {retainKeys: false,
    incidenceCount: estimate === 'exact' ? count : estimate === 'overestimate' ? count + 10 : estimate});
  expect(compact.entries.every(entry => !Object.hasOwn(entry, 'key'))).toBe(true);
  expect(compact.entries.map(entry => artifactActionOutcomeKey(entry.artifact, usedStats)))
    .toEqual(reference.entries.map(entry => entry.key));
  for (const name of ['recipeOffsets', 'entryIndices', 'probabilities', 'threeLineProbabilities']) {
    expect(compact[name]).toEqual(reference[name]);
  }
});

test('the budget is enforced on post-dedup entries only', () => {
  const models = [['crit_rate', 'crit_dmg'], ['crit_rate', 'def']].map(pair => projectArtifactAction(source(pair), usedStats));
  const full = unionArtifactActionOutcomes(models, usedStats);
  expect(full.entries.length).toBeLessThan(full.probabilities.length);
  // Entry budget: counts distinct outcomes (first rejected entry reported).
  expect(() => unionArtifactActionOutcomes(models, usedStats, {maxEntries: full.entries.length - 1}))
    .toThrow(/^action_outcomes_too_large;\d+;\d+$/);
  // Overlapping recipes with heavy incidence counts build fine.
  expect(unionArtifactActionOutcomes(models, usedStats,
    {maxEntries: full.entries.length}).entries.length).toBe(full.entries.length);
});

/** Pre-slim reference key: the exact implementation replaced by the builder. */
function legacyOutcomeKey(artifact, used) {
  artifact.calcCache(used);
  return JSON.stringify([artifact.slot, artifact.set, artifact.mainStat,
    Object.keys(artifact.calculated).sort().filter(key => artifact.calculated[key] !== 0)
      .map(key => [key, artifact.calculated[key]])]);
}

test('the fast key builder preserves the artifact key equivalence classes', () => {
  const cases = [
    [['crit_rate', 'crit_dmg'], usedStats],
    [['crit_rate', 'def'], usedStats],
    [['def', 'hp'], usedStats],
    [['crit_rate', 'crit_dmg'], ['crit_value']],
    [['crit_rate', 'def'], ['crit_value', 'crit_rate']],
    [['crit_rate', 'crit_dmg'], ['def', 'atk_percent']],
    [['def', 'hp'], ['crit_value', 'atk_percent', 'crit_dmg']],
  ];
  for (const [pair, used] of cases) {
    const model = projectArtifactAction(source(pair), used);
    const builder = createArtifactActionOutcomeKey(used);
    const legacyToFast = new Map();
    const fastToLegacy = new Map();
    for (const outcome of iterateProjectedArtifactActionValues(model)) {
      const artifact = makeProjectedArtifact(model.action, outcome.stats, outcome.values);
      const legacy = legacyOutcomeKey(artifact, used);
      const fast = builder.key(model.action, outcome.stats, outcome.values);
      const seenFast = legacyToFast.get(legacy);
      if (seenFast === undefined) legacyToFast.set(legacy, fast);
      else expect(seenFast).toBe(fast);
      const seenLegacy = fastToLegacy.get(fast);
      if (seenLegacy === undefined) fastToLegacy.set(fast, legacy);
      else expect(seenLegacy).toBe(legacy);
      // The public artifact-based key must agree with the fast builder.
      expect(artifactActionOutcomeKey(artifact, used)).toBe(fast);
    }
    expect(legacyToFast.size).toBe(fastToLegacy.size);
  }
});

test('sequential unions stay order-stable across repeated builds', () => {
  const models = [['crit_rate', 'crit_dmg'], ['crit_rate', 'def'], ['crit_dmg', 'def'], ['def', 'hp']]
    .map(pair => projectArtifactAction(source(pair), usedStats));
  const first = unionArtifactActionOutcomes(models, usedStats);
  const second = unionArtifactActionOutcomes(models, usedStats);
  expect(second.entries.map(entry => entry.key)).toEqual(first.entries.map(entry => entry.key));
});

test('upgrade union merges VOID-identical variants and conserves mass', () => {
  // A 3-line 5-star at +0 carries its 4th line as an unactivated stat.
  const candidate = new Artifact(5, 0, 'circlet', 'GladiatorFinale', 'crit_rate', [
    {stat: 'hp', value: 299}, {stat: 'def', value: 23}, {stat: 'recharge', value: 5.2}], [{stat: 'crit_dmg', value: 7.8}]);
  candidate.setMetadata({totalRolls: 3, elixirCrafted: false,
    initialValues: {hp: 299, def: 23, recharge: 5.2, crit_dmg: 7.8}});
  const variants = collectArtifactUpgradeVariants(candidate);
  expect(variants.length).toBeGreaterThan(1);
  const union = unionArtifactUpgradeOutcomes([{candidate, variants}], usedStats);
  expect(union.states).toBe(variants.length);
  expect([...union.recipeOffsets]).toEqual([0, union.entries.length]);
  // Most substats are VOID here, so many variants collapse; only the used
  // crit line keeps distinct vectors.
  expect(union.entries.length).toBeLessThan(variants.length);
  expect(new Set(union.entries.map(entry => entry.key)).size).toBe(union.entries.length);
  const mass = union.probabilities.reduce((sum, probability) => sum + probability, 0);
  expect(mass).toBeCloseTo(1, 10);
  for (const entry of union.entries) {
    expect(entry.artifact.getSlot()).toBe('circlet');
    expect(entry.artifact.getLevel()).toBe(20);
    // The shared VOID key agrees with the public artifact-based key.
    expect(entry.key).toBe(artifactActionOutcomeKey(entry.artifact, usedStats));
  }
});

test('upgrade union enforces the post-dedup entry budget', () => {
  const candidate = new Artifact(5, 0, 'circlet', 'GladiatorFinale', 'crit_rate', [
    {stat: 'crit_dmg', value: 7.8}, {stat: 'atk_percent', value: 5.8}, {stat: 'def', value: 23}], [{stat: 'hp', value: 299}]);
  candidate.setMetadata({totalRolls: 3, elixirCrafted: false,
    initialValues: {crit_dmg: 7.8, atk_percent: 5.8, def: 23, hp: 299}});
  const variants = collectArtifactUpgradeVariants(candidate);
  expect(() => unionArtifactUpgradeOutcomes([{candidate, variants}], usedStats, {maxEntries: 0}))
    .toThrow('action_outcomes_too_large');
  // Without the RV filter the candidate's mass must already be exact.
  expect(() => unionArtifactUpgradeOutcomes([{candidate, variants: variants.slice(1)}], usedStats))
    .toThrow('Invalid upgrade probability mass');
  const conditioned = unionArtifactUpgradeOutcomes([{candidate, variants: variants.slice(1)}], usedStats, {conditional: true});
  expect(conditioned.probabilities.reduce((sum, probability) => sum + probability, 0)).toBeCloseTo(1, 12);
});
