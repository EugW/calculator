import { normalizeArtifactOptimizerSettings } from "../src/js/classes/ArtifactOptimizerSettings";
import { createOptimizationPlanConstraints } from "../src/js/classes/OptimizationPlan";

test('empty artifact optimizer settings produce the ordinary unconstrained defaults', () => {
    expect(normalizeArtifactOptimizerSettings()).toEqual({
        sets_settings: {},
        stats: {},
        setMinValues: {},
        setMaxValues: {},
    });
});

test('Best Artifact required sets and disabled bonuses normalize without mutating the UI model', () => {
    let rawSettings = {
        stats: {
            crit_rate_min: '70',
        },
        sets_settings: {
            emblem_energy: false,
        },
        required_sets: {
            set1: 'EmblemofSeveredFate',
            set2: 'EmblemofSeveredFate',
        },
        sets: {
            'EmblemofSeveredFate-2': true,
            'EmblemofSeveredFate-4': true,
            'GladiatorFinale-4': false,
            'GladiatorFinale-2': false,
            'WandererTroupe-4': false,
        },
        // These model a stale ordinary-optimizer conversion. Raw UI selectors
        // remain authoritative whenever they are present.
        setMinValues: {StaleMinimum: 2},
        setMaxValues: {StaleMaximum: 4},
    };
    let snapshot = JSON.parse(JSON.stringify(rawSettings));
    let normalized = normalizeArtifactOptimizerSettings(rawSettings);

    expect(normalized).toEqual({
        sets_settings: {
            emblem_energy: false,
        },
        stats: {
            crit_rate_min: '70',
        },
        setMinValues: {
            EmblemofSeveredFate: 4,
        },
        setMaxValues: {
            GladiatorFinale: 2,
            WandererTroupe: 4,
        },
    });
    expect(rawSettings).toEqual(snapshot);
    expect(normalized.stats).not.toBe(rawSettings.stats);
    expect(normalized.sets_settings).not.toBe(rawSettings.sets_settings);
});

test('already canonical optimizer constraints remain supported for core callers', () => {
    let normalized = normalizeArtifactOptimizerSettings({
        setMinValues: {
            EmblemofSeveredFate: '2',
            IgnoredZero: 0,
        },
        setMaxValues: {
            GladiatorFinale: '4',
        },
    });

    expect(normalized.setMinValues).toEqual({
        EmblemofSeveredFate: 2,
    });
    expect(normalized.setMaxValues).toEqual({
        GladiatorFinale: 4,
    });
});

test('required and disabled settings retain the shared visible infeasibility error', () => {
    let normalized = normalizeArtifactOptimizerSettings({
        required_sets: {
            set1: 'EmblemofSeveredFate',
            set2: 'EmblemofSeveredFate',
        },
        sets: {
            'EmblemofSeveredFate-4': false,
        },
    });

    expect(() => createOptimizationPlanConstraints(normalized)).toThrow(/unsatisfiable/);
});
