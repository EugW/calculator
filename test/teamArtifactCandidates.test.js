import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactCandidateEvaluator } from "../src/js/classes/ArtifactCandidateEvaluator";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { ArtifactsSuggestSort } from "../src/js/classes/ArtifactsSuggestSort";
import { CalcObjectArtifacts } from "../src/js/classes/CalcObject/Artifacts";
import { Condition } from "../src/js/classes/Condition";
import { Rotation } from "../src/js/classes/Rotation";
import { RotationCompiler, ROTATION_SELF, ROTATION_TEAM } from "../src/js/classes/RotationCompiler";
import { Team, serializeWorkerMember } from "../src/js/classes/Team";
import { equipTeamArtifact } from "../src/js/classes/ArtifactTeamInventory";
import { DB } from "../src/js/db/DB";
import { makeBuild } from "./support/team";

global.DB = DB;

const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const SETS = ['EmblemofSeveredFate', 'NoblesseOblige'];
const TARGETS = ['burst.xiangling_pyronado', ROTATION_TEAM, ROTATION_SELF];

function artifacts(set, mastery = false) {
    const mains = ['hp', 'atk', mastery ? 'mastery' : 'recharge', 'dmg_pyro', 'crit_rate'];
    return SLOTS.map((slot, index) => new Artifact(5, 20, slot, set, mains[index],
        [{stat: mastery ? 'mastery' : 'atk_percent', value: mastery ? 42 : 9.9}]));
}

function setup() {
    const members = ['Xiangling', 'Bennet', 'Xingqiu', 'Kazuha'].map(makeBuild);
    const team = Team.fromMember(members[0]);
    members.slice(1).forEach((member, index) => team.setMember(index + 1, member));
    members[0].replaceArtifacts(artifacts(SETS[0]));
    members[3].setCharSettings({kaedehara_kazuha_poetics_of_fuubutsu: ['pyro']});
    const condition = Condition.unwrap(DB.Chars.get('Bennet').getAllConditions())
        .find((item) => item.getName() == 'bennet_fantastic_voyage');
    const hit = (slot, feature) => ({
        type: 'feature', charId: members[slot].char.getId(), feature, count: 2, reaction: 0,
    });
    team.setRotation(new Rotation({items: [
        hit(0, TARGETS[0]),
        {type: 'condition', subtype: 'member', object: 'char', charId: members[1].char.getId(),
            itemId: members[1].char.getId(), conditionId: condition.getId(), value: 1},
        hit(1, 'burst.burst_dmg'), hit(2, 'skill.skill_dmg'), hit(3, 'skill.press_dmg'),
        hit(0, TARGETS[0]),
    ]}));
    return {team, member: members[0], members};
}

function expectResult(actual, expected) {
    expect(actual).toBeDefined();
    expect(expected).toBeDefined();
    for (const key of ['normal', 'crit', 'average']) {
        expect(Math.abs(actual[key] - expected[key])).toBeLessThan(Math.max(1, Math.abs(expected[key])) * 1e-9);
    }
}

function fresh(member, featureName) {
    return member.view().getFeatureResultByName(featureName);
}

const handlers = {};
function runWorker(name, data) {
    global.self = {postMessage: jest.fn()};
    if (!handlers[name]) {
        require('../src/js/workers/' + name);
        handlers[name] = self.onmessage;
    }
    handlers[name]({data});
    return self.postMessage.mock.calls.at(-1)[0].result;
}

afterEach(() => {
    jest.restoreAllMocks();
    delete global.self;
});

test.each(TARGETS)('artifact programs for %s keep candidate parity and reuse numerical inputs', (target) => {
    const {member} = setup();
    const evaluator = new ArtifactCandidateEvaluator(target);
    const evaluate = jest.spyOn(Team.prototype, 'evaluate');
    evaluator.getResult(member);
    const calls = evaluate.mock.calls.length;
    const changed = member.clone();
    changed.replaceArtifacts(artifacts(SETS[0], true));
    const actual = evaluator.getResult(changed);
    expect(evaluate).toHaveBeenCalledTimes(calls);
    expectResult(actual, fresh(changed, target));

    // Set changes, controls and the rotation itself must select new programs.
    changed.artifacts.modifySets(Array(4).fill(SETS[1]));
    changed.setArtifactsSettings({'set.noblesse_oblige_4': true});
    expectResult(evaluator.getResult(changed), fresh(changed, target));
    const bennet = changed.team.getMember(1);
    changed.team.setConditionValue(bennet.char.getId(), changed.char.getId(), 'bennet_fantastic_voyage', false);
    expectResult(evaluator.getResult(changed), fresh(changed, target));
    changed.team.setRotation(new Rotation({items: [
        {type: 'feature', charId: changed.char.getId(), feature: TARGETS[0], count: 3, reaction: 0},
    ]}));
    expectResult(evaluator.getResult(changed), fresh(changed, target));
});

test.each(TARGETS)('a program for %s is found again without a copy of the team', (target) => {
    const {member} = setup();
    const evaluator = new ArtifactCandidateEvaluator(target);
    const copy = jest.spyOn(Team.prototype, 'copyWith');

    // A new program takes a copy of the team; a rotation walks copies too.
    evaluator.getResult(member);
    expect(copy).toHaveBeenCalled();

    // Other numbers on the same sets: the same program.
    const changed = member.clone();
    changed.replaceArtifacts(artifacts(SETS[0], true));
    copy.mockClear();
    const actual = evaluator.getResult(changed);
    expect(copy).not.toHaveBeenCalled();
    expectResult(actual, fresh(changed, target));
});

test("a team is saved with a member's artifacts replaced as the team wearing them is", () => {
    const {team, member} = setup();
    const saved = team.serialize();
    const pieces = () => SLOTS.map((slot) => new Artifact(5, 0, slot, SETS[1], '', []));

    const replacement = new CalcObjectArtifacts();
    replacement.replace(pieces());
    replacement.copySettingsFrom(member.artifacts);

    const copy = team.cloneWithArtifactSettings();
    const twin = copy.getMember(team.slotOf(member));
    twin.clearArtifacts();
    twin.replaceArtifacts(pieces());
    twin.artifacts.copySettingsFrom(member.artifacts);

    expect(team.serialize({artifacts: new Map([[member, replacement]])})).toEqual(copy.serialize());
    expect(team.serialize({artifacts: new Map([[member, replacement]])})).not.toEqual(saved);
    // The team and its member are as they were.
    expect(team.serialize()).toEqual(saved);
    expect(member.getArtifacts().flower.set).toBe(SETS[0]);
});

test.each([ROTATION_TEAM, ROTATION_SELF])('a slot-3 input changes its own and teammates hits for %s', (target) => {
    const {members} = setup();
    const member = members[3];
    const evaluator = new ArtifactCandidateEvaluator(target);
    member.replaceArtifacts(artifacts('ViridescentVenerer'));
    const original = evaluator.getResult(member);
    member.replaceArtifacts(artifacts('ViridescentVenerer', true));
    const actual = evaluator.getResult(member);
    expectResult(actual, fresh(member, target));
    expect(actual.average).not.toBe(original.average);
});

test('a transferred teammate artifact invalidates its set bonus and stack source', () => {
    const {member, members} = setup();
    members[1].replaceArtifacts(artifacts(SETS[1]));
    members[1].setArtifactsSettings({'set.noblesse_oblige_4': true});
    const evaluator = new ArtifactCandidateEvaluator(ROTATION_TEAM);
    evaluator.getResult(member);
    const candidate = member.clone();
    const other = candidate.team.getMember(1);
    // Leave four pieces, then break the set with the next transfer.
    equipTeamArtifact(candidate, other.getArtifacts().flower);
    expectResult(evaluator.getResult(candidate), fresh(candidate, ROTATION_TEAM));
    equipTeamArtifact(candidate, other.getArtifacts().plume);
    expectResult(evaluator.getResult(candidate), fresh(candidate, ROTATION_TEAM));
});

test('delivered features and percentage buff results retain their result semantics', () => {
    const member = makeBuild('Fischl');
    const nicole = makeBuild('Nicole');
    const team = Team.fromMember(member);
    team.setMember(1, nicole);
    const evaluator = new ArtifactCandidateEvaluator('other.nicole_arcane_projection');
    for (const mastery of [false, true]) {
        member.replaceArtifacts(artifacts(SETS[1], mastery));
        expectResult(evaluator.getResult(member), fresh(member, evaluator.featureName));
    }
    const bennet = makeBuild('Bennet');
    Team.fromMember(bennet);
    bennet.setCharSettings({bennet_fantastic_voyage: true});
    const buff = new ArtifactCandidateEvaluator('burst.atk_bonus');
    expectResult(buff.getResult(bennet), fresh(bennet, buff.featureName));
    bennet.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    bennet.setWeaponSettings({whisper_of_the_jinn: true});
    const percent = new ArtifactCandidateEvaluator('weapon.recharge_bonus');
    for (const mastery of [false, true]) {
        bennet.replaceArtifacts(artifacts(SETS[1], mastery));
        const result = percent.getResult(bennet);
        expect(result.format).toBe('percent');
        expectResult(result, fresh(bennet, percent.featureName));
    }
});

test('a normal-feature lookup does not compile the rotation', () => {
    const {member} = setup();
    const compile = jest.spyOn(RotationCompiler.prototype, 'compile');
    expect(fresh(member, TARGETS[0]).average).toBeGreaterThan(0);
    expect(compile).not.toHaveBeenCalled();
});

test.each(TARGETS)('optimizer candidates across set variations match fresh %s', (target) => {
    const {member} = setup();
    const pool = SETS.flatMap((set) => artifacts(set));
    const settings = {sets_settings: {'set.noblesse_oblige_4': true}, stats: {}, setMinValues: {}, setMaxValues: {}};
    const suggester = new ArtifactsSuggest({
        build: member, artifacts: pool, featureName: target, featureType: 'average', settings, limit: 40,
    });
    suggester.prepare();
    const results = suggester.getResult(() => {});
    expect(results).toHaveLength(32);
    for (const result of results) {
        const candidate = member.clone();
        candidate.replaceArtifacts(result.artifacts);
        candidate.setArtifactsSettings(settings.sets_settings);
        const expected = fresh(candidate, target).average;
        expect(Math.abs(result.value - expected)).toBeLessThan(Math.max(1, expected) * 1e-9);
    }
});

test.each(TARGETS)('artifact presort ranks with fresh %s values', (target) => {
    const {member} = setup();
    const pool = SETS.flatMap((set) => artifacts(set).concat(artifacts(set, true)));
    const settings = {sets_settings: {'set.noblesse_oblige_4': true}};
    const scores = pool.map((art) => {
        const candidate = member.clone();
        candidate.replaceArtifacts(SLOTS.map((slot) => new Artifact(5, 20, slot, art.set, '', [])));
        candidate.setArtifact(art);
        candidate.setArtifactsSettings(settings.sets_settings);
        candidate.artifacts.removeInvalidSettings();
        return {art, value: fresh(candidate, target).average};
    });
    const expected = SLOTS.flatMap((slot) => scores.filter((row) => row.art.slot == slot)
        .sort((a, b) => b.value - a.value).slice(0, 2).map((row) => row.art));
    const sorter = new ArtifactsSuggestSort({build: member, featureName: target, featureType: 'average', settings});
    expect(sorter.sort(pool, 2)).toEqual(expected);
});

test.each(TARGETS)('set and main-stat workers return fresh %s values', (target) => {
    const {member} = setup();
    const payload = serializeWorkerMember(member);
    const originalKeys = DB.Artifacts.Sets.getKeys.bind(DB.Artifacts.Sets);
    const keys = jest.spyOn(DB.Artifacts.Sets, 'getKeys')
        .mockImplementation((beta) => beta === 1 ? SETS : originalKeys(beta));
    const sets = runWorker('ArtifactSetSuggest', {calcset: payload, feature: target, showBeta: false});
    for (const row of sets) {
        const candidate = member.clone();
        candidate.artifacts.modifySets(row.sets.flatMap((set) => Array(set.pieces).fill(set.id)));
        candidate.setArtifactsSettings(row.settings);
        expectResult(row.feature, fresh(candidate, target));
    }
    keys.mockRestore();
    const mains = runWorker('ArtifactMainStatSuggest', {build: payload, feature: target});
    expect(mains.length).toBeGreaterThan(1);
    for (const row of mains) {
        const candidate = member.clone();
        for (const [slot, stat] of Object.entries(row.data)) candidate.getArtifacts()[slot].mainStat = stat;
        expectResult(row.feature, fresh(candidate, target));
    }
});

test.each(TARGETS)('artifact sort worker preserves fresh %s ordering', (target) => {
    const {member} = setup();
    const pool = SETS.flatMap((set) => artifacts(set));
    const setsOrders = Object.fromEntries(SETS.map((set, index) => [set, index]));
    const currentSettings = Object.assign(
        Condition.allConditionsOff(member.getConditions({objects: 'artifacts'})), member.artifacts.getSettings());
    const scores = pool.map((art) => {
        const candidate = member.clone();
        equipTeamArtifact(candidate, art);
        candidate.setArtifactsSettings(Object.assign(
            Condition.allConditionsOn(candidate.getConditions({objects: 'artifacts'})), currentSettings));
        return {art, value: fresh(candidate, target).average};
    });
    scores.sort((a, b) => b.value - a.value || setsOrders[a.art.set] - setsOrders[b.art.set]
        || SLOTS.indexOf(a.art.slot) - SLOTS.indexOf(b.art.slot));
    const result = runWorker('ArtifactsSort', {
        calcSet: serializeWorkerMember(member), feature: target, featureType: 'average',
        sortByFeature: true, setsOrders, artifacts: pool.map((art) => art.getHash()),
    });
    expect(result).toEqual(scores.map((row) => row.art.getHash()));
});
