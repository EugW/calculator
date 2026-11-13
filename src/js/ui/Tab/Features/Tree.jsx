import React, { useState } from "react";

import "../../../../css/Components/Tab/Feature/Tree.css";

import { Lang } from "../../Lang";
import { Stats, isPercent } from "../../../classes/Stats";
import { FeatureCompiler } from "../../../classes/Feature2/Compiler";
import { CConst } from "../../../classes/Feature2/Compile/Types/Item";
import { CSum } from "../../../classes/Feature2/Compile/Types/Block";
import { CONTRIBUTION_WEIGHTS } from "../../../classes/Feature2/Compile/Types/Damage";
import { enemyStatName, enemyStatOf } from "../../../classes/Team/EnemyStats";

const ROOT_TYPES = {
    'base_damage': LeafRoot,
    'flat_damage': LeafRoot,
    'flat_reduce': LeafRoot,
    'multiplier_bonus': LeafRootSum,
    'multiplier_defence': LeafRoot,
    'multiplier_resistance': LeafRoot,
    'multiplier_amplifying': LeafRoot,
    'multiplier_reaction': LeafRoot,
    'multiplier_custom': LeafRoot,
    'damage_result': LeafResult,
    'heal_result': LeafResult,
    'shield_result': LeafResult,
    'reaction_base': LeafRoot,
    'block_multi': LeafRootMulti,
    'block_subtract': LeafRootSubtract,
    'block_sum_plus': LeafRootSum,
    'block_crit_dmg': LeafRootSum,
    'block_sum': LeafRootSum,
};

const INLINE_TYPES = {
    'item_const': LeafInlineConst,
    'item_stat': LeafInlineConst,
    'block_multi': LeafMulti,
    'block_sum': LeafSum,
    'block_sum_plus': LeafSumPlus,
    'block_subtract': LeafSubtract,
    'block_divide': LeafDivide,
    'resistance_value': LeafSum,
    'base_damage': LeafSum,
    'flat_damage': LeafSum,
    'flat_reduce': LeafSum,
    'multiplier_reaction': LeafSum,
    'multiplier_resistance': LeafSum,
    'multiplier_bonus': LeafSumPlus,
    'multiplier_defence': LeafSum,
    'multiplier_amplifying': LeafSum,
    'multiplier_custom': LeafSum,
    'reaction_base': LeafMulti,
    'reaction_base_bonus': LeafSum,
    'value_cap': LeafValueCap,
    'number_floor': LeftFloor,
    'block_min': LeafMin,
    'block_max': LeafMax,
};

let lang = new Lang();

function blockTitle(tree, title) {
    if (tree.comment) {
        return lang.any(
            'features_view.block_'+ tree.comment,
            'features_view.block_'+ title,
        );
    }

    return lang.get('features_view.block_'+ title);
}

export class FeatureViewTree extends React.Component {
    render() {
        let buildData = this.props.build.getBuildData();

        if (this.props.reaction) {
            buildData.settings.reaction = this.props.reaction;
        }

        buildData.applyPostEffects();

        let feature = this.props.feature;
        let result = feature.getResult(buildData.clone())[feature.getName()];
        let tree = feature.getTree(buildData);
        let element = this.props.feature.getElement(buildData);
        let compiler = new FeatureCompiler(tree, buildData.postItems);
        buildData.stats.ensure(compiler.usedStats);
        buildData.stats.ensure(compiler.assignedStats);

        let staticStats = [];
        for (let stat of compiler.usedStats) {
            if ([enemyStatName('enemy_def_reduce'), 'def_ignore'].includes(stat)) {
                continue;
            }
            if (!buildData.stats.get(stat) && !buildData.stats.get(stat +'_base')) {
                staticStats.push(stat);
            }
        }

        let processOpts = {
            dontInsertVariables: true,
            dontProcessStaticValues: true,
            staticStats: staticStats,
            processResistance: true,
            resistanceValue: buildData.getResistance(element),
        };

        let process = (item) => compiler.processBlock(item, processOpts);
        let items;
        let hasCrit;
        if (tree.getType() == 'damage_contribution_result') {
            // A reaction the team deals together: the ranking, then every
            // contributor's own formula.
            let parts = tree.items.map((part) => contributionPart(part, buildData, this.props.build));
            items = [<ContributionRanking key="ranking" parts={parts} />];
            parts.forEach((part, index) => {
                items.push(<ContributionTitle key={'part' + index} part={part} />);
                items = items.concat(damageItems(part.tree, part.data, process, false, 'part' + index + '.'));
            });
            hasCrit = true;
        } else {
            hasCrit = !!tree.critDmg && !result?.noCritValues;
            items = damageItems(tree, buildData, process, !!result?.noCritValues, '');
        }

        return (
            <div className="feature-detail-tree">
                <FeatureResults result={result} hasCrit={hasCrit} />
                {items}
            </div>
        );
    }
}

/**
 * The blocks of a damage tree: its result, its factors, its CRIT Rate and
 * CRIT DMG.
 *
 * @param {CBlock} tree
 * @param {BuildData} data
 * @param {function(CBlock)} process prepares a block for showing
 * @param {boolean} noCrit whether the result has no CRIT values (heals, shields)
 * @param {string} prefix of the blocks' keys
 * @returns {Array}
 */
function damageItems(tree, data, process, noCrit, prefix) {
    let items = [];
    for (let item of ungroupTree(tree.items)) {
        let type = item.getType();
        let leaf = ROOT_TYPES[type];
        if (!leaf) {
            console.log('unknown root type '+ type);
            continue;
        }

        process(item);

        items.push(React.createElement(leaf, {
            key: prefix + 'item'+ (items.length),
            tree: item,
            data: data,
            title: type,
        }));
    }

    let type = tree.getType();
    let leaf = ROOT_TYPES[type];
    if (leaf) {
        items.unshift(React.createElement(leaf, {
            key: prefix + 'base',
            tree: tree,
            data: data,
            title: type,
        }));
    } else {
        console.log('unknown root type '+ type);
    }

    // Normal, average and crit are shown together: CRIT Rate and CRIT DMG are always inputs.
    for (let [name, block] of [['crit_rate', tree.critRate], ['crit_dmg', tree.critDmg]]) {
        if (!block || noCrit) continue;
        process(block);
        let critLeaf = ROOT_TYPES[block.getType()];
        if (critLeaf) {
            items.push(React.createElement(critLeaf, {
                key: prefix + name,
                tree: block,
                data: data,
                title: name,
            }));
        }
    }

    return items;
}

/**
 * One contributor of a reaction the team deals together: its tree, its
 * member and what it would deal alone.
 *
 * @param {CDamage} tree the contributor's tree (CDamageContribution's item)
 * @param {BuildData} data the viewed member's final data
 * @param {MemberView} view the viewed member
 * @returns {{tree: CDamage, data: Object, name: string, normal: number, crit: number, rate: number}}
 */
function contributionPart(tree, data, view) {
    let compiler = new FeatureCompiler(tree);
    let opts = {dontProcessTree: true, dontProcessStaticValues: true};
    compiler.prepare({}, opts);
    compiler.compile(opts);
    data.stats.ensure(compiler.usedStats);
    let [normal, crit, average] = compiler.execute(data);

    // A teammate's tree holds the stats it was built with, before the
    // program's post-effects: show the final ones, as the viewed member's are.
    tree.walk((item) => {
        let type = item.getType();
        if (type == 'item_stat') {
            item.value = data.stats.get(item.stat);
        } else if (type == 'item_stat_total') {
            item.baseBalue = data.stats.get(item.statBaseName());
            item.percentValue = data.stats.get(item.statPercentName());
            item.flatValue = data.stats.get(item.statFlatName());
            item.value = item.baseBalue * (1 + item.percentValue) + item.flatValue;
        }
    });

    let member = tree.slot === undefined ? view.member : view.member.team.getMember(tree.slot);
    return {
        tree,
        // The program's stats, read with the contributor's own level (the
        // reaction's base value is named after it).
        data: {stats: data.stats, settings: {char_level: member.char.getLevels().level}},
        name: lang.get(member.char.get().getName()),
        normal,
        crit,
        rate: crit > normal ? (average - normal) / (crit - normal) : 0,
    };
}

/**
 * How the contributions are ranked, shown without CRIT: 60% of the highest,
 * 30% of the second, 5% of each of the rest. The results above rank them
 * after every contributor's CRIT roll.
 */
function ContributionRanking(props) {
    let sorted = [...props.parts].sort((a, b) => b.normal - a.normal);
    let weight = (index) => CONTRIBUTION_WEIGHTS[Math.min(index, CONTRIBUTION_WEIGHTS.length - 1)];

    let items = [];
    sorted.forEach((part, index) => {
        if (index) {
            items.push(<span className="op" key={'plus' + index}>+</span>);
        }
        items.push(
            <div key={'weight' + index} className="feature-detail-block const">
                <div className="stat-value">{Stats.format('text_percent', weight(index) * 100, {no_decimal_zero: true})}</div>
            </div>
        );
        items.push(<span className="op" key={'times' + index}>*</span>);
        items.push(
            <div key={'value' + index} className="feature-detail-block const">
                <div className="stat-value">{Stats.format('atk', part.normal, {zero: true})}</div>
                <div className="stat-name">{part.name}</div>
            </div>
        );
    });
    if (sorted.length) {
        let total = sorted.reduce((sum, part, index) => sum + part.normal * weight(index), 0);
        items.push(<div key="equals" className="feature-detail-block operator">=</div>);
        items.push(
            <div key="total" className="feature-detail-block const">
                <div className="stat-value">{Stats.format('atk', total, {zero: true})}</div>
            </div>
        );
    }

    return (
        <div className="block">
            <div className="line">
                <span className="block-name">{lang.get('features_view.block_damage_contribution_result')}</span>
            </div>
            <div className="line">{items}</div>
            <div className="note">{lang.get('features_view.contribution_ranking')}</div>
        </div>
    );
}

/**
 * Heads a contributor's formula: its member, and what it would deal alone
 * without and with a CRIT, at its own CRIT Rate.
 */
function ContributionTitle(props) {
    let part = props.part;
    let damage = (value) => Stats.format('atk', value, {zero: true});

    return (
        <div className="block">
            <div className="line">
                <span className="block-name">{part.name}: {lang.get('features_view.comment_reaction_contribution')}</span>
                <span className="block-value">
                    {damage(part.normal)} / {damage(part.crit)}, {lang.get('features_view.block_crit_rate')} {Stats.format('text_percent', part.rate * 100, {decimal_digits: 1, no_decimal_zero: true, zero: true})}
                </span>
            </div>
        </div>
    );
}

/**
 * The feature's result: normal, average and crit together (one value for heals and shields).
 */
function FeatureResults(props) {
    let result = props.result;
    if (!result) {
        return '';
    }

    let values = props.hasCrit
        ? [['normal', result.normal], ['average', result.average], ['crit', result.crit]]
        : [['value', result.normal]];

    return (
        <div className="block results">
            <div className="line">
                {values.map(([name, value]) => (
                    <div key={name} className="feature-detail-block const result">
                        <div className="stat-value">{Stats.format('atk', value, {zero: true})}</div>
                        <div className="stat-name">{lang.get('features_view.graph_result_' + name)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function LeafRoot(props) {
    let isPercent = false;
    let type = props.tree.getType();

    if (/^multiplier_/.test(type)) {
        isPercent = true;
    }

    return (
        <div className="block">
            <div className="line">
                <span className="block-name">{blockTitle(props.tree, props.title)}</span>
                <span className="block-value"><TreeValue tree={props.tree} data={props.data} percent={isPercent} /></span>
            </div>
            <LeafRootItems {...props} base={true} />
        </div>
    );
}

function LeafRootMulti(props) {
    return (
        <div className="block">
            <div className="line">
                <span className="block-name">{blockTitle(props.tree, props.title)}</span>
                <span className="block-value"><TreeValue tree={props.tree} data={props.data} percent={isPercent} /></span>
            </div>
            <div className="line">
                <LeafMulti tree={props.tree} data={props.data} collapsable={false} />
            </div>
        </div>
    );
}

function LeafRootSum(props) {
    let tree;
    let type = props.tree.getType();

    if (type == 'multiplier_bonus' || type == 'multiplier_reaction' || type == 'block_sum_plus') {
        tree = new CSum([
            new CConst({value: 1, comment: 'base_bonus', percent: true}),
            ...props.tree.items
        ], {percent: true});
    } else {
        tree = props.tree;
    }

    return (
        <div className="block">
            <div className="line">
                <span className="block-name">{blockTitle(props.tree, props.title)}</span>
                <span className="block-value"><TreeValue tree={props.tree} data={props.data} percent={isPercent} /></span>
            </div>
            <div className="line">
                <LeafSum tree={tree} data={props.data} collapsable={false} hideZero={true} />
            </div>
        </div>
    );
}

function LeafRootSubtract(props) {
    return (
        <div className="block">
            <div className="line">
                <span className="block-name">{blockTitle(props.tree, props.title)}</span>
                <span className="block-value"><TreeValue tree={props.tree} data={props.data} percent={isPercent} /></span>
            </div>
            <div className="line">
                <LeafSubtract tree={props.tree} data={props.data} collapsable={false} />
            </div>
        </div>
    );
}

function LeafResult(props) {
    return (
        <div className="block">
            <div className="line">
                <span className="block-name">{blockTitle(props.tree, props.title)}</span>
                {/* <span className="block-value"><TreeValue tree={props.tree} data={props.data} percent={props.percent} /></span> */}
            </div>
            <div className="line">
                <LeafMulti tree={props.tree} data={props.data} onlyResult={true} />
            </div>
        </div>
    );
}

function LeafRootItems(props) {
    if (!props.tree.items) {
        return '';
    }

    let items = [];
    let type = props.tree.getType();

    if (type == 'multiplier_bonus' || type == 'multiplier_reaction') {
        let leaf = INLINE_TYPES['item_const'];
        let leafItem = React.createElement(leaf, {
            tree: new CConst({value: 1, comment: 'base_bonus', percent: true}),
            data: props.data,
            collapsable: false,
        });

        items.push(<div className="line" key={'item'+ items.length}>{leafItem}</div>);
    }

    for (let item of props.tree.items) {
        let leaf = INLINE_TYPES[item.getType()];
        if (!leaf) {
            console.log('unknown line type '+ item.getType());
            continue;
        }

        let leafItem = React.createElement(leaf, {
            tree: item,
            data: props.data,
            collapsable: false,
        });

        items.push(<div className="line" key={'item'+ items.length}>{leafItem}</div>);
    }

    return items;
}

class LeafMathOp extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            collapsed: !this.props.onlyResult,
        };
    }

    getItems() {
        let items = [];

        for (let item of this.props.tree.items) {
            // while (Array.isArray(item.items) && item.items.length == 1) {
            //     item = item.items[0];
            // }

            let itemType = item.getType();

            if (this.props.hideZero && itemType == 'item_const' && !item.value) {
                continue;
            }

            let leaf = INLINE_TYPES[itemType];
            if (!leaf) {
                console.log('unknown inline type '+ itemType);
                items.push(
                    <div key={'item'+ items.length} className="feature-detail-block const">
                        <div className="stat-value">?</div>
                    </div>
                );
                continue;
            }

            if (this.props.tree.items.length == 1) {
                items.push(
                    React.createElement(leaf, {
                        tree: item,
                        data: this.props.data,
                        key: 'item'+ items.length,
                        collapsable: this.props.collapsable,
                        onlyResult: this.props.onlyResult,
                    })
                );

                continue;
            }

            if (items.length > 0) {
                items.push(
                    <span className="op" key={'item'+ items.length}>{this.props.operator}</span>
                );
            }

            if (this.props.onlyResult && !item.group) {
                items.push(
                    <div key={'item'+ items.length} className="feature-detail-block const">
                        <div className="stat-value"><TreeValue tree={item} data={this.props.data} /></div>
                    </div>
                );
            } else {
                items.push(
                    React.createElement(leaf, {
                        tree: item,
                        data: this.props.data,
                        key: 'item'+ items.length,
                        collapsable: true,
                        onlyResult: this.props.onlyResult,
                    })
                );
            }
        }

        return items;
    }

    render() {
        if (this.props.collapsable) {
            if (this.state.collapsed) {
                let comment = this.props.tree.comment ? langStat(this.props.tree.comment, this.props.data) : '';
                return (
                    <div className="feature-detail-block multi collapsed" onClick={() => {this.setState({collapsed: false}); return false;}}>
                        <div className="feature-detail-block const">
                            <div className="stat-value"><TreeValue tree={this.props.tree} data={this.props.data} /></div>
                            {comment ? <div className="stat-name">{comment}</div> : ''}
                        </div>
                    </div>
                );
            } else {
                return <>
                    <div className="l-bracket" onClick={() => {this.setState({collapsed: true}); return false; }} />
                    {this.getItems()}
                    <div className="r-bracket" onClick={() => {this.setState({collapsed: true}); return false; }} />
                </>;
            }
        }

        let items = this.getItems();
        if (items.length > 1) {
            items.push(<div key={'item'+ items.length} className="feature-detail-block operator">=</div>);
            items.push(
                <div key={'item'+ items.length} className="feature-detail-block const">
                    <div className="stat-value"><TreeValue tree={this.props.tree} data={this.props.data} /></div>
                </div>
            );
        }

        return items;
    }
}

function LeafMulti(props) {
    return <LeafMathOp {...props} operator="*" />;
}

function LeafSum(props) {
    return <LeafMathOp {...props} operator="+" />;
}

function LeafSumPlus(props) {
    return <LeafMathOp
        operator="+"
        tree={new CSum([new CConst({value: 1}), ...props.tree.items])}
        data={props.data}
        collapsable={props.collapsable}
        onlyResult={props.onlyResult}
    />;
}

function LeafSubtract(props) {
    return <LeafMathOp {...props} operator="-" />;
}

function LeafMathFunc(props) {
    return <>
        <div className="feature-detail-block op">{props.func}</div>
        <LeafSum
            tree={props.tree.items[0]}
            data={props.data}
            collapsable={props.collapsable}
            onlyResult={props.onlyResult}
        />
    </>;
}

function LeftFloor(props) {
    return <LeafMathFunc {...props} func="Floor" />;
}

function LeafValueCap(props) {
    const [collapsed, setCollapsed] = useState(!props.onlyResult);

    let itemType = props.tree.items[0].getType();
    let leaf = INLINE_TYPES[itemType];
    if (!leaf) {
        console.log('unknown line type '+ itemType);
        return '';
    }

    let leafItem = React.createElement(leaf, {
        tree: props.tree.items[0],
        data: props.data,
        collapsable: true,
        onlyResult: props.onlyResult,
    });

    let item = <>
        <div className="feature-detail-block cap op" onClick={() => {setCollapsed(true); return false;}}>Min</div>
        <div className="l-bracket" />
        {leafItem}
        <span className="op">,</span>
        <LeafSum tree={new CSum([props.tree.value])} data={props.data} />
        <div className="r-bracket" />
    </>;

    if (props.collapsable) {
        if (collapsed) {
            return (
                <div className="feature-detail-block cap collapsed" onClick={() => {setCollapsed(false); return false;}}>
                    <div className="feature-detail-block const">
                        <div className="stat-value"><TreeValue tree={props.tree} data={props.data} /></div>
                    </div>
                </div>
            );
        } else {
            return item;
        }
    } else {
        return <>
            {item}
            <span className="op">=</span>
            <div className="feature-detail-block const">
                <div className="stat-value"><TreeValue tree={props.tree} data={props.data} /></div>
            </div>
        </>;
    }
}

function LeafMin(props) {
    const [collapsed, setCollapsed] = useState(!props.onlyResult);

    let items = [];
    for (let i = 0; i < props.tree.items.length; i++) {
        let item = props.tree.items[i];
        let leaf = INLINE_TYPES[item.getType()];
        if (!leaf) {
            console.log('unknown line type '+ item.getType());
            continue;
        }

        let leafItem = React.createElement(leaf, {
            tree: item,
            data: props.data,
            collapsable: true,
            onlyResult: props.onlyResult,
        });

        if (items.length > 0) {
            items.push(<span className="op" key={'comma'+items.length}>,</span>);
        }
        items.push(<React.Fragment key={'item'+items.length}>{leafItem}</React.Fragment>);
    }

    let item = <>
        <div className="feature-detail-block cap op" onClick={() => {setCollapsed(true); return false;}}>Min</div>
        <div className="l-bracket" />
        {items}
        <div className="r-bracket" />
    </>;

    if (props.collapsable) {
        if (collapsed) {
            return (
                <div className="feature-detail-block cap collapsed" onClick={() => {setCollapsed(false); return false;}}>
                    <div className="feature-detail-block const">
                        <div className="stat-value"><TreeValue tree={props.tree} data={props.data} /></div>
                    </div>
                </div>
            );
        } else {
            return item;
        }
    } else {
        return <>
            {item}
            <span className="op">=</span>
            <div className="feature-detail-block const">
                <div className="stat-value"><TreeValue tree={props.tree} data={props.data} /></div>
            </div>
        </>;
    }
}

function LeafMax(props) {
    const [collapsed, setCollapsed] = useState(!props.onlyResult);

    let items = [];
    for (let i = 0; i < props.tree.items.length; i++) {
        let item = props.tree.items[i];
        let leaf = INLINE_TYPES[item.getType()];
        if (!leaf) {
            console.log('unknown line type '+ item.getType());
            continue;
        }

        let leafItem = React.createElement(leaf, {
            tree: item,
            data: props.data,
            collapsable: true,
            onlyResult: props.onlyResult,
        });

        if (items.length > 0) {
            items.push(<span className="op" key={'comma'+items.length}>,</span>);
        }
        items.push(<React.Fragment key={'item'+items.length}>{leafItem}</React.Fragment>);
    }

    let item = <>
        <div className="feature-detail-block cap op" onClick={() => {setCollapsed(true); return false;}}>Max</div>
        <div className="l-bracket" />
        {items}
        <div className="r-bracket" />
    </>;

    if (props.collapsable) {
        if (collapsed) {
            return (
                <div className="feature-detail-block cap collapsed" onClick={() => {setCollapsed(false); return false;}}>
                    <div className="feature-detail-block const">
                        <div className="stat-value"><TreeValue tree={props.tree} data={props.data} /></div>
                    </div>
                </div>
            );
        } else {
            return item;
        }
    } else {
        return <>
            {item}
            <span className="op">=</span>
            <div className="feature-detail-block const">
                <div className="stat-value"><TreeValue tree={props.tree} data={props.data} /></div>
            </div>
        </>;
    }
}

function LeafDivide(props) {
    let items = [];

    const [collapsed, setCollapsed] = useState(!props.onlyResult);

    for (let item of props.tree.items) {
        let leaf = INLINE_TYPES[item.getType()];
        if (!leaf) {
            console.log('unknown line type '+ item.getType());
            continue;
        }

        let leafItem = React.createElement(leaf, {
            tree: item,
            data: props.data,
            collapsable: true,
        });

        if (items.length > 0) {
            items.push(
                <div className="separator" key={'sep'+ items.length} onClick={() => {setCollapsed(true); return false; }} />
            );
        }

        items.push(<div key={'item'+ items.length} className="feature-detail-block divide-line">{leafItem}</div>);
    }

    if (props.collapsable) {
        if (collapsed) {
            return (
                <div className="feature-detail-block multi collapsed" onClick={() => {setCollapsed(false); return false;}}>
                    <div className="feature-detail-block const">
                        <div className="stat-value"><TreeValue tree={props.tree} data={props.data} /></div>
                    </div>
                </div>
            );
        } else {
            return <div className="feature-detail-block divide">{items}</div>;
        }
    }

    return (
        <>
            <div className="feature-detail-block divide">{items}</div>
            <div className="feature-detail-block operator">=</div>
            <div className="feature-detail-block const">
                <div className="stat-value"><TreeValue tree={props.tree} data={props.data} /></div>
            </div>
        </>
    );
}

function LeafInlineConst(props) {
    let comment;
    let value;
    let digits = props.tree.digits || 2;

    if (props.tree.stat) {
        comment = langStat(props.tree.stat, props.data);
        // A teammate's stat (m2__crit_rate) is the stat.
        if (isPercent(props.tree.stat.replace(/^m\d+__/, ''))) {
            value = Stats.format('text_percent', props.tree.value * 100, {decimal_digits: digits, no_decimal_zero: true});
        }
    } else if (props.tree.comment) {
        comment = langStat(props.tree.comment, props.data);
        if (props.tree.percent) {
            value = Stats.format('text_percent', props.tree.value * 100, {decimal_digits: digits, no_decimal_zero: true});
        }
    }

    value ||= Stats.format('value_decimal', props.tree.value, {decimal_digits: digits, no_decimal_zero: true}) || 0;

    if (!value && !props.collapsable) {
        return '';
    }

    return (
        <div className="feature-detail-block const">
            <div className="stat-value">{value}</div>
            {comment ? <div className="stat-name">{comment}</div> : ''}
        </div>
    );
}

function TreeValue(props) {
    let percent;
    let value;

    if (props.tree.makeResult) {
        let compiler = new FeatureCompiler(props.tree);
        let opts = {dontProcessTree: true, dontProcessStaticValues: true};
        compiler.prepare({}, opts);
        compiler.compile(opts);

        props.data.stats.ensure(Object.keys(compiler.usedStats));
        value = compiler.execute(props.data);
    } else {
        value = props.tree.value;
    }

    if (props.percent || props.tree.percent || /^multiplier_/.test(props.tree.getType())) {
        percent = 1;
    }

    if (Array.isArray(value)) {
        value = value[0];
    }

    let stat = 'value_decimal';
    if (percent) {
        value *= 100;
        stat = 'value_percent';
    }

    value ||= 0;

    return Stats.format(stat, value, {decimal_digits: props.tree.digits || 2, no_decimal_zero: true, zero: true});
}

function langStat(name, data) {
    // A teammate's stat reads as the stat (m2__atk: ATK).
    name = (enemyStatOf(name) || name).replace(/^m\d+__/, '').replace('enemy_res', 'res');

    let result = lang.any(
        'features_view.stat_' + name,
        'stat_short.' + name,
        'stat.' + name,
        'char_name.' + name,
        'features_view.comment_' + name,
        'features_view.stat_' + name,
    );

    if (name == 'reaction_base') {
        result = data.settings.char_level +' '+ result;
    }

    return result;
}

function ungroupTree(items) {
    let result = [];

    for (let item of items) {
        if (item.group) {
            result = result.concat(ungroupTree(item.items));
        } else {
            result.push(item);
        }
    }

    return result;
}
