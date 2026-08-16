import { getUsedStats } from "../Feature2/Compile/Stats";
import { CBlock } from "../Feature2/Compile/Types";
import { FeatureCompiler } from "../Feature2/Compiler";
import { PostEffect } from "../PostEffect";
import { Stats } from "../Stats";
import { BuildSettings } from "./Settings";

export class BuildData {
    constructor(settings, stats) {
        this.stats = new Stats(stats);
        this.settings = new BuildSettings(settings);
        this.multipliers = [];
        this.postEffects = [];
    }

    /**
     * @param {Stats} data
     */
    addStats(data) {
        this.stats.concat(data);
    }

    /**
     * @param {BuildSettings} data
     */
    addSettings(data) {
        this.settings.concat(data);
    }

    /**
     * @returns {Array.<PostEffect>}
     */
    getActivePostEffects() {
        return this.postEffects.filter((i) => {return i.isActive(this.settings);});
    }

    /**
     * @returns {Array.<CBlock[]>}
     */
    getActivePostEffectsTree() {
        let items = this.getActivePostEffects();
        let result = [];

        for (let item of items) {
            if (!item.getTree) {
                continue;
            }

            for (let itemTree of item.getTree(this)) {
                result.push(itemTree);
            }
        }

        return result;
    }

    applyPostEffects(opts) {
        for (let treeItems of this.postEffectTreeByPriority()) {
            let compiler = new FeatureCompiler(new CBlock([]), treeItems);
            let statFunc = compiler.compilePostTree({dontProcessStats: true});

            if (statFunc) {
                this.stats.ensure(compiler.usedStats);
                this.stats.ensure(compiler.assignedStats);
                statFunc(this.stats);
            }
        }

        this.postEffects = [];
    }

    postEffectByPriority(opts) {
        opts = Object.assign({}, opts);

        let items = this.getActivePostEffects();
        let byPriority = {};

        for (let item of items) {
            let priority = item.getPriority();
            if (opts.maxPriority && priority > opts.maxPriority) {
                continue;
            }

            if (!byPriority[priority]) {
                byPriority[priority] = [];
            }

            byPriority[priority].push(item);
        }

        let result = [];
        for (let priority of Object.keys(byPriority).sort((a, b) => {return Number(a) - Number(b);})) {
            result.push(byPriority[priority]);
        }
        return result;
    }

    postEffectTreeByPriority(opts) {
        let itemsAll = this.postEffectByPriority(opts);
        let result = [];

        for (let items of itemsAll) {
            let priorityItems = [];
            for (let post of items) {
                priorityItems = priorityItems.concat(post.getTree(this));
            }
            result.push(priorityItems);
        }

        return result;
    }

    getResistance(element) {
        return this.settings.get('enemy_res_'+ element) + this.stats.get('enemy_res_'+ element) * 100;
    }

    clone() {
        let data = new BuildData(this.settings, this.stats);
        data.postEffects = [].concat(this.postEffects);
        data.multipliers = [].concat(this.multipliers);
        return data;
    }
}

export function filterPostEffectTreeByStats(items, us) {
    return getPostEffectStatDependencyClosure(items, us).items;
}

/**
 * Select the post effects that can influence the requested final stats and
 * return every stat needed to evaluate those effects.
 *
 * Priorities are traversed backwards because a later effect can depend on a
 * stat changed by an earlier effect. Effects in one priority are evaluated
 * from the same pre-priority state, so dependencies discovered in a priority
 * become eligible only for earlier priorities.
 *
 * @param {Array.<Array>} items post-effect trees grouped in execution order
 * @param {Array.<string>} targetStats final stats needed by the caller
 * @returns {{items: Array, usedStats: Array.<string>}}
 */
export function getPostEffectStatDependencyClosure(items, targetStats) {
    let usedStats = new Set(targetStats || []);
    let selectedByPriority = new Array((items || []).length);

    for (let i = (items || []).length - 1; i >= 0; --i) {
        let priorityItems = items[i] || [];
        let selected = [];

        for (let item of priorityItems) {
            let assignedStats = item.getAssignedStats
                ? item.getAssignedStats()
                : (item.stat ? [item.stat] : []);

            if (assignedStats.some((stat) => {return usedStats.has(stat);})) {
                selected.push(item);
            }
        }

        // postTreeBlocks evaluates all values in a priority before applying
        // any assignment, so do not let one selected item pull in a sibling.
        for (let item of selected) {
            for (let stat of getUsedStats(item)) {
                usedStats.add(stat);
            }
        }

        selectedByPriority[i] = selected;
    }

    return {
        items: selectedByPriority.flat(),
        usedStats: [...usedStats],
    };
}
