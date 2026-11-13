import React from 'react';
import fs from 'fs';
import path from 'path';
import NodeModule from 'module';
import { transformSync } from '@babel/core';
import { Artifact } from '../src/js/classes/Artifact';
import * as actionRun from '../src/js/classes/ArtifactActionRun';
import * as predictor from '../src/js/classes/ArtifactActionPredictor';
import * as acknowledgements from '../src/js/classes/ArtifactBaselineAcknowledgements';
import * as suggestRun from '../src/js/classes/ArtifactSuggestRun';
import * as teamInventory from '../src/js/classes/ArtifactTeamInventory';
import * as teamModule from '../src/js/classes/Team';
import * as probability from '../src/js/classes/ArtifactActionProbability';
import * as rv from '../src/js/classes/ArtifactUsefulRV';
import { DB } from '../src/js/db/DB';
import { makeBuild } from './support/team';

jest.mock('../src/js/classes/WorkerFactory/ArtifactActionPredictor', () => ({
    WorkerFactoryArtifactActionPredictor: class {
        constructor(callbacks) { this.callbacks = callbacks; this.requests = []; }
        run(request) { this.requests.push(request); }
        dispose() {}
    },
}));
global.DB = DB;
const ui = {};
const Probe = props => React.createElement('probe', props);
const dependencies = {react: React, '__database': DB, '__ui': ui,
    '../../classes/Artifact': {Artifact}, '../../classes/ArtifactActionRun': actionRun,
    '../../classes/ArtifactActionPredictor': predictor, '../../classes/ArtifactBaselineAcknowledgements': acknowledgements,
    '../../classes/ArtifactSuggestRun': suggestRun, '../../classes/ArtifactTeamInventory': teamInventory,
    '../../classes/Team': teamModule, '../../classes/ArtifactUsefulRV': rv,
    '../../classes/ArtifactActionProbability': probability,
    '../Lang': {Lang: class {get(key) {return key;}}},
};
function loadUi(file) {
    const filename = path.resolve(__dirname, '../src/js/ui/Modal/', file);
    const loaded = new NodeModule(filename, module);
    loaded.require = request => dependencies[request] || new Proxy({}, {get: () => Probe});
    loaded._compile('const DB = require("__database"), UI = require("__ui");\n' + transformSync(fs.readFileSync(filename, 'utf8'), {
        filename, configFile: false, babelrc: false,
        presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react'],
    }).code, filename);
    return loaded.exports;
}
dependencies['./ArtifactActionBaselineFlow'] = loadUi('ArtifactActionBaselineFlow.jsx');
const {ArtifactActionBaselineFlow} = dependencies['./ArtifactActionBaselineFlow'];
const dialogs = ['ArtifactCraft', 'ArtifactReshape', 'ArtifactUpgrade'].map(name => [name, loadUi(name + '.jsx')[name + 'Modal']]);

function stateful(dialog) {
    dialog.setState = (values, done) => { Object.assign(dialog.state, typeof values === 'function' ? values(dialog.state) : values); done?.(); };
    return dialog;
}
function setup() {
    const member = makeBuild('Bennet');
    teamModule.Team.fromMember(member);
    const equipped = new Artifact(5, 20, 'flower', 'NoblesseOblige', 'hp', []);
    const best = new Artifact(5, 20, 'flower', 'NoblesseOblige', 'hp', [{stat: 'atk_percent', value: 23.3}]);
    member.setArtifact(equipped);
    member.setArtifactsSettings({'set.noblesse_oblige_4': false});
    const suggest = {artifacts: [equipped, best], settings: {sets: {}}, gpuBatchSize: 'auto'};
    ui.BestArtifactTab = {getSuggestData: () => suggest, component: {showDefault: jest.fn()}};
    ui.Layout = {showTab: jest.fn()};
    const app = {currentSet: () => member, getFeature: () => 'burst.burst_dmg', showBetaContent: () => true,
        getSetting: () => 1, refresh: jest.fn(), storage: {artifacts: {getByHash: () => null},
            actionHistory: {saveRun: jest.fn(() => Promise.resolve())}}};
    const request = {build: member, inventory: suggest.artifacts, optimizerSettings: suggest.settings,
        feature: app.getFeature(), featureType: 'average', showBeta: true};
    const record = {schema: 1, fingerprint: predictor.artifactActionFingerprint({...request, baseBuild: member}, request.inventory),
        value: 120, currentValue: 100, artifacts: [best.serialize()], changedSlots: ['flower'],
        setCounts: {baseline: {NoblesseOblige: 1}, current: {NoblesseOblige: 1}}, exclusions: []};
    const dialog = stateful({props: {app}, state: {isVisible: true, stage: 'progress'}, close: jest.fn()});
    const callbacks = {callback: jest.fn(), errorCallback: jest.fn()};
    const flow = new ArtifactActionBaselineFlow(dialog, callbacks);
    return {member, equipped, best, suggest, app, request, record, dialog, flow, callbacks};
}

beforeEach(() => {
    const values = new Map();
    global.localStorage = {getItem: key => values.get(key), setItem: (key, value) => values.set(key, value)};
});
afterEach(() => { delete global.localStorage; });

test('the real CPU baseline pauses for confirmation and prediction receives exactly its record', async () => {
    const {flow, request, dialog, member} = setup();
    flow.run(request);
    const workerRequest = flow.runner.factory.requests[0];
    const record = await predictor.computeArtifactActionBaseline({...workerRequest, baseBuild: workerRequest.build, useGPU: false});
    expect(record.changedSlots).toEqual(['flower']);
    flow.runner.factory.callbacks.callback(record);
    expect(dialog.state.stage).toBe('baseline');
    const prompt = flow.renderBaseline();
    expect(prompt.props.changes[0].current.getHash()).toBe(member.getArtifacts().flower.getHash());
    prompt.props.onContinue();
    expect(flow.runner.factory.requests.map(item => item.operation)).toEqual(['baseline', 'predict']);
    expect(flow.runner.factory.requests[1].baseline).toEqual(record);
});

test('equal-score alternatives skip the prompt, while excluded current builds still prompt', () => {
    const {record} = setup();
    expect(actionRun.artifactBaselineNeedsConfirmation({...record, value: 100 + 1e-5})).toBe(false);
    expect(actionRun.artifactBaselineNeedsConfirmation({...record, value: 100, exclusions: [{kind: 'set_disallowed'}]})).toBe(true);
    expect(actionRun.artifactBaselineNeedsConfirmation({...record, changedSlots: []})).toBe(false);
});

test('an acknowledgement applies only to the same build and settings; closing never acknowledges', () => {
    const {flow, request, record, dialog} = setup();
    flow.run(request);
    flow.runner.factory.callbacks.callback(record);
    dialog.state.baselineDontAsk = true;
    flow.cancel();
    expect(acknowledgements.isArtifactBaselineAcknowledged(record.fingerprint)).toBe(false);
    flow.run(request);
    flow.runner.factory.callbacks.callback(record);
    dialog.state.baselineDontAsk = true;
    flow.continue();
    expect(acknowledgements.isArtifactBaselineAcknowledged(record.fingerprint)).toBe(true);
    expect(acknowledgements.isArtifactBaselineAcknowledged(record.fingerprint + '-changed')).toBe(false);
    flow.run(request);
    flow.runner.factory.callbacks.callback(record);
    expect(flow.runner.factory.requests.at(-1).operation).toBe('predict');
});

test.each(['profile', 'filters', 'member'])(
    '%s changes while the prompt is open prevent equip and prediction', change => {
        const {flow, request, record, member, app, suggest, dialog, equipped} = setup();
        flow.run(request);
        flow.runner.factory.callbacks.callback(record);
        if (change === 'profile') member.setArtifactsSettings({'set.noblesse_oblige_4': true});
        if (change === 'filters') suggest.settings.sets['NoblesseOblige-4'] = false;
        if (change === 'member') app.currentSet = () => makeBuild('Kazuha');
        flow.continue(true);
        expect(member.getArtifacts().flower.getHash()).toBe(equipped.getHash());
        expect(flow.runner.factory.requests).toHaveLength(1);
        expect(dialog.state.error).toBe('artifact_action.stale');
    });

test('opening Suggest settings abandons the run', () => {
    const {flow, request, record, dialog} = setup();
    dialog.close = () => flow.dispose();
    flow.run(request);
    flow.runner.factory.callbacks.callback(record);
    flow.settings();
    expect(flow.runner.snapshot).toBeNull();
    expect(ui.BestArtifactTab.component.showDefault).toHaveBeenCalledTimes(1);
    expect(ui.Layout.showTab).toHaveBeenCalledWith('bestart');
});

test.each(dialogs)('%s equips pieces and resumes its frozen request; refresh cannot cancel its own apply', (name, Modal) => {
    const {member, app, record, best, equipped} = setup();
    const modal = stateful(new Modal({app}));
    Object.assign(modal.state, {isVisible: true, stage: 'parameters', set: 'NoblesseOblige', slots: ['flower'],
        inventory: [equipped, best], optimizerSettings: {}, candidates: [equipped]});
    modal.canStart = () => true;
    modal.sources = () => [{id: 'source', artifact: equipped, selectedSubstats: ['hp', 'atk']}];
    modal.selectedArtifacts = () => [equipped];
    app.refresh = () => modal.invalidate();
    modal.start();
    const worker = modal.factory.runner.factory;
    expect(worker.requests[0].operation).toBe('baseline');
    worker.callbacks.callback(record);
    expect(modal.state.stage).toBe('baseline');
    expect(modal.factory.renderBaseline()).not.toBeNull();
    const profile = member.artifacts.getProfileSettings();
    modal.factory.continue(true);
    expect(modal.state.stage).toBe('progress');
    expect(member.getArtifacts().flower.getHash()).toBe(best.getHash());
    expect(member.artifacts.getProfileSettings()).toEqual(profile);
    expect(worker.requests).toHaveLength(2);
    expect(worker.requests[1].build.getArtifacts().flower.getHash()).toBe(equipped.getHash());
    if (name === 'ArtifactReshape') expect(worker.requests[1].reshapeTargets[0].artifact.getHash()).toBe(equipped.getHash());
    if (name === 'ArtifactUpgrade') expect(worker.requests[1].upgradeTargets[0].getHash()).toBe(equipped.getHash());
    worker.callbacks.callback({rows: []});
    expect(modal.state.stage).toBe('results');
    const history = app.storage.actionHistory.saveRun.mock.calls[0][0];
    expect(history.result.runSnapshot.build).toBeDefined();
    expect(history.feature).toBe('burst.burst_dmg');
});
