import { CBlock } from "./Feature2/Compile/Types";
import {
    CIsolatedBlock,
    CStatIncrease,
    CVar,
} from "./Feature2/Compile/Types/Block";
import { CVarValue } from "./Feature2/Compile/Types/Item";
import { Stats } from "./Stats";
import { resolveOptimizationPlanVariation } from "./OptimizationPlan";

const hasOwn = Function.call.bind(Object.prototype.hasOwnProperty);

/**
 * Lower the semantic OptimizationPlan into functions specialized for the CPU
 * artifact enumeration loop. The returned lowerer is deliberately stateful:
 * every variation owns one reusable constraint scratch Stats instance. CPU
 * optimizer workers are single-threaded, so this avoids allocating or
 * mutating a candidate Stats object in the hot loop.
 *
 * @param {Object} plan backend-neutral OptimizationPlan
 * @returns {OptimizationPlanCPU}
 */
export function lowerOptimizationPlanCPU(plan) {
    return new OptimizationPlanCPU(plan);
}

// Public name used by optimizer preparation; keep the "lower" spelling as a
// precise alias for callers discussing backend lowering explicitly.
export const compileOptimizationPlanCPU = lowerOptimizationPlanCPU;

export class OptimizationPlanCPU {
    constructor(plan) {
        validatePlanShape(plan);

        this.plan = plan;
        this._rejectsSetPrefix = compileSetRejection(plan.setConstraints.predicates, false);
        this._rejectsCompleteSets = compileSetRejection(plan.setConstraints.predicates, true);
        this._resolveVariationId = compileVariationResolver(plan.variations);
        this._variationById = Object.create(null);
        this.variations = Object.freeze(plan.variations.map((variation) => {
            const lowered = lowerVariation(plan, variation);
            this._variationById[variation.id] = lowered;
            return lowered;
        }));
        this.variationsById = Object.freeze(this._variationById);
    }

    /**
     * Return true when a partial set-count prefix can no longer become
     * feasible. Only maximum-exclusive predicates can reject a prefix.
     */
    rejectsSetPrefix(setCounts) {
        return !isValidSetState(setCounts) || this._rejectsSetPrefix(setCounts);
    }

    /** Return true when a complete set-count state violates any set bound. */
    rejectsCompleteSets(setCounts) {
        return !isValidSetState(setCounts) || this._rejectsCompleteSets(setCounts);
    }

    /** Trusted hot-loop forms; artifact enumeration constructs valid states. */
    rejectsSetPrefixTrusted(setCounts) {
        return this._rejectsSetPrefix(setCounts);
    }

    rejectsCompleteSetsTrusted(setCounts) {
        return this._rejectsCompleteSets(setCounts);
    }

    /**
     * Resolve a physical set state by the plan's unique-most-specific rule.
     * Invalid or ambiguous external states fail closed with undefined.
     */
    resolveVariationId(setCounts) {
        if (!isValidSetState(setCounts)) return undefined;
        return resolveOptimizationPlanVariation(this.plan, setCounts)?.id;
    }

    /** Specialized allocation-free selector lowering for trusted hot-loop states. */
    resolveVariationIdTrusted(setCounts) {
        return this._resolveVariationId(setCounts);
    }

    getVariation(variationId) {
        return typeof variationId === 'string'
            ? this._variationById[variationId]
            : undefined;
    }

    checkStats(variationId, stats) {
        const variation = this.getVariation(variationId);
        return variation ? variation.checkStats(stats) : false;
    }

    evaluateScore(variationId, stats) {
        const variation = this.getVariation(variationId);
        return variation ? variation.evaluateScore(stats) : undefined;
    }

    /** Check feasibility and return a finite objective, or undefined. */
    evaluate(variationId, stats) {
        const variation = this.getVariation(variationId);
        return variation ? variation.evaluate(stats) : undefined;
    }
}

function lowerVariation(plan, variation) {
    const objective = compileObjective(variation.objectiveAst, plan.objective.vectorIndex, variation.id);
    const checkStats = compileStatFeasibility(plan.statConstraints.predicates, variation);

    const evaluateScore = (stats) => {
        if (!isStatsObject(stats)) return undefined;
        const score = objective(stats);
        return Number.isFinite(score) ? score : undefined;
    };
    const evaluate = (stats) => {
        if (!checkStats(stats)) return undefined;
        return evaluateScore(stats);
    };

    return Object.freeze({
        id: variation.id,
        index: variation.index,
        checkStats,
        evaluateScore,
        evaluate,
    });
}

function compileObjective(objectiveAst, vectorIndex, variationId) {
    if (!objectiveAst || typeof objectiveAst.compile !== 'function') {
        throw new TypeError(
            `Optimization variation "${variationId}" objectiveAst must provide compile()`
        );
    }

    const code = objectiveAst.compile();
    if (typeof code !== 'string') {
        throw new TypeError(
            `Optimization variation "${variationId}" objectiveAst.compile() must return JavaScript source`
        );
    }
    const evaluateVector = Function('stats', `"use strict";\n${code}`);

    return (stats) => {
        const vector = evaluateVector(stats);
        return vector == null ? undefined : vector[vectorIndex];
    };
}

function compileStatFeasibility(predicates, variation) {
    if (predicates.length === 0) return isStatsObject;

    const scratch = new Stats();
    const copyToScratch = compileStatsCopy(variation.constraintUsedStats);
    const applyPostEffects = compileConstraintPostEffects(
        variation.constraintPostEffects,
        variation.id
    );
    const checkPredicates = compileStatPredicates(predicates);

    return (stats) => {
        if (!isStatsObject(stats)) return false;
        copyToScratch(stats, scratch);
        applyPostEffects(scratch);
        return checkPredicates(scratch);
    };
}

function compileStatsCopy(statNames) {
    const parts = statNames.map((stat) => {
        const name = JSON.stringify(stat);
        return `target[${name}] = source[${name}]`;
    });
    return Function('source', 'target', `"use strict";\n${parts.join(';\n')}`);
}

function compileConstraintPostEffects(postEffects, variationId) {
    if (postEffects.length === 0) return () => {};

    const byPriority = new Map();
    for (let i = 0; i < postEffects.length; ++i) {
        const postEffect = postEffects[i];
        const priority = Number(postEffect.priority);
        if (!Number.isFinite(priority)) {
            throw new RangeError(
                `Optimization variation "${variationId}" constraint post effect ${i} has a non-numeric priority`
            );
        }
        if (typeof postEffect.stat !== 'string' || postEffect.stat === '') {
            throw new TypeError(
                `Optimization variation "${variationId}" constraint post effect ${i} has no target stat`
            );
        }
        if (!byPriority.has(priority)) byPriority.set(priority, []);
        byPriority.get(priority).push(postEffect);
    }

    const assignments = [];
    const priorities = [...byPriority.keys()].sort((left, right) => left - right);
    for (const priority of priorities) {
        const variables = [];
        const increases = [];
        for (const postEffect of byPriority.get(priority)) {
            const variable = new CVar([postEffect], {name: 'constraint_post_' + postEffect.stat});
            variables.push(variable);
            increases.push(new CStatIncrease(
                [new CVarValue({ref: variable})],
                {stat: postEffect.stat}
            ));
        }
        assignments.push(new CIsolatedBlock([...variables, ...increases]));
    }

    // Compile fresh wrapper nodes only. The shared post-effect AST references
    // are traversed read-only; FeatureCompiler.prepare/process is intentionally
    // not called because it mutates trees in place.
    const code = new CBlock(assignments, {noReturn: true}).compile();
    return Function('stats', `"use strict";\n${code}`);
}

function compileStatPredicates(predicates) {
    const parts = [];
    for (let i = 0; i < predicates.length; ++i) {
        const predicate = predicates[i];
        const components = predicate.expression.components;
        const base = `stats[${JSON.stringify(components.base)}]`;
        const flat = `stats[${JSON.stringify(components.flat)}]`;
        const total = predicate.expression.isRealTotal
            ? `${base} * (1 + stats[${JSON.stringify(components.percent)}]) + ${flat}`
            : `${base} + ${flat}`;

        parts.push(`const constraintValue${i} = ${total}`);
        parts.push(`if (!Number.isFinite(constraintValue${i})) return false`);
        if (predicate.minimumInclusive !== null) {
            parts.push(
                `if (constraintValue${i} < ${numberSource(predicate.minimumInclusive)}) return false`
            );
        }
        if (predicate.maximumInclusive !== null) {
            parts.push(
                `if (constraintValue${i} > ${numberSource(predicate.maximumInclusive)}) return false`
            );
        }
    }
    parts.push('return true');
    return Function('stats', `"use strict";\n${parts.join(';\n')}`);
}

function compileSetRejection(predicates, includeMinimum) {
    const parts = [];

    for (const predicate of predicates) {
        const setName = JSON.stringify(predicate.setName);
        const value = `(Object.prototype.hasOwnProperty.call(sets, ${setName}) ? sets[${setName}] : 0)`;
        if (predicate.maximumExclusive !== null) {
            parts.push(
                `if (${value} >= ${numberSource(predicate.maximumExclusive)}) return true`
            );
        }
        if (includeMinimum && predicate.minimumInclusive !== null) {
            parts.push(
                `if (${value} < ${numberSource(predicate.minimumInclusive)}) return true`
            );
        }
    }
    parts.push('return false');
    return Function('sets', `"use strict";\n${parts.join(';\n')}`);
}

function compileVariationResolver(variations) {
    const ordered = [...variations].sort((left, right) => {
        return selectorWeight(right.selector.terms) - selectorWeight(left.selector.terms) ||
            right.selector.terms.length - left.selector.terms.length ||
            left.index - right.index;
    });
    const parts = ordered.map((variation) => {
        const terms = variation.selector.terms.map((term) => {
            const setName = JSON.stringify(term.setName);
            return `(Object.prototype.hasOwnProperty.call(sets, ${setName}) ? sets[${setName}] : 0) >= ${term.minimumInclusive}`;
        });
        const condition = terms.length ? terms.join(' && ') : 'true';
        return `if (${condition}) return ${JSON.stringify(variation.id)}`;
    });
    parts.push('return undefined');
    return Function('sets', `"use strict";\n${parts.join(';\n')}`);
}

function selectorWeight(terms) {
    return terms.reduce((total, term) => total + term.minimumInclusive, 0);
}

function isValidSetState(setCounts) {
    if (
        setCounts === null ||
        typeof setCounts !== 'object' ||
        Array.isArray(setCounts) ||
        (Object.getPrototypeOf(setCounts) !== Object.prototype && Object.getPrototypeOf(setCounts) !== null)
    ) {
        return false;
    }

    let totalPieces = 0;
    for (const setName in setCounts) {
        if (!hasOwn(setCounts, setName)) continue;
        const count = setCounts[setName];
        if (!Number.isInteger(count) || count < 0 || count > 5) return false;
        totalPieces += count;
        if (totalPieces > 5) return false;
    }
    return true;
}

function isStatsObject(stats) {
    return stats !== null && (typeof stats === 'object' || typeof stats === 'function');
}

function numberSource(value) {
    if (!Number.isFinite(value)) {
        throw new RangeError('OptimizationPlanCPU cannot lower a non-finite predicate value');
    }
    return String(value);
}

function validatePlanShape(plan) {
    if (!plan || plan.kind !== 'optimization-plan') {
        throw new TypeError('OptimizationPlanCPU requires an optimization-plan');
    }
    if (plan.numericPolicy?.cpuArithmetic !== 'f64') {
        throw new RangeError('OptimizationPlanCPU requires f64 CPU arithmetic');
    }
    if (
        !plan.objective ||
        !Number.isInteger(plan.objective.vectorIndex) ||
        plan.objective.vectorIndex < 0 ||
        plan.objective.vectorIndex > 2
    ) {
        throw new RangeError('OptimizationPlanCPU requires objective.vectorIndex from 0 to 2');
    }
    if (!plan.statConstraints || !Array.isArray(plan.statConstraints.predicates)) {
        throw new TypeError('OptimizationPlanCPU requires stat constraint predicates');
    }
    if (!plan.setConstraints || !Array.isArray(plan.setConstraints.predicates)) {
        throw new TypeError('OptimizationPlanCPU requires set constraint predicates');
    }
    if (!Array.isArray(plan.variations) || plan.variations.length === 0) {
        throw new TypeError('OptimizationPlanCPU requires plan variations');
    }
}
