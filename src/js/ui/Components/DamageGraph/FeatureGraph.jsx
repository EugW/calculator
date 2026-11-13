import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { t } from './Labels';
import { layoutGraph } from './Layout';
import { BandNode, CaptionNode, LaneNode, ResultNode, SourceNode, ValueNode } from './Nodes';
import { renderGraph } from './Render';
import { Viewport } from './Viewport';

let FileSaver = require('file-saver');

const FIT = {padding: 0.04, maxZoom: 1};
const ZOOM_STEP = 1.2;
const CAPTION_TOP = 8;
/** How far an edge's curve reaches out when its target is behind its source. */
const CURVATURE = 0.25;

/**
 * The damage graph canvas: the nodes of a display model
 * (Display.displayModel) in a viewport that pans and zooms (Viewport),
 * lanes behind them, edges in one SVG between.
 *
 * Nodes are drawn, measured with the dots of their input rows, then placed
 * (Layout.layoutGraph), all before the browser paints; the view is fitted
 * once per graph structure and again when the canvas is resized.
 *
 * @param {{model: Object, lanes: Array.<Object>, onSelect: Function, fileName: string}} props
 *     fileName: the name of the image the render button saves, without extension
 */
export function FeatureGraph({model, lanes, onSelect, fileName}) {
    const canvas = useRef(null);
    const viewport = useRef(null);
    const control = useRef(null);
    if (!control.current) control.current = new Viewport();
    const [placement, setPlacement] = useState(null);
    const [, setMeasureTick] = useState(0);
    const current = useRef(null);
    const fitted = useRef(null);

    // Before the first measure, which fits the view.
    useLayoutEffect(() => control.current.attach(canvas.current, viewport.current), []);

    // A resized window fits the graph again.
    useEffect(() => {
        let frame = 0;
        let observer = new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => control.current.fit(current.current?.bounds, FIT));
        });
        observer.observe(canvas.current);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, []);

    // Measure after every render: place the nodes when their sizes or dots moved.
    useLayoutEffect(() => {
        let measured = measure(viewport.current, control.current.k);
        let last = current.current;
        if (last && last.view === model.view && last.lanes === lanes && sameMeasures(last, measured)) return;

        let layout = layoutGraph(model.view, lanes, measured.sizes);
        let next = Object.assign({view: model.view, lanes, layout, bounds: boundsOf(layout, measured.sizes)}, measured);
        current.current = next;
        setPlacement(next);
        if (fitted.current !== model.view) {
            fitted.current = model.view;
            control.current.fit(next.bounds, FIT);
        }
    });

    // A node that changes size outside a render (a font loads) is measured again.
    useEffect(() => {
        let observer = new ResizeObserver((entries) => {
            let sizes = current.current?.sizes;
            let changed = entries.some((entry) => {
                let size = sizes?.get(entry.target.dataset.id);
                let target = entry.target;
                return !size || size.width != target.offsetWidth || size.height != target.offsetHeight;
            });
            if (changed) setMeasureTick((tick) => tick + 1);
        });
        for (let place of viewport.current.querySelectorAll(':scope > .dg-place[data-id]')) {
            observer.observe(place);
        }
        return () => observer.disconnect();
    }, [model.view]);

    let placed = placement && placement.view === model.view ? placement : null;

    return (
        <div
            ref={canvas}
            className="dg-canvas"
            onClickCapture={(event) => {
                if (control.current.takeDrag()) event.stopPropagation();
            }}
            onClick={(event) => {
                if (event.target.closest('.dg-zoom')) return;
                let node = event.target.closest('.dg-place[data-id]');
                onSelect(node ? node.dataset.id : null);
            }}
        >
            <div ref={viewport} className="dg-viewport">
                {placed ? <Background model={model} layout={placed.layout} /> : null}
                {placed ? <Edges edges={model.edges} placement={placed} /> : null}
                {model.view.nodes.map((node) => {
                    let Node = node.kind == 'source' ? SourceNode : node.kind == 'result' ? ResultNode : ValueNode;
                    let position = placed?.layout.positions.get(node.id);
                    return (
                        <div key={node.id} className="dg-place" data-id={node.id} style={position ? {transform: translate(position)} : null}>
                            <Node data={model.nodeData.get(node.id)} />
                        </div>
                    );
                })}
            </div>
            <Zoom
                control={control.current}
                bounds={() => current.current?.bounds}
                render={() => renderGraph(viewport.current, current.current.bounds, {background: getComputedStyle(canvas.current).backgroundColor})
                    .then((blob) => FileSaver.saveAs(blob, fileName.replace(/[\\/:*?"<>|]+/g, '').trim() + '.png'))}
            />
        </div>
    );
}

/**
 * Lanes, the formula band and the column captions, behind everything.
 */
function Background({model, layout}) {
    let bands = new Map(layout.bands.map((band) => [band.lane.id, band]));
    let formula = layout.formula;
    let result = [];
    for (let [laneId, data] of model.lanes) {
        let band = bands.get(laneId);
        if (!band) continue;
        result.push(
            <div key={'lane:' + laneId} className="dg-place" style={{transform: translate(band), width: band.width, height: band.height}}>
                <LaneNode data={data} />
            </div>
        );
    }
    result.push(
        <div key="band" className="dg-place" style={{transform: translate(formula), width: formula.width, height: formula.height}}>
            <BandNode data={{color: model.formulaColor}} />
        </div>
    );
    for (let [name, text] of Object.entries(model.captions)) {
        result.push(
            <div key={'caption:' + name} className="dg-place" style={{transform: translate({x: layout.columns[name] ?? 0, y: CAPTION_TOP})}}>
                <CaptionNode data={{text}} />
            </div>
        );
    }
    return result;
}

/**
 * Edges from a node's output dot to the dot of the row they feed; the
 * highlighted ones on top.
 */
function Edges({edges, placement}) {
    let point = (id, anchor) => {
        let position = placement.layout.positions.get(id);
        let offset = placement.anchors.get(id + '|' + anchor);
        return position && offset ? {x: position.x + offset.x, y: position.y + offset.y} : null;
    };
    let ordered = edges.filter((edge) => !edge.hi).concat(edges.filter((edge) => edge.hi));
    return (
        <svg className="dg-edges" aria-hidden="true">
            {ordered.map((edge) => {
                let from = point(edge.from, 'out');
                let to = point(edge.to, edge.row);
                if (!from || !to) return null;
                return <path key={edge.id} className={edge.className} style={{stroke: edge.color}} d={edgePath(from, to)} />;
            })}
        </svg>
    );
}

/**
 * Zoom in, out, fit; then render: the whole graph as a PNG at zoom 1.
 */
function Zoom({control, bounds, render}) {
    // 'busy' while the image is made, 'failed' after it could not be.
    const [state, setState] = useState('');
    let onRender = () => {
        if (state == 'busy' || !bounds()) return;
        setState('busy');
        render().then(() => setState(''), (error) => {
            console.error(error);
            setState('failed');
        });
    };
    let renderTitle = state == 'failed' ? t('graph_render_failed') : t('graph_render');

    return (
        <div className="dg-zoom">
            <button title={t('graph_zoom_in')} aria-label={t('graph_zoom_in')} onClick={() => control.zoomBy(ZOOM_STEP)}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
            </button>
            <button title={t('graph_zoom_out')} aria-label={t('graph_zoom_out')} onClick={() => control.zoomBy(1 / ZOOM_STEP)}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
            </button>
            <button title={t('graph_fit')} aria-label={t('graph_fit')} onClick={() => control.fit(bounds(), FIT)}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" /></svg>
            </button>
            <button className={'dg-render ' + state} title={renderTitle} aria-label={renderTitle} aria-busy={state == 'busy'} onClick={onRender}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13.5h10" /></svg>
            </button>
        </div>
    );
}

function translate({x, y}) {
    return `translate(${x}px, ${y}px)`;
}

/**
 * A cubic curve leaving to the right and entering from the left; its
 * control points are half the distance out, or pulled out when the target
 * is behind the source.
 */
function edgePath(from, to) {
    let pull = (distance) => distance >= 0 ? distance / 2 : CURVATURE * 25 * Math.sqrt(-distance);
    let offset = pull(to.x - from.x);
    return `M${from.x},${from.y} C${from.x + offset},${from.y} ${to.x - offset},${to.y} ${to.x},${to.y}`;
}

/**
 * Sizes of the nodes (layout pixels) and positions of their dots within
 * them: `<node id>|out` and `<node id>|<row id>`.
 *
 * @param {HTMLElement} element the viewport
 * @param {number} scale its current zoom
 */
function measure(element, scale) {
    let sizes = new Map(), anchors = new Map();
    for (let place of element.querySelectorAll(':scope > .dg-place[data-id]')) {
        let id = place.dataset.id;
        sizes.set(id, {width: place.offsetWidth, height: place.offsetHeight});
        let box = place.getBoundingClientRect();
        for (let dot of place.querySelectorAll('[data-anchor]')) {
            let rect = dot.getBoundingClientRect();
            anchors.set(id + '|' + dot.dataset.anchor, {
                x: (rect.left + rect.width / 2 - box.left) / scale,
                y: (rect.top + rect.height / 2 - box.top) / scale,
            });
        }
    }
    return {sizes, anchors};
}

function sameMeasures(a, b) {
    let same = (x, y, keys) => x.size == y.size && [...x].every(([id, value]) => {
        let other = y.get(id);
        return other && keys.every((key) => Math.abs(value[key] - other[key]) < 0.5);
    });
    return same(a.sizes, b.sizes, ['width', 'height']) && same(a.anchors, b.anchors, ['x', 'y']);
}

/**
 * @returns {{x: number, y: number, width: number, height: number}} what the view fits: lanes, the formula, nodes and captions
 */
function boundsOf(layout, sizes) {
    let rects = layout.bands.concat([layout.formula]);
    for (let [id, position] of layout.positions) {
        let size = sizes.get(id);
        if (size) rects.push({x: position.x, y: position.y, width: size.width, height: size.height});
    }
    let left = Math.min(...rects.map((rect) => rect.x));
    let top = Math.min(CAPTION_TOP, ...rects.map((rect) => rect.y));
    let right = Math.max(...rects.map((rect) => rect.x + rect.width));
    let bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
    return {x: left, y: top, width: right - left, height: bottom - top};
}
