import { Artifact } from "../classes/Artifact";
import { CalcSet } from "../classes/CalcSet";
import { evaluateArtifactUpgradePrediction } from "../classes/ArtifactUpgradePredictor";
import { sendWorkerProgeressInc, sendWorkerProgeressTotal } from "../classes/WorkerFactory";

importScripts('db.js?' + __VERSION__);

self.onmessage = function(input) {
    let build = CalcSet.deserialize(input.data.build);
    let artifacts = input.data.artifacts.map((item) => {
        return Artifact.deserialize(item);
    }).filter((item) => {
        return !!item;
    });
    let baseValue = input.data.baseValue;
    let results = [];

    sendWorkerProgeressTotal(artifacts.length);

    for (let artifact of artifacts) {
        let result = evaluateArtifactUpgradePrediction({
            baseBuild: build,
            artifact: artifact,
            feature: input.data.feature,
            featureType: input.data.featureType,
            baseValue: baseValue,
        });

        results.push({
            ...result,
            artifact: artifact.serialize(),
        });

        sendWorkerProgeressInc();
    }

    self.postMessage({
        result: results,
    });
};
