import React from 'react';
import fs from 'fs';
import path from 'path';
import NodeModule from 'module';
import { transformSync } from '@babel/core';
import { Condition } from '../src/js/classes/Condition';
import * as rotationModule from '../src/js/classes/Rotation';
import { RotationCompiler } from '../src/js/classes/RotationCompiler';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeBuild } from './support/team';

global.DB = DB;
global.UI = {Lang: {get: key => key, getTalent: key => key}};
const Probe = props => React.createElement('probe', props, props.children);
const deps = {react: React, '__database': DB, '../../../classes/Rotation': rotationModule,
    '../../../classes/RotationCompiler': {RotationCompiler},
    '../../Lang': {Lang: class {get(key) {return key;}}}};
const filename = path.resolve(__dirname, '../src/js/ui/Components/Rotation/List.jsx');
const loaded = new NodeModule(filename, module);
loaded.require = request => deps[request] || new Proxy({}, {get: () => Probe});
loaded._compile('const DB = require("__database");\n' + transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react'],
}).code, filename);
const {RotationList, RotationStepWarning} = loaded.exports;

function warnings(node, result = []) {
    if (Array.isArray(node)) node.forEach(child => warnings(child, result));
    else if (React.isValidElement(node)) {
        if (node.type === RotationStepWarning) result.push(node.props.warning);
        else if (typeof node.type === 'function') {
            warnings(node.type.prototype?.render ? new node.type(node.props).render() : node.type(node.props), result);
        } else warnings(node.props.children, result);
    }
    return result;
}
function setup() {
    const member = makeBuild('Bennet');
    const team = Team.fromMember(member);
    const cond = Condition.unwrap(DB.Chars.get('Bennet').getAllConditions()).find(item => item.getName() === 'bennet_fantastic_voyage');
    const step = value => ({type: 'condition', subtype: 'member', object: 'char', charId: member.char.getId(),
        itemId: member.char.getId(), conditionId: cond.getId(), value});
    const list = items => {
        // The live rotation may not have IDs. Editor clones assign them.
        team.setRotation(new rotationModule.Rotation({items}));
        return new RotationList({build: member, items: team.getRotation().clone().getItems(), featureItems: [], settings: {}});
    };
    return {member, team, step, list};
}

test('the editor warns on the correct repeated block step, skipping disabled items without touching the team', () => {
    const {team, step, list} = setup();
    const view = list([step(1), {...step(1), disabled: true}, {type: 'repeat', count: 2, items: [step(1)]}]);
    const before = team.serialize();
    const tree = view.render();
    expect(view.buffer[0].warning).toBeUndefined();
    expect(view.buffer[1].warning).toBeUndefined();
    expect(view.buffer[2].list[0].warning).toEqual({branches: null});
    expect(warnings(tree)).toEqual([{branches: null}]);
    expect(team.serialize()).toEqual(before);
});

test('partial uptime warnings identify their branch and refresh when the member input changes', () => {
    const {member, step, list} = setup();
    const view = list([{type: 'uptime', percent: 50, conditions: [step(1)],
        features: [{type: 'repeat', count: 1, items: [step(1)]}]}]);
    expect(warnings(view.render())).toEqual([{branches: ['on']}]);
    const label = RotationStepWarning({warning: {branches: ['on']}});
    expect(label.props.children.join('')).toBe('rotation_warning.same_state (rotation_warning.branch_on)');
    member.setCharSettings({bennet_fantastic_voyage: true});
    expect(warnings(view.render())).toEqual([{branches: null}, {branches: null}]);
});

test('an unworn set step still shows a profile warning and an unreachable uptime branch does not', () => {
    const {member, list, step} = setup();
    const set = DB.Artifacts.Sets.get('NoblesseOblige');
    const cond = Condition.unwrap(set.getConditions(5)).find(item => item.getName() === 'set.noblesse_oblige_4');
    const view = list([{type: 'condition', subtype: 'member', object: 'artifacts', charId: member.char.getId(),
        itemId: set.getId(), conditionId: cond.getId(), value: 1},
    {type: 'uptime', percent: 0, conditions: [step(0)], features: [{type: 'repeat', count: 1, items: [step(1)]}]}]);
    expect(warnings(view.render())).toEqual([{branches: null}]);
});
