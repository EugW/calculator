import React from 'react';
import { formatCompactCount } from '../src/js/Utils';
import fs from 'fs';
import path from 'path';
import NodeModule from 'module';
import { transformSync } from '@babel/core';

// Render the function component without a browser or the global stat database.
const filename = path.resolve(__dirname, '../src/js/ui/Components/ProgressBar.jsx');
const loaded = new NodeModule(filename, module);
loaded.filename = filename;
loaded.require = request => {
    if (request === 'react') return React;
    if (request.endsWith('.css')) return {};
    if (request === '../../Utils') return {formatCompactCount};
    if (request === '../../classes/Stats') return {Stats: {format: (key, value) => value}};
    throw new Error('Unexpected progress dependency: ' + request);
};
loaded._compile(transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react'],
}).code, filename);
const {ProgressBar} = loaded.exports;
const nodeText = node => Array.isArray(node) ? node.map(nodeText).join('')
    : React.isValidElement(node) ? nodeText(node.props.children) : node == null ? '' : String(node);

test.each([
    [undefined, '0'], [NaN, '0'], [Infinity, '0'], [-1, '0'], [0, '0'], [5, '5'], [999, '999'],
    [1000, '1K'], [1234, '1.23K'], [12000, '12K'], [999499, '999K'], [999500, '1M'],
    [1000000, '1M'], [427000000, '427M'], [999500000, '1B'], [1000000000, '1B'],
    [854123456789, '854B'], [999500000000, '1T'], [2989000000000, '2.99T'],
    [999500000000000, '1E15'], [1234567890000000000, '1.23E18'],
])('compact count %s -> %s', (input, expected) => {
    expect(formatCompactCount(input)).toBe(expected);
});

test('abbreviated labels retain raw counters in the tooltip and calculate percentages from raw values', () => {
    const tree = ProgressBar({count: 1234, total: 10000, compact: true});
    expect(nodeText(tree)).toBe('1.23K/10K (12%)');
    expect(tree.props.title).toBe('1234 / 10000 (12%)');
    expect(tree.props.children[0].props.style.width).toBe('12.3%');
    expect(tree.props.className).toBe('progress-bar compact');
});

test('ordinary progress consumers keep full labels and existing small-bar support', () => {
    const tree = ProgressBar({count: 1234, total: 10000, addClass: 'small'});
    expect(nodeText(tree)).toBe('1234/10000 (12%)');
    expect(tree.props.title).toBeUndefined();
    expect(tree.props.className).toBe('progress-bar small');
});

test('compact empty counters keep the zero-total behavior', () => {
    const tree = ProgressBar({count: 0, total: 0, compact: true});
    expect(nodeText(tree)).toBe('0/0 (0%)');
    expect(tree.props.children[0].props.style.width).toBe('0.0%');
});
