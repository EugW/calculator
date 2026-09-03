import React from 'react';
import fs from 'fs';
import path from 'path';
import NodeModule from 'module';
import { transformSync } from '@babel/core';

// Render ArtifactActionControls without a browser: stub every import except
// a probe ProgressBar for the shared baseline counter.
const filename = path.resolve(__dirname, '../src/js/ui/Components/ArtifactActionControls.jsx');
const loaded = new NodeModule(filename, module);
loaded.filename = filename;
const Probe = (props) => React.createElement('probe', props);
loaded.require = request => {
    if (request === 'react') return React;
    if (request === '../../classes/ArtifactActionProbability') {
        return {ACTION_SLOTS: ['flower', 'plume', 'sands', 'goblet', 'circlet']};
    }
    if (request === '../Components/Inputs/Input') return {Checkbox: () => null};
    if (request === './Accordion') {
        return {Accordion: () => null, AccordionItem: () => null};
    }
    if (request === './ProgressBar') {
        return {ProgressBar: Probe};
    }
    if (request === '../Lang') return {Lang: class { get(key) { return key; } }};
    throw new Error('Unexpected action controls dependency: ' + request);
};
loaded._compile(transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-react'],
}).code, filename);
const {ArtifactActionProgress, mergeActionProgress} = loaded.exports;

function findAll(element, predicate, found = []) {
    if (Array.isArray(element)) element.forEach(child => findAll(child, predicate, found));
    else if (React.isValidElement(element)) {
        if (predicate(element)) found.push(element);
        findAll(element.props.children, predicate, found);
    }
    return found;
}

function stages(progress) {
    const rendered = ArtifactActionProgress({progress});
    return Object.fromEntries(findAll(rendered, element => element.props['data-stage'])
        .map(element => [element.props['data-stage'], {
            segments: findAll(element, child => child.props.className === 'craft-progress-segment').map(child => ({
                ...child.props, width: child.props.children.props.style.width,
            })),
            bar: findAll(element, child => child.props.role === 'progressbar')[0]?.props,
            baseline: findAll(element, child => child.type === Probe)[0]?.props,
        }]));
}

const seed = {workerCount: 2, slotsCompleted: 0, slotsTotal: 3, unit: 'artifacts'};

test('one group reserves fixed candidate segments before any worker starts', () => {
    const progress = mergeActionProgress(seed, {key: 'baseline', phase: 'baseline', current: 25, total: 100});
    const rendered = stages(progress);
    expect(Object.keys(rendered)).toEqual(['slots', 'baseline', 'prepare', 'lower', 'search', 'rescore', 'gallery']);
    expect(rendered.baseline.baseline).toMatchObject({count: 25, total: 100});
    for (const [key, stage] of Object.entries(rendered)) {
        if (key === 'baseline') continue;
        expect(stage.segments).toHaveLength(3);
        expect(stage.segments.every(segment => segment.width === '0%')).toBe(true);
        expect(stage.bar['aria-valuenow']).toBe(0);
    }
    expect(mergeActionProgress(progress, null)).toBe(progress);
    expect(stages({}).prepare.bar['aria-valuenow']).toBe(0);
});

test('concurrent candidates advance different segments without changing the total', () => {
    let state = mergeActionProgress(seed, {candidateIndex: 0, workerId: 0, jobId: 'a', slot: 'flower',
        key: 'prepare', phase: 'prepare', current: 40, total: 100});
    const first = state.candidates[0];
    state = mergeActionProgress(state, {candidateIndex: 1, workerId: 1, jobId: 'b', slot: 'plume',
        key: 'prepare', phase: 'prepare', current: 100, total: 200});
    state = mergeActionProgress(state, {candidateIndex: 1, workerId: 1,
        key: 'search', phase: 'full', current: 5, total: 10});
    const rendered = stages(state);
    expect(state.candidates[0]).toBe(first);
    expect(rendered.prepare.segments.map(segment => segment.width)).toEqual(['40%', '50%', '0%']);
    expect(rendered.prepare.bar['aria-valuenow']).toBe(30);
    expect(rendered.search.bar['aria-valuenow']).toBe(16.7);
    expect(rendered.prepare.segments[0].style['--worker-color']).not.toBe(rendered.prepare.segments[1].style['--worker-color']);
    expect(rendered.prepare.segments[1].style).toEqual(rendered.search.segments[1].style);
    expect(rendered.search.segments[1].title).toContain('5 / 10');
    expect(rendered.search.segments[1].title).toContain('artifact_action.worker 2');
});

test('out-of-order completion and worker reuse preserve finished segments and colors', () => {
    let state = mergeActionProgress(seed, {candidateIndex: 0, workerId: 0, jobId: 'a',
        phase: 'prepare', key: 'prepare', current: 25, total: 100});
    state = mergeActionProgress(state, {candidateIndex: 1, workerId: 1, jobId: 'b', phase: 'slot_complete',
        slotsCompleted: 1, completedWork: {totalOutcomes: 50}});
    const finished = state.candidates[1];
    const color = stages(state).prepare.segments[1].style;
    state = mergeActionProgress(state, {candidateIndex: 2, workerId: 1, jobId: 'c', phase: 'prepare'});
    const rendered = stages(state);
    expect(state.candidates[1]).toBe(finished);
    expect(state.candidates[2]).not.toHaveProperty('completedWork');
    expect(rendered.prepare.segments.map(segment => segment.width)).toEqual(['25%', '100%', '0%']);
    expect(rendered.slots.segments.map(segment => segment.width)).toEqual(['0%', '100%', '0%']);
    expect(rendered.prepare.segments[1].style).toEqual(color);
    expect(rendered.prepare.segments[2].style).toEqual(color);
    expect(rendered.slots.bar['aria-valuenow']).toBe(33.3);
});

test('stage counters stay separate and duplicate setup events cannot rewind a segment', () => {
    let state = mergeActionProgress(seed, {candidateIndex: 0, workerId: 0,
        key: 'lower', phase: 'lower', current: 50, total: 200});
    state = mergeActionProgress(state, {candidateIndex: 0, workerId: 0, phase: 'upload'});
    state = mergeActionProgress(state, {candidateIndex: 0, workerId: 0,
        key: 'rescore', phase: 'rescore', current: 25, total: 100});
    state = mergeActionProgress(state, {candidateIndex: 0, workerId: 0,
        key: 'gallery', phase: 'gallery', current: 30, total: 50});
    state = mergeActionProgress(state, {candidateIndex: 0, workerId: 0,
        key: 'lower', phase: 'lower', current: 0, total: 200});
    const rendered = stages(state);
    expect(rendered.lower.segments[0].width).toBe('25%');
    expect(rendered.rescore.segments[0].width).toBe('25%');
    expect(rendered.gallery.segments[0].width).toBe('60%');
    expect(rendered.search.segments[0].width).toBe('0%');
});

test('skipped candidates and stages finish cleanly without fabricated work counts', () => {
    let state = {...seed};
    for (let candidateIndex = 0; candidateIndex < 3; ++candidateIndex) {
        state = mergeActionProgress(state, {candidateIndex, workerId: candidateIndex % 2, phase: 'slot_complete'});
    }
    for (const [key, stage] of Object.entries(stages(state))) {
        if (key === 'baseline') continue;
        expect(stage.bar['aria-valuenow']).toBe(100);
        expect(stage.segments.every(segment => segment.width === '100%')).toBe(true);
    }
    expect(stages(state).search.segments[0].title).toContain('artifact_action.stage_not_needed');
});

test('one worker also accumulates candidates, and a new run starts empty', () => {
    let state = mergeActionProgress({...seed, workerCount: 1},
        {candidateIndex: 0, workerId: 0, phase: 'slot_complete'});
    state = mergeActionProgress(state, {candidateIndex: 1, workerId: 0,
        phase: 'full', key: 'search', current: 5, total: 10});
    expect(stages(state).search.segments.map(segment => segment.width)).toEqual(['100%', '50%', '0%']);
    expect(stages(state).search.bar['aria-valuenow']).toBe(50);
    const next = mergeActionProgress({}, {...seed, key: 'baseline', current: 0, total: 10});
    expect(next).not.toHaveProperty('candidates');
    expect(stages(next).search.bar['aria-valuenow']).toBe(0);
});

test('a shared search advances every member candidate segment at once', () => {
    const state = mergeActionProgress(seed, {candidateIndex: 0, candidateIndices: [0, 2], workerId: 1, slot: 'goblet',
        key: 'search', phase: 'full', current: 50, total: 100, slotsCompleted: 0});
    expect(state.candidates[0].search.fraction).toBe(0.5);
    expect(state.candidates[2].search.fraction).toBe(0.5);
    expect(state.candidates[1]).toBeUndefined();
    const done = mergeActionProgress(state, {candidateIndex: 0, candidateIndices: [0, 2], phase: 'slot_complete',
        slotsCompleted: 2});
    expect(done.slotsCompleted).toBe(2);
    const rendered = stages(done);
    expect(rendered.slots.segments.map(segment => segment.width)).toEqual(['100%', '0%', '100%']);
});
