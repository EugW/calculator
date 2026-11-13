import React from 'react';
import fs from 'fs';
import path from 'path';
import NodeModule from 'module';
import { transformSync } from '@babel/core';
import * as profile from '../src/js/classes/ArtifactSetProfile';
import * as run from '../src/js/classes/ArtifactSuggestRun';
import * as inventory from '../src/js/classes/ArtifactTeamInventory';
import * as utils from '../src/js/Utils';
import { Artifact } from '../src/js/classes/Artifact';
import { Condition } from '../src/js/classes/Condition';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeBuild } from './support/team';

global.DB = DB;
global.UI = {Lang: {get: key => key}, Layout: {unlockClosing() {}}};
const Probe = props => React.createElement('probe', props);
const dependencies = {
    react: React, '__database': DB, '__ui': global.UI,
    '../../classes/ArtifactSetProfile': profile, '../../classes/ArtifactSuggestRun': run,
    '../../classes/ArtifactTeamInventory': inventory, '../../Utils': utils,
    '../../classes/Artifact': {Artifact}, '../../classes/Condition': {Condition},
    '../Lang': {Lang: class {get(key) {return key;}}},
    '../Tab': {Tab: class {}},
};

function loadUi(file) {
    const filename = path.resolve(__dirname, '../src/js/ui/', file);
    const loaded = new NodeModule(filename, module);
    loaded.filename = filename;
    loaded.require = request => dependencies[request] || new Proxy({}, {get: () => Probe});
    loaded._compile('const DB = require("__database"), UI = require("__ui");\n' + transformSync(fs.readFileSync(filename, 'utf8'), {
        filename, configFile: false, babelrc: false,
        presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react'],
    }).code, filename);
    return loaded.exports;
}
const {ArtifactSetProfileModal} = loadUi('Modal/ArtifactSetProfile.jsx');
const {BestArtifact} = loadUi('Tab/BestArtifacts.jsx');
const {SuggestResult} = loadUi('Components/SuggestResult.jsx');
const {ArtifactsView} = loadUi('Tab/Artifacts.jsx');
const {ArtifactActionBaselineModal} = loadUi('Modal/ArtifactActionBaseline.jsx');

function stateful(component) {
    component.setState = (patch, done) => {
        Object.assign(component.state, typeof patch === 'function' ? patch(component.state) : patch);
        done?.();
    };
    return component;
}
function elements(node, predicate, result = []) {
    if (Array.isArray(node)) node.forEach(child => elements(child, predicate, result));
    else if (React.isValidElement(node)) {
        if (predicate(node)) result.push(node);
        elements(node.props.children, predicate, result);
    }
    return result;
}
function setup() {
    const member = makeBuild('Kazuha'), other = makeBuild('Bennet');
    const team = Team.fromMember(member);
    team.setMember(1, other);
    let current = member;
    const app = {currentSet: () => current, showBetaContent: () => false, refresh: jest.fn()};
    return {member, other, team, app, viewOther: () => {current = other;}};
}

test('Cancel discards the draft and Save writes only the pinned member, retaining hidden set choices', () => {
    const {member, other, app, viewOther} = setup();
    const hidden = DB.Artifacts.Sets.getKeys(true).find(id => DB.Artifacts.Sets.get(id).isBeta() && profile.setProfileControls(id).length);
    const preserved = hidden ? profile.setControlsOff(hidden) : {accumulated_healing: 0};
    member.setArtifactsSettings(preserved);
    const modal = stateful(new ArtifactSetProfileModal({app}));
    modal.show(member, 'ViridescentVenerer');
    modal.change('set.viridescent_venerer_4', 'pyro');
    expect(member.artifacts.getProfileSettings()).toEqual(preserved);
    modal.close();
    expect(member.artifacts.getProfileSettings()).toEqual(preserved);
    modal.show(member);
    modal.change('set.viridescent_venerer_4', 'hydro');
    viewOther();
    modal.save();
    expect(member.artifacts.getProfileSettings()).toEqual({...preserved, 'set.viridescent_venerer_4': 'hydro'});
    expect(other.artifacts.getProfileSettings()).toEqual({});
    expect(app.refresh).toHaveBeenCalledTimes(1);
});

test('a stale modal cannot overwrite a concurrently changed profile', () => {
    const {member, app} = setup();
    const modal = stateful(new ArtifactSetProfileModal({app}));
    modal.show(member);
    modal.change('set.noblesse_oblige_4', false);
    member.setArtifactsSettings({accumulated_healing: 0});
    modal.save();
    expect(member.artifacts.getProfileSettings()).toEqual({accumulated_healing: 0});
    expect(modal.state.error).toBe('artifact_profile.changed');
    expect(app.refresh).not.toHaveBeenCalled();
});

test('editing an equipped profile control preserves member state and a member-state control still edits it', () => {
    const member = makeBuild('Mualani');
    Team.fromMember(member);
    member.replaceArtifacts([new Artifact(5, 20, 'flower', 'ObsidianCodex', 'hp', []),
        new Artifact(5, 20, 'plume', 'ObsidianCodex', 'atk', [])]);
    member.setArtifactsSettings({'common.nightsoul_blessing_state': true});
    const view = {props: {app: {currentSet: () => member, setArtifactsSettings: data => member.setArtifactsSettings(data)}}};
    ArtifactsView.prototype.handleSettingChange.call(view, 'set.noblesse_oblige_4', false);
    expect(member.getSettings()['common.nightsoul_blessing_state']).toBe(true);
    expect(member.artifacts.getProfileSettings()).toEqual({'set.noblesse_oblige_4': false});
    ArtifactsView.prototype.handleSettingChange.call(view, 'common.nightsoul_blessing_state', false);
    expect(member.getSettings()['common.nightsoul_blessing_state']).toBe(false);
});

test('unequipped controls receive explicit resolved settings, and cards hold only profile controls', () => {
    const {member, app} = setup();
    const modal = stateful(new ArtifactSetProfileModal({app}));
    modal.show(member);
    const lists = elements(modal.renderSet('ViridescentVenerer'), node => Array.isArray(node.props.items));
    expect(lists).toHaveLength(1);
    expect(lists[0].props.items).toEqual(profile.setProfileControls('ViridescentVenerer').map(entry => entry.cond));
    expect(lists[0].props.controlSettings['set.viridescent_venerer_4']).toBe('cryo;electro;hydro;pyro');
    expect(lists[0].props).not.toHaveProperty('app');
    const visible = elements(modal.render(), node => !!node.props['data-set']).map(node => node.key);
    expect(visible).toContain('ViridescentVenerer');
    // Scholar has only stat bonuses; Obsidian Codex follows the member's Nightsoul's Blessing.
    expect(visible).not.toContain('Scholar');
    expect(visible).not.toContain('ObsidianCodex');
    expect(visible.every(setId => profile.setProfileControls(setId).length && !DB.Artifacts.Sets.get(setId).isBeta())).toBe(true);
});

test('the search keeps only sets whose name matches, and reopening clears it', () => {
    const {member, app} = setup();
    const modal = stateful(new ArtifactSetProfileModal({app}));
    const cards = () => elements(modal.render(), node => !!node.props['data-set']).map(node => node.key);
    modal.show(member, 'NoblesseOblige');
    expect(cards()).toContain('ViridescentVenerer');
    modal.setState({filter: ' NOBLESSE '});
    expect(cards()).toEqual(['NoblesseOblige']);
    const selected = elements(modal.render(), node => node.key === 'NoblesseOblige')[0];
    expect(selected.props.className).toContain('selected');
    modal.close();
    modal.show(member);
    expect(modal.state.filter).toBe('');
    expect(cards().length).toBeGreaterThan(1);
});

test('Suggest completion reconstructs the snapshot and apply equips pieces without replacing the live member', () => {
    const {member, app} = setup();
    member.setArtifactsSettings({'set.viridescent_venerer_4': 'pyro'});
    const artifact = new Artifact(5, 20, 'flower', 'ViridescentVenerer', 'hp', []);
    const snapshot = run.captureArtifactSuggestRun({member, artifacts: [artifact], settings: {}, feature: 'burst.dmg', featureType: 'average'});
    const view = stateful(Object.assign(Object.create(BestArtifact.prototype), {
        props: {app}, state: {feature: 'rotation.total', result: {items: []}}, pendingRun: snapshot,
        progressModal: {hide() {}}, resultsAreStale: () => false,
    }));
    member.setArtifactsSettings({'set.viridescent_venerer_4': 'hydro'});
    view.suggestCompleteCallback([{artifacts: [artifact], value: 42}]);
    const candidate = view.state.result.items[0];
    expect(view.state.result.feature).toBe('burst.dmg');
    expect(candidate.artifacts.getProfileSettings()['set.viridescent_venerer_4']).toBe('pyro');
    const before = member.artifacts.getProfileSettings();
    view.handleApplyResult(candidate);
    expect(app.currentSet()).toBe(member);
    expect(member.artifacts.getProfileSettings()).toEqual(before);
    expect(member.getArtifacts().flower.getHash()).toBe(artifact.getHash());
    view.resultsAreStale = () => true;
    member.clearArtifacts();
    view.handleApplyResult(candidate);
    expect(member.getArtifacts().flower).toBeNull();
});

test('applying a result keeps the other results applicable until the context changes', () => {
    const {member, other, app} = setup();
    const slots = DB.Artifacts.Slots.getKeys();
    const pieces = set => slots.map(slot => new Artifact(5, 20, slot, set, DB.Artifacts.Slots.get(slot).mainStats[0], []));
    const pool = pieces('ViridescentVenerer').concat(pieces('NoblesseOblige'));
    pool.forEach(artifact => artifact.setGroups(['']));
    member.replaceArtifacts(pool.slice(0, 5));
    const view = stateful(Object.assign(Object.create(BestArtifact.prototype), {
        props: {app}, progressModal: {hide() {}},
        storage: {getByHash: hash => pool.find(artifact => artifact.getHash() === hash)},
        dataArtifactsList: () => pool,
        state: {feature: 'burst.dmg', featureType: 'average', artifactFilter: false, result: {items: []},
            settings: {groups: {'': true}, slots: Object.fromEntries(slots.map(slot => [slot, true])),
                filter: {main_stats: {}, min_level: 0, max_level: 20}}},
    }));
    expect(view.resultsAreStale()).toBe(true);
    view.pendingRun = view.captureRun();
    expect(view.getFilteredArtifacts()).toHaveLength(pool.length);
    view.suggestCompleteCallback([{artifacts: pool.slice(5), value: 42}]);
    expect(view.resultsAreStale()).toBe(false);
    view.handleApplyResult(view.state.result.items[0]);
    expect(member.getArtifacts().flower.getSetName()).toBe('NoblesseOblige');
    expect(view.resultsAreStale()).toBe(false);
    other.setCharLevels({level: 80});
    expect(view.resultsAreStale()).toBe(true);
});

test('re-rendering the result list does not recompute its frozen rows', () => {
    const items = [1, 2, 3].map(() => ({calcFeatures: jest.fn(() => ({'burst.dmg': {}})), getArtifacts: () => ({})}));
    const renderRows = () => {
        const list = SuggestResult({result: {feature: 'burst.dmg', items}, otherFeatures: [], savedHashes: {}});
        for (const row of elements(list, node => items.includes(node.props.item))) {
            elements(new row.type(row.props).render(), node => node.type.name === 'SuggesterFeatures')
                .forEach(node => node.type(node.props));
        }
    };
    renderRows();
    renderRows();
    for (const item of items) expect(item.calcFeatures).toHaveBeenCalledTimes(1);
});

test('the mismatch dialog shows the compared pieces and exclusions and delegates each choice separately', () => {
    const current = new Artifact(5, 20, 'flower', 'NoblesseOblige', 'hp', []);
    const baseline = new Artifact(5, 20, 'flower', 'ViridescentVenerer', 'hp', []);
    const onEquip = jest.fn(), onSettings = jest.fn(), onContinue = jest.fn(), onDontAsk = jest.fn();
    const tree = ArtifactActionBaselineModal({currentValue: 100, baselineValue: 120,
        changes: [{slot: 'flower', current, baseline}], exclusions: ['Noblesse: Allow 4-piece is off'],
        dontAsk: false, onEquip, onSettings, onContinue, onDontAsk, onClose: jest.fn()});
    expect(elements(tree, node => node.props.art).map(node => node.props.art)).toEqual([current, baseline]);
    expect(elements(tree, node => node.type === 'li')[0].props.children).toBe('Noblesse: Allow 4-piece is off');
    for (const [key, callback] of [['equip', onEquip], ['settings', onSettings], ['continue', onContinue]]) {
        elements(tree, node => node.props.title === 'artifact_baseline.' + key)[0].props.onClick();
        expect(callback).toHaveBeenCalledTimes(1);
    }
    elements(tree, node => node.props.title === 'artifact_baseline.dont_ask')[0].props.onChange(true);
    expect(onDontAsk).toHaveBeenCalledWith(true);
});
