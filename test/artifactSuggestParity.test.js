import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { CalcSet } from "../src/js/classes/CalcSet";
import { Condition } from "../src/js/classes/Condition";
import { Stats } from "../src/js/classes/Stats";
import { DB } from "../src/js/db/DB";

global.DB = DB;

const FEATURE_NAME = 'skill.columbina_lunar_charged_dmg';
const FEATURE_TYPES = ['normal', 'crit', 'average'];
const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const MAIN_STATS = {
    flower: 'hp',
    plume: 'atk',
    sands: 'hp_percent',
    goblet: 'hp_percent',
    circlet: 'crit_dmg',
};
const EPSILON = 0.00001;

function makeBuild(teamwideSettings = {}) {
    const build = new CalcSet();
    const char = DB.Chars.get('Columbina');
    const partyChar = DB.Chars.get('Aino');

    build.setChar(char);
    build.setWeapon(DB.Weapons.get(char.weapon).getFirst(true));
    build.setEnemy(DB.Enemies.getFirst().getFirst());
    build.setPartyChars([partyChar.getId()]);

    if (Object.keys(teamwideSettings).length) {
        build.setBuffsSettings(teamwideSettings);
    }

    return build;
}

function statNames(stats) {
    if (!stats) {
        return [];
    }

    if (Array.isArray(stats)) {
        return stats.map((stat) => stat.getName ? stat.getName() : stat.name).filter(Boolean);
    }

    return Object.keys(stats);
}

function conditionHasLunarStat(condition, seen = new Set()) {
    if (!condition || seen.has(condition)) {
        return false;
    }

    seen.add(condition);

    const params = condition.params || {};
    if (statNames(params.stats).some((stat) => stat.includes('lunar'))) {
        return true;
    }

    const nested = [];
    if (condition.items) {
        nested.push(...condition.items);
    }
    if (params.condition) {
        nested.push(params.condition);
    }
    if (params.subConditions) {
        nested.push(...params.subConditions);
    }
    if (params.values) {
        for (const value of params.values) {
            if (value.conditions) {
                nested.push(...value.conditions);
            }
        }
    }

    return nested.some((item) => conditionHasLunarStat(item, seen));
}

function getLunarArtifactSetIds() {
    return DB.Artifacts.Sets.getKeys(true).filter((setId) => {
        const conditionsByPieces = DB.Artifacts.Sets.get(setId).getConditionsByPieces();

        return conditionsByPieces.some((conditions) => {
            return conditions.some((condition) => conditionHasLunarStat(condition));
        });
    });
}

function getTeamwideLunarArtifactSettings() {
    return DB.Buffs.get('Artifacts').getConditions()
        .filter((condition) => {
            const name = condition.getName && condition.getName();

            return name &&
                name.startsWith('set_other.') &&
                condition.getType && condition.getType() == 'checkbox' &&
                conditionHasLunarStat(condition);
        })
        .map((condition) => condition.getName())
        .sort();
}

function makeTeamwideCases(settingNames) {
    const result = [];
    const caseCount = 1 << settingNames.length;

    for (let mask = 0; mask < caseCount; ++mask) {
        const settings = {};
        const active = [];

        for (let i = 0; i < settingNames.length; ++i) {
            if (mask & (1 << i)) {
                settings[settingNames[i]] = true;
                active.push(settingNames[i].replace('set_other.', ''));
            }
        }

        result.push({
            name: active.join('+') || 'none',
            settings,
        });
    }

    return result;
}

function hasSerializableSetConditions(setId) {
    const conditionsByPieces = DB.Artifacts.Sets.get(setId).getConditionsByPieces();

    return conditionsByPieces.some((conditions) => {
        return conditions.some((condition) => {
            return condition && condition.isSerializable && condition.isSerializable();
        });
    });
}

function setSupportsFiveStarArtifacts(setId) {
    const set = DB.Artifacts.Sets.get(setId);
    return set && set.minRarity <= 5 && set.maxRarity >= 5;
}

function getFillerSetIds(excludedSetIds) {
    const excluded = new Set(excludedSetIds);
    const allSetIds = DB.Artifacts.Sets.getKeys(true);

    const preferred = allSetIds.filter((setId) => {
        return !excluded.has(setId) &&
            setSupportsFiveStarArtifacts(setId) &&
            !hasSerializableSetConditions(setId);
    });

    const fallback = allSetIds.filter((setId) => {
        return !excluded.has(setId) &&
            setSupportsFiveStarArtifacts(setId) &&
            !preferred.includes(setId);
    });

    return preferred.concat(fallback).slice(0, SLOTS.length);
}

function makeArtifacts(targetSetId, relevantSetIds) {
    const fillerSetIds = getFillerSetIds(relevantSetIds.concat([targetSetId]));

    if (fillerSetIds.length < SLOTS.length) {
        throw new Error('Not enough artifact sets to build parity-test filler artifacts.');
    }

    const artifacts = [];

    for (let i = 0; i < SLOTS.length; ++i) {
        const slot = SLOTS[i];

        artifacts.push(new Artifact(5, 20, slot, targetSetId, MAIN_STATS[slot], []));
        artifacts.push(new Artifact(5, 20, slot, fillerSetIds[i], MAIN_STATS[slot], []));
    }

    return artifacts;
}

function makeSetPoolArtifacts(setIds) {
    const artifacts = [];

    for (const slot of SLOTS) {
        for (const setId of setIds) {
            artifacts.push(new Artifact(5, 20, slot, setId, MAIN_STATS[slot], []));
        }
    }

    return artifacts;
}

function makeArtifactPoolCases(relevantSetIds) {
    const cases = [];

    for (const targetSetId of relevantSetIds) {
        cases.push({
            name: 'isolated ' + targetSetId,
            artifacts: makeArtifacts(targetSetId, relevantSetIds),
        });
    }

    for (let i = 0; i < relevantSetIds.length; ++i) {
        for (let j = i + 1; j < relevantSetIds.length; ++j) {
            const setIds = [relevantSetIds[i], relevantSetIds[j]];

            cases.push({
                name: 'mixed ' + setIds.join('+'),
                artifacts: makeSetPoolArtifacts(setIds),
            });
        }
    }

    return cases;
}

function makeArtifactSetSettings(setIds) {
    const settings = {
        party_moonsign: 0,
        party_moonsign_count: 0,
    };

    for (const setId of setIds) {
        const conditionsByPieces = DB.Artifacts.Sets.get(setId).getConditionsByPieces();

        for (const conditions of conditionsByPieces) {
            if (!conditions) {
                continue;
            }

            const serializable = conditions.filter((condition) => {
                return condition && condition.isSerializable && condition.isSerializable();
            });

            Object.assign(settings, Condition.allConditionsOn(serializable, settings));
        }
    }

    return settings;
}

function cloneWorkerInput(build, artifacts) {
    return {
        build: CalcSet.deserialize(build.serialize()),
        artifacts: artifacts.map((artifact) => Artifact.deserialize(artifact.serialize())),
    };
}

function countCombinations(artifacts) {
    const counts = {};

    for (const slot of SLOTS) {
        counts[slot] = 0;
    }

    for (const artifact of artifacts) {
        ++counts[artifact.slot];
    }

    return SLOTS.reduce((total, slot) => total * counts[slot], 1);
}

function uiFeatureValues(baseBuild, artifacts, artifactSettings) {
    const build = baseBuild.clone();

    for (const artifact of artifacts) {
        build.setArtifact(artifact);
    }

    build.setArtifactsSettings(Object.assign({}, artifactSettings));
    build.artifacts.removeInvalidSettings();

    const feature = build.calcFeatures(1)[FEATURE_NAME];
    const values = {};

    for (const featureType of FEATURE_TYPES) {
        values[featureType] = feature ? feature[featureType] || 0 : 0;
    }

    return values;
}

function valuesClose(actual, expected) {
    const diff = Math.abs(actual - expected);
    return diff <= EPSILON || diff <= Math.max(1, Math.abs(expected)) * 0.0000001;
}

function describeArtifacts(artifacts) {
    return artifacts
        .map((artifact) => artifact.slot + ':' + artifact.set)
        .join(', ');
}

function formatMismatch(mismatch) {
    if (mismatch.type == 'count') {
        return [
            mismatch.scenario,
            'expected ' + mismatch.expected + ' results, got ' + mismatch.actual,
        ].join(' | ');
    }

    if (mismatch.type == 'sort') {
        return [
            mismatch.scenario,
            'UI values are not sorted at result ' + mismatch.index,
            'prev=' + mismatch.previous,
            'current=' + mismatch.current,
        ].join(' | ');
    }

    return [
        mismatch.scenario,
        'worker=' + mismatch.worker,
        'ui=' + mismatch.ui,
        'diff=' + mismatch.diff,
        describeArtifacts(mismatch.artifacts),
    ].join(' | ');
}

function summarizeMismatches(mismatches) {
    const summary = {};

    for (const mismatch of mismatches) {
        summary[mismatch.scenario] ||= {
            count: 0,
            types: {},
        };

        ++summary[mismatch.scenario].count;
        summary[mismatch.scenario].types[mismatch.type] = 1 + (summary[mismatch.scenario].types[mismatch.type] || 0);
    }

    return Object.entries(summary).map(([scenario, data]) => {
        const types = Object.entries(data.types)
            .map(([type, count]) => type + ':' + count)
            .join(', ');

        return scenario + ' => ' + data.count + ' mismatches (' + types + ')';
    });
}

function sampleMismatchesByScenario(mismatches, limitPerScenario = 2) {
    const counts = {};
    const result = [];

    for (const mismatch of mismatches) {
        counts[mismatch.scenario] ||= 0;

        if (counts[mismatch.scenario] >= limitPerScenario) {
            continue;
        }

        ++counts[mismatch.scenario];
        result.push(formatMismatch(mismatch));
    }

    return result;
}

test('artifact suggester worker math matches UI rebuild math for lunar artifact set matrix', () => {
    const relevantSetIds = getLunarArtifactSetIds();
    const teamwideCases = makeTeamwideCases(getTeamwideLunarArtifactSettings());
    const mismatches = [];
    let checkedResults = 0;

    expect(relevantSetIds).toEqual(expect.arrayContaining([
        'NightOfTheSkysUnveiling',
        'SilkenMoonsSerenade',
        'AubadeOfMorningstarAndMoon',
    ]));

    for (const poolCase of makeArtifactPoolCases(relevantSetIds)) {
        const artifacts = poolCase.artifacts;
        const artifactSetIds = Array.from(new Set(artifacts.map((artifact) => artifact.set)));
        const artifactSettings = makeArtifactSetSettings(artifactSetIds);
        const expectedCombinations = countCombinations(artifacts);

        for (const teamwideCase of teamwideCases) {
            const baseBuild = makeBuild(teamwideCase.settings);
            const workerInput = cloneWorkerInput(baseBuild, artifacts);
            const suggester = new ArtifactsSuggest({
                build: workerInput.build,
                artifacts: workerInput.artifacts,
                featureName: FEATURE_NAME,
                featureType: 'average',
                settings: {
                    sets_settings: artifactSettings,
                    stats: {},
                    setMinValues: {},
                    setMaxValues: {},
                },
                limit: expectedCombinations,
                useGPU: false,
                showBeta: true,
            });
            const uiCache = {};

            suggester.prepare();
            const baseStats = new Stats(suggester.buildData.stats);

            for (const featureType of FEATURE_TYPES) {
                const scenario = poolCase.name + ' / teamwide=' + teamwideCase.name + ' / ' + featureType;

                suggester.setOptimizationObjective(featureType);
                suggester.buildData.stats = new Stats(baseStats);
                const results = suggester.getResult(() => {});

                if (results.length != expectedCombinations) {
                    mismatches.push({
                        type: 'count',
                        scenario,
                        expected: expectedCombinations,
                        actual: results.length,
                    });
                }

                let previousUiValue = Infinity;
                for (let i = 0; i < results.length; ++i) {
                    const result = results[i];
                    const artifactKey = describeArtifacts(result.artifacts);
                    uiCache[artifactKey] ||= uiFeatureValues(baseBuild, result.artifacts, artifactSettings);
                    const uiValue = uiCache[artifactKey][featureType];

                    ++checkedResults;

                    if (!valuesClose(result.value, uiValue)) {
                        mismatches.push({
                            type: 'value',
                            scenario,
                            worker: result.value,
                            ui: uiValue,
                            diff: result.value - uiValue,
                            artifacts: result.artifacts,
                        });
                    }

                    if (uiValue > previousUiValue + EPSILON) {
                        mismatches.push({
                            type: 'sort',
                            scenario,
                            index: i,
                            previous: previousUiValue,
                            current: uiValue,
                        });
                    }

                    previousUiValue = uiValue;
                }
            }
        }
    }

    if (mismatches.length) {
        const summary = summarizeMismatches(mismatches);
        const shown = sampleMismatchesByScenario(mismatches);
        throw new Error([
            mismatches.length + ' artifact suggester parity mismatches across ' + checkedResults + ' checked results.',
            'Scenario summary:',
            ...summary,
            'Sample mismatches:',
            ...shown,
        ].join('\n'));
    }

    expect(checkedResults).toBeGreaterThan(0);
});
