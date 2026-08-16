import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { CalcSet } from "../src/js/classes/CalcSet";
import { Condition } from "../src/js/classes/Condition";
import { Stats } from "../src/js/classes/Stats";
import { DB } from "../src/js/db/DB";

global.DB = DB;

const FEATURE_NAME = 'attack.normal_hit_1';
const FEATURE_TYPE = 'average';
const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const MAIN_STATS = {
    flower: 'hp',
    plume: 'atk',
    sands: 'atk_percent',
    goblet: 'dmg_pyro',
    circlet: 'crit_dmg',
};

function makeBuild(buildCase, teamwideSettings = {}) {
    const build = new CalcSet();
    const char = DB.Chars.get('Klee');

    build.setChar(char);
    build.setWeapon(DB.Weapons.get(char.weapon).getFirst(true));
    build.setEnemy(DB.Enemies.getFirst().getFirst());

    if (buildCase.charSettings) {
        build.setCharSettings(buildCase.charSettings);
    }

    if (buildCase.partyCharIds) {
        build.setPartyChars(buildCase.partyCharIds);
    }

    build.setBuffsSettings(Object.assign({}, buildCase.buffSettings || {}, teamwideSettings));

    return build;
}

function makeArtifacts() {
    const artifacts = [];
    const fillers = [
        'BlizzardStrayer',
        'GladiatorFinale',
        'Lavawalker',
        'Thundersoother',
        'WandererTroupe',
    ];

    for (let i = 0; i < SLOTS.length; ++i) {
        const slot = SLOTS[i];

        artifacts.push(new Artifact(5, 20, slot, 'CelestialGift', MAIN_STATS[slot], []));
        artifacts.push(new Artifact(5, 20, slot, fillers[i], MAIN_STATS[slot], []));
    }

    return artifacts;
}

function makeArtifactSettings(personalEnabled) {
    const settings = {};
    const conditionsByPieces = DB.Artifacts.Sets.get('CelestialGift').getConditionsByPieces();

    for (const conditions of conditionsByPieces) {
        if (!conditions) {
            continue;
        }

        const serializable = conditions.filter((condition) => {
            return condition && condition.isSerializable && condition.isSerializable();
        });

        Object.assign(settings, Condition.allConditionsOn(serializable, settings));
    }

    settings['set.celestial_gift_4'] = personalEnabled;

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

function uiFeatureValue(baseBuild, artifacts, artifactSettings) {
    const build = baseBuild.clone();

    for (const artifact of artifacts) {
        build.setArtifact(artifact);
    }

    build.setArtifactsSettings(Object.assign({}, artifactSettings));
    build.artifacts.removeInvalidSettings();

    const feature = build.calcFeatures(1)[FEATURE_NAME];
    return feature ? feature[FEATURE_TYPE] || 0 : 0;
}

function valuesClose(actual, expected) {
    const diff = Math.abs(actual - expected);
    return diff <= 0.00001 || diff <= Math.max(1, Math.abs(expected)) * 0.0000001;
}

function describeArtifacts(artifacts) {
    return artifacts
        .map((artifact) => artifact.slot + ':' + artifact.set)
        .join(', ');
}

test('Celestial Gift personal and teamwide suggester math matches UI rebuild math', () => {
    const ventiId = DB.Chars.get('Venti').getId();
    const buildCases = [
        {
            name: 'no-witch',
            charSettings: {},
            buffSettings: {},
            partyCharIds: [],
            teamwideCases: [
                {name: 'none', settings: {}},
                {name: 'party-pyro-20', settings: {'set_other.celestial_gift_4': 'pyro'}},
                {name: 'party-hydro-20', settings: {'set_other.celestial_gift_4': 'hydro'}},
            ],
        },
        {
            name: 'self-witch',
            charSettings: {klee_witch_homework: true},
            buffSettings: {},
            partyCharIds: [],
            teamwideCases: [
                {name: 'none', settings: {}},
                {name: 'party-pyro-20', settings: {'set_other.celestial_gift_4': 'pyro'}},
                {name: 'party-hydro-20', settings: {'set_other.celestial_gift_4': 'hydro'}},
            ],
        },
        {
            name: 'hexerei',
            charSettings: {klee_witch_homework: true},
            buffSettings: {'party.venti_witch_homework': true},
            partyCharIds: [ventiId],
            teamwideCases: [
                {name: 'none', settings: {}},
                {name: 'party-pyro-40', settings: {'set_other.celestial_gift_4_hexerei': 'pyro'}},
                {name: 'party-hydro-40', settings: {'set_other.celestial_gift_4_hexerei': 'hydro'}},
                {name: 'party-pyro-hydro-40', settings: {'set_other.celestial_gift_4_hexerei': 'pyro;hydro'}},
                {name: 'party-pyro-alias', settings: {'set_other.celestial_gift_4': 'pyro'}},
            ],
        },
    ];
    const personalCases = [
        {name: 'personal-off', enabled: false},
        {name: 'personal-on', enabled: true},
    ];
    const artifacts = makeArtifacts();
    const expectedCombinations = countCombinations(artifacts);
    const mismatches = [];

    for (const buildCase of buildCases) {
        for (const personalCase of personalCases) {
            const artifactSettings = makeArtifactSettings(personalCase.enabled);

            for (const teamwideCase of buildCase.teamwideCases) {
                const scenario = [
                    buildCase.name,
                    personalCase.name,
                    teamwideCase.name,
                ].join(' / ');
                const baseBuild = makeBuild(buildCase, teamwideCase.settings);
                const workerInput = cloneWorkerInput(baseBuild, artifacts);
                const suggester = new ArtifactsSuggest({
                    build: workerInput.build,
                    artifacts: workerInput.artifacts,
                    featureName: FEATURE_NAME,
                    featureType: FEATURE_TYPE,
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

                suggester.prepare();
                suggester.buildData.stats = new Stats(suggester.buildData.stats);

                const results = suggester.getResult(() => {});
                expect(results.length).toBe(expectedCombinations);

                let previousUiValue = Infinity;
                for (let i = 0; i < results.length; ++i) {
                    const result = results[i];
                    const uiValue = uiFeatureValue(baseBuild, result.artifacts, artifactSettings);

                    if (!valuesClose(result.value, uiValue)) {
                        mismatches.push([
                            scenario,
                            'worker=' + result.value,
                            'ui=' + uiValue,
                            describeArtifacts(result.artifacts),
                        ].join(' | '));
                    }

                    if (uiValue > previousUiValue + 0.00001) {
                        mismatches.push([
                            scenario,
                            'sort mismatch at result ' + i,
                            'prev=' + previousUiValue,
                            'current=' + uiValue,
                        ].join(' | '));
                    }

                    previousUiValue = uiValue;
                }
            }
        }
    }

    if (mismatches.length) {
        throw new Error(mismatches.slice(0, 100).join('\n'));
    }
});
