/**
 * Which team members an effect is delivered to.
 *
 * Every condition, post-effect, multiplier and feature is declared once, on
 * the member it comes from (its source). `receivers` says who gets it:
 * - SELF: the source member only (the default),
 * - TEAM: every member, the source included,
 * - OTHERS: every member except the source.
 *
 * "Only the on-field character" is not a receiver set: it is a requirement
 * on the receiver's state, derived from the team's active member and checked
 * with a receiver-scope condition. ConditionSelectedReceiver narrows a set
 * to the member chosen on the source's ConditionDropdownTeamMember control.
 */
export const RECEIVERS = {
    SELF: 'self',
    TEAM: 'team',
    OTHERS: 'others',
};

const VALUES = Object.values(RECEIVERS);

/**
 * @param {Object} item Condition, PostEffect, FeatureMultiplier or Feature
 * @returns {string}
 */
export function getReceivers(item) {
    let value = item.params ? item.params.receivers : item.receivers;
    if (value === undefined) {
        return RECEIVERS.SELF;
    }

    if (!VALUES.includes(value)) {
        throw new Error(`Unknown receivers value "${value}"`);
    }

    return value;
}

/**
 * @param {Object} item
 * @returns {boolean} whether the source member receives the item
 */
export function reachesSource(item) {
    return getReceivers(item) != RECEIVERS.OTHERS;
}

/**
 * @param {Object} item
 * @returns {boolean} whether members other than the source receive the item
 */
export function reachesOthers(item) {
    return getReceivers(item) != RECEIVERS.SELF;
}
