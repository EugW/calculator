import React, { Suspense, lazy } from 'react';

import '../../../css/Components/DamageGraph.css';

import { DamageGraph } from '../../classes/DamageGraph';
import { RotationStops } from '../../classes/DamageGraph/RotationStops';
import { Feature2 } from '../../classes/Feature2';
import { waitForCondition } from '../../Utils';
import { DialogContainer } from '../Components/Dialog/Container';
import { BASIS } from '../Components/DamageGraph/Display';
import { memberName, t } from '../Components/DamageGraph/Labels';
import { FeatureName } from '../Components/FeatureName';
import { Dropdown } from '../Components/Inputs/Dropdown';
import { reactionLabel } from '../Components/Rotation/List';
import { Lang } from '../Lang';
import { Modal } from '../Modal';
import { REACTION_ITEMS } from '../Tab/Features';

let lang = new Lang();

// The graph's views load when the window first opens.
const GraphView = lazy(() => import(/* webpackChunkName: "damage-graph" */ '../Components/DamageGraph/GraphView'));

/**
 * The damage graph of a feature (Features tab, Details): the feature's
 * formula with every stat traced to where it comes from, across the team
 * (classes/DamageGraph). A window of its own: the graph needs the width.
 *
 * The Rotation tab opens it for the team's rotation (showRotation): the
 * graph of one hit at a time, in the team as it is at that hit.
 */
export class DamageGraphModal extends Modal {
    createContent() {
        return (
            <DamageGraphWindow
                ref={(obj) => this.modal = obj}
                app={this.app}
            />
        );
    }

    showRotation() {
        waitForCondition(
            () => {return this.modal;},
            () => {this.modal.showRotation();},
        );
    }
}

class DamageGraphWindow extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isVisible: false,
            feature: '',
            reaction: '',
            // The team's rotation instead of a feature: its hits, and the one shown.
            isRotation: false,
            rotation: null,
            stop: 0,
            graph: null,
            error: false,
            off: new Set(),
            expanded: new Set(),
            selected: null,
            basis: 'average',
        };

        this.handlers = {
            toggle: (key) => this.setState((state) => {
                let off = new Set(state.off);
                if (off.has(key)) off.delete(key); else off.add(key);
                return {off};
            }),
            expand: (laneId) => this.setState((state) => {
                let expanded = new Set(state.expanded);
                if (expanded.has(laneId)) expanded.delete(laneId); else expanded.add(laneId);
                let selected = state.selected && state.selected.startsWith('build:') ? null : state.selected;
                return {expanded, selected};
            }),
            select: (id) => this.setState({selected: id}),
        };
        // The page's width changes with the window and with its scrollbar,
        // which comes and goes after the page lays itself out.
        this.pageObserver = new ResizeObserver(() => {
            if (this.state.isVisible) this.forceUpdate();
        });
    }

    componentDidMount() {
        this.pageObserver.observe(document.documentElement);
    }

    componentWillUnmount() {
        this.pageObserver.disconnect();
    }

    /**
     * The window is as wide as the page allows: the page's width without its
     * scrollbar (100vw includes it), less room for the dialog's padding and
     * its corner ornaments, which stand 16px outside it. Wider, the page
     * scrolls. Narrow layouts size dialogs in CSS.
     *
     * @returns {number}
     */
    dialogWidth() {
        return Math.max(600, document.documentElement.clientWidth - 100);
    }

    /**
     * @param {string} feature feature name
     * @param {string} [reaction]
     */
    show(feature, reaction) {
        this.setState({isVisible: true, isRotation: false, rotation: null}, () => this.open(feature, reaction || ''));
    }

    /**
     * The team's rotation, a hit at a time (DamageGraph/RotationStops),
     * from its first hit. Effects turned off and builds expanded stay so
     * from hit to hit.
     */
    showRotation() {
        let rotation = null;
        let error = false;
        try {
            rotation = new RotationStops(this.props.app.team);
        } catch (e) {
            console.error(e);
            error = true;
        }
        this.setState({
            isVisible: true, isRotation: true, rotation, stop: 0, graph: null, error,
            off: new Set(), expanded: new Set(), selected: null,
        }, () => this.openStop(0));
    }

    /**
     * @param {number} index a hit of the rotation
     */
    openStop(index) {
        let rotation = this.state.rotation;
        let stop = rotation && rotation.stops[index];
        if (!stop) return;

        let graph = null;
        let error = false;
        try {
            graph = rotation.graph(stop);
        } catch (e) {
            console.error(e);
            error = true;
        }
        this.setState({stop: index, graph, error});
    }

    open(feature, reaction) {
        let graph = null;
        let error = false;
        try {
            graph = new DamageGraph(this.props.app.view(), feature, {reaction});
        } catch (e) {
            console.error(e);
            error = true;
        }
        this.setState({feature, reaction, graph, error, off: new Set(), expanded: new Set(), selected: null});
    }

    handleClose() {
        this.setState({isVisible: false, graph: null, rotation: null});
    }

    featureItems() {
        return Feature2.buildDropdown(this.props.app.view(), {checkCallback: (feature) => feature.hasDetails()});
    }

    /**
     * What the window shows of the viewed member: a feature and a reaction,
     * chosen here.
     *
     * @returns {{key: string, title: string, selectors: Object}} the key of
     *     the graph's view, the result's title, the controls that choose
     */
    featureSubject() {
        let items = this.featureItems();
        let item = items.find((entry) => entry.value == this.state.feature);
        return {
            key: this.state.feature + '|' + this.state.reaction,
            title: item ? item.text.replace(/^• /, '') : lang.get('feature_' + this.state.feature),
            selectors: (
                <>
                    <Dropdown
                        portal
                        items={items}
                        selected={this.state.feature}
                        onChange={(entry) => this.open(entry.value, this.state.reaction)}
                    />
                    <Dropdown
                        portal
                        items={REACTION_ITEMS}
                        selected={this.state.reaction}
                        onChange={(entry) => this.open(this.state.feature, entry.value)}
                    />
                </>
            ),
        };
    }

    /**
     * What the window shows of the rotation: one of its hits, chosen from
     * the list of them or stepped to from the hit before it or after it.
     *
     * @returns {{key: string, title: string, selectors: Object, message: string}}
     *     as featureSubject; the message of a rotation without hits
     */
    rotationSubject() {
        let stops = this.state.rotation ? this.state.rotation.stops : [];
        let stop = stops[this.state.stop];
        if (!stop) {
            return {key: '', title: '', selectors: null, message: t('graph_rotation_empty')};
        }

        let index = stop.index;
        let note = [t('graph_step_of').replace('{x}', index + 1).replace('{y}', stops.length)].concat(stop.blocks.map(blockText));
        return {
            key: 'stop|' + index,
            title: lang.get('feature_' + stop.feature),
            selectors: (
                <>
                    <Dropdown
                        portal
                        portalClassName="dg-stops"
                        items={stopItems(stops)}
                        selected={index}
                        onChange={(entry) => this.openStop(entry.value)}
                    />
                    <div className="dg-stepper">
                        <button title={t('graph_step_prev')} aria-label={t('graph_step_prev')} disabled={index == 0} onClick={() => this.openStop(index - 1)}>
                            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
                        </button>
                        <div className="dg-step-note">{note.join(' · ')}</div>
                        <button title={t('graph_step_next')} aria-label={t('graph_step_next')} disabled={index == stops.length - 1} onClick={() => this.openStop(index + 1)}>
                            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
                        </button>
                    </div>
                </>
            ),
        };
    }

    render() {
        let content = null;
        if (this.state.isVisible) {
            let graph = this.state.graph;
            let subject = this.state.isRotation ? this.rotationSubject() : this.featureSubject();
            let controls = !subject.selectors ? null : (
                <div className="dg-panel dg-controls">
                    {subject.selectors}
                    {graph?.hasCrit ? (
                        <div className="dg-seg" role="group" aria-label={t('graph_impact_on')}>
                            <span className="dg-seg-label">{t('graph_impact_on')}</span>
                            <div className="dg-seg-buttons">
                                {BASIS.map((name) => (
                                    <button key={name} aria-pressed={this.state.basis == name} onClick={() => this.setState({basis: name})}>
                                        {t('graph_result_' + name)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    {this.state.off.size ? (
                        <button className="dg-button" onClick={() => this.setState({off: new Set()})}>{t('graph_reset')}</button>
                    ) : null}
                </div>
            );

            // Two columns: the graph at full height, then controls, results and the inspector.
            content = (
                <div className="dg-window">
                    {this.state.error || !graph ? (
                        <EmptyGraph controls={controls} message={this.state.error ? t('graph_error') : subject.message || ''} />
                    ) : (
                        <Suspense fallback={<EmptyGraph controls={controls} message="" />}>
                            <GraphView
                                key={subject.key}
                                graph={graph}
                                controls={controls}
                                off={this.state.off}
                                expanded={this.state.expanded}
                                selected={this.state.selected}
                                basis={graph.hasCrit ? this.state.basis : 'normal'}
                                resultTitle={subject.title}
                                handlers={this.handlers}
                            />
                        </Suspense>
                    )}
                </div>
            );
        }

        return (
            <DialogContainer
                addClass="damage-graph-dialog"
                width={this.dialogWidth()}
                isVisible={this.state.isVisible}
                title={t(this.state.isRotation ? 'graph_rotation_title' : 'graph_title')}
                closeCallback={() => this.handleClose()}
                maxHeight={true}
            >
                {content}
            </DialogContainer>
        );
    }
}

/**
 * The hits of a rotation as the items of a dropdown, numbered in the
 * rotation's order: a caption where the hits of a block start (and where
 * those of the block around it go on), the block's hits under it.
 *
 * @param {Array.<Object>} stops RotationStops.stops
 * @returns {Array.<Object>}
 */
function stopItems(stops) {
    let items = [];
    let blocks = null;
    for (let stop of stops) {
        if (stop.blocks !== blocks) {
            blocks = stop.blocks;
            if (blocks.length) {
                items.push({isCaption: true, value: 'blocks_' + stop.index, text: blocks.map(blockText).join(' · ')});
            }
        }

        items.push({value: stop.index, text: <StopText stop={stop} />, isFeature: true, isSubitem: blocks.length > 0});
    }
    return items;
}

/**
 * A hit as the list names it: its number, its member, the feature and the
 * reaction in the colors the Rotation list gives them, its count.
 */
function StopText({stop}) {
    let reaction = reactionLabel(stop.hit.reaction, stop.result);
    return (
        <>
            {(stop.index + 1) + '. ' + memberName(stop.hit.state.team.getMember(stop.slot)) + ': '}
            <FeatureName text={lang.get('feature_' + stop.feature)} result={stop.result} />
            {reaction ? <>{' ('}<span className={'dg-stop-reaction ' + reaction.className}>{reaction.text}</span>{')'}</> : null}
            {stop.count != 1 ? ' ×' + stop.count : null}
        </>
    );
}

/**
 * @param {Object} block a block a hit is in (RotationStops.stops)
 * @returns {string} "Repeat 3 times", "With buffs: 60%"
 */
function blockText(block) {
    if (block.type == 'repeat') {
        return lang.get('rotation_view.repeat_text').replace('{x}', block.count);
    }
    return t(block.on ? 'graph_uptime_on' : 'graph_uptime_off').replace('{x}', block.percent);
}

/**
 * The window without a graph: loading, an error, or a rotation without hits.
 */
function EmptyGraph({controls, message}) {
    return (
        <>
            <div className="dg-canvas dg-empty">{message}</div>
            <div className="dg-side">{controls}</div>
        </>
    );
}
