import React from 'react';
import { normalizeArtifactRVFilters } from '../../classes/ArtifactUsefulRV';
import { normalizePrepWorkers } from '../../classes/ArtifactActionPredictor';
import '../../../css/Components/Artifact.css';
import '../../../css/Components/Modal/ArtifactCraft.css';
import { Feature2 } from '../../classes/Feature2';
import { ACTION_SLOTS, CRAFT_COST } from '../../classes/ArtifactActionProbability';
import { artifactCraftAffixOptions, changeArtifactCraftAffix, getArtifactCraftAffixes } from '../../classes/ArtifactCraftAffixes';
import { WorkerFactoryArtifactActionPredictor } from '../../classes/WorkerFactory/ArtifactActionPredictor';
import { Accordion, AccordionItem } from '../Components/Accordion';
import { ArtifactActionAdvancedSettings, ArtifactActionProgress, ArtifactActionRVSummary, formatExpectedGain, formatExpectedGainPercent, mergeActionProgress } from '../Components/ArtifactActionControls';
import { ControlsBar, ControlsBarDivider } from '../Components/ControlsBar';
import { DialogContainer } from '../Components/Dialog/Container';
import { FullHeight, FullHeightScrollable, FullHeightStatic } from '../Components/FullHeight';
import { ArtifactSetIcon } from '../Components/Icons';
import { Dropdown } from '../Components/Inputs/Dropdown';
import { TitledButton } from '../Components/Inputs/Buttons';
import { NumberInput } from '../Components/Inputs/Input';
import { Lang } from '../Lang';
import { ArtifactActionOutcomesModal } from './ArtifactActionOutcomes';

const lang = new Lang();
const t = key => lang.get('artifact_action.' + key);
const statName = key => lang.get('stat.' + key) + (key.endsWith('_percent') ? ' %' : '');
const slotName = key => lang.get('artifact_set.' + key);
const number = value => Number.isFinite(value) ? value.toLocaleString(undefined, {maximumFractionDigits: 2}) : '—';
const percent = value => number(value * 100) + '%';
const errorText = error => {
    const [code, ...details] = String(error).split(';');
    if (!/^action_/.test(code)) return error;
    const text = t(code);
    // action_outcomes_too_large carries slot;entries;entryLimit;recipes.
    if (code === 'action_outcomes_too_large' && details.length === 4) {
        return text + ' (' + slotName(details[0]) + ': ' + number(Number(details[1])) + ' / ' + number(Number(details[2]))
            + ' ' + t('craft_outcomes').toLowerCase() + ' · ' + number(Number(details[3])) + ' ' + t('recipes') + ')';
    }
    return text;
};

export class ArtifactCraftModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {isVisible: false, stage: 'parameters', set: '', craftAffixes: {}, slots: [...ACTION_SLOTS],
            feature: props.app.getFeature(), featureType: 'average', fourLineChance: 34, preserveTopology: true, rvFilters: normalizeArtifactRVFilters(),
            progress: {}, result: null, historyEntry: null, error: ''};
        this.factory = new WorkerFactoryArtifactActionPredictor({
            callback: result => {
                this.factory.dispose();
                this.saveHistory(result);
                this.setState({result, outcomeRow: null, stage: 'results', progress: {}, historyEntry: null});
            },
            progressCallback: progress => this.setState(state => ({progress: mergeActionProgress(state.progress, progress)})),
            errorCallback: data => this.setState({stage: 'parameters', error: errorText(data.error), progress: {}}),
        });
    }
    componentWillUnmount() { this.factory.dispose(); }
    show() {
        this.factory.dispose();
        this.setState({isVisible: true, stage: 'parameters', feature: this.props.app.getFeature(),
            slots: [...ACTION_SLOTS], result: null, historyEntry: null, error: '', progress: {}});
    }
    close() {
        this.factory.dispose();
        this.setState({isVisible: false, stage: 'parameters', result: null, historyEntry: null, progress: {}});
    }
    invalidate() {
        if (this.state.historyEntry) return;
        if (this.state.isVisible && (this.state.stage === 'progress' || this.state.result)) {
            this.factory.dispose();
            this.setState({stage: 'parameters', result: null, progress: {}, error: t('stale'), feature: this.props.app.getFeature()});
        }
    }
    change(values) { this.setState({...values, error: '', result: null}); }
    saveHistory(result) {
        this.props.app.storage.actionHistory.saveRun({kind: 'craft', feature: this.state.feature,
            featureType: this.state.featureType,
            context: {set: this.state.set, slots: this.state.slots.slice()}, result}).catch(() => {});
    }
    openHistoryEntry(entry, result) {
        this.showHistoryEntry(entry, result);
    }
    showHistoryEntry(entry, result) {
        if (!result) return;
        this.factory.dispose();
        this.setState({isVisible: true, stage: 'results', result, outcomeRow: null, progress: {}, error: '',
            historyEntry: entry, set: entry.context?.set || this.state.set});
    }
    selectSet() {
        const set = DB.Artifacts.Sets.get(this.state.set);
        UI.ArtifactSetSelectReact.show({minRarity: 5, selectedId: set?.getId() || 0,
            callback: selected => {
                if (this.state.isVisible && selected?.maxRarity === 5) this.change({set: selected.key});
            }});
    }
    changeAffix(slot, field, value) {
        try {
            this.change({craftAffixes: {...this.state.craftAffixes,
                [slot]: changeArtifactCraftAffix(slot, this.state.craftAffixes[slot], field, value)}});
        } catch (error) {
            this.setState({error: errorText(error.message)});
        }
    }
    toggleSlot(slot) {
        if (!this.state.isVisible || this.state.stage !== 'parameters') return;
        const included = this.state.slots.includes(slot);
        this.change({slots: ACTION_SLOTS.filter(item => item === slot ? !included : this.state.slots.includes(item))});
    }
    canStart() {
        return DB.Artifacts.Sets.get(this.state.set)?.maxRarity === 5 && this.state.slots.length > 0;
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
        this.factory.dispose();
        const prepWorkers = normalizePrepWorkers(this.props.app.getSetting('artifact_action_workers'));
        this.setState({stage: 'progress', progress: {phase: 'baseline', slotsCompleted: 0,
            slotsTotal: this.state.slots.length, workerCount: Math.min(prepWorkers, this.state.slots.length)},
            result: null, historyEntry: null, error: ''});
        this.factory.run({kind: 'craft', build: this.props.app.currentSet(), inventory: suggest.artifacts,
            optimizerSettings: suggest.settings, feature: this.state.feature, featureType: this.state.featureType,
            set: this.state.set, craftAffixes: this.state.craftAffixes, fourLineChance: this.state.fourLineChance / 100,
            craftSlots: this.state.slots,
            mode: 'full', pruneOutcomeSets: this.state.preserveTopology, rvFilters, prepWorkers,
            retainOutcomes: true, useGPU: true, gpuBatchSize: suggest.gpuBatchSize, showBeta: this.props.app.showBetaContent()});
    }
    renderParameters() {
        const set = DB.Artifacts.Sets.get(this.state.set);
        return <>
            <ControlsBar>
                <Dropdown barClass="resizable" items={Feature2.buildDropdown(this.props.app.currentSet())}
                    selected={this.state.feature} onChange={item => this.change({feature: item.value})} />
                <Dropdown barClass="feature-type" items={['normal', 'crit', 'average'].map(value => ({value, text: lang.get('pool_view.type_' + value)}))}
                    selected={this.state.featureType} onChange={item => this.change({featureType: item.value})} />
            </ControlsBar>
            <div className="craft-set-picker dropdown-current" role="button" tabIndex={0} aria-label={t('set')}
                onClick={() => this.selectSet()} onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.selectSet(); }
                }}>
                <ArtifactSetIcon size={40} set={set} />
                <span>{set ? lang.get(set.getName()) : t('choose_set')}</span>
            </div>
            <div className="craft-card-row">
                {ACTION_SLOTS.map(slot => {
                    const included = this.state.slots.includes(slot);
                    const selection = getArtifactCraftAffixes(slot, this.state.craftAffixes[slot]);
                    return <CraftCard key={slot} slot={slot} set={this.state.set} included={included}
                        onToggle={() => this.toggleSlot(slot)}>
                        {['mainStat', 0, 1].map(field => {
                            const label = t(field === 'mainStat' ? 'main_affix' : 'minor_affix') + (field === 'mainStat' ? '' : ' ' + (field + 1));
                            const options = artifactCraftAffixOptions(slot, selection, field);
                            const selected = field === 'mainStat' ? selection.mainStat : selection.substats[field];
                            const locked = options.length === 1;
                            const displayed = locked ? [options[0]] : selected;
                            const selectedText = displayed.length ? displayed.map(statName).join(' / ') : t('auto_affix');
                            return <div className="craft-affix" key={field} data-affix={field}>
                                <div className="craft-affix-label">{label}</div>
                                <Dropdown isMultiple disabled={locked || !included} selectedText={selectedText}
                                    portal portalClassName="craft-affix-popup" ariaLabel={slotName(slot) + ' · ' + label}
                                    items={[...(locked ? [] : [{value: '', text: t('auto_affix')}]), ...options.map(value => ({value, text: statName(value)}))]}
                                    selected={displayed.length ? displayed : ['']}
                                    onChange={items => {
                                        const values = items.map(item => item.value);
                                        this.changeAffix(slot, field, selected.length && values.includes('') ? [] : values.filter(Boolean));
                                    }} />
                            </div>;
                        })}
                    </CraftCard>;
                })}
            </div>
            <ArtifactActionAdvancedSettings preserveTopology={this.state.preserveTopology} rvFilters={this.state.rvFilters}
                onChange={values => this.change(values)}>
                    <div className="craft-coverage-input">
                        <span>{t('four_line_short')}</span>
                        <NumberInput minValue={0} maxValue={100} nonEmpty value={this.state.fourLineChance}
                            onChange={fourLineChance => this.change({fourLineChance: Math.max(0, Math.min(100, fourLineChance))})} />%
                    </div>
                    <details className="reshape-help"><summary>{t('method_title')}</summary>
                        <p>{t('method_craft')}</p>
                        <p>{t('filters')}</p>
                    </details>
            </ArtifactActionAdvancedSettings>
        </>;
    }
    renderResults() {
        const {result} = this.state;
        return <>
            <div className="craft-result-summary">{lang.get(DB.Artifacts.Sets.get(this.state.set).getName())}
                <span>{t('craft_baseline')}: {number(result.baseValue)}</span></div>
            <ArtifactActionRVSummary filters={result.rvFilters} />
            <div className="craft-card-row">
                {result.rows.map((row, index) => <CraftCard key={row.slot} slot={row.slot} set={row.set} rank={index + 1}
                    onSelect={row.outcomeDetails ? () => this.setState({outcomeRow: row.slot}) : undefined}>
                    {row.error ? <p className="craft-error">{errorText(row.error)}</p> : <>
                    {[row.mainStat, ...row.pair].map((stat, index) => <div key={index} className="craft-result-affix" title={statName(stat)}>{statName(stat)}</div>)}
                    <div className="craft-result-gain action-expected-gain" title={t('expected_gain')}>+{formatExpectedGainPercent(row.score)}</div>
                    <div className="craft-result-metric"><span>{t('craft_chance')}</span><span>{percent(row.improveChance)}</span></div>
                    <div className="craft-result-metric action-expected-gain"><span>{t('expected_gain')}</span><span>+{formatExpectedGain(row.absoluteGain)}</span></div>
                    </>}
                </CraftCard>)}
            </div>
            <Accordion defaultOpenedId="">
                <AccordionItem id="details" title={t('details')}>
                    {result.rows.filter(row => !row.error).map(row => <div className="craft-result-detail" key={row.slot}>
                        <strong>{slotName(row.slot)}</strong>
                        <span>{t('expected_gain')}: +{formatExpectedGain(row.absoluteGain)}</span>
                        <span>{t('optimizer_evaluations')}: {number(row.optimizerEvaluations)}</span>
                        <span>{t('forced_mean')}: {number(row.forcedExpectedValue)} · {t('infeasible')}: {percent(row.infeasibleChance)}
                        {row.rescoreRejectedChance > 0 && <> ({t('rescore_rejected')}: {percent(row.rescoreRejectedChance)})</>}</span>
                        {Object.entries(row.conditionedStarts).map(([start, stats]) => <span key={start}>
                            {start} {t('initial_lines')}: +{formatExpectedGain(stats.absoluteGain)} (+{formatExpectedGainPercent(stats.score)}) · {t('craft_chance')}: {percent(stats.improveChance)}
                        </span>)}
                        <details><summary>{t('alternatives')} ({row.recipesEvaluated})</summary>
                            {row.alternatives.map(item => <div key={item.mainStat + item.pair.join('/')}>
                                {statName(item.mainStat)} · {item.pair.map(statName).join(' / ')}: +{formatExpectedGain(item.absoluteGain)} (+{formatExpectedGainPercent(item.score)})
                            </div>)}
                        </details>
                    </div>)}
                </AccordionItem>
            </Accordion>
        </>;
    }
    render() {
        const {isVisible, stage} = this.state;
        const outcomeRow = this.state.result?.rows.find(row => row.slot === this.state.outcomeRow);
        return <><DialogContainer addClass="artifact-action-modal artifact-craft-modal" width={stage === 'progress' ? 500 : 1000} centered isVisible={isVisible}
            title={lang.get('tab_header.artifact_craft')} closeCallback={() => this.close()}>
            {isVisible && <FullHeight>
                <FullHeightScrollable maxHeight="calc(100dvh - 210px)">
                    {this.state.error && <div role="alert" className="craft-error">{this.state.error}</div>}
                    {stage === 'parameters' && this.renderParameters()}
                    {stage === 'progress' && <ArtifactActionProgress progress={this.state.progress} />}
                    {stage === 'results' && this.renderResults()}
                </FullHeightScrollable>
                <FullHeightStatic><ControlsBar>
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
                <ArtifactActionOutcomesModal key={outcomeRow.slot} kind="craft" row={outcomeRow} result={this.state.result}
                    onClose={() => this.setState({outcomeRow: null})} />}
        </>;
    }
}

function CraftCard({slot, set, rank, included, onSelect, onToggle, children}) {
    const setData = typeof set == 'string' ? DB.Artifacts.Sets.get(set) : set;
    const toggleLabel = included ? t('craft_exclude') : t('craft_include');
    return <div className={'artifact-list-box border-rarity-5 craft-card' + (onSelect ? ' outcome-selectable' : '')
        + (onToggle ? ' toggleable' : '') + (onToggle && !included ? ' excluded' : '')} data-slot={slot}
        role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} onClick={onSelect}
        aria-label={onSelect ? slotName(slot) + ' · ' + t('outcomes_title') : undefined} onKeyDown={onSelect ? event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(); }
        } : undefined}>
        {onToggle && <button type="button" className={'craft-toggle' + (included ? ' checked' : '')}
            aria-pressed={included} onClick={onToggle} aria-label={toggleLabel + ' · ' + slotName(slot)} title={toggleLabel} />}
        <div className="line" title={setData ? lang.get(setData.getName()) : slotName(slot)}>
            <ArtifactSetIcon size={60} set={set} slot={slot} />
            <div className="main"><div className="craft-slot-name">{rank ? rank + '. ' : ''}{slotName(slot)}</div>
                <div className="main-stat" title={t('elixir')}>{CRAFT_COST[slot]} {t('craft_elixir_short')}</div></div>
        </div>
        <div className="craft-card-body">{children}</div>
    </div>;
}
