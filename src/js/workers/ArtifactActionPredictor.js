// The database joins this worker's module graph; see webpack.config.js.
import "../db";
import { Artifact } from '../classes/Artifact';
import { deserializeWorkerMember } from '../classes/Team';
import { computeArtifactActionBaseline, evaluateArtifactActionPredictions } from '../classes/ArtifactActionPredictor';
import { artifactOutcomeTransferables } from '../classes/ArtifactActionOutcomes';

/**
 * {operation: 'baseline', ...} answers {baseline}: the optimized build the
 * prediction measures gains from (computeArtifactActionBaseline). Any other
 * request is the prediction, which takes a `baseline` from that request as
 * it is, and answers {result}.
 */
self.onmessage = async ({data}) => {
    try {
        if (data.useGPU !== true || !self.navigator?.gpu) throw new Error('action_webgpu_required');
        const params = {...data,
            baseBuild: deserializeWorkerMember(data.build),
            inventory: data.inventory.map(item => Artifact.deserialize(item)),
            ...(data.reshapeTargets !== undefined ? {reshapeTargets: data.reshapeTargets.map(target => ({
                ...target, artifact: target.artifact ? Artifact.deserialize(target.artifact) : null,
            }))} : {}),
            ...(data.upgradeTargets !== undefined ? {upgradeTargets: data.upgradeTargets.map(item => Artifact.deserialize(item))} : {}),
            onProgress: progress => self.postMessage({progress}),
        };

        if (data.operation === 'baseline') {
            self.postMessage({baseline: await computeArtifactActionBaseline(params)});
            return;
        }

        const result = await evaluateArtifactActionPredictions(params);
        self.postMessage({result}, artifactOutcomeTransferables(result));
    } catch (error) {
        self.postMessage({error: error?.message || 'Artifact action prediction failed'});
    }
};
