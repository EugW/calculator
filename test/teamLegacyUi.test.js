import React from 'react';
import fs from 'fs';
import path from 'path';
import NodeModule from 'module';
import { transformSync } from '@babel/core';
import * as condition from '../src/js/classes/Condition';
import * as rotation from '../src/js/classes/Rotation';
import * as conditionValues from '../src/js/classes/Team/ConditionValues';
import * as legacy from '../src/js/classes/Team/Legacy';
import * as overrides from '../src/js/classes/Team/Overrides';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery } from './support/team';

global.DB = DB;
global.UI = {Lang: {get: key => key, getTalent: key => key}};

// The "Additional buffs" section of the Buffs tab (the team's legacy source),
// without a browser: the module is loaded with its components replaced by
// probes, as in memberOverridesUi.
const Probe = props => React.createElement('probe', props);
const named = name => Object.assign(props => React.createElement('probe', props), {probe: name});
const dependencies = {
    react: React, '__database': DB, '__ui': global.UI,
    '../../../classes/Condition': condition,
    '../../../classes/Team/ConditionValues': conditionValues,
    '../../../classes/Team/Legacy': legacy,
    '../../../classes/Team/Overrides': overrides,
    '../../Components/ConditionList': {ConditionList: named('ConditionList')},
    '../../Components/Inputs/Input': {NumberInput: named('NumberInput')},
    '../../Components/Inputs/Buttons': {TitledButton: named('TitledButton')},
    '../../Components/Inputs/Dropdown': {Dropdown: named('Dropdown')},
    'react-sortablejs': {ReactSortable: named('ReactSortable')},
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
const {LegacySection, legacyCount} = loadUi('Tab/Buffs/Legacy.jsx');

Object.assign(dependencies, {
    '../../../classes/Rotation': rotation,
    '../SourceName': {sourceName: (source) => 'source:' + source.getName()},
});
const {RotationConditionModal} = loadUi('Components/Rotation/ConditionModal.jsx');

/** Every element of a tree, with the module's own function components rendered. */
function elements(node, predicate, result = []) {
    if (Array.isArray(node)) {
        node.forEach(child => elements(child, predicate, result));
    } else if (React.isValidElement(node)) {
        if (typeof node.type == 'function' && !node.type.probe && node.type !== Probe) {
            return elements(node.type(node.props), predicate, result);
        }
        if (predicate(node)) result.push(node);
        elements(node.props.children, predicate, result);
    }
    return result;
}
const probes = (tree, name) => elements(tree, node => node.type.probe == name);
const button = (tree, key) => probes(tree, 'TitledButton').find(node => node.props.title == key || node.props.tooltip == key);
const entryRows = (tree) => elements(tree, node => !!node.props['data-uid']);
const texts = (tree, className) => elements(tree, node => node.props.className == className).map(node => node.props.children);
const header = (row) => elements(row, node => node.props.className == 'buff-legacy-header')[0];
const body = (row) => elements(row, node => node.props.className == 'buff-legacy-body')[0];

function setup() {
    const member = makeBuild('Hutao');
    const team = Team.fromMember(member);
    const app = {
        getTeam: () => team,
        teamView: () => team.view(),
        currentSet: () => member,
        changeLegacy: (change) => change(team),
    };
    const section = new LegacySection({app});
    // Not mounted: its state is set at once.
    section.setState = (update) => {
        section.state = Object.assign({}, section.state, typeof update == 'function' ? update(section.state) : update);
    };
    const render = () => section.render();
    /** The row of an entry, expanded. */
    const expanded = (index = 0) => {
        if (!body(entryRows(render())[index])) header(entryRows(render())[index]).props.onClick();
        return entryRows(render())[index];
    };
    return {member, team, app, section, render, expanded};
}

const charId = (key) => DB.Chars.get(key).getId();

test('a character is added from the characters not in the team, and fills the party', () => {
    const {team, render} = setup();
    let shown = null;
    global.UI.CharSelectReact = {show: (opts) => { shown = opts; opts.callback(DB.Chars.get('Bennet')); }};

    expect(legacyCount(team)).toBe(0);
    expect(texts(render(), 'buff-legacy-none')).toEqual(['legacy.empty']);
    button(render(), 'legacy.add_char').props.onClick();

    expect(shown.excludeIds).toEqual([charId('Hutao')]);
    expect(legacyCount(team)).toBe(1);
    const [row] = entryRows(render());
    expect(row.props['data-kind']).toBe('char');
    expect(texts(row, 'buff-legacy-name')).toEqual(['char_name.bennett']);
    expect(texts(row, 'buff-legacy-state')).toEqual(['legacy.state_party']);
    // A new entry is shown expanded, to be set up.
    expect(body(row)).toBeDefined();

    // The next choice leaves out the member and the virtual character.
    global.UI.CharSelectReact = {show: (opts) => { shown = opts; }};
    button(render(), 'legacy.add_char').props.onClick();
    expect(shown.excludeIds).toEqual([charId('Hutao'), charId('Bennet')]);
});

test('an entry is collapsed to its icon, name and state, and a click expands it', () => {
    const {team, render} = setup();
    team.addLegacy(new legacy.VirtualCharacter(DB.Chars.get('Bennet')));
    team.addLegacy(new legacy.FloatingSet('NoblesseOblige'));

    let [bennett, noblesse] = entryRows(render());
    for (const row of [bennett, noblesse]) {
        expect(body(row)).toBeUndefined();
        expect(probes(row, 'ConditionList')).toHaveLength(0);
        expect(probes(row, 'NumberInput')).toHaveLength(0);
        expect(probes(row, 'TitledButton')).toHaveLength(0);
        expect(header(row).props['aria-expanded']).toBe(false);
    }
    expect(texts(bennett, 'buff-legacy-name')).toEqual(['char_name.bennett']);
    expect(texts(bennett, 'buff-legacy-state')).toEqual(['legacy.state_party']);
    expect(texts(noblesse, 'buff-legacy-name')).toEqual(['artifact_set.noblesse_oblige']);
    expect(texts(noblesse, 'buff-legacy-state')).toEqual([]);

    header(noblesse).props.onClick();
    [bennett, noblesse] = entryRows(render());
    expect(body(bennett)).toBeUndefined();
    expect(body(noblesse)).toBeDefined();
    expect(noblesse.props.className).toBe('buff-legacy-entry expanded');
    expect(header(noblesse).props['aria-expanded']).toBe(true);
    expect(probes(noblesse, 'ConditionList')).toHaveLength(1);

    // A second click collapses it again.
    header(noblesse).props.onClick();
    expect(body(entryRows(render())[1])).toBeUndefined();
});

test('a virtual character: constellation, talent levels, the stats its effects read and its controls', () => {
    const {member, team, expanded} = setup();
    const bennett = team.addLegacy(new legacy.VirtualCharacter(DB.Chars.get('Bennet')));
    const row = () => expanded(0);
    const base = finalStats(member).get('atk');

    // The stat his burst reads is offered; nothing else.
    const stats = elements(row(), node => !!node.props['data-stat']);
    expect(stats.map(node => node.props['data-stat'])).toEqual(['atk_base']);
    probes(stats[0], 'NumberInput')[0].props.onChange(800);
    expect(bennett.stated).toEqual({atk_base: 800});

    // His controls for the team, with the entry as their source.
    const list = probes(row(), 'ConditionList')[0];
    expect(list.props.source).toBe(bennett);
    expect(list.props.items.map(cond => cond.getName())).toContain('bennet_fantastic_voyage');
    list.props.onChange('bennet_fantastic_voyage', true);
    const level1 = finalStats(member).get('atk') - base;
    expect(level1).toBeGreaterThan(0);

    const burst = elements(row(), node => node.props['data-talent'] == 'burst')[0];
    probes(burst, 'NumberInput')[0].props.onChange(10);
    expect(bennett.getSkills().burst).toBe(10);
    expect(finalStats(member).get('atk') - base).toBeGreaterThan(level1);

    const constellation = probes(row(), 'Dropdown')[0];
    expect(constellation.props.items.map(item => item.text)).toEqual(['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
    constellation.props.onChange({value: 6});
    expect(bennett.getConstellation()).toBe(6);

    // Clearing the input removes the stated value.
    probes(elements(row(), node => !!node.props['data-stat'])[0], 'NumberInput')[0].props.onChange('');
    expect(bennett.stated).toEqual({});
});

test('a floating weapon: refinement, the wielder stat its effect reads and its control', () => {
    const {member, team, render, expanded} = setup();
    global.UI.WeaponSelectReact = {show: ({callback}) => callback(DB.Weapons.get('sword').get('KeyofKhajNisut'))};
    button(render(), 'legacy.add_weapon').props.onClick();

    const [entry] = team.legacy.getEntries();
    const row = () => expanded(0);
    const base = totalMastery(finalStats(member));
    expect(row().props['data-kind']).toBe('weapon');
    expect(texts(row(), 'buff-legacy-state')).toEqual([]);

    const refine = probes(row(), 'Dropdown')[0];
    expect(refine.props.items.map(item => item.text)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5']);
    refine.props.onChange({value: 5});
    expect(entry.getRefine()).toBe(5);

    probes(elements(row(), node => node.props['data-stat'] == 'hp')[0], 'NumberInput')[0].props.onChange(50000);
    probes(row(), 'ConditionList')[0].props.onChange('weapon_key_of_khaj_nisut', 3);
    // R5: 0.4% of the wielder's Max HP.
    expect(totalMastery(finalStats(member)) - base).toBeCloseTo(200, 6);
});

test('a floating set: its controls, and the wearer\'s element where an effect depends on it', () => {
    const {member, team, render, expanded} = setup();
    const picks = ['ViridescentVenerer', 'NoblesseOblige'];
    global.UI.ArtifactSetSelectReact = {show: ({callback}) => callback({key: picks.shift()})};
    button(render(), 'legacy.add_set').props.onClick();
    button(render(), 'legacy.add_set').props.onClick();

    const [venerer, noblesse] = [expanded(0), expanded(1)];
    const element = probes(venerer, 'Dropdown')[0];
    expect(element.props.items.map(item => item.value)).toEqual(['', 'pyro', 'hydro', 'electro', 'cryo', 'anemo', 'geo', 'dendro']);
    expect(probes(noblesse, 'Dropdown')).toHaveLength(0);

    const res = () => finalStats(member).get('enemy__res_pyro');
    const shredded = res();
    element.props.onChange({value: 'geo'});
    expect(team.legacy.getEntries()[0].element).toBe('geo');
    expect(res() - shredded).toBeCloseTo(0.4, 9);
    expect(probes(noblesse, 'ConditionList')[0].props.items.map(cond => cond.getName())).toEqual(['set.noblesse_oblige_4']);
});

test('entries are dragged into a new order, which decides the party\'s virtual characters', () => {
    const {team, render} = setup();
    for (const key of ['Bennet', 'Xingqiu', 'Kazuha', 'Zhongli']) {
        team.addLegacy(new legacy.VirtualCharacter(DB.Chars.get(key)));
    }
    const noblesse = team.addLegacy(new legacy.FloatingSet('NoblesseOblige'));
    const states = () => entryRows(render()).map(row => texts(row, 'buff-legacy-name')[0] + ': ' + (texts(row, 'buff-legacy-state')[0] || ''));
    const sortable = () => probes(render(), 'ReactSortable')[0];
    expect(states()).toEqual([
        'char_name.bennett: legacy.state_party', 'char_name.xingqiu: legacy.state_party',
        'char_name.kaedehara_kazuha: legacy.state_party', 'char_name.zhongli: legacy.state_outside',
        'artifact_set.noblesse_oblige: ',
    ]);

    // The header is the drag handle; the list is the entries by uid.
    expect(sortable().props.handle).toBe('.buff-legacy-header');
    const list = sortable().props.list;
    expect(list.map(item => item.id)).toEqual(team.legacy.getEntries().map(entry => entry.uid));

    // A press and release without a move (the sortable reports it too) changes nothing.
    const before = team.legacy.getEntries();
    sortable().props.setList(list.map(item => Object.assign({chosen: true}, item)));
    expect(team.legacy.getEntries()).toEqual(before);

    // Zhongli is dragged before Kazuha: he fills the third free slot.
    sortable().props.setList([list[0], list[1], list[3], list[2], list[4]]);
    expect(states().slice(2, 4)).toEqual(['char_name.zhongli: legacy.state_party', 'char_name.kaedehara_kazuha: legacy.state_outside']);

    // Any entry moves anywhere in the list.
    sortable().props.setList([{id: noblesse.uid}].concat(sortable().props.list.filter(item => item.id != noblesse.uid)));
    expect(team.legacy.getEntries()[0]).toBe(noblesse);
    expect(states().slice(1, 4)).toEqual([
        'char_name.bennett: legacy.state_party', 'char_name.xingqiu: legacy.state_party', 'char_name.zhongli: legacy.state_party',
    ]);
});

test('an entry is removed from its expanded form; a member\'s virtual character is shown without effect', () => {
    const {team, render, expanded} = setup();
    for (const key of ['Bennet', 'Xingqiu', 'Kazuha']) {
        team.addLegacy(new legacy.VirtualCharacter(DB.Chars.get(key)));
    }
    const names = () => entryRows(render()).map(row => texts(row, 'buff-legacy-name')[0]);

    button(expanded(0), 'legacy.remove').props.onClick();
    expect(names()).toEqual(['char_name.xingqiu', 'char_name.kaedehara_kazuha']);

    team.setMember(1, makeBuild('Xingqiu'));
    const [xingqiu] = entryRows(render());
    expect(texts(xingqiu, 'buff-legacy-state')).toEqual(['legacy.state_inactive']);
    expect(xingqiu.props.className).toBe('buff-legacy-entry inactive');
});

test('the rotation step picker offers the entries of the legacy source with their controls for the team', () => {
    const {member, team} = setup();
    const bennett = team.addLegacy(new legacy.VirtualCharacter(DB.Chars.get('Bennet')));
    const noblesse = team.addLegacy(new legacy.FloatingSet('NoblesseOblige'));
    const key = team.addLegacy(new legacy.FloatingWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut')));

    const modal = new RotationConditionModal({build: member});
    const groups = modal.buildGroups();
    const group = (entry) => groups.find(item => item.value == 'member:' + entry.getSourceId());

    expect(groups[0].value).toBe('member:' + member.char.getId());
    expect(group(bennett).text).toBe('source:char_name.bennett');
    expect(group(bennett).items.map(item => item.cond.getName())).toContain('bennet_fantastic_voyage');
    expect(group(noblesse).items.map(item => item.data)).toEqual([{
        subtype: 'member', charId: noblesse.getSourceId(), object: 'artifacts',
        itemId: DB.Artifacts.Sets.get('NoblesseOblige').getId(),
        conditionId: group(noblesse).items[0].cond.getId(),
    }]);
    expect(group(key).items.map(item => [item.data.object, item.data.itemId, item.cond.getName()]))
        .toEqual([['weapon', key.weapon.getId(), 'weapon_key_of_khaj_nisut']]);

    // The step the picker makes is the entry's step.
    const data = rotation.Rotation.getConditionData(Object.assign({type: 'condition', value: 0}, group(noblesse).items[0].data), team);
    expect(data.member).toBe(noblesse);
    expect(data.invalid).toBeFalsy();
});
