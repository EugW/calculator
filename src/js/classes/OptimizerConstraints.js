import { REAL_TOTAL } from "../db/Constants";
import { isPercent } from "./Stats";

export const MAX_GPU_STAT_CONSTRAINTS = 8;

/**
 * Parse artifact-optimizer stat bounds once, using the same strict rules for
 * every backend. Empty text means "unset"; numeric zero is a real bound.
 *
 * @param {Object} settings raw `settings.stats` object
 * @returns {Array.<Object>} normalized individual min/max bounds
 */
export function normalizeStatConstraintBounds(settings) {
    const result = [];
    const grouped = new Map();

    for (const [name, rawValue] of Object.entries(settings || {})) {
        const match = /^(.*)_(min|max)$/.exec(name);
        if (!match) {
            continue;
        }

        if (
            rawValue === null ||
            rawValue === undefined ||
            (typeof rawValue === 'string' && rawValue.trim() === '')
        ) {
            continue;
        }

        const stat = match[1];
        const op = match[2];
        if (!stat) {
            throw new RangeError(`Invalid optimizer stat constraint name "${name}"`);
        }

        let value = Number(rawValue);
        if (!Number.isFinite(value)) {
            throw new RangeError(`Optimizer stat constraint "${name}" must be finite`);
        }
        if (isPercent(stat)) {
            value /= 100;
        }

        const isRealTotal = REAL_TOTAL.includes(stat);
        const bound = {
            stat,
            op,
            value,
            isRealTotal,
            components: {
                base: stat +'_base',
                flat: stat,
                percent: isRealTotal ? stat +'_percent' : null,
            },
        };
        result.push(bound);

        if (!grouped.has(stat)) {
            grouped.set(stat, {});
        }
        grouped.get(stat)[op] = value;
    }

    if (grouped.size > MAX_GPU_STAT_CONSTRAINTS) {
        throw new RangeError(
            `Artifact optimizer supports at most ${MAX_GPU_STAT_CONSTRAINTS} constrained stats; got ${grouped.size}`
        );
    }

    for (const [stat, bounds] of grouped) {
        if (bounds.min !== undefined && bounds.max !== undefined && bounds.min > bounds.max) {
            throw new RangeError(`Optimizer stat constraint "${stat}" has min greater than max`);
        }
    }

    return result;
}

export function getStatConstraintTargetStats(bounds) {
    const result = new Set();

    for (const bound of bounds || []) {
        result.add(bound.components.base);
        result.add(bound.components.flat);
        if (bound.components.percent) {
            result.add(bound.components.percent);
        }
    }

    return [...result];
}

/**
 * Normalize the set-count constraints shared by the CPU generator and GPU
 * flags. The optimizer has five slots, so larger or fractional thresholds are
 * invalid input rather than silently different backend behavior.
 */
export function normalizeSetConstraintThresholds(minValues, maxValues) {
    return {
        minValues: normalizeSetConstraintMap(minValues, 'minimum', 0),
        maxValues: normalizeSetConstraintMap(maxValues, 'maximum', 1),
    };
}

function normalizeSetConstraintMap(values, label, minimum) {
    const result = {};

    for (const [setName, rawPieces] of Object.entries(values || {})) {
        if (
            rawPieces === null ||
            rawPieces === undefined ||
            (typeof rawPieces === 'string' && rawPieces.trim() === '')
        ) {
            continue;
        }

        const pieces = Number(rawPieces);
        if (!Number.isInteger(pieces) || pieces < minimum || pieces > 5) {
            throw new RangeError(
                `Optimizer set ${label} for "${setName}" must be an integer from ${minimum} to 5`
            );
        }

        // Requiring zero pieces is an explicit no-op. Drop it so both backends
        // agree that no set-min scan is necessary.
        if (label === 'minimum' && pieces === 0) {
            continue;
        }
        result[setName] = pieces;
    }

    return result;
}
