import { Condition } from "../src/js/classes/Condition";
import { Team } from "../src/js/classes/Team";
import { LEGACY_BUFF_CONDITIONS } from "../src/js/classes/Legacy/Buffs";
import { DB } from "../src/js/db/DB";
import {
    RECEIVERS,
    buffPartyForCondition,
    buffPrerequisiteSettings,
    compareScenario,
    computeScenarioResults,
    conditionOnEntries,
    ensureTestGlobals,
    getBuffLeafConditions,
    getFixedEnemy,
    getFixedWeaponForChar,
    getWeaponKey,
    loadRecorded,
    makeBaseBuild,
    saveRecorded,
} from "./support/baseline";

ensureTestGlobals();

const FILE = "buffs.json";
const RECORD = process.env.RECORD_BASELINE === "1";

// Recorded member controls that became team toggles under the same
// serialize ID. The member's shield switch is the team's on-field shield:
// a solo receiver is on field, so its recordings are replayed as teams.
const REPLACED = {'common.char_status_shield': 'on_field_shield'};

function buildDefinitions() {
    const result = [];
    const leaves = getBuffLeafConditions();
    for (const leaf of leaves) {
        const condName = leaf.getName();
        // Added after the pre-refactor recording. Field-state behavior and
        // persistence are covered by teamHexereiWeapons/teamFieldState.
        if (condName == 'common.off_field') continue;
        // Recorded under the member control it replaced, see below.
        if (Object.values(REPLACED).includes(condName)) continue;
        // Replaces the typed-in buffs.ascendant_gleam_buff; its recorded
        // scenarios are rebuilt as teams in teamAscendantGleam.
        if (condName == 'ascendant_gleam_source') continue;
        for (const receiver of RECEIVERS) {
            result.push({
                id: receiver + "::" + condName,
                receiver,
                condName,
                serializeId: leaf.params.serializeId,
                condType: leaf.getType(),
            });
        }
    }
    return result;
}

function findLeaf(condName) {
    return getBuffLeafConditions().find((cond) => cond.getName() === condName);
}

function makeScenario(def) {
    const leaf = findLeaf(def.condName);
    if (!leaf) {
        throw new Error("Unknown buff condition " + def.condName);
    }
    const build = makeBaseBuild(def.receiver, 0);
    const baseSettings = build.getSettings();
    const targetEntries = conditionOnEntries(leaf, baseSettings);
    const prereqEntries = buffPrerequisiteSettings(leaf);
    const {partyKeys, extraSettings} = buffPartyForCondition(leaf, def.receiver);
    const team = Team.fromMember(build);
    partyKeys.forEach((key, index) => {
        const member = makeBaseBuild(key, 0);
        const name = member.char.get().name + '_witch_homework';
        if (extraSettings[name]) member.setCharSettings({[name]: true});
        team.setMember(index + 1, member);
    });
    const mergedBase = build.getSettings();
    // Recompute target value against the final party composition so that
    // function-based maxima see the same settings the engine will use.
    const finalTarget = conditionOnEntries(leaf, Object.assign({}, mergedBase, prereqEntries, extraSettings));
    const buffsSettings = Object.assign({}, prereqEntries, extraSettings, finalTarget);
    // Keep the originally computed target when recomputation yields nothing
    // (for example dropdowns do not depend on settings).
    for (const key of Object.keys(targetEntries)) {
        if (!(key in buffsSettings)) {
            buffsSettings[key] = targetEntries[key];
        }
    }
    // Party conditions among them (resonances, Polestar) are the team's.
    build.setBuffsSettings(team.applyShared(buffsSettings));
    const weapon = getFixedWeaponForChar(def.receiver);
    const enemy = getFixedEnemy();
    const party = partyKeys.slice();
    const inputs = {
        receiver: def.receiver,
        buffCondition: def.condName,
        buffSerializeId: def.serializeId,
        buffType: def.condType,
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
                inputs = {receiver: def.receiver, buffCondition: def.condName};
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
    // Every recorded condition is still defined, or retired under its
    // serialize ID when its effect moved to its source.
    test("no recorded buff condition disappeared", () => {
        const current = new Map(getBuffLeafConditions().map((cond) => [cond.getName(), cond.params.serializeId]));
        const retired = new Set(LEGACY_BUFF_CONDITIONS.map((cond) => cond.getId()));
        for (const cond of Condition.unwrap(DB.Buffs.getList().flatMap((group) => group.getConditions()))) {
            if (cond && cond.isRetired && cond.isRetired()) retired.add(cond.params.serializeId);
        }
        const missing = [];
        for (const scenario of Object.values(recorded.scenarios)) {
            const {buffCondition, buffSerializeId} = scenario.inputs;
            if (current.get(buffCondition) === buffSerializeId || retired.has(buffSerializeId)) continue;
            if (current.get(REPLACED[buffCondition]) === buffSerializeId) continue;
            missing.push(buffCondition + ' #' + buffSerializeId);
        }
        expect([...new Set(missing)]).toEqual([]);
    });

    test.each(definitions.map((def) => [def.id]))("buff %s", (id) => {
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

    // The recorded party, the receiver on field and the team toggle on.
    const replaced = Object.keys(recorded.scenarios).filter((id) => REPLACED[recorded.scenarios[id].inputs.buffCondition]);
    test.each(replaced.map((id) => [id]))("replaced buff %s", (id) => {
        const expected = recorded.scenarios[id];
        const {receiver, party, buffCondition, buffsSettings} = expected.inputs;
        const build = makeBaseBuild(receiver, 0);
        const team = Team.fromMember(build);
        party.forEach((key, index) => team.setMember(index + 1, makeBaseBuild(key, 0)));
        const own = Object.assign({}, buffsSettings);
        delete own[buffCondition];
        build.setBuffsSettings(own);
        team.setOnFieldMember(build);
        team.modifySettings({[REPLACED[buffCondition]]: buffsSettings[buffCondition]});
        const actual = computeScenarioResults(build);
        expect(compareScenario(id, actual, expected)).toEqual([]);
    });
}
