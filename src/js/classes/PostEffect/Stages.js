import { CHANNELS, statKind } from "./Channels";

/**
 * The order of post-effects, derived from what they read and write
 * (md/buff_chains.md). Every post-effect registers when it is created. An
 * effect runs after every effect that writes what it reads: a premod read
 * waits for premod writers only, a total read for all writers. Stage 1 is
 * reserved for fixed-stage effects (set bonuses); derived stages start at 2.
 *
 * The graph is over stat kinds, not members: an edge between two members'
 * effects only orders them more strictly than needed. Effects that depend on
 * each other in a cycle share one stage and read the stats from before it,
 * as effects of one priority always did.
 */

export const FIRST_DERIVED_STAGE = 2;

const effects = new Set();
const readOnly = new WeakSet();
let version = 0;
let cache = null;

/**
 * @param {PostEffect} effect
 */
export function registerPostEffect(effect) {
    effects.add(effect);
    ++version;
}

/**
 * An effect that is never applied as a post-effect of its own (a cap, a
 * display value): it has a stage, but it writes nothing others wait for.
 *
 * @param {PostEffect} effect
 */
export function markReadOnly(effect) {
    readOnly.add(effect);
    ++version;
}

/**
 * @param {PostEffect} effect
 * @returns {number} its stage
 */
export function derivedStage(effect) {
    if (!cache || cache.version != version) {
        cache = {version, stages: computeStages()};
    }
    let stage = cache.stages.get(effect);
    if (stage === undefined) {
        // Not registered (created before the registry, or a wrapper).
        registerPostEffect(effect);
        return derivedStage(effect);
    }
    return stage;
}

/**
 * @returns {Array.<Array.<PostEffect>>} effects that share a stage because
 *     they depend on each other, for the DB test
 */
export function stageCycles() {
    let {components} = orderGraph([...effects]);
    return components.filter((component) => component.length > 1);
}

function computeStages() {
    let list = [...effects];
    let {components, preds} = orderGraph(list);
    let stages = new Map();

    // Components come predecessors first.
    for (let component of components) {
        let fixed = component.map((effect) => effect.getFixedStage()).find((stage) => stage);
        let stage = fixed || FIRST_DERIVED_STAGE;
        if (!fixed) {
            for (let effect of component) {
                for (let pred of preds.get(effect)) {
                    if (component.includes(pred)) continue;
                    stage = Math.max(stage, stages.get(pred) + 1);
                }
            }
        }
        for (let effect of component) {
            stages.set(effect, effect.getFixedStage() || stage);
        }
    }
    return stages;
}

function orderGraph(list) {
    let writers = new Map();
    for (let effect of list) {
        if (readOnly.has(effect)) continue;
        let channel = effect.getWrites();
        for (let stat of effect.getWriteStats()) {
            let kind = statKind(stat);
            if (!writers.has(kind)) writers.set(kind, []);
            writers.get(kind).push({effect, channel});
        }
    }

    let preds = new Map();
    for (let effect of list) {
        let result = new Set();
        let reads = effect.getReads();
        for (let stat of effect.getReadStats()) {
            for (let writer of writers.get(statKind(stat)) || []) {
                if (writer.effect === effect) continue;
                if (reads == CHANNELS.PREMOD && writer.channel != CHANNELS.PREMOD) continue;
                result.add(writer.effect);
            }
        }
        preds.set(effect, [...result]);
    }

    return {components: tarjan(list, preds), preds};
}

/**
 * Strongly connected components (Tarjan), iterative. Edges point at
 * predecessors, so a component is emitted after every component it depends
 * on: the result is in dependency order.
 */
function tarjan(list, preds) {
    let index = new Map();
    let low = new Map();
    let onStack = new Set();
    let stack = [];
    let components = [];
    let counter = 0;

    for (let root of list) {
        if (index.has(root)) continue;
        let work = [[root, 0]];
        index.set(root, counter);
        low.set(root, counter);
        ++counter;
        stack.push(root);
        onStack.add(root);

        while (work.length) {
            let frame = work[work.length - 1];
            let [node, i] = frame;
            let next = preds.get(node);
            if (i < next.length) {
                frame[1] = i + 1;
                let pred = next[i];
                if (!index.has(pred)) {
                    index.set(pred, counter);
                    low.set(pred, counter);
                    ++counter;
                    stack.push(pred);
                    onStack.add(pred);
                    work.push([pred, 0]);
                } else if (onStack.has(pred)) {
                    low.set(node, Math.min(low.get(node), index.get(pred)));
                }
                continue;
            }

            work.pop();
            if (work.length) {
                let parent = work[work.length - 1][0];
                low.set(parent, Math.min(low.get(parent), low.get(node)));
            }
            if (low.get(node) == index.get(node)) {
                let component = [];
                let item;
                do {
                    item = stack.pop();
                    onStack.delete(item);
                    component.push(item);
                } while (item !== node);
                components.push(component);
            }
        }
    }

    return components;
}
