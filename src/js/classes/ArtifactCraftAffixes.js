import { SUBSTAT_WEIGHTS } from './ArtifactActionProbability';

const minorStats = Object.keys(SUBSTAT_WEIGHTS);
const allows = (choices, stat, isStatUseful) => choices.length === 0
    ? (!isStatUseful || isStatUseful(stat))
    : choices.includes(stat);

function normalizeChoices(value, allowed) {
    if (value === undefined || value === null || value === '') return [];
    const values = typeof value === 'string' ? [value] : value;
    if (!Array.isArray(values) || values.some(stat => !allowed.includes(stat))) throw new Error('action_invalid_affixes');
    return [...new Set(values)];
}

/** Each selector is an OR-list; empty means Auto. The two substat lines are distinct
 * and unordered, so either assignment to the chosen pair is valid (counted once).
 * When provided, `isStatUseful` restricts Auto choices to stats the current
 * calculation reads; explicit choices are always honored.
 */
export function artifactCraftRecipeMatches(selection, mainStat, pair, isStatUseful = null) {
    if (!allows(selection.mainStat, mainStat, isStatUseful) || pair[0] === pair[1] || pair.includes(mainStat)) return false;
    const [a, b] = selection.substats;
    return (allows(a, pair[0], isStatUseful) && allows(b, pair[1], isStatUseful))
        || (allows(a, pair[1], isStatUseful) && allows(b, pair[0], isStatUseful));
}

function hasRecipe(mains, selection) {
    return mains.some(main => minorStats.some((a, index) => minorStats.slice(index + 1)
        .some(b => artifactCraftRecipeMatches(selection, main, [a, b]))));
}

/** Legacy scalar main/substats remain accepted; canonical values are arrays. */
export function getArtifactCraftAffixes(slot, selection = {}) {
    const mains = DB.Artifacts.Slots.get(slot)?.mainStats;
    const subs = selection?.substats ?? [];
    if (!mains || !Array.isArray(subs) || subs.length > 2) throw new Error('action_invalid_affixes');
    const mainStat = normalizeChoices(selection?.mainStat, mains);
    const result = {mainStat: mains.length === 1 ? [mains[0]] : mainStat,
        substats: [normalizeChoices(subs[0], minorStats), normalizeChoices(subs[1], minorStats)]};
    if (!hasRecipe(mains, result)) throw new Error('action_invalid_affixes');
    return result;
}

export function artifactCraftAffixOptions(slot, selection, field) {
    if (!['mainStat', 0, 1].includes(field)) throw new Error('action_invalid_affixes');
    const current = getArtifactCraftAffixes(slot, selection);
    const mains = DB.Artifacts.Slots.get(slot).mainStats;
    if (field === 'mainStat') return mains;
    return minorStats.filter(stat => {
        // Keep checked choices visible even if another selector temporarily makes
        // that branch impossible. Expanding the other range can make it valid again.
        if (current.substats[field].includes(stat)) return true;
        const substats = current.substats.map((choices, index) => index === field ? [stat] : choices);
        return hasRecipe(mains, {...current, substats});
    });
}

/** Preserve valid overlapping ranges; only a newly fixed main removes conflicts. */
export function changeArtifactCraftAffix(slot, selection, field, value) {
    const next = getArtifactCraftAffixes(slot, selection);
    const options = artifactCraftAffixOptions(slot, next, field);
    const choices = normalizeChoices(value, options);
    if (field === 'mainStat') {
        next.mainStat = choices;
        const mains = DB.Artifacts.Slots.get(slot).mainStats;
        const actualMains = choices.length ? choices : mains;
        next.substats = next.substats.map(stats => stats.filter(stat => actualMains.some(main => main !== stat)));
        // Both minor selectors can collapse to the same sole stat after a main
        // change. Preserve the first line and reset the conflicting second to Auto.
        if (!hasRecipe(mains, next)) next.substats[1] = [];
    } else {
        next.substats[field] = choices;
    }
    return getArtifactCraftAffixes(slot, next);
}
