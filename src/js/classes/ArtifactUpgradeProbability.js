import { artifactRollSums, SUBSTAT_WEIGHTS } from './ArtifactActionProbability';

export const ARTIFACT_UPGRADE_MODEL = 'weighted-reveals-conditioned-raw-rolls-backloaded-v1';
const allocationCache = new Map();
const identityCache = new Map();

function display(stat, units) {
    const scale = DB.Artifacts.Substats.get(stat).type === 'percent' ? 10 : 1;
    return Math.round((units / 100 + 1e-8) * scale) / scale;
}

function matchesObserved(stat, units, value) {
    // Imports may contain either exact raw totals or values rounded for display.
    return Math.abs(value - display(stat, value * 100)) < 1e-6
        ? display(stat, units) === value : Math.abs(units / 100 - value) < 1e-6;
}

function initialRolls(stat, rarity, known) {
    const rolls = DB.Artifacts.Substats.get(stat).rolls[rarity - 1];
    let values = rolls;
    if (known !== undefined) {
        const exact = rolls.filter(roll => Math.abs(roll - known) < 1e-6);
        values = exact.length ? exact : rolls.filter(roll => matchesObserved(stat, Math.round(roll * 100), known));
    }
    return values.map(value => ({units: Math.round(value * 100), probability: 1 / values.length, ways: 1}));
}

function currentRolls(sub, count, rarity, initial) {
    if (initial === undefined) {
        return artifactRollSums(sub.stat, count, rarity).filter(roll => matchesObserved(sub.stat, roll.units, sub.value));
    }
    const matches = [];
    for (const base of initialRolls(sub.stat, rarity, initial)) {
        for (const sum of artifactRollSums(sub.stat, count - 1, rarity)) {
            const units = base.units + sum.units;
            if (matchesObserved(sub.stat, units, sub.value)) {
                matches.push({units, probability: base.probability * sum.probability, ways: sum.ways});
            }
        }
    }
    return matches;
}

/** Exact identity draws; different draw orders merge into one unordered set. */
export function weightedUpgradeSubstats(eligible, count) {
    const key = `${eligible.join(',')}/${count}`;
    if (identityCache.has(key)) return identityCache.get(key);
    let states = [{stats: [], probability: 1}];
    for (let step = 0; step < count; ++step) {
        const next = new Map();
        for (const state of states) {
            const available = eligible.filter(stat => !state.stats.includes(stat));
            const total = available.reduce((sum, stat) => sum + SUBSTAT_WEIGHTS[stat], 0);
            for (const stat of available) {
                const stats = [...state.stats, stat].sort();
                const id = stats.join(',');
                const entry = next.get(id) || {stats, probability: 0};
                entry.probability += state.probability * SUBSTAT_WEIGHTS[stat] / total;
                next.set(id, entry);
            }
        }
        states = [...next.values()];
    }
    identityCache.set(key, states);
    return states;
}

/** Prefix or future allocations, with forcing only when every remaining hit is needed. */
function allocations(steps, parts, pair, remaining = steps, previousHits = 0) {
    const key = [steps, parts, pair.join(','), remaining, previousHits].join('/');
    if (allocationCache.has(key)) return allocationCache.get(key);
    let states = [{counts: Array(parts).fill(0), probability: 1, ways: 1}];
    for (let step = 0; step < steps; ++step) {
        const next = new Map();
        for (const state of states) {
            const hits = previousHits + pair.reduce((sum, index) => sum + state.counts[index], 0);
            if (pair.length && hits + remaining - step < 2) continue;
            const targets = pair.length && hits + remaining - step === 2
                ? pair : Array.from({length: parts}, (_, index) => index);
            for (const target of targets) {
                const counts = [...state.counts];
                ++counts[target];
                const id = counts.join(',');
                const entry = next.get(id) || {counts, probability: 0, ways: 0};
                entry.probability += state.probability / targets.length;
                entry.ways += state.ways;
                next.set(id, entry);
            }
        }
        states = [...next.values()];
    }
    allocationCache.set(key, states);
    return states;
}

function products(options, callback, at = 0, units = [], probability = 1, ways = 1) {
    if (at === options.length) {
        callback(units, probability, ways);
        return;
    }
    for (const roll of options[at]) {
        units[at] = roll.units;
        products(options, callback, at + 1, units, probability * roll.probability, ways * (roll.ways || 1));
    }
}

/** Condition canonical roll histories on observed totals and known provenance.
 * Missing required history blocks prediction until the artifact is enriched.
 * Known initial rolls are conditioned on, never replaced by an average of displayed totals.
 */
export function artifactUpgradeInputs(artifact) {
    const rarity = artifact.getRarity();
    const data = DB.Artifacts.Rarity[rarity - 1];
    const subs = artifact.getSubStats();
    const inactive = artifact.getUnactivatedSubStats();
    const stats = subs.map(sub => sub.stat);
    const allStats = stats.concat(inactive.map(sub => sub.stat));
    const metadata = artifact.getMetadata();
    const elapsed = Math.floor(artifact.getLevel() / 4);
    const maxEvents = Math.floor(data.maxLevel / 4);
    if (new Set(allStats).size !== allStats.length || allStats.length > data.maxSubstats
        || allStats.some(stat => stat === artifact.getMainStat() || !SUBSTAT_WEIGHTS[stat])) {
        throw new Error('action_upgrade_invalid_values');
    }
    const pair = metadata.elixirCrafted ? metadata.definedSubstats?.map(stat => stats.indexOf(stat)) : [];
    if (metadata.elixirCrafted && (rarity !== 5 || pair?.length !== 2 || pair.some(index => index < 0))) {
        throw new Error('action_upgrade_missing_pair');
    }
    const knownStart = artifact.getInitialLineCount();
    if (knownStart == null) throw new Error('action_upgrade_missing_start');
    // A 3-line 5★ below +4 always carries its 4th line in game data as an
    // unactivated stat. Without it the artifact is incomplete; its 4th line
    // is known to the game, so it must not be drawn at random.
    if (rarity === 5 && elapsed === 0 && stats.length === 3 && !inactive.length) {
        throw new Error('action_upgrade_missing_unactivated');
    }
    if (allStats.some(stat => metadata.initialValues?.[stat] == null)) {
        throw new Error('action_upgrade_missing_initial');
    }
    if (typeof metadata.elixirCrafted !== 'boolean') throw new Error('action_upgrade_missing_crafted');
    const starts = [knownStart].filter(start => Math.min(data.maxSubstats, start + elapsed) === stats.length);
    const states = [];
    for (const initialLines of starts) {
        const pastEnhancements = Math.max(0, initialLines + elapsed - data.maxSubstats);
        const totalEnhancements = Math.max(0, initialLines + maxEvents - data.maxSubstats);
        for (const allocation of allocations(pastEnhancements, stats.length, pair, totalEnhancements)) {
            const options = subs.map((sub, i) => currentRolls(sub, allocation.counts[i] + 1,
                rarity, metadata.initialValues?.[sub.stat]));
            products(options, (units, probability) => {
                states.push({initialLines, units: [...units],
                    hits: pair.reduce((sum, index) => sum + allocation.counts[index], 0),
                    probability: probability * allocation.probability / starts.length});
            });
        }
    }
    const total = states.reduce((sum, state) => sum + state.probability, 0);
    if (!total) throw new Error('action_upgrade_invalid_values');
    for (const state of states) state.probability /= total;
    return {states, pair: metadata.definedSubstats || [], metadata, rarity,
        assumptions: {startingLines: new Set(states.map(state => state.initialLines)).size > 1 ? 'equal-prior' : null,
            rawRolls: states.length > 1 ? 'conditioned-uniform-tiers' : null,
            craftedStatus: metadata.elixirCrafted === undefined ? 'ordinary' : null}};
}

/** Exact future PMF conditional on the observed artifact and the stated priors. */
export function enumerateArtifactUpgradeStates(artifact, callback) {
    const input = artifactUpgradeInputs(artifact);
    const {states, rarity, metadata} = input;
    const data = DB.Artifacts.Rarity[rarity - 1];
    const current = artifact.getSubStats();
    const remaining = Math.floor(data.maxLevel / 4) - Math.floor(artifact.getLevel() / 4);
    if (remaining <= 0) {
        callback(current, 1, 1);
        return input.assumptions;
    }
    const inactive = artifact.getUnactivatedSubStats();
    const activated = inactive.slice(0, Math.min(inactive.length, remaining));
    const known = current.concat(activated).map(sub => sub.stat);
    const missing = Math.min(data.maxSubstats - known.length, remaining - activated.length);
    const enhancements = remaining - activated.length - missing;
    const eligible = Object.keys(SUBSTAT_WEIGHTS).filter(stat => stat !== artifact.getMainStat()
        && !known.includes(stat) && !inactive.some(sub => sub.stat === stat));
    const activations = activated.map(sub => {
        const values = currentRolls(sub, 1, rarity, metadata.initialValues?.[sub.stat]);
        const mass = values.reduce((sum, roll) => sum + roll.probability, 0);
        if (!mass) throw new Error('action_upgrade_invalid_values');
        return values.map(roll => ({...roll, probability: roll.probability / mass}));
    });
    for (const choice of weightedUpgradeSubstats(eligible, missing)) {
        const stats = known.concat(choice.stats);
        const pair = metadata.elixirCrafted ? input.pair.map(stat => stats.indexOf(stat)) : [];
        const added = activations.concat(choice.stats.map(stat => initialRolls(stat, rarity)));
        for (const state of states) {
            for (const allocation of allocations(enhancements, stats.length, pair, enhancements, state.hits)) {
                const rolls = stats.map((stat, i) => artifactRollSums(stat, allocation.counts[i], rarity));
                products(added, (addedUnits, addedProbability) => {
                    const base = state.units.concat(addedUnits);
                    products(rolls, (units, rollProbability, rollWays) => {
                        callback(stats.map((stat, i) => ({stat, value: display(stat, base[i] + units[i])})),
                            state.probability * choice.probability * allocation.probability * addedProbability * rollProbability,
                            allocation.ways * rollWays);
                    });
                });
            }
        }
    }
    return input.assumptions;
}
