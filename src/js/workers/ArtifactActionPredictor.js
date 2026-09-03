import { Artifact } from '../classes/Artifact';
import { CalcSet } from '../classes/CalcSet';
import { evaluateArtifactActionPredictions } from '../classes/ArtifactActionPredictor';
import { artifactOutcomeTransferables } from '../classes/ArtifactActionOutcomes';

importScripts('db.js?' + __VERSION__);

self.onmessage = async ({data}) => {
    try {
        if (data.useGPU !== true || !self.navigator?.gpu) throw new Error('action_webgpu_required');
        const result = await evaluateArtifactActionPredictions({...data,
            baseBuild: CalcSet.deserialize(data.build),
            inventory: data.inventory.map(item => Artifact.deserialize(item)),
            ...(data.reshapeTargets !== undefined ? {reshapeTargets: data.reshapeTargets.map(target => ({
                ...target, artifact: target.artifact ? Artifact.deserialize(target.artifact) : null,
            }))} : {}),
            ...(data.upgradeTargets !== undefined ? {upgradeTargets: data.upgradeTargets.map(item => Artifact.deserialize(item))} : {}),
            onProgress: progress => self.postMessage({progress}),
        });
        self.postMessage({result}, artifactOutcomeTransferables(result));
    } catch (error) {
        self.postMessage({error: error?.message || 'Artifact action prediction failed'});
    }
};
