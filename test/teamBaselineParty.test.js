import { DB } from "../src/js/db/DB";
import {
    RECEIVERS,
    buildAllOnSettings,
    compareScenario,
    computeScenarioResults,
    ensureTestGlobals,
    getFixedEnemy,
    getFixedWeaponForChar,
    getPartyCharKeys,
    getWeaponKey,
    loadRecorded,
    makeBaseBuild,
    saveRecorded,
} from "./support/baseline";

ensureTestGlobals();

const FILE = "party.json";
const RECORD = process.env.RECORD_BASELINE === "1";

function buildDefinitions() {
    const result = [];
    const partyKeys = getPartyCharKeys();
    for (const receiver of RECEIVERS) {
        result.push({id: receiver + "__none", receiver, partyKey: null});
        for (const partyKey of partyKeys) {
            if (partyKey === receiver) {
                continue;
            }
            result.push({id: receiver + "__with_" + partyKey, receiver, partyKey});
        }
    }
    return result;
}

function makeScenario(def) {
    const build = makeBaseBuild(def.receiver, 0);
    let buffsSettings = {};
    let party = [];
    if (def.partyKey) {
        const partyChar = DB.Chars.get(def.partyKey);
        build.setPartyChars([partyChar.getId()]);
        party = [def.partyKey];
        const baseSettings = build.getSettings();
        const partyConditions = partyChar.getPartyConditions();
        buffsSettings = buildAllOnSettings(partyConditions, baseSettings);
        build.setBuffsSettings(buffsSettings);
    } else {
        build.setPartyChars?.([]);
        build.setBuffsSettings({});
    }
    const weapon = getFixedWeaponForChar(def.receiver);
    const enemy = getFixedEnemy();
    const inputs = {
        receiver: def.receiver,
        partyMember: def.partyKey,
        char: def.receiver,
        constellation: 0,
        charLevels: {level: 90, ascension: 6, constellation: 0},
        talents: {attack: 10, elemental: 10, burst: 10},
        weapon: getWeaponKey(weapon),
        weaponType: DB.Chars.get(def.receiver).weapon,
        weaponLevels: {level: 90, ascension: 6, refine: 1},
        enemy: enemy.name,
        enemyLevel: 90,
        party,
        buffsSettings,
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
                inputs = {receiver: def.receiver, partyMember: def.partyKey};
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
    test.each(definitions.map((def) => [def.id]))("party %s", (id) => {
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
