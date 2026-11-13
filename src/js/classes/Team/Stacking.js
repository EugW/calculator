/**
 * Non-stacking effects.
 *
 * An effect, or a part of one, that does not stack with itself carries a
 * stack key (`stack: 'noblesse_oblige_4'`). By default a team has one active
 * source per key. `stackScope: 'receiver'` allows one source per recipient.
 *
 * Which source supplies a claim (a key, or a key for one recipient) is
 * resolved by each evaluation from the sources eligible in that state (see
 * TeamEvaluation.resolve): the source the user chose (Team.stackChoices)
 * when it is eligible, otherwise the member in the earliest slot, as in
 * Genshin Optimizer. A choice of nobody turns the effect off. Nothing is
 * stored on the members: a choice whose source is gone falls back, and
 * adding or removing members never leaves a source switched off.
 *
 * The entries of the team's legacy source (Team/Legacy) are sources like
 * the members and come after them: the same effect from a member and from an
 * entry counts once, the member's by default.
 */

/**
 * @param {Object} item Condition, PostEffect or FeatureMultiplier
 * @returns {string} stack key, or ''
 */
export function getStackKey(item) {
    let key = item.params ? item.params.stack : item.stack;
    return key || '';
}

export function getStackScope(item) {
    const scope = (item.params ? item.params.stackScope : item.stackScope) || 'team';
    if (scope !== 'team' && scope !== 'receiver') {
        throw new Error(`Unknown stack scope "${scope}"`);
    }
    return scope;
}

/** Internal identity of a claim. Zero denotes a team-wide exclusion. */
export function stackClaim(key, receiverId = 0) {
    return receiverId ? key + '@' + receiverId : key;
}

export function splitStackClaim(claim) {
    const [key, receiverId] = claim.split('@');
    return {key, receiverId: Number(receiverId) || 0};
}

/**
 * Which members yield which claims in one evaluation.
 */
export class StackPlan {
    /**
     * @param {Map.<CalcSet, Set.<string>>} [yields] claims each member yields
     */
    constructor(yields = new Map()) {
        this.yieldsByMember = yields;
    }

    /**
     * @param {CalcSet} member
     * @param {string} key
     * @param {number} receiverId the recipient, for a key scoped per recipient
     * @returns {boolean}
     */
    yields(member, key, receiverId = 0) {
        let claims = this.yieldsByMember.get(member);
        return !!claims && claims.has(stackClaim(key, receiverId));
    }

    /**
     * @returns {string} the plan's yields, comparable between plans
     */
    signature(slotOf) {
        let result = [];
        for (let [member, claims] of this.yieldsByMember) {
            for (let claim of claims) result.push(slotOf(member) + ':' + claim);
        }
        return result.sort().join(',');
    }

    /**
     * The plan for the eligible sources of every claim: the chosen source
     * when it is eligible, otherwise the earliest slot; every other source
     * yields. A choice of nobody (0) makes every source yield.
     *
     * @param {Map.<string, Set.<CalcSet>>} eligible sources by claim
     * @param {Object} choices source character ID by claim (Team.stackChoices)
     * @param {function(CalcSet): number} slotOf
     * @returns {{plan: StackPlan, groups: Array.<StackGroup>}}
     */
    static choose(eligible, choices, slotOf) {
        let yields = new Map();
        let groups = [];

        for (let [claim, members] of eligible) {
            let sources = [...members].sort((a, b) => slotOf(a) - slotOf(b));
            let choice = choices[claim];
            let source = choice === 0 ? null
                : sources.find((member) => member.getSourceId() === choice) || sources[0];

            for (let member of sources) {
                if (member === source) continue;
                if (!yields.has(member)) yields.set(member, new Set());
                yields.get(member).add(claim);
            }

            if (sources.length > 1 || (choice === 0 && sources.length)) {
                groups.push({claim, ...splitStackClaim(claim), sources, source});
            }
        }

        return {plan: new StackPlan(yields), groups};
    }
}

/**
 * @typedef {Object} StackGroup a claim with a choice to make
 * @property {string} claim
 * @property {string} key
 * @property {number} receiverId
 * @property {Array.<CalcSet>} sources eligible sources, in slot order
 * @property {CalcSet|null} source the one that supplies it, or null for nobody
 */

/**
 * Active sources per stack key, collected during one team evaluation, and the
 * members that yield a key but whose effect would otherwise apply: together,
 * the sources eligible to supply it.
 */
export class StackLedger {
    constructor() {
        /** @type {Map.<string, Set.<CalcSet>>} */
        this.sources = new Map();
        /** @type {Map.<string, Set.<CalcSet>>} */
        this.yielded = new Map();
        this.scopes = new Map();
    }

    /**
     * @param {string} key
     * @param {CalcSet} member a member that yields the key, whose effect is otherwise active
     */
    recordYielded(key, member, receiverId = 0) {
        const claim = stackClaim(key, receiverId);
        if (!this.yielded.has(claim)) {
            this.yielded.set(claim, new Set());
        }
        this.yielded.get(claim).add(member);
    }

    /**
     * @returns {Set.<CalcSet>} members that would supply the key if they stopped yielding it
     */
    getYielded(key, receiverId = 0) {
        return this.yielded.get(stackClaim(key, receiverId)) || new Set();
    }

    /**
     * @param {string} key
     * @param {CalcSet} member source member
     */
    record(key, member, receiverId = 0) {
        const scope = receiverId ? 'receiver' : 'team';
        if (this.scopes.has(key) && this.scopes.get(key) !== scope) {
            throw new Error(`Stack key "${key}" is used with different scopes`);
        }
        this.scopes.set(key, scope);
        const claim = stackClaim(key, receiverId);
        if (!this.sources.has(claim)) {
            this.sources.set(claim, new Set());
        }
        this.sources.get(claim).add(member);
    }

    getSources(key, receiverId = 0) {
        return this.sources.get(stackClaim(key, receiverId)) || new Set();
    }

    /**
     * Add another ledger's sources and yielded sources.
     *
     * @param {StackLedger} other
     */
    merge(other) {
        for (let [map, otherMap] of [[this.sources, other.sources], [this.yielded, other.yielded]]) {
            for (let [claim, members] of otherMap) {
                if (!map.has(claim)) map.set(claim, new Set());
                for (let member of members) map.get(claim).add(member);
            }
        }
        for (let [key, scope] of other.scopes) {
            if (this.scopes.has(key) && this.scopes.get(key) !== scope) {
                throw new Error(`Stack key "${key}" is used with different scopes`);
            }
            this.scopes.set(key, scope);
        }
    }

    /**
     * Add every source that applies or yields to the eligible sources.
     *
     * @param {Map.<string, Set.<CalcSet>>} eligible sources by claim, changed in place
     * @returns {boolean} whether a source was added
     */
    addEligible(eligible) {
        let added = false;
        for (let map of [this.sources, this.yielded]) {
            for (let [claim, members] of map) {
                if (!eligible.has(claim)) eligible.set(claim, new Set());
                let set = eligible.get(claim);
                for (let member of members) {
                    if (!set.has(member)) {
                        set.add(member);
                        added = true;
                    }
                }
            }
        }
        return added;
    }

    /**
     * @returns {Array.<{key: string, receiverId: number, members: Array.<CalcSet>}>} claims
     *     with more than one source that applies: none in a resolved
     *     evaluation (TeamEvaluation.resolve)
     */
    getConflicts() {
        let result = [];
        for (let [claim, members] of this.sources) {
            if (members.size > 1) {
                result.push({...splitStackClaim(claim), members: [...members]});
            }
        }
        return result;
    }
}
