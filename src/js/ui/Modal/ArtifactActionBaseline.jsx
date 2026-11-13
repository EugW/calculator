import React from 'react';
import '../../../css/modal/ArtifactActionBaseline.css';
import { ControlsBar } from '../Components/ControlsBar';
import { DialogContainer } from '../Components/Dialog/Container';
import { ArtifactListItem } from '../Components/Artifact';
import { TitledButton } from '../Components/Inputs/Buttons';
import { Checkbox } from '../Components/Inputs/Input';
import { Lang } from '../Lang';

const lang = new Lang();
const t = key => lang.get('artifact_baseline.' + key);
const number = value => Number.isFinite(value) ? value.toLocaleString(undefined, {maximumFractionDigits: 2}) : '—';

/** Presentation only: baseline optimization and resuming its request are owned by the action dialog. */
export function ArtifactActionBaselineModal({currentValue, baselineValue, changes, exclusions, dontAsk,
    onDontAsk, onEquip, onSettings, onContinue, onClose}) {
    const piece = artifact => artifact
        ? <div className="baseline-piece">
            <span>{lang.get(DB.Artifacts.Sets.get(artifact.getSetName()).getName())}</span>
            <ArtifactListItem art={artifact} hash={artifact.getHash()}/>
        </div>
        : <span>{t('empty')}</span>;
    return <DialogContainer addClass="artifact-baseline-modal" width={760} centered isVisible
        title={t('title')} closeCallback={onClose}>
        <p>{t('description')}</p>
        <div className="baseline-values">
            <span>{t('current')}: <strong>{number(currentValue)}</strong></span>
            <span>{t('baseline')}: <strong>{number(baselineValue)}</strong></span>
            <span>{t('difference')}: {number(baselineValue - currentValue)}</span>
        </div>
        <div className="baseline-changes">
            <table>
                <thead><tr><th>{t('slot')}</th><th>{t('current')}</th><th>{t('baseline')}</th></tr></thead>
                <tbody>{changes.map(change => <tr key={change.slot}>
                    <th>{lang.get('artifact_set.' + change.slot)}</th>
                    <td>{piece(change.current)}</td><td>{piece(change.baseline)}</td>
                </tr>)}</tbody>
            </table>
        </div>
        {!!exclusions.length && <div className="baseline-exclusions">
            <p>{t('excluded')}</p>
            <ul>{exclusions.map((text, index) => <li key={index}>{text}</li>)}</ul>
        </div>}
        <Checkbox checked={dontAsk} title={t('dont_ask')} onChange={onDontAsk}/>
        <ControlsBar wrap>
            <TitledButton type="button" title={t('equip')} icon="icon-load" onClick={onEquip}/>
            <TitledButton type="button" title={t('settings')} icon="icon-settings" onClick={onSettings}/>
            <TitledButton type="button" title={t('continue')} icon="icon-ok" onClick={onContinue}/>
        </ControlsBar>
    </DialogContainer>;
}
