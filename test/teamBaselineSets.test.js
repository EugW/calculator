import { DB } from "../src/js/db/DB";
import { Team } from "../src/js/classes/Team";
import {
    buildAllOnSettings,
    compareScenario,
    computeScenarioResults,
    ensureTestGlobals,
    getArtifactSetKeys,
    getFixedEnemy,
    getFixedWeaponForChar,
    getWeaponKey,
    loadRecorded,
    makeBaseBuild,
    makeSetArtifacts,
    saveRecorded,
} from "./support/baseline";

ensureTestGlobals();

const FILE = "sets.json";
const RECORD = process.env.RECORD_BASELINE === "1";
const RECEIVER = "Hutao";

function buildDefinitions() {
    return getArtifactSetKeys().map((setId) => ({id: setId, setId}));
}

function makeScenario(def) {
    const build = makeBaseBuild(RECEIVER, 0);
    const artifacts = makeSetArtifacts(def.setId);
    build.replaceArtifacts(artifacts);
    const baseSettings = build.getSettings();
    const artifactConditions = build.getConditions({objects: ["artifacts"]});
    const artifactsSettings = buildAllOnSettings(artifactConditions, baseSettings);
    build.setArtifactsSettings(artifactsSettings);
    // All on includes being shielded, which the recording set on the set's
    // own switch: now the team's on-field shield (a build alone is on field).
    Team.fromMember(build).modifySettings({on_field_shield: true});
    const set = DB.Artifacts.Sets.get(def.setId);
    const weapon = getFixedWeaponForChar(RECEIVER);
    const enemy = getFixedEnemy();
    const inputs = {
        receiver: RECEIVER,
        set: def.setId,
        char: RECEIVER,
        constellation: 0,
        charLevels: {level: 90, ascension: 6, constellation: 0},
        talents: {attack: 10, elemental: 10, burst: 10},
        weapon: getWeaponKey(weapon),
        weaponType: DB.Chars.get(RECEIVER).weapon,
        weaponLevels: {level: 90, ascension: 6, refine: 1},
        enemy: enemy.name,
        enemyLevel: 90,
        party: [],
        artifacts: artifacts.map((art) => ({
            slot: art.slot,
            set: art.set,
            rarity: art.rarity,
            level: art.level,
            mainStat: art.mainStat,
        })),
        setRarity: set.maxRarity,
        artifactsSettings,
    };
    return {build, inputs};
}

const definitions = buildDefinitions();

if (RECORD) {
    const data = {scenarios: {}};
    for (const def of definitions) {
        let entry;
        try {
            const {build, inputs} = makeScenario(def);
            const results = computeScenarioResults(build);
            entry = Object.assign({inputs}, results);
        } catch (error) {
            let inputs;
            try {
                inputs = makeScenario(def).inputs;
            } catch {
                inputs = {receiver: RECEIVER, set: def.setId};
            }
            entry = {inputs, error: String((error && error.message) || error)};
        }
        data.scenarios[def.id] = entry;
    }
    saveRecorded(FILE, data);
}

const recorded = loadRecorded(FILE);

if (!recorded) {
    test("baseline file missing", () => {
        throw new Error("Missing test/baseline/" + FILE + " (kept out of git). It must be recorded by the engine " +
            "before the team refactor: add a git worktree at commit 54e1d63, copy test/support/baseline.js and " +
            "test/teamBaseline*.test.js into it, run them there with RECORD_BASELINE=1 and copy test/baseline/ back.");
    });
} else {
    test.each(definitions.map((def) => [def.id]))("set %s", (id) => {
        const def = definitions.find((item) => item.id === id);
        let actual;
        try {
            const {build, inputs} = makeScenario(def);
            const results = computeScenarioResults(build);
            actual = Object.assign({inputs}, results);
        } catch (error) {
            actual = {error: String((error && error.message) || error)};
        }
        const expected = recorded.scenarios[id];
        expect(expected).toBeDefined();
        const mismatches = compareScenario(id, actual, expected);
        expect(mismatches).toEqual([]);
    });
}
