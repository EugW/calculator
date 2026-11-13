import React from 'react';
import fs from 'fs';
import path from 'path';
import NodeModule from 'module';
import { transformSync } from '@babel/core';
import { App } from '../src/js/classes/App';
import * as calcSetClasses from '../src/js/classes/CalcSet';
import * as serializerClasses from '../src/js/classes/Serializer';
import * as teamClasses from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeBuild } from './support/team';

global.DB = DB;
global.UI = {Layout: {refresh: () => {}}};

// The slots of the Team tab, without a browser: the module is loaded with
// its components replaced by probes, as in teamLegacyUi.
const Probe = props => React.createElement('probe', props);
const dependencies = {
    react: React, '__database': DB, '__ui': global.UI,
    '../../classes/CalcSet': calcSetClasses,
    '../../classes/Serializer': serializerClasses,
    '../../classes/Team': teamClasses,
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
const {TeamView} = loadUi('Tab/Team.jsx');

const charId = (key) => DB.Chars.get(key).getId();
const ids = (team) => team.getSlots().map((member) => member ? member.char.getId() : 0);

/**
 * An App without the browser, as in appTeam, and its Team tab: the click on a
 * slot, and the dropdown of the slot a link is loaded into.
 */
function setup() {
    const app = Object.create(App.prototype);
    app.storage = {
        settings: {get: () => undefined, set: () => {}, showBetaContent: () => true},
        artifacts: {enrichBuild: () => {}},
    };
    app.team = teamClasses.Team.fromMember(makeBuild('Hutao'));
    app.viewedSlot = 0;

    const view = new TeamView({app});
    // The tab is not mounted: its state changes at once.
    view.setState = (state) => Object.assign(view.state, state);
    const select = (slot) => view.renderSlots().props.children[slot].props.onSelect();
    const linkSlot = () => view.renderButtons().props.children[1].props.children[0].props.children[0].props;
    return {app, view, select, linkSlot};
}

const link = (key) => 'https://example.test/#' + serializerClasses.Serializer.pack(makeBuild(key));

test('an empty slot asks for a character not in the team and gets a new build of it, viewed', () => {
    const {app, select} = setup();
    let shown = null;
    global.UI.CharSelectReact = {show: (opts) => { shown = opts; }};

    select(2);
    expect(shown.excludeIds).toEqual([charId('Hutao')]);
    // Nothing changes until a character is chosen.
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), 0, 0, 0]);
    expect(app.getViewedSlot()).toBe(0);

    shown.callback(DB.Chars.get('Xingqiu'));
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), 0, charId('Xingqiu'), 0]);
    expect(app.getViewedSlot()).toBe(2);
    expect(app.currentSet().team).toBe(app.getTeam());
});

test('a member\'s slot views it without asking', () => {
    const {app, select} = setup();
    app.newMember(2, DB.Chars.get('Xingqiu'));
    app.viewMember(0);
    global.UI.CharSelectReact = {show: () => { throw new Error('The character is not asked for'); }};

    select(2);
    expect(app.getViewedSlot()).toBe(2);
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), 0, charId('Xingqiu'), 0]);
});

test('a character link loads into the next empty slot, or into the slot chosen for it', () => {
    const {app, view, linkSlot} = setup();

    expect(linkSlot().items).toEqual([
        {value: 0, text: '1: ' + DB.Chars.get('Hutao').getName()},
        {value: 1, text: '2: team.slot_empty'},
        {value: 2, text: '3: team.slot_empty'},
        {value: 3, text: '4: team.slot_empty'},
    ]);
    expect(linkSlot().selected).toBe(1);

    view.handleLink(link('Xingqiu'));
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), charId('Xingqiu'), 0, 0]);
    expect(app.getViewedSlot()).toBe(1);
    expect(view.state.linkError).toBe(false);
    expect(linkSlot().selected).toBe(2);

    linkSlot().onChange({value: 3});
    expect(linkSlot().selected).toBe(3);
    view.handleLink(link('Bennet'));
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), charId('Xingqiu'), 0, charId('Bennet')]);

    // The choice was for that link.
    expect(linkSlot().selected).toBe(2);
});

test('with the team full a character link loads into the viewed member\'s slot', () => {
    const {app, view, linkSlot} = setup();
    ['Xingqiu', 'Bennet', 'Xiangling'].forEach((key, index) => app.newMember(index + 1, DB.Chars.get(key)));
    app.viewMember(2);

    expect(linkSlot().selected).toBe(2);
    view.handleLink(link('Zhongli'));
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), charId('Xingqiu'), charId('Zhongli'), charId('Xiangling')]);
});

test('a link that cannot be read changes nothing and keeps the chosen slot', () => {
    const {app, view, linkSlot} = setup();

    linkSlot().onChange({value: 3});
    view.handleLink('not a link');
    expect(view.state.linkError).toBe(true);
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), 0, 0, 0]);
    expect(linkSlot().selected).toBe(3);
});
