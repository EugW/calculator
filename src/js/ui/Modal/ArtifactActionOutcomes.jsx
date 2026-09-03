import React from 'react';
import { ArtifactActionRVSummary } from '../Components/ArtifactActionControls';
import '../../../css/Components/Modal/ArtifactActionOutcomes.css';
import { Artifact } from '../../classes/Artifact';
import { artifactRollTotalOptions } from '../../classes/ArtifactRollDraft';
import { Stats } from '../../classes/Stats';
import { artifactOutcomeLoadout, artifactOutcomeStats, findArtifactActionOutcome, outcomeChanceRange, rankToSliderPos,
    readArtifactActionOutcome, sliderPosToRank } from '../../classes/ArtifactActionOutcomes';
import { Accordion, AccordionItem } from '../Components/Accordion';
import { ArtifactListItem } from '../Components/Artifact';
import { ControlsBar, ControlsBarDivider } from '../Components/ControlsBar';
import { DialogContainer } from '../Components/Dialog/Container';
import { FullHeight, FullHeightScrollable, FullHeightStatic } from '../Components/FullHeight';
import { ArtifactSetIcon } from '../Components/Icons';
import { TitledButton } from '../Components/Inputs/Buttons';
import { Slider } from '../Components/Inputs/Slider';
import { Pager } from '../Components/Pager';
import { Lang } from '../Lang';

const lang = new Lang();
const t = key => lang.get('artifact_action.' + key);
const number = value => Number.isFinite(value) ? value.toLocaleString(undefined, {maximumFractionDigits: 2}) : '—';
const percent = value => number(value * 100) + '%';
const probability = value => (value > 0 && value < .000001 ? (value * 100).toExponential(2)
    : (value * 100).toLocaleString(undefined, {maximumSignificantDigits: 4})) + '%';
const statName = stat => lang.get('stat.' + stat) + (stat.endsWith('_percent') ? ' %' : '');
const PAGE_SIZE = 5;

/** Read-only, run-snapshot preview. No equipping, inventory writes or extra searches. */
export class ArtifactActionOutcomesModal extends React.Component {
    constructor(props) {
        super(props);
        this.inventory = props.result.outcomeInventory.map(data => Artifact.deserialize([...data]));
        this.state = {page: 0, selected: 0, comparing: false, compareValues: {}, compareMessage: ''};
        this.visiblePage = -1;
    }
    page(value) {
        const pages = Math.max(1, Math.ceil(this.props.row.outcomeDetails.length / PAGE_SIZE));
        const page = Math.max(0, Math.min(pages - 1, Math.trunc(value) || 0));
        this.setState({page, selected: page * PAGE_SIZE});
    }
    jumpToSliderPos(value) {
        const details = this.props.row.outcomeDetails;
        if (!details || details.length < 2) return;
        // Slider max is details.length - 1 (see render), so pos == rank 1:1.
        const rank = sliderPosToRank(value, details.length, Math.max(1, details.length - 1));
        this.setState({page: Math.floor(rank / PAGE_SIZE), selected: rank});
    }
    compare(values) {
        const {row} = this.props;
        const rank = findArtifactActionOutcome(row.outcomeDetails, row, values);
        this.setState({comparing: false, compareValues: values,
            compareMessage: rank < 0 ? t('compare_not_upgrade') : '',
            ...(rank < 0 ? {} : {page: Math.floor(rank / PAGE_SIZE), selected: rank})}, () => {
            if (rank >= 0) {
                const card = this.cards?.querySelector('.outcome-card.active');
                card?.focus({preventScroll: true});
                card?.scrollIntoView({block: 'nearest', inline: 'nearest'});
            }
        });
    }
    closeCompare() {
        this.setState({comparing: false, compareMessage: ''}, () => this.compareButton?.focus());
    }
    render() {
        const {kind, row, result, onClose} = this.props;
        const {page, selected} = this.state;
        const details = row.outcomeDetails;
        const start = page * PAGE_SIZE;
        if (this.visiblePage !== page) {
            this.visiblePage = page;
            this.outcomes = Array.from({length: Math.min(PAGE_SIZE, details.length - start)},
                (_, i) => readArtifactActionOutcome(details, row, start + i));
        }
        const outcome = this.outcomes.find(item => item.rank === selected);
        const loadout = outcome ? artifactOutcomeLoadout(outcome, this.inventory) : [];
        const pages = Math.max(1, Math.ceil(details.length / PAGE_SIZE));
        const chanceRange = outcomeChanceRange(details);
        // 1 slider unit == 1 gallery rank, so +/- buttons step a single sample.
        // Drag stays usable: the track quantizes by pixel, buttons stay exact.
        const sliderMax = Math.max(1, details.length - 1);
        const chancePos = rankToSliderPos(selected, details.length, sliderMax);
        return <><DialogContainer addClass="artifact-action-modal artifact-outcomes-modal" width={1000} centered isVisible
            title={t(kind + '_title') + ' · ' + lang.get('artifact_set.' + row.slot) + ' · ' + t('outcomes_title')} closeCallback={onClose}>
            <FullHeight>
                <FullHeightScrollable maxHeight="calc(100dvh - 230px)">
                    <div className="craft-result-summary">
                        <span>{lang.get(DB.Artifacts.Sets.get(row.set).getName())} · {statName(row.mainStat)}</span>
                        {row.pair && <span>{row.pair.map(statName).join(' / ')}</span>}
                    </div>
                    <ArtifactActionRVSummary filters={result.rvFilters} />
                    <div className="outcome-summary">
                        <span>{t('expected_gain')}: +{number(row.absoluteGain)} (+{percent(row.score)})</span>
                        <span>{t('craft_chance')}: {percent(row.improveChance)}</span>
                        <span>{t('outcome_baseline')}: {number(result.baseValue)}</span>
                    </div>
                    <div className="outcome-list-heading">
                        <span>{t('outcomes_all')}</span>
                        <span>{details.length ? number(start + 1) + '–' + number(start + this.outcomes.length) + ' / ' : ''}{number(details.length)}</span>
                    </div>
                    {chanceRange && <div className="outcome-chance-slider" title={t('outcome_at_least_note')}>
                        <div className="outcome-chance-label">
                            <span>{t('outcome_at_least')}</span>
                            <span>{probability(details.atLeastProbabilities[selected])}</span>
                        </div>
                        <Slider min={0} max={sliderMax} value={chancePos}
                            onChange={value => this.jumpToSliderPos(value)} />
                        <div className="outcome-chance-ticks">
                            <span>{probability(chanceRange.min)}</span>
                            <span>{probability(chanceRange.max)}</span>
                        </div>
                    </div>}
                    {details.length ? <div className="craft-card-row outcome-cards" ref={el => this.cards = el}>
                        {this.outcomes.map(item => <OutcomeCard key={item.rank} artifact={item.artifact}
                            rank={item.rank + 1} active={selected === item.rank} onSelect={() => this.setState({selected: item.rank})}>
                            <div className="outcome-value" title={t('outcome_value')}>{number(item.value)}</div>
                            <div className="craft-result-gain">+{percent((item.value - result.baseValue) / Math.abs(result.baseValue || 1))}</div>
                            <div className="craft-result-metric outcome-cumulative" title={t('outcome_at_least_note')}>
                                <span>{t('outcome_at_least')}</span><span>{probability(item.atLeastProbability)}</span>
                            </div>
                        </OutcomeCard>)}
                    </div> : <p className="craft-hint">{t('outcomes_empty')}</p>}
                    {outcome && <>
                        <div className="outcome-list-heading"><span>#{outcome.rank + 1} · {t('outcome_loadout')}</span>
                            <span>{t('outcome_gain')}: +{number(outcome.value - result.baseValue)}</span></div>
                        <div className="craft-card-row outcome-loadout">
                            {loadout.map((artifact, index) => {
                                // The predicted piece itself is already shown as the
                                // selected outcome card above; hold its slot with a hint.
                                if (artifact === outcome.artifact) return <div key={index} className="outcome-loadout-piece" aria-hidden="true">
                                    <div className="outcome-piece-label">{t('outcome_target')}</div>
                                    <div className="outcome-predicted-above">{t('outcome_target_above')}</div>
                                </div>;
                                const baseline = this.inventory[result.baselineArtifacts[index]];
                                const changed = artifact?.getHash() !== baseline?.getHash();
                                return <div key={index} data-artifact-hash={artifact?.getHash()}
                                    className={'outcome-loadout-piece' + (changed ? ' changed' : '')}>
                                    <div className="outcome-piece-label">{t(changed ? 'outcome_swapped' : 'outcome_kept')}</div>
                                    {artifact
                                        ? <ArtifactListItem key={artifact.getHash()} hash={artifact.getHash()} art={artifact} /> : '—'}
                                </div>;
                            })}
                        </div>
                    </>}
                    <Accordion defaultOpenedId="">
                        <AccordionItem id="statistics" title={t('outcome_statistics')}>
                            <div className="craft-result-detail">
                                {outcome && <span>{t('outcome_exact_probability')}: {probability(outcome.probability)}</span>}
                                <span>{t('forced_mean')}: {number(row.forcedExpectedValue)} · {t('infeasible')}: {percent(row.infeasibleChance)}
                                    {row.rescoreRejectedChance > 0 && <> ({t('rescore_rejected')}: {percent(row.rescoreRejectedChance)})</>}</span>
                                {row.transition && <span>{t(row.transition.type)} · {t('after_meter')}: {row.transition.points}/6, {row.transition.trigger}/3</span>}
                                {Object.entries(row.conditionedStarts).map(([lines, stats]) => <span key={lines}>
                                    {lines === 'max' ? t('upgrade_max_level') : lines + ' ' + t('initial_lines')}: +{percent(stats.score)} · {t('craft_chance')}: {percent(stats.improveChance)}
                                </span>)}
                            </div>
                            <p className="craft-hint">{t('outcome_at_least_note')}</p>
                            <p className="craft-hint">{t('outcome_probability_note')}</p>
                            <p className="craft-hint">{t('outcome_void_note')}</p>
                        </AccordionItem>
                    </Accordion>
                </FullHeightScrollable>
                <FullHeightStatic>
                    <ControlsBar wrap>
                        {details.length > PAGE_SIZE && <Pager page={page} pages={pages} onPage={value => this.page(value)}
                            previousLabel={t('outcome_previous')} nextLabel={t('outcome_next')} pageLabel={t('outcome_page')}
                            formatTotal={number} />}
                        <ControlsBarDivider />
                        <button type="button" className="inputs-button outcome-compare-button" ref={el => this.compareButton = el}
                            onClick={() => this.setState({comparing: true, compareMessage: ''})}>{t('compare')}</button>
                        <TitledButton icon="icon-cancel" title={lang.get('modal_buttons.close')} onClick={onClose} />
                    </ControlsBar>
                </FullHeightStatic>
            </FullHeight>
        </DialogContainer>
            {this.state.comparing && <ArtifactOutcomeCompareModal row={row} values={this.state.compareValues}
                onCompare={values => this.compare(values)} onClose={() => this.closeCompare()} />}
            {this.state.compareMessage && <DialogContainer
                addClass="artifact-action-modal artifact-outcome-compare-modal" width={510} centered isVisible
                title={t('compare')} closeCallback={() => this.closeCompare()}>
                <div role="alertdialog" aria-modal="true" aria-label={t('compare')} aria-describedby="outcome-compare-message"
                    onKeyDown={event => {if (event.key === 'Escape') {event.stopPropagation(); this.closeCompare();}}}>
                    <div id="outcome-compare-message">{this.state.compareMessage}</div>
                    <div className="gi-hr" />
                    <ControlsBar>
                        <ControlsBarDivider />
                        <TitledButton type="button" icon="icon-ok" title={t('compare_ok')} autoFocus
                            onClick={() => this.closeCompare()} />
                    </ControlsBar>
                </div>
            </DialogContainer>}
        </>;
    }
}

class ArtifactOutcomeCompareModal extends React.Component {
    constructor(props) {
        super(props);
        const stats = artifactOutcomeStats(props.row.outcomeDetails, props.row);
        const maximum = Math.min(stats.length, DB.Artifacts.Rarity[(props.row.rarity ?? 5) - 1].maxSubstats);
        const saved = Object.entries(props.values).filter(([stat, value]) => stats.includes(stat) && Number(value) > 0)
            .map(([stat, value]) => ({stat, value}));
        this.state = {lines: Array.from({length: maximum}, (_, index) => saved[index] || {stat: '', value: ''})};
    }
    changeLine(index, line) {
        this.setState(state => ({lines: state.lines.map((current, at) => at === index ? line : current)}));
    }
    render() {
        const {row, onClose, onCompare} = this.props;
        const stats = artifactOutcomeStats(row.outcomeDetails, row);
        const rarity = row.rarity ?? 5;
        const selectedStats = this.state.lines.map(line => line.stat);
        return <DialogContainer addClass="artifact-action-modal artifact-outcome-compare-modal" width={680} centered isVisible
            title={t('compare')} closeCallback={onClose}>
            <form onSubmit={event => {
                event.preventDefault();
                onCompare(Object.fromEntries(this.state.lines.filter(line => line.stat).map(line => [line.stat, line.value])));
            }}
                onKeyDown={event => {if (event.key === 'Escape') {event.stopPropagation(); onClose();}}}>
                <FullHeight>
                    <FullHeightScrollable maxHeight="calc(100dvh - 230px)">
                        <div className="outcome-compare-fields">
                            {this.state.lines.map((line, index) => <OutcomeCompareLine key={index} line={line} index={index}
                                stats={stats} selectedStats={selectedStats} rarity={rarity}
                                onChange={line => this.changeLine(index, line)} />)}
                        </div>
                    </FullHeightScrollable>
                    <FullHeightStatic><ControlsBar>
                        <ControlsBarDivider />
                        <TitledButton type="submit" icon="icon-ok" title={t('compare_ok')} autoFocus={!stats.length} />
                        <TitledButton type="button" icon="icon-cancel" title={lang.get('modal_buttons.cancel')} onClick={onClose} />
                    </ControlsBar></FullHeightStatic>
                </FullHeight>
            </form>
        </DialogContainer>;
    }
}

function OutcomeCompareLine({line, index, stats, selectedStats, rarity, onChange}) {
    const data = line.stat ? DB.Artifacts.Substats.get(line.stat) : null;
    const scale = data?.type === 'percent' ? 10 : 1;
    const options = React.useMemo(() => [{total: 0, steps: []},
        ...(line.stat ? artifactRollTotalOptions(line.stat, rarity) : [])], [line.stat, rarity]);
    const value = Number(line.value || 0);
    const maximum = options.at(-1).total;
    const sliderValue = options.reduce((best, option, at) =>
        Math.abs(option.total - value) < Math.abs(options[best].total - value) - 1e-8 ? at : best, 0);
    const label = t('minor_affix') + ' ' + (index + 1);
    const changeSlider = position => onChange({...line,
        value: options[Math.max(0, Math.min(options.length - 1, Math.round(position)))].total});
    return <fieldset className="outcome-compare-line">
        <legend>{label}</legend>
        <div className="outcome-compare-stat-picker">
            {['', ...stats].map(stat => <button type="button" key={stat} data-stat={stat}
                className={'outcome-compare-stat' + (line.stat === stat ? ' active' : '')}
                aria-pressed={line.stat === stat} title={stat ? statName(stat) : lang.get('stat_short.none')}
                disabled={!!stat && stat !== line.stat && selectedStats.includes(stat)}
                autoFocus={index === 0 && stat === line.stat}
                onClick={() => {
                    if (stat !== line.stat) onChange({stat, value: stat
                        ? Number(Stats.roundStatValue(stat, DB.Artifacts.Substats.get(stat).rolls[rarity - 1][0])) : ''});
                }}>{lang.get('stat_short.' + (stat || 'none'))}</button>)}
        </div>
        {data && <div className="outcome-compare-value">
            <input className="inputs-text" type="number" min="0" max={maximum} step={1 / scale}
                inputMode="decimal" placeholder="0" aria-label={label + ' · ' + statName(line.stat)}
                value={line.value} onChange={event => onChange({...line, value: event.target.value})} />
            <div className="outcome-compare-slider" role="slider" tabIndex={0} aria-label={label + ' · ' + statName(line.stat)}
                aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={options[sliderValue].total}
                aria-valuetext={Stats.format(line.stat, options[sliderValue].total, {zero: true})} onKeyDown={event => {
                    const next = {ArrowLeft: sliderValue - 1, ArrowDown: sliderValue - 1,
                        ArrowRight: sliderValue + 1, ArrowUp: sliderValue + 1, Home: 0, End: options.length - 1}[event.key];
                    if (next !== undefined) {event.preventDefault(); changeSlider(next);}
                }}>
                <Slider min={0} max={options.length - 1} value={sliderValue} onChange={changeSlider} />
            </div>
        </div>}
    </fieldset>;
}

function OutcomeCard({artifact, rank, active, onSelect, children}) {
    return <div className={'artifact-list-box border-rarity-5 craft-card outcome-card' + (active ? ' active' : '')
        + (onSelect ? ' outcome-selectable' : '')} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined}
        aria-pressed={onSelect ? !!active : undefined} aria-label={onSelect ? '#' + rank + ' · ' + t('outcome_loadout') : undefined}
        onClick={onSelect} onKeyDown={onSelect ? event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(); }
        } : undefined}>
        <div className="line"><ArtifactSetIcon size={60} set={artifact.set} slot={artifact.slot} />
            <div className="main">{rank ? <div className="craft-slot-name">{'#' + rank}</div> : null}
                <div className="main-stat">{lang.get('stat_short.' + artifact.mainStat.replace('_percent', ''))}</div>
                <div className="main-stat">{Stats.format(artifact.mainStat, artifact.getMainStatValue())} (+20)</div></div>
        </div>
        <div className="craft-card-body">
            <div className="outcome-substats">
                {artifact.getSubStats().map(sub => <div className="craft-result-metric" key={sub.stat}>
                    <span title={statName(sub.stat)}>{lang.get('stat.' + sub.stat)}</span><span>{Stats.format(sub.stat, sub.value)}</span>
                </div>)}
                {artifact.getSubStats().length < 4 && <div className="outcome-void" title={t('outcome_void_note')}>VOID ×{4 - artifact.getSubStats().length}</div>}
            </div>
            {children}
        </div>
    </div>;
}
