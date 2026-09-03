import { Artifact } from '../src/js/classes/Artifact';
import { DB } from '../src/js/db/DB';
import { artifactMatchesRV, artifactSubstatRV, artifactSubstatRVs, normalizeArtifactRVFilters,
    normalizeArtifactRVRange } from '../src/js/classes/ArtifactUsefulRV';
import { SUBSTAT_WEIGHTS } from '../src/js/classes/ArtifactActionProbability';

global.DB = DB;
const range = (min, max) => normalizeArtifactRVRange({enabled: true, min, max});

test('ranges are disabled by default, inclusive, unbounded when blank, and validated', () => {
    expect(normalizeArtifactRVFilters()).toEqual({outcomes: {enabled: false, min: null, max: null},
        companions: {enabled: false, min: null, max: null}});
    expect(range('90', '')).toEqual({enabled: true, min: 90, max: null});
    expect(range(null, '100')).toEqual({enabled: true, min: null, max: 100});
    for (const [min, max] of [[-1, 100], [100, 90], [NaN, 900], [0, Infinity], ['oops', '']]) {
        expect(() => range(min, max)).toThrow('action_rv_invalid_range');
    }
    expect(normalizeArtifactRVRange({enabled: false, min: -1, max: 'bad'}).enabled).toBe(false);
});

test('raw and rounded 4–5★ roll sums reconstruct exact tier RV for every substat', () => {
    for (const rarity of [4, 5]) for (const stat of Object.keys(SUBSTAT_WEIGHTS)) {
        const data = DB.Artifacts.Substats.get(stat);
        const scale = data.type === 'percent' ? 10 : 1;
        const rolls = [...data.rolls[rarity - 1]].sort((a, b) => a - b);
        let states = new Map([[0, 0]]);
        for (let n = 1; n <= 1 + rarity; ++n) {
            const next = new Map();
            for (const [units, rv] of states) rolls.forEach((roll, tier) => {
                const sum = units + Math.round(roll * 100), expected = rv + 70 + tier * 10;
                next.set(sum, expected);
                expect(artifactSubstatRV(stat, sum / 100, rarity)).toBe(expected);
                const displayed = Math.round((sum / 100 + 1e-8) * scale) / scale;
                expect(artifactSubstatRVs(stat, displayed, rarity)).toEqual([expected]);
            });
            states = next;
        }
    }
});

test('rarities use their own maps and low-rarity ambiguity uses the agreed average', () => {
    expect(artifactSubstatRV('crit_dmg', 6.99, 5)).toBe(90);
    expect(artifactSubstatRV('crit_dmg', 7.77, 5)).toBe(100);
    expect(artifactSubstatRV('crit_dmg', 6.22, 4)).toBe(100);
    expect(artifactSubstatRV('crit_dmg', 6.22, 5)).toBe(80);
    expect(artifactSubstatRV('def', 7.78, 3)).toBe(70); // unsorted source array
    expect(artifactSubstatRV('atk', 3.97, 2)).toBe(85);
    expect(artifactSubstatRVs('atk', 2, 1)).toEqual([80, 100]);
    expect(artifactSubstatRV('atk', 2, 1)).toBe(90);
    expect(() => artifactSubstatRV('crit_dmg', 1, 5)).toThrow('action_rv_invalid_stat');
});

test('useful RV counts flat stats and current substats, excludes main/VOID and expands crit_value once', () => {
    const artifact = new Artifact(5, 0, 'circlet', 'GladiatorFinale', 'crit_dmg', [
        {stat: 'crit_rate', value: 3.9}, {stat: 'crit_dmg', value: 7.8},
        {stat: 'atk', value: 19}, {stat: 'def', value: 23}]);
    expect(artifactMatchesRV(artifact, ['atk'], range(100, 100))).toBe(true);
    expect(artifactMatchesRV(artifact, ['crit_value', 'crit_rate', 'crit_dmg'], range(200, 200))).toBe(true);
    expect(artifactMatchesRV(artifact, ['hp'], range(0, 0))).toBe(true);
    expect(artifactMatchesRV(artifact, ['atk'], range(101, null))).toBe(false);
    artifact.level = 20;
    expect(artifactMatchesRV(artifact, ['atk'], range(100, 100))).toBe(true);
});
