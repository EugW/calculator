import { Artifact } from '../src/js/classes/Artifact';
import React from 'react';
import fs from 'fs';
import path from 'path';
import NodeModule from 'module';
import { transformSync } from '@babel/core';
import { StorageItemArtifacts } from '../src/js/classes/StorageItem/Artifacts';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { availableTeamArtifacts, copyWithInventoryArtifacts, equipTeamArtifact, inventoryArtifactHash, teamArtifactOwnership } from '../src/js/classes/ArtifactTeamInventory';
import { makeBuild } from './support/team';

global.DB = DB;
global.UI = {Lang: {get: key => key}};

// Exercise the actual pool hand-off without mounting unrelated browser controls.
const filename = path.resolve(__dirname, '../src/js/ui/Tab/BestArtifacts.jsx');
const loaded = new NodeModule(filename, module);
loaded.filename = filename;
loaded.require = request => {
    if (request === '__database') return DB;
    if (request === 'react') return React;
    if (request === '../../Utils') return {formatNumber: value => String(value)};
    if (request === '../../classes/ArtifactTeamInventory') return {inventoryArtifactHash, teamArtifactOwnership};
    return new Proxy({}, {get: () => class {}});
};
loaded._compile('const DB = require("__database");\n' + transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react'],
}).code, filename);
const {BestArtifact} = loaded.exports;

function filterPool(member, artifacts) {
    const view = {
        props: {app: {currentSet: () => member}},
        storage: {getByHash: hash => artifacts.find(artifact => artifact.getHash() === hash)},
        dataArtifactsList: () => artifacts,
        state: {settings: {groups: {'': true}, slots: Object.fromEntries(DB.Artifacts.Slots.getKeys().map(slot => [slot, true])),
            filter: {main_stats: {}, min_level: 0, max_level: 20}}},
    };
    BestArtifact.prototype.filterArtifacts.call(view);
    return view;
}

function artifact(slot = 'flower', value = 3.9) {
    const result = new Artifact(5, 20, slot, 'NoblesseOblige', slot === 'flower' ? 'hp' : 'atk', [
        {stat: 'crit_rate', value}, {stat: 'crit_dmg', value: 7.8},
        {stat: 'def_percent', value: 5.8}, {stat: 'recharge', value: 6.5},
    ]);
    result.setGroups(['']);
    return result;
}

function setup() {
    const member = makeBuild('Diluc');
    const teammate = makeBuild('Bennet');
    const team = Team.fromMember(member);
    team.setMember(2, teammate);
    const ownArtifact = artifact('plume');
    const teammateArtifact = artifact();
    member.setArtifact(ownArtifact);
    teammate.setArtifact(teammateArtifact);
    return {member, teammate, team, ownArtifact, teammateArtifact};
}

test('ownership follows viewed member rather than on-field member, including empty slots', () => {
    const {member, teammate, team, ownArtifact, teammateArtifact} = setup();
    team.setOnFieldMember(teammate);
    const owned = teamArtifactOwnership(member);
    expect([...owned.equipped]).toEqual([ownArtifact.getHash()]);
    expect(owned.teammates.get(teammateArtifact.getHash())).toEqual([teammate.char.object]);
    expect(teamArtifactOwnership(teammate).teammates.get(ownArtifact.getHash())).toEqual([member.char.object]);

    team.removeMember(2);
    expect(teamArtifactOwnership(member).teammates.size).toBe(0);
    expect([...teamArtifactOwnership(teammate).equipped]).toEqual([teammateArtifact.getHash()]);
});

test('inventory metadata enrichment does not hide teammate ownership or prevent transfer', () => {
    global.localStorage = {getItem: () => null, setItem: () => {}};
    try {
        const {member, teammate, teammateArtifact} = setup();
        const stored = teammateArtifact.clone();
        stored.setMetadata({totalRolls: 8});
        const storage = new StorageItemArtifacts();
        storage.addArtifacts([stored]);
        expect(stored.getHash()).not.toBe(teammateArtifact.getHash());
        expect(inventoryArtifactHash(teammateArtifact, storage)).toBe(stored.getHash());
        expect(teamArtifactOwnership(member, storage).teammates.has(stored.getHash())).toBe(true);
        expect(availableTeamArtifacts(member, [stored], storage)).toEqual([]);

        const workerBuild = copyWithInventoryArtifacts(member, storage);
        expect(workerBuild.team.getMember(2).getArtifacts().flower.getHash()).toBe(stored.getHash());
        equipTeamArtifact(workerBuild, stored);
        expect(workerBuild.team.getMember(2).getArtifacts().flower).toBeNull();
        expect(teammate.getArtifacts().flower.getHash()).toBe(teammateArtifact.getHash());

        equipTeamArtifact(member, stored, storage);
        expect(member.getArtifacts().flower).toBe(stored);
        expect(teammate.getArtifacts().flower).toBeNull();
        expect(teamArtifactOwnership(member, storage).teammates.size).toBe(0);
    } finally {
        delete global.localStorage;
    }
});

test('preview transfers only in its cloned team, preserving the original and unrelated pieces', () => {
    const {member, teammate, teammateArtifact} = setup();
    const unrelated = artifact('plume', 7.8);
    teammate.setArtifact(unrelated);
    const preview = member.clone();
    equipTeamArtifact(preview, teammateArtifact);
    expect(preview.team.getMember(2).getArtifacts().flower).toBeNull();
    expect(preview.team.getMember(2).getArtifacts().plume.getHash()).toBe(unrelated.getHash());
    expect(teammate.getArtifacts().flower).toBe(teammateArtifact);
    expect(member.getArtifacts().flower).toBeNull();
});

test('optimizer pool excludes teammate gear and immediately follows a change of viewed member', () => {
    const {member, teammate, ownArtifact, teammateArtifact} = setup();
    const free = artifact('flower', 7.8);
    const pool = [ownArtifact, teammateArtifact, free];
    const result = filterPool(member, pool);
    expect(result.filteredArtifacts).toEqual([ownArtifact, free]);
    expect(result.counts).toMatchObject({total: 3, teammates: 1, used: 2});
    expect(filterPool(teammate, pool).filteredArtifacts).toEqual([teammateArtifact, free]);
    expect(availableTeamArtifacts(member, pool)).toEqual([ownArtifact, free]);
});

test('empty-slot fallback retains own gear but cannot reintroduce a teammate duplicate from an imported build', () => {
    const {member, teammateArtifact, ownArtifact} = setup();
    expect(filterPool(member, [teammateArtifact]).filteredArtifacts).toEqual([ownArtifact]);
    member.setArtifact(teammateArtifact.clone());
    expect(filterPool(member, [teammateArtifact]).filteredArtifacts).toEqual([ownArtifact]);
});

test('transferring a teammate piece removes its former four-piece team buff during evaluation', () => {
    const {member, teammate, teammateArtifact} = setup();
    for (const slot of ['plume', 'sands', 'goblet']) teammate.setArtifact(artifact(slot));
    teammate.setArtifactsSettings({'set.noblesse_oblige_4': true});
    const before = member.getBuildData().stats.get('atk_percent');
    equipTeamArtifact(member, teammateArtifact);
    expect(member.getBuildData().stats.get('atk_percent')).toBeCloseTo(before - 0.2, 8);
});
