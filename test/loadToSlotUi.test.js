import React from 'react';
import fs from 'fs';
import path from 'path';
import NodeModule from 'module';
import { transformSync } from '@babel/core';
import { App } from '../src/js/classes/App';
import { CalcSet } from '../src/js/classes/CalcSet';
import { Serializer } from '../src/js/classes/Serializer';
import * as teamClasses from '../src/js/classes/Team';
import { VirtualCharacter } from '../src/js/classes/Team/Legacy';
import { DB } from '../src/js/db/DB';
import { makeBuild } from './support/team';
import released from './fixtures/public-main-builds.json';

global.DB = DB;
global.UI = {Layout: {refresh: () => {}}};

// The buttons that load a build into a slot of the team, without a browser:
// the module is loaded with its components replaced by probes, as in
// teamTabUi.
const Probe = props => React.createElement('probe', props);
const dependencies = {
    react: React, '__database': DB, '__ui': global.UI,
    '../../../classes/Team': teamClasses,
    '../../Lang': {Lang: class {get(key) {return key;}}},
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
const {LoadToSlot, loadFullButton} = loadUi('Components/Character/LoadToSlot.jsx');

const charId = (key) => DB.Chars.get(key).getId();
const ids = (team) => team.getSlots().map((member) => member ? member.char.getId() : 0);

/**
 * An App without the browser, as in appTeam, with Hu Tao in the first slot
 * and Xingqiu in the third, and the buttons of a build: one per slot.
 */
function setup() {
    const app = Object.create(App.prototype);
    app.storage = {
        settings: {get: () => undefined, set: () => {}, showBetaContent: () => true},
        artifacts: {enrichBuild: () => {}},
    };
    app.team = teamClasses.Team.fromMember(makeBuild('Hutao'));
    app.viewedSlot = 0;
    app.newMember(2, DB.Chars.get('Xingqiu'));
    app.viewMember(0);

    const loaded = [];
    const buttons = (build) => LoadToSlot({app, build, onLoad: () => loaded.push(ids(app.getTeam()))}).props.children[1].props.children;

    const asked = [];
    global.UI.ConfirmWindow = {show: (title, message, callback) => asked.push({message, callback})};

    return {app, buttons, loaded, asked};
}

const classesOf = (button) => button.props.className.split(' ').slice(1);

test('an empty slot is filled at once, with a copy of the build, and viewed', () => {
    const {app, buttons, loaded, asked} = setup();
    const build = makeBuild('Bennet');

    expect(buttons(build).map(classesOf)).toEqual([[], ['empty'], [], ['empty']]);

    buttons(build)[1].props.onClick();
    expect(asked).toEqual([]);
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), charId('Bennet'), charId('Xingqiu'), 0]);
    expect(app.getViewedSlot()).toBe(1);
    expect(loaded).toEqual([ids(app.getTeam())]);

    // The build of the list stays on its own: it can be loaded again.
    expect(app.currentSet()).not.toBe(build);
    expect(build.team).toBeFalsy();
});

test('replacing a member asks first', () => {
    const {app, buttons, loaded, asked} = setup();
    const before = ids(app.getTeam());

    buttons(makeBuild('Bennet'))[2].props.onClick();
    expect(asked.map((item) => item.message)).toEqual(['team.confirm_replace']);
    expect(ids(app.getTeam())).toEqual(before);
    expect(loaded).toEqual([]);

    asked[0].callback();
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), 0, charId('Bennet'), 0]);
    expect(app.getViewedSlot()).toBe(2);
    expect(loaded).toEqual([ids(app.getTeam())]);
});

test('a build of a member\'s character loads into that member\'s slot only', () => {
    const {app, buttons, asked} = setup();
    const build = makeBuild('Xingqiu');
    build.setCharLevels({level: 80, ascension: 6, constellation: 6});

    const items = buttons(build);
    expect(items.map(classesOf)).toEqual([['disabled'], ['empty', 'disabled'], ['own'], ['empty', 'disabled']]);
    expect(items.map((item) => typeof item.props.onClick)).toEqual(['undefined', 'undefined', 'function', 'undefined']);

    items[2].props.onClick();
    asked[0].callback();
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), 0, charId('Xingqiu'), 0]);
    expect(app.getTeam().getMember(2).getSettings().char_constellation).toBe(6);
});

test('one list fills the whole team', () => {
    const {app, buttons, asked} = setup();

    buttons(makeBuild('Bennet'))[1].props.onClick();
    buttons(makeBuild('Xiangling'))[3].props.onClick();

    expect(asked).toEqual([]);
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), charId('Bennet'), charId('Xingqiu'), charId('Xiangling')]);
    expect(app.getTeam().getMembers().every((member) => member.team === app.getTeam())).toBe(true);
});

test('a build saved by the released calculator has a button that loads it in full, after a confirmation', () => {
    const {app, asked} = setup();
    const saved = CalcSet.deserialize(Serializer.unpack(released.fixtures.hutaoBennett.packed));
    let loads = 0;
    const button = loadFullButton(app, () => ++loads);

    // A build that holds only its character is loaded into a slot.
    expect(button.visible(makeBuild('Bennet'))).toBe(false);
    expect(button.visible(saved)).toBe(true);

    const before = app.getTeam();
    button.callback(saved);
    expect(asked.map((item) => item.message)).toEqual(['team.confirm_load_full']);
    expect(app.getTeam()).toBe(before);

    asked[0].callback();
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), 0, 0, 0]);
    expect(app.getTeam().legacy.getEntries().map((entry) => entry.getSourceId())).toEqual([charId('Bennet')]);
    expect(loads).toBe(1);

    // Its slot buttons still load the character only: here it is the member of the first slot.
    expect(LoadToSlot({app, build: saved}).props.children[1].props.children.map(classesOf))
        .toEqual([['own'], ['empty', 'disabled'], ['empty', 'disabled'], ['empty', 'disabled']]);
});

test('the button is absent while the build\'s team has beta content that is hidden', () => {
    const {app} = setup();
    const saved = CalcSet.deserialize(Serializer.unpack(released.fixtures.hutaoBennett.packed));
    const beta = jest.spyOn(teamClasses.Team.prototype, 'hasBetaContent').mockReturnValue(true);

    expect(loadFullButton(app).visible(saved)).toBe(true);
    app.storage.settings.showBetaContent = () => false;
    expect(loadFullButton(app).visible(saved)).toBe(false);
    beta.mockRestore();
});

test('a character saved with additional buffs loads in full too, and into a slot as the character only', () => {
    const {app, buttons, asked} = setup();
    const team = teamClasses.Team.fromMember(makeBuild('Bennet'));
    team.addLegacy(new VirtualCharacter(DB.Chars.get('Sucrose')));
    // As the storage of characters reads it: the one member of its team.
    const saved = teamClasses.Team.deserialize(team.withOnly(team.getMember(0)).serialize()).getMember(0);

    expect(loadFullButton(app).visible(saved)).toBe(true);

    buttons(saved)[1].props.onClick();
    expect(ids(app.getTeam())).toEqual([charId('Hutao'), charId('Bennet'), charId('Xingqiu'), 0]);
    expect(app.getTeam().legacy.getEntries()).toEqual([]);

    loadFullButton(app).callback(saved);
    asked[0].callback();
    expect(ids(app.getTeam())).toEqual([charId('Bennet'), 0, 0, 0]);
    expect(app.getTeam().legacy.getEntries().map((entry) => entry.getSourceId())).toEqual([charId('Sucrose')]);
    expect(app.getTeam()).not.toBe(saved.team);
});
