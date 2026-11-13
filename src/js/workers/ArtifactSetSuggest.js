// The database joins this worker's module graph; see webpack.config.js.
import "../db";
import { deserializeWorkerMember } from "../classes/Team";
import { ArtifactCandidateEvaluator } from "../classes/ArtifactCandidateEvaluator";

self.onmessage = function(input) {
    let original = deserializeWorkerMember(input.data.calcset);
    let featureName = input.data.feature;
    let showBeta = input.data.showBeta;

    let maxPieces = 0;
    let arts = original.getArtifacts();
    let evaluator = new ArtifactCandidateEvaluator(featureName);

    for (const slot of Object.keys(arts)) {
        if (arts[slot]) {
            ++maxPieces;
        }
    }

    let sets = getSets(original, evaluator, maxPieces, showBeta);
    let results = [];

    for (let s1 = 0; s1 < sets.length; ++s1) {
        const set1 = sets[s1];

        for (const item1 of set1.data) {
            let setNames = [].concat(item1.setNames);

            let currentSet = original.clone();
            currentSet.artifacts.modifySets(setNames);
            let settings1 = Object.assign(item1.settings);
            setScenario(currentSet, settings1);

            let value = evaluator.getResult(currentSet);

            results.push({
                feature: value,
                settings: settings1,
                sets: [
                    {id: set1.setId, pieces: item1.pieces},
                ]
            });

            for (let s2 = s1+1; s2 < sets.length; ++s2) {
                const set2 = sets[s2];

                for (const item2 of set2.data) {
                    if (item1.pieces + item2.pieces > maxPieces) {
                        continue;
                    }

                    let names2 = [].concat(item1.setNames, item2.setNames);

                    currentSet = original.clone();
                    currentSet.artifacts.modifySets(names2);
                    let settings2 = Object.assign({}, settings1, item2.settings);
                    setScenario(currentSet, settings2);

                    let value = evaluator.getResult(currentSet);

                    results.push({
                        feature: value,
                        settings: settings2,
                        sets: [
                            {id: set1.setId, pieces: item1.pieces},
                            {id: set2.setId, pieces: item2.pieces},
                        ]
                    });
                }
            }
        }
    }

    results = results.sort(function(a,b) {return b.feature.average - a.feature.average;});

    self.postMessage({result: results});
};

function getSets(original, evaluator, maxPieces, showBeta) {
    let sets = [];

    let calc = original.clone();
    calc.artifacts.modifySets([]);

    const reference = evaluator.getResult(calc);

    for (const setId of DB.Artifacts.Sets.getKeys(1)) {
        let setData = DB.Artifacts.Sets.get(setId);
        if (setData.maxRarity < 5) {
            continue;
        }

        if (!showBeta && setData.isBeta()) {
            continue;
        }

        let suggesterData = setData.getSuggesterData();

        let setResult = [];
        let prev = reference;

        let maxI = Math.min(maxPieces, suggesterData.length-1);
        let setNames = [];

        for (let pieces = 1; pieces <= maxI; ++pieces) {
            let pieceData = suggesterData[pieces];

            setNames.push(setId);

            if (pieceData && pieceData.conditions) {
                let newSet = original.clone();
                newSet.artifacts.modifySets(setNames);

                let settings = Object.assign({}, pieceData.settings);
                setScenario(newSet, settings);

                let value = evaluator.getResult(newSet);

                if (valueIsGreater(prev, value)) {
                    setResult.push({
                        pieces: pieces,
                        settings: settings,
                        setNames: [].concat(setNames),
                    });

                    prev = value;
                }
            }
        }

        if (setResult.length > 0) {
            sets.push({
                setId: setId,
                data: setResult,
            });
        }
    }

    return sets;
}

/**
 * A set's scenario on a candidate's copy of the team: the team's and the
 * enemy's state it assumes (Blizzard Strayer a Cryo-affected, Frozen enemy).
 * The set's effects read the member's set-bonus profile.
 *
 * @param {CalcSet} candidate
 * @param {Object} settings
 */
function setScenario(candidate, settings) {
    candidate.team.applyShared(settings);
}

function valueIsGreater(reference, value) {
    let result = false;

    for (const key of ['normal', 'crit', 'average']) {
        result ||= Math.abs(value[key] - reference[key]) > 0.0001;
    }

    return result;
}
