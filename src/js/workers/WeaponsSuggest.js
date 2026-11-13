// The database joins this worker's module graph; see webpack.config.js.
import "../db";
import { Artifact } from "../classes/Artifact";
import { deserializeWorkerMember } from "../classes/Team";
import { ArtifactGenerator, getMainStatCombinations } from "../classes/Generator/Artifacts";
import { ArtifactGeneratorKQM } from "../classes/Generator/ArtifactsKQM";
import { sendWorkerProgeressInc, sendWorkerProgeressTotal } from "../classes/WorkerFactory";

self.onmessage = function(input) {
    let buildBase = deserializeWorkerMember(input.data.build);
    let featureName = input.data.feature;

    let items = input.data.items;
    let results = [];
    let generatorSettings = input.data.generatorSettings;

    sendWorkerProgeressTotal(items.length);

    let storageArtifacts = [];
    if (input.data.storage) {
        for (let art of input.data.storage.artifacts) {
            storageArtifacts.push(Artifact.deserialize(art));
        }
    }

    for (let item of items) {
        let weapon = DB.Weapons.getById(item.weaponId);
        let build = buildBase.clone();
        let artifacts = [];

        build.setWeapon(weapon);
        build.setWeaponLevels({
            level: 90,
            ascension: 6,
            refine: item.refine,
        });
        // A scenario can describe the enemy (affected by Hydro): that part
        // is the team's.
        build.setWeaponSettings(build.team.applyShared(item.settings));

        if (input.data.artifactMode == 'generate') {
            let params = {
                build: build.clone(),
                feature: featureName,
                settings: {
                    sets: generatorSettings.sets,
                    count: generatorSettings.count,
                    critRolls: generatorSettings.critRolls,
                    mode: generatorSettings.mode,
                    minRecharge: generatorSettings.minRecharge,
                    kqms: generatorSettings.kqms,
                },
            };
            params.combinations = getMainStatCombinations(params);

            let generator;
            if (params.settings.kqms) {
                generator = new ArtifactGeneratorKQM(params);
            } else {
                generator = new ArtifactGenerator(params);
            }

            let result = generator.generate();
            for (let art of result[0].artifacts) {
                artifacts.push(art.serialize());
            }
            // Set effects read the member's set-bonus profile.
            build.replaceArtifacts(result[0].artifacts);
        }

        let featureResult = build.getFeatureResultByName(featureName);

        if (featureResult) {
            let resultItem = {
                scenarioId: item.scenarioId,
                weaponId: item.weaponId,
                suggestName: item.suggestName,
                isCustom: item.isCustom,
                customName: item.customName,
                isCustomized: item.isCustomized,
                settings: item.settings,
                level: item.level,
                ascension: item.ascension,
                refine: item.refine,
                result: featureResult,
                artifacts: artifacts,
            };

            self.postMessage({
                partial: resultItem,
            });

            results.push(resultItem);
        }

        sendWorkerProgeressInc();
    }

    self.postMessage({
        result: results,
    });
};
