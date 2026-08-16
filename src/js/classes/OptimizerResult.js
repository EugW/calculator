const ARTIFACT_SLOT_ORDER = ['flower', 'plume', 'sands', 'goblet', 'circlet'];

export const DEFAULT_OPTIMIZER_RESULT_LIMIT = 20;

export function compareOptimizerResults(a, b) {
    const scoreOrder = b.value - a.value;
    if (scoreOrder) {
        return scoreOrder;
    }

    const aIndex = Number.isSafeInteger(a.combinationIndex)
        ? a.combinationIndex
        : Number.MAX_SAFE_INTEGER;
    const bIndex = Number.isSafeInteger(b.combinationIndex)
        ? b.combinationIndex
        : Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
}

export function finalizeOptimizerResults(results, limit) {
    const finalized = results.sort(compareOptimizerResults).slice(0, limit);
    for (const item of finalized) {
        delete item.combinationIndex;
    }
    return finalized;
}

/**
 * Convert the flat index inside a worker's contiguous split back to the flat
 * index of the unsplit Cartesian product.
 */
export function remapCombinationIndex(localIndex, localCounts, context) {
    if (!context || !context.splitSlot || !context.globalCounts) {
        return localIndex;
    }

    const localIndices = decodeCombinationIndex(localIndex, localCounts);
    localIndices[context.splitSlot] += Number(context.splitOffset) || 0;
    return encodeCombinationIndex(localIndices, context.globalCounts);
}

export function getArtifactCombinationCounts(slots) {
    return Object.fromEntries(
        ARTIFACT_SLOT_ORDER.map((slot) => [slot, slots[slot].length])
    );
}

function decodeCombinationIndex(index, counts) {
    const indices = {};
    let remainder = index;

    for (let i = 0; i < ARTIFACT_SLOT_ORDER.length; ++i) {
        const slot = ARTIFACT_SLOT_ORDER[i];
        const divisor = ARTIFACT_SLOT_ORDER.slice(i + 1).reduce((product, laterSlot) => {
            return product * counts[laterSlot];
        }, 1);
        indices[slot] = Math.floor(remainder / divisor);
        remainder %= divisor;
    }
    return indices;
}

function encodeCombinationIndex(indices, counts) {
    let result = 0;
    for (const slot of ARTIFACT_SLOT_ORDER) {
        result = result * counts[slot] + indices[slot];
    }
    return result;
}
