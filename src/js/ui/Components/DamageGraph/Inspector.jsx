import React from 'react';

import { CONTRIBUTION_WEIGHTS } from '../../../classes/Feature2/Compile/Types/Damage';
import { nodeColor } from './Display';
import { deltaClass, formatDelta, formatValue, formulaText, memberName, nodeTitle, sourceInfo, t } from './Labels';
import { RankingTable } from './Nodes';

/**
 * Details of the selected node: what it is, its value and formula, what
 * turning it off changes, where it leads and what it is in the engine.
 */
export function Inspector(props) {
    let {graph, view, evaluation, impacts, off, selected, resultTitle, handlers} = props;
    let nodesById = new Map(view.nodes.map((node) => [node.id, node]));
    let node = selected ? nodesById.get(selected) : null;

    if (!node) {
        return (
            <div className="dg-inspector">
                <div className="dg-i-kind">{t('graph_title')}</div>
                <div className="dg-i-hint">{t('graph_select_hint')}</div>
            </div>
        );
    }

    let lane = graph.lanes.find((item) => item.id == (node.owner || (node.lane == 'formula' || node.lane == 'result' ? 'slot' + graph.viewSlot : node.lane)));
    let owner = lane?.kind == 'member' ? memberName(lane.member) : t('graph_' + (lane?.kind || 'team'));
    let title = nodeTitle(node, graph, resultTitle);
    let info = node.kind == 'source' ? sourceInfo(node) : null;
    let from = view.edges.filter((edge) => edge.to == node.id).map((edge) => edge.from);
    let into = view.edges.filter((edge) => edge.from == node.id).map((edge) => edge.to);
    let impact = impacts.get(node.id);
    let link = (id) => {
        let other = nodesById.get(id);
        return (
            <button key={id} className="dg-i-link" style={{'--lane': other.kind == 'result' ? 'var(--dg-result)' : nodeColor(graph, other)}} onClick={() => handlers.select(id)}>
                {nodeTitle(other, graph, resultTitle)}
            </button>
        );
    };

    return (
        <div className="dg-inspector">
            <div>
                <div className="dg-i-kind" style={{'--lane': nodeColor(graph, node)}}>
                    <span className="dg-dot" />
                    {t('graph_kind_' + (node.group == 'build' ? 'build' : node.kind))} · {owner}
                </div>
                <h3 className="dg-i-title">{info?.tag ? <span className="dg-tag">{info.tag}</span> : null}{title}</h3>
                {info?.subtitle ? <div className="dg-i-hint">{info.subtitle}</div> : null}
            </div>

            {node.kind == 'result' && !props.ranking ? <ResultSection graph={graph} evaluation={evaluation} /> : null}
            {node.kind != 'source' && node.kind != 'result' ? (
                <div className="dg-i-value">{formatValue(evaluation.values.get(node.id) || 0, node.percent)}</div>
            ) : null}
            {props.ranking ? (
                <RankingSection ranking={props.ranking} />
            ) : node.formula ? (
                <div className="dg-i-sec">
                    <h4>{t('graph_how')}</h4>
                    <div className="dg-i-code">{formulaText(evaluation.formulas.get(node.id))}</div>
                </div>
            ) : null}
            {node.kind == 'source' ? (
                <div className="dg-i-sec">
                    <h4>{t('graph_adds')}</h4>
                    <div className="dg-chips">{props.chips.map((chip, index) => <span key={index} className="dg-chip">{chip}</span>)}</div>
                </div>
            ) : null}

            {impact ? (
                <div className="dg-i-sec">
                    <h4>{impact.turningOn ? t('graph_if_turned_on') : t('graph_without')}</h4>
                    <div className="dg-i-impact">
                        {(graph.hasCrit ? ['normal', 'average', 'crit'] : ['normal']).map((name) => (
                            <div key={name}>
                                <span className="dg-i-l">{graph.hasCrit ? t('graph_result_' + name) : t('graph_result_value')}</span>
                                <span className={'dg-i-v ' + deltaClass(impact[name])}>{formatDelta(impact[name])}</span>
                            </div>
                        ))}
                    </div>
                    <div className="dg-i-row">
                        <button className="dg-button" onClick={() => handlers.toggle(node.sourceKey)}>
                            {off.has(node.sourceKey) ? t('graph_turn_on') : t('graph_turn_off')}
                        </button>
                        <span className="dg-i-hint">{t('graph_settings_kept')}</span>
                    </div>
                </div>
            ) : null}

            {isMergedBuild(node) ? (
                <div className="dg-i-sec">
                    <h4>{t('graph_parts')}</h4>
                    <div className="dg-i-links">
                        {node.parts.map((part) => <span key={part.id} className="dg-chip">{sourceInfo(part).title}</span>)}
                    </div>
                    <div><button className="dg-button" onClick={() => handlers.expand(node.lane)}>{t('graph_show_parts')}</button></div>
                </div>
            ) : null}

            <PathSection node={node} view={view} nodesById={nodesById} graph={graph} resultTitle={resultTitle} />
            {from.length ? <div className="dg-i-sec"><h4>{t('graph_comes_from')}</h4><div className="dg-i-links">{from.map(link)}</div></div> : null}
            {into.length ? <div className="dg-i-sec"><h4>{t('graph_feeds')}</h4><div className="dg-i-links">{into.map(link)}</div></div> : null}

            <div className="dg-i-sec">
                <h4>{t('graph_engine')}</h4>
                <div className="dg-i-code">{engineText(node, graph)}</div>
            </div>
        </div>
    );
}

function ResultSection({graph, evaluation}) {
    let r = evaluation.result;
    return (
        <div className="dg-i-results">
            {(graph.hasCrit ? ['normal', 'average', 'crit'] : ['normal']).map((name) => (
                <div key={name}>
                    <span className="dg-i-l">{graph.hasCrit ? t('graph_result_' + name) : t('graph_result_value')}</span>
                    <span className="dg-i-v">{formatValue(r[name], false)}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * How a reaction the team deals together ranks its contributions, for each
 * result: every contributor's weight over what it adds, then the result.
 */
function RankingSection({ranking}) {
    return (
        <div className="dg-i-sec">
            <h4>{t('graph_how')}</h4>
            <div className="dg-i-ranking">
                <RankingTable data={ranking} handles={false} />
            </div>
            <div className="dg-i-hint">{t('graph_ranking_note')}</div>
        </div>
    );
}

function PathSection({node, view, nodesById, graph, resultTitle}) {
    let out = new Map();
    for (let edge of view.edges) {
        if (!out.has(edge.from)) out.set(edge.from, []);
        out.get(edge.from).push(edge.to);
    }
    let previous = new Map([[node.id, null]]);
    let queue = [node.id];
    while (queue.length) {
        let id = queue.shift();
        if (id == 'result') break;
        for (let next of out.get(id) || []) {
            if (!previous.has(next)) {
                previous.set(next, id);
                queue.push(next);
            }
        }
    }
    if (!previous.has('result') || node.id == 'result') return null;
    let path = [];
    for (let id = 'result'; id !== null; id = previous.get(id)) path.unshift(id);
    return (
        <div className="dg-i-sec">
            <h4>{t('graph_path')}</h4>
            <div className="dg-i-path">
                {path.map((id, index) => (
                    <React.Fragment key={id}>
                        {index ? <span className="dg-arrow">→</span> : null}
                        <span>{nodeTitle(nodesById.get(id), graph, resultTitle)}</span>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

/**
 * @param {Object} node
 * @param {DamageGraph} graph
 * @returns {string} what the node is in the engine, for checking a value
 */
function engineText(node, graph) {
    if (node.kind == 'source') {
        let source = node.source;
        let lines = [];
        if (isMergedBuild(node)) {
            lines.push('objects: ' + node.parts.map((part) => part.source.object).join(', '));
        } else {
            // Class names are minified in production: name the item by its settings name or title.
            let item = source.item?.params?.name || source.item?.params?.title || '';
            lines.push([source.kind, source.object, item].filter(Boolean).join(' · '));
        }
        lines.push(node.adds.map((add) => `${add.stat} ${round(add.value)}`).join(', '));
        return lines.join('\n');
    }
    if (node.kind == 'total') {
        return node.totalStats ? `item_stat_total ${node.totalStats.flat}` : `item_stat ${node.valueStat}`;
    }
    let ast = node.ast;
    let lines = [];
    if (ast) lines.push(ast.getType() + (ast.comment ? ' · ' + ast.comment : ''));
    if (node.formula == 'ranking') lines.push('weights by rank: ' + CONTRIBUTION_WEIGHTS.join(', '));
    if (node.sourceKey) lines.push('DeliveredMultiplier · ' + node.sourceKey);
    if (node.kind == 'result') lines.push(graph.tree.getType() + ' → normal, crit, average');
    return lines.join('\n');
}

/**
 * A member's build shown as one node (DamageGraph.view): it has parts. Its
 * parts, shown when the lane is expanded, are build sources too, one object each.
 *
 * @param {Object} node
 * @returns {boolean}
 */
function isMergedBuild(node) {
    return node.source?.kind == 'build';
}

function round(value) {
    return Math.round(value * 10000) / 10000;
}
