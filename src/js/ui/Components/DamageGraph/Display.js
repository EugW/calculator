import { bareStat } from "../../../classes/DamageGraph";
import { isPercent } from "../../../classes/Stats";
import {
    deltaClass, formatDelta, formatNumber, formatParts, formatValue, formatWeight, formulaText,
    memberName, nodeTitle, rowLabel, sourceInfo, statLabel, t, totalLabel,
} from "./Labels";

const LANE_COLORS = ['var(--dg-l1)', 'var(--dg-l2)', 'var(--dg-l3)', 'var(--dg-l4)'];
export const BASIS = ['normal', 'average', 'crit'];

/**
 * @param {DamageGraph} graph
 * @param {string} laneId
 * @returns {string} CSS color of a lane; the formula and the result are the viewed member's
 */
export function laneColor(graph, laneId) {
    if (laneId == 'team') return 'var(--dg-team)';
    if (laneId == 'enemy') return 'var(--dg-enemy)';
    let slot = laneId.startsWith('slot') ? Number(laneId.slice(4)) : graph.viewSlot;
    return LANE_COLORS[slot % LANE_COLORS.length];
}

/**
 * @param {DamageGraph} graph
 * @param {Object} node
 * @returns {string} CSS color of a node, its rows and its edges: its lane's; a
 *     formula node of one member (a contribution) has its member's
 */
export function nodeColor(graph, node) {
    return laneColor(graph, node.owner || node.lane);
}

function ownerLane(graph, laneId) {
    return laneId == 'formula' || laneId == 'result' ? 'slot' + graph.viewSlot : laneId;
}

/**
 * Upstream and downstream of the selected node.
 */
export function selectionOf(view, selected) {
    if (!selected || !view.nodes.some((node) => node.id == selected)) {
        return {selected: null, onPath: () => true, edgeOnPath: () => false};
    }
    let into = new Map(), out = new Map();
    for (let edge of view.edges) {
        if (!into.has(edge.to)) into.set(edge.to, []);
        if (!out.has(edge.from)) out.set(edge.from, []);
        into.get(edge.to).push(edge.from);
        out.get(edge.from).push(edge.to);
    }
    let reach = (adjacency) => {
        let seen = new Set([selected]);
        let stack = [selected];
        while (stack.length) {
            for (let next of adjacency.get(stack.pop()) || []) {
                if (!seen.has(next)) {
                    seen.add(next);
                    stack.push(next);
                }
            }
        }
        return seen;
    };
    let up = reach(into), down = reach(out);
    return {
        selected,
        up,
        down,
        onPath: (id) => up.has(id) || down.has(id),
        edgeOnPath: (from, to) => (up.has(from) && up.has(to)) || (down.has(from) && down.has(to)),
    };
}

/**
 * @param {Object} add {stat, value}
 * @returns {string} "+48% ATK", "359 Base ATK"
 */
function formatAdd(add) {
    let stat = bareStat(add.stat);
    let percent = isPercent(stat);
    let text = formatValue(add.value, percent);
    if (!/_base$/.test(stat) && add.value > 0) text = '+' + text;
    return text + ' ' + statLabel(stat);
}

/**
 * The result of a reaction the team deals together, as a table: a
 * contributor per row, a result per column. A cell is the contributor's
 * weight in that result and what it adds to it; a column adds up to its
 * result. Without a CRIT and with everyone's a contributor has one rank; on
 * average its weight is the mean of its weights over the CRIT combinations.
 *
 * @param {DamageGraph} graph
 * @param {Object} node the result node, of DamageGraph.view()
 * @param {Map.<string, Object>} nodesById view nodes
 * @param {Object} evaluation DamageGraph.evaluate()
 * @param {Array.<Object>} results the results as the node shows them: {name, label, value, delta}
 * @param {Object} selection selectionOf()
 * @returns {{columns: Array.<string>, rows: Array.<Object>, totals: Array.<Object>, totalLabel: string}}
 */
function rankingTable(graph, node, nodesById, evaluation, results, selection) {
    let parts = evaluation.formulas.get(node.id).parts;
    return {
        columns: results.map((item) => item.label),
        rows: node.rows.map((row) => ({
            id: row.id,
            label: rowLabel(row, node, nodesById, graph),
            color: nodeColor(graph, nodesById.get(row.from)),
            dim: !!selection.selected && !selection.edgeOnPath(row.from, node.id),
            cells: results.map((item) => ({
                weight: formatWeight(parts[row.part][item.name].weight),
                value: formatNumber(parts[row.part][item.name].share),
            })),
        })),
        totals: results,
        totalLabel: totalLabel(),
    };
}

function isOff(node, off) {
    return !!node && !!node.sourceKey && off.has(node.sourceKey);
}

/**
 * What the graph shows for a state: node data, edges (from a node to the
 * row it feeds), lanes and the result.
 *
 * @param {Object} args
 * @returns {Object}
 */
export function displayModel({graph, view, evaluation, impacts, baseline, off, expanded, selection, basis, resultTitle, handlers}) {
    let nodesById = new Map(view.nodes.map((node) => [node.id, node]));
    let values = evaluation.values;
    let basisName = t('graph_result_' + basis).toLowerCase();

    let impactOf = (node) => {
        let impact = impacts.get(node.id);
        if (!impact) return null;
        let ratio = impact[basis];
        return {
            text: formatDelta(ratio) + ' ' + basisName + (impact.turningOn ? ' ' + t('graph_if_on') : ''),
            cls: deltaClass(ratio),
            title: impact.turningOn ? t('graph_if_turned_on') : t('graph_without'),
        };
    };
    let toggleOf = (node) => node.toggle ? {on: !off.has(node.sourceKey), onToggle: () => handlers.toggle(node.sourceKey)} : null;

    let className = (node, extra) => ['dg-node', 'dg-' + node.kind, extra,
        selection.selected && !selection.onPath(node.id) ? 'dim' : '',
        selection.selected == node.id ? 'sel' : '',
        isOff(node, off) ? 'off' : ''].filter(Boolean).join(' ');

    let rowsOf = (node) => node.rows.map((row) => {
        if (row.kind != 'edge') {
            return {id: row.id, handle: false, base: true, label: rowLabel(row, node, nodesById, graph), value: formatValue(row.value, row.percent)};
        }
        let from = nodesById.get(row.from);
        return {
            id: row.id,
            handle: true,
            label: rowLabel(row, node, nodesById, graph),
            value: row.parts ? formatParts(row, node) : formatValue(values.get(row.from) || 0, from.percent),
            dim: !!selection.selected && !selection.edgeOnPath(row.from, node.id),
            off: isOff(from, off),
            color: nodeColor(graph, from),
        };
    });

    let nodeData = new Map();
    for (let node of view.nodes) {
        let color = nodeColor(graph, node);
        if (node.kind == 'source') {
            let info = sourceInfo(node);
            nodeData.set(node.id, {
                className: className(node, node.group ? 'dg-build' : ''),
                color,
                title: info.title,
                tag: info.tag,
                subtitle: info.subtitle,
                chips: node.adds.map(formatAdd),
                toggle: toggleOf(node),
                impact: impactOf(node),
            });
        } else if (node.kind == 'result') {
            let names = graph.hasCrit ? BASIS : ['normal'];
            let results = names.map((name) => ({
                name,
                label: graph.hasCrit ? t('graph_result_' + name) : t('graph_result_value'),
                value: formatNumber(evaluation.result[name]),
                delta: off.size ? {text: formatDelta(evaluation.result[name] / baseline[name] - 1), cls: deltaClass(evaluation.result[name] / baseline[name] - 1)} : null,
            }));
            // A reaction the team deals together: its contributions, ranked.
            let ranked = node.formula == 'ranking';
            nodeData.set(node.id, {
                className: className(node, ranked ? 'dg-ranked' : ''),
                title: resultTitle,
                rows: rowsOf(node),
                results,
                ranking: ranked ? rankingTable(graph, node, nodesById, evaluation, results, selection) : null,
            });
        } else {
            nodeData.set(node.id, {
                className: className(node),
                color,
                title: nodeTitle(node, graph),
                value: formatValue(values.get(node.id) || 0, node.percent),
                formula: node.formula ? formulaText(evaluation.formulas.get(node.id)) : '',
                rows: rowsOf(node),
                toggle: toggleOf(node),
                impact: impactOf(node),
            });
        }
    }

    let edges = view.edges.map((edge) => {
        let from = nodesById.get(edge.from);
        let to = nodesById.get(edge.to);
        let fromLane = graph.lanes.find((lane) => lane.id == from.lane);
        let cross = fromLane?.kind == 'member' && from.lane != ownerLane(graph, to.lane);
        let hi = !!selection.selected && selection.edgeOnPath(edge.from, edge.to);
        return {
            id: edge.id,
            from: edge.from,
            to: edge.to,
            row: edge.row,
            hi,
            className: ['dg-edge', cross ? 'cross' : '', isOff(from, off) ? 'off' : '', hi ? 'hi' : (selection.selected ? 'dim' : '')].filter(Boolean).join(' '),
            color: nodeColor(graph, from),
        };
    });

    let lanes = new Map();
    for (let lane of graph.lanes) {
        let nodes = view.nodes.filter((node) => node.lane == lane.id);
        if (lane.kind != 'member' && !nodes.length) continue;
        let hasBuild = [...graph.nodes.values()].some((node) => node.lane == lane.id && node.group == 'build');
        lanes.set(lane.id, {
            lane,
            color: laneColor(graph, lane.id),
            name: lane.kind == 'member' ? memberName(lane.member) : t('graph_' + lane.kind),
            initials: lane.kind == 'team' ? 'T' : 'E',
            sub: laneLine(graph, lane),
            pills: lane.kind == 'member' ? [
                lane.viewed ? t('graph_viewing') : '',
                lane.member.team?.getOnFieldMember?.() === lane.member ? t('graph_on_field') : '',
            ].filter(Boolean) : [],
            expand: hasBuild ? {
                text: expanded.has(lane.id) ? t('graph_collapse_build') : t('graph_show_parts'),
                onClick: () => handlers.expand(lane.id),
            } : null,
            dim: !!selection.selected && !nodes.some((node) => selection.onPath(node.id)),
        });
    }

    return {
        view,
        nodeData,
        edges,
        lanes,
        formulaColor: laneColor(graph, 'formula'),
        captions: {lanes: t('graph_lanes_head'), formula: t('graph_formula'), result: t('graph_result')},
    };
}

function laneLine(graph, lane) {
    if (lane.kind == 'team') return t('graph_team_sub');
    if (lane.kind == 'enemy') {
        let level = graph.evaluation.enemy.settings.enemy_level;
        return level ? 'Lv' + level : '';
    }
    let member = lane.member;
    if (lane.legacy) {
        // An entry of the legacy source: its constellation or refinement.
        if (member.char) return 'C' + member.char.getLevels().constellation;
        return member.weapon ? 'R' + member.weapon.getLevels().refine : '';
    }
    let parts = [t('graph_slot') + ' ' + (lane.slot + 1), 'C' + member.char.getLevels().constellation];
    if (member.weapon.object) {
        parts.push(memberWeapon(member));
    }
    return parts.join(' · ');
}

function memberWeapon(member) {
    return sourceInfo({source: {kind: 'object', member, object: 'weapon'}}).title + ' R' + member.weapon.getLevels().refine;
}

