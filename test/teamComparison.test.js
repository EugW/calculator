import React from 'react';
import fs from 'fs';
import path from 'path';
import NodeModule from 'module';
import { transformSync } from '@babel/core';
import { CalcSet } from '../src/js/classes/CalcSet';
import { Serializer } from '../src/js/classes/Serializer';
import * as TeamModule from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeBuild, featureValues, teamOf } from './support/team';

global.DB = DB;
const stored = new Map();
const environment = {
    localStorage: {getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value)},
    UI: {ConfirmWindow: {show: (title, body, callback) => callback()}},
};
const filename = path.resolve(__dirname, '../src/js/ui/Tab/Compare.jsx');
const loaded = new NodeModule(filename, module);
loaded.filename = filename;
loaded.require = request => {
    if (request === '__environment') return environment;
    if (request === 'react') return React;
    if (request === '../../classes/CalcSet') return {CalcSet};
    if (request === '../../classes/Serializer') return {Serializer};
    if (request === '../../classes/Team') return TeamModule;
    return new Proxy({}, {get: () => class {}});
};
loaded._compile('const {localStorage, UI} = require("__environment");\n' + transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react'],
}).code, filename);
const {CompareView} = loaded.exports;

test('saved comparisons retain the team, viewed slot, enemy and field; applying restores that snapshot', () => {
    stored.clear();
    const source = makeBuild('Bennet');
    source.setCharSettings({bennet_fantastic_voyage: true});
    const team = TeamModule.Team.fromMember(source);
    const member = makeBuild('Ayaka');
    team.setMember(3, member);
    team.setOnFieldMember(member);
    team.modifySettings({polestar_field: true});
    team.enemy.setLevels({level: 103});
    const app = {showBetaContent: () => true, setTeam: jest.fn()};
    const view = new CompareView({app});
    view.addFromBuild(member.clone(), 'snapshot', true);
    view.saveToStorage();
    source.setCharSettings({});
    team.modifySettings({polestar_field: false});
    const restored = new CompareView({app});
    const snapshot = restored.state.items[0].build;
    expect(snapshot.team.slotOf(snapshot)).toBe(3);
    expect(snapshot.team.getMembers()).toHaveLength(2);
    expect(snapshot.team.enemy.getLevels().level).toBe(103);
    expect(teamOf(snapshot).polestar_field).toBe(true);
    expect(featureValues(snapshot)).toEqual(featureValues(view.state.items[0].build));
    restored.handleItemApply(0);
    const [applied, slot] = app.setTeam.mock.calls[0];
    expect(slot).toBe(3);
    expect(applied).not.toBe(snapshot.team);
    expect(featureValues(applied.getMember(slot))).toEqual(featureValues(snapshot));
});
