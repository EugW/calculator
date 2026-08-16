import { Artifact } from "../classes/Artifact";
import { ArtifactsSuggest } from "../classes/ArtifactsSuggest";
import { CalcSet } from "../classes/CalcSet";

importScripts('db.js?'+ __VERSION__);

self.onmessage = async function(input) {
    try {
        let artifactsList = [];
        for (let data of input.data.artifacts) {
            artifactsList.push(Artifact.deserialize(data));
        }

        let suggester = new ArtifactsSuggest({
            build: CalcSet.deserialize(input.data.calcset),
            artifacts: artifactsList,
            featureName: input.data.feature,
            featureType: input.data.featureType,
            settings: input.data.settings,
            limit: input.data.limit,
            useGPU: input.data.useGPU,
            gpuBatchSize: input.data.gpuBatchSize,
            combinationIndexContext: input.data.combinationIndexContext,
            showBeta: input.data.showBeta,
        });

        suggester.prepare();

        const progressCallback = (current, total, skipped) => {
            self.postMessage({
                count: current,
                total: total,
                skipped: skipped,
            });
        };

        let results;
        if (suggester.useGPU) {
            results = await suggester.getResultGPU(progressCallback);
        } else {
            results = suggester.getResult(progressCallback);
        }

        if (!Array.isArray(results)) {
            throw new Error('Optimization returned an invalid result');
        }

        for (let item of results) {
            let arts = [];
            for (let art of item.artifacts) {
                arts.push(art ? art.serialize() : null);
            }
            item.artifacts = arts;
        }
        self.postMessage({result: results});
    } catch (error) {
        self.postMessage({ error: getErrorMessage(error) });
    }
};

function getErrorMessage(error) {
    if (typeof error === 'string' && error) {
        return error;
    }
    return error?.message || 'Optimization failed';
}
