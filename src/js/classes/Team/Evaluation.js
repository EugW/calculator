import { BuildData } from "../Build/Data";
import { applyTeamOverrides, BuildSettings, keyBySource } from "../Build/Settings";
import { Stats } from "../Stats";
import { addressTree, memberPrefix } from "./Namespace";
import { reachesOthers, reachesSource } from "./Receivers";
import { ASSUMED, attachScopes, PROGRAM, SOURCES } from "./Scope";
import { ENEMY_PREFIX, enemyStatName, splitEnemyStats } from "./EnemyStats";
import { getStackKey, getStackScope, StackLedger, StackPlan } from "./Stacking";
import { activeConditionValues } from "./ConditionValues";
import { compositionFillers, isLegacySource } from "./Legacy";
import { TeamState } from "./State";
import { SOURCE_KINDS, StatSources } from "./StatSources";

/**
 * Objects of a member, in evaluation order. Conditions are evaluated in this
 * order; conditions delivered by teammates are evaluated right after
 * `buffs`, where the party conditions of the old model are. The enemy is not
 * a member object: it belongs to the team (see resolveEnemy).
 */
export const MEMBER_OBJECTS = ['char', 'weapon', 'artifacts', 'buffs', 'food', 'reaction', 'static'];
const DELIVERY_AFTER = 'buffs';
/**
 * Evaluations a team's stack sources may take to settle (see resolve). Like
 * settings, sources that never settle keep their last round, and the
 * evaluation says so (isSettled).
 */
const MAX_STACK_ROUNDS = 8;
/**
 * Rounds a source's settings may take to settle (see resolveSettings):
 * enough for a chain of deliveries through every member and back. A team
 * that takes more keeps its last round, and the evaluation says so
 * (isSettled).
 */
const MAX_SETTINGS_ROUNDS = 10;

/**
 * One evaluation of a team state. The team is resolved as a whole, once;
 * each member's data is read from it (member()).
 *
 * Settings resolve in rounds (resolveSettings):
 * 0. Own pass, per member: the member's settings, then every condition of
 *    its own that reaches it, in object order.
 * 1. Every member again, with teammate conditions inserted after `buffs`,
 *    each read in its source's scope from the source's own pass. This
 *    includes received talent bonuses, so they can affect what a member
 *    delivers.
 * 2. and on: every member starts from its settings of the previous round and
 *    reads its sources' previous round, until no member's settings change: a
 *    chain of deliveries (A enables something B delivers to C) resolves
 *    whatever its length. No round reads itself, so resolution cannot
 *    recurse through a team dependency cycle; a team whose settings never
 *    settle keeps its last round (isSettled). Only the last round
 *    contributes stats and stack claims.
 *
 * A source nobody delivers to (a member alone, a member whose teammates
 * deliver nothing, every legacy entry) takes the same rounds without the
 * deliveries (resolveAlone): its own pass, then passes that start from the
 * settings of the one before. So what a member's own conditions give never
 * depends on whether a teammate delivers anything.
 *
 * Stats are staged. Stage 0 is the result of the full pass. Post-effects
 * then run by priority for all members at once (see
 * MemberEvaluation.programData), so a post-effect always reads stats as they
 * were before its own priority, on whichever member it reads them.
 *
 * An item with a stack key does not apply from a member that yields the key
 * in the evaluation's plan (Team/Stacking, resolve). Every item that does
 * apply is recorded as a source of its key, and every eligible one that
 * yields as yielded: the sources the user can choose between.
 *
 * The enemy is resolved once for the whole team, before the members, from
 * its own settings and conditions. Members read it through the enemy scope
 * (Team/Scope.enemyScope). Its RES and DEF reductions (Team/EnemyStats) are
 * its own stats: no member's stats hold them, and a program reads them in
 * the enemy's namespace (`enemy__res_pyro`).
 *
 * The entries of the team's legacy source (Team/Legacy) are sources like the
 * members and nothing else: their settings settle on their own, they deliver
 * their conditions, post-effects, multipliers and features to the members,
 * claim stack keys and change the enemy, but receive nothing and have no
 * programs.
 * Their stats are the ones they state. In a program they are addressed after
 * the four slots (`m5__hp`), in the legacy source's order.
 */
export class TeamEvaluation {
    /**
     * @param {Array.<CalcSet|null>} slots members by team slot
     * @param {Object} teamSettings team toggles
     * @param {CalcObjectEnemy} enemy the team's enemy
     * @param {StackPlan} [plan] which members yield which stack claims
     * @param {Object} [conditionValues] source char -> receiver char -> inputs
     * @param {boolean} [trace] record where stats come from (see traced)
     * @param {Array.<LegacyEntry>} [legacy] the legacy source's entries in effect
     */
    constructor(slots, teamSettings, enemy, plan = new StackPlan(), conditionValues = {}, trace = false, legacy = []) {
        if (!enemy) {
            throw new Error('A team is evaluated against its enemy');
        }
        this.slots = slots;
        this.legacy = legacy;
        this.teamSettings = teamSettings;
        this.enemyObject = enemy;
        this.plan = plan;
        this.conditionValues = structuredClone(conditionValues);
        /**
         * Sources of the stats of every pass, by its stats object (Team/StatSources);
         * null unless traced.
         * @type {WeakMap.<Stats, StatSources>|null}
         */
        this.statSources = trace ? new WeakMap() : null;
        this.enemySources = trace ? new StatSources() : null;
        this.settingsPasses = new WeakMap();
        this.pairCache = new WeakMap();
        this.ledger = new StackLedger();
        /** @type {Array.<StackGroup>} claims with a choice to make, see resolve */
        this.groups = [];
        /** Whether no source's settings ran out of rounds (resolveSettings), see isSettled */
        this.settingsSettled = true;
        /** Whether the stack sources settled within their evaluations (resolve), see isSettled */
        this.stackSettled = true;

        let facts = [];
        this.slots.forEach((member, slot) => {
            if (member) facts.push(TeamState.memberFacts(member, slot));
        });
        /**
         * The virtual characters that fill the team's free slots: they are
         * part of its composition and of nothing else.
         * @type {Array.<VirtualCharacter>}
         */
        this.fillers = compositionFillers(legacy, this.slots.filter((member) => !member).length);
        for (let entry of this.fillers) {
            facts.push(Object.assign(TeamState.memberFacts(entry, this.slotOf(entry)), {virtual: true}));
        }
        this.enemy = this.resolveEnemy(enemy);
        this.state = new TeamState(facts, teamSettings, this.enemy.settings);
        this.party = this.resolveParty(teamSettings);
        this.state.party = this.party.settings;

        this.fullCache = new Map();
        this.processedCache = new Map();
        this.memberCache = new Map();
    }

    /**
     * Evaluate a team with its non-stacking effects resolved (Team/Stacking).
     * An evaluation finds the eligible sources of every claim; the team is
     * evaluated again with all but one source of each claim yielding, until
     * no new source becomes eligible. A team without competing sources is
     * evaluated once. Every claim is collected before a result is read, so
     * results never depend on what was read first.
     *
     * @param {Array.<CalcSet|null>} slots
     * @param {Object} teamSettings
     * @param {CalcObjectEnemy} enemy
     * @param {Object} [choices] chosen source by claim (Team.stackChoices)
     * @param {Object} [conditionValues] source char -> receiver char -> inputs
     * @param {Array.<LegacyEntry>} [legacy] the legacy source's entries in effect
     * @returns {TeamEvaluation}
     */
    static resolve(slots, teamSettings, enemy, choices = {}, conditionValues = {}, legacy = []) {
        let slotOf = (source) => sourceSlot(slots, legacy, source);
        let eligible = new Map();
        let plan = new StackPlan();

        for (let round = 1; ; ++round) {
            let evaluation = new TeamEvaluation(slots, teamSettings, enemy, plan, conditionValues, false, legacy);
            evaluation.collectStackSources().addEligible(eligible);

            let next = StackPlan.choose(eligible, choices, slotOf);
            let settled = next.plan.signature(slotOf) == plan.signature(slotOf);
            if (settled || round >= MAX_STACK_ROUNDS) {
                evaluation.groups = next.groups;
                evaluation.stackSettled = settled;
                return evaluation;
            }
            plan = next.plan;
        }
    }

    /**
     * @returns {Array.<StackGroup>} claims with more than one eligible
     *     source, or turned off by the user, and who supplies each
     */
    stackGroups() {
        return this.groups;
    }

    /**
     * Whether the team settled: every source's settings within the rounds
     * they may take (resolveSettings) and the stack sources within their
     * evaluations (resolve). A team that did not keeps its last round: its
     * numbers are then one phase of a cycle in its content (a control that
     * switches off what switches it on), not a result. No team of the
     * database is known to: test/teamSettle*.test.js check that.
     *
     * @returns {boolean}
     */
    isSettled() {
        // Settings resolve when they are first read.
        for (let source of this.getSources()) {
            this.resolveFull(source);
        }
        return this.settingsSettled && this.stackSettled;
    }

    /**
     * The same evaluation (same stack plan), recording where every stat
     * comes from: for showing a feature's damage graph (DamageGraph), never
     * for results.
     *
     * @returns {TeamEvaluation}
     */
    traced() {
        let result = new TeamEvaluation(this.slots, this.teamSettings, this.enemyObject, this.plan, this.conditionValues, true, this.legacy);
        result.groups = this.groups;
        result.stackSettled = this.stackSettled;
        return result;
    }

    /**
     * @param {CalcSet} member
     * @returns {StatSources} what the member's stage 0 stats are made of; traced evaluations only
     */
    sourcesOf(member) {
        if (!this.statSources) {
            throw new Error('Only a traced evaluation records stat sources');
        }
        return this.statSources.get(this.resolveFull(member).stats);
    }

    /**
     * @returns {StatSources} what the enemy's stats are made of (unprocessed
     *     names, enemy_res_pyro); traced evaluations only
     */
    enemySourcesOf() {
        if (!this.enemySources) {
            throw new Error('Only a traced evaluation records stat sources');
        }
        this.enemyStats();
        return this.enemySources;
    }

    /**
     * Record stats added to a pass, when tracing.
     *
     * @param {Stats} stats the pass's stats
     * @param {string} kind SOURCE_KINDS
     * @param {CalcSet|null} source
     * @param {string|null} object
     * @param {Object|null} item
     * @param {Object} added
     */
    recordStats(stats, kind, source, object, item, added) {
        if (!this.statSources) return;
        let sources = this.statSources.get(stats);
        if (!sources) {
            sources = new StatSources();
            this.statSources.set(stats, sources);
        }
        sources.add(kind, source, object, item, added);
    }

    /**
     * @returns {Array.<CalcSet>} occupied slots, in slot order
     */
    getMembers() {
        return this.slots.filter((member) => !!member);
    }

    /**
     * @returns {Array.<CalcSet|LegacyEntry>} everything that delivers
     *     effects: the members in slot order, then the legacy source's entries
     */
    getSources() {
        return this.getMembers().concat(this.legacy);
    }

    /**
     * @param {number} slot a slot, or a legacy entry's address after the slots
     * @returns {CalcSet|LegacyEntry|null}
     */
    sourceAt(slot) {
        return slot < this.slots.length ? this.slots[slot] || null : this.legacy[slot - this.slots.length] || null;
    }

    /**
     * @param {CalcSet|LegacyEntry} source
     * @returns {number} a member's slot; a legacy entry's address after the slots
     */
    slotOf(source) {
        let slot = sourceSlot(this.slots, this.legacy, source);
        if (slot < 0) {
            throw new Error('Member is not in the evaluated team');
        }
        return slot;
    }

    /**
     * A member's data in this evaluation.
     *
     * @param {CalcSet} member
     * @returns {MemberEvaluation}
     */
    member(member) {
        let result = this.memberCache.get(member);
        if (!result) {
            result = new MemberEvaluation(this, member);
            this.memberCache.set(member, result);
        }
        return result;
    }

    /**
     * The enemy's settings (level, type, its toggles), its stats (base RES)
     * and what its conditions give. Its conditions read only the enemy.
     * Their RES and DEF changes are the enemy's own stats; the rest ("DMG
     * taken") reach every member's hits.
     *
     * @param {CalcObjectEnemy} enemy
     * @returns {{settings: BuildSettings, stats: Stats, memberStats: Stats}}
     */
    resolveEnemy(enemy) {
        let settings = new BuildSettings();
        settings.concat(enemy.getSettings());

        // Its base RES; its conditions change it.
        let stats = new Stats(enemy.getStats().stats);
        let memberStats = new Stats();
        /** What its conditions give members, when tracing: a StatSources entry each. */
        let memberSources = [];
        this.enemySources?.add(SOURCE_KINDS.ENEMY, null, null, null, stats);
        for (let cond of enemy.getConditions()) {
            let data = cond.getData(settings);
            let split = splitEnemyStats(data.stats);
            stats.concat(split.enemy);
            memberStats.concat(split.other);
            settings.concat(data.settings);
            if (this.enemySources) {
                this.enemySources.add(SOURCE_KINDS.ENEMY, null, null, cond, split.enemy);
                memberSources.push({cond, stats: split.other});
            }
        }
        return {settings, stats, memberStats, memberSources};
    }

    /**
     * The party: the team's own effects and toggles (resonances, Polestar;
     * DbObjectBuff.isParty). Its scope is the team's settings, what the
     * composition gives (party size, Moonsign) and what its conditions
     * derive. It is resolved once; every member receives its effects
     * (applyParty), and its RES reductions reach the enemy once.
     *
     * @param {Object} teamSettings
     * @returns {{conditions: Array.<Condition>, settings: BuildSettings}}
     */
    resolveParty(teamSettings) {
        let conditions = DB.Buffs.getList().filter((item) => item.isParty()).flatMap((item) => item.getConditions());
        let moonsign = this.state.countOrigin('nodkrai');

        let settings = new BuildSettings(teamSettings);
        settings.concat({
            party_size: this.state.getSize(),
            party_moonsign_count: moonsign,
            party_moonsign: Math.min(2, moonsign),
        });
        attachScopes(settings, null, this.state);
        for (let cond of conditions) {
            settings.concat(cond.getData(settings).settings);
        }
        return {conditions, settings};
    }

    /**
     * Deliver the party's effects to a member: in the party's scope, with
     * the member as the receiver. What the party derives stays the team's
     * (Scope.teamSettings); only its effects reach the member.
     *
     * @param {BuildSettings} settings the member's settings
     * @param {Stats} stats the member's stats
     */
    applyParty(settings, stats) {
        let scope = attachScopes(new BuildSettings(this.party.settings), settings, this.state);
        for (let cond of this.party.conditions) {
            let other = splitEnemyStats(cond.getData(scope).stats).other;
            stats.concat(other);
            this.recordStats(stats, SOURCE_KINDS.PARTY, null, null, cond, other);
        }
    }

    /**
     * The party's settings as a member receiving its effects sees them, for
     * showing the party's conditions (Geo Resonance's shield bonus depends on
     * the member).
     *
     * @param {CalcSet} receiver
     * @returns {BuildSettings} a copy
     */
    partySettings(receiver) {
        return attachScopes(new BuildSettings(this.party.settings), this.resolveFull(receiver).settings, this.state);
    }

    /**
     * The enemy's stats: its total RES (base, then every change) and its
     * total DEF reduction. Changes come from its own conditions, the party
     * and the members' effects. Each effect counts once, evaluated in its
     * owner's scope, whichever members it reaches.
     *
     * @returns {Stats} unprocessed
     */
    enemyStats() {
        if (!this.enemyStatsCache) {
            let stats = new Stats(this.enemy.stats);
            for (let cond of this.party.conditions) {
                let enemy = splitEnemyStats(cond.getData(this.party.settings).stats).enemy;
                stats.concat(enemy);
                this.enemySources?.add(SOURCE_KINDS.PARTY, null, null, cond, enemy);
            }
            for (let member of this.getSources()) {
                let settings = this.resolveFull(member).settings;
                for (let name of MEMBER_OBJECTS) {
                    if (!member[name]) continue;

                    for (let cond of member[name].getConditions()) {
                        if (this.yields(member, cond)) continue;
                        let enemy = splitEnemyStats(cond.getData(settings).stats).enemy;
                        stats.concat(enemy);
                        this.enemySources?.add(SOURCE_KINDS.CONDITION, member, name, cond, enemy);
                    }
                }
            }
            this.enemyStatsCache = stats;
        }
        return this.enemyStatsCache;
    }

    /**
     * @returns {{settings: BuildSettings, stats: Stats}} the resolved enemy, a copy;
     *     its stats are processed (percent as fractions)
     */
    enemyData() {
        let stats = new Stats(this.enemyStats());
        stats.processPercent();
        return {settings: new BuildSettings(this.enemy.settings), stats};
    }

    /**
     * Add the enemy's stats to a program's stats, in its namespace.
     *
     * @param {Stats} target
     * @param {boolean} processed whether target holds processed stats
     */
    addEnemyStats(target, processed) {
        let stats = new Stats(this.enemyStats());
        if (processed) {
            stats.processPercent();
        }
        for (let name of Object.keys(stats)) {
            target[enemyStatName(name)] = stats[name];
        }
    }

    initial(member, receiverSettings) {
        let settings = new BuildSettings();
        settings.concat(member.getSettings());
        settings.concat(activeConditionValues(member, receiverSettings?.char_id || member.getSourceId(), this.conditionValues));
        applyTeamOverrides(settings, this.state.settings);
        // Field state is the team's: members read it (Condition/Field).
        settings.party_size = this.state.getSize();
        attachScopes(settings, receiverSettings, this.state);
        if (isLegacySource(member)) {
            settings[ASSUMED] = member.assumptions(this.fillers.includes(member));
        }

        // What the enemy's conditions give (Superconduct, a boss's shield)
        // applies to every member's hits.
        let stats = new Stats(this.enemy.memberStats);
        for (let item of this.enemy.memberSources) {
            this.recordStats(stats, SOURCE_KINDS.ENEMY, null, null, item.cond, item.stats);
        }

        return {settings, stats};
    }

    /**
     * Full pass of a member: its stage 0 stats and final settings.
     *
     * @param {CalcSet} member
     * @returns {{settings: BuildSettings, stats: Stats}}
     */
    resolveFull(member) {
        if (!this.fullCache.has(member)) {
            this.resolveSettings();
        }
        return this.fullCache.get(member);
    }

    /**
     * Resolve every source's settings in rounds until they settle (see the
     * class comment). A source nobody delivers to depends on nobody: it is
     * resolved on its own first (resolveAlone), and the others' rounds read
     * the result. Every legacy entry is one: it receives nothing.
     */
    resolveSettings() {
        let members = this.getMembers();
        let all = this.getSources();
        let sources = all.filter((source) => this.deliveredConditions(source).some((cond) => !this.yields(source, cond)));
        let receiving = members.filter((member) => sources.some((source) => source !== member));

        let fixed = new Map();
        for (let member of all) {
            if (!receiving.includes(member)) {
                fixed.set(member, this.resolveAlone(member));
                this.fullCache.set(member, fixed.get(member));
            }
        }
        if (receiving.length == 0) {
            return;
        }

        let fixedLedger = this.ledger;
        let settingsIn = (round) => (source) => (fixed.get(source) || round.get(source)).settings;
        let own = new Map(receiving.map((member) => [member, this.resolve(member)]));
        let previous = new Map(receiving.map((member) => [member, this.resolve(member, settingsIn(own))]));

        for (let round = 2; ; ++round) {
            // Stack claims are the last round's: an effect active only in an
            // earlier round is no source.
            this.ledger = new StackLedger();
            let current = new Map(receiving.map((member) => {
                return [member, this.resolve(member, settingsIn(previous), previous.get(member).settings, true)];
            }));

            let settled = receiving.every((member) => sameSettings(current.get(member).settings, previous.get(member).settings));
            if (settled || round >= MAX_SETTINGS_ROUNDS) {
                this.settingsSettled &&= settled;
                this.ledger.merge(fixedLedger);
                for (let member of receiving) {
                    this.fullCache.set(member, current.get(member));
                }
                return;
            }
            previous = current;
        }
    }

    /**
     * Resolve a source nobody delivers to: the rounds of resolveSettings
     * without deliveries. Its first pass reads its conditions in order, so
     * one of them cannot see what a later one derives (a talent level read
     * before the constellation that raises it: Kaveh's Painted Dome before
     * his C3). Every further pass starts from the settings of the one
     * before, until they no longer change. A member that is delivered to
     * resolves the same way, so a member's own numbers do not depend on
     * whether a teammate delivers anything.
     *
     * @param {CalcSet|LegacyEntry} source
     * @returns {{settings: BuildSettings, stats: Stats}} its last pass
     */
    resolveAlone(source) {
        // A legacy entry is no receiver of its own effects: it claims stack
        // keys where it delivers.
        let claims = !isLegacySource(source);
        let ledger = this.ledger;
        let previous = this.resolve(source);

        for (let round = 2; ; ++round) {
            // Stack claims are the last pass's: an effect active only in an
            // earlier pass is no source.
            this.ledger = new StackLedger();
            let current = this.resolve(source, null, previous.settings, claims);

            let settled = sameSettings(current.settings, previous.settings);
            if (settled || round >= MAX_SETTINGS_ROUNDS) {
                this.settingsSettled &&= settled;
                ledger.merge(this.ledger);
                this.ledger = ledger;
                return current;
            }
            previous = current;
        }
    }

    resolve(member, sourceSettings, initialSettings, recordSources = false, receiverSettings = null) {
        let {settings, stats} = this.initial(member, receiverSettings);
        if (initialSettings) {
            settings.concat(initialSettings);
        }
        attachScopes(settings, receiverSettings, this.state);

        // A legacy entry receives nothing: not what the enemy's conditions
        // give members, not the party's effects, no deliveries.
        let legacy = isLegacySource(member);
        if (legacy) {
            stats = new Stats();
        }

        for (let name of MEMBER_OBJECTS) {
            if (!member[name]) continue;

            for (let cond of member[name].getConditions()) {
                if (!reachesSource(cond)) continue;
                this.applyCondition(cond, member, settings, settings, stats, recordSources, receiverSettings?.char_id || settings.char_id, name);
            }

            if (name == DELIVERY_AFTER && !legacy) {
                // The party's effects, where they were among the buffs of
                // every member before the team owned them.
                this.applyParty(settings, stats);
            }

            if (sourceSettings && name == DELIVERY_AFTER) {
                for (let source of this.getSources()) {
                    if (source === member) continue;
                    this.applyDeliveries(source, settings, stats, sourceSettings, recordSources);
                }
            }
        }

        if (legacy) {
            // No build: of a build's stats it has the ones it states. What
            // its own controls give (a counter an effect reads) stays.
            for (let name of MEMBER_OBJECTS) {
                if (member[name]) settings.concat(member[name].getStats(settings).settings);
            }
            stats = member.statedStats(settings, stats);
            this.settingsPasses.set(settings, {sourceSettings, initialSettings});
            return {settings, stats};
        }

        for (let name of MEMBER_OBJECTS) {
            if (!member[name]) continue;

            let data = member[name].getStats(settings);
            let other = splitEnemyStats(data.stats).other;
            stats.concat(other);
            this.recordStats(stats, SOURCE_KINDS.OBJECT, member, name, null, other);
            settings.concat(data.settings);
        }

        // TODO fix this
        if (stats.get('dmg_own')) {
            stats.add('dmg_'+ settings.char_element, stats.get('dmg_own'));
            this.statSources?.get(stats)?.alias('dmg_own', 'dmg_'+ settings.char_element);
        }

        // A delivery with pair inputs replays the same finite settings
        // rounds, starting from inputs. Patching a completed snapshot would
        // retain settings derived by a toggle that the receiver turned off.
        this.settingsPasses.set(settings, {sourceSettings, initialSettings});
        return {settings, stats};
    }

    applyDeliveries(source, receiverSettings, receiverStats, sourceSettings, recordSources) {
        let conditions = this.deliveredConditions(source);
        if (conditions.length == 0) {
            return;
        }

        let view = this.sourceView(source, receiverSettings, sourceSettings(source));
        for (let cond of conditions) {
            this.applyCondition(cond, source, view, receiverSettings, receiverStats, recordSources);
        }
    }

    /**
     * @param {Condition} cond
     * @param {CalcSet} source member the condition comes from
     * @param {BuildSettings} scope source scope
     * @param {BuildSettings} settings receiver settings
     * @param {Stats} stats receiver stats
     * @param {boolean} recordSources only the full pass claims stack keys
     * @param {number} [receiverId] recipient of a pair replay, otherwise settings.char_id
     * @param {string|null} [object] source object holding the condition, when known (stat sources)
     */
    applyCondition(cond, source, scope, settings, stats, recordSources, receiverId = settings.char_id, object = null) {
        if (this.yields(source, cond, receiverId)) {
            if (recordSources && cond.isActive(scope)) {
                this.recordYielded(cond, source, receiverId);
            }
            return;
        }
        if (recordSources && getStackKey(cond) && cond.isActive(scope)) {
            this.recordSource(cond, source, receiverId);
        }

        let condData = cond.getData(scope);
        // RES and DEF reductions are the enemy's, see enemyStats.
        let other = splitEnemyStats(condData.stats).other;
        stats.concat(other);
        this.recordStats(stats, SOURCE_KINDS.CONDITION, source, object, cond, other);
        // Talent level bonuses of different members add up.
        settings.concat(keyBySource(condData.settings, source.getSourceId()));
    }

    /**
     * @param {CalcSet} member source member
     * @param {Object} item Condition, PostEffect or FeatureMultiplier
     * @returns {boolean} whether the member yields the item's stack key
     */
    yields(member, item, receiverId = 0) {
        let key = getStackKey(item);
        if (!key) return false;
        if (getStackScope(item) === 'receiver') {
            return !!receiverId && this.plan.yields(member, key, receiverId);
        }
        return this.plan.yields(member, key);
    }

    /**
     * Record an item that applies as a source of its stack key.
     *
     * @param {Object} item
     * @param {CalcSet} member source member
     */
    recordSource(item, member, receiverId) {
        let key = getStackKey(item);
        if (key) {
            const perReceiver = getStackScope(item) === 'receiver';
            if (perReceiver && !receiverId) throw new Error('A recipient stack claim needs a receiver');
            this.ledger.record(key, member, perReceiver ? receiverId : 0);
        }
    }

    /**
     * Record an item that would apply but whose member yields its key: an
     * eligible source the user can choose instead (see Team.setStackSource).
     *
     * @param {Object} item
     * @param {CalcSet} member source member
     */
    recordYielded(item, member, receiverId) {
        const perReceiver = getStackScope(item) === 'receiver';
        this.ledger.recordYielded(getStackKey(item), member, perReceiver ? receiverId : 0);
    }

    /**
     * Record the member's own post-effects that it yields but that would
     * apply with its settings.
     *
     * @param {CalcSet} member
     * @param {BuildSettings} settings
     */
    recordYieldedPostEffects(member, settings) {
        const id = member.char.getId();
        for (const item of member.getPostEffects()) {
            if (reachesSource(item) && this.yields(member, item, id) && item.isActive(settings)) {
                this.recordYielded(item, member, id);
            }
        }
    }

    /**
     * Resolve the whole team and return the sources of every stack key: the
     * ones that apply and the eligible ones that yield. Claims belong to the
     * team: every member's own post-effects and multipliers and every
     * delivery are read here once, whichever members' programs are assembled
     * later. Conditions record theirs in the settings passes (applyCondition),
     * where their activity is decided.
     *
     * @returns {StackLedger}
     */
    collectStackSources() {
        if (this.claimsCollected) {
            return this.ledger;
        }

        let members = this.getMembers();
        for (let member of members) {
            let evaluation = this.member(member);
            evaluation.selfPostEffects(evaluation.settings());
            evaluation.multipliers();
        }
        for (let source of this.getSources()) {
            for (let receiver of members) {
                if (receiver === source) continue;
                for (let effect of this.deliveredPostEffects(source)) {
                    this.member(receiver).deliveredPostEffect(effect, source, receiver);
                }
            }
        }

        this.claimsCollected = true;
        return this.ledger;
    }

    /**
     * Source scope of a delivery, with the receiver attached. Conditions
     * supply a previous-round snapshot; post-effects and multipliers use
     * the completed full pass.
     *
     * @param {CalcSet} source
     * @param {BuildSettings} receiverSettings
     * @param {BuildSettings} [sourceSettings]
     * @returns {BuildSettings} a new object
     */
    sourceView(source, receiverSettings, sourceSettings = this.resolveFull(source).settings) {
        let settings = sourceSettings;
        if (this.conditionValues[source.getSourceId()] && receiverSettings.char_id !== source.getSourceId()) {
            const pass = this.settingsPasses.get(sourceSettings);
            if (pass) {
                let receivers = this.pairCache.get(sourceSettings);
                if (!receivers) this.pairCache.set(sourceSettings, receivers = new WeakMap());
                if (!receivers.has(receiverSettings)) {
                    const initial = pass.initialSettings
                        ? this.sourceView(source, receiverSettings, pass.initialSettings) : null;
                    // Only the delivery's settings use this replay. The
                    // source's actual stats still come from its own pair.
                    const data = this.resolve(source, pass.sourceSettings, initial, false, receiverSettings);
                    receivers.set(receiverSettings, data.settings);
                }
                settings = receivers.get(receiverSettings);
            }
        }
        return attachScopes(new BuildSettings(settings), receiverSettings, this.state);
    }

    /**
     * Conditions a member delivers to its teammates, including those it
     * yields: applyCondition skips them per receiver.
     *
     * @param {CalcSet} member
     * @returns {Array.<Condition>}
     */
    deliveredConditions(member) {
        let result = [];
        for (let name of MEMBER_OBJECTS) {
            if (!member[name]) continue;

            for (let cond of member[name].getConditions()) {
                if (reachesOthers(cond)) result.push(cond);
            }
        }
        return result;
    }

    ownPostEffects(member) {
        return member.getPostEffects().filter((item) => reachesSource(item) && !this.yields(member, item, member.char.getId()));
    }

    /**
     * Whether a member's post-effect applies to the member itself. That
     * instance then changes the enemy for the whole team (MemberPostEffect).
     * A legacy entry receives nothing, its own effects included.
     *
     * @param {CalcSet|LegacyEntry} member
     * @param {PostEffect} effect
     * @returns {boolean}
     */
    appliesToSource(member, effect) {
        return !isLegacySource(member) && reachesSource(effect) && !this.yields(member, effect, member.char.getId())
            && effect.isActive(this.resolveFull(member).settings);
    }

    /**
     * Post-effects a member delivers, including those it yields:
     * MemberEvaluation.deliveredPostEffect skips them per receiver.
     */
    deliveredPostEffects(member) {
        return member.getPostEffects().filter((item) => reachesOthers(item));
    }

    /**
     * Stage 0 stats of a member with percent stats processed.
     *
     * @param {CalcSet} member
     * @returns {Stats}
     */
    processedStats(member) {
        if (!this.processedCache.has(member)) {
            let stats = new Stats(this.resolveFull(member).stats);
            stats.processPercent();
            this.processedCache.set(member, stats);
        }
        return this.processedCache.get(member);
    }
}

/**
 * One member's data in a team evaluation. The team is resolved once
 * (TeamEvaluation); a member evaluation reads it from this member's point of
 * view. In its programs this member's stats keep their plain names and every
 * teammate's are prefixed with its slot (Team/Namespace).
 */
export class MemberEvaluation {
    /**
     * @param {TeamEvaluation} team
     * @param {CalcSet} member
     */
    constructor(team, member) {
        this.team = team;
        this.member = member;
        this.slot = team.slotOf(member);
        /**
         * The members of this member's programs, found through PROGRAM on
         * the settings trees are built with (Team/TeamStats): the party a
         * team-wide read counts, so with the virtual characters that fill
         * its free slots.
         */
        this.program = {
            slot: this.slot,
            members: () => team.getMembers().concat(team.fillers).map((other) => ({
                slot: team.slotOf(other),
                charId: other.char.getId(),
                prefix: this.prefixOf(other),
                stats: team.processedStats(other),
            })),
            // What a hit the whole team deals is built from
            // (Feature2/Reaction/Team): only members have a build.
            memberData: () => team.getMembers().map((other) => ({
                slot: team.slotOf(other),
                data: team.member(other).teamHitData(),
            })),
        };
        this.teamHitCache = null;
    }

    /**
     * The member's program data for a hit the whole team deals: its part is
     * built from it in this member's view, then moved into the program's
     * (Team/Namespace.moveTree). Assembled once per evaluation.
     *
     * @returns {BuildData} a copy
     */
    teamHitData() {
        this.teamHitCache ||= this.programData();
        return this.teamHitCache.clone();
    }

    /**
     * @param {CalcSet} member
     * @returns {string} stat prefix of the member in this member's programs
     */
    prefixOf(member) {
        return memberPrefix(this.team.slotOf(member), this.slot);
    }

    /**
     * Mark settings handed to trees of this member's programs: team-wide
     * reads (Team/TeamStats) find the program's members through them.
     *
     * @param {BuildSettings} settings a new object
     * @returns {BuildSettings} settings
     */
    withProgram(settings) {
        settings[PROGRAM] = this.program;
        return settings;
    }

    /**
     * Unprocessed data of the member: its final settings, its stage 0 stats
     * and the post-effects and multipliers it receives. Teammate stats are
     * not included.
     *
     * @returns {BuildData}
     */
    memberData() {
        let team = this.team;
        let full = team.resolveFull(this.member);

        let result = new BuildData();
        // A copy: callers add settings to the data, and the pass is cached.
        result.settings = this.withProgram(new BuildSettings(full.settings));
        result.stats = new Stats(full.stats);
        team.addEnemyStats(result.stats, false);
        result.multipliers = this.multipliers();
        result.postEffects = this.selfPostEffects(full.settings);

        for (let source of team.getSources()) {
            if (source === this.member) continue;

            for (let effect of team.deliveredPostEffects(source)) {
                let item = this.deliveredPostEffect(effect, source, this.member);
                if (item) result.postEffects.push(item);
            }
        }

        return this.attachFeatureSources(result);
    }

    /**
     * Settings of the member as the team resolves them, for showing
     * conditions: memberData() without its stats and post-effects.
     *
     * @returns {BuildSettings} a copy
     */
    settings() {
        return this.withProgram(new BuildSettings(this.team.resolveFull(this.member).settings));
    }

    /**
     * @returns {BuildSettings} the party's settings with this member as the
     *     receiver, for showing the party's conditions, a copy
     */
    partySettings() {
        return this.team.partySettings(this.member);
    }

    /**
     * Data of the member for compiled programs: its processed stats, every
     * teammate's processed stats under the teammate's prefix, and every
     * post-effect of the team, each writing to the member it reaches.
     *
     * @returns {BuildData}
     */
    programData() {
        let team = this.team;
        let viewed = this.member;

        let result = new BuildData();
        // A copy: callers add settings to the data, and the pass is cached.
        result.settings = this.withProgram(new BuildSettings(team.resolveFull(viewed).settings));
        result.stats = new Stats(team.processedStats(viewed));
        team.addEnemyStats(result.stats, true);
        result.multipliers = this.multipliers();
        result.postEffects = this.selfPostEffects(result.settings);

        for (let member of team.getSources()) {
            if (member === viewed) continue;

            let prefix = this.prefixOf(member);
            let stats = team.processedStats(member);
            for (let stat of Object.keys(stats)) {
                result.stats[prefix + stat] = stats[stat];
            }
            // A legacy entry's stats are the ones it states: nothing of its
            // own writes to them.
            if (isLegacySource(member)) continue;

            let settings = this.withProgram(new BuildSettings(team.resolveFull(member).settings));
            let sourceData = makeSourceData(stats, settings);
            let slot = team.slotOf(member);
            for (let effect of team.ownPostEffects(member)) {
                if (!effect.isActive(settings)) continue;
                result.postEffects.push(new MemberPostEffect(effect, sourceData, {
                    read: slot,
                    write: slot,
                    receiver: slot,
                }, this.slot));
            }
        }

        // An effect changes the enemy once (Team/EnemyStats), whichever members
        // it reaches: its instance on its source when it applies there,
        // otherwise its instance on the earliest member it reaches.
        for (let source of team.getSources()) {
            for (let effect of team.deliveredPostEffects(source)) {
                let enemyWriter = !team.appliesToSource(source, effect);
                for (let receiver of team.getMembers()) {
                    if (source === receiver) continue;

                    let item = this.deliveredPostEffect(effect, source, receiver, enemyWriter);
                    if (item) {
                        result.postEffects.push(item);
                        enemyWriter = false;
                    }
                }
            }
        }

        return this.attachFeatureSources(result);
    }

    /**
     * Own post-effects of the member. They stay unwrapped and are checked
     * for activity when used, as before teams.
     *
     * @param {BuildSettings} settings final settings of the member
     * @returns {Array.<PostEffect>}
     */
    selfPostEffects(settings) {
        let team = this.team;
        let result = team.ownPostEffects(this.member);
        for (let effect of result) {
            if (getStackKey(effect) && effect.isActive(settings)) {
                team.recordSource(effect, this.member, this.member.char.getId());
            }
        }
        team.recordYieldedPostEffects(this.member, settings);

        return result;
    }

    /**
     * @param {PostEffect} effect
     * @param {CalcSet} source
     * @param {CalcSet} receiver
     * @param {boolean} [enemyWriter] whether this instance changes the enemy
     * @returns {MemberPostEffect|null} null when it does not apply
     */
    deliveredPostEffect(effect, source, receiver, enemyWriter = false) {
        let team = this.team;
        let view = this.withProgram(team.sourceView(source, team.resolveFull(receiver).settings));
        if (!effect.isActive(view)) {
            return null;
        }
        if (team.yields(source, effect, receiver.char.getId())) {
            team.recordYielded(effect, source, receiver.char.getId());
            return null;
        }
        team.recordSource(effect, source, receiver.char.getId());

        return new MemberPostEffect(effect, makeSourceData(team.processedStats(source), view, team.processedStats(receiver)), {
            read: team.slotOf(source),
            write: team.slotOf(receiver),
            receiver: team.slotOf(receiver),
        }, this.slot, enemyWriter);
    }

    /**
     * Multipliers the member receives. Only this member's features are
     * compiled in its programs, so teammates' multipliers matter only when
     * they are delivered to it.
     *
     * @returns {Array.<FeatureMultiplier>}
     */
    multipliers() {
        let team = this.team;
        let viewed = this.member;
        let receiverSettings = team.resolveFull(viewed).settings;
        let result = [];

        for (let name of MEMBER_OBJECTS) {
            if (!viewed[name]) continue;
            for (let item of viewed[name].getMultipliers()) {
                if (!reachesSource(item)) continue;
                let yielded = team.yields(viewed, item, viewed.char.getId());
                if (getStackKey(item) && item.isActive({settings: receiverSettings})) {
                    if (yielded) team.recordYielded(item, viewed, viewed.char.getId());
                    else team.recordSource(item, viewed, viewed.char.getId());
                }
                if (!yielded) result.push(item);
            }
        }

        for (let source of team.getSources()) {
            if (source === viewed) continue;

            let sourceData = null;
            for (let name of MEMBER_OBJECTS) {
                if (!source[name]) continue;

                for (let item of source[name].getMultipliers()) {
                    if (!reachesOthers(item)) continue;

                    sourceData ||= makeSourceData(team.processedStats(source), this.withProgram(team.sourceView(source, receiverSettings)));
                    if (!item.isActive(sourceData)) continue;
                    if (team.yields(source, item, viewed.char.getId())) {
                        team.recordYielded(item, source, viewed.char.getId());
                        continue;
                    }
                    team.recordSource(item, source, viewed.char.getId());

                    result.push(new DeliveredMultiplier(item, sourceData, team.slotOf(source), this.slot));
                }
            }
        }

        return result.concat(DB.CalcData.Multipliers);
    }

    /**
     * Attach the source scope of every teammate that delivers features to
     * the member (see Team/DeliveredFeature). Like the scopes of delivered
     * post-effects, it is the source's full pass with the member as the
     * receiver.
     *
     * @param {BuildData} data data of the member
     * @returns {BuildData}
     */
    attachFeatureSources(data) {
        let team = this.team;
        let sources = {};
        for (let source of team.getSources()) {
            if (source === this.member || featuresDeliveredBy(source).length == 0) continue;
            sources[source.getSourceId()] = this.withProgram(team.sourceView(source, data.settings));
        }
        data.settings[SOURCES] = sources;
        return data;
    }
}

/**
 * Features a member delivers to its teammates.
 *
 * @param {CalcSet} member
 * @returns {Array.<Feature2>}
 */
export function featuresDeliveredBy(member) {
    let result = [];
    for (let name of MEMBER_OBJECTS) {
        if (!member[name]) continue;

        for (let feature of member[name].getFeatures()) {
            if (reachesOthers(feature)) result.push(feature);
        }
    }
    return result;
}

/**
 * A multiplier delivered by a teammate, as the receiver's features see it.
 * It is computed entirely in its source scope: its level and its tree come
 * from the source's data, and the tree reads the source member's stats.
 * Only feature matching (isMatchFeature, isMatchOption) is about the
 * receiver: it decides which of the receiver's features the multiplier
 * applies to.
 *
 * It offers exactly what features ask of a multiplier (Feature2.getMultipliers
 * and the trees of damage, heal and shield features), each in its scope;
 * anything else is not part of a delivered multiplier and fails instead of
 * silently reading the receiver.
 */
export class DeliveredMultiplier {
    /**
     * @param {FeatureMultiplier} multiplier
     * @param {BuildData} sourceData the source's stats and its scope for the receiver
     * @param {number} sourceSlot
     * @param {number} viewSlot the receiver, whose program it is compiled in
     */
    constructor(multiplier, sourceData, sourceSlot, viewSlot) {
        this.multiplier = multiplier;
        this.sourceData = sourceData;
        this.slots = {read: sourceSlot, write: viewSlot, receiver: viewSlot};
        this.viewSlot = viewSlot;
        // What it is, not whose data it reads: the features it targets
        // (features match their options and tags), the stat it scales on,
        // its delivery and stacking (Team/Receivers, Team/Stacking).
        this.target = multiplier.target;
        this.scaling = multiplier.scaling;
        this.receivers = multiplier.receivers;
        this.stack = multiplier.stack;
        this.stackScope = multiplier.stackScope;
    }

    getName() {
        return this.multiplier.getName();
    }

    /**
     * @returns {boolean} true: it was checked in its source's scope when delivered
     */
    isActive() {
        return true;
    }

    isMatchFeature(feature, data) {
        return this.multiplier.isMatchFeature(feature, data);
    }

    isMatchOption(option) {
        return this.multiplier.isMatchOption(option);
    }

    /**
     * @returns {number} its talent level, the source's
     */
    getLevel() {
        return this.multiplier.getLevel(this.sourceData);
    }

    /**
     * @returns {CBlock} its tree, addressed into the receiver's program
     */
    getTree() {
        let tree = addressTree(this.multiplier.getTree(this.sourceData), this.slots, this.viewSlot);
        // Whose multiplier it is, for the damage graph (DamageGraph); not compiled.
        tree.origin = {multiplier: this.multiplier, slot: this.slots.read};
        return tree;
    }
}

/**
 * @param {Array.<CalcSet|null>} slots
 * @param {Array.<LegacyEntry>} legacy
 * @param {CalcSet|LegacyEntry} source
 * @returns {number} a member's slot, a legacy entry's address after the
 *     slots, or -1
 */
function sourceSlot(slots, legacy, source) {
    let slot = slots.indexOf(source);
    if (slot >= 0) {
        return slot;
    }
    let index = legacy.indexOf(source);
    return index < 0 ? -1 : slots.length + index;
}

function makeSourceData(stats, settings, receiverStats = stats) {
    let data = new BuildData();
    data.stats = stats;
    data.settings = settings;
    // The tree reads live namespaced stats. This snapshot supplies the right
    // values if a receiver read is later folded into a compile-time constant.
    data.receiverStats = receiverStats;
    return data;
}

/**
 * A post-effect evaluated for a member other than the viewed one, or
 * delivered from one member to another. Its tree is built by the source
 * member, then addressed into the program's view (Team/Namespace). What it
 * writes on the enemy (Team/EnemyStats) is written by one instance of the
 * effect only (enemyWriter): the enemy is one for the team.
 */
export class MemberPostEffect {
    /**
     * @param {PostEffect} effect
     * @param {BuildData} sourceData source stats (processed) and source scope settings
     * @param {{read: number, write: number, receiver: number}} slots members
     *     its reads, its receiver-scope reads and its writes address
     * @param {number} viewSlot the program's member
     * @param {boolean} [enemyWriter] whether this instance changes the enemy
     */
    constructor(effect, sourceData, slots, viewSlot, enemyWriter = true) {
        this.effect = effect;
        this.sourceData = sourceData;
        this.slots = slots;
        this.viewSlot = viewSlot;
        this.enemyWriter = enemyWriter;
        this.params = effect.params;
    }

    isActive() {
        return true;
    }

    getPriority() {
        return this.effect.getPriority();
    }

    getTree(data, opts) {
        let trees = this.effect.getTree(this.sourceData, opts);
        if (!this.enemyWriter) {
            trees = trees.filter((tree) => !(tree.stat && tree.stat.startsWith(ENEMY_PREFIX)));
        }
        return trees.map((tree) => addressTree(tree, this.slots, this.viewSlot));
    }

    getData(stats, settings) {
        return this.effect.getData(this.sourceData.stats, this.sourceData.settings);
    }
}

/**
 * @param {BuildSettings} a
 * @param {BuildSettings} b
 * @returns {boolean} whether both hold the same settings
 */
function sameSettings(a, b) {
    let keys = Object.keys(a);
    if (keys.length != Object.keys(b).length) {
        return false;
    }
    return keys.every((key) => Object.is(a[key], b[key]) || JSON.stringify(a[key]) === JSON.stringify(b[key]));
}
