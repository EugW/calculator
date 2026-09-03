import React from 'react';
import { normalizeArtifactRVFilters } from '../../classes/ArtifactUsefulRV';
import { normalizePrepWorkers } from '../../classes/ArtifactActionPredictor';
import '../../../css/Components/Artifact.css';
import '../../../css/Components/Modal/ArtifactCraft.css';
import '../../../css/Components/Modal/ArtifactUpgrade.css';
import { Feature2 } from '../../classes/Feature2';
import { Artifact } from '../../classes/Artifact';
import { Serializer } from '../../classes/Serializer';
import { getArtifactMaxLevel, isArtifactUnderleveled } from '../../classes/ArtifactUpgradePredictor';
import { filterUpgradeCandidatesByUsefulMain, getUpgradeMainUsefulStats } from '../../classes/ArtifactUpgradeMainFilter';
import { WorkerFactoryArtifactActionPredictor } from '../../classes/WorkerFactory/ArtifactActionPredictor';
import { Accordion, AccordionItem } from '../Components/Accordion';
import { ArtifactListItem } from '../Components/Artifact';
import { ArtifactActionAdvancedSettings, ArtifactActionProgress, ArtifactActionRVSummary, formatExpectedGain, formatExpectedGainPercent, mergeActionProgress } from '../Components/ArtifactActionControls';
import { ControlsBar, ControlsBarDivider } from '../Components/ControlsBar';
import { DialogContainer } from '../Components/Dialog/Container';
import { FullHeight, FullHeightScrollable, FullHeightStatic } from '../Components/FullHeight';
import { Pager } from '../Components/Pager';
import { Dropdown } from '../Components/Inputs/Dropdown';
import { TitledButton } from '../Components/Inputs/Buttons';
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
const UPGRADE_PAGE_SIZE = 12;
const candidateKey = artifact => artifact.getSlot() + ':' + artifact.getHash();

export class ArtifactUpgradeModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {isVisible: false, stage: 'parameters',
            feature: props.app.getFeature(), featureType: 'average', preserveTopology: true, rvFilters: normalizeArtifactRVFilters(),
            candidates: [], selected: [], page: 0, inventory: [], optimizerSettings: null, gpuBatchSize: undefined,
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
    scanCandidates() {
        const suggest = UI.BestArtifactTab.getSuggestData();
        if (!suggest?.settings || !Array.isArray(suggest.artifacts)) {
            return {error: t('action_missing_filters')};
        }
        // Candidates come from storage and the loadout directly, like the old
        // upgrade tab: optimizer filters (locks, groups, level range) govern
        // the baseline/complement inventory, never candidacy itself.
        const showBeta = this.props.app.showBetaContent();
        const candidates = [];
        const used = new Set();
        const add = artifact => {
            if (!artifact || typeof artifact.getSlot !== 'function' || !isArtifactUnderleveled(artifact)) return;
            const setData = DB.Artifacts.Sets.get(artifact.getSet());
            if (!setData || (!showBeta && setData.isBeta())) return;
            const key = artifact.getSlot() + ':' + artifact.getHash();
            if (used.has(key)) return;
            used.add(key);
            candidates.push(artifact);
        };
        for (const artifact of this.props.app.storage.artifacts.listArtifacts()) add(artifact);
        for (const artifact of Object.values(this.props.app.getArtifacts())) add(artifact);
        return {candidates, inventory: suggest.artifacts, optimizerSettings: suggest.settings,
            gpuBatchSize: suggest.gpuBatchSize};
    }
    show() {
        this.factory.dispose();
        const scan = this.scanCandidates();
        const candidates = scan.candidates || [];
        const feature = this.props.app.getFeature();
        // Default pass: keep flowers/plumes and useful-main sands/goblets/
        // circlets only. Unknown usefulness keeps everything selected.
        let selected = candidates.map(candidateKey);
        try {
            const usedStats = getUpgradeMainUsefulStats({build: this.props.app.currentSet(),
                feature, optimizerSettings: scan.optimizerSettings});
            if (usedStats) selected = filterUpgradeCandidatesByUsefulMain(candidates, usedStats).map(candidateKey);
        } catch {
            // Fall back to selecting all candidates.
        }
        this.setState({isVisible: true, stage: 'parameters', feature,
            candidates, selected, page: 0,
            inventory: scan.inventory || [],
            optimizerSettings: scan.optimizerSettings || null, gpuBatchSize: scan.gpuBatchSize,
            result: null, historyEntry: null, error: scan.error || '', progress: {}});
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
    selectedArtifacts() {
        const selected = new Set(this.state.selected);
        return this.state.candidates.filter(artifact => selected.has(candidateKey(artifact)));
    }
    toggleCandidate(key) {
        if (!this.state.isVisible || this.state.stage !== 'parameters') return;
        const included = this.state.selected.includes(key);
        this.change({selected: included
            ? this.state.selected.filter(item => item !== key)
            : this.state.selected.concat(key)});
    }
    selectAll() {
        if (!this.state.isVisible || this.state.stage !== 'parameters') return;
        this.change({selected: this.state.candidates.map(candidateKey), page: 0});
    }
    deselectAll() {
        if (!this.state.isVisible || this.state.stage !== 'parameters') return;
        this.change({selected: [], page: 0});
    }
    selectSet() {
        if (!this.state.isVisible || this.state.stage !== 'parameters') return;
        UI.ArtifactSetSelectReact.show({callback: selected => {
            if (!this.state.isVisible || this.state.stage !== 'parameters' || !selected?.key) return;
            const keys = new Set(this.state.selected);
            for (const artifact of this.state.candidates) {
                if (artifact.getSet() === selected.key) keys.add(candidateKey(artifact));
            }
            this.change({selected: this.state.candidates.map(candidateKey).filter(key => keys.has(key))});
        }});
    }
    deselectSet() {
        if (!this.state.isVisible || this.state.stage !== 'parameters') return;
        UI.ArtifactSetSelectReact.show({callback: selected => {
            if (!this.state.isVisible || this.state.stage !== 'parameters' || !selected?.key) return;
            const removed = new Set(this.state.candidates
                .filter(artifact => artifact.getSet() === selected.key).map(candidateKey));
            this.change({selected: this.state.selected.filter(key => !removed.has(key))});
        }});
    }
    deselectUselessMains() {
        if (!this.state.isVisible || this.state.stage !== 'parameters') return;
        let usedStats = null;
        try {
            usedStats = getUpgradeMainUsefulStats({build: this.props.app.currentSet(),
                feature: this.state.feature, optimizerSettings: this.state.optimizerSettings});
        } catch {
            return;
        }
        if (!usedStats) return;
        const keep = new Set(filterUpgradeCandidatesByUsefulMain(this.state.candidates, usedStats).map(candidateKey));
        this.change({selected: this.state.selected.filter(key => keep.has(key)), page: 0});
    }
    page(value) {
        const pages = Math.max(1, Math.ceil(this.state.candidates.length / UPGRADE_PAGE_SIZE));
        this.setState({page: Math.max(0, Math.min(pages - 1, Math.trunc(value) || 0))});
    }
    saveHistory(result) {
        this.props.app.storage.actionHistory.saveRun({kind: 'upgrade', feature: this.state.feature,
            featureType: this.state.featureType,
            context: {candidates: this.selectedArtifacts().length}, result}).catch(() => {});
    }
    openHistoryEntry(entry, result) {
        this.showHistoryEntry(entry, result);
    }
    showHistoryEntry(entry, result) {
        if (!result) return;
        this.factory.dispose();
        this.setState({isVisible: true, stage: 'results', result, outcomeRow: null, progress: {}, error: '',
            historyEntry: entry});
    }
    canStart() {
        return this.state.selected.length > 0 && this.state.inventory.length > 0 && !!this.state.optimizerSettings;
    }
    start() {
        if (!this.canStart() || this.state.stage === 'progress') return;
        let rvFilters;
        try { rvFilters = normalizeArtifactRVFilters(this.state.rvFilters); }
        catch (error) { this.setState({error: errorText(error.message)}); return; }
        const upgradeTargets = this.selectedArtifacts();
        const prepWorkers = normalizePrepWorkers(this.props.app.getSetting('artifact_action_workers'));
        this.factory.dispose();
        this.setState({stage: 'progress', progress: {phase: 'baseline', unit: 'artifacts', slotsCompleted: 0,
            slotsTotal: upgradeTargets.length, workerCount: Math.min(prepWorkers, upgradeTargets.length)},
            result: null, historyEntry: null, error: ''});
        this.factory.run({kind: 'upgrade', build: this.props.app.currentSet(), inventory: this.state.inventory,
            optimizerSettings: this.state.optimizerSettings, feature: this.state.feature, featureType: this.state.featureType,
            upgradeTargets,
            pruneOutcomeSets: this.state.preserveTopology, rvFilters, prepWorkers,
            retainOutcomes: true, useGPU: true, gpuBatchSize: this.state.gpuBatchSize, showBeta: this.props.app.showBetaContent()});
    }
    renderParameters() {
        const pages = Math.max(1, Math.ceil(this.state.candidates.length / UPGRADE_PAGE_SIZE));
        const page = Math.max(0, Math.min(pages - 1, this.state.page || 0));
        const visible = this.state.candidates.slice(page * UPGRADE_PAGE_SIZE, (page + 1) * UPGRADE_PAGE_SIZE);
        return <>
            <ControlsBar>
                <Dropdown barClass="resizable" items={Feature2.buildDropdown(this.props.app.currentSet())}
                    selected={this.state.feature} onChange={item => this.change({feature: item.value})} />
                <Dropdown barClass="feature-type" items={['normal', 'crit', 'average'].map(value => ({value, text: lang.get('pool_view.type_' + value)}))}
                    selected={this.state.featureType} onChange={item => this.change({featureType: item.value})} />
            </ControlsBar>
            <p className="craft-hint">{t('upgrade_hint')}</p>
            <div className="craft-result-summary"><span>{t('upgrade_candidates')}: {number(this.state.selected.length)} / {number(this.state.candidates.length)}</span></div>
            {this.state.candidates.length ? <>
                <ControlsBar wrap>
                    <TitledButton icon="icon-check" title={t('upgrade_select_all')} onClick={() => this.selectAll()} />
                    <TitledButton icon="icon-cancel" title={t('upgrade_deselect_all')} onClick={() => this.deselectAll()} />
                    <TitledButton icon="icon-add" title={t('upgrade_select_set')} onClick={() => this.selectSet()} />
                    <TitledButton icon="icon-delete" title={t('upgrade_deselect_set')} onClick={() => this.deselectSet()} />
                    <TitledButton icon="icon-delete" title={t('upgrade_deselect_useless_mains')} onClick={() => this.deselectUselessMains()} />
                    {pages > 1 && <ControlsBarDivider />}
                    {pages > 1 && <Pager page={page} pages={pages} onPage={value => this.page(value)}
                        previousLabel={t('outcome_previous')} nextLabel={t('outcome_next')} pageLabel={t('outcome_page')}
                        formatTotal={number} />}
                </ControlsBar>
                <div className="upgrade-artifact-grid">
                    {visible.map(artifact => {
                        const key = candidateKey(artifact);
                        const included = this.state.selected.includes(key);
                        const toggleLabel = included ? t('upgrade_exclude') : t('upgrade_include');
                        return <div className={'upgrade-artifact-entry selectable' + (included ? '' : ' excluded')}
                            key={key} data-slot={artifact.getSlot()}>
                            <button type="button" className={'craft-toggle' + (included ? ' checked' : '')}
                                aria-pressed={included} onClick={() => this.toggleCandidate(key)}
                                aria-label={toggleLabel + ' · ' + slotName(artifact.getSlot())} title={toggleLabel} />
                            <UpgradeArtifactCard artifact={artifact} bare />
                        </div>;
                    })}
                </div>
            </> : <p className="craft-hint">{t('upgrade_empty')}</p>}
            <ArtifactActionAdvancedSettings preserveTopology={this.state.preserveTopology} rvFilters={this.state.rvFilters}
                onChange={values => this.change(values)}>
                    <details className="reshape-help"><summary>{t('method_title')}</summary>
                        <p>{t('method_upgrade')}</p>
                        <p>{t('filters')}</p>
                    </details>
            </ArtifactActionAdvancedSettings>
        </>;
    }
    renderResults() {
        const {result} = this.state;
        return <>
            <div className="craft-result-summary"><span>{t('upgrade_title')}</span>
                <span>{t('craft_baseline')}: {number(result.baseValue)}</span></div>
            <ArtifactActionRVSummary filters={result.rvFilters} />
            <div className="upgrade-artifact-grid">
                {result.rows.map((row, index) => <div className={'upgrade-artifact-entry'
                    + (row.outcomeDetails ? ' upgrade-artifact-selectable' : '')} key={row.targetId} data-slot={row.slot}
                    role={row.outcomeDetails ? 'button' : undefined} tabIndex={row.outcomeDetails ? 0 : undefined}
                    onClick={row.outcomeDetails ? () => this.setState({outcomeRow: row.targetId}) : undefined}
                    aria-label={row.outcomeDetails ? '#' + (index + 1) + ' · ' + slotName(row.slot) + ' · ' + t('outcomes_title') : undefined}
                    onKeyDown={row.outcomeDetails ? event => {
                        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.setState({outcomeRow: row.targetId}); }
                    } : undefined}>
                    <UpgradeArtifactCard hash={row.targetId} rank={index + 1} />
                    <div className="upgrade-artifact-result">
                        {row.error ? <p className="craft-error">{errorText(row.error)}</p> : <>
                        <div className="upgrade-artifact-gain"><span>{t('expected_gain')}</span><strong className="action-expected-gain">+{formatExpectedGainPercent(row.score)}</strong></div>
                        <div className="craft-result-metric"><span>{t('craft_chance')}</span><span>{percent(row.improveChance)}</span></div>
                        <div className="craft-result-metric action-expected-gain"><span>{t('expected_gain')}</span><span>+{formatExpectedGain(row.absoluteGain)}</span></div>
                        </>}
                    </div>
                    {row.outcomeDetails && <div className="upgrade-artifact-outcomes">{t('outcomes_title')} <span aria-hidden="true">→</span></div>}
                </div>)}
            </div>
            <Accordion defaultOpenedId="">
                <AccordionItem id="details" title={t('details')}>
                    <p className="craft-hint">{t('upgrade_result_hint')}</p>
                    {result.rows.filter(row => !row.error).map(row => <div className="craft-result-detail" key={row.targetId}>
                        <strong>{slotName(row.slot)} · {statName(row.mainStat)}</strong>
                        <span>{t('expected_gain')}: +{formatExpectedGain(row.absoluteGain)}</span>
                        <span>{t('optimizer_evaluations')}: {number(row.optimizerEvaluations)}</span>
                        <span>{t('forced_mean')}: {number(row.forcedExpectedValue)} · {t('infeasible')}: {percent(row.infeasibleChance)}
                        {row.rescoreRejectedChance > 0 && <> ({t('rescore_rejected')}: {percent(row.rescoreRejectedChance)})</>}</span>
                        <span>{t('craft_outcomes')}: {number(row.totalOutcomes)} · {t('variants')}: {number(row.enumeratedOutcomes)}</span>
                        {row.upgradeAssumptions?.startingLines && <span>{t('upgrade_start_prior')}</span>}
                        {row.upgradeAssumptions?.rawRolls && <span>{t('upgrade_raw_prior')}</span>}
                        {row.upgradeAssumptions?.craftedStatus && <span>{t('upgrade_ordinary_assumption')}</span>}
                    </div>)}
                </AccordionItem>
            </Accordion>
        </>;
    }
    render() {
        const {isVisible, stage} = this.state;
        const outcomeRow = this.state.result?.rows.find(row => row.targetId === this.state.outcomeRow);
        return <><DialogContainer addClass="artifact-action-modal artifact-upgrade-modal" width={stage === 'progress' ? 500 : 1000} centered isVisible={isVisible}
            title={t('upgrade_title')} closeCallback={() => this.close()}>
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
                <ArtifactActionOutcomesModal key={outcomeRow.targetId} kind="upgrade" row={outcomeRow} result={this.state.result}
                    onClose={() => this.setState({outcomeRow: null})} />}
        </>;
    }
}

function UpgradeArtifactCard({artifact, hash, rank, bare}) {
    if (!artifact && hash) {
        // targetId is the complete source snapshot, including in saved runs;
        // do not resolve it against the user's possibly changed inventory.
        try { artifact = Artifact.deserialize(Serializer.unpack(hash) || []); } catch { /* old/malformed history */ }
    }
    if (!artifact) return <p className="craft-hint">{t('upgrade_source_unavailable')}</p>;
    return <div className="upgrade-artifact-source" title={lang.get(DB.Artifacts.Sets.get(artifact.getSet()).getName())}>
        {!bare && <div className="upgrade-artifact-heading">
            <span>{rank && <span className="upgrade-artifact-rank">#{rank}</span>}{slotName(artifact.getSlot())}</span>
            <span className="upgrade-artifact-level" title={t('upgrade_max_level')}>+{artifact.getLevel()} → +{getArtifactMaxLevel(artifact)}</span>
        </div>}
        <ArtifactListItem art={artifact} hash={hash || artifact.getHash()} locked={artifact.isLocked()} />
    </div>;
}
