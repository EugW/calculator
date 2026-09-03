import React from 'react';
import '../../../css/Components/Modal/ArtifactCraft.css';
import { historyEntryBest, historyEntryRowCount } from '../../classes/StorageItem/ArtifactActionHistory';
import { ControlsBar, ControlsBarDivider } from '../Components/ControlsBar';
import { DialogContainer } from '../Components/Dialog/Container';
import { FullHeight, FullHeightScrollable, FullHeightStatic } from '../Components/FullHeight';
import { ArtifactSetIcon } from '../Components/Icons';
import { TitledButton } from '../Components/Inputs/Buttons';
import { Lang } from '../Lang';

const lang = new Lang();
const t = key => lang.get('artifact_action.' + key);
const number = value => Number.isFinite(value) ? value.toLocaleString(undefined, {maximumFractionDigits: 2}) : '—';
const percent = value => number(value * 100) + '%';
// Icons shown per entry before falling back to the "+N" overflow label.
const PREVIEW_ICONS = 5;

/**
 * Set/slot identity parsed from a serialized artifact without a full
 * deserialize: serialize() lays out [version, setId, rarity, level, slotId,
 * ...], so icons render straight from the index with no IndexedDB reads.
 */
function serializedIdentity(data) {
    try {
        if (!Array.isArray(data) || data.length < 5) return null;
        const set = DB.Artifacts.Sets.getKeyId(data[1]);
        const slot = DB.Artifacts.Slots.getKeyId(data[4]);
        if (!set || !slot || !DB.Artifacts.Sets.get(set) || !DB.Artifacts.Slots.get(slot)) return null;
        return {set, slot};
    } catch {
        return null;
    }
}

/**
 * Unified saved-calculation browser for Craft/Reshape/Upgrade runs, opened
 * from the Artifacts tab. All records are shown together, grouped by kind
 * with a centered section separator. Opening an entry
 * hands the stored result back to the matching modal, which re-renders its
 * regular results screen — including the outcome gallery when the entry kept
 * one. Gallery blobs load asynchronously from IndexedDB; legacy gallery-less
 * entries open instantly.
 */
export class ArtifactActionHistoryList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {nonce: 0, openingId: null, openError: ''};
    }
    entries() {
        return this.props.app.storage.actionHistory.listEntries();
    }
    async open(entry) {
        if (this.state.openingId) return;
        if (entry.version === 1) {
            this.props.onOpen(entry, entry.result);
            return;
        }
        this.setState({openingId: entry.id, openError: ''});
        try {
            const opened = await this.props.app.storage.actionHistory.openRun(entry.id);
            if (!opened?.result) {
                this.setState({openingId: null, openError: t('history_open_failed')});
                return;
            }
            this.setState({openingId: null});
            this.props.onOpen(entry, opened.result);
        } catch (error) {
            this.setState({openingId: null, openError: t('history_open_failed')});
        }
    }
    remove(entry, event) {
        event.stopPropagation();
        UI.ConfirmWindow.show('modal.confirm', 'artifact_action.history_delete_confirm', () => {
            this.props.app.storage.actionHistory.removeRun(entry.id).catch(() => {}).finally(() => {
                this.setState(state => ({nonce: state.nonce + 1, openError: ''}));
            });
        });
    }
    summary(entry) {
        if (entry.kind === 'craft' && entry.context?.set) {
            const set = DB.Artifacts.Sets.get(entry.context.set);
            const slots = entry.context.slots?.length ?? historyEntryRowCount(entry);
            return (set ? lang.get(set.getName()) : entry.context.set) + ' · ' + t('history_slots') + ': ' + slots;
        }
        return t('history_artifacts') + ': ' + historyEntryRowCount(entry);
    }
    best(entry) {
        const best = historyEntryBest(entry);
        return best === null ? '—' : '+' + percent(best);
    }
    /**
     * Minimal preview built from index-only data (no IndexedDB reads):
     * craft shows its set/slot icons, reshape its source icons. Upgrade
     * entries store only a candidate count, so they keep the text summary.
     */
    preview(entry) {
        if (entry.kind === 'craft' && entry.context?.set && Array.isArray(entry.context.slots)) {
            const icons = [];
            for (const slot of entry.context.slots) {
                if (typeof slot !== 'string' || !DB.Artifacts.Slots.get(slot)) continue;
                icons.push({key: slot, set: entry.context.set, slot});
            }
            if (!icons.length || !DB.Artifacts.Sets.get(entry.context.set)) return null;
            return {icons: icons.slice(0, PREVIEW_ICONS), overflow: Math.max(0, icons.length - PREVIEW_ICONS)};
        }
        if (entry.kind === 'reshape' && Array.isArray(entry.context?.sources)) {
            const icons = [];
            for (const [id, data] of entry.context.sources) {
                const identity = serializedIdentity(data);
                if (identity) icons.push({key: id, ...identity});
            }
            if (!icons.length) return null;
            return {icons: icons.slice(0, PREVIEW_ICONS), overflow: Math.max(0, icons.length - PREVIEW_ICONS)};
        }
        return null;
    }
    activate(entry, event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.open(entry);
        }
    }
    render() {
        const entries = this.entries();
        if (!entries.length) return <p className="craft-hint">{t('history_empty')}</p>;
        const {openingId, openError} = this.state;
        // Unified view: one separator-headed group per action kind, newest first.
        const groups = ['craft', 'reshape', 'upgrade'].map(kind => ({
            kind, entries: entries.filter(entry => entry.kind === kind),
        })).filter(group => group.entries.length);
        if (!groups.length) return <p className="craft-hint">{t('history_empty')}</p>;
        return <div className="action-history-list">
            {openingId && <p className="craft-hint">{t('history_loading')}</p>}
            {openError && <div role="alert" className="craft-error">{openError}</div>}
            {groups.map(group => <div key={group.kind} className="action-history-group" data-kind={group.kind}>
                <div className="action-history-separator">
                    <span>{t(group.kind + '_title')}</span>
                    <span className="action-history-count">{number(group.entries.length)}</span>
                </div>
                {group.entries.map(entry => this.renderEntry(entry, openingId))}
            </div>)}
        </div>;
    }
    renderEntry(entry, openingId) {
        const preview = this.preview(entry);
        return <div key={entry.id} className="craft-result-detail action-history-entry"
            role="button" tabIndex={openingId ? undefined : 0} aria-disabled={openingId === entry.id}
            onClick={() => this.open(entry)} onKeyDown={event => this.activate(entry, event)}
            aria-label={new Date(entry.timestamp).toLocaleString()}>
            <div className="action-history-main">
                <strong>{new Date(entry.timestamp).toLocaleString()}</strong>
                <span>{this.summary(entry)}</span>
                <span title={t('expected_gain')}>{t('expected_gain')}: {this.best(entry)}</span>
            </div>
            <div className="action-history-side">
                {preview && <div className="action-history-preview" aria-hidden="true">
                    {preview.icons.map(icon => <ArtifactSetIcon key={icon.key} size={24} set={icon.set} slot={icon.slot} />)}
                    {preview.overflow > 0 && <span className="action-history-preview-more">+{preview.overflow}</span>}
                </div>}
                <TitledButton icon="icon-delete" title={t('history_delete')} onClick={event => this.remove(entry, event)} />
            </div>
        </div>;
    }
}

/**
 * Unified history opened from the Artifacts tab. Reuses the artifact-action
 * dialog frame, scrolling body and footer controls, and routes the opened
 * result to the matching Craft/Reshape/Upgrade modal via onOpen.
 */
export class ArtifactActionHistoryModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {isVisible: false};
    }
    show() {
        this.setState({isVisible: true});
    }
    close() {
        this.setState({isVisible: false});
    }
    render() {
        const {isVisible} = this.state;
        return <DialogContainer addClass="artifact-action-modal artifact-history-modal" width={600} centered isVisible={isVisible}
            title={t('history')} closeCallback={() => this.close()}>
            {isVisible && <FullHeight>
                <FullHeightScrollable maxHeight="calc(100dvh - 210px)">
                    <ArtifactActionHistoryList app={this.props.app} onOpen={this.props.onOpen} />
                </FullHeightScrollable>
                <FullHeightStatic><ControlsBar>
                    <ControlsBarDivider />
                    <TitledButton icon="icon-cancel" title={lang.get('modal_buttons.close')} onClick={() => this.close()} />
                </ControlsBar></FullHeightStatic>
            </FullHeight>}
        </DialogContainer>;
    }
}
