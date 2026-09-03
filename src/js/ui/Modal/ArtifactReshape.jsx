import React from 'react';
import { normalizeArtifactRVFilters } from '../../classes/ArtifactUsefulRV';
import { normalizePrepWorkers } from '../../classes/ArtifactActionPredictor';
import '../../../css/Components/Artifact.css';
import '../../../css/Components/Modal/ArtifactCraft.css';
import '../../../css/Components/Modal/ArtifactReshape.css';
import { Artifact } from '../../classes/Artifact';
import { Feature2 } from '../../classes/Feature2';
import { Stats } from '../../classes/Stats';
import { ACTION_SLOTS, getReshapeInputs, hallowedExegesisTransition, RESHAPE_COST } from '../../classes/ArtifactActionProbability';
import { artifactReshapeSources } from '../../classes/ArtifactReshapeSources';
import { WorkerFactoryArtifactActionPredictor } from '../../classes/WorkerFactory/ArtifactActionPredictor';
import { Accordion, AccordionItem } from '../Components/Accordion';
import { ArtifactActionAdvancedSettings, ArtifactActionProgress, ArtifactActionRVSummary, formatExpectedGain, formatExpectedGainPercent, mergeActionProgress } from '../Components/ArtifactActionControls';
import { ControlsBar, ControlsBarDivider } from '../Components/ControlsBar';
import { DialogContainer } from '../Components/Dialog/Container';
import { FullHeight, FullHeightScrollable, FullHeightStatic } from '../Components/FullHeight';
import { ArtifactSetIcon } from '../Components/Icons';
import { ArtifactListItem } from '../Components/Artifact';
import { Dropdown } from '../Components/Inputs/Dropdown';
import { TitledButton, ToggleRoundButton } from '../Components/Inputs/Buttons';
import { Lang } from '../Lang';
import { ArtifactActionOutcomesModal } from './ArtifactActionOutcomes';

const lang = new Lang();
const t = key => lang.get('artifact_action.' + key);
const statName = key => lang.get('stat.' + key) + (key.endsWith('_percent') ? ' %' : '');
const shortStatName = key => lang.get('stat_short.' + key);
const slotName = key => lang.get('artifact_set.' + key);
const pairName = pair => pair.map(statName).join(' / ');
const number = value => Number.isFinite(value) ? value.toLocaleString(undefined, {maximumFractionDigits: 2}) : '—';
const percent = value => number(value * 100) + '%';
const errorText = error => {
    const [code, ...details] = String(error).split(';');
    if (!/^(reshape_|action_)/.test(code)) return error;
    const text = t(code);
    // action_outcomes_too_large carries slot;entries;entryLimit;recipes.
    if (code === 'action_outcomes_too_large' && details.length === 4) {
        return text + ' (' + slotName(details[0]) + ': ' + number(Number(details[1])) + ' / ' + number(Number(details[2]))
            + ' ' + t('craft_outcomes').toLowerCase() + ' · ' + number(Number(details[3])) + ' ' + t('recipes') + ')';
    }
    return text;
};

export class ArtifactReshapeModal extends React.Component {
    constructor(props) {
        super(props);
        this.nextTargetId = 1;
        this.state = {isVisible: false, stage: 'parameters', feature: props.app.getFeature(), featureType: 'average',
            points: 0, trigger: 0, pairs: {}, preserveTopology: true, rvFilters: normalizeArtifactRVFilters(),
            targets: [], pickerOpen: false, progress: {}, result: null, historyEntry: null, error: ''};
        this.factory = new WorkerFactoryArtifactActionPredictor({
            callback: result => {
                this.factory.dispose();
                this.saveHistory(result);
                this.setState({result, outcomeRow: null, stage: 'results', progress: {}, historyEntry: null});
            },
            progressCallback: progress => this.setState(state => ({progress: mergeActionProgress(state.progress, progress)})),
            errorCallback: data => {
                this.factory.dispose();
                this.setState({stage: 'parameters', error: errorText(data.error), progress: {}});
            },
        });
    }
    componentWillUnmount() { this.factory.dispose(); }
    show() {
        this.factory.dispose();
        this.resultArtifacts = null;
        this.setState({isVisible: true, stage: 'parameters', feature: this.props.app.getFeature(),
            targets: ACTION_SLOTS.map(slot => ({id: slot, slot, origin: 'equipped'})), pairs: {}, pickerOpen: false,
            result: null, historyEntry: null, error: '', progress: {}});
    }
    close() {
        this.factory.dispose();
        this.resultArtifacts = null;
        this.setState({isVisible: false, stage: 'parameters', pickerOpen: false, result: null, historyEntry: null, progress: {}});
    }
    invalidate() {
        if (!this.state.isVisible || this.state.historyEntry) return;
        const stale = this.state.stage === 'progress' || this.state.result;
        this.factory.dispose();
        this.resultArtifacts = null;
        this.setState({stage: 'parameters', pickerOpen: false, result: null, progress: {}, error: stale ? t('stale') : '',
            feature: this.props.app.getFeature()});
    }
    change(values) { this.setState({...values, error: '', result: null}); }
    saveHistory(result) {
        const sources = this.resultArtifacts
            ? Array.from(this.resultArtifacts, ([id, artifact]) => [id, artifact.serialize()]) : [];
        this.props.app.storage.actionHistory.saveRun({kind: 'reshape', feature: this.state.feature,
            featureType: this.state.featureType, context: {sources}, result}).catch(() => {});
    }
    openHistoryEntry(entry, result) {
        this.showHistoryEntry(entry, result);
    }
    showHistoryEntry(entry, result) {
        if (!result) return;
        this.factory.dispose();
        const sources = entry.context?.sources || [];
        this.resultArtifacts = new Map();
        for (const [id, data] of sources) {
            try {
                const artifact = Artifact.deserialize([...data]);
                if (artifact) this.resultArtifacts.set(id, artifact);
            } catch (error) { /* fall back to equipped/empty cards below */ }
        }
        this.setState({isVisible: true, stage: 'results', result, outcomeRow: null, progress: {}, error: '',
            historyEntry: entry});
    }
    sources(state = this.state) {
        const equipped = this.props.app.getArtifacts();
        return artifactReshapeSources(state.targets.map(target => {
            const artifact = target.origin === 'equipped' ? equipped[target.slot]
                : this.props.app.storage.artifacts.getByHash(target.hash);
            return {...target, artifact: artifact || target.artifact,
                error: !artifact && target.origin === 'storage' ? 'reshape_source_unavailable' : undefined};
        }), state.pairs);
    }
    removeTarget(id) {
        if (!this.state.isVisible || this.state.stage !== 'parameters') return;
        this.setState(state => {
            const pairs = {...state.pairs};
            delete pairs[id];
            return {targets: state.targets.filter(target => target.id !== id), pairs, error: '', result: null};
        });
    }
    addTarget(artifact) {
        if (!this.state.isVisible || this.state.stage !== 'parameters' || !this.state.pickerOpen) return;
        const hash = artifact.getHash();
        const stored = this.props.app.storage.artifacts.getByHash(hash);
        try { getReshapeInputs(stored); } catch (error) { return; }
        this.setState(state => {
            if (this.sources(state).some(source => source.artifact?.getHash() === hash && !source.error)) return null;
            return {targets: state.targets.concat({id: 'candidate-' + this.nextTargetId++, slot: stored.slot,
                origin: 'storage', hash, artifact: stored.clone()}), error: '', result: null};
        });
    }
    canStart() {
        const {points, trigger} = this.state;
        return Number.isInteger(points) && points >= 0 && points <= 5
            && Number.isInteger(trigger) && trigger >= 0 && trigger <= 2 && this.sources().some(source => !source.error);
    }
    start() {
        if (!this.canStart() || this.state.stage === 'progress') return;
        let rvFilters;
        try { rvFilters = normalizeArtifactRVFilters(this.state.rvFilters); }
        catch (error) { this.setState({error: errorText(error.message)}); return; }
        const suggest = UI.BestArtifactTab.getSuggestData();
        if (!suggest?.settings || !Array.isArray(suggest.artifacts)) {
            this.setState({error: t('action_missing_filters')});
            return;
        }
        const sources = this.sources().filter(source => !source.error);
        const prepWorkers = normalizePrepWorkers(this.props.app.getSetting('artifact_action_workers'));
        this.resultArtifacts = new Map(sources.map(source => [source.id, source.artifact.clone()]));
        this.factory.dispose();
        this.setState({stage: 'progress', pickerOpen: false, historyEntry: null,
            progress: {phase: 'baseline', unit: 'artifacts', slotsCompleted: 0, slotsTotal: sources.length,
                workerCount: Math.min(prepWorkers, sources.length)}, result: null, error: ''});
        this.factory.run({kind: 'reshape', build: this.props.app.currentSet(), inventory: suggest.artifacts,
            optimizerSettings: suggest.settings, feature: this.state.feature, featureType: this.state.featureType,
            points: this.state.points, trigger: this.state.trigger,
            reshapeTargets: sources.map(source => ({id: source.id, artifact: source.artifact, selectedSubstats: source.selectedSubstats})),
            mode: 'full', pruneOutcomeSets: this.state.preserveTopology, rvFilters, prepWorkers,
            retainOutcomes: true, useGPU: true, gpuBatchSize: suggest.gpuBatchSize, showBeta: this.props.app.showBetaContent()});
    }
    renderParameters() {
        return <>
            <ControlsBar>
                <Dropdown barClass="resizable" items={Feature2.buildDropdown(this.props.app.currentSet())}
                    selected={this.state.feature} onChange={item => this.change({feature: item.value})} />
                <Dropdown barClass="feature-type" items={['normal', 'crit', 'average'].map(value => ({value, text: lang.get('pool_view.type_' + value)}))}
                    selected={this.state.featureType} onChange={item => this.change({featureType: item.value})} />
            </ControlsBar>
            <div className="reshape-meter">
                <span className="reshape-meter-title" title={t('reshape_note')}>{t('reshape_meter')}</span>
                <div className="reshape-meter-field" data-meter="points">
                    <span>{t('reshape_points')}</span>
                    <Dropdown portal ariaLabel={t('points')} items={[0, 1, 2, 3, 4, 5].map(value => ({value, text: value + ' / 6'}))}
                        selected={this.state.points} onChange={item => this.change({points: item.value})} />
                </div>
                <div className="reshape-meter-field" data-meter="trigger">
                    <span>{t('reshape_triggers')}</span>
                    <Dropdown portal ariaLabel={t('trigger')} items={[0, 1, 2].map(value => ({value, text: value + ' / 3'}))}
                        selected={this.state.trigger} onChange={item => this.change({trigger: item.value})} />
                </div>
            </div>
            <div className="craft-card-row">
                {this.sources().map(source => {
                    const {id, slot, artifact, inputs, selectedSubstats, error} = source;
                    const transition = hallowedExegesisTransition(this.state.points, this.state.trigger, slot);
                    return <ReshapeCard key={id} id={id} slot={slot} artifact={artifact} unavailable={!!error} onRemove={() => this.removeTarget(id)}>
                        <ReshapeSubstats artifact={artifact} selected={selectedSubstats} />
                        {error ? <Unavailable error={error} /> : <>
                            <div className="craft-affix reshape-pair">
                                <div className="craft-affix-label" title={t(inputs.lockedPair ? 'reshape_locked' : 'pair')}>{t(inputs.lockedPair ? 'reshape_locked' : 'pair')}</div>
                                {selectedSubstats.map((selected, index) => <div className="reshape-affix" data-affix={index} key={index}>
                                    <Dropdown disabled={!!inputs.lockedPair} portal portalClassName="craft-affix-popup"
                                        ariaLabel={slotName(slot) + ' · ' + t('minor_affix') + ' ' + (index + 1)}
                                        selectedText={selected ? statName(selected) : t('auto_affix')}
                                        selected={selected || ''}
                                        items={[...(inputs.lockedPair ? [] : [{value: '', text: t('auto_affix')}]),
                                            ...artifact.getSubStats().filter(sub => inputs.lockedPair ? sub.stat === selected
                                                : sub.stat !== selectedSubstats[1 - index])
                                                .map(sub => ({value: sub.stat, text: statName(sub.stat)}))]}
                                        onChange={item => this.change({pairs: {...this.state.pairs,
                                            [id]: selectedSubstats.map((stat, field) => field === index ? item.value || null : stat)}})} />
                                </div>)}
                            </div>
                            <div className="reshape-guarantee" title={t(transition.type)}>{t('reshape_' + transition.type)} · ≥{transition.floor}</div>
                            <div className="reshape-start-lines">{inputs.initialLines} {t('initial_lines')}</div>
                        </>}
                    </ReshapeCard>;
                })}
            </div>
            {!this.state.targets.length && <p className="craft-hint">{t('reshape_empty')}</p>}
            <ArtifactActionAdvancedSettings preserveTopology={this.state.preserveTopology} rvFilters={this.state.rvFilters}
                onChange={values => this.change(values)}>
                    <details className="reshape-help"><summary>{t('meter_help')}</summary><p>{t('reshape_note')}</p></details>
                    <details className="reshape-help"><summary>{t('method_title')}</summary>
                        <p>{t('method')}</p>
                        <p>{t('filters')}</p>
                    </details>
            </ArtifactActionAdvancedSettings>
        </>;
    }
    renderResults() {
        const {result} = this.state;
        const sourceArtifact = row => this.resultArtifacts?.get(row.targetId)
            || (!row.targetId ? this.props.app.getArtifacts()[row.slot] : undefined);
        return <>
            <div className="craft-result-summary"><span>{t('craft_baseline')}: {number(result.baseValue)}</span></div>
            <ArtifactActionRVSummary filters={result.rvFilters} />
            <div className="craft-card-row">
                {result.rows.map((row, index) => <ReshapeCard key={row.targetId || row.slot} id={row.targetId} slot={row.slot} artifact={sourceArtifact(row)}
                    rank={row.error ? null : index + 1} unavailable={!!row.error}
                    onSelect={row.outcomeDetails ? () => this.setState({outcomeRow: row.targetId || row.slot}) : undefined}>
                    <ReshapeSubstats artifact={sourceArtifact(row)} selected={row.pair} />
                    {row.error ? <Unavailable error={row.error} /> : <>
                        <div className="reshape-guarantee" title={t(row.transition.type)}>{t('reshape_' + row.transition.type)} · ≥{row.floor}</div>
                        <div className="craft-result-gain action-expected-gain" title={t('expected_gain')}>+{formatExpectedGainPercent(row.score)}</div>
                        <div className="craft-result-metric"><span>{t('craft_chance')}</span><span>{percent(row.improveChance)}</span></div>
                        <div className="craft-result-metric action-expected-gain"><span>{t('expected_gain')}</span><span>+{formatExpectedGain(row.absoluteGain)}</span></div>
                    </>}
                </ReshapeCard>)}
            </div>
            <Accordion defaultOpenedId="">
                <AccordionItem id="details" title={t('details')}>
                    {result.rows.filter(row => !row.error).map(row => <div className="craft-result-detail" key={row.targetId || row.slot} data-target={row.targetId}>
                        <strong>{result.rows.indexOf(row) + 1}. {slotName(row.slot)}</strong>
                        <span>{t('expected_gain')}: +{formatExpectedGain(row.absoluteGain)}</span>
                        <span>{t(row.transition.type)} · {t('after_meter')}: {row.transition.points}/6, {row.transition.trigger}/3</span>
                        <span>{t('optimizer_evaluations')}: {number(row.optimizerEvaluations)}</span>
                        <span>{t('outcome_count')}: {number(row.totalOutcomes)} · {t('combinations_per_outcome')}: {number(row.combinationsPerOutcome)}</span>
                        <span>{t('target_combinations')}: {BigInt(row.combinationTotal).toLocaleString()}</span>
                        {row.pilotSamples > 0 && <span>{t('pilot_samples')}: {number(row.pilotSamples)}</span>}
                        <span>{t('forced_mean')}: {number(row.forcedExpectedValue)} · {t('infeasible')}: {percent(row.infeasibleChance)}
                        {row.rescoreRejectedChance > 0 && <> ({t('rescore_rejected')}: {percent(row.rescoreRejectedChance)})</>}</span>
                        <details><summary>{t('alternatives')} ({row.recipesEvaluated})</summary>
                            {row.alternatives.map(item => <div key={item.pair.join('/')}>
                                {pairName(item.pair)}: +{formatExpectedGain(item.absoluteGain)} (+{formatExpectedGainPercent(item.score)}) · {percent(item.improveChance)}
                            </div>)}
                        </details>
                    </div>)}
                </AccordionItem>
            </Accordion>
        </>;
    }
    render() {
        const {isVisible, stage} = this.state;
        const outcomeRow = this.state.result?.rows.find(row => (row.targetId || row.slot) === this.state.outcomeRow);
        return <><DialogContainer addClass="artifact-action-modal artifact-reshape-modal" width={stage === 'progress' ? 500 : 1000}
            centered isVisible={isVisible} title={lang.get('tab_header.artifact_reshape')} closeCallback={() => this.close()}>
            {isVisible && <FullHeight>
                <FullHeightScrollable maxHeight="calc(100dvh - 210px)">
                    {this.state.error && <div role="alert" className="craft-error">{this.state.error}</div>}
                    {stage === 'parameters' && this.renderParameters()}
                    {stage === 'progress' && <ArtifactActionProgress progress={this.state.progress} />}
                    {stage === 'results' && this.renderResults()}
                </FullHeightScrollable>
                <FullHeightStatic><ControlsBar>
                    {stage === 'parameters' && <TitledButton icon="icon-add" title={t('reshape_add')}
                        onClick={() => this.change({pickerOpen: true})} />}
                    {stage === 'results' && <TitledButton icon="icon-settings"
                        title={t('craft_parameters')}
                        onClick={() => this.setState({stage: 'parameters', result: null, historyEntry: null})} />}
                    <ControlsBarDivider />
                    <TitledButton icon="icon-cancel" title={lang.get('modal_buttons.close')} onClick={() => this.close()} />
                    {stage === 'parameters' && <TitledButton icon="icon-ok" title={lang.get('modal_buttons.confirm')}
                        disabled={!this.canStart()} onClick={() => this.start()} />}
                </ControlsBar></FullHeightStatic>
            </FullHeight>}
        </DialogContainer>
            {isVisible && stage === 'results' && outcomeRow?.outcomeDetails &&
                <ArtifactActionOutcomesModal key={outcomeRow.targetId || outcomeRow.slot} kind="reshape"
                    row={outcomeRow} result={this.state.result} onClose={() => this.setState({outcomeRow: null})} />}
            {isVisible && stage === 'parameters' && this.state.pickerOpen && <ArtifactReshapePicker
                artifacts={this.props.app.storage.artifacts.listArtifacts()}
                selectedHashes={new Set(this.sources().filter(source => !source.error).map(source => source.artifact.getHash()))}
                onAdd={artifact => this.addTarget(artifact)} onClose={() => this.setState({pickerOpen: false})} />}
        </>;
    }
}

function ReshapeCard({id, slot, artifact, rank, unavailable, onRemove, onSelect, children}) {
    return <div className={'artifact-list-box craft-card reshape-card' + (artifact ? ' border-rarity-' + artifact.getRarity() : '')
        + (unavailable ? ' reshape-unavailable' : '') + (onRemove ? ' removable' : '') + (onSelect ? ' outcome-selectable' : '')}
        data-slot={slot} data-target={id} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} onClick={onSelect}
        aria-label={onSelect ? slotName(slot) + ' · ' + t('outcomes_title') : undefined} onKeyDown={onSelect ? event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(); }
        } : undefined}>
        {onRemove && <button type="button" className="button delete reshape-remove" onClick={onRemove}
            aria-label={t('reshape_remove') + ' · ' + slotName(slot)} title={t('reshape_remove')} />}
        <div className="line" title={artifact ? lang.get(DB.Artifacts.Sets.get(artifact.set).getName()) : slotName(slot)}>
            <ArtifactSetIcon size={60} set={artifact?.set} slot={artifact ? artifact.getSlot() : slot}
                crafted={artifact?.isCrafted()} />
            <div className="main"><div className="craft-slot-name">{rank ? rank + '. ' : ''}{slotName(slot)}</div>
                <div className="main-stat reshape-level" title={artifact && '+' + artifact.getLevel() + ' ' + statName(artifact.mainStat)}>{artifact && <>+{artifact.getLevel()} {shortStatName(artifact.mainStat)}</>}</div>
                <div className="main-stat" title={t('dust')}>{RESHAPE_COST[slot]} {t('reshape_dust_short')}</div>
            </div>
        </div>
        <div className="craft-card-body">{children}</div>
    </div>;
}

function ReshapeSubstats({artifact, selected = []}) {
    return <div className="reshape-substats">
        {artifact?.getSubStats().map(sub => <div key={sub.stat} className={'reshape-stat' + (selected.includes(sub.stat) ? ' selected' : '')}>
            <span title={lang.get('stat.' + sub.stat)}>{lang.get('stat.' + sub.stat)}</span><span>{Stats.format(sub.stat, sub.value)}</span>
        </div>)}
    </div>;
}

function Unavailable({error}) {
    return <details className="reshape-unavailable-reason"><summary>{t('reshape_unavailable')}</summary><p>{errorText(error)}</p></details>;
}

/** Read-only storage picker: selecting adds a prediction target, never equips it.
 * Stay open for multiple additions; unavailable sources retain their actual reason.
 */
class ArtifactReshapePicker extends React.Component {
    constructor(props) {
        super(props);
        this.state = {slot: '', set: ''};
    }
    render() {
        const {artifacts, selectedHashes, onAdd, onClose} = this.props;
        const availableSets = new Set(artifacts.map(artifact => artifact.set));
        const setOptions = [{value: '', text: lang.get('pool_view.all_sets')},
            ...DB.Artifacts.Sets.getKeysSorted(null, 1).filter(set => availableSets.has(set)).map(key => {
                const set = DB.Artifacts.Sets.get(key);
                return {value: key, text: lang.get(set.getName()),
                    optionIcons: ['sprite sprite-artifact sprite-24 flower ' + set.getImage()]};
            })];
        const visible = artifacts.filter(artifact => (!this.state.slot || artifact.slot === this.state.slot)
            && (!this.state.set || artifact.set === this.state.set));
        return <DialogContainer addClass="artifact-action-modal artifact-reshape-picker" width={1000} centered isVisible
            title={t('reshape_add')} closeCallback={onClose}>
            <FullHeight>
                <FullHeightStatic>
                    <ControlsBar wrap>
                        {ACTION_SLOTS.map(slot => <ToggleRoundButton key={slot} icon={'icon-' + slot}
                            checked={this.state.slot === slot} tooltip={lang.get('tooltip.artifact_' + slot)}
                            onChange={() => this.setState({slot: this.state.slot === slot ? '' : slot})} />)}
                        <ToggleRoundButton icon="icon-all-slots" checked={!this.state.slot} tooltip={lang.get('tooltip.artifact_all')}
                            onChange={() => this.setState({slot: ''})} />
                        <ControlsBarDivider />
                        <Dropdown barClass="resizable" portal ariaLabel={lang.get('pool_view.all_sets')} items={setOptions}
                            selected={this.state.set} onChange={item => this.setState({set: item.value})} />
                    </ControlsBar>
                </FullHeightStatic>
                <FullHeightScrollable maxHeight="calc(100dvh - 280px)">
                    <div className="reshape-picker-grid">
                        {visible.map(artifact => {
                            const hash = artifact.getHash();
                            const selected = selectedHashes.has(hash);
                            let error;
                            try { getReshapeInputs(artifact); } catch (reason) { error = reason.message; }
                            const disabled = selected || !!error;
                            const reason = selected ? t('reshape_added') : error ? t(error) : '';
                            const label = lang.get(DB.Artifacts.Sets.get(artifact.set).getName()) + ' · '
                                + lang.get('artifact_set.' + artifact.slot) + (reason ? ' · ' + reason : '');
                            const add = () => { if (!disabled) onAdd(artifact); };
                            return <div key={hash} className={'reshape-picker-item' + (disabled ? ' disabled' : '')}
                                role="button" aria-label={label} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
                                data-artifact-hash={hash} onClick={add} onKeyDown={event => {
                                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); add(); }
                                }}>
                                <ArtifactListItem art={artifact} hash={hash} locked={artifact.isLocked()} equipped={selected} />
                                {reason && <div className={'reshape-picker-reason' + (selected ? ' selected' : '')} title={reason}>{reason}</div>}
                            </div>;
                        })}
                    </div>
                    {!visible.length && <p className="craft-hint">{t('reshape_picker_empty')}</p>}
                </FullHeightScrollable>
                <FullHeightStatic><ControlsBar>
                    <ControlsBarDivider />
                    <TitledButton icon="icon-ok" title={lang.get('modal_buttons.close')} onClick={onClose} />
                </ControlsBar></FullHeightStatic>
            </FullHeight>
        </DialogContainer>;
    }
}
