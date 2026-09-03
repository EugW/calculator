import { isUsedArtifactStat } from './ArtifactActionProbability';

const TIERS = [[80, 100], [70, 85, 100], [70, 80, 90, 100], [70, 80, 90, 100], [70, 80, 90, 100]];
const tables = new WeakMap();

export function normalizeArtifactRVRange(range) {
    if (!range?.enabled) return {enabled: false, min: null, max: null};
    const bound = value => {
        if (value === undefined || value === null || String(value).trim() === '') return null;
        const result = Number(value);
        if (!Number.isFinite(result) || result < 0) throw new Error('action_rv_invalid_range');
        return result;
    };
    const min = bound(range.min), max = bound(range.max);
    if (min !== null && max !== null && min > max) throw new Error('action_rv_invalid_range');
    return {enabled: true, min, max};
}

export function normalizeArtifactRVFilters(filters) {
    return {outcomes: normalizeArtifactRVRange(filters?.outcomes), companions: normalizeArtifactRVRange(filters?.companions)};
}

export function artifactRVInRange(rv, range) {
    return !range?.enabled || (rv >= (range.min ?? 0) && rv <= (range.max ?? Infinity));
}

/** Reconstruct tier SUMS, not displayed-value / max-roll ratios. Work in raw
 * hundredths, then round once exactly like the outcome generator and the game.
 * Multiple roll histories usually have the same RV; keep genuine low-rarity
 * display ambiguities instead of assigning them an invented exact score.
 */
export function artifactSubstatRVs(stat, value, rarity = 5) {
    if (value === 0) return [0];
    const data = DB.Artifacts.Substats.get(stat);
    if (!data || !TIERS[rarity - 1] || !Number.isFinite(value) || value < 0) throw new Error('action_rv_invalid_stat');
    let byRarity = tables.get(data);
    if (!byRarity) tables.set(data, byRarity = new Map());
    let table = byRarity.get(rarity);
    if (!table) {
        const scale = data.type === 'percent' ? 10 : 1;
        const rolls = [...data.rolls[rarity - 1]].sort((a, b) => a - b).map(value => Math.round(value * 100));
        const raw = new Map(), displayed = new Map();
        const add = (map, key, rv) => {
            if (!map.has(key)) map.set(key, new Set());
            map.get(key).add(rv);
        };
        let states = new Map([[0, new Set([0])]]);
        const maxRolls = 1 + Math.floor(DB.Artifacts.Rarity[rarity - 1].maxLevel / 4);
        for (let count = 1; count <= maxRolls; ++count) {
            const next = new Map();
            for (const [sum, rvs] of states) rolls.forEach((roll, index) => {
                for (const rv of rvs) add(next, sum + roll, rv + TIERS[rarity - 1][index]);
            });
            for (const [sum, rvs] of next) for (const rv of rvs) {
                add(raw, sum, rv);
                add(displayed, Math.round((sum / 100 + 1e-8) * scale), rv);
            }
            states = next;
        }
        table = {raw, displayed, scale, cache: new Map()};
        byRarity.set(rarity, table);
    }
    if (!table.cache.has(value)) {
        const displayed = value * table.scale;
        // Display-rounded imports carry less information than raw affix values.
        const matches = Math.abs(displayed - Math.round(displayed)) < 1e-7
            ? table.displayed.get(Math.round(displayed)) : table.raw.get(Math.round(value * 100));
        if (!matches) throw new Error('action_rv_invalid_stat');
        table.cache.set(value, [...matches].sort((a, b) => a - b));
    }
    return table.cache.get(value);
}

export function artifactSubstatRV(stat, value, rarity = 5) {
    const rvs = artifactSubstatRVs(stat, value, rarity);
    // User-approved approximation for ambiguous 1–3★ display values. The
    // spacing of 4–5★ tiers makes their reconstructed RV unambiguous.
    return rvs.reduce((sum, rv) => sum + rv, 0) / rvs.length;
}

/** Main stats never count. crit_value expands to CR/CD through the same useful
 * mask as VOID. No reconstruction is needed while the filter is disabled.
 */
export function artifactSubstatsMatchRV(subStats, rarity, usedStats, range) {
    if (!range?.enabled) return true;
    let total = 0;
    for (const {stat, value} of subStats) {
        if (!isUsedArtifactStat(usedStats, stat)) continue;
        total += artifactSubstatRV(stat, value, rarity);
    }
    return artifactRVInRange(total, range);
}

export function artifactMatchesRV(artifact, usedStats, range) {
    return artifactSubstatsMatchRV(artifact.subStats, artifact.rarity, usedStats, range);
}
