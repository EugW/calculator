import { Artifact } from '../src/js/classes/Artifact';
import { ArtifactActionRun } from '../src/js/classes/ArtifactActionRun';
import { deserializeWorkerMember, Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeBuild } from './support/team';

jest.mock('../src/js/classes/WorkerFactory/ArtifactActionPredictor', () => ({WorkerFactoryArtifactActionPredictor: class {}}));
global.DB = DB;

class Factory {
    constructor(callbacks) { this.callbacks = callbacks; this.requests = []; }
    run(request) { this.requests.push(request); }
    dispose() {}
}

function setup() {
    const member = makeBuild('Bennet');
    Team.fromMember(member);
    const piece = new Artifact(5, 20, 'flower', 'NoblesseOblige', 'hp', []);
    member.setArtifact(piece);
    member.setArtifactsSettings({'set.noblesse_oblige_4': false});
    const request = {build: member, inventory: [piece], feature: 'burst.burst_dmg', featureType: 'average',
        optimizerSettings: {sets: {'NoblesseOblige-4': false}},
        reshapeTargets: [{id: 'flower', artifact: piece, selectedSubstats: ['crit_rate', 'crit_dmg']}],
        upgradeTargets: [piece]};
    const callback = jest.fn(), baselineCallback = jest.fn(), errorCallback = jest.fn();
    const run = new ArtifactActionRun({callback, baselineCallback, errorCallback}, Factory);
    return {member, request, run, callback, baselineCallback, errorCallback};
}

test('confirmation resumes exactly once with the completed baseline and the original request', () => {
    const {member, request, run, callback, baselineCallback} = setup();
    run.run(request);
    const baseline = {fingerprint: 'baseline-input', value: 100, artifacts: [0], currentValue: 80};
    run.factory.callbacks.callback(baseline);
    expect(baselineCallback).toHaveBeenCalledWith(baseline);
    expect(run.factory.requests).toHaveLength(1);
    member.setArtifactsSettings({'set.noblesse_oblige_4': true});
    member.clearArtifacts();
    request.optimizerSettings.sets['NoblesseOblige-4'] = true;
    request.reshapeTargets[0].selectedSubstats = ['hp_percent', 'atk_percent'];
    request.inventory.length = 0;
    run.predict();
    run.predict();
    expect(run.factory.requests.map(item => item.operation)).toEqual(['baseline', 'predict']);
    const prediction = run.factory.requests[1];
    expect(prediction.baseline).toEqual(baseline);
    expect(prediction.build.artifacts.getProfileSettings()).toEqual({'set.noblesse_oblige_4': false});
    expect(prediction.build.getArtifacts().flower).not.toBeNull();
    expect(prediction.inventory).toHaveLength(1);
    expect(prediction.optimizerSettings.sets['NoblesseOblige-4']).toBe(false);
    expect(prediction.reshapeTargets[0].selectedSubstats).toEqual(['crit_rate', 'crit_dmg']);
    expect(prediction.upgradeTargets[0].getHash()).toBe(prediction.inventory[0].getHash());
    run.factory.callbacks.callback({rows: []});
    const result = callback.mock.calls[0][0];
    expect(deserializeWorkerMember(result.runSnapshot.build).artifacts.getProfileSettings())
        .toEqual({'set.noblesse_oblige_4': false});
});

test('closing or invalidating a paused run prevents its prediction and ignores late results', () => {
    const {request, run, callback, baselineCallback} = setup();
    run.run(request);
    run.factory.callbacks.callback({fingerprint: 'one'});
    run.dispose();
    run.predict();
    run.factory.callbacks.callback({rows: []});
    expect(run.factory.requests).toHaveLength(1);
    expect(baselineCallback).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
});

test('a failed baseline clears the request before reporting the error', () => {
    const {request, run, errorCallback} = setup();
    run.run(request);
    run.factory.callbacks.errorCallback({error: 'action_no_baseline'});
    expect(errorCallback).toHaveBeenCalledWith({error: 'action_no_baseline'});
    expect(run.snapshot).toBeNull();
    run.predict();
    expect(run.factory.requests).toHaveLength(1);
});
