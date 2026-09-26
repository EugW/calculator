import React from 'react';
import fs from 'fs';
import path from 'path';
import NodeModule from 'module';
import { transformSync } from '@babel/core';
import { Artifact } from '../src/js/classes/Artifact';
import { Serializer } from '../src/js/classes/Serializer';
import { Stats } from '../src/js/classes/Stats';
import { StorageItemArtifacts } from '../src/js/classes/StorageItem/Artifacts';
import { normalizeArtifactRVFilters } from '../src/js/classes/ArtifactUsefulRV';
import { DB } from '../src/js/db/DB';

global.DB = DB;
global.UI = {Lang: {get: () => ''}};

// Exercise the actual modal callbacks and storage without mounting browser UI.
const Probe = () => null;
const uiImports = new Proxy({}, {get: () => Probe});
function loadUI(relative, dependencies = {}) {
    const filename = path.resolve(__dirname, relative);
    const loaded = new NodeModule(filename, module);
    loaded.filename = filename;
    loaded.require = request => {
        if (request === '__testGlobals') return {DB, UI: new Proxy({}, {get: (_, key) => global.UI[key]})};
        if (request === 'react') return React;
        if (request.endsWith('.css')) return {};
        if (request.endsWith('/Lang')) return {Lang: class { get(key) { return key; } }};
        return dependencies[request] || uiImports;
    };
    loaded._compile("const {UI, DB} = require('__testGlobals');\n" + transformSync(fs.readFileSync(filename, 'utf8'), {
        filename, configFile: false, babelrc: false,
        presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react'],
    }).code, filename);
    return loaded.exports;
}

const {ArtifactListItem} = loadUI('../src/js/ui/Components/Artifact.jsx', {
    '../../classes/Stats': {Stats},
});
const {ArtifactUpgradeModal} = loadUI('../src/js/ui/Modal/ArtifactUpgrade.jsx', {
    '../../classes/Artifact': {Artifact},
    '../../classes/Serializer': {Serializer},
    '../../classes/ArtifactUsefulRV': {normalizeArtifactRVFilters},
    '../../classes/ArtifactUpgradePredictor': {
        getArtifactMaxLevel: () => 20, isArtifactUnderleveled: artifact => artifact.getLevel() < 20,
    },
    '../../classes/WorkerFactory/ArtifactActionPredictor': {
        WorkerFactoryArtifactActionPredictor: class { dispose() {} },
    },
    '../Components/Artifact': {ArtifactListItem},
});

function flower(level = 0, crit = 3.5) {
    const artifact = new Artifact(5, level, 'flower', 'GladiatorFinale', 'hp');
    artifact.addStat('crit_rate', crit);
    artifact.addStat('crit_dmg', 7);
    artifact.addStat('atk_percent', 5.8);
    artifact.addStat('recharge', 5.2);
    return artifact;
}

function findAll(element, predicate, found = []) {
    if (Array.isArray(element)) element.forEach(child => findAll(child, predicate, found));
    else if (React.isValidElement(element)) {
        if (predicate(element)) found.push(element);
        findAll(element.props.children, predicate, found);
    }
    return found;
}

function setup({stored = [], equipped = {}} = {}) {
    global.DB = DB;
    global.localStorage = {getItem: () => null, setItem: jest.fn()};
    const storage = new StorageItemArtifacts();
    storage.addArtifacts(stored);
    global.UI = {
        Lang: {get: () => ''}, ArtifactWindow: {show: jest.fn()},
        BestArtifactTab: {getSuggestData: () => ({artifacts: storage.listArtifacts(), settings: {filter: {}}})},
    };
    const app = {
        storage: {artifacts: storage}, getFeature: () => 'normal_attack', showBetaContent: () => false,
        getArtifacts: () => equipped,
        setArtifact: jest.fn(artifact => { equipped[artifact.getSlot()] = artifact; }),
        refresh: jest.fn(() => modal.invalidate()),
    };
    const modal = new ArtifactUpgradeModal({app});
    modal.setState = update => {
        modal.state = {...modal.state, ...(typeof update === 'function' ? update(modal.state) : update)};
    };
    const scan = modal.scanCandidates();
    modal.state = {...modal.state, ...scan, isVisible: true, stage: 'results',
        selected: scan.candidates.map(artifact => artifact.getSlot() + ':' + artifact.getHash())};
    return {modal, app, storage, equipped};
}

test('saving an upgrade replaces storage and the equipped copy, preserves locks/groups, and rescans', () => {
    const source = flower();
    source.setLocked(true);
    source.setGroups(['upgrade']);
    const hash = source.getHash();
    const {modal, app, storage, equipped} = setup({stored: [source], equipped: {flower: source.clone()}});
    const snapshot = {rows: [{targetId: hash, slot: 'flower'}]};
    modal.state.result = snapshot;
    modal.editArtifact(hash);
    const [save, initial, , options] = UI.ArtifactWindow.show.mock.calls[0];
    expect(initial.getStatsHash()).toBe(source.getStatsHash());
    expect(options.groups).toEqual(expect.arrayContaining([expect.objectContaining({value: 'upgrade'})]));
    const upgraded = flower(20, 21);
    upgraded.setGroups(initial.getGroups());
    save(upgraded);

    expect(storage.listArtifacts()).toHaveLength(1);
    expect(storage.getByHash(hash)).toBeUndefined();
    expect(storage.getByHash(upgraded.getHash()).isLocked()).toBe(true);
    expect(storage.getByHash(upgraded.getHash()).getGroups()).toEqual(['upgrade']);
    expect(equipped.flower).toBe(upgraded);
    expect(app.setArtifact).toHaveBeenCalledWith(upgraded, true);
    expect(app.refresh).toHaveBeenCalledWith({objects: ['storage.artifacts']});
    expect(modal.state.stage).toBe('parameters');
    expect(modal.state.candidates).toEqual([]);
    expect(modal.state.inventory[0].getLevel()).toBe(20);
    expect(modal.state.result).toBeNull();
    expect(snapshot.rows[0].targetId).toBe(hash);
});

test('editing a stored candidate leaves another equipped artifact alone', () => {
    const source = flower();
    const other = flower(20, 14);
    const {modal, app, storage, equipped} = setup({stored: [source], equipped: {flower: other}});
    modal.editArtifact(source.getHash());
    const upgraded = flower(4, 7);
    UI.ArtifactWindow.show.mock.calls[0][0](upgraded);
    expect(storage.listArtifacts()[0].getLevel()).toBe(4);
    expect(equipped.flower).toBe(other);
    expect(app.setArtifact).not.toHaveBeenCalled();
    expect(modal.selectedArtifacts()[0].getHash()).toBe(upgraded.getHash());
});

test('an equipped-only candidate is saved to the build without adding an inventory copy', () => {
    const source = flower();
    const {modal, app, storage, equipped} = setup({equipped: {flower: source}});
    modal.editArtifact(source.getHash());
    const upgraded = flower(20, 21);
    UI.ArtifactWindow.show.mock.calls[0][0](upgraded);
    expect(equipped.flower).toBe(upgraded);
    expect(storage.listArtifacts()).toEqual([]);
    expect(app.refresh).toHaveBeenCalledWith({objects: ['build']});
});

test('a cancelled edit keeps the prediction and inventory intact', () => {
    const source = flower();
    const {modal, app, storage} = setup({stored: [source]});
    const prediction = {rows: [{targetId: source.getHash(), slot: 'flower'}]};
    modal.state.result = prediction;
    modal.editArtifact(source.getHash());
    expect(UI.ArtifactWindow.show).toHaveBeenCalledTimes(1);
    expect(modal.state.result).toBe(prediction);
    expect(storage.listArtifacts()[0].getStatsHash()).toBe(source.getStatsHash());
    expect(app.refresh).not.toHaveBeenCalled();
});

test('history snapshots remain viewable but cannot edit a source that is no longer present', () => {
    const source = flower();
    const {modal} = setup();
    const prediction = {rows: [{targetId: source.getHash(), slot: 'flower', error: 'unavailable'}]};
    modal.state = {...modal.state, historyEntry: {id: 'saved'}, result: prediction};
    modal.invalidate();
    expect(modal.state.result).toBe(prediction);
    const card = findAll(modal.renderResults(), element => element.props.rank === 1)[0];
    expect(card.props.onEdit).toBeUndefined();
    modal.editArtifact(source.getHash());
    expect(UI.ArtifactWindow.show).not.toHaveBeenCalled();
});

test('the edit control stops bubbling to outcomes and outcomes has its own keyboard button', () => {
    const source = flower();
    const {modal} = setup({stored: [source]});
    modal.state.result = {rows: [{targetId: source.getHash(), slot: 'flower', mainStat: 'hp', outcomeDetails: {}, score: 1}]};
    const results = modal.renderResults();
    const card = findAll(results, element => element.props.rank === 1)[0];
    const item = findAll(card.type(card.props), element => element.type === ArtifactListItem)[0];
    const controls = findAll(new ArtifactListItem(item.props).render(), element => !!element.props.onEdit)[0];
    const buttons = controls.type(controls.props);
    const edit = findAll(buttons, element => element.props.className === 'button edit')[0];
    expect(edit.type).toBe('button');
    expect(edit.props['aria-label']).toBe('tooltip.artifact_edit');
    edit.props.onClick();
    const event = {preventDefault: jest.fn(), stopPropagation: jest.fn()};
    buttons.props.onClick(event);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(UI.ArtifactWindow.show).toHaveBeenCalledTimes(1);
    expect(modal.state.outcomeRow).toBeUndefined();
    const outcomes = findAll(results, element => element.props.className === 'upgrade-artifact-outcomes')[0];
    expect(outcomes.type).toBe('button');
    outcomes.props.onClick(event);
    expect(modal.state.outcomeRow).toBe(source.getHash());
});
