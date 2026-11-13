import { bareStat } from "../../../classes/DamageGraph";
import { Stats, isPercent } from "../../../classes/Stats";
import { Lang } from "../../Lang";
import { sourceName } from "../SourceName";

const lang = new Lang();

/**
 * @param {string} key a features_view string
 * @returns {string}
 */
export function t(key) {
    return lang.get('features_view.' + key);
}

/**
 * @returns {string} what a row of sums is called
 */
export function totalLabel() {
    return lang.get('stat_view.total');
}

// ---- numbers

/**
 * @param {number} value
 * @returns {string} as the app shows numbers: whole above 100, spaced thousands
 */
export function formatNumber(value) {
    if (Math.abs(value) >= 100) {
        return minus(Stats.format('atk', value, {zero: true}));
    }
    return minus(Stats.format('value_decimal', value, {decimal_digits: 2, no_decimal_zero: true, zero: true}));
}

/**
 * @param {number} value a fraction (0.48 for 48%)
 * @returns {string}
 */
export function formatPercent(value) {
    let percent = value * 100;
    let digits = Math.abs(percent - Math.round(percent * 10) / 10) > 1e-6 ? 2 : 1;
    return minus(Stats.format('text_percent', percent, {decimal_digits: digits, no_decimal_zero: true, zero: true}));
}

export function formatValue(value, percent) {
    return percent ? formatPercent(value) : formatNumber(value);
}

/**
 * @param {number} value the weight of a contribution (0.6 for 60%); a mean of weights is not round
 * @returns {string}
 */
export function formatWeight(value) {
    return minus(Stats.format('text_percent', value * 100, {decimal_digits: 1, no_decimal_zero: true, zero: true}));
}

function signed(text, value) {
    return value > 0 ? '+' + text : text;
}

function minus(text) {
    return String(text).replace(/^-/, '−');
}

/**
 * @param {number} ratio a relative change (-0.06 for -6%)
 * @returns {string}
 */
export function formatDelta(ratio) {
    if (Math.abs(ratio) < 0.0005) return '±0%';
    return (ratio < 0 ? '−' : '+') + (Math.abs(ratio) * 100).toFixed(1) + '%';
}

export function deltaClass(ratio) {
    if (Math.abs(ratio) < 0.0005) return 'none';
    return ratio < 0 ? 'neg' : 'pos';
}

// ---- stats and constants

/**
 * @param {string} name a stat as its owner names it (atk, enemy_res_cryo), or a comment
 * @returns {string}
 */
export function statLabel(name) {
    name = name.replace(/^m\d+__/, '').replace(/^enemy_res/, 'res');
    let keys = [
        'features_view.stat_' + name,
        'stat_short.' + name,
        'stat.' + name,
        'char_name.' + name,
        'talent_name.' + name,
        'features_view.comment_' + name,
    ];
    let text = lang.any(...keys);
    if (text != keys[keys.length - 1]) {
        return text;
    }
    if (/_base$/.test(name)) {
        return statLabel(name.replace(/_base$/, '')) + ' (' + t('graph_base') + ')';
    }
    return name;
}

/**
 * Stat families that read as one input: a base and its bonus (crit_rate_base
 * and crit_rate) are both CRIT Rate.
 */
function statFamily(stat) {
    return bareStat(stat).replace(/_base$/, '');
}

/**
 * @param {{stat: string, value: number}} part
 * @param {boolean} showStat
 * @returns {string}
 */
function formatPart(part, showStat) {
    let stat = bareStat(part.stat);
    let text;
    if (/_base$/.test(stat) && !isPercent(stat)) {
        text = formatNumber(part.value) + ' ' + t('graph_base');
    } else {
        text = signed(formatValue(part.value, isPercent(stat)), part.value);
    }
    return showStat ? text + ' ' + statLabel(statFamily(stat)) : text;
}

/**
 * The value text of a source row.
 *
 * @param {Object} row with parts
 * @param {Object} node the node the row belongs to
 * @returns {string}
 */
export function formatParts(row, node) {
    let parts = row.parts || [];
    if (node.kind == 'total' && node.formula == 'total') {
        return parts.map((part) => formatPart(part, false)).join(' · ');
    }
    // A sum: one number, named when the node adds up different stats.
    let families = new Set();
    for (let other of node.rows) {
        for (let part of other.parts || []) families.add(statFamily(part.stat));
    }
    let rowFamilies = new Set(parts.map((part) => statFamily(part.stat)));
    if (rowFamilies.size > 1) {
        return parts.map((part) => formatPart(part, true)).join(' · ');
    }
    let value = parts.reduce((sum, part) => sum + part.value, 0);
    let stat = parts.length ? bareStat(parts[0].stat) : '';
    let text = signed(formatValue(value, isPercent(stat)), value);
    return families.size > 1 && stat ? text + ' ' + statLabel(statFamily(stat)) : text;
}

// ---- names

/**
 * @param {CalcSet|null} member
 * @returns {string}
 */
export function memberName(member) {
    // A member, or an entry of the team's legacy source.
    return sourceName(member);
}

/**
 * @param {CalcSet} member
 * @param {string} object member object name
 * @returns {string}
 */
function objectName(member, object) {
    switch (object) {
        case 'char':
            return memberName(member);
        case 'weapon':
            return member.weapon.object ? lang.get(member.weapon.object.getName()) : '';
        case 'artifacts':
            return lang.get('features_view.comment_artifacts');
        case 'buffs':
            return t('graph_custom');
        case 'food':
            return t('graph_food');
        default:
            return t('graph_other');
    }
}

function plain(text) {
    return String(text || '').replace(/<[^>]+>/g, '');
}

/**
 * @param {Object} params of a condition or post-effect
 * @returns {string} C2, A4, or ''
 */
function levelTag(params) {
    let info = params?.info;
    if (info?.constellation) return 'C' + info.constellation;
    if (info?.ascension) return 'A' + info.ascension;
    for (let cond of [params?.condition, ...(params?.conditions || [])]) {
        let p = cond?.params;
        if (p?.constellation) return 'C' + p.constellation;
        if (p?.ascension) return 'A' + p.ascension;
    }
    return '';
}

/**
 * @param {string} title a set bonus string (set_bonus.finale_of_the_deep_galleries_4_1)
 * @returns {{set: string, pieces: string}|null}
 */
function setBonus(title) {
    let match = /^set_bonus\.(.+?)_(\d)(_\d+)?$/.exec(title || '');
    return match ? {set: match[1], pieces: match[2]} : null;
}

/**
 * How a source node reads: a title, a short tag and a line under the title.
 *
 * @param {Object} node a source node of DamageGraph.view()
 * @returns {{title: string, tag: string, subtitle: string}}
 */
export function sourceInfo(node) {
    let source = node.source;
    let member = source.member;
    let item = source.item;
    let params = item?.params;
    let title = plain(params?.title ? lang.get(params.title) : '');

    switch (source.kind) {
        case 'build':
            return {title: t('graph_build'), tag: member?.char ? 'Lv' + member.char.getLevels().level : '', subtitle: buildLine(member)};
        case 'object':
            return {title: objectName(member, source.object), tag: objectTag(member, source.object), subtitle: ''};
        case 'post':
            return {title: objectName(member, source.object), tag: levelTag(params), subtitle: t('graph_conversion')};
        case 'party': {
            let buff = DB.Buffs.getList().find((entry) => entry.isParty() && entry.getConditions().includes(item));
            let name = buff ? lang.get(buff.getName()) : t('graph_team');
            return {title: title || name, tag: '', subtitle: title ? name : ''};
        }
        case 'enemy':
            return {title: item ? (title || t('graph_enemy')) : t('graph_enemy_base'), tag: '', subtitle: ''};
        default: {
            // A condition of a member object.
            let owner = objectName(member, source.object);
            if (source.object == 'artifacts') {
                let bonus = setBonus(params?.title);
                if (bonus) {
                    let setName = lang.get('artifact_set.' + bonus.set);
                    let option = /_\d_\d+$/.test(params.title) ? title : '';
                    return {title: setName, tag: bonus.pieces + 'pc', subtitle: option};
                }
            }
            if (source.object == 'weapon') {
                return {title: title || owner, tag: 'R' + member.weapon.getLevels().refine, subtitle: title ? owner : ''};
            }
            let tag = levelTag(params);
            return {title: title || owner, tag, subtitle: title && source.object != 'char' ? owner : ''};
        }
    }
}

function objectTag(member, object) {
    if (object == 'char' && member.char) return 'Lv' + member.char.getLevels().level;
    if (object == 'weapon' && member.weapon) return 'R' + member.weapon.getLevels().refine;
    return '';
}

function buildLine(member) {
    // An entry of the legacy source has no build.
    if (!member || !member.weapon || !member.char) return '';
    let weapon = member.weapon.object ? lang.get(member.weapon.object.getName()) + ' R' + member.weapon.getLevels().refine : '';
    return [weapon, lang.get('features_view.comment_artifacts')].filter(Boolean).join(' · ');
}

/**
 * @param {Object} label a DamageGraph label: {key}, {any}, {comment}, {stat}, {member}, {parts}
 * @param {DamageGraph} graph
 * @returns {string}
 */
export function labelText(label, graph) {
    if (!label) return '';
    if (label.parts) return label.parts.map((part) => labelText(part, graph)).filter(Boolean).join(' · ');
    if (label.key) return lang.get(label.key);
    if (label.any) {
        let text = lang.any(...label.any);
        if (text != label.any[label.any.length - 1]) return text;
        return label.comment ? commentLabel(label.comment, graph) : t('graph_multiplier');
    }
    if (label.comment) return commentLabel(label.comment, graph);
    if (label.stat) return statLabel(label.stat);
    if (label.member !== undefined) return memberName(graph.evaluation.sourceAt(label.member));
    return '';
}

/**
 * @param {string} comment a formula constant's comment (talent_elemental, a setting name)
 * @param {DamageGraph} graph
 * @returns {string}
 */
function commentLabel(comment, graph) {
    let text = statLabel(comment);
    if (text != comment) return text;
    let key = graph.settingTitle(comment);
    return key ? plain(lang.get(key)) : comment;
}

/**
 * @param {Object} node a node of DamageGraph.view()
 * @param {DamageGraph} graph
 * @param {string} [resultTitle] the feature's name
 * @returns {string}
 */
export function nodeTitle(node, graph, resultTitle = '') {
    if (node.kind == 'result') return resultTitle;
    if (node.kind == 'source') return sourceInfo(node).title;
    return labelText(node.title, graph);
}

/**
 * The label of an input row.
 *
 * @param {Object} row
 * @param {Object} node the node it belongs to
 * @param {Map.<string, Object>} nodes view nodes by id
 * @param {DamageGraph} graph
 * @returns {string}
 */
export function rowLabel(row, node, nodes, graph) {
    // A constant, or an input named by its row (a contribution: its member).
    if (row.kind != 'edge' || row.label) {
        return labelText(row.label, graph);
    }
    let from = nodes.get(row.from);
    let title = nodeTitle(from, graph);
    let fromLane = graph.lanes.find((lane) => lane.id == from.lane);
    let owner = node.lane == 'formula' || node.lane == 'result' ? 'slot' + graph.viewSlot : node.lane;
    if (from.kind == 'source' && fromLane?.kind == 'member' && from.lane != owner) {
        let name = memberName(fromLane.member);
        return title == name ? name : name + ' · ' + title;
    }
    return title;
}

/**
 * @param {Object} formula DamageGraph.evaluate() formulas entry
 * @returns {string}
 */
export function formulaText(formula) {
    if (!formula) return '';
    if (formula.kind == 'total') {
        return `${formatNumber(formula.base)} × (1 + ${formatPercent(formula.percent)}) + ${formatNumber(formula.flat)}`;
    }
    if (formula.kind == 'resistance') {
        let value = formula.value;
        if (value < 0) return `1 − (${formatPercent(value)}) ÷ 2`;
        if (value > 0.75) return `1 ÷ (1 + 4 × ${formatPercent(value)})`;
        return `1 − ${formatPercent(value)}`;
    }
    let terms = formula.terms.map((term) => formatValue(term.value, term.percent));
    switch (formula.op) {
        case 'min':
        case 'max':
            return `${formula.op}(${terms.join(', ')})`;
        case 'floor':
        case 'ceil':
            return `${formula.op}(${terms.join(' + ')})`;
        case 'max0':
            return `max(0, ${terms.join(' + ')})`;
        default:
            return terms.join(` ${formula.op} `);
    }
}
