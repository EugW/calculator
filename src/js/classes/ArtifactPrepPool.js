import { evaluateArtifactActionCandidate } from './ArtifactActionPrep';

/** A reservation lasts through preparation, GPU waiting, rescore and final output. */
export class ArtifactPrepPool {
    constructor({size = 1, workerFactory, executeGPU} = {}) {
        this.size = size;
        this.createWorker = workerFactory;
        this.executeGPU = executeGPU;
        this.factoryPromise = null;
        this.workers = [];
        this.busy = new Set();
        this.pending = new Map();
        this.nextJobId = 0;
        this.inline = false;
        this.destroyed = false;
    }

    async ensureWorker(index) {
        if (this.inline) return null;
        if (this.workers[index]) return this.workers[index];
        let worker;
        try {
            // Isolate import.meta from the pool's static import graph.
            this.factoryPromise ||= this.createWorker
                ? Promise.resolve(this.createWorker)
                : import('./ArtifactPrepWorkerFactory.js').then(module => module.createPrepWorker);
            const factory = await this.factoryPromise;
            if (this.destroyed) return null;
            worker = await factory();
        } catch (error) {
            if (!this.inline && !this.destroyed) {
                console.warn(`ArtifactPrepPool: nested workers unavailable (${error?.message || error}); running candidate CPU stages inline`);
            }
            this.inline = true;
            return null;
        }
        if (this.destroyed) {
            worker.terminate();
            return null;
        }
        this.workers[index] = worker;
        return worker;
    }

    run({input, onProgress}) {
        if (this.destroyed) return Promise.reject(new Error('Candidate pool destroyed'));
        let index = 0;
        while (index < this.size && this.busy.has(index)) ++index;
        if (index === this.size) return Promise.reject(new Error('Candidate pool exhausted'));
        this.busy.add(index);
        const jobId = `candidate-${++this.nextJobId}`;
        return new Promise((resolve, reject) => {
            let detach = () => {};
            let gpuRequested = false;
            const report = update => onProgress?.({...update, workerId: index, jobId});
            const finish = (error, result) => {
                if (!this.pending.delete(jobId)) return;
                detach();
                this.busy.delete(index);
                if (error) reject(error);
                else {
                    try {
                        report({phase: 'slot_complete', completedWork: result.completedWork});
                        resolve(result);
                    } catch (error) { reject(error); }
                }
            };
            this.pending.set(jobId, finish);
            const start = async () => {
                report({phase: 'prepare'});
                const worker = await this.ensureWorker(index);
                if (this.destroyed) return;
                if (!worker) {
                    const result = await evaluateArtifactActionCandidate(structuredClone(input), {
                        onProgress: update => { if (this.pending.has(jobId)) report(update); },
                        executeGPU: async (request, progress) => {
                            if (this.destroyed) throw new Error('Candidate pool destroyed');
                            const transferred = structuredClone(request, {transfer: Object.values(request.inputs)
                                .filter(ArrayBuffer.isView).map(view => view.buffer)});
                            const reply = await this.executeGPU(transferred, progress);
                            return structuredClone(reply, {transfer: [reply.readback.buffer]});
                        },
                    });
                    finish(null, result);
                    return;
                }
                const send = (data, transfer = []) => {
                    if (this.pending.has(jobId)) worker.postMessage({jobId, ...data}, transfer);
                };
                const onMessage = ({data}) => {
                    if (data?.jobId !== jobId || !this.pending.has(jobId)) return;
                    try {
                        if (data.type === 'PROGRESS') report(data.update);
                        else if (data.type === 'DONE') finish(null, data.result);
                        else if (data.type === 'ERROR') finish(new Error(data.message || 'Candidate worker failed'));
                        else if (data.type === 'GPU_REQUEST') {
                            if (gpuRequested) throw new Error('Candidate requested GPU more than once');
                            gpuRequested = true;
                            Promise.resolve().then(() => {
                                if (!this.pending.has(jobId)) throw new Error('Candidate pool destroyed');
                                return this.executeGPU(data.request, update => send({type: 'GPU_PROGRESS', update}));
                            }).then(result => send({type: 'GPU_RESULT', result}, [result.readback.buffer]),
                                error => send({type: 'GPU_ERROR', message: error?.message || String(error)}))
                                .catch(error => finish(error));
                        } else throw new Error('Unknown candidate worker message');
                    } catch (error) { finish(error); }
                };
                const onError = event => finish(new Error('Candidate worker crashed: ' + (event?.message || 'unknown')));
                worker.addEventListener('message', onMessage);
                worker.addEventListener('error', onError);
                worker.addEventListener('messageerror', onError);
                detach = () => {
                    worker.removeEventListener('message', onMessage);
                    worker.removeEventListener('error', onError);
                    worker.removeEventListener('messageerror', onError);
                };
                worker.postMessage({type: 'CANDIDATE', jobId, input});
            };
            start().catch(error => finish(error));
        });
    }

    destroy() {
        this.destroyed = true;
        for (const finish of this.pending.values()) finish(new Error('Candidate pool destroyed'));
        for (const worker of this.workers) worker?.terminate();
        this.workers = [];
    }
}
