import { getUsedStats } from "../Feature2/Compile/Stats";
import { isPercent, Stats } from "../Stats";
import { enemyStatName } from "../Team/EnemyStats";
import { memberPrefix } from "../Team/Namespace";
import { MEMBER_OBJECTS } from "../Team/Evaluation";
import { SOURCE_KINDS } from "../Team/StatSources";

/**
 * What every stat of a member's program is made of, by source: the stage 0
 * sources of each member and of the enemy (Team/StatSources), in the
 * program's names and processed (percents as fractions), and what each
 * post-effect adds.
 *
 * A source is identified by a key that is the same wherever it adds stats: a
 * condition Escoffier delivers to every member is one source, and turning it
 * off removes it from every member (stats(off)).
 */
export class StatContributions {
    /**
     * @param {TeamEvaluation} evaluation a traced evaluation (TeamEvaluation.traced)
     * @param {CalcSet} viewed the member whose program it is
     * @param {BuildData} data the member's program data (MemberEvaluation.programData),
     *     before post-effects; it is not changed
     * @param {Map.<Object, number>} [ids] the numbers of items in keys (idOf),
     *     when graphs share them: a source then has one key in all of them
     *     (the hits of a rotation, DamageGraph/RotationStops)
     */
    constructor(evaluation, viewed, data, ids = new Map()) {
        this.evaluation = evaluation;
        this.viewSlot = evaluation.slotOf(viewed);
        this.data = data;
        this.ids = ids;
        /** @type {Map.<string, Object>} key -> source descriptor, see describe() */
        this.sources = new Map();
        /** @type {Map.<string, Array.<{key: string, value: number}>>} program stat -> contributions */
        this.byStat = new Map();
        /** @type {Map.<string, Array.<{stat: string, value: number}>>} key -> stage 0 stats it adds */
        this.stage0 = new Map();

        this.base = new Stats(data.stats);
        this.collectStage0();
        this.posts = this.collectPostEffects();
        this.final = this.stats(new Set(), true);
    }

    /**
     * @param {Object} item
     * @returns {number} a number identifying the item in keys
     */
    idOf(item) {
        if (!this.ids.has(item)) {
            this.ids.set(item, this.ids.size + 1);
        }
        return this.ids.get(item);
    }

    /**
     * @param {Object} entry a StatSources entry
     * @returns {Object} its source descriptor
     */
    describeEntry(entry) {
        let slot = entry.source ? this.evaluation.slotOf(entry.source) : null;
        let key;
        switch (entry.kind) {
            case SOURCE_KINDS.OBJECT:
                key = `object:${slot}:${entry.object}`;
                break;
            case SOURCE_KINDS.CONDITION:
                key = `condition:${slot}:${this.idOf(entry.item)}`;
                break;
            case SOURCE_KINDS.PARTY:
                key = `party:${this.idOf(entry.item)}`;
                break;
            default:
                key = entry.item ? `enemy:${this.idOf(entry.item)}` : 'enemy:base';
        }
        return {
            key,
            kind: entry.kind,
            slot,
            member: entry.source,
            object: entry.object || (entry.source && entry.item ? ownerObject(entry.source, entry.item, 'getConditions') : null),
            item: entry.item,
        };
    }

    /**
     * @param {Object} descriptor
     * @returns {Object} the registered descriptor for its key
     */
    register(descriptor) {
        if (!this.sources.has(descriptor.key)) {
            this.sources.set(descriptor.key, descriptor);
        }
        return this.sources.get(descriptor.key);
    }

    add(stat, key, value) {
        if (!value) return;
        let list = this.byStat.get(stat);
        if (!list) {
            list = [];
            this.byStat.set(stat, list);
        }
        let item = list.find((i) => i.key == key);
        if (item) {
            item.value += value;
        } else {
            list.push({key, value});
        }
    }

    addStage0(descriptor, stat, value) {
        this.add(stat, descriptor.key, value);
        let list = this.stage0.get(descriptor.key);
        if (!list) {
            list = [];
            this.stage0.set(descriptor.key, list);
        }
        list.push({stat, value});
    }

    collectStage0() {
        let evaluation = this.evaluation;
        for (let member of evaluation.getMembers()) {
            let prefix = memberPrefix(evaluation.slotOf(member), this.viewSlot);
            for (let entry of evaluation.sourcesOf(member).entries) {
                let descriptor = this.register(this.describeEntry(entry));
                for (let [stat, value] of Object.entries(entry.stats)) {
                    this.addStage0(descriptor, prefix + stat, processed(stat, value));
                }
            }
        }
        for (let entry of evaluation.enemySourcesOf().entries) {
            let descriptor = this.register(this.describeEntry(entry));
            for (let [stat, value] of Object.entries(entry.stats)) {
                this.addStage0(descriptor, enemyStatName(stat), processed(stat, value));
            }
        }
    }

    /**
     * Post-effects of the program, by priority, each tree with a value
     * function. They run as BuildData.applyPostEffects runs them: every tree
     * of a priority reads the stats as they were before that priority
     * (FeatureCompiler.postTreeBlocks; a tree has its effect's priority).
     *
     * @returns {Array.<Array.<{key: string, stat: string, value: Function, used: Array.<string>}>>}
     */
    collectPostEffects() {
        let data = this.data;
        let groups = [];
        for (let effects of data.postEffectByPriority()) {
            let group = [];
            for (let effect of effects) {
                let descriptor = this.register(this.describePostEffect(effect));
                for (let tree of effect.getTree(data)) {
                    if (!tree.stat) continue;
                    group.push({
                        key: descriptor.key,
                        stat: tree.stat,
                        value: Function('stats', 'return ' + tree.compile({})),
                        used: getUsedStats(tree),
                    });
                }
            }
            groups.push(group);
        }
        return groups;
    }

    /**
     * @param {PostEffect|MemberPostEffect} effect
     * @returns {Object} source descriptor
     */
    describePostEffect(effect) {
        let inner = effect.effect || effect;
        let slot = effect.slots ? effect.slots.read : this.viewSlot;
        let member = this.evaluation.sourceAt(slot);
        return {
            key: `post:${slot}:${this.idOf(inner)}`,
            kind: 'post',
            slot,
            member,
            object: member ? ownerObject(member, inner, 'getPostEffects') : null,
            item: inner,
        };
    }

    /**
     * The program's stats after post-effects, without the given sources.
     *
     * @param {Set.<string>} off keys of sources to leave out
     * @param {boolean} [record] record what each post-effect adds (once, for the full team)
     * @returns {Stats}
     */
    stats(off, record = false) {
        let stats = new Stats(this.base);
        for (let key of off) {
            for (let {stat, value} of this.stage0.get(key) || []) {
                stats[stat] = (stats[stat] || 0) - value;
            }
        }

        for (let group of this.posts) {
            for (let item of group) {
                stats.ensure(item.used);
                stats.ensure([item.stat]);
            }
            let values = group.map((item) => off.has(item.key) ? 0 : item.value(stats));
            group.forEach((item, i) => {
                stats[item.stat] += values[i];
                if (record) this.add(item.stat, item.key, values[i]);
            });
        }
        return stats;
    }

    /**
     * @param {string} stat a stat of the program
     * @returns {Array.<{key: string, value: number}>} what adds to it, in order
     */
    of(stat) {
        return this.byStat.get(stat) || [];
    }
}

/**
 * @param {string} stat unprocessed name
 * @param {number} value unprocessed
 * @returns {number} as programs hold it (Stats.processPercent)
 */
function processed(stat, value) {
    return isPercent(stat) ? value / 100 : value;
}

/**
 * @param {CalcSet} member
 * @param {Object} item a condition or post-effect of the member
 * @param {string} list 'getConditions' or 'getPostEffects'
 * @returns {string|null} the member object holding it
 */
export function ownerObject(member, item, list) {
    for (let name of MEMBER_OBJECTS) {
        let object = member[name];
        if (object && object[list] && object[list]().includes(item)) {
            return name;
        }
    }
    return null;
}
