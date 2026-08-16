import {
    getStatConstraintTargetStats,
    normalizeSetConstraintThresholds,
    normalizeStatConstraintBounds,
} from "./OptimizerConstraints";
import { compareOptimizerResults } from "./OptimizerResult";

export const OPTIMIZATION_PLAN_SCHEMA_VERSION = 1;

export const OPTIMIZATION_OBJECTIVE_COMPONENT = Object.freeze({
    NORMAL: 'normal',
    CRIT: 'crit',
    AVERAGE: 'average',
});

const OBJECTIVE_INDEX = Object.freeze({
    [OPTIMIZATION_OBJECTIVE_COMPONENT.NORMAL]: 0,
    [OPTIMIZATION_OBJECTIVE_COMPONENT.CRIT]: 1,
    [OPTIMIZATION_OBJECTIVE_COMPONENT.AVERAGE]: 2,
});
const CANONICAL_CONSTRAINT_PLANS = new WeakSet();

const INVALIDITY_SEMANTICS = deepFreezePlainData({
    scoreDomain: 'finite-number',
    invalidScoreDisposition: 'discard',
    zeroIsValid: true,
    negativeIsValid: true,
});

// CPU and GPU intentionally keep their native arithmetic. CPU/f64 is the
// authoritative reference mode; GPU/f32 is the fast approximate mode. Each is
// deterministic under the shared tie key, but cross-backend equality is not a
// contract at exact feasibility boundaries or for near-tied scores.
const NUMERIC_POLICY = deepFreezePlainData({
    cpuArithmetic: 'f64',
    gpuArithmetic: 'f32',
    authority: 'cpu-f64',
    cpuMode: 'authoritative-reference',
    gpuMode: 'fast-approximate',
    feasibilityBoundary: 'backend-native',
    nearTieRanking: 'backend-native',
    crossBackendParity: 'not-guaranteed-at-boundaries-or-near-ties',
    determinism: 'within-backend',
    gpuF32CanProveF64Optimality: false,
    f64OptimalityProof: 'requires-f64-or-conservative-proof-safe-bounds',
});

const VARIATION_SELECTION = deepFreezePlainData({
    kind: 'set-threshold-selector',
    match: 'all-terms',
    termOperator: 'count-greater-than-or-equal',
    resolution: 'unique-most-specific',
    specificity: 'termwise-greater-than-or-equal',
});

const RESULT_ORDERING = deepFreezePlainData({
    cartesianSlotOrder: ['flower', 'plume', 'sands', 'goblet', 'circlet'],
    cartesianIndexOrder: 'last-slot-fastest',
    cartesianIndexDomain: 'nonnegative-safe-integer',
    keys: [
        {
            field: 'value',
            semantic: 'objective-score',
            direction: 'descending',
        },
        {
            field: 'combinationIndex',
            semantic: 'global-cartesian-index',
            direction: 'ascending',
            missing: 'last',
        },
    ],
});

/**
 * @typedef {Object} OptimizationPlanVariationInput
 * @property {string} id stable semantic variation identifier
 * @property {Object} objectiveAst shared prepared objective AST reference
 * @property {Array.<string>} objectiveUsedStats complete stat layout required by objectiveAst
 * @property {Array.<Object>} constraintPostEffects shared semantic post-effect AST node references
 * @property {Array.<string>} constraintUsedStats complete dependency closure for constraintPostEffects
 * @property {Array.<string>} constraintTargetStats final stats constrained after constraintPostEffects
 * @property {Array.<{setName: string, pieces: number}>} setInfo set state activating the variation
 */

/**
 * @typedef {Object} OptimizationPlanInput
 * @property {Object} [settings] raw optimizer settings; stat/set constraints are normalized here
 * @property {Object} [constraints] canonical result of createOptimizationPlanConstraints
 * @property {Array.<OptimizationPlanVariationInput>} variations
 * @property {'normal'|'crit'|'average'} objective
 * @property {string} [defaultVariationId='default']
 */

/**
 * Build the backend-neutral semantic plan consumed by CPU-JS and GPU-WGSL
 * lowerers. The plan owns frozen plain-data wrappers, while post-effect AST
 * nodes deliberately remain shared references owned by the feature compiler.
 *
 * @param {OptimizationPlanInput} input
 * @returns {Object} immutable optimization plan IR
 */
export function createOptimizationPlan(input) {
    assertPlainObject(input, 'Optimization plan input');
    if (input.settings !== undefined && input.constraints !== undefined) {
        throw new TypeError('Optimization plan accepts either raw settings or canonical constraints, not both');
    }
    const constraints = input.constraints === undefined
        ? createOptimizationPlanConstraints(input.settings)
        : requireCanonicalConstraintPlan(input.constraints);

    const objective = makeObjective(input.objective);
    const statConstraints = constraints.statConstraints;
    const setConstraints = constraints.setConstraints;
    const defaultVariationId = input.defaultVariationId === undefined
        ? 'default'
        : requireNonEmptyString(input.defaultVariationId, 'Default variation ID');
    const variations = makeVariations(
        input.variations,
        defaultVariationId,
        statConstraints.targetStats
    );

    return Object.freeze({
        kind: 'optimization-plan',
        schemaVersion: OPTIMIZATION_PLAN_SCHEMA_VERSION,
        objective,
        statConstraints,
        setConstraints,
        defaultVariationId,
        variations,
        invalidity: INVALIDITY_SEMANTICS,
        numericPolicy: NUMERIC_POLICY,
        variationSelection: VARIATION_SELECTION,
        ordering: RESULT_ORDERING,
    });
}

/**
 * Normalize optimizer feasibility inputs exactly once, before variation ASTs
 * are prepared. The resulting canonical fragment can be reused when rebinding
 * only the objective component over the same prepared variations.
 */
export function createOptimizationPlanConstraints(rawSettings) {
    const settings = rawSettings === undefined ? {} : rawSettings;
    assertPlainObject(settings, 'Optimization plan settings');

    const result = Object.freeze({
        kind: 'optimization-plan-constraints',
        statConstraints: makeStatConstraints(settings.stats),
        setConstraints: makeSetConstraints(
            settings.setMinValues,
            settings.setMaxValues
        ),
    });
    CANONICAL_CONSTRAINT_PLANS.add(result);
    return result;
}

/**
 * Shared score-validity predicate. Finite zero and negative scores are valid;
 * NaN and infinities represent invalid evaluations and must be discarded.
 */
export function isOptimizationScoreValid(score) {
    return typeof score === 'number' && Number.isFinite(score);
}

/**
 * Shared deterministic candidate ordering. This delegates to the production
 * result utility so the IR contract and worker merge cannot define rival tie
 * semantics.
 */
export function compareOptimizationPlanResults(left, right) {
    return compareOptimizerResults(left, right);
}

/**
 * Resolve a physical set-count state through the plan's threshold selectors.
 * This is the reference oracle shared by the CPU hot-loop lowering and the
 * GPU's finite lookup-table lowering. Missing sets have count zero. Invalid or
 * ambiguous states fail closed instead of silently selecting the default.
 *
 * @param {Object} plan canonical optimization plan
 * @param {Object|Map} setCounts map of set name to physical artifact count
 * @returns {Object|undefined} canonical variation wrapper
 */
export function resolveOptimizationPlanVariation(plan, setCounts) {
    if (!plan || plan.kind !== 'optimization-plan' || !Array.isArray(plan.variations)) {
        throw new TypeError('A canonical optimization plan is required');
    }
    if (
        setCounts === null ||
        typeof setCounts !== 'object' ||
        (!isPlainObject(setCounts) && !(setCounts instanceof Map))
    ) {
        throw new TypeError('Optimization set counts must be a plain object or Map');
    }

    const entries = setCounts instanceof Map ? setCounts.entries() : Object.entries(setCounts);
    let totalPieces = 0;
    for (const [setName, count] of entries) {
        if (typeof setName !== 'string' || !Number.isInteger(count) || count < 0 || count > 5) {
            return undefined;
        }
        totalPieces += count;
        if (totalPieces > 5) return undefined;
    }

    const getCount = setCounts instanceof Map
        ? (setName) => setCounts.get(setName) || 0
        : (setName) => setCounts[setName] || 0;
    const matches = plan.variations.filter((variation) => {
        return variation.selector.terms.every((term) => {
            return getCount(term.setName) >= term.minimumInclusive;
        });
    });
    const mostSpecific = matches.filter((candidate) => {
        return !matches.some((other) => {
            return other !== candidate &&
                selectorDominates(other.selector.terms, candidate.selector.terms);
        });
    });

    return mostSpecific.length === 1 ? mostSpecific[0] : undefined;
}

function makeObjective(component) {
    const normalized = component === undefined
        ? OPTIMIZATION_OBJECTIVE_COMPONENT.AVERAGE
        : component;

    if (!Object.prototype.hasOwnProperty.call(OBJECTIVE_INDEX, normalized)) {
        throw new RangeError(
            `Optimization objective must be "normal", "crit", or "average"; got ${JSON.stringify(normalized)}`
        );
    }

    return Object.freeze({
        component: normalized,
        vectorIndex: OBJECTIVE_INDEX[normalized],
    });
}

function requireCanonicalConstraintPlan(value) {
    if (!CANONICAL_CONSTRAINT_PLANS.has(value)) {
        throw new TypeError(
            'Optimization plan constraints must come from createOptimizationPlanConstraints()'
        );
    }
    return value;
}

function makeStatConstraints(rawStats) {
    const normalized = normalizeStatConstraintBounds(rawStats);
    const bounds = normalized
        .map((bound) => {
            return Object.freeze({
                stat: bound.stat,
                op: bound.op,
                value: bound.value,
                isRealTotal: bound.isRealTotal,
                components: Object.freeze(Object.assign({}, bound.components)),
            });
        })
        .sort(compareStatBounds);
    const targetStats = freezeStringSet(
        getStatConstraintTargetStats(bounds),
        'Stat constraint target stats'
    );
    const predicatesByStat = new Map();
    for (const bound of bounds) {
        if (!predicatesByStat.has(bound.stat)) {
            predicatesByStat.set(bound.stat, {
                stat: bound.stat,
                minimumInclusive: null,
                maximumInclusive: null,
                isRealTotal: bound.isRealTotal,
                components: bound.components,
            });
        }
        const predicate = predicatesByStat.get(bound.stat);
        if (bound.op === 'min') {
            predicate.minimumInclusive = bound.value;
        } else {
            predicate.maximumInclusive = bound.value;
        }
    }
    const predicates = [...predicatesByStat.values()].map((predicate) => {
        return Object.freeze({
            kind: 'stat-range-predicate',
            stat: predicate.stat,
            minimumInclusive: predicate.minimumInclusive,
            maximumInclusive: predicate.maximumInclusive,
            expression: Object.freeze({
                kind: 'stat-total-expression',
                isRealTotal: predicate.isRealTotal,
                components: predicate.components,
            }),
        });
    });

    return Object.freeze({
        bounds: Object.freeze(bounds),
        targetStats,
        predicates: Object.freeze(predicates),
    });
}

function makeSetConstraints(rawMinimum, rawMaximum) {
    const normalized = normalizeSetConstraintThresholds(rawMinimum, rawMaximum);
    const minValues = freezeSortedNumericMap(normalized.minValues, 'minimum');
    const maxValues = freezeSortedNumericMap(normalized.maxValues, 'maximum');

    for (const setName of Object.keys(minValues)) {
        if (
            Object.prototype.hasOwnProperty.call(maxValues, setName) &&
            minValues[setName] >= maxValues[setName]
        ) {
            throw new RangeError(
                `Optimizer set constraints for "${setName}" are unsatisfiable: ` +
                `minimum ${minValues[setName]} requires count >= ${minValues[setName]}, ` +
                `while maximum ${maxValues[setName]} requires count < ${maxValues[setName]}`
            );
        }
    }

    const setNames = [...new Set([
        ...Object.keys(minValues),
        ...Object.keys(maxValues),
    ])].sort(compareStrings);
    const predicates = setNames.map((setName) => {
        return Object.freeze({
            kind: 'set-count-range-predicate',
            setName,
            minimumInclusive: Object.prototype.hasOwnProperty.call(minValues, setName)
                ? minValues[setName]
                : null,
            maximumExclusive: Object.prototype.hasOwnProperty.call(maxValues, setName)
                ? maxValues[setName]
                : null,
        });
    });

    return Object.freeze({
        minValues,
        maxValues,
        predicates: Object.freeze(predicates),
    });
}

function makeVariations(rawVariations, defaultVariationId, requiredTargetStats) {
    if (!Array.isArray(rawVariations) || rawVariations.length === 0) {
        throw new TypeError('Optimization plan variations must be a non-empty array');
    }

    const ids = new Set();
    const variations = rawVariations.map((variation, inputIndex) => {
        assertPlainObject(variation, `Optimization variation at index ${inputIndex}`);
        const id = requireNonEmptyString(
            variation.id,
            `Optimization variation ID at index ${inputIndex}`
        );
        if (ids.has(id)) {
            throw new RangeError(`Duplicate optimization variation ID "${id}"`);
        }
        ids.add(id);

        requireAstObject(variation.objectiveAst, `Optimization variation "${id}" objectiveAst`);
        const objectiveUsedStats = freezeStringSet(
            variation.objectiveUsedStats,
            `Optimization variation "${id}" objectiveUsedStats`
        );
        const constraintPostEffects = freezeAstReferenceArray(
            variation.constraintPostEffects,
            `Optimization variation "${id}" constraintPostEffects`
        );

        const constraintTargetStats = freezeStringSet(
            variation.constraintTargetStats,
            `Optimization variation "${id}" constraintTargetStats`
        );
        const targetSet = new Set(constraintTargetStats);
        for (const requiredStat of requiredTargetStats) {
            if (!targetSet.has(requiredStat)) {
                throw new RangeError(
                    `Optimization variation "${id}" constraintTargetStats is missing constrained stat component "${requiredStat}"`
                );
            }
        }

        const constraintUsedStats = freezeStringSet(
            variation.constraintUsedStats,
            `Optimization variation "${id}" constraintUsedStats`
        );
        const usedSet = new Set(constraintUsedStats);
        for (const targetStat of constraintTargetStats) {
            if (!usedSet.has(targetStat)) {
                throw new RangeError(
                    `Optimization variation "${id}" constraintUsedStats is missing target stat "${targetStat}"`
                );
            }
        }

        return {
            id,
            inputIndex,
            objectiveAst: variation.objectiveAst,
            objectiveUsedStats,
            constraintPostEffects,
            constraintUsedStats,
            constraintTargetStats,
            selector: makeVariationSelector(variation.setInfo, id),
        };
    });

    if (!ids.has(defaultVariationId)) {
        throw new RangeError(
            `Default optimization variation "${defaultVariationId}" is not present`
        );
    }

    validateVariationSelectors(variations, defaultVariationId);

    variations.sort((left, right) => {
        if (left.id === defaultVariationId) return -1;
        if (right.id === defaultVariationId) return 1;
        return compareStrings(left.id, right.id);
    });

    return Object.freeze(variations.map((variation, index) => {
        return Object.freeze({
            id: variation.id,
            index,
            objectiveAst: variation.objectiveAst,
            objectiveUsedStats: variation.objectiveUsedStats,
            constraintPostEffects: variation.constraintPostEffects,
            constraintUsedStats: variation.constraintUsedStats,
            constraintTargetStats: variation.constraintTargetStats,
            selector: variation.selector,
        });
    }));
}

function makeVariationSelector(rawSetInfo, variationId) {
    if (!Array.isArray(rawSetInfo)) {
        throw new TypeError(`Optimization variation "${variationId}" setInfo must be an array`);
    }

    const seen = new Set();
    const terms = rawSetInfo.map((item, index) => {
        assertPlainObject(
            item,
            `Optimization variation "${variationId}" setInfo at index ${index}`
        );
        const setName = requireNonEmptyString(
            item.setName,
            `Optimization variation "${variationId}" setInfo name at index ${index}`
        );
        if (seen.has(setName)) {
            throw new RangeError(
                `Optimization variation "${variationId}" contains duplicate setInfo for "${setName}"`
            );
        }
        seen.add(setName);

        if (!Number.isInteger(item.pieces) || item.pieces < 1 || item.pieces > 5) {
            throw new RangeError(
                `Optimization variation "${variationId}" setInfo pieces for "${setName}" must be an integer from 1 to 5`
            );
        }
        return Object.freeze({
            kind: 'set-piece-threshold',
            setName,
            minimumInclusive: item.pieces,
        });
    });

    terms.sort((left, right) => {
        return compareStrings(left.setName, right.setName) ||
            left.minimumInclusive - right.minimumInclusive;
    });
    return Object.freeze({
        kind: 'all-set-piece-thresholds',
        terms: Object.freeze(terms),
    });
}

function validateVariationSelectors(variations, defaultVariationId) {
    const selectorsByKey = new Map();

    for (const variation of variations) {
        const terms = variation.selector.terms;
        if (variation.id === defaultVariationId && terms.length !== 0) {
            throw new RangeError(`Default optimization variation "${variation.id}" selector must be empty`);
        }
        if (variation.id !== defaultVariationId && terms.length === 0) {
            throw new RangeError(`Non-default optimization variation "${variation.id}" selector must not be empty`);
        }

        const minimumPieces = terms.reduce((sum, term) => sum + term.minimumInclusive, 0);
        if (minimumPieces > 5) {
            throw new RangeError(
                `Optimization variation "${variation.id}" selector requires ${minimumPieces} artifact pieces; at most 5 are representable`
            );
        }

        const key = selectorKey(terms);
        if (selectorsByKey.has(key)) {
            throw new RangeError(
                `Optimization variations "${selectorsByKey.get(key).id}" and "${variation.id}" have duplicate set selectors`
            );
        }
        selectorsByKey.set(key, variation);
    }

    // Every physically representable intersection of two incomparable
    // selectors needs its least-upper-bound selector. It then wins by the
    // shared unique-most-specific rule, independently of backend map order.
    const nonDefault = variations.filter((variation) => variation.id !== defaultVariationId);
    for (let i = 0; i < nonDefault.length; ++i) {
        for (let j = i + 1; j < nonDefault.length; ++j) {
            const left = nonDefault[i];
            const right = nonDefault[j];
            if (
                selectorDominates(left.selector.terms, right.selector.terms) ||
                selectorDominates(right.selector.terms, left.selector.terms)
            ) {
                continue;
            }

            const union = mergeSelectorTerms(left.selector.terms, right.selector.terms);
            const minimumPieces = union.reduce((sum, term) => sum + term.minimumInclusive, 0);
            if (minimumPieces <= 5 && !selectorsByKey.has(selectorKey(union))) {
                throw new RangeError(
                    `Optimization variation selectors "${left.id}" and "${right.id}" overlap without a unique most-specific variation`
                );
            }
        }
    }
}

function selectorDominates(left, right) {
    const leftBySet = new Map(left.map((term) => [term.setName, term.minimumInclusive]));
    return right.every((term) => {
        return (leftBySet.get(term.setName) || 0) >= term.minimumInclusive;
    });
}

function mergeSelectorTerms(left, right) {
    const thresholds = new Map();
    for (const term of [...left, ...right]) {
        thresholds.set(
            term.setName,
            Math.max(thresholds.get(term.setName) || 0, term.minimumInclusive)
        );
    }
    return [...thresholds].sort((a, b) => compareStrings(a[0], b[0])).map(([setName, value]) => {
        return {setName, minimumInclusive: value};
    });
}

function selectorKey(terms) {
    return terms.map((term) => `${term.setName.length}:${term.setName}:${term.minimumInclusive}`).join('|');
}

function freezeStringSet(rawValues, label) {
    if (!Array.isArray(rawValues)) {
        throw new TypeError(`${label} must be an array`);
    }

    const seen = new Set();
    const result = rawValues.map((value, index) => {
        const normalized = requireNonEmptyString(value, `${label} item ${index}`);
        if (seen.has(normalized)) {
            throw new RangeError(`${label} contains duplicate "${normalized}"`);
        }
        seen.add(normalized);
        return normalized;
    });
    result.sort(compareStrings);
    return Object.freeze(result);
}

function freezeAstReferenceArray(rawValues, label) {
    if (!Array.isArray(rawValues)) {
        throw new TypeError(`${label} must be an array`);
    }
    rawValues.forEach((value, index) => {
        requireAstObject(value, `${label} item ${index}`);
    });
    return Object.freeze(rawValues.slice());
}

function requireAstObject(value, label) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new TypeError(`${label} must be an AST object`);
    }
    return value;
}

function freezeSortedNumericMap(values, label) {
    const result = {};
    for (const setName of Object.keys(values).sort(compareStrings)) {
        requireNonEmptyString(setName, `Optimizer set ${label} name`);
        result[setName] = values[setName];
    }
    return Object.freeze(result);
}

function compareStatBounds(left, right) {
    return compareStrings(left.stat, right.stat) ||
        (left.op === right.op ? 0 : left.op === 'min' ? -1 : 1);
}

function compareStrings(left, right) {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
}

function requireNonEmptyString(value, label) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new TypeError(`${label} must be a non-empty string`);
    }
    return value;
}

function assertPlainObject(value, label) {
    if (!isPlainObject(value)) {
        throw new TypeError(`${label} must be a plain object`);
    }
}

function isPlainObject(value) {
    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function deepFreezePlainData(value) {
    if (Array.isArray(value)) {
        for (const item of value) deepFreezePlainData(item);
    } else if (value && typeof value === 'object') {
        for (const item of Object.values(value)) deepFreezePlainData(item);
    }
    return Object.freeze(value);
}
