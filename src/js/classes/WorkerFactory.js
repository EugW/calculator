export class WorkerFactory {
    constructor(params) {
        params = Object.assign({}, params);
        this.callback = params.callback;
        this.startCallback = params.startCallback;
        this.terminateCallback = params.terminateCallback;
        this.progressCallback = params.progressCallback;
        this.errorCallback = params.errorCallback;
        this.workers = [];
        this.startedAt = null;
        this.isSettled = true;
        this.runGeneration = 0;
    }

    getUrl() {
        return this.url;
    }

    terminate(clear) {
        ++this.runGeneration;
        this.isSettled = true;
        let finishedWorkers = [];

        for (let item of this.workers) {
            this.detachWorker(item.worker);
            if (item.isCompleted) {
                item.result = null;
                finishedWorkers.push(item);
            } else {
                this.terminateWorker(item.worker);
            }
        }

        this.workers = finishedWorkers;

        if (!clear && this.terminateCallback) {
            this.terminateCallback();
        }
    }

    getWorkersPayload(data) {
        return [data];
    }

    isRunActive(generation = this.runGeneration) {
        return !this.isSettled && generation === this.runGeneration;
    }

    detachWorker(worker) {
        if (!worker) {
            return;
        }

        for (const handler of ['onmessage', 'onerror', 'onmessageerror']) {
            try {
                worker[handler] = null;
            } catch (error) {
                // Keep detaching the remaining handlers and workers.
            }
        }
    }

    terminateWorker(worker) {
        if (!worker || typeof worker.terminate !== 'function') {
            return;
        }

        try {
            worker.terminate();
        } catch (error) {
            // The run is already being abandoned. A native terminate failure
            // must not leave the rest of the worker pool alive.
        }
    }

    discardWorkers(workers) {
        for (const item of workers) {
            this.detachWorker(item.worker);
            this.terminateWorker(item.worker);
        }
    }

    onMessage(index, data, generation = this.runGeneration) {
        if (!this.isRunActive(generation) || !this.workers[index]) {
            return;
        }

        if (data.progress) {
            this.acceptProgress(index, data.progress, generation);
        } else {
            this.workers[index].isCompleted = true;
            this.workers[index].result = data;
            this.checkCompleted(generation);
        }
    }

    onError(index, data, generation = this.runGeneration) {
        if (!this.isRunActive(generation)) {
            return;
        }

        this.isSettled = true;

        let errorMessage = getWorkerErrorMessage(data);
        if (this.workers[index]) {
            this.workers[index].isError = true;
            this.workers[index].errorMessage = errorMessage;
        }

        for (let item of this.workers) {
            this.detachWorker(item.worker);
            if (!item.isCompleted) {
                this.terminateWorker(item.worker);
            }
        }

        if (this.errorCallback) {
            this.errorCallback({ worker: index, error: errorMessage });
        }
    }

    getResult() {
        return {};
    }

    checkCompleted(generation = this.runGeneration) {
        if (!this.isRunActive(generation)) {
            return;
        }

        let completed = 0;

        for (let item of this.workers) {
            if (item.isCompleted || item.isError) {
                ++completed;
            }
        }

        if (completed == this.workers.length) {
            this.submitResult(generation);
        }
    }

    acceptProgress(index, data, generation = this.runGeneration) {
        if (!this.isRunActive(generation) || !this.workers[index]) {
            return;
        }

        if (data.inc) {
            this.workers[index].progress.completed += data.inc;
        } else if (data.completed) {
            this.workers[index].progress = {
                completed: data.completed,
                total: data.total,
            };
        } else if (data.total) {
            this.workers[index].progress.total = data.total;
        } else {
            return;
        }

        this.checkProgress();
    }

    checkProgress() {
        if (!this.progressCallback) {
            return;
        }

        let completed = 0;
        let total = 0;

        for (let item of this.workers) {
            if (item.progress && item.progress.total) {
                completed += item.progress.completed;
                total += item.progress.total;
            }
        }

        this.progressCallback({
            completed: completed,
            total: total,
        });
    }

    submitResult(generation = this.runGeneration) {
        if (!this.isRunActive(generation)) {
            return;
        }

        let result;
        try {
            result = this.getResult();
        } catch (error) {
            this.onError(-1, error, generation);
            return;
        }

        this.isSettled = true;
        for (const item of this.workers) {
            this.detachWorker(item.worker);
        }
        UI.debug(this.constructor.name +' finished in: '+ (performance.now() - this.startedAt));
        this.callback(result);
    }

    createWorker() {
        return null;
    }

    run(data) {
        this.terminate(true);

        this.startedAt = performance.now();
        this.progress = {completed: 0, total: 0};
        this.isSettled = false;
        const generation = this.runGeneration;

        let payloads;
        try {
            payloads = Array.from(this.getWorkersPayload(data));
            if (payloads.length == 0) {
                throw new Error('Worker factory produced no work items');
            }
        } catch (error) {
            this.onError(-1, error, generation);
            return;
        }

        let finishedWorkers = this.workers;
        this.workers = [];

        for (let payload of payloads) {
            let old = finishedWorkers.shift();
            let worker;

            try {
                if (old) {
                    worker = old.worker;
                } else {
                    worker = this.createWorker();
                }

                if (!worker || typeof worker.postMessage !== 'function') {
                    throw new Error('Worker factory failed to create a worker');
                }
            } catch (error) {
                this.discardWorkers(finishedWorkers);
                this.onError(this.workers.length, error, generation);
                return;
            }

            let index = this.workers.length;
            this.workers.push({
                isCompleted: false,
                isError: false,
                worker: worker,
                result: {},
                progress: {completed: 0, total: 0},
                payload: payload,
            });

            try {
                worker.onmessage = (event) => {
                    if (!this.isRunActive(generation)) {
                        return;
                    }

                    try {
                        this.onMessage(index, event?.data, generation);
                    } catch (error) {
                        if (this.isRunActive(generation)) {
                            this.onError(index, error, generation);
                        } else {
                            throw error;
                        }
                    }
                };
                worker.onerror = (error) => {
                    if (!this.isRunActive(generation)) {
                        return;
                    }
                    if (typeof error?.preventDefault === 'function') {
                        error.preventDefault();
                    }
                    this.onError(index, error, generation);
                };
                worker.onmessageerror = (error) => {
                    this.onError(index, error, generation);
                };
            } catch (error) {
                this.discardWorkers(finishedWorkers);
                this.onError(index, error, generation);
                return;
            }
        }

        this.discardWorkers(finishedWorkers);

        try {
            if (this.startCallback) {
                this.startCallback({
                    workers: this.workers.length,
                });
            }
        } catch (error) {
            this.onError(-1, error, generation);
            return;
        }

        if (!this.isRunActive(generation)) {
            return;
        }

        for (let index = 0; index < this.workers.length; ++index) {
            let item = this.workers[index];
            try {
                item.worker.postMessage(item.payload);
            } catch (error) {
                this.onError(index, error, generation);
                break;
            }
        }
    }
}

function getWorkerErrorMessage(error) {
    if (typeof error === 'string' && error) {
        return error;
    }
    if (error?.message) {
        return error.message;
    }
    if (error?.error?.message) {
        return error.error.message;
    }
    return 'Worker error';
}

export function sendWorkerProgeress(completed, total) {
    if (typeof self !== 'undefined') {
        self.postMessage({
            progress: {
                completed: completed,
                total: total,
            },
        });
    }
}

export function sendWorkerProgeressTotal(total) {
    if (typeof self !== 'undefined') {
        self.postMessage({
            progress: {
                total: total,
            },
        });
    }
}

export function sendWorkerProgeressInc(completed) {
    if (typeof self !== 'undefined') {
        self.postMessage({
            progress: {
                inc: completed || 1,
            },
        });
    }
}
