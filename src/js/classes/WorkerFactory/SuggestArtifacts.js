import { Artifact } from "../Artifact";
import { ArtifactsSuggestSort } from "../ArtifactsSuggestSort";
import {
    DEFAULT_OPTIMIZER_RESULT_LIMIT,
    finalizeOptimizerResults,
} from "../OptimizerResult";
import { WorkerFactory } from "../WorkerFactory";

const MAX_WORKERS_CNT = 16;
const MAX_RESULTS = DEFAULT_OPTIMIZER_RESULT_LIMIT;
const MIN_COMBINATIONS_PER_THREAD = 2_000_000;

export class WorkerFactorySuggestArtifacts extends WorkerFactory {
    createWorker() {
        return new Worker(new URL('../../workers/ArtifactsSuggest.js', import.meta.url));
    }

    getResult() {
        const failedWorker = this.workers.find((item) => item.isError);
        if (failedWorker) {
            throw new Error(failedWorker.errorMessage || 'Artifact optimization failed');
        }

        let result = [];

        for (const item of this.workers) {
            if (!item.result) continue;
            result = result.concat(item.result);
        }

        for (let item of result) {
            let deserialized = [];
            for (let artData of item.artifacts) {
                if (artData) {
                    deserialized.push(Artifact.deserialize(artData));
                }
            }
            item.artifacts = deserialized;
        }


        result = finalizeOptimizerResults(result, this.resultLimit || MAX_RESULTS);

        return result;
    }

    onMessage(index, data, generation = this.runGeneration) {
        if (!this.isRunActive(generation) || !this.workers[index]) {
            return;
        }

        if (!data || typeof data !== 'object') {
            throw new Error('Artifact worker returned an invalid message');
        }

        // Handle error messages from worker
        if (Object.prototype.hasOwnProperty.call(data, 'error')) {
            this.onError(index, data.error, generation);
            return;
        }
        
        if (Object.prototype.hasOwnProperty.call(data, 'result')) {
            if (!Array.isArray(data.result)) {
                throw new Error('Artifact worker returned an invalid result');
            }
            super.onMessage(index, data.result, generation);
            return;
        }

        const isProgress = ['count', 'total', 'skipped'].some((key) => {
            return Object.prototype.hasOwnProperty.call(data, key);
        });
        if (!isProgress) {
            throw new Error('Artifact worker returned an invalid message');
        }

        this.workers[index].count = data.count;
        this.workers[index].total = data.total;
        this.workers[index].skipped = data.skipped;
        this.updateProgress(generation);
    }

    updateProgress(generation = this.runGeneration) {
        if (!this.isRunActive(generation)) {
            return;
        }

        let progress = [];

        for (let item of this.workers) {
            progress.push({
                count: item.count || 0,
                total: item.total || 0,
                skipped: item.skipped || 0,
            });
        }

        if (this.progressCallback) {
            this.progressCallback({workers: progress});
        }
    }

    getWorkersPayload(data) {
        const requestedLimit = data.limit === undefined ? MAX_RESULTS : Number(data.limit);
        if (data.useGPU && requestedLimit !== MAX_RESULTS) {
            throw new RangeError(
                `GPU optimizer result limit is fixed at ${MAX_RESULTS}; got ${data.limit}`
            );
        }

        let arts = {
            flower: [],
            plume: [],
            sands: [],
            goblet: [],
            circlet: [],
        };

        let filteredArtifacts = data.artifacts;
        if (data.fastFilter) {
            let suggester = new ArtifactsSuggestSort({
                build: data.calcset,
                featureName: data.feature,
                featureType: data.featureType,
                settings: data.settings,
            });

            filteredArtifacts = suggester.sort(filteredArtifacts, data.fastFilterLimit || 25);
        }

        for (const item of filteredArtifacts) {
            arts[item.slot].push(item.serialize());
        }

        let maxSlot = 'flower';
        for (const slot of Object.keys(arts)) {
            if (arts[slot].length > arts[maxSlot].length) {
                maxSlot = slot;
            }
        }

        const maxThreads = data.useGPU ? 1 : this.maxThreads;
        const globalCounts = {};
        for (const slot of Object.keys(arts)) {
            globalCounts[slot] = Math.max(1, arts[slot].length);
        }
        let numParts = Math.min(
            maxThreads,
            MAX_WORKERS_CNT,
            Math.ceil(arts[maxSlot].length / 2),
            Math.ceil(calcCombinations(arts) / MIN_COMBINATIONS_PER_THREAD)
        );
        numParts = Math.max(1, numParts);

        let partSize = arts[maxSlot].length / numParts;
        let parts = [];
        let used = 0;

        for (let i = 0; i < numParts; ++i) {
            let size = Math.floor((i + 1 ) * partSize) - used;
            const splitOffset = used;
            let part = arts[maxSlot].splice(0, size);
            used += part.length;

            for (const slot of Object.keys(arts)) {
                if (slot == maxSlot) continue;

                part = part.concat(arts[slot]);
            }

            parts.push({artifacts: part, splitOffset});
        }


        data.calcset = data.calcset.serialize();
        data.settings.setMinValues = {};
        data.settings.setMaxValues = {};

        for (let name of [data.settings.required_sets.set1, data.settings.required_sets.set2]) {
            if (name) {
                data.settings.setMinValues[name] = (data.settings.setMinValues[name] || 0) + 2;
            }
        }

        for (let [id, val] of Object.entries(data.settings.sets)) {
            if (val) continue;
            let [setName, pieces] = id.split('-');

            if (data.settings.setMaxValues[setName] && data.settings.setMaxValues[setName] < pieces) continue;
            data.settings.setMaxValues[setName] = pieces;
        }

        let result = [];
        for (let part of parts) {
            result.push(
                Object.assign({}, data, {
                    artifacts: part.artifacts,
                    limit: this.resultLimit,
                    combinationIndexContext: {
                        splitSlot: maxSlot,
                        splitOffset: part.splitOffset,
                        globalCounts,
                    },
                })
            );
        }

        return result;
    }

    run(data) {
        this.resultLimit = normalizeResultLimit(data.limit);
        this.maxThreads = data.useGPU ? 1 : data.maxThreads;

        super.run(data);
    }
}

function normalizeResultLimit(limit) {
    limit = Number(limit);
    return Number.isInteger(limit) && limit > 0 ? limit : MAX_RESULTS;
}

function calcCombinations(items) {
    let result = 1;
    for (let slot of Object.keys(items)) {
        result *= items[slot].length || 1;
    }
    return result;
}
