import React from "react";
import "../../../css/Components/ProgressBar.css"
import { Stats } from "../../classes/Stats";
import { formatCompactCount } from '../../Utils';

export function ProgressBar(props) {
    let percent = (props.total ? props.count * 100 / props.total : 0).toFixed(1);
    let displayPercent = props.total ? Math.floor(percent) : 0;
    const countText = Stats.format('text_value', props.count) || 0;
    const totalText = Stats.format('text_value', props.total) || 0;

    return (
        <div className={'progress-bar' + (props.addClass ? ' '+ props.addClass : '') + (props.compact ? ' compact' : '')}
            title={props.compact ? `${countText} / ${totalText} (${displayPercent}%)` : undefined}>
            <div className="bar" style={{width: percent +'%'}} />
            <div className="line">
                <div className="value left">{props.compact ? formatCompactCount(props.count) : countText}</div>
                <div className="sep">/</div>
                <div className="value right">{props.compact ? formatCompactCount(props.total) : totalText} ({displayPercent}%)</div>
            </div>
        </div>
    );
}
