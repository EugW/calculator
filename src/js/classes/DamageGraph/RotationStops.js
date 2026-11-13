import { DamageGraph } from "../DamageGraph";
import { getActiveFeature, getReactionName, hitData } from "../Feature2/Rotation/Tree";
import { RotationCompiler } from "../RotationCompiler";

/**
 * The hits of a team's rotation as the stops of its damage graph. Every hit
 * has a graph of its own (DamageGraph): its member's feature, in the team as
 * it is at the hit's point of the rotation. The rotation is compiled once,
 * with every state keeping its team (RotationCompiler, keepTeams).
 *
 * A stop is a hit that deals damage. A hit whose member or feature is
 * missing, or whose feature is not active at its point, is left out. A hit
 * in an uptime block is a stop in each branch that happens (with the block's
 * conditions, and without them); a hit in a repeat block is one stop.
 *
 * Sources keep their keys from stop to stop (StatContributions.idOf): what
 * is turned off in one graph is the same source in the next.
 */
export class RotationStops {
    /**
     * @param {Team} team
     */
    constructor(team) {
        /**
         * In the rotation's order. blocks: the blocks the hit is in, the
         * outermost first, {type: 'repeat', count} or {type: 'uptime', on,
         * percent: the share of the branch}; the hits of one block share the
         * array. hit: the compiled hit. result: the hit as the Rotation list
         * shows it (its values, its element, whether it reacts).
         *
         * @type {Array.<{index: number, slot: number, charId: number, feature: string, reaction: string, count: number, blocks: Array.<Object>, hit: Object, result: FeatureResult}>}
         */
        this.stops = [];
        this.ids = new Map();
        this.views = new Map();

        let compiled = new RotationCompiler(team, {keepTeams: true}).compile();
        if (compiled) {
            this.collect(compiled.items, []);
        }
    }

    collect(items, blocks) {
        for (let item of items) {
            if (item.type == 'feature') {
                let data = hitData(item);
                let feature = getActiveFeature(item.feature, data);
                if (!feature) continue;

                this.stops.push({
                    index: this.stops.length,
                    slot: item.slot,
                    charId: item.charId,
                    feature: item.featureName,
                    reaction: getReactionName(item),
                    count: item.count,
                    blocks: blocks,
                    hit: item,
                    result: feature.getResult(data)[feature.getName()],
                });
            } else if (item.type == 'repeat') {
                this.collect(item.items, blocks.concat([{type: 'repeat', count: item.count}]));
            } else if (item.type == 'uptime') {
                // As the rotation counts them: a branch that never happens has no hits.
                for (let [branch, on, percent] of [[item.on, true, item.percent], [item.off, false, 100 - item.percent]]) {
                    if (percent > 0) {
                        this.collect(branch, blocks.concat([{type: 'uptime', on, percent}]));
                    }
                }
            }
        }
    }

    /**
     * @param {Object} stop
     * @returns {DamageGraph} the graph of the stop's hit
     */
    graph(stop) {
        let state = stop.hit.state;
        let view = this.views.get(state);
        if (!view) {
            view = state.team.view();
            this.views.set(state, view);
        }

        return new DamageGraph(view.member(state.team.getMember(stop.slot)), stop.feature, {
            reaction: stop.reaction,
            hit: {insideBlock: stop.hit.insideBlock},
            ids: this.ids,
        });
    }
}
