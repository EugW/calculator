import { Artifact } from "./Artifact";
import { ArtifactCandidateEvaluator } from "./ArtifactCandidateEvaluator";

export class ArtifactsSuggestSort {
    constructor(data) {
        this.build = data.build.clone();
        this.featureName = data.featureName;
        this.featureType = data.featureType;
    }

    sort(artifacts, limit) {
        let items = artifactsListBySet(artifacts);
        let result = {};
        let evaluator = new ArtifactCandidateEvaluator(this.featureName);

        for (let slot of DB.Artifacts.Slots.getKeys()) {
            result[slot] = [];
        }

        // Each piece among empty pieces of its set: set effects read the
        // member's set-bonus profile.
        for (let setName of Object.keys(items)) {
            for (let art of items[setName]) {
                emptyArtifacts(this.build, setName);
                this.build.setArtifact(art);

                let value = evaluator.getResult(this.build)?.[this.featureType] || 0;
                result[art.slot].push({
                    value: value,
                    art: art,
                });
            }
        }

        let final = [];
        for (let slot of DB.Artifacts.Slots.getKeys()) {
            if (result[slot].length > limit) {
                result[slot] = result[slot].sort((a, b) => {return b.value - a.value;});
                result[slot].splice(limit);
            }

            for (let item of result[slot]) {
                final.push(item.art);
            }
        }

        return final;
    }
}

function emptyArtifacts(build, setId) {
    for (let slot of DB.Artifacts.Slots.getKeys()) {
        let art = new Artifact(5, 20, slot, setId, '', []);
        build.setArtifact(art);
    }
}

function artifactsListBySet(artifacts) {
    let result = {};

    for (let art of artifacts) {
        let set = art.getSet();
        if (!result[set]) { result[set] = []; }

        result[set].push(art);
    }

    return result;
}
