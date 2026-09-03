import { ARTIFACT_SUGGEST_PREFERENCES_KEY, loadArtifactSuggestPreferences, normalizeArtifactSuggestPreferences,
    restoreArtifactSuggestPreferences, saveArtifactSuggestPreferences } from '../src/js/classes/ArtifactSuggestPreferences';

function storage() {
    const items = new Map();
    return {getItem: jest.fn(key => items.get(key) ?? null), setItem: jest.fn((key, value) => items.set(key, value))};
}
function defaults() {
    return {featureType: 'average', maxThreads: 4, settings: {
        stats: {}, groups: {'': true, Farm: true}, slots: {flower: true, plume: true, sands: true, goblet: true, circlet: true},
        sets: {'GladiatorFinale-2': true, 'GladiatorFinale-4': true}, sets_settings: {artifact_flag: true}, required_sets: {},
        filter: {min_level: 0, max_level: 20, main_stats: {
            sands: {atk_percent: true, def_percent: true, mastery: true},
            goblet: {dmg_geo: true, def_percent: true}, circlet: {crit_rate: true, crit_dmg: true, def_percent: true},
        }},
    }};
}

test('browser JSON round trips main optimizer choices including false, zero, and cleared values', () => {
    const local = storage(), input = defaults();
    input.featureType = 'crit'; input.maxThreads = 3; input.useGPU = false;
    input.settings.stats = {crit_rate_min: '0', recharge_min: '120.5', def_max: ''};
    input.settings.groups.Farm = false;
    input.settings.slots.plume = false;
    input.settings.sets['GladiatorFinale-4'] = false;
    input.settings.sets_settings = {artifact_flag: false, stacks: 0, selected_element: 'geo'};
    input.settings.required_sets = {set1: 'GladiatorFinale', set2: ''};
    input.settings.filter.min_level = 20;
    input.settings.filter.main_stats.circlet.def_percent = false;
    const before = JSON.stringify(input);
    expect(loadArtifactSuggestPreferences(local)).toBeNull();
    expect(saveArtifactSuggestPreferences(input, local)).toBe(true);
    expect(local.setItem.mock.calls[0][0]).toBe(ARTIFACT_SUGGEST_PREFERENCES_KEY);
    expect(JSON.parse(local.getItem(ARTIFACT_SUGGEST_PREFERENCES_KEY))).toEqual({version: 1, ...input});
    expect(loadArtifactSuggestPreferences(local)).toEqual(input);
    expect(JSON.stringify(input)).toBe(before);
});

test('saved overrides merge into fresh defaults without disabling newly introduced options', () => {
    const fresh = defaults(), before = JSON.stringify(fresh);
    const saved = {settings: {groups: {Farm: false, 'Absent group': false}, sets: {'GladiatorFinale-4': false},
        sets_settings: {artifact_flag: false}, filter: {min_level: 20, main_stats: {sands: {atk_percent: false, removed_stat: false}}}}};
    const result = restoreArtifactSuggestPreferences(fresh, saved);
    expect(result.settings.groups).toEqual({'': true, Farm: false, 'Absent group': false});
    expect(result.settings.sets).toEqual({'GladiatorFinale-2': true, 'GladiatorFinale-4': false});
    expect(result.settings.sets_settings.artifact_flag).toBe(false);
    expect(result.settings.filter).toEqual({...fresh.settings.filter, min_level: 20, main_stats: {
        ...fresh.settings.filter.main_stats, sands: {atk_percent: false, def_percent: true, mastery: true},
    }});
    result.settings.filter.main_stats.circlet.crit_rate = false;
    expect(JSON.stringify(fresh)).toBe(before);
    expect(saved.settings.filter.main_stats.sands.removed_stat).toBe(false);
});

test.each(['broken JSON', 'null', '[]', '42', '{}', '{"version":2,"settings":{}}'])('invalid or unsupported storage falls back safely: %s', raw => {
    const local = storage();
    local.setItem(ARTIFACT_SUGGEST_PREFERENCES_KEY, raw);
    expect(loadArtifactSuggestPreferences(local)).toBeNull();
    expect(local.getItem(ARTIFACT_SUGGEST_PREFERENCES_KEY)).toBe(raw);
    expect(restoreArtifactSuggestPreferences(defaults(), null).settings).toEqual(defaults().settings);
});

test('malformed individual fields cannot poison settings or overwrite unrelated defaults', () => {
    const clean = normalizeArtifactSuggestPreferences({featureType: 'invalid', maxThreads: 50, useGPU: 'false', settings: {
        stats: {hp_min: -1, def_min: {}, crit_dmg_max: Infinity, crit_rate_min: '9'.repeat(400), recharge_min: '130', other_min: '10'},
        slots: {goblet: false, unknown: false}, groups: [], sets: {broken: false, 'GladiatorFinale-4': false},
        sets_settings: {array: [], nested: {}, valid: 0}, required_sets: {set1: [], set2: 'GladiatorFinale'},
        filter: {min_level: -1, max_level: 21, main_stats: {sands: [], circlet: {crit_rate: 'false', crit_dmg: false}}},
    }});
    expect(clean.settings.stats).toEqual({recharge_min: '130'});
    expect(clean.settings.slots).toEqual({goblet: false});
    expect(clean.settings.sets).toEqual({'GladiatorFinale-4': false});
    expect(clean.settings.sets_settings).toEqual({valid: 0});
    expect(clean.settings.required_sets).toEqual({set2: 'GladiatorFinale'});
    expect(clean.settings.filter).toEqual({main_stats: {circlet: {crit_dmg: false}}});
    expect(clean.featureType).toBeUndefined(); expect(clean.maxThreads).toBeUndefined(); expect(clean.useGPU).toBeUndefined();
});

test('results, runtime fields, derived constraints, and Craft/Reshape parameters are never persisted', () => {
    const local = storage(), value = {...defaults(), result: {items: ['large result']}, feature: 'rotation',
        gpuAvailable: true, view: 'result', pairs: {goblet: ['hp', null]}, craftAffixes: {}, points: 4};
    value.settings.setMinValues = {GladiatorFinale: 4};
    value.settings.unexpected = {};
    saveArtifactSuggestPreferences(value, local);
    expect(JSON.parse(local.getItem(ARTIFACT_SUGGEST_PREFERENCES_KEY))).toEqual({version: 1, ...defaults()});
});

test('storage errors are nonfatal, and unsafe keys never affect prototypes', () => {
    const local = {getItem() {throw new Error('blocked');}, setItem() {throw new Error('quota');}};
    expect(loadArtifactSuggestPreferences(local)).toBeNull();
    expect(saveArtifactSuggestPreferences(defaults(), local)).toBe(false);
    const clean = normalizeArtifactSuggestPreferences(JSON.parse('{"settings":{"groups":{"__proto__":false,"constructor":false,"Farm":false},"sets_settings":{"prototype":true}}}'));
    expect(clean.settings.groups).toEqual({Farm: false});
    expect(clean.settings.sets_settings).toEqual({});
    expect(Object.getPrototypeOf(clean.settings.groups)).toBe(Object.prototype);
});
