import { Artifact } from '../src/js/classes/Artifact';
import { ArtifactsSuggest } from '../src/js/classes/ArtifactsSuggest';
import { ARTIFACT_ACTION_BASELINE_SCHEMA, computeArtifactActionBaseline,
    evaluateArtifactActionPredictions } from '../src/js/classes/ArtifactActionPredictor';
import { CalcSet } from '../src/js/classes/CalcSet';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { ensureDawnNavigator } from './support/gpuNode';

global.DB = DB;
// Predictions run the production forced-outcome engine on Dawn.
jest.setTimeout(180000);
beforeAll(async () => {
    await ensureDawnNavigator();
}, 120000);

/**
 * Craft, Reshape and Upgrade measure gains from an optimized baseline build.
 * It is its own request, so the UI can compare it with the equipped build
 * before predicting; the prediction then takes it as it is.
 */

const feature = 'attack.normal_hit_1';
const mains = {flower: 'hp', plume: 'atk', sands: 'atk_percent', goblet: 'dmg_phys', circlet: 'crit_dmg'};
const makeArtifact = (slot, set = 'GladiatorFinale', subs = []) => new Artifact(5, 20, slot, set, mains[slot], subs);

function setup() {
    const build = new CalcSet();
    build.setChar(DB.Chars.get('Jean'));
    Team.fromMember(build);
    const inventory = Object.keys(mains).map((slot) => makeArtifact(slot));
    for (const artifact of inventory) build.setArtifact(artifact);
    for (const slot of Object.keys(mains)) {
        inventory.push(makeArtifact(slot, 'WandererTroupe', [{stat: 'atk_percent', value: slot == 'flower' ? 23.3 : 5.8}]));
    }
    return {build, inventory};
}

function direct(build, artifacts) {
    const copy = build.clone();
    copy.clearArtifacts();
    for (const artifact of artifacts) copy.setArtifact(artifact);
    return copy.calcFeatures(1)[feature].average;
}

const params = (build, inventory, extra) => Object.assign({baseBuild: build, inventory, feature, featureType: 'average',
    useGPU: false, showBeta: true}, extra);

test("a baseline is its own request and records the equipped build next to it", async () => {
    const {build, inventory} = setup();
    const record = await computeArtifactActionBaseline(params(build, inventory));

    expect(record.schema).toBe(ARTIFACT_ACTION_BASELINE_SCHEMA);
    expect(typeof record.fingerprint).toBe('string');
    const pieces = record.artifacts.map((item) => Artifact.deserialize(item.slice()));
    expect(record.value).toBeCloseTo(direct(build, pieces), 6);
    expect(record.currentValue).toBeCloseTo(build.calcFeatures(1)[feature].average, 6);
    expect(record.value).toBeGreaterThan(record.currentValue);

    const equipped = build.getArtifacts();
    expect(record.changedSlots).toEqual(pieces.filter((art) => art.getHash() !== equipped[art.slot].getHash())
        .map((art) => art.slot));
    expect(record.setCounts.current).toEqual({GladiatorFinale: 5});
    expect(record.exclusions).toEqual([]);
});

test("reports what keeps the equipped build out of the search", async () => {
    const {build, inventory} = setup();
    // At most three Gladiator pieces, and the equipped goblet is not a candidate.
    const candidates = inventory.filter((art) => art !== build.getArtifacts().goblet);
    const record = await computeArtifactActionBaseline(params(build, candidates,
        {optimizerSettings: {sets: {'GladiatorFinale-4': false}}}));

    expect(record.exclusions).toEqual([
        {kind: 'set_disallowed', set: 'GladiatorFinale', pieces: 4},
        {kind: 'not_candidate', slot: 'goblet'},
    ]);
    expect(record.setCounts.baseline.GladiatorFinale || 0).toBeLessThan(4);
});

test("an equipped copy with history its stored record lacks is still that candidate", async () => {
    const {build, inventory} = setup();
    const first = await computeArtifactActionBaseline(params(build, inventory));

    // Wear the baseline, one piece as a copy with history the stored record
    // does not have (edited in the build's own artifact editor).
    const pieces = first.artifacts.map((item) => Artifact.deserialize(item.slice()));
    const copy = pieces[0].clone();
    copy.setMetadata({totalRolls: 9, elixirCrafted: false});
    expect(copy.getHash()).not.toBe(pieces[0].getHash());
    expect(copy.getStatsHash()).toBe(pieces[0].getStatsHash());
    for (const piece of [copy, ...pieces.slice(1)]) build.setArtifact(piece);

    const record = await computeArtifactActionBaseline(params(build, inventory));
    expect(record.exclusions).toEqual([]);
    expect(record.changedSlots).toEqual([]);
    expect(record.value).toBeCloseTo(record.currentValue, 6);

    // Different stats are a different piece.
    const other = pieces[0].clone();
    other.level = 16;
    build.setArtifact(other);
    const changed = await computeArtifactActionBaseline(params(build, inventory));
    expect(changed.exclusions).toEqual([{kind: 'not_candidate', slot: other.slot}]);
    expect(changed.changedSlots).toEqual([other.slot]);
});

describe("a prediction with a baseline", () => {
    function reshape(build, inventory, extra) {
        const artifact = makeArtifact('goblet', 'GladiatorFinale', [
            {stat: 'hp', value: 1046}, {stat: 'def', value: 16}, {stat: 'def_percent', value: 5.1}, {stat: 'recharge', value: 4.5}]);
        artifact.setMetadata({initialValues: {hp: 209.13, def: 16.2, def_percent: 5.1, recharge: 4.53},
            totalRolls: 8, elixirCrafted: false});
        return evaluateArtifactActionPredictions(params(build, inventory, Object.assign({kind: 'reshape',
            reshapeTargets: [{id: 'source', artifact, selectedSubstats: ['hp', 'def']}]}, extra)));
    }

    test("takes it as it is: the baseline search does not run again", async () => {
        const {build, inventory} = setup();
        const record = await computeArtifactActionBaseline(params(build, inventory));
        const search = jest.spyOn(ArtifactsSuggest.prototype, 'getResult');
        const searchGPU = jest.spyOn(ArtifactsSuggest.prototype, 'getResultGPU');
        try {
            const given = await reshape(build, inventory, {baseline: record});
            expect(search).not.toHaveBeenCalled();
            expect(searchGPU).not.toHaveBeenCalled();

            const own = await reshape(build, inventory);
            expect(search.mock.calls.length + searchGPU.mock.calls.length).toBeGreaterThan(0);
            expect(given.baseValue).toBe(own.baseValue);
            expect(given.rows.map((row) => row.expectedValue)).toEqual(own.rows.map((row) => row.expectedValue));
        } finally {
            search.mockRestore();
            searchGPU.mockRestore();
        }
    });

    test("refuses a baseline of another state", async () => {
        const {build, inventory} = setup();
        const record = await computeArtifactActionBaseline(params(build, inventory));
        // A set control of a set nobody wears is still part of the member's inputs.
        build.setArtifactsSettings({'set.noblesse_oblige_4': false});
        await expect(reshape(build, inventory, {baseline: record})).rejects.toThrow('action_stale_baseline');
        await expect(reshape(build, inventory, {baseline: {schema: 0}})).rejects.toThrow('action_invalid_baseline');
    });
});
