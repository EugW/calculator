export const ARTIFACT_ACTION_MODEL = 'community-backloaded-uniform-tiers-v1';
export const ACTION_SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
export const CRAFT_COST = {flower: 1, plume: 1, sands: 2, goblet: 4, circlet: 3};
export const RESHAPE_COST = {flower: 1, plume: 1, sands: 2, goblet: 2, circlet: 2};
export const SUBSTAT_WEIGHTS = {hp: 6, atk: 6, def: 6, hp_percent: 4, atk_percent: 4, def_percent: 4, recharge: 4, mastery: 4, crit_rate: 3, crit_dmg: 3};
const allocationCache = new Map();
const rollsCache = new Map();

export function substatPairs(stats) {
    return stats.flatMap((a, i) => stats.slice(i + 1).map((b) => [a, b]));
}

/** The guarantee changes allocation only, and only at the last possible step. */
export function enhancementAllocations(rolls, floor) {
    if (![4, 5].includes(rolls) || ![2, 3, 4].includes(floor)) throw new RangeError('Invalid enhancement count or floor');
    const key = `${rolls}/${floor}`;
    if (allocationCache.has(key)) return allocationCache.get(key);
    let states = new Map([['0,0,0,0', {counts: [0, 0, 0, 0], probability: 1}]]);
    for (let step = 0; step < rolls; ++step) {
        const next = new Map();
        for (const state of states.values()) {
            const hits = state.counts[0] + state.counts[1];
            const remaining = rolls - step;
            if (hits + remaining < floor) throw new Error('Unreachable pity state');
            const targets = hits + remaining === floor ? 2 : 4;
            for (let index = 0; index < targets; ++index) {
                const counts = state.counts.slice();
                ++counts[index];
                const id = counts.join(',');
                const value = next.get(id) || {counts, probability: 0};
                value.probability += state.probability / targets;
                next.set(id, value);
            }
        }
        states = next;
    }
    const result = Array.from(states.values());
    allocationCache.set(key, result);
    return result;
}

/** Exact convolution in hundredths of the imported roll values; never key on display rounding. */
export function artifactRollSums(stat, count, rarity = 5) {
    const key = `${stat}/${count}/${rarity}`;
    if (rollsCache.has(key)) return rollsCache.get(key);
    const rolls = DB.Artifacts.Substats.get(stat)?.rolls[rarity - 1];
    if (!rolls || !Number.isInteger(count) || count < 0 || count > 6) throw new RangeError('Invalid substat roll distribution');
    let states = new Map([[0, 1]]);
    for (let n = 0; n < count; ++n) {
        const next = new Map();
        for (const [sum, ways] of states) {
            for (const roll of rolls) {
                const value = sum + Math.round(roll * 100);
                next.set(value, (next.get(value) || 0) + ways);
            }
        }
        states = next;
    }
    const result = Array.from(states, ([units, ways]) => ({units, ways, probability: ways / rolls.length ** count}));
    rollsCache.set(key, result);
    return result;
}

export function randomCraftSubstats(mainStat, pair) {
    validatePair(pair, Object.keys(SUBSTAT_WEIGHTS).filter((stat) => stat !== mainStat));
    const eligible = Object.keys(SUBSTAT_WEIGHTS).filter((stat) => stat !== mainStat && !pair.includes(stat));
    const total = eligible.reduce((sum, stat) => sum + SUBSTAT_WEIGHTS[stat], 0);
    return substatPairs(eligible).map(([a, b]) => ({
        stats: [a, b],
        probability: SUBSTAT_WEIGHTS[a] * SUBSTAT_WEIGHTS[b] / total
            * (1 / (total - SUBSTAT_WEIGHTS[a]) + 1 / (total - SUBSTAT_WEIGHTS[b])),
    }));
}

export function hallowedExegesisTransition(points, trigger, slot) {
    if (!Number.isInteger(points) || points < 0 || points > 5 || ![0, 1, 2].includes(trigger) || !RESHAPE_COST[slot]) {
        throw new RangeError('Hallowed Exegesis needs 0–5 points and 0–2 completed threshold triggers');
    }
    const cost = RESHAPE_COST[slot];
    const activated = points + cost >= 6;
    const floor = activated ? (trigger === 2 ? 4 : 3) : 2;
    return {cost, floor, type: floor === 4 ? 'decreed' : floor === 3 ? 'advanced' : 'normal',
        beforePoints: points, beforeTrigger: trigger,
        points: (points + cost) % 6, trigger: activated ? (trigger + 1) % 3 : trigger};
}

function displayValue(stat, value) {
    const scale = DB.Artifacts.Substats.get(stat).type === 'percent' ? 10 : 1;
    return Math.round((value + 1e-8) * scale) / scale;
}

/** Read known provenance. Never average possible histories or guess a start. */
export function getReshapeInputs(artifact) {
    if (!artifact || artifact.getRarity() !== 5 || artifact.getLevel() !== 20 || artifact.getSubStats().length !== 4) {
        throw new RangeError('reshape_ineligible');
    }
    const subs = artifact.getSubStats();
    if (new Set(subs.map((sub) => sub.stat)).size !== 4 || subs.some((sub) => sub.stat === artifact.getMainStat())) {
        throw new RangeError('reshape_invalid_values');
    }
    const metadata = artifact.getMetadata();
    const initialLines = artifact.getInitialLineCount();
    if (![3, 4].includes(initialLines)) throw new RangeError('reshape_missing_start');
    const baseValues = {};
    for (const {stat} of subs) {
        const initial = metadata.initialValues?.[stat];
        const rolls = DB.Artifacts.Substats.get(stat)?.rolls[4] || [];
        const matches = rolls.filter(value => Math.abs(value - initial) < 1e-6 || displayValue(stat, value) === initial);
        if (matches.length !== 1) throw new RangeError('reshape_missing_initial');
        baseValues[stat] = matches[0];
    }
    if (typeof metadata.elixirCrafted !== 'boolean') throw new RangeError('reshape_missing_crafted');
    if (metadata.elixirCrafted && metadata.definedSubstats?.length !== 2) throw new RangeError('reshape_missing_pair');
    return {initialLines, baseValues, lockedPair: metadata.elixirCrafted ? [...metadata.definedSubstats] : null};
}

export function validatePair(pair, eligible) {
    if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1] || pair.some((stat) => !eligible.includes(stat))) {
        throw new RangeError('Select two different eligible substats');
    }
}

/** Blocks retain identities, start case, and exact allocation probability.
 * Their tier products can be streamed with unused objective dimensions integrated out.
 */
export function actionProbabilityBlocks(action) {
    if (!ACTION_SLOTS.includes(action.slot) || !DB.Artifacts.Slots.get(action.slot).mainStats.includes(action.mainStat)) {
        throw new RangeError('Invalid artifact slot or main stat');
    }
    if (!DB.Artifacts.Sets.get(action.set) || DB.Artifacts.Sets.get(action.set).maxRarity < 5) throw new RangeError('Invalid 5-star artifact set');
    const isCraft = action.kind === 'craft';
    if (!isCraft && action.kind !== 'reshape') throw new RangeError('Unknown artifact action');
    const q = action.fourLineChance ?? 0.34;
    if (isCraft && (!Number.isFinite(q) || q < 0 || q > 1)) throw new RangeError('Four-line probability must be between 0 and 1');
    const inputs = isCraft ? null : getReshapeInputs(action.artifact);
    if (!isCraft && (action.slot !== action.artifact.slot || action.set !== action.artifact.set || action.mainStat !== action.artifact.mainStat)) {
        throw new RangeError('Reshaping cannot change the source artifact identities');
    }
    const cases = isCraft ? [{initialLines: 3, probability: 1 - q}, {initialLines: 4, probability: q}]
        : [{...inputs, probability: 1}];
    const choices = isCraft ? randomCraftSubstats(action.mainStat, action.pair)
        : [{stats: action.artifact.getSubStats().map((sub) => sub.stat).filter((stat) => !action.pair.includes(stat)), probability: 1}];
    if (!isCraft) validatePair(action.pair, action.artifact.getSubStats().map((sub) => sub.stat));
    if (inputs?.lockedPair && !inputs.lockedPair.every(stat => action.pair.includes(stat))) throw new RangeError('reshape_locked_pair');
    const blocks = [];
    for (const start of cases) {
        if (!start.probability) continue;
        for (const choice of choices) {
            const stats = action.pair.concat(choice.stats);
            for (const allocation of enhancementAllocations(start.initialLines + 1, isCraft ? 2 : action.floor)) {
                blocks.push({stats, initialLines: start.initialLines, counts: allocation.counts,
                    baseValues: start.baseValues || {}, freshBases: isCraft,
                    probability: start.probability * choice.probability * allocation.probability});
            }
        }
    }
    return blocks;
}

/** The optimizer dependency closure marks every stat that can change the
 * current calculation, including feasibility constraints. Everything else is
 * VOID. crit_value aggregates both crit stats.
 */
export function isUsedArtifactStat(usedStats, stat) {
    return !usedStats || usedStats.includes(stat)
        || (usedStats.includes('crit_value') && ['crit_rate', 'crit_dmg'].includes(stat));
}

export function blockRollDistributions(block, usedStats) {
    return block.stats.map((stat, index) => {
        const base = block.baseValues[stat] || 0;
        const count = block.counts[index] + (block.freshBases ? 1 : 0);
        if (!isUsedArtifactStat(usedStats, stat)) {
            return [{units: 0, probability: 1}];
        }
        return artifactRollSums(stat, count).map((sum) => ({units: sum.units + Math.round(base * 100), probability: sum.probability}));
    });
}

export function countBlockOutcomes(distributions) {
    return distributions.reduce((total, values) => total * values.length, 1);
}
