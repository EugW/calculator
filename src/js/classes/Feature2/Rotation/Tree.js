import { makeRoyalAverageCrit, variableName } from "../Compile/Helpers";
import { getUsedStats } from "../Compile/Stats";
import { CIsolatedBlock, CMulti, CStatIncrease, CSubtract, CVar, CVarIncrease } from "../Compile/Types/Block";
import { CDamageRotation } from "../Compile/Types/Damage";
import { CConst, CVarValue } from "../Compile/Types/Item";
import { FeatureCompiler } from "../Compiler";
import { Stats } from "../../Stats";
import { moveTree } from "../../Team/Namespace";

const reactions = ['', 'melt', 'vaporize', 'quicken'];

/**
 * The program of a compiled team rotation (RotationCompiler) for one
 * member, the viewer.
 *
 * The program's input is the viewer's data at the start of the rotation. At
 * each state the viewer's stats change to the state's (the difference is
 * added to the program's stats, so the stats the optimizer varies stay
 * variables), and the state's post-effects apply to the hits after it. A hit
 * is built with its member's data at its state and moved into the viewer's
 * program namespace (Team/Namespace.moveTree).
 */
export class Feature2RotationTree {
    /**
     * @param {Array} items compiled items
     * @param {Object} opts {viewerSlot, counts: function(hit): boolean, ignoreSideEffects}
     */
    constructor(items, opts) {
        this.items = items;
        this.opts = Object.assign({}, opts);
        this.viewerSlot = this.opts.viewerSlot;
        this.counts = this.opts.counts || (() => true);
    }

    getTree(origData, usedStats) {
        // Only hits of this element or damage type (a Features tab row).
        this.filter = origData.settings ? origData.settings.rotation_include : '';

        let [blocks, totalNormal, totalCrit, totalAverage] = this.processBlock(this.items, origData, {
            usedStats: usedStats,
        }, null);

        return new CDamageRotation(blocks, {vars: [
            new CVarValue({ref: totalNormal}),
            new CVarValue({ref: totalCrit}),
            new CVarValue({ref: totalAverage})
        ]});
    }

    /**
     * @param {Array} items
     * @param {BuildData} origData the viewer's data where the block starts
     * @param {Object} opts
     * @param {BuildData|null} entry the viewer's data in the state the block starts in
     */
    processBlock(items, origData, opts, entry) {
        let totalNormal = new CVar([new CConst({value: 0})], {name: 'total_normal'});
        let totalCrit = new CVar([new CConst({value: 0})], {name: 'total_crit'});
        let totalAverage = new CVar([new CConst({value: 0})], {name: 'total_average'});

        let blocks = [
            totalNormal,
            totalCrit,
            totalAverage,
        ];

        let data = origData.clone();
        let current = entry;
        let filter = this.filter;
        let curentItems = [];
        let curentCondItems = [];
        let currentPost = [];

        items = reorderItems(items);

        if (!this.opts.ignoreSideEffects) {
            opts = copyOptsStats(opts);
        }

        for (let item of items) {
            if (item.type == 'feature') {
                if (!this.counts(item)) { continue; }

                let memberData = hitData(item);
                let activeFeature = getActiveFeature(item.feature, memberData);
                if (!activeFeature) { continue; }

                if (filter) {
                    let element = activeFeature.getElement(memberData);
                    let damageType = activeFeature.getDamageType();

                    if (filter != element && filter != damageType) {
                        continue;
                    }
                }

                let featureTree = moveTree(activeFeature.getTree(memberData), item.slot, this.viewerSlot);
                statReplace(featureTree, opts);

                if (featureTree.getType() == 'damage_contribution_result') {
                    // A hit the team deals together: its three results are
                    // ranked inside it (CDamageContribution).
                    let vars = featureTree.makeVars();
                    curentItems = curentItems.concat(vars.blocks);
                    for (let [value, total] of [[vars.normal, totalNormal], [vars.crit, totalCrit], [vars.average, totalAverage]]) {
                        curentItems.push(new CVarIncrease([
                            new CMulti([
                                new CConst({value: item.count, comment: 'rotation_hit_count'}),
                                new CVarValue({ref: value}),
                            ]),
                        ], {ref: total}));
                    }
                    continue;
                }

                let normalDmgItems = [
                    new CConst({value: item.count, comment: 'rotation_hit_count'}),
                    new CMulti(featureTree.items),
                ];

                let hitMulti = activeFeature.getRotationHitMiltiplier(memberData);
                if (typeof hitMulti === 'object') {
                    let hitTree = moveTree(hitMulti, item.slot, this.viewerSlot);
                    statReplace(hitTree, opts);
                    normalDmgItems.push(hitTree);
                } else if (hitMulti != 1) {
                    normalDmgItems.push(
                        new CConst({value: hitMulti, comment: 'rotation_hit_multi'})
                    );
                }

                let varNormal = new CVar([new CMulti(normalDmgItems)], {name: 'normal'});
                let varChance = new CVar([featureTree.critRate], {name: 'crit_rate'});
                let varCdmg = new CVar([featureTree.critDmg], {name: 'crit_dmg'});
                let varCritHit = new CVar([
                    new CMulti([
                        new CVarValue({ref: varNormal}),
                        new CVarValue({ref: varCdmg}),
                    ])
                ], {name: 'crit_hit'});

                let varsBlock = [];
                if (featureTree.royalCrit) {
                    [varsBlock, varChance] = makeRoyalAverageCrit(varChance, featureTree.royalCrit);
                }

                if (varsBlock.length > 0) {
                    curentItems = curentItems.concat(varsBlock);
                }

                curentItems.push(varNormal);
                curentItems.push(varChance);
                curentItems.push(varCdmg);
                curentItems.push(varCritHit);

                curentItems.push(new CVarIncrease([
                    new CVarValue({ref: varNormal}),
                ], {ref: totalNormal}));

                curentItems.push(new CVarIncrease([
                    new CVarValue({ref: varCritHit}),
                ], {ref: totalCrit}));

                curentItems.push(new CVarIncrease([
                    new CMulti([
                        new CVarValue({ref: varNormal}),
                        new CSubtract([
                            new CConst({value: 1}),
                            new CVarValue({ref: varChance}),
                        ]),
                    ]),
                    new CMulti([
                        new CVarValue({ref: varCritHit}),
                        new CVarValue({ref: varChance}),
                    ]),
                ], {ref: totalAverage}));
            } else if (item.type == 'state') {
                if (curentItems.length || curentCondItems.length || currentPost.length) {
                    let isolated = createIsolatedBlock(curentItems, curentCondItems, currentPost, opts);
                    if (isolated) {
                        blocks.push(isolated);
                    }
                    curentItems = [];
                    curentCondItems = [];
                    currentPost = [];
                }

                // The viewer's stats change to the state's.
                let next = item.members.get(this.viewerSlot);
                let changes = current ? Stats.diff(current.stats, next.stats) : new Stats();
                for (let stat of Object.keys(changes)) {
                    if (/^text_/.test(stat) || typeof changes[stat] != 'number') continue;

                    let statOpts = {stat: stat};

                    if (opts.copyStats) {
                        let oldStat = getOldStatName(opts, stat);
                        let newStat = getNewStatName(stat);
                        statOpts = {stat: oldStat, newName: newStat};
                        opts.stats[stat] = newStat;
                    }

                    curentCondItems.push(
                        new CStatIncrease([
                            new CConst({value: changes[stat]})
                        ], statOpts)
                    );
                }

                current = next;
                data = next.clone();
                let changeStats = opts && opts.stats ? Object.keys(opts.stats) : [];

                // The state's post-effects apply to the hits after it.
                for (let postItem of data.getActivePostEffects()) {
                    if (!postItem.getTree) {
                        continue;
                    }

                    for (let itemTree of postItem.getTree(data, opts)) {
                        if (changeStats.includes(itemTree.stat)) {
                            itemTree.stat = opts.stats[itemTree.stat];
                        }

                        statReplace(itemTree, opts);
                        currentPost.push(itemTree);
                    }
                }
            } else if (item.type == 'repeat') {
                if (curentItems.length || curentCondItems.length || currentPost.length) {
                    let isolated = createIsolatedBlock(curentItems, curentCondItems, currentPost, opts);
                    if (isolated) {
                        blocks.push(isolated);
                    }
                    curentItems = [];
                    curentCondItems = [];
                    currentPost = [];
                }

                let [repBlocks, repNormal, repCrit, repAverage] = this.processBlock(item.items, data, copyOptsStats(opts), current);

                curentItems.push(createIsolatedBlock([
                    ...repBlocks,
                    ...[[repNormal, totalNormal], [repCrit, totalCrit], [repAverage, totalAverage]].map((i) => {
                        let [rep, total] = i;
                        return new CVarIncrease([
                            new CMulti([
                                new CConst({value: item.count}),
                                new CVarValue({ref: rep}),
                            ]),
                        ], {ref: total});
                    }),
                ], [], [], opts));
            } else if (item.type == 'uptime') {
                if (curentItems.length || curentCondItems.length || currentPost.length) {
                    let isolated = createIsolatedBlock(curentItems, curentCondItems, currentPost, opts);
                    if (isolated) {
                        blocks.push(isolated);
                    }
                    curentItems = [];
                    curentCondItems = [];
                    currentPost = [];
                }

                // The block's hits with its conditions for the uptime, and
                // without them for the rest.
                for (let [branch, ratio] of [[item.on, item.percent / 100], [item.off, 1 - item.percent / 100]]) {
                    if (ratio <= 0) continue;

                    let [repBlocks, repNormal, repCrit, repAverage] = this.processBlock(branch, data, copyOptsStats(opts), current);

                    curentItems.push(createIsolatedBlock([
                        ...repBlocks,
                        ...[[repNormal, totalNormal], [repCrit, totalCrit], [repAverage, totalAverage]].map((i) => {
                            let [rep, total] = i;
                            return new CVarIncrease([
                                new CMulti([
                                    new CConst({value: ratio}),
                                    new CVarValue({ref: rep}),
                                ]),
                            ], {ref: total});
                        }),
                    ], [], [], opts));
                }
            }
        }

        if (curentItems.length || curentCondItems.length || currentPost.length) {
            let isolated = createIsolatedBlock(curentItems, curentCondItems, currentPost, opts);
            if (isolated) {
                blocks.push(isolated);
            }
        }

        return [blocks, totalNormal, totalCrit, totalAverage];
    }
}

/**
 * A hit's data: its member's data at its state, with the hit's reaction.
 *
 * @param {Object} hit a compiled hit
 * @returns {BuildData} a copy
 */
export function hitData(hit) {
    let data = hit.state.members.get(hit.slot).clone();
    data.settings.reaction = getReactionName(hit);
    if (hit.insideBlock) {
        data.settings.inside_rotation_block = 1;
    }
    return data;
}

/**
 * A hit the whole team deals (Feature2/Reaction/Team): it counts in the
 * team's total and in no member's own.
 *
 * @param {Array.<Feature2>} features the features of a hit
 * @returns {boolean}
 */
export function isTeamHit(features) {
    return features.some((feature) => feature.isTeamHit());
}

/**
 * Call a function for every hit of compiled items, blocks included.
 *
 * @param {Array} items
 * @param {function(Object)} callback
 */
export function forEachHit(items, callback) {
    for (let item of items) {
        if (item.type == 'feature') {
            callback(item);
        } else if (item.type == 'repeat') {
            forEachHit(item.items, callback);
        } else if (item.type == 'uptime') {
            forEachHit(item.on, callback);
            forEachHit(item.off, callback);
        }
    }
}

function createIsolatedBlock(features, cond, post, opts) {
    if (features.length == 0 && cond.length == 0) {
        return null;
    }

    let usedStats = getUsedStats(...features);
    let result = features;

    let filtered = FeatureCompiler.filterPostByStats(post, usedStats);
    if (filtered.length) {
        let [assign, revert] = FeatureCompiler.postTreeBlocks(filtered);
        result = [
            ...assign,
            new CIsolatedBlock(result),
            ...revert,
        ];
    }

    if (cond.length) {
        result = [
            ...cond,
            ...result,
        ];
    }

    return new CIsolatedBlock(result);
}


export function getReactionName(item) {
    return reactions[item.reaction || 0];
}

export function getActiveFeature(features, data) {
    features = Array.isArray(features) ? features : [features];

    for (let feature of features) {
        if (feature.isActive(data) && feature.usedInRotation()) {
            return feature;
        }
    }
}

function reorderItems(items) {
    let result = [];
    let accum = [];

    for (let item of items) {
        if (item.type == 'feature') {
            result.push(item);
        } else if (item.type == 'state') {
            if (accum) {
                result = result.concat(accum);
                accum = [];
            }
            result.push(item);
        } else if (item.type == 'repeat') {
            // push all blocks after single features
            accum.push(item);
        } else if (item.type == 'uptime') {
            // push all blocks after single features
            accum.push(item);
        }
    }

    if (accum) {
        result = result.concat(accum);
    }

    return result;
}

function copyOptsStats(opts) {
    let n = Object.assign({}, opts);
    n.stats = {};
    n.copyStats = true;

    if (opts.stats) {
        for (let stat of Object.keys(opts.stats)) {
            n.stats[stat] = opts.stats[stat];
        }
    }

    return n;
}

function getOldStatName(opts, stat) {
    if (!opts.stats) return stat;
    return opts.stats[stat] || stat;
}

function getNewStatName(stat) {
    return variableName(stat);
}

function statReplace(tree, opts) {
    if (opts.stats) {
        let changeStats = Object.keys(opts.stats);
        tree.walk((item) => {
            if (item.getType() == 'item_stat_total') {
                for (let stat of [item.stat, item.stat +'_base', item.stat +'_percent']) {
                    if (changeStats.includes(stat)) {
                        if (!item.replace) item.replace = {};
                        item.replace[stat] = opts.stats[stat];
                    }
                }
            } else if (item.stat) {
                if (changeStats.includes(item.stat)) {
                    item.stat = opts.stats[item.stat];
                }
            }
        });
    }
}
