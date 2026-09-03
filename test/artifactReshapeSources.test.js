import { Artifact } from '../src/js/classes/Artifact';
import { DB } from '../src/js/db/DB';
import { artifactReshapeSources, getArtifactReshapeSelection } from '../src/js/classes/ArtifactReshapeSources';

global.DB = DB;
function source() {
    const artifact = new Artifact(5, 20, 'goblet', 'GladiatorFinale', 'dmg_phys', [
        {stat: 'hp', value: 1046}, {stat: 'def', value: 16}, {stat: 'def_percent', value: 5.1}, {stat: 'recharge', value: 4.5}]);
    artifact.setMetadata({initialValues: {hp: 209.13, def: 16.2, def_percent: 5.1, recharge: 4.53},
        totalRolls: 8, elixirCrafted: false});
    return artifact;
}

test('five current slots are shown, only known eligible sources offer six unordered pairs', () => {
    const goblet = source();
    const rows = artifactReshapeSources({goblet});
    expect(rows.map(row => row.slot)).toEqual(['flower', 'plume', 'sands', 'goblet', 'circlet']);
    expect(rows.filter(row => row.error)).toHaveLength(4);
    expect(rows.find(row => row.slot === 'goblet')).toMatchObject({artifact: goblet, selectedPair: null, inputs: {initialLines: 3}});
    const pairs = rows.find(row => row.slot === 'goblet').pairs;
    expect(pairs).toHaveLength(6);
    expect(new Set(pairs.map(pair => pair.slice().sort().join('/'))).size).toBe(6);
});

test('manual selection is canonicalized and stale/invalid pairs revert to Auto', () => {
    const goblet = source();
    const pick = pair => artifactReshapeSources({goblet}, {goblet: pair}).find(row => row.slot === 'goblet').selectedPair;
    expect(pick(['def', 'hp'])).toEqual(['hp', 'def']);
    for (const pair of [null, ['crit_rate', 'crit_dmg'], ['hp', 'hp'], ['hp'], 'hp/def']) expect(pick(pair)).toBeNull();
});

test('independent fixed/Auto choices enumerate every matching pair exactly once and preserve display order', () => {
    const artifact = source();
    const before = artifact.serialize();
    const stats = artifact.getSubStats().map(sub => sub.stat);
    const allPairs = getArtifactReshapeSelection(artifact).pairs;
    for (const first of [null, ...stats]) for (const second of [null, ...stats]) {
        if (first && first === second) continue;
        const requested = Object.freeze([first, second]);
        const row = getArtifactReshapeSelection(artifact, requested);
        const fixed = requested.filter(Boolean);
        expect(row.selectedSubstats).toEqual(requested);
        expect(row.pairs).toEqual(allPairs.filter(pair => fixed.every(stat => pair.includes(stat))));
        expect(row.pairs).toHaveLength([6, 3, 1][fixed.length]);
        expect(new Set(row.pairs.map(pair => pair.slice().sort().join('/'))).size).toBe(row.pairs.length);
        expect(row.selectedPair).toEqual(fixed.length === 2 ? row.pairs[0] : null);
    }
    expect(artifact.serialize()).toEqual(before);
});

test('stale choices reset only the missing stat, keeping a still-valid fixed partner in its dropdown', () => {
    expect(getArtifactReshapeSelection(source(), ['hp', 'crit_rate']))
        .toMatchObject({selectedSubstats: ['hp', null], selectedPair: null});
    expect(getArtifactReshapeSelection(source(), ['crit_rate', 'hp']))
        .toMatchObject({selectedSubstats: [null, 'hp'], selectedPair: null});
    expect(getArtifactReshapeSelection(source(), ['', 'hp']))
        .toMatchObject({selectedSubstats: [null, 'hp']});
});

test('crafted pair overrides manual settings, with original source and metadata unchanged', () => {
    const goblet = source();
    goblet.setMetadata({...goblet.getMetadata(), elixirCrafted: true, definedSubstats: ['hp', 'def']});
    const before = goblet.serialize();
    const row = artifactReshapeSources({goblet}, {goblet: ['def_percent', 'recharge']}).find(row => row.slot === 'goblet');
    expect(row.pairs).toHaveLength(1);
    expect(row.selectedPair).toEqual(goblet.getMetadata().definedSubstats);
    expect(row.inputs.lockedPair).toEqual(row.selectedPair);
    for (const request of [null, [null, null], ['recharge', null], [null, 'hp']]) {
        const selection = getArtifactReshapeSelection(goblet, request);
        expect(selection.selectedSubstats).toEqual(row.inputs.lockedPair);
        expect(selection.pairs).toEqual([row.inputs.lockedPair]);
    }
    expect(goblet.serialize()).toEqual(before);
});

test('missing provenance stays unavailable with its actual reason, without inferred histories', () => {
    const goblet = source();
    goblet.setMetadata({totalRolls: 8, elixirCrafted: false});
    expect(artifactReshapeSources({goblet}).find(row => row.slot === 'goblet'))
        .toMatchObject({error: 'reshape_missing_initial', pairs: [], selectedPair: null});
});

test('four-line provenance is preserved rather than replaced with a default', () => {
    const goblet = source();
    goblet.setMetadata({...goblet.getMetadata(), totalRolls: 9});
    expect(artifactReshapeSources({goblet}).find(row => row.slot === 'goblet').inputs.initialLines).toBe(4);
});

test('explicit targets support repeated slots with independent choices and crafted locks', () => {
    const first = source(), second = source(), crafted = source();
    second.set = 'WandererTroupe';
    second.setMetadata({...second.getMetadata(), totalRolls: 9});
    crafted.setMetadata({...crafted.getMetadata(), elixirCrafted: true, definedSubstats: ['hp', 'def']});
    const rows = artifactReshapeSources([
        {id: 'a', artifact: first, selectedSubstats: ['hp', null]},
        {id: 'b', artifact: second, selectedSubstats: ['def_percent', 'recharge']},
        {id: 'c', artifact: crafted, selectedSubstats: ['recharge', null]},
    ]);
    expect(rows.map(row => row.id)).toEqual(['a', 'b', 'c']);
    expect(rows.map(row => row.slot)).toEqual(['goblet', 'goblet', 'goblet']);
    expect(rows.map(row => row.pairs.length)).toEqual([3, 1, 1]);
    expect(rows.map(row => row.inputs.initialLines)).toEqual([3, 4, 3]);
    expect(rows[2].selectedSubstats).toEqual(crafted.getMetadata().definedSubstats);
    const changed = artifactReshapeSources([{id: 'a', artifact: first}, {id: 'b', artifact: second}], {b: [null, 'hp']});
    expect(changed.map(row => row.pairs.length)).toEqual([6, 3]);
});

test('empty targets stay empty, unavailable entries retain identity, and malformed IDs are rejected', () => {
    expect(artifactReshapeSources([])).toEqual([]);
    const row = artifactReshapeSources([{id: 'missing', slot: 'goblet', artifact: source(), error: 'reshape_source_unavailable'}])[0];
    expect(row).toMatchObject({id: 'missing', slot: 'goblet', error: 'reshape_source_unavailable', pairs: []});
    for (const targets of [[null], [{artifact: source()}], [{id: 'a', slot: 'invalid'}],
        [{id: 'a', artifact: source()}, {id: 'a', artifact: source()}]]) {
        expect(() => artifactReshapeSources(targets)).toThrow('action_invalid_targets');
    }
});
