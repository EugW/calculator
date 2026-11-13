import { WorkerFactory } from "../WorkerFactory";
import { serializeWorkerMember } from "../Team";

export class WorkerFactorySuggestMainStat extends WorkerFactory {
    createWorker() {
        return new Worker(new URL('../../workers/ArtifactMainStatSuggest.js', import.meta.url));
    }

    getResult() {
        let result = [];

        for (const item of this.workers) {
            result = result.concat(item.result.result);
        }

        return result;
    }

    getWorkersPayload(data) {
        data.build = serializeWorkerMember(data.build);
        return [data];
    }
}
