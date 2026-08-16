import { Artifact } from "../Artifact";
import { WorkerFactory } from "../WorkerFactory";

const DEFAULT_WORKERS = 4;

export class WorkerFactoryArtifactUpgradePredictor extends WorkerFactory {
    createWorker() {
        return new Worker(new URL('../../workers/ArtifactUpgradePredictor.js', import.meta.url));
    }

    getResult() {
        let result = [];

        for (let item of this.workers) {
            if (!item.isCompleted || !item.result || !item.result.result) {
                continue;
            }

            result = result.concat(item.result.result);
        }

        for (let item of result) {
            item.artifact = Artifact.deserialize(item.artifact);
        }

        return result.sort((a, b) => {
            return (b.score - a.score)
                || (b.improveChance - a.improveChance)
                || (b.absoluteGain - a.absoluteGain)
                || (b.expectedValue - a.expectedValue);
        });
    }

    getWorkersPayload(data) {
        let artifacts = data.artifacts.map((item) => {
            return item.serialize();
        });
        let workers = Math.max(1, Math.min(data.maxThreads || DEFAULT_WORKERS, artifacts.length || 1));
        let partSize = Math.ceil(artifacts.length / workers);
        let result = [];

        for (let index = 0; index < workers; ++index) {
            let part = artifacts.slice(index * partSize, (index + 1) * partSize);

            if (part.length === 0) {
                continue;
            }

            result.push({
                build: data.build.serialize(),
                artifacts: part,
                feature: data.feature,
                featureType: data.featureType,
                baseValue: data.baseValue,
            });
        }

        return result;
    }
}
