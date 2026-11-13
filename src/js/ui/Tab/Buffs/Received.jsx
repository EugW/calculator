import React from "react";

import { Stats, isPercent } from "../../../classes/Stats";
import { CharIcon } from "../../Components/Icons";
import { Lang } from "../../Lang";

let lang = new Lang();

/**
 * Read-only: what each teammate changes on the viewed member's stats, see
 * teammateContributions.
 *
 * @param {{items: Array.<{member: CalcSet, stats: Stats}>}} props
 */
export function Received(props) {
    return (
        <div className="buffs-received">
            <div className="buffs-received-descr">{lang.get('team.received_descr')}</div>
            {props.items.map(({member, legacy, stats}) => {
                // The legacy source's entries together have no character.
                let char = legacy ? null : member.char.object;
                let rows = Object.keys(stats)
                    .filter((stat) => hasTitle(stat) && Stats.format(stat, displayValue(stat, stats)) !== '')
                    .sort()
                    .map((stat) => {
                        let value = displayValue(stat, stats);
                        return (
                            <div className="buffs-received-row" key={stat}>
                                <span className="buffs-received-stat">{lang.get('stat.' + stat)}</span>
                                <span className={'buffs-received-value' + (value < 0 ? ' negative' : '')}>
                                    {(value > 0 ? '+' : '') + Stats.format(stat, value)}
                                </span>
                            </div>
                        );
                    });

                return (
                    <div className="buffs-received-member" key={char ? char.getId() : 'legacy'}>
                        <div className="buffs-received-header">
                            {char ? <CharIcon size={40} char={char} /> : null}
                            <span>{char ? lang.get(char.getName()) : lang.get('legacy.title')}</span>
                        </div>
                        {rows.length ? rows : <div className="buffs-received-none">{lang.get('team.received_none')}</div>}
                    </div>
                );
            })}
        </div>
    );
}

/** Only stats with a name are shown; the others are internal. */
function hasTitle(stat) {
    return lang.get('stat.' + stat) != 'stat.' + stat;
}

/** Final stats hold percents as fractions; Stats.format takes percents. */
function displayValue(stat, stats) {
    let value = stats.get(stat);
    return isPercent(stat) ? value * 100 : value;
}
