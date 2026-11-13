import { Artifact } from '../src/js/classes/Artifact';
import { ArtifactsSuggest } from '../src/js/classes/ArtifactsSuggest';
import { Team, deserializeWorkerMember } from '../src/js/classes/Team';
import { captureArtifactSuggestRun, artifactSuggestRunKey, artifactSuggestResultBuild, equipArtifactPieces } from '../src/js/classes/ArtifactSuggestRun';
import { DB } from '../src/js/db/DB';
import { stripArtifactActionResultForHistory } from '../src/js/classes/StorageItem/ArtifactActionHistory';
import { makeBuild } from './support/team';

global.DB = DB;
const flag = 'set.noblesse_oblige_4';
const slots = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const mains = ['hp', 'atk', 'atk_percent', 'dmg_pyro', 'crit_rate'];

function setup() {
    const member = makeBuild('Bennet');
    const team = Team.fromMember(member);
    team.setMember(2, makeBuild('Xiangling'));
    const artifacts = slots.map((slot, i) => new Artifact(5, 20, slot, 'NoblesseOblige', mains[i], []));
    member.replaceArtifacts(artifacts);
    member.setArtifactsSettings({[flag]: false});
    const input = {member, artifacts, feature: 'burst.dmg', featureType: 'average', showBeta: true,
        settings: {sets: {'NoblesseOblige-4': true}, stats: {}, filter: {min_level: 0}}};
    return {member, team, artifacts, input};
}

test('worker and result builds keep the original profiles, receivers and objective after the live context changes', () => {
    const {member, team, artifacts, input} = setup();
    team.setConditionValue(member.char.getId(), team.getMember(2).char.getId(), flag, false);
    const snapshot = captureArtifactSuggestRun(input);
    const original = JSON.stringify(snapshot);
    member.setArtifactsSettings({[flag]: true, accumulated_healing: 0});
    team.setConditionValue(member.char.getId(), team.getMember(2).char.getId(), flag, true);
    input.settings.sets['NoblesseOblige-4'] = false;
    input.feature = 'rotation.total';
    const worker = deserializeWorkerMember(snapshot.build);
    const result = artifactSuggestResultBuild(snapshot, {artifacts, value: 123});
    expect(worker.artifacts.getProfileSettings()).toEqual({[flag]: false});
    expect(result.artifacts.getProfileSettings()).toEqual(worker.artifacts.getProfileSettings());
    expect(result.team.conditionValues).toEqual(worker.team.conditionValues);
    expect(result.calcFeatures()).toEqual(worker.calcFeatures());
    expect(result.suggesterWorkerFeature).toBe('burst.dmg');
    expect(result.suggesterWorkerValue).toBe(123);
    expect(result.getArtifacts().flower).not.toBe(artifacts[0]);
    expect(JSON.stringify(snapshot)).toBe(original);
    expect(artifactSuggestRunKey(captureArtifactSuggestRun(input))).not.toBe(artifactSuggestRunKey(snapshot));
});

test.each(['profile', 'teammate', 'teammate gear', 'receiver', 'rotation', 'inventory', 'constraints', 'objective', 'member', 'beta'])(
    '%s changes make a Suggest run stale', change => {
        const {member, team, input} = setup();
        const before = artifactSuggestRunKey(captureArtifactSuggestRun(input));
        if (change === 'profile') member.setArtifactsSettings({accumulated_healing: 0});
        if (change === 'teammate') team.getMember(2).setCharLevels({level: 80});
        if (change === 'teammate gear') team.getMember(2).replaceArtifacts([new Artifact(5, 20, 'flower', 'GladiatorFinale', 'hp', [])]);
        if (change === 'receiver') team.setConditionValue(member.char.getId(), team.getMember(2).char.getId(), flag, false);
        if (change === 'rotation') team.getRotation().addItem({type: 'repeat', count: 2, items: []});
        if (change === 'inventory') input.artifacts = input.artifacts.slice(1);
        if (change === 'constraints') input.settings.sets['NoblesseOblige-4'] = false;
        if (change === 'objective') input.featureType = 'crit';
        if (change === 'member') input.member = team.getMember(2);
        if (change === 'beta') input.showBeta = false;
        expect(artifactSuggestRunKey(captureArtifactSuggestRun(input))).not.toBe(before);
    });

test.each([['Bennet', 'NoblesseOblige', {}], ['Mualani', 'ObsidianCodex', {'common.nightsoul_blessing_state': true}]])(
    'equipping a result leaves the run of %s current', (charKey, worn, state) => {
        const member = makeBuild(charKey);
        Team.fromMember(member).setMember(2, makeBuild('Xiangling'));
        const pieces = set => slots.map((slot, i) => new Artifact(5, 20, slot, set, mains[i], []));
        const inventory = pieces(worn).concat(pieces('GladiatorFinale'));
        member.replaceArtifacts(inventory.slice(0, 5));
        member.setArtifactsSettings(state);
        const input = {member, artifacts: inventory, settings: {}, feature: 'normal.attack_1', featureType: 'average'};
        const snapshot = captureArtifactSuggestRun(input);
        const result = artifactSuggestResultBuild(snapshot, {artifacts: inventory.slice(5), value: 1});
        equipArtifactPieces(member, Object.values(result.getArtifacts()));
        member.refreshCommonSettings();
        expect(member.getArtifacts().flower.getSetName()).toBe('GladiatorFinale');
        expect(artifactSuggestRunKey(captureArtifactSuggestRun(input))).toBe(artifactSuggestRunKey(snapshot));
        expect(deserializeWorkerMember(snapshot.build).getArtifacts().flower.getSetName()).toBe(worn);
    });

test('equivalent preference maps have the same key regardless of insertion order', () => {
    const {input} = setup();
    const a = captureArtifactSuggestRun(input);
    const b = {...a, settings: {filter: {min_level: 0}, stats: {}, sets: {'NoblesseOblige-4': true}}};
    expect(artifactSuggestRunKey(a)).toBe(artifactSuggestRunKey(b));
});

test('action history retains the scoring snapshot even when outcome galleries are stripped', () => {
    const {input, member} = setup();
    const runSnapshot = captureArtifactSuggestRun(input);
    const saved = stripArtifactActionResultForHistory({rows: [{score: 0.1, outcomeDetails: {large: true}}],
        runSnapshot, outcomeInventory: [[1, 2]], baselineArtifacts: [0]});
    member.setArtifactsSettings({[flag]: true});
    expect(saved.runSnapshot).toEqual(runSnapshot);
    expect(deserializeWorkerMember(saved.runSnapshot.build).artifacts.getProfileSettings()).toEqual({[flag]: false});
    expect(saved.rows[0]).not.toHaveProperty('outcomeDetails');
});

test('reconstructing and applying a loadout retains Nightsoul member state across piece replacement', () => {
    const member = makeBuild('Mualani');
    Team.fromMember(member);
    const artifacts = slots.map((slot, i) => new Artifact(5, 20, slot, 'ObsidianCodex', mains[i], []));
    member.replaceArtifacts(artifacts);
    member.setArtifactsSettings({'common.nightsoul_blessing_state': true, accumulated_healing: 0});
    const snapshot = captureArtifactSuggestRun({member, artifacts, settings: {}, feature: 'normal.attack_1', featureType: 'average'});
    const candidate = artifactSuggestResultBuild(snapshot, {artifacts, value: 1});
    expect(candidate.getSettings()['common.nightsoul_blessing_state']).toBe(true);
    equipArtifactPieces(member, artifacts);
    expect(member.getSettings()['common.nightsoul_blessing_state']).toBe(true);
    expect(member.artifacts.getProfileSettings()).toEqual({accumulated_healing: 0});
});

test('a CPU optimizer result scores identically when rebuilt and equipped without writing profile settings', () => {
    const {member, input} = setup();
    member.setArtifactsSettings({accumulated_healing: 0});
    input.feature = 'burst.burst_dmg';
    const snapshot = captureArtifactSuggestRun(input);
    const optimizer = new ArtifactsSuggest({build: deserializeWorkerMember(snapshot.build), artifacts: input.artifacts,
        featureName: snapshot.feature, featureType: snapshot.featureType, settings: {stats: {}, setMinValues: {}, setMaxValues: {}},
        limit: 1, useGPU: false, showBeta: true});
    optimizer.prepare();
    const [row] = optimizer.getResult(() => {});
    const result = artifactSuggestResultBuild(snapshot, row);
    const profile = member.artifacts.getProfileSettings();
    expect(result.calcFeatures()[snapshot.feature].average).toBeCloseTo(row.value, 7);
    equipArtifactPieces(member, Object.values(result.getArtifacts()));
    expect(member.calcFeatures()[snapshot.feature].average).toBeCloseTo(row.value, 7);
    expect(member.artifacts.getProfileSettings()).toEqual(profile);
});
