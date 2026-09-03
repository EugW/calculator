import { artifactRollSums } from './ArtifactActionProbability';

// Display-aware tier equality shared by validation, import merging and the
// manual editor. Game values are often rounded for display (flat ATK 13.62
// shows as 14), so both the exact and the displayed value identify a tier.
export function initialTierMatches(roll, value, scale) {
    return Math.abs(roll - value) < 0.00001 ||
        Math.abs(Math.round(roll * scale) / scale - value) < 0.00001;
}

// Substat values are stored as the game displays them (7.8 CRIT DMG, not 7.77).
export function displaySubstatValue(stat, value) {
    const scale = DB.Artifacts.Substats.get(stat)?.type === 'percent' ? 10 : 1;
    return Math.round(value * scale + 1e-8) / scale;
}

const halfwayTables = new Map();

// Irminsul adds rolls as float32 in roll order, so a total exactly half-way between
// two displayed values can come out one step low: DEF% rolls totalling 18.95 were
// exported as 18.9, while the game shows 19.0. When a displayed value cannot be made
// from any rolls but a roll total sits exactly half a step above it, return the
// game's value. Any other value is returned unchanged.
export function correctHalfwayValue(stat, rarity, value) {
    const data = DB.Artifacts.Substats.get(stat);
    const rarityData = DB.Artifacts.Rarity[rarity - 1];
    if (!data?.rolls[rarity - 1] || !rarityData) return value;
    // Roll sums are exact hundredths; one displayed step is 0.1% or 1 flat point.
    const step = data.type === 'percent' ? 10 : 100;
    const key = stat + '/' + rarity;
    let table = halfwayTables.get(key);
    if (!table) {
        const sums = new Set();
        for (let count = 1; count <= 1 + Math.floor(rarityData.maxLevel / 4); ++count) {
            for (const {units} of artifactRollSums(stat, count, rarity)) sums.add(units);
        }
        // The game rounds half-way totals up.
        table = {sums, shown: new Set([...sums].map(units => Math.floor(units / step + 0.5)))};
        halfwayTables.set(key, table);
    }
    const shown = Math.round(value * 100 / step);
    if (table.shown.has(shown) || !table.sums.has(shown * step + step / 2)) return value;
    return (shown + 1) * step / 100;
}

// Known source data only. Missing fields mean unknown, never a simulated history.
export function normalizeArtifactMetadata(artifact, input = {}) {
    if (!input || !Object.keys(input).length) return {};
    const result = {};
    const stats = artifact.getAllSubStats();
    const initialValues = {};
    for (const {stat, value} of stats) {
        const initial = input.initialValues?.[stat];
        const data = DB.Artifacts.Substats.get(stat);
        const scale = data?.type === 'percent' ? 10 : 1;
        const rolls = data?.rolls[artifact.rarity - 1] || [];
        if (Number.isFinite(initial) && initial > 0 &&
            Math.round(initial * scale) <= Math.round(value * scale) &&
            rolls.some(roll => initialTierMatches(roll, initial, scale))) {
            initialValues[stat] = displaySubstatValue(stat, initial);
        }
    }
    if (Object.keys(initialValues).length) result.initialValues = initialValues;

    const total = input.totalRolls;
    const initialLines = total - Math.floor(artifact.level / 4);
    if (Number.isInteger(total) && initialLines >= Math.max(0, artifact.rarity - 2) &&
        initialLines <= Math.max(0, artifact.rarity - 1) &&
        Math.min(total, 4) === artifact.getSubStats().length) {
        result.totalRolls = total;
    }
    if (typeof input.elixirCrafted === 'boolean') result.elixirCrafted = input.elixirCrafted;
    const pair = input.definedSubstats;
    if (result.elixirCrafted === true && Array.isArray(pair) && pair.length === 2 &&
        pair[0] !== pair[1] && pair.every(stat => stats.some(item => item.stat === stat))) {
        result.definedSubstats = [...pair].sort();
    }
    return result;
}

// The length-framed v3 suffix is independent of displayed substat order.
export function serializeArtifactMetadata(metadata) {
    const pair = metadata.definedSubstats || [];
    const initials = Object.entries(metadata.initialValues || {}).sort(([a], [b]) => a.localeCompare(b));
    return [
        metadata.totalRolls === undefined ? 0 : metadata.totalRolls + 1,
        booleanCode(metadata.elixirCrafted),
        pair.length, ...pair.map(stat => DB.Artifacts.Substats.getId(stat)),
        initials.length, ...initials.flatMap(([stat, value]) => [DB.Artifacts.Substats.getId(stat), Math.round(value * 10000)]),
    ];
}

export function deserializeArtifactMetadata(input) {
    if (input.length < 4 || !input.every(value => Number.isSafeInteger(value) && value >= 0)) return null;
    const [total, crafted] = input.splice(0, 2);
    if (total > 10 || crafted > 2) return null;
    const result = {};
    if (total) result.totalRolls = total - 1;
    if (crafted) result.elixirCrafted = crafted === 2;
    const pairCount = input.shift();
    if (pairCount !== 0 && pairCount !== 2) return null;
    if (pairCount) {
        result.definedSubstats = input.splice(0, pairCount).map(id => DB.Artifacts.Substats.getKeyId(id));
        if (result.definedSubstats.some(stat => !stat)) return null;
    }
    const count = input.shift();
    if (!Number.isInteger(count) || count > 4 || input.length !== count * 2) return null;
    if (count) result.initialValues = {};
    while (input.length) {
        const stat = DB.Artifacts.Substats.getKeyId(input.shift());
        if (!stat || result.initialValues[stat] !== undefined) return null;
        result.initialValues[stat] = input.shift() / 10000;
    }
    return result;
}

function booleanCode(value) {
    return value === true ? 2 : value === false ? 1 : 0;
}

// Manual-editor provenance draft. `form` mirrors the editor's v3 block:
// {lines: int|null, crafted: bool|undefined, pair: [stat|null, stat|null],
//  initials: {stat: value}}.
// totalRolls is derived as lines + floor(level/4), so the editor never stores
// a level-dependent value directly. Returns {input, errors}: `input` is
// exactly what the normalizer keeps (editor preview and stored payload cannot
// disagree), and `errors` holds artifact_error.* keys for every required piece
// that is missing or was rejected by validation.
export function describeManualProvenance(artifact, form = {}) {
    const candidate = {};
    const lines = Number.isInteger(form.lines) ? form.lines : null;
    if (lines !== null) candidate.totalRolls = lines + Math.floor(artifact.level / 4);
    if (typeof form.crafted === 'boolean') candidate.elixirCrafted = form.crafted;
    const pair = Array.isArray(form.pair) ? [...new Set(form.pair.filter(Boolean))].sort() : [];
    if (pair.length) candidate.definedSubstats = pair;
    const initials = {};
    for (const [stat, value] of Object.entries(form.initials || {})) {
        if (Number.isFinite(value)) initials[stat] = value;
    }
    if (Object.keys(initials).length) candidate.initialValues = initials;
    const input = normalizeArtifactMetadata(artifact, candidate);
    const errors = [];
    if (input.totalRolls === undefined) errors.push('provenance_lines');
    const active = new Set(artifact.getSubStats().map(item => item.stat));
    if ([...active].some(stat => input.initialValues?.[stat] === undefined)) errors.push('provenance_initial');
    if (input.elixirCrafted === true && (input.definedSubstats || []).length !== 2) errors.push('provenance_pair');
    return {input, errors};
}

// Enrichment must not overwrite conflicting known data. It is not an upgrade matcher.
export function mergeArtifactMetadata(existing, incoming, rarity) {
    const result = {...existing, initialValues: {...existing.initialValues}};
    for (const [key, value] of Object.entries(incoming)) {
        if (key === 'initialValues') {
            for (const [stat, initial] of Object.entries(value)) {
                const previous = result.initialValues[stat];
                if (previous !== undefined && previous !== initial) {
                    const data = DB.Artifacts.Substats.get(stat);
                    const scale = data.type === 'percent' ? 10 : 1;
                    const rolls = data.rolls[rarity - 1];
                    const matches = (roll, value) => initialTierMatches(roll, value, scale);
                    if (!rolls.some(roll => matches(roll, previous) && matches(roll, initial))) return null;
                    // A precise roll may refine a rounded initial value. Two
                    // different precise tiers never overwrite one another.
                    result.initialValues[stat] = rolls.some(roll => Math.abs(roll - previous) < 0.00001) ? previous : initial;
                } else result.initialValues[stat] = initial;
            }
        } else {
            if (result[key] !== undefined && JSON.stringify(result[key]) !== JSON.stringify(value)) return null;
            result[key] = value;
        }
    }
    if (!Object.keys(result.initialValues).length) delete result.initialValues;
    return result;
}
