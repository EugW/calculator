import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { CalcSet } from "../src/js/classes/CalcSet";
import { Condition } from "../src/js/classes/Condition";
import { Stats } from "../src/js/classes/Stats";
import { deserializeWorkerMember, serializeWorkerMember, Team } from "../src/js/classes/Team";
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

function makeChar(charKey) {
    const build = new CalcSet();
    const char = DB.Chars.get(charKey);

    build.setChar(char);
    build.setWeapon(DB.Weapons.get(char.weapon).getFirst(true));

    return build;
}

// A teammate with Witch's Homework wearing Celestial Gift 4-piece, effect on.
function makeWearer(charKey) {
    const build = makeChar(charKey);
    const name = build.char.get().name;
    build.setCharSettings({[name + '_witch_homework']: true});
    build.replaceArtifacts(['flower', 'plume', 'sands', 'goblet'].map((slot) => {
        return new Artifact(5, 20, slot, 'CelestialGift', MAIN_STATS[slot], []);
    }));
    build.setArtifactsSettings({'set.celestial_gift_4': true});
    return build;
}

/**
 * Klee and the build case's real Hexerei teammates, optionally with an
 * additional Celestial Gift wearer.
 */
function makeBuild(buildCase, teammateCase) {
    const build = makeChar('Klee');

    if (buildCase.charSettings) {
        build.setCharSettings(buildCase.charSettings);
    }

    const team = Team.fromMember(build);
    let slot = 1;
    if (teammateCase.wearer) team.setMember(slot++, makeWearer(teammateCase.wearer));
    (buildCase.witchTeammates || []).forEach((charKey) => {
        const mate = makeChar(charKey);
        const name = mate.char.get().name;
        mate.setCharSettings({[name + '_witch_homework']: true});
        team.setMember(slot++, mate);
    });

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
        build: deserializeWorkerMember(serializeWorkerMember(build)),
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

function uiFeatureValue(baseBuild, artifacts) {
    const build = baseBuild.clone();

    for (const artifact of artifacts) {
        build.setArtifact(artifact);
    }

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

test('Celestial Gift personal and teammate suggester math matches UI rebuild math', () => {
    // A teammate wearing Celestial Gift: Durin (Pyro, Klee's element) or Mona
    // (Hydro). With two members' Witch's Homework the party has Secret Rite.
    // When Klee also wears the set, the teammate's copy yields to one of them.
    const teammateCases = [
        {name: 'alone'},
        {name: 'pyro-wearer', wearer: 'Durin'},
        {name: 'hydro-wearer', wearer: 'Mona'},
    ];
    const buildCases = [
        {
            name: 'no-witch',
            charSettings: {},
        },
        {
            name: 'self-witch',
            charSettings: {klee_witch_homework: true},
        },
        {
            name: 'hexerei',
            charSettings: {klee_witch_homework: true},
            witchTeammates: ['Venti'],
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

            for (const teammateCase of teammateCases) {
                const scenario = [
                    buildCase.name,
                    personalCase.name,
                    teammateCase.name,
                ].join(' / ');
                const baseBuild = makeBuild(buildCase, teammateCase);
                // The assumptions are the member's set-bonus profile.
                baseBuild.setArtifactsSettings(artifactSettings);
                const workerInput = cloneWorkerInput(baseBuild, artifacts);
                const suggester = new ArtifactsSuggest({
                    build: workerInput.build,
                    artifacts: workerInput.artifacts,
                    featureName: FEATURE_NAME,
                    featureType: FEATURE_TYPE,
                    settings: {
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
                    const uiValue = uiFeatureValue(baseBuild, result.artifacts);

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
