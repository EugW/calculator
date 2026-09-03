import { WorkerFactory } from '../WorkerFactory';

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
        return [{...data, build: data.build.serialize(), inventory: data.inventory.map(artifact => artifact.serialize()),
            ...(data.reshapeTargets !== undefined ? {reshapeTargets: data.reshapeTargets.map(target => ({
                id: target.id, slot: target.slot ?? target.artifact?.slot,
                artifact: target.artifact?.serialize() ?? null, selectedSubstats: target.selectedSubstats,
            }))} : {}),
            ...(data.upgradeTargets !== undefined ? {upgradeTargets: data.upgradeTargets.map(artifact => artifact.serialize())} : {})}];
    }

    getResult() {
        return this.workers[0].result.result;
    }

    onMessage(index, data, generation = this.runGeneration) {
        if (!this.isRunActive(generation) || !this.workers[index]) return;
        if (!data || typeof data !== 'object') throw new Error('Invalid artifact action worker message');
        if ('error' in data) return this.onError(index, data.error, generation);
        if (data.progress) {
            this.progressCallback?.(data.progress);
            return;
        }
        if (!Array.isArray(data.result?.rows)) throw new Error('Invalid artifact action worker result');
        super.onMessage(index, data, generation);
    }
}
