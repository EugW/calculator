import React from 'react';

import { ArtifactSetIcon, CharIcon, WeaponIcon } from '../Icons';
import { t } from './Labels';

/**
 * Node components of the damage graph. They only draw what Display prepared
 * in `data`; clicks on their buttons call its handlers. Dots with
 * `data-anchor` are where edges end (a row) and start (`out`): FeatureGraph
 * measures them.
 */

function Toggle(props) {
    return (
        <button
            className="dg-toggle"
            aria-pressed={props.on}
            onClick={(event) => {
                event.stopPropagation();
                props.onToggle();
            }}
        >
            {props.on ? t('graph_on') : t('graph_off')}
        </button>
    );
}

function Impact(props) {
    if (!props.impact) return null;
    return <span className={'dg-impact ' + props.impact.cls} title={props.impact.title}>{props.impact.text}</span>;
}

function Rows(props) {
    return (
        <div className="dg-rows">
            {props.rows.map((row) => (
                <div key={row.id} className={'dg-row' + (row.dim ? ' dim' : '') + (row.off ? ' off' : '') + (row.base ? ' base' : '')} style={row.color ? {'--row': row.color} : null}>
                    {row.handle ? <span className="dg-in" data-anchor={row.id} /> : null}
                    <span className="dg-row-name">{row.label}</span>
                    <span className="dg-row-value">{row.value}</span>
                </div>
            ))}
        </div>
    );
}

function Out() {
    return <span className="dg-out" data-anchor="out" />;
}

export function SourceNode({data}) {
    return (
        <div className={data.className} style={{'--lane': data.color}}>
            <div className="dg-head">
                {data.tag ? <span className="dg-tag">{data.tag}</span> : null}
                <span className="dg-title">{data.title}</span>
                {data.toggle ? <Toggle on={data.toggle.on} onToggle={data.toggle.onToggle} /> : null}
            </div>
            {data.subtitle ? <div className="dg-sub">{data.subtitle}</div> : null}
            <div className="dg-chips">
                {data.chips.map((chip, index) => <span key={index} className="dg-chip">{chip}</span>)}
                <Impact impact={data.impact} />
            </div>
            <Out />
        </div>
    );
}

export function ValueNode({data}) {
    return (
        <div className={data.className} style={{'--lane': data.color}}>
            <div className="dg-head">
                {data.tag ? <span className="dg-tag">{data.tag}</span> : null}
                <span className="dg-title">{data.title}</span>
                <span className="dg-value">{data.value}</span>
                {data.toggle ? <Toggle on={data.toggle.on} onToggle={data.toggle.onToggle} /> : null}
            </div>
            {data.formula ? <div className="dg-formula">{data.formula}</div> : null}
            <Rows rows={data.rows} />
            {data.impact ? <div className="dg-chips"><Impact impact={data.impact} /></div> : null}
            <Out />
        </div>
    );
}

/**
 * The result of a reaction the team deals together (Display's ranking): a
 * contributor per row, with its input dot when in a node; the results in
 * columns, each cell the contributor's weight over what it adds; then the
 * results themselves.
 */
export function RankingTable({data, handles}) {
    return (
        <div className="dg-rows dg-ranking-table">
            <div className="dg-row base dg-ranking-row head">
                <span />
                {data.columns.map((text, index) => <span key={index} className="dg-ranking-cell">{text}</span>)}
            </div>
            {data.rows.map((row) => (
                <div key={row.id} className={'dg-row dg-ranking-row' + (row.dim ? ' dim' : '')} style={{'--row': row.color}}>
                    {handles ? <span className="dg-in" data-anchor={row.id} /> : null}
                    <span className="dg-row-name">{row.label}</span>
                    {row.cells.map((cell, index) => (
                        <span key={index} className="dg-ranking-cell">
                            <span className="dg-ranking-weight">{cell.weight}</span>
                            <span>{cell.value}</span>
                        </span>
                    ))}
                </div>
            ))}
            <div className="dg-row base dg-ranking-row total">
                <span className="dg-row-name">{data.totalLabel}</span>
                {data.totals.map((item) => (
                    <span key={item.name} className="dg-ranking-cell">
                        <span>{item.value}</span>
                        {item.delta ? <span className={'dg-delta ' + item.delta.cls}>{item.delta.text}</span> : null}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function ResultNode({data}) {
    if (data.ranking) {
        return (
            <div className={data.className}>
                <div className="dg-head">
                    <span className="dg-tag">{t('graph_result')}</span>
                    <span className="dg-title">{data.title}</span>
                </div>
                <RankingTable data={data.ranking} handles={true} />
            </div>
        );
    }

    return (
        <div className={data.className}>
            <div className="dg-head">
                <span className="dg-tag">{t('graph_result')}</span>
                <span className="dg-title">{data.title}</span>
            </div>
            <Rows rows={data.rows} />
            <div className="dg-results">
                {data.results.map((item) => (
                    <div key={item.name} className="dg-result-row">
                        <span className="dg-result-name">{item.label}</span>
                        <span className="dg-result-value">
                            {item.value}
                            {item.delta ? <span className={'dg-delta ' + item.delta.cls}>{item.delta.text}</span> : null}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * What a lane is: its member's character (a virtual character of the legacy
 * source too), a floating weapon or set of the legacy source, or a letter
 * for the team and the enemy.
 */
function LaneIcon({lane, initials}) {
    let source = lane.member;
    if (source?.char) {
        return <CharIcon size={40} char={source.char.object} />;
    }
    if (lane.legacy && source.weapon) {
        return <WeaponIcon size={40} weapon={source.weapon.object} />;
    }
    if (lane.legacy && source.artifacts) {
        return <ArtifactSetIcon size={40} set={source.getSet()} />;
    }
    return <div className="dg-lane-mono">{initials}</div>;
}

export function LaneNode({data}) {
    let lane = data.lane;
    return (
        <div className={'dg-lane' + (data.dim ? ' dim' : '')} style={{'--lane': data.color}}>
            <div className="dg-lane-head">
                <div className="dg-lane-top">
                    <LaneIcon lane={lane} initials={data.initials} />
                    <div className="dg-lane-name">{data.name}</div>
                </div>
                {data.sub ? <div className="dg-lane-sub">{data.sub}</div> : null}
                {data.pills.length ? <div className="dg-pills">{data.pills.map((pill) => <span key={pill} className="dg-pill">{pill}</span>)}</div> : null}
                {data.expand ? (
                    <button className="dg-lane-button" onClick={(event) => { event.stopPropagation(); data.expand.onClick(); }}>
                        {data.expand.text}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

export function BandNode({data}) {
    return <div className="dg-band" style={{'--lane': data.color}} />;
}

export function CaptionNode({data}) {
    return <div className="dg-caption">{data.text}</div>;
}
