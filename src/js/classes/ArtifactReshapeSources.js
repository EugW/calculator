import { ACTION_SLOTS, getReshapeInputs, substatPairs } from './ArtifactActionProbability';

/** Two independent choices, with null meaning Auto. Keep their display order but
 * enumerate only unordered pairs containing every fixed stat. Crafted locks win.
 */
export function getArtifactReshapeSelection(artifact, requested) {
    const inputs = getReshapeInputs(artifact);
    const stats = artifact.getSubStats().map(sub => sub.stat);
    let selectedSubstats = Array.isArray(requested) && requested.length === 2
        ? requested.map(stat => stats.includes(stat) ? stat : null) : [null, null];
    // Invalid duplicate selections cannot define a pair; recover to Auto.
    if (selectedSubstats[0] && selectedSubstats[0] === selectedSubstats[1]) selectedSubstats = [null, null];
    if (inputs.lockedPair) selectedSubstats = [...inputs.lockedPair];
    const fixed = selectedSubstats.filter(Boolean);
    const pairs = inputs.lockedPair ? [inputs.lockedPair]
        : substatPairs(stats).filter(pair => fixed.every(stat => pair.includes(stat)));
    return {inputs, pairs, selectedSubstats, selectedPair: fixed.length === 2 ? pairs[0] : null};
}

/** Candidate IDs, not slots, identify independent selections. The old loadout-map
 * input remains supported; an explicit empty list must NOT restore equipped pieces.
 * Stale individual choices fall back to Auto; crafted provenance takes precedence.
 */
export function artifactReshapeSources(artifacts, selections = {}) {
    const targets = Array.isArray(artifacts) ? artifacts
        : ACTION_SLOTS.map(slot => ({id: slot, slot, artifact: artifacts[slot]}));
    const ids = new Set();
    return targets.map(target => {
        const {id, artifact} = target || {};
        const slot = artifact?.slot ?? target?.slot;
        if (typeof id !== 'string' || !id || ids.has(id) || !ACTION_SLOTS.includes(slot)) {
            throw new RangeError('action_invalid_targets');
        }
        ids.add(id);
        const requested = Object.prototype.hasOwnProperty.call(selections, id) ? selections[id] : target.selectedSubstats;
        try {
            if (target.error) throw new RangeError(target.error);
            return {id, slot, artifact, ...getArtifactReshapeSelection(artifact, requested)};
        } catch (error) {
            return {id, slot, artifact, error: error.message, pairs: [], selectedSubstats: [null, null], selectedPair: null};
        }
    });
}
