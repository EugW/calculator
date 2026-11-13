// The database joins this worker's module graph; see webpack.config.js.
import "../db";
import { Artifact } from "../classes/Artifact";
import { deserializeWorkerMember } from "../classes/Team";
import { ArtifactCandidateEvaluator } from "../classes/ArtifactCandidateEvaluator";
import { Serializer } from "../classes/Serializer";
import { equipTeamArtifact } from "../classes/ArtifactTeamInventory";

const slotOrders = {
    flower: 1,
    plume: 2,
    sands: 3,
    goblet: 4,
    circlet: 5,
};

self.onmessage = function(input) {
    let artifacts = input.data.artifacts;
    let currentSet = deserializeWorkerMember(input.data.calcSet);
    let featureName = input.data.feature;
    let featureType = input.data.featureType;
    let sortByFeature = input.data.sortByFeature;
    let sortByStat = input.data.sortByStat;
    let setsOrders = input.data.setsOrders;

    let results = [];
    let evaluator = sortByFeature && new ArtifactCandidateEvaluator(featureName);


    for (let hash of artifacts) {
        let art = Artifact.deserialize( Serializer.unpack(hash) );
        let item = {
            hash: hash,
            featureValue: 0,
            statValue: 0,
            setValue: setsOrders[art.getSet()],
            slotValue: slotOrders[art.getSlot()],
        };

        if (evaluator) {
            // The piece in the build as it is: set effects read the
            // member's set-bonus profile.
            let build = currentSet.clone();
            equipTeamArtifact(build, art);

            let featureResult = evaluator.getResult(build);
            if (featureResult) {
                item.featureValue = featureResult[featureType];
            }
        }

        if (sortByStat) {
            let stats = art.calcStats();
            item.statValue = stats.get(sortByStat);
        }

        results.push(item);
    }


    results = results.sort( (a, b) => {
        return b.featureValue - a.featureValue || b.statValue - a.statValue || a.setValue - b.setValue || a.slotValue - b.slotValue;
    });

    self.postMessage({result: results.map((i) => {return i.hash;})});
};
