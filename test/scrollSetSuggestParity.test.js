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
    sands: 'hp_percent',
    goblet: 'dmg_hydro',
    circlet: 'crit_dmg',
};

function makeBuild(teamwideSettings = {}) {
    const build = new CalcSet();
    const char = DB.Chars.get('Mualani');

    build.setChar(char);
    build.setWeapon(DB.Weapons.get(char.weapon).getFirst(true));
    build.setEnemy(DB.Enemies.getFirst().getFirst());

    if (Object.keys(teamwideSettings).length) {
        build.setBuffsSettings(teamwideSettings);
    }

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

        artifacts.push(new Artifact(5, 20, slot, 'ScrollOfTheEmberedCitysHero', MAIN_STATS[slot], []));
        artifacts.push(new Artifact(5, 20, slot, fillers[i], MAIN_STATS[slot], []));
    }

    return artifacts;
}

function makeSetSettings() {
    const settings = {};
    const conditionsByPieces = DB.Artifacts.Sets.get('ScrollOfTheEmberedCitysHero').getConditionsByPieces();

    for (const conditions of conditionsByPieces) {
        if (!conditions) {
            continue;
        }

        const serializable = conditions.filter((condition) => {
            return condition && condition.isSerializable && condition.isSerializable();
        });

        Object.assign(settings, Condition.allConditionsOn(serializable, settings));
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

test('Scroll of the Hero of Cinder City personal and teamwide suggester math matches UI rebuild math', () => {
    const teamwideCases = [
        {name: 'none', settings: {}},
        {name: 'scroll_12', settings: {'set_other.scroll_of_the_hero_of_cinder_city_4_1': true}},
        {name: 'scroll_28', settings: {'set_other.scroll_of_the_hero_of_cinder_city_4_2': true}},
        {
            name: 'scroll_12+28',
            settings: {
                'set_other.scroll_of_the_hero_of_cinder_city_4_1': true,
                'set_other.scroll_of_the_hero_of_cinder_city_4_2': true,
            },
        },
    ];
    const artifacts = makeArtifacts();
    const artifactSettings = makeSetSettings();
    const expectedCombinations = countCombinations(artifacts);
    const mismatches = [];

    for (const teamwideCase of teamwideCases) {
        const baseBuild = makeBuild(teamwideCase.settings);
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

        for (const result of results) {
            const uiValue = uiFeatureValue(baseBuild, result.artifacts, artifactSettings);

            if (!valuesClose(result.value, uiValue)) {
                mismatches.push([
                    teamwideCase.name,
                    'worker=' + result.value,
                    'ui=' + uiValue,
                    describeArtifacts(result.artifacts),
                ].join(' | '));
            }
        }
    }

    if (mismatches.length) {
        throw new Error(mismatches.join('\n'));
    }
});
