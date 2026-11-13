import React from "react";
import parse from 'html-react-parser';

import "../../../css/Components/ConditionList.css"

import { Lang } from "../Lang";
import { Checkbox, NumberInput } from "./Inputs/Input";
import { Dropdown } from "./Inputs/Dropdown";
import { GroupBox } from "./Inputs/GroupBox";
import { deliveredControlNames } from "../../classes/Team/ConditionValues";
import { isLegacySource } from "../../classes/Team/Legacy";
import { Stats } from "../../classes/Stats";

let lang = new Lang();

export class ConditionList extends React.Component {
    render() {
        let items = [];
        let counter = 0;
        // The controls' owner: the viewed member, or the given source (an
        // entry of the team's legacy source).
        let member = this.props.source || this.props.app?.currentSet();
        let deliveries = member && this.props.app ? deliveredControlNames(member) : new Set();

        for (let item of this.props.items) {
            ++counter;
            let key = (item.getName() || 'cond') + counter;

            if (this.props.hideNoDescription) {
                if (!item.getDescription()) {
                    continue;
                }
            }

            if (!this.props.showBeta && item.params.beta) {
                continue;
            }

            items.push(
                <ConditionItem
                    key={key}
                    item={item}
                    settings={this.props.settings || {}}
                    controlSettings={this.props.controlSettings}
                    onlySelectable={this.props.onlySelectable}
                    ignoreSubconditions={this.props.ignoreSubconditions}
                    showHidden={this.props.showHidden}
                    hideControls={this.props.hideControls}
                    onChange={this.props.onChange}
                    noWrap={this.props.noWrap}
                    charId={this.props.charId}
                    app={deliveries.has(item.getName()) ? this.props.app : null}
                    source={member}
                />
            );
        }

        return (
            <div
                className={'condition-list'+ (this.props.addClass ? ' '+ this.props.addClass : '')}
                // data-char={this.props.charId}
            >
                {items}
            </div>
        );
    }
}

function ConditionItem(props) {
    let cond = props.item;
    let type = cond.getType();

    if (!type) {
        return null;
    }

    let subcond = true;
    if (!props.ignoreSubconditions) {
        subcond = cond.checkSubconditions(props.settings);
    }

    if (!subcond && cond.params.hideInactive) {
        return null;
    }

    if (!props.showHidden && cond.isHidden(props.settings)) {
        return null;
    }

    if (type && !subcond) {
        type = 'static';
    }

    if (type == 'static' && props.onlySelectable) {
        return null;
    }

    let stats = cond.getDisplayStats(props.settings);
    let controlSettings = props.controlSettings || props.settings;
    if (!props.controlSettings && props.app) {
        const source = props.source || props.app.currentSet();
        // This is the shared default input, even when the source has a
        // separate value for receiving its own buff.
        controlSettings = Object.assign({}, props.settings, {[cond.getName()]: source.getSettings()[cond.getName()]});
    }
    let separateControlLine = cond.params.separateControlLine && !props.hideControls;
    let control = props.hideControls ? '' : <div className="control">
        <ConditionControl
            item={cond}
            type={type}
            settings={controlSettings}
            onChange={props.onChange}
            subcond={subcond}
        />
    </div>;
    let result = (
        <div
            className="condition-list-item"
            data-char={props.charId}
        >
            <div className="top-line">
                {separateControlLine ? '' : control}
                <div className="title">{cond.getTitle(stats)}</div>
                <ConditionInfo item={cond} />
            </div>
            {separateControlLine ? <div className="top-line condition-control-line">{control}</div> : ''}
            <ConditionDescription item={cond} stats={stats} />
            {props.app && !props.hideControls ? <ConditionReceivers item={cond} app={props.app} source={props.source} /> : null}
        </div>
    );

    if (!props.noWrap) {
        result = <GroupBox>{result}</GroupBox>;
    }

    return result;
}

/**
 * Per-recipient values inherit until the user explicitly overrides them. The
 * source is the viewed member, or an entry of the team's legacy source.
 */
export function ConditionReceivers({item, app, source = app.currentSet()}) {
    const team = app.getTeam();
    // A member's value for itself is its own; an entry delivers to every member.
    if (team.getMembers().length < (isLegacySource(source) ? 1 : 2)) return null;
    const name = item.getName();
    const sourceId = source.getSourceId();
    const evaluation = app.teamView().evaluation();
    return (
        <details className="condition-receivers">
            <summary>{lang.get('team.condition_receivers')}</summary>
            {team.getMembers().map((receiver) => {
                const receiverId = receiver.char.getId();
                const values = team.getConditionValues(sourceId, receiverId);
                const overridden = Object.prototype.hasOwnProperty.call(values, name);
                const settings = evaluation.sourceView(source, evaluation.member(receiver).settings());
                const fallback = source.getSettings()[name] ?? (item.getType().startsWith('dropdown') ? '' : 0);
                return (
                    <div className="condition-receiver" key={receiverId} data-receiver={receiverId}>
                        <div className="condition-receiver-name">{lang.get(receiver.char.object.getName())}</div>
                        <Checkbox
                            title={lang.get('team.condition_override')}
                            checked={overridden}
                            onChange={(checked) => app.setConditionValue(sourceId, receiverId, name, checked ? fallback : null)}
                        />
                        {overridden ? <div className="control">
                            <ConditionControl
                                item={item}
                                type={item.getType()}
                                settings={Object.assign({}, settings, values)}
                                subcond={item.checkSubconditions(settings)}
                                onChange={(key, value) => app.setConditionValue(sourceId, receiverId, key, value)}
                            />
                        </div> : <span className="condition-inherited">{lang.get('team.condition_inherit')}</span>}
                    </div>
                );
            })}
        </details>
    );
}

function ConditionControl(props) {
    let cond = props.item;
    let type = props.type;
    let id = cond.getName();

    if (type == 'checkbox') {
        return (
            <Checkbox
                checked={props.settings[id]}
                onChange={(checked) => props.onChange(id, checked)}
            />
        );
    } else if (type == 'stacks') {
        let items = [];
        let maxValue = cond.getMaxStacks(props.settings);
        let selValue = Math.min(maxValue, props.settings[id]) || '';

        for (let i = 0; i <= maxValue; ++i) {
            let title = ''+ i;

            if (cond.params.titleFunc) {
                let localSettings = Object.assign({}, props.settings, {[cond.getName()]: i});
                let condData = cond.getData(localSettings);

                let titleData = cond.params.titleFunc(i, condData.stats);
                if (typeof titleData == 'object') {
                    title = lang.getTalent(titleData.str, titleData.values);
                } else if (titleData) {
                    title = titleData;
                }
            }

            items.push({
                value: i,
                text: title,
            });
        }

        return (
            <Dropdown
                addClass={cond.params.dropdownClass}
                items={items}
                selected={selValue}
                onChange={(item) => props.onChange(id, item.value)}
            />
        );
    } else if (type == 'number') {
        return (
            <NumberInput
                addClass={'gi-inputs-number-dark '+ (cond.params.class || 'number-default')}
                value={cond.getValue(props.settings)|| ''}
                onChange={(value) => props.onChange(id, value)}
                isDecimal={cond.params.format == 'decimal'}
                nonEmpty={cond.params.nonEmpty}
                showButtons={cond.params.showButtons}
                minValue={cond.getMinValue(props.settings) || ''}
                maxValue={cond.getMaxValue(props.settings) || ''}
                allowMinZero={cond.params.allowMinZero || false}
            />
        );
    } else if (type == 'dropdown' || type == 'dropdown_multiple') {
        let selectedValues = [];
        let items = [];
        selectedValues = cond.getSelectedValues(props.settings);

        if (!cond.params.hideEmpty) {
            items.push({
                value: '',
                text: '-',
            });
        }

        for (let i of cond.getDropdownItems(props.settings)) {
            let title = '';
            if (i.title_str) {
                if (i.title_params) {
                    title = lang.getTalent(i.title_str, new Stats(i.title_params));
                } else {
                    title = lang.get(i.title_str);
                }
            } else if (i.title) {
                title = i.title;
            }

            items.push({
                value: i.value,
                text: title,
                textIcons: i.icon ? [i.icon] : [],
            });
        }

        let limit = cond.getLimit(props.settings);
        let allowSelectNew = true;

        if (limit) {
            if (selectedValues.length >= limit) {
                allowSelectNew = false;
            }
        }

        return (
            <Dropdown
                addClass={cond.params.dropdownClass}
                disableSelectNew={!allowSelectNew}
                items={items}
                selected={selectedValues}
                onChange={(item) => changeDropdownValue(props, id, dropwdownValue(item))}
                isMultiple={type == 'dropdown_multiple'}
            />
        );
    } else if (type == 'static') {
        return <div className={'static '+ (props.subcond ? 'active' : '')} />;
    }

    return (
        <div className="control">{type}</div>
    );
}

function ConditionInfo(props) {
    let info = props.item.getInfo();
    if (!info) {
        return '';
    }

    let text = '';
    if (info.constellation) {
        text = 'C'+ info.constellation;
    } else if (info.ascension) {
        text = 'A'+ info.ascension;
    }

    return (
        <div className="info">{text}</div>
    );
}

function ConditionDescription(props) {
    let icon = '';
    let descr = props.item.getDescription(props.stats);

    if (!descr) {
        return '';
    }

    let condIcon = props.item.params.icon;
    if (condIcon && condIcon.rarity) {
        icon = <DescriptionIcon
            rarity={condIcon.rarity}
            name={condIcon.name}
        />;
    }

    return (
        <div className={'description' + (icon ? ' with-icon' : '')}>{icon}{parse(descr)}</div>
    );
}

function dropwdownValue(item) {
    if (Array.isArray(item)) {
        return item.map((i) => {return i.value;}).join(';');
    } else {
        return item.value;
    }
}

function changeDropdownValue(props, id, value) {
    props.onChange(id, value);

    let linkedSettings = props.item.params.linkedSettings;
    if (!linkedSettings) {
        return;
    }

    for (const item of linkedSettings) {
        let linkedValue = value;
        if (item.limit) {
            linkedValue = linkedValue.split(';').filter((value) => value !== '').slice(0, item.limit).join(';');
        }

        props.onChange(item.name, linkedValue);
    }
}

function DescriptionIcon(props) {
    let className = `item-icon icon-40`;

    if (props.rarity) {
        className += ` border-rarity-${props.rarity}`;
    } else {
        className += ' no-border';
    }

    return (
        <div className={className} onClick={props.onClick}>
            <div className={'sprite sprite-40 '+ props.name}/>
        </div>
    );
}
