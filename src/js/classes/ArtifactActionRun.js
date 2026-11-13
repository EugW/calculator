import { Artifact } from './Artifact';
import { serializeWorkerMember, deserializeWorkerMember } from './Team';
import { WorkerFactoryArtifactActionPredictor } from './WorkerFactory/ArtifactActionPredictor';

const copy = value => JSON.parse(JSON.stringify(value));
const artifact = value => Artifact.deserialize(value.slice());

export function artifactBaselineNeedsConfirmation(record) {
    if (record.exclusions.length) return true;
    const tolerance = 1e-6 * Math.max(1, Math.abs(record.value), Math.abs(record.currentValue));
    return record.changedSlots.length > 0 && Math.abs(record.value - record.currentValue) > tolerance;
}

/** Keep the input to baseline, prediction and saved results identical even if
 * the live loadout changes while the baseline confirmation is open. */
export function captureArtifactActionRun(request) {
    return copy({...request, build: serializeWorkerMember(request.build),
        inventory: request.inventory.map(item => item.serialize()),
        ...(request.reshapeTargets ? {reshapeTargets: request.reshapeTargets.map(target => ({...target,
            artifact: target.artifact.serialize()}))} : {}),
        ...(request.upgradeTargets ? {upgradeTargets: request.upgradeTargets.map(item => item.serialize())} : {}),
    });
}

function restoreRequest(snapshot) {
    const request = copy(snapshot);
    return {...request, build: deserializeWorkerMember(request.build), inventory: request.inventory.map(artifact),
        ...(request.reshapeTargets ? {reshapeTargets: request.reshapeTargets.map(target => ({...target,
            artifact: artifact(target.artifact)}))} : {}),
        ...(request.upgradeTargets ? {upgradeTargets: request.upgradeTargets.map(artifact)} : {}),
    };
}

/** A single baseline request followed by a prediction using its exact result.
 * The UI owns the decision whether a baseline needs confirmation. */
export class ArtifactActionRun {
    constructor({callback, baselineCallback, progressCallback, errorCallback}, Factory = WorkerFactoryArtifactActionPredictor) {
        this.callback = callback;
        this.baselineCallback = baselineCallback;
        this.factory = new Factory({
            callback: result => {
                this.factory.dispose();
                if (!this.snapshot) return;
                if (this.operation === 'baseline') {
                    this.baseline = copy(result);
                    this.baselineCallback(this.baseline);
                } else {
                    this.callback({...result, runSnapshot: copy(this.snapshot)});
                }
            },
            progressCallback,
            errorCallback: error => { this.dispose(); errorCallback(error); },
        });
    }

    run(request) {
        this.dispose();
        this.snapshot = captureArtifactActionRun(request);
        this.operation = 'baseline';
        this.factory.run({...restoreRequest(this.snapshot), operation: 'baseline'});
    }

    predict() {
        if (!this.snapshot || !this.baseline || this.operation !== 'baseline') return;
        this.operation = 'predict';
        this.factory.run({...restoreRequest(this.snapshot), operation: 'predict', baseline: copy(this.baseline)});
    }

    dispose() {
        this.factory.dispose();
        this.snapshot = null;
        this.baseline = null;
        this.operation = null;
    }
}
