import React from 'react';
import "../../../css/Components/ResistanceBlock.css"

import { Feature } from '../../classes/Feature';
import { Stats } from '../../classes/Stats';
import { GroupBox } from './Inputs/GroupBox';

const ELEMENTS = ['phys', 'anemo', 'geo', 'dendro', 'pyro', 'hydro', 'cryo', 'electro'];

/**
 * Total resistance and damage multiplier per element, as a grid of cells:
 * four per row, two where the block is narrow. `stats` are the enemy's
 * processed stats (enemy_res_pyro: 0.1 for 10%), its total RES; `settings`
 * are its settings (immunities).
 */
export function ResistanceBlock(props) {
    return (
        <GroupBox addClass="resistance-block multiplier" title={props.title}>
            <div className="resistance-grid">
                {ELEMENTS.map((element) => (
                    <ResistanceBlockItem key={element} element={element} settings={props.settings} stats={props.stats} />
                ))}
            </div>
        </GroupBox>
    );
}

export function ResistanceBlockMini(props) {
    return (
        <div className="resistance-block mini">
            <div className="row">
                <ResistanceBlockMiniItem element="phys" settings={props.settings} stats={props.stats} />
                <ResistanceBlockMiniItem element="anemo" settings={props.settings} stats={props.stats} />
                <ResistanceBlockMiniItem element="geo" settings={props.settings} stats={props.stats} />
                <ResistanceBlockMiniItem element="dendro" settings={props.settings} stats={props.stats} />
            </div>
            <div className="row">
                <ResistanceBlockMiniItem element="pyro" settings={props.settings} stats={props.stats} />
                <ResistanceBlockMiniItem element="hydro" settings={props.settings} stats={props.stats} />
                <ResistanceBlockMiniItem element="cryo" settings={props.settings} stats={props.stats} />
                <ResistanceBlockMiniItem element="electro" settings={props.settings} stats={props.stats} />
            </div>
        </div>
    );
}

function ResistanceBlockItem(props) {
    let name = 'enemy_res_' + props.element;

    let stats = new Stats();
    stats.add(name, (props.stats[name] || 0) * 100);
    let feature = new Feature({element: props.element});
    let multiplier = feature.resistanceMultiplier(stats, props.settings);

    let addClass = '';
    let isImmune = false;

    let value = stats.get(name);

    if (multiplier == 0) {
        addClass = 'green';
        isImmune = true;
    } else if (value > 10) {
        addClass = 'green';
    } else if (value < 10) {
        addClass = 'red';
    }

    // A resistance of zero is a value to show, not an empty stat.
    value = Math.abs(value) < 0.00001 ? '0%' : Stats.format('text_percent', value, {no_decimal_zero: true});
    multiplier = Stats.format('text_decimal', multiplier, {decimal_digits: 3, no_decimal_zero: 1});

    return (
        <div className="resistance-cell">
            <div className={'icon gi-stat-element-icon stat-'+ props.element} />
            {isImmune ? <span className={'value ' + addClass}>∞</span> : <>
                <span className={'value ' + addClass}>{value}</span>
                <span className="multi">×{multiplier}</span>
            </>}
        </div>
    );
}

function ResistanceBlockMiniItem(props) {
    let name = 'enemy_res_' + props.element;

    let stats = new Stats();
    stats.add(name, (props.stats[name] || 0) * 100);
    let feature = new Feature({element: props.element});
    let multiplier = feature.resistanceMultiplier(stats, props.settings);

    let addClass = '';
    let isImmune = false;

    let value = stats.get(name);

    if (multiplier == 0) {
        addClass = 'green';
        isImmune = true;
    } else if (value > 10) {
        addClass = 'green';
    } else if (value < 10) {
        addClass = 'red';
    }

    multiplier = Stats.format('text_decimal', multiplier, {decimal_digits: 3, no_decimal_zero: 1});

    return (
        <>
            <div className={'icon gi-stat-element-icon stat-'+ props.element} />
            <div className="text">
                {isImmune ? <span className={addClass}>∞</span>
                    : <span className={addClass}>{value}%</span>
                }
            </div>
        </>
    );
}


