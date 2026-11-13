import React from 'react';
import { Artifact } from '../../classes/Artifact';
import { ArtifactActionRun, artifactBaselineNeedsConfirmation } from '../../classes/ArtifactActionRun';
import { artifactActionFingerprint } from '../../classes/ArtifactActionPredictor';
import { acknowledgeArtifactBaseline, isArtifactBaselineAcknowledged } from '../../classes/ArtifactBaselineAcknowledgements';
import { equipArtifactPieces } from '../../classes/ArtifactSuggestRun';
import { equipTeamArtifact } from '../../classes/ArtifactTeamInventory';
import { deserializeWorkerMember } from '../../classes/Team';
import { ArtifactActionBaselineModal } from './ArtifactActionBaseline';
import { Lang } from '../Lang';

const lang = new Lang();
const t = key => lang.get('artifact_baseline.' + key);

/** Shared lifecycle for the three prediction dialogs. Their worker request is
 * frozen once, including the chosen Reshape/Upgrade targets. */
export class ArtifactActionBaselineFlow {
    constructor(dialog, callbacks, Run = ArtifactActionRun) {
        this.dialog = dialog;
        this.runner = new Run({...callbacks, baselineCallback: record => this.receive(record)});
    }

    run(request) {
        this.member = request.build;
        this.runner.run(request);
    }

    dispose() {
        this.runner.dispose();
        this.record = null;
        this.member = null;
    }

    current() {
        const {app} = this.dialog.props;
        const snapshot = this.runner.snapshot;
        const suggest = UI.BestArtifactTab.getSuggestData();
        return !!snapshot && this.member === app.currentSet() && !!suggest
            && artifactActionFingerprint({baseBuild: this.member, feature: snapshot.feature,
                featureType: snapshot.featureType, showBeta: app.showBetaContent(),
                optimizerSettings: suggest.settings}, suggest.artifacts) === this.record.fingerprint;
    }

    requireCurrent() {
        if (this.current()) return true;
        this.dispose();
        this.dialog.setState({stage: 'parameters', result: null, progress: {}, error: lang.get('artifact_action.stale')});
        return false;
    }

    receive(record) {
        this.record = record;
        if (!this.requireCurrent()) return;
        if (artifactBaselineNeedsConfirmation(record) && !isArtifactBaselineAcknowledged(record.fingerprint)) {
            this.dialog.setState({stage: 'baseline', baselineDontAsk: false, progress: {}});
        } else {
            this.runner.predict();
        }
    }

    continue(equip = false) {
        if (!this.record || !this.requireCurrent()) return;
        if (this.dialog.state.baselineDontAsk) acknowledgeArtifactBaseline(this.record.fingerprint);
        if (equip) {
            this.applying = true;
            try {
                const pieces = this.record.artifacts.map(data => Artifact.deserialize(data.slice()));
                // Install the whole loadout before per-piece ownership handling:
                // a partial loadout can prune shared member state (Nightsoul).
                equipArtifactPieces(this.member, pieces);
                for (const piece of pieces) equipTeamArtifact(this.member, piece, this.dialog.props.app.storage.artifacts);
                this.dialog.props.app.refresh();
            } finally {
                this.applying = false;
            }
        }
        this.dialog.setState({stage: 'progress', progress: {}});
        this.runner.predict();
    }

    cancel() {
        this.dispose();
        this.dialog.setState({stage: 'parameters', progress: {}});
    }

    settings() {
        this.dialog.close();
        UI.BestArtifactTab.component.showDefault();
        UI.Layout.showTab('bestart');
    }

    renderBaseline() {
        if (!this.dialog.state.isVisible || this.dialog.state.stage !== 'baseline' || !this.record) return null;
        const current = deserializeWorkerMember(this.runner.snapshot.build).getArtifacts();
        const pieces = this.record.artifacts.map(data => Artifact.deserialize(data.slice()));
        const changes = this.record.changedSlots.map(slot => ({slot, current: current[slot],
            baseline: pieces.find(piece => piece.slot === slot)}));
        return <ArtifactActionBaselineModal currentValue={this.record.currentValue} baselineValue={this.record.value}
            changes={changes} exclusions={this.record.exclusions.map(exclusionText)}
            dontAsk={!!this.dialog.state.baselineDontAsk}
            onDontAsk={value => this.dialog.setState({baselineDontAsk: value})}
            onEquip={() => this.continue(true)} onContinue={() => this.continue()}
            onSettings={() => this.settings()} onClose={() => this.cancel()}/>;
    }
}

function exclusionText(exclusion) {
    const set = exclusion.set ? lang.get(DB.Artifacts.Sets.get(exclusion.set).getName()) : '';
    if (exclusion.kind === 'set_disallowed') {
        return set + ': ' + lang.get('artifact_profile.allow_' + exclusion.pieces) + ' — ' + t('off');
    }
    if (exclusion.kind === 'set_required') {
        return t('required').replace('{set}', set).replace('{pieces}', exclusion.pieces);
    }
    if (exclusion.kind === 'not_candidate') {
        return t('not_candidate').replace('{slot}', lang.get('artifact_set.' + exclusion.slot));
    }
    return t('stat_constraints');
}
