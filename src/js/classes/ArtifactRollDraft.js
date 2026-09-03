import { initialTierMatches } from './ArtifactMetadata';
import { Stats } from './Stats';
import { substatCheck } from './SubstatCheck';

const constrainedRolls = new Map();

// Selector identity follows a game-displayed tier, not the precision of an
// imported number. Exact and rounded representations select the same option.
export function artifactInitialRollOptions(stat, rarity, initial) {
    const data = DB.Artifacts.Substats.get(stat);
    const scale = data.type === 'percent' ? 10 : 1;
    const groups = new Map();
    for (const tier of data.rolls[rarity - 1]) {
        const displayed = Number(Stats.roundStatValue(stat, tier));
        if (!groups.has(displayed)) groups.set(displayed, []);
        groups.get(displayed).push(tier);
    }
    return [...groups].map(([displayed, tiers]) => ({
        // At low rarities multiple precise tiers can display identically.
        // Selecting that displayed value must retain the ambiguity.
        value: tiers.length === 1 ? tiers[0] : displayed,
        label: Stats.format(stat, displayed),
        selected: initial != null && tiers.some(tier => initialTierMatches(tier, initial, scale)),
    }));
}

// Every displayed total, optionally constrained by a known first roll, with the fewest-roll
// breakdown and every roll count (first roll included) that shows that total.
function constrainedCandidates(stat, rarity, initial) {
    const key = [stat, rarity, initial].join('/');
    let candidates = constrainedRolls.get(key);
    if (!candidates) {
        const data = DB.Artifacts.Substats.get(stat);
        const tiers = data.rolls[rarity - 1];
        const maximum = DB.Artifacts.Rarity[rarity - 1].maxUpgrades;
        const scale = data.type === 'percent' ? 10 : 1;
        const exact = tiers.filter(tier => Math.abs(tier - initial) < 0.00001);
        const bases = initial == null ? tiers : exact.length ? exact : tiers.filter(tier => initialTierMatches(tier, initial, scale));
        const totals = new Map();
        const collect = (rolls, from = 0) => {
            const total = Number(Stats.roundStatValue(stat, rolls.reduce((sum, tier) => sum + tier, 0)));
            const previous = totals.get(total);
            if (!previous) totals.set(total, {rolls, counts: new Set([rolls.length])});
            else {
                previous.counts.add(rolls.length);
                if (rolls.length < previous.rolls.length) previous.rolls = rolls;
            }
            if (rolls.length >= maximum) return;
            for (let index = from; index < tiers.length; ++index) collect([...rolls, tiers[index]], index);
        };
        for (const base of bases) collect([base]);
        candidates = [...totals].map(([total, {rolls, counts}]) => ({total, rolls, counts: [...counts].sort((a, b) => a - b)}))
            .sort((a, b) => a.total - b.total);
        constrainedRolls.set(key, candidates);
    }
    return candidates;
}

/** Sorted possible displayed totals and a representative roll breakdown for sliders.
 * Sum raw tiers before display rounding; rounded pill values must never be summed.
 */
export function artifactRollTotalOptions(stat, rarity) {
    const tiers = DB.Artifacts.Substats.get(stat).rolls[rarity - 1];
    return constrainedCandidates(stat, rarity).map(candidate => ({
        total: candidate.total,
        steps: candidate.rolls.map(tier => ({value: Stats.roundStatValue(stat, tier), rarity: tiers.indexOf(tier) + 2})),
    }));
}

// Roll counts that can show `value` on a line whose first roll is known. More
// than one means the displayed total cannot tell them apart.
export function artifactRollCounts(stat, rarity, value, initial) {
    const match = constrainedCandidates(stat, rarity, initial).find(candidate => Math.abs(candidate.total - value) < 0.00001);
    return match ? match.counts : [];
}

// Editor-only decomposition. A known first roll is a constraint, not another
// independent estimate. Enumerate raw sums before rounding the displayed total.
export function artifactRollDraft(stat, rarity, value, initial) {
    value = Number(value);
    if (initial == null) {
        const result = substatCheck(stat, rarity, value);
        return {...result, last: Number(result.last), total: value,
            // A single roll is known from its total. A multi-roll breakdown
            // does not establish which roll actually came first.
            initialValue: Number(result.last) === 0 && result.steps.length === 1 ? value : undefined};
    }

    const tiers = DB.Artifacts.Substats.get(stat).rolls[rarity - 1];
    const candidates = constrainedCandidates(stat, rarity, initial);
    const best = candidates.reduce((best, candidate) => !best ||
        Math.abs(candidate.total - value) < Math.abs(best.total - value) - 0.00001 ? candidate : best, null);
    if (!best) return {steps: [], last: value, total: value, initialValue: initial, invalid: true};
    return {
        steps: best.rolls.map(tier => ({value: Stats.roundStatValue(stat, tier), rarity: tiers.indexOf(tier) + 2})),
        total: best.total,
        totals: candidates.map(candidate => candidate.total),
        last: Number(Stats.roundStatValue(stat, value - best.total)),
        initialValue: initial,
    };
}
