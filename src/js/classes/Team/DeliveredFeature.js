import { BuildData } from "../Build/Data";
import { sourceScope } from "./Scope";

/**
 * A feature a teammate delivers: damage the receiver deals, "considered as
 * having been dealt by" the receiver (Nicole's Arcane Projections).
 *
 * It is listed and compiled with the receiver's data: the receiver's stats,
 * element, reactions and the multipliers the receiver receives. Only what
 * belongs to the source reads the source's scope, which the receiver's
 * program data carries (SOURCES, attached by MemberEvaluation):
 * - the feature's own condition,
 * - its own multipliers' condition, talent level and stacks. The stat a
 *   multiplier scales on is still the receiver's.
 *
 * Without the source scope (data of a team without the source) the feature
 * is inactive.
 *
 * @param {Feature2} feature
 * @param {number} sourceId character ID of the source member
 * @returns {Feature2}
 */
export function deliveredFeature(feature, sourceId) {
    if (feature.items && feature.items.length) {
        throw new Error('Delivered features with hits are not supported: ' + feature.getName());
    }

    let result = Object.create(feature);
    result.compiled = undefined;
    result.sourceId = sourceId;
    result.multipliers = feature.multipliers.map((item) => new SourceLeveledMultiplier(item, sourceId));

    result.isActive = (data) => isSourceActive(feature, data, sourceId);
    result.checkConditions = (data) => isSourceActive(feature, data, sourceId);

    return result;
}

function isSourceActive(feature, data, sourceId) {
    let scope = sourceScope(data.settings, sourceId);
    if (!scope) {
        return false;
    }

    return !feature.condition || feature.condition.isActive(scope);
}

/**
 * The receiver's data with the settings replaced by the source scope. Stats
 * stay the receiver's.
 *
 * @param {BuildData} data
 * @param {number} sourceId
 * @returns {BuildData}
 */
function withSourceSettings(data, sourceId) {
    let scope = sourceScope(data.settings, sourceId);
    if (!scope) {
        throw new Error('Missing source scope of a delivered feature');
    }

    let result = Object.create(Object.getPrototypeOf(data));
    Object.assign(result, data);
    result.settings = scope;
    return result;
}

/**
 * A delivered feature's own multiplier: its condition, talent level and
 * stacks read the source's scope, the stat it scales on is the receiver's.
 * It offers exactly what features ask of a multiplier (see
 * Team/Evaluation.DeliveredMultiplier); anything else fails.
 */
class SourceLeveledMultiplier {
    /**
     * @param {FeatureMultiplier} multiplier
     * @param {number} sourceId
     */
    constructor(multiplier, sourceId) {
        this.multiplier = multiplier;
        this.sourceId = sourceId;
        // What it is: the features it targets and the stat it scales on.
        this.target = multiplier.target;
        this.scaling = multiplier.scaling;
    }

    getName() {
        return this.multiplier.getName();
    }

    isActive(data) {
        return this.multiplier.isActive(withSourceSettings(data, this.sourceId));
    }

    isMatchFeature(feature, data) {
        return this.multiplier.isMatchFeature(feature, data);
    }

    isMatchOption(option) {
        return this.multiplier.isMatchOption(option);
    }

    getLevel(data) {
        return this.multiplier.getLevel(withSourceSettings(data, this.sourceId));
    }

    getTree(data) {
        return this.multiplier.getTree(withSourceSettings(data, this.sourceId));
    }
}
