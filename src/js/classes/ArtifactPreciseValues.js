import { artifactRollSums } from './ArtifactActionProbability';
import { artifactRollTotals, artifactRollsFromIds, initialTierMatches, shownRollUnits } from './ArtifactMetadata';

const lineCandidates = new Map();

// The game computes stats from each line's exact roll total; the stored value is
// only what it displays. Each active line takes the first that applies:
// 1. its roll IDs (appendPropIdList): their exact total;
// 2. its first roll, with the artifact's roll count: the only total they allow, or
//    when several fit, their probability-weighted mean (every roll value equally
//    likely, as in upgrade predictions);
// 3. the displayed-value table (DbObjectSubstat#getPreciseValue).
// An upgrade variant keeps the value of every line its upgrades did not change.
// Returns values aligned with artifact.getSubStats().
export function artifactPreciseSubstatValues(artifact) {
    const subs = artifact.getSubStats();
    const rarity = artifact.getRarity();
    const metadata = artifact.getMetadata();
    const units = subs.map(() => undefined);
    const counts = subs.map(() => undefined);

    const rolls = artifactRollsFromIds(metadata.appendPropIdList, rarity);
    const totals = rolls && artifactRollTotals(artifact, rolls);
    if (totals) {
        subs.forEach(({stat}, i) => {
            units[i] = totals[stat];
            counts[i] = rolls.filter(roll => roll.stat === stat).length;
        });
    }

    if (metadata.totalRolls !== undefined && units.includes(undefined)) {
        const maxCount = Math.min(6, 1 + Math.floor(artifact.getLevel() / 4));
        const options = subs.map((sub, i) => units[i] !== undefined
            ? new Map([[counts[i], {mass: 1, totals: new Map([[units[i], 1]])}]])
            : candidateTotals(sub.stat, sub.value, rarity, metadata.initialValues?.[sub.stat], maxCount));
        // Each count split that adds up to totalRolls weighs a line's totals by how
        // likely the other lines' values are under their counts.
        const pooled = subs.map(() => new Map());
        const visit = (at, left, chosen) => {
            if (at === subs.length) {
                if (left) return;
                const weight = chosen.reduce((product, count, i) => product * options[i].get(count).mass, 1);
                chosen.forEach((count, i) => {
                    const {mass, totals} = options[i].get(count);
                    for (const [total, p] of totals) pooled[i].set(total, (pooled[i].get(total) || 0) + weight / mass * p);
                });
                return;
            }
            for (const count of options[at].keys()) {
                if (count <= left) visit(at + 1, left - count, [...chosen, count]);
            }
        };
        visit(0, metadata.totalRolls, []);
        subs.forEach(({stat}, i) => {
            if (units[i] !== undefined || metadata.initialValues?.[stat] === undefined || !pooled[i].size) return;
            if (pooled[i].size === 1) {
                units[i] = [...pooled[i].keys()][0];
                return;
            }
            let sum = 0, mass = 0;
            for (const [total, p] of pooled[i]) {
                sum += total * p;
                mass += p;
            }
            units[i] = sum / mass;
        });
    }

    return subs.map((sub, i) => {
        const inherited = artifact.basePreciseValues?.get(sub.stat);
        if (inherited && inherited.value === sub.value) return inherited.precise;
        return units[i] !== undefined ? units[i] / 100
            : DB.Artifacts.Substats.get(sub.stat).getPreciseValue(sub.value, rarity);
    });
}

// count -> {totals: exact total (hundredths) -> probability, mass: their sum} for the
// totals that show as `value`, starting with `initial` when it is known. Every roll
// value is equally likely.
function candidateTotals(stat, value, rarity, initial, maxCount) {
    const key = [stat, rarity, value, initial, maxCount].join('/');
    let result = lineCandidates.get(key);
    if (result) return result;
    const data = DB.Artifacts.Substats.get(stat);
    const scale = data.type === 'percent' ? 10 : 1;
    const firsts = initial === undefined ? null
        : data.rolls[rarity - 1].filter(roll => initialTierMatches(roll, initial, scale)).map(roll => Math.round(roll * 100));
    result = new Map();
    for (let count = 1; count <= maxCount; ++count) {
        const totals = new Map();
        let mass = 0;
        const add = (total, p) => {
            if (Math.abs(shownRollUnits(stat, total) - value) >= 0.00001) return;
            totals.set(total, (totals.get(total) || 0) + p);
            mass += p;
        };
        if (firsts) {
            for (const first of firsts) {
                for (const {units, probability} of artifactRollSums(stat, count - 1, rarity)) add(first + units, probability / firsts.length);
            }
        } else {
            for (const {units, probability} of artifactRollSums(stat, count, rarity)) add(units, probability);
        }
        if (totals.size) result.set(count, {mass, totals});
    }
    lineCandidates.set(key, result);
    return result;
}
