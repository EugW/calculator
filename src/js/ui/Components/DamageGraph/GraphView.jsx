import React, { useMemo } from 'react';

import { Lang } from '../../Lang';
import { displayModel, selectionOf } from './Display';
import { FeatureGraph } from './FeatureGraph';
import { Inspector } from './Inspector';
import { deltaClass, formatDelta, formatNumber, formatPercent, memberName, t } from './Labels';

let lang = new Lang();

/**
 * The graph for one state: values with the sources that are off, impacts,
 * selection. Two columns of the window: the canvas, then the controls, the
 * results and the inspector.
 */
export default function GraphView({graph, controls, off, expanded, selected, basis, resultTitle, handlers}) {
    const view = useMemo(() => graph.view(expanded), [graph, expanded]);
    const baseline = useMemo(() => graph.evaluateResult(new Set()), [graph]);
    const evaluation = useMemo(() => graph.evaluate(off), [graph, off]);
    const impacts = useMemo(() => {
        let result = new Map();
        for (let node of view.nodes) {
            if (node.toggle) result.set(node.id, graph.impact(node.sourceKey, off, evaluation.result));
        }
        return result;
    }, [graph, view, off, evaluation]);
    const selection = useMemo(() => selectionOf(view, selected), [view, selected]);
    const model = useMemo(() => displayModel({
        graph, view, evaluation, impacts, baseline, off, expanded, selection, basis, resultTitle, handlers,
    }), [graph, view, evaluation, impacts, baseline, off, expanded, selection, basis, resultTitle, handlers]);

    return (
        <>
            <FeatureGraph
                model={model}
                lanes={graph.lanes}
                onSelect={handlers.select}
                fileName={memberName(graph.lanes.find((lane) => lane.viewed)?.member) + ' - ' + resultTitle}
            />
            <div className="dg-side">
                {controls}
                <Results graph={graph} evaluation={evaluation} baseline={baseline} changed={off.size > 0} />
                <Inspector
                    graph={graph}
                    view={view}
                    evaluation={evaluation}
                    impacts={impacts}
                    off={off}
                    selected={selection.selected}
                    resultTitle={resultTitle}
                    chips={selection.selected && model.nodeData.get(selection.selected)?.chips || []}
                    ranking={selection.selected && model.nodeData.get(selection.selected)?.ranking || null}
                    handlers={handlers}
                />
            </div>
        </>
    );
}

/**
 * The feature's result, all its variants at once: one row each, so any
 * number fits the side column.
 */
function Results({graph, evaluation, baseline, changed}) {
    let result = evaluation.result;
    let names = graph.hasCrit ? ['normal', 'average', 'crit'] : ['normal'];
    // A reaction the team deals together has no CRIT of its own: every
    // contributor's is on its node.
    let ownCrit = evaluation.values.has('factor:critRate');
    let critRate = evaluation.values.get('factor:critRate') ?? 0;
    let critDmg = evaluation.values.get('factor:critDmg') ?? 0;

    return (
        <div className="dg-panel dg-results">
            <div className={'dg-sum' + (changed ? ' changed' : '')}>
                {names.map((name) => {
                    let ratio = result[name] / baseline[name] - 1;
                    return (
                        <React.Fragment key={name}>
                            <span className="dg-sum-label">{graph.hasCrit ? t('graph_result_' + name) : t('graph_result_value')}</span>
                            <span className="dg-sum-value">{formatNumber(result[name])}</span>
                            {changed ? <span className={'dg-sum-delta ' + deltaClass(ratio)}>{formatDelta(ratio)}</span> : null}
                        </React.Fragment>
                    );
                })}
            </div>
            {graph.hasCrit && ownCrit ? (
                <div className="dg-result-sub">
                    {lang.get('stat.crit_rate')} {formatPercent(critRate)} · {lang.get('stat.crit_dmg')} {formatPercent(critDmg)}
                </div>
            ) : null}
        </div>
    );
}
