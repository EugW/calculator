import { WorkerFactory } from '../src/js/classes/WorkerFactory';
import { Artifact } from '../src/js/classes/Artifact';
import { DB } from '../src/js/db/DB';
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');
const NodeModule = require('module');
global.DB = DB;

// Match the existing Upgrade worker test seam, replacing only webpack's URL syntax.
const filename = path.resolve(__dirname, '../src/js/classes/WorkerFactory/ArtifactActionPredictor.js');
const source = fs.readFileSync(filename, 'utf8').replace(/import\.meta\.url/g, "'file:///action-worker-test.js'");
const loaded = new NodeModule(filename, module);
loaded.filename = filename;
loaded.paths = NodeModule._nodeModulePaths(path.dirname(filename));
loaded.require = request => {
    if (request === '../WorkerFactory') return {WorkerFactory};
    throw new Error('Unexpected worker dependency: ' + request);
};
loaded._compile(babel.transformSync(source, {filename, presets: [['@babel/preset-env', {targets: {node: 'current'}}]]}).code, filename);
const Factory = loaded.exports.WorkerFactoryArtifactActionPredictor;
const input = () => ({kind: 'craft', build: {serialize: () => ['build']}, inventory: [{serialize: () => ['artifact']}],
    optimizerSettings: {stats: {recharge_min: 120}}, set: 'GladiatorFinale'});

function setup() {
    const callback = jest.fn(), progressCallback = jest.fn(), errorCallback = jest.fn();
    const factory = new Factory({callback, progressCallback, errorCallback});
    const workers = [];
    factory.createWorker = () => {
        const worker = {postMessage: jest.fn(), terminate: jest.fn()};
        workers.push(worker);
        return worker;
    };
    return {factory, workers, callback, progressCallback, errorCallback};
}
beforeEach(() => { global.UI = {debug: jest.fn()}; });
afterEach(() => { delete global.UI; });

test('action worker serializes snapshots, forwards full workload, and accepts structured results', () => {
    const {factory, workers, callback, progressCallback} = setup();
    const craftAffixes = {goblet:{mainStat:['dmg_pyro','dmg_hydro'],substats:[['crit_rate','crit_dmg'],[]]}};
    const rvFilters = {outcomes: {enabled: true, min: 500, max: 900}, companions: {enabled: false, min: null, max: null}};
    factory.run({...input(), mode: 'full', pruneOutcomeSets: true, craftAffixes, rvFilters});
    expect(workers).toHaveLength(1);
    expect(workers[0].postMessage.mock.calls[0][0]).toMatchObject({build: ['build'], inventory: [['artifact']],
        optimizerSettings: {stats: {recharge_min: 120}}, mode: 'full', pruneOutcomeSets: true, craftAffixes, rvFilters});
    const progress = {phase: 'full', current: 0, combinationTotal: '99000000000000000'};
    workers[0].onmessage({data: {progress}});
    expect(progressCallback).toHaveBeenCalledWith(progress);
    const result = {rows: [{slot: 'flower', absoluteGain: 12}]};
    workers[0].onmessage({data: {result}});
    expect(callback).toHaveBeenCalledWith(result);
    factory.dispose();
    expect(workers[0].terminate).toHaveBeenCalledTimes(1);
});

test('reshape worker preserves independent fixed/Auto choices in either dropdown', () => {
    const {factory, workers} = setup();
    const pairs = {flower: [null, null], plume: ['crit_rate', null], sands: [null, 'crit_dmg'], goblet: ['hp', 'def']};
    factory.run({...input(), kind: 'reshape', pairs});
    expect(workers[0].postMessage.mock.calls[0][0]).toMatchObject({kind: 'reshape', pairs});
    factory.dispose();
});

test('explicit source snapshots preserve IDs, repeated slots, history and locks across the worker boundary', async () => {
    const {factory, workers, callback, progressCallback} = setup();
    const artifact = new Artifact(5, 20, 'goblet', 'GladiatorFinale', 'dmg_phys', [
        {stat: 'hp', value: 1046}, {stat: 'def', value: 16}, {stat: 'def_percent', value: 5.1}, {stat: 'recharge', value: 4.5}]);
    artifact.setMetadata({initialValues: {hp: 209.13, def: 16.2, def_percent: 5.1, recharge: 4.53},
        totalRolls: 8, elixirCrafted: true, definedSubstats: ['hp', 'def']});
    const other = artifact.clone();
    other.set = 'WandererTroupe';
    const targets = [{id: 'one', artifact, selectedSubstats: ['hp', null]},
        {id: 'two', artifact: other, selectedSubstats: [null, 'def']}];
    factory.run({...input(), kind: 'reshape', reshapeTargets: targets});
    const payload = workers[0].postMessage.mock.calls[0][0];
    expect(payload.reshapeTargets.map(target => target.id)).toEqual(['one', 'two']);
    expect(payload.reshapeTargets.map(target => target.slot)).toEqual(['goblet', 'goblet']);
    for (let i = 0; i < targets.length; ++i) {
        const restored = Artifact.deserialize([...payload.reshapeTargets[i].artifact]);
        expect(restored.getHash()).toBe(targets[i].artifact.getHash());
        expect(restored.getInitialLineCount()).toBe(3);
        expect(restored.getMetadata().definedSubstats).toEqual(['def', 'hp']);
        expect(payload.reshapeTargets[i].selectedSubstats).toEqual(targets[i].selectedSubstats);
    }
    const progress = {phase: 'full', unit: 'artifacts', targetId: 'two', slotsCompleted: 1, slotsTotal: 2};
    workers[0].onmessage({data: {progress}});
    expect(progressCallback).toHaveBeenCalledWith(progress);
    const result = {rows: [{slot: 'goblet', targetId: 'two'}, {slot: 'goblet', targetId: 'one'}]};
    workers[0].onmessage({data: {result}});
    expect(callback).toHaveBeenCalledWith(result);
    factory.dispose();

    // Execute the real worker entry with only the GPU/prediction boundary stubbed.
    const workerFile = path.resolve(__dirname, '../src/js/workers/ArtifactActionPredictor.js');
    const calculate = jest.fn(async () => ({rows: []}));
    const workerRequire = request => {
        if (request.endsWith('/Artifact')) return {Artifact};
        if (request.endsWith('/CalcSet')) return {CalcSet: {deserialize: () => 'baseline-build'}};
        if (request.endsWith('/ArtifactActionPredictor')) return {evaluateArtifactActionPredictions: calculate};
        if (request.endsWith('/ArtifactActionOutcomes')) return require('../src/js/classes/ArtifactActionOutcomes');
        throw new Error('Unexpected dependency ' + request);
    };
    const workerSelf = {navigator: {gpu: {}}, postMessage: jest.fn()};
    const code = babel.transformSync(fs.readFileSync(workerFile, 'utf8'), {
        filename: workerFile, presets: [['@babel/preset-env', {targets: {node: 'current'}}]],
    }).code;
    require('node:vm').runInNewContext(code, {require: workerRequire, exports: {}, self: workerSelf,
        importScripts: jest.fn(), __VERSION__: 'test'});
    await workerSelf.onmessage({data: {...payload, useGPU: true, inventory: [artifact.serialize()]}});
    expect(calculate).toHaveBeenCalledTimes(1);
    const decoded = calculate.mock.calls[0][0];
    expect(decoded.baseBuild).toBe('baseline-build');
    expect(decoded.reshapeTargets.map(target => target.artifact.getHash())).toEqual([artifact.getHash(), other.getHash()]);
    await workerSelf.onmessage({data: {...payload, useGPU: true, reshapeTargets: [], inventory: []}});
    expect(calculate.mock.calls[1][0].reshapeTargets).toEqual([]);
});

test('cancellation and errors terminate action work and suppress late results', () => {
    const {factory, workers, callback, errorCallback} = setup();
    factory.run(input());
    const late = workers[0].onmessage;
    factory.dispose();
    late({data: {result: {rows: []}}});
    expect(callback).not.toHaveBeenCalled();
    factory.run(input());
    workers[1].onmessage({data: {error: 'device lost'}});
    expect(errorCallback).toHaveBeenCalledWith({worker: 0, error: 'device lost'});
    expect(workers[1].terminate).toHaveBeenCalledTimes(1);
    expect(factory.isSettled).toBe(true);
});
