import { WorkerFactory } from '../WorkerFactory';
import { serializeWorkerMember } from '../Team';

/**
 * Runs {operation: 'baseline'} (the optimized build a prediction measures
 * gains from, see computeArtifactActionBaseline) or a prediction, which may
 * take that baseline as `baseline`. getResult() is the baseline record or
 * the prediction's result, by the run's operation. The prediction checks a
 * baseline's version and fingerprint when it takes it.
 */

export class WorkerFactoryArtifactActionPredictor extends WorkerFactory {
    createWorker() {
        return new Worker(new URL('../../workers/ArtifactActionPredictor.js', import.meta.url));
    }

    dispose() {
        this.terminate(true);
        this.discardWorkers(this.workers);
        this.workers = [];
    }

    getWorkersPayload(data) {
        this.operation = data.operation === 'baseline' ? 'baseline' : 'predict';
        return [{...data, build: serializeWorkerMember(data.build), inventory: data.inventory.map(artifact => artifact.serialize()),
            ...(data.reshapeTargets !== undefined ? {reshapeTargets: data.reshapeTargets.map(target => ({
                id: target.id, slot: target.slot ?? target.artifact?.slot,
                artifact: target.artifact?.serialize() ?? null, selectedSubstats: target.selectedSubstats,
            }))} : {}),
            ...(data.upgradeTargets !== undefined ? {upgradeTargets: data.upgradeTargets.map(artifact => artifact.serialize())} : {})}];
    }

    getResult() {
        let data = this.workers[0].result;
        return this.operation === 'baseline' ? data.baseline : data.result;
    }

    onMessage(index, data, generation = this.runGeneration) {
        if (!this.isRunActive(generation) || !this.workers[index]) return;
        if (!data || typeof data !== 'object') throw new Error('Invalid artifact action worker message');
        if ('error' in data) return this.onError(index, data.error, generation);
        if (data.progress) {
            this.progressCallback?.(data.progress);
            return;
        }
        if (this.operation === 'baseline') {
            if (typeof data.baseline?.fingerprint !== 'string' || !Number.isFinite(data.baseline?.value)) {
                throw new Error('Invalid artifact action baseline');
            }
        } else if (!Array.isArray(data.result?.rows)) {
            throw new Error('Invalid artifact action worker result');
        }
        super.onMessage(index, data, generation);
    }
}
