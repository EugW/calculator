import React from 'react';
import { ACTION_SLOTS } from '../../classes/ArtifactActionProbability';
import { Checkbox } from '../Components/Inputs/Input';
import { Accordion, AccordionItem } from './Accordion';
import { ProgressBar } from './ProgressBar';
import { Lang } from '../Lang';

const lang = new Lang();
const t = key => lang.get('artifact_action.' + key);
const number = value => Number.isFinite(value) ? value.toLocaleString(undefined, {maximumFractionDigits: 2}) : '—';

// First non-zero digit plus three more. Significant-digit formatting keeps
// small expected improvements visible instead of rounding them down to zero.
const standardGainFormat = new Intl.NumberFormat(undefined, {maximumSignificantDigits: 4});
const scientificGainFormat = new Intl.NumberFormat(undefined, {maximumSignificantDigits: 4, notation: 'scientific'});

export function formatExpectedGain(value) {
    if (!Number.isFinite(value)) return '—';
    const magnitude = Math.abs(value);
    return (magnitude > 0 && (magnitude < 0.0001 || magnitude >= 1e21) ? scientificGainFormat : standardGainFormat).format(value);
}

export const formatExpectedGainPercent = value => formatExpectedGain(value * 100) + '%';

/** Shared advanced settings for Craft, Reshape and Upgrade. */
export function ArtifactActionTopologyToggle({value, onChange}) {
    return <div className="craft-topology-setting">
        <Checkbox checked={value} title={t('preserve_topology')} onChange={onChange} />
        <p className="craft-hint">{t('preserve_topology_hint')}</p>
    </div>;
}

export function ArtifactActionRVFilters({value, onChange}) {
    return <div className="action-rv-filters">
        {['outcomes', 'companions'].map(kind => {
            const range = value[kind];
            const change = update => onChange({...value, [kind]: {...range, ...update}});
            return <div className="action-rv-filter" key={kind} data-rv-filter={kind}>
                <label className="checkbox-wrapper">
                    <input className="checkbox" type="checkbox" checked={range.enabled}
                        onChange={event => change({enabled: event.target.checked})} />
                    <span className="checkbox-switcher" />
                    <span className="checkbox-label">{t('rv_' + kind)}</span>
                </label>
                <div className="action-rv-bounds">
                    {['min', 'max'].map(bound => <label key={bound}>
                        <span>{t('rv_' + bound)}</span>
                        <input className="inputs-text" type="number" min="0" step="any"
                            aria-label={t('rv_' + kind) + ' · ' + t('rv_' + bound)}
                            placeholder={bound === 'min' ? '0' : '∞'} disabled={!range.enabled}
                            value={range[bound] ?? ''} onChange={event => change({[bound]: event.target.value})} />
                    </label>)}
                </div>
                <p className="craft-hint">{t('rv_' + kind + '_hint')}</p>
            </div>;
        })}
        <p className="craft-hint">{t('rv_units_hint')}</p>
    </div>;
}

/** Shared Advanced accordion for Craft, Reshape and Upgrade.
 * Topology + RV filters are always rendered; per-modal extras
 * (four-line chance, meter help, method text) pass through as children.
 */
export function ArtifactActionAdvancedSettings({preserveTopology, rvFilters, onChange, children}) {
    return <Accordion defaultOpenedId="">
        <AccordionItem id="advanced" title={t('advanced_settings')}>
            <ArtifactActionTopologyToggle value={preserveTopology}
                onChange={preserveTopology => onChange({preserveTopology})} />
            <ArtifactActionRVFilters value={rvFilters}
                onChange={rvFilters => onChange({rvFilters})} />
            {children}
        </AccordionItem>
    </Accordion>;
}

/** Read the run snapshot, so saved results cannot inherit current UI settings. */
export function ArtifactActionRVSummary({filters}) {
    if (!filters?.outcomes?.enabled && !filters?.companions?.enabled) return null;
    return <div className="action-rv-summary craft-hint">
        {['outcomes', 'companions'].filter(kind => filters[kind]?.enabled).map(kind => <span key={kind}>
            {t('rv_' + kind)}: {number(filters[kind].min ?? 0)}–{filters[kind].max === null || filters[kind].max === undefined
                ? '∞' : number(filters[kind].max)}
        </span>)}
        {filters.outcomes?.enabled && <p>{t('rv_subset_note')}</p>}
    </div>;
}

/** Keep every candidate's stage counters, including after its worker is reused.
 * Candidate order and the run's total stay fixed while workers finish out of order.
 * A shared search reports once for all its candidates (candidateIndices). */
export function mergeActionProgress(prev = {}, update = {}) {
    if (!update || typeof update !== 'object') return prev;
    if (update.candidateIndex !== undefined) {
        const {candidateIndex, candidateIndices = [candidateIndex], slotsCompleted = prev.slotsCompleted,
            slotsTotal = prev.slotsTotal, workerCount = prev.workerCount, unit = prev.unit, ...detail} = update;
        const candidates = [...(prev.candidates || [])];
        for (const index of candidateIndices) candidates[index] = mergeActionProgress(candidates[index], detail);
        return {...prev, candidates, slotsCompleted, slotsTotal, workerCount, unit};
    }
    const next = {...prev, ...update};
    if (update.key && (update.current !== undefined || update.total !== undefined)) {
        const previous = prev[update.key] || {};
        const current = update.current ?? previous.current ?? 0;
        const total = update.total ?? previous.total ?? 0;
        next[update.key] = {current, total,
            fraction: Math.max(previous.fraction || 0, total > 0 ? Math.min(1, Math.max(0, current / total)) : 0)};
    }
    return next;
}

export function ArtifactActionProgress({progress = {}}) {
    const baseline = progress.baseline || {};
    const total = progress.slotsTotal ?? progress.slots?.total ?? ACTION_SLOTS.length;
    const candidates = Array.from({length: total}, (_, index) => progress.candidates?.[index]);
    const workerCount = progress.workerCount || 1;
    // Spread this run's hues evenly and alternate perceptual lightness, so
    // nearby hues remain distinguishable instead of repeating similar pastels.
    const colors = Array.from({length: workerCount}, (_, index) =>
        `oklch(${index % 2 ? '86% 0.12' : '70% 0.19'} ${(95 + index * 360 / workerCount) % 360})`);
    const stages = [
        ['slots', progress.unit === 'artifacts' ? 'reshape_artifacts' : 'craft_slots'],
        ['baseline', 'phase_baseline'],
        ['prepare', 'preparation'],
        ['lower', 'lowered_outcomes'],
        ['search', 'craft_combinations'],
        ['rescore', 'rescored_outcomes'],
        ['gallery', 'phase_gallery'],
    ];
    return <div className="craft-progress" role="status">
        <div className="craft-progress-legend" aria-label={t('prep_workers')}>
            <span>{t('worker')}</span>
            {colors.map((color, workerId) => <span className="craft-progress-legend-item" key={workerId}
                title={`${t('worker')} ${workerId + 1}`}>
                <i style={{backgroundColor: color}} aria-hidden="true" />{workerId + 1}
            </span>)}
        </div>
        {stages.map(([key, label]) => {
            if (key === 'baseline') return <div key={key} className="craft-progress-stage" data-stage={key}>
                <div className="craft-progress-label"><span>{t(label)}</span></div>
                <ProgressBar compact count={baseline.current || 0} total={baseline.total || 0} />
            </div>;
            const segments = candidates.map((candidate, index) => {
                const slice = candidate?.[key];
                const complete = candidate?.phase === 'slot_complete';
                const fraction = complete ? 1 : key === 'slots' ? 0 : slice?.fraction ?? 0;
                const title = [`${t('candidate')} ${index + 1}`,
                    candidate?.slot ? lang.get('artifact_set.' + candidate.slot) : '',
                    candidate ? `${t('worker')} ${candidate.workerId + 1}` : t('phase_waiting'),
                    t(label), `${Math.floor(fraction * 100)}%`,
                    slice?.total ? `${number(slice.current)} / ${number(slice.total)}`
                        : complete && key !== 'slots' ? t('stage_not_needed') : '',
                ].filter(Boolean).join(' · ');
                return {fraction, title, workerId: candidate?.workerId};
            });
            const completed = segments.filter(segment => segment.fraction === 1).length;
            const percent = total ? segments.reduce((sum, segment) => sum + segment.fraction, 0) * 100 / total : 0;
            return <div className="craft-progress-stage" data-stage={key} key={key}>
                <div className="craft-progress-label">
                    <span>{t(label)}</span>
                    <span className="craft-progress-counter">{completed} / {total} · {Math.floor(percent)}%</span>
                </div>
                <div className="craft-progress-segments" role="progressbar" aria-label={t(label)}
                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent * 10) / 10}>
                    {segments.map((segment, index) => <div className="craft-progress-segment" key={index}
                        data-candidate-index={index} data-worker-id={segment.workerId} title={segment.title}
                        style={{'--worker-color': colors[segment.workerId]}}>
                        <div className="craft-progress-segment-fill" style={{width: segment.fraction * 100 + '%'}} />
                    </div>)}
                </div>
            </div>;
        })}
    </div>;
}
