import { BuildData } from "./Build/Data";
import { getUsedStats } from "./Feature2/Compile/Stats";
import { contributionWeights } from "./Feature2/Compile/Types/Damage";
import { CConst } from "./Feature2/Compile/Types/Item";
import { FeatureCompiler } from "./Feature2/Compiler";
import { getActiveFeature } from "./Feature2/Rotation/Tree";
import { isPercent } from "./Stats";
import { ENEMY_PREFIX } from "./Team/EnemyStats";
import { StatContributions } from "./DamageGraph/Contributions";
import { MEMBER_OBJECTS } from "./Team/Evaluation";
import { SOURCE_KINDS } from "./Team/StatSources";

/**
 * Blocks whose value is the sum of their items: an item that is a stat shows
 * as one input row per source of the stat.
 */
const ADDITIVE = new Set([
    'block_sum', 'block_sum_plus', 'base_damage', 'flat_damage', 'flat_reduce',
    'multiplier_bonus', 'multiplier_reaction', 'multiplier_custom', 'multiplier_amplifying',
    'multiplier_resistance', 'multiplier_defence', 'reaction_base_bonus', 'resistance_value',
    'variable_set',
]);
/** Sums that start from 100% (CSumPlusOne): their node shows a "Base 100%" row. */
const SUM_PLUS = new Set(['block_sum_plus', 'multiplier_bonus', 'multiplier_reaction']);
/** Wrappers of one block, shown as that block. */
const WRAPPERS = new Set(['multiplier_resistance', 'multiplier_defence', 'multiplier_amplifying', 'multiplier_custom']);
/** Constants that are part of a formula, not an input worth a row. */
const HIDDEN_COMMENTS = new Set(['processed', 'def_reduce_cap', 'def_ignore_cap']);
const OPERATORS = {
    block_multi: '×',
    reaction_base: '×',
    block_divide: '÷',
    block_subtract: '−',
    block_min: 'min',
    block_max: 'max',
    value_cap: 'min',
    number_floor: 'floor',
    number_ceil: 'ceil',
    value_above_zero: 'max0',
};
/** Object sources that make up a member's build (collapsed together by default). */
const BUILD_OBJECTS = ['char', 'weapon', 'artifacts'];
const MEMBER_ADDRESS = /^m(\d+)__/;

/**
 * The damage graph of one feature of one member: the feature's formula (its
 * compiled tree) joined with where every stat comes from (Team/StatSources,
 * DamageGraph/Contributions), across the whole team.
 *
 * Nodes:
 * - result: the feature's result (normal, crit, average; one value for heals
 *   and shields);
 * - factor: a factor of the result (Base DMG, DMG Bonus, RES, DEF, CRIT);
 * - contribution: what one member contributes to a reaction the team deals
 *   together (Feature2/Reaction/Team), with its own factors, in its member's
 *   lane; the result of such a reaction ranks its contributions
 *   (`formula: 'ranking'`);
 * - term: a multiplier of a sum (a talent hit, a teammate's delivered
 *   multiplier such as Escoffier's C2);
 * - total: a stat that is more than a sum of sources (ATK: base × (1 + %) +
 *   flat), or a stat read inside a product;
 * - source: a stat source (a member's build, a condition, a post-effect, the
 *   party, the enemy).
 *
 * Every node but a source has input rows; each row is an edge from another
 * node, or a constant of the formula. Every node lives in a lane: the member
 * it belongs to (slot0..slot3), the team (party effects), the enemy, the
 * formula (factors) or the result.
 *
 * Sources can be turned off (evaluate(off)): their stats are taken out and
 * post-effects run again, with settings kept as they are. A delivered
 * multiplier is turned off by taking its block out of the tree.
 */
export class DamageGraph {
    /**
     * @param {MemberView} view the member, in the view of its team
     * @param {string} featureName
     * @param {Object} [opts] {reaction; hit: the feature as a hit of the
     *     team's rotation ({insideBlock}), chosen and computed as the rotation
     *     does (Feature2/Rotation/Tree); ids: the numbers of sources in keys,
     *     shared with other graphs (StatContributions)}
     */
    constructor(view, featureName, opts = {}) {
        let member = view.member;
        this.evaluation = view.teamView.evaluation().traced();
        this.viewSlot = this.evaluation.slotOf(member);

        let data = this.evaluation.member(member).programData();
        if (opts.reaction) {
            data.settings.reaction = opts.reaction;
        }
        if (opts.hit && opts.hit.insideBlock) {
            data.settings.inside_rotation_block = 1;
        }
        this.contributions = new StatContributions(this.evaluation, member, data, opts.ids);

        this.data = new BuildData();
        this.data.settings = data.settings;
        this.data.stats = this.contributions.final;
        this.data.multipliers = data.multipliers;

        this.feature = opts.hit
            ? getActiveFeature(member.getAllFeaturesByName(featureName, {ignoreRotation: true}), this.data)
            : view.getFeatureByName(featureName, this.data);
        if (!this.feature) {
            throw new Error(`Feature ${featureName} is not active`);
        }
        this.tree = this.feature.getTree(this.data);
        this.compiled = new WeakMap();

        this.nodes = new Map();
        this.edges = [];
        this.build();
        this.lanes = this.makeLanes();
    }

    // ---- structure

    build() {
        let root = this.tree;
        let result = this.addNode({id: 'result', kind: 'result', lane: 'result', path: [], rows: []});

        if (root.getType() == 'damage_contribution_result') {
            // A reaction the team deals together. Every contributor rolls
            // its own CRIT, and the result ranks the contributions: each is
            // an input row (`part`: its index in the tree), and what it adds
            // to every result is in the result's formula values (rankingValues).
            this.hasCrit = true;
            result.formula = 'ranking';
            root.items.forEach((part, index) => {
                let from = this.contribution(part, [['items', index]]);
                this.link(result, from, {label: {member: from.slot}, part: index});
            });
        } else {
            // Heals and shields have a damage result without crits (noCritValues).
            this.hasCrit = !!root.critRate && !this.feature.noCritValues;
            this.factors(result, root, [], 'formula', this.hasCrit);
        }

        this.computeDepths();
    }

    /**
     * The factors of a damage tree as input rows of `node`: its items, and
     * its CRIT Rate and CRIT DMG.
     *
     * @param {Object} node
     * @param {Object} tree a damage tree
     * @param {Array} path the tree's path in the feature's tree
     * @param {string} lane the lane of the factors
     * @param {boolean} crit whether it has CRIT values
     */
    factors(node, tree, path, lane, crit) {
        for (let item of rootItems(tree, path)) {
            this.link(node, this.factor(item.ast, item.path, null, 0, lane));
        }
        if (crit) {
            this.link(node, this.factor(tree.critRate, path.concat([['critRate']]), {key: 'stat.crit_rate'}, 0, lane));
            this.link(node, this.factor(tree.critDmg, path.concat([['critDmg']]), {key: 'stat.crit_dmg'}, -1, lane));
        }
    }

    /**
     * What one member contributes to a reaction the team deals together: its
     * value is what the reaction would deal as the member's own, without a
     * CRIT. It stands in the formula; its factors stand in the member's lane.
     *
     * @param {Object} tree the contributor's damage tree
     * @param {Array} path
     * @returns {Object} the node
     */
    contribution(tree, path) {
        let slot = tree.slot === undefined ? this.viewSlot : tree.slot;
        let node = this.addNode({
            id: 'contribution:' + pathKey(path),
            kind: 'contribution',
            lane: 'formula',
            owner: 'slot' + slot,
            slot,
            path,
            ast: tree,
            percent: false,
            title: {parts: [{member: slot}, {key: 'features_view.graph_contribution'}]},
        });
        this.factors(node, tree, path, 'slot' + slot, true);
        return node;
    }

    addNode(node) {
        node.rows ||= [];
        this.nodes.set(node.id, node);
        return node;
    }

    /**
     * An input row of `node` coming from `from`: its value is from's value.
     */
    link(node, from, extra = {}) {
        let row = Object.assign({id: node.id + '#' + node.rows.length, kind: 'edge', from: from.id}, extra);
        node.rows.push(row);
        this.edges.push({id: 'e' + this.edges.length, from: from.id, to: node.id, row: row.id});
        return row;
    }

    factor(ast, path, title = null, offset = 0, lane = 'formula') {
        let id = 'factor:' + pathKey(path);
        let last = path[path.length - 1][0];
        let node = this.addNode({
            id,
            kind: 'factor',
            lane,
            path,
            offset,
            title: title || blockTitle(ast),
            percent: isPercentBlock(ast) || last == 'critRate' || last == 'critDmg',
        });
        if (SUM_PLUS.has(ast.getType()) && !offset) {
            node.rows.push({id: id + '#base', kind: 'const', label: {key: 'features_view.stat_base_bonus'}, value: 1, percent: true});
        }

        let inner = unwrap(ast, path);
        node.formulaPath = inner.path;
        node.formula = formulaKind(inner.ast);
        node.ast = inner.ast;
        this.fill(node, inner.ast, inner.path);
        return node;
    }

    /**
     * Rows of `node` for the items of `ast`: constants with a meaning, the
     * sources of stats, links to terms and totals. Sums inside sums add
     * their rows to the node.
     */
    fill(node, ast, path) {
        let additive = ADDITIVE.has(ast.getType());
        for (let [child, step] of children(ast)) {
            let childPath = path.concat([step]);
            let type = child.getType();

            if (type == 'item_const') {
                this.constRow(node, child, additive);
            } else if (type == 'item_stat') {
                this.statRows(node, child.stat, additive);
            } else if (type == 'item_stat_total') {
                this.link(node, this.statTotal(child, childPath));
            } else if (child.hasItems && child.hasItems()) {
                if (child.origin || (ast === node.ast && additive && !ADDITIVE.has(type))) {
                    this.link(node, this.term(child, childPath));
                } else {
                    this.fill(node, child, childPath);
                }
            }
        }
    }

    constRow(node, item, additive) {
        if (!item.comment || HIDDEN_COMMENTS.has(item.comment)) return;
        if (additive && !item.value) return;
        // A formula may read a constant twice (DEF reads the character level twice).
        if (node.rows.some((row) => row.kind == 'const' && row.label.comment == item.comment && row.value == item.value)) return;
        node.rows.push({id: node.id + '#' + node.rows.length, kind: 'const', label: {comment: item.comment}, value: item.value, percent: !!item.percent});
    }

    /**
     * @param {Object} node
     * @param {string} stat a stat of the program
     * @param {boolean} additive whether the stat is added (a row per source) or
     *     read in a product (a link to the stat's total)
     */
    statRows(node, stat, additive) {
        let list = this.contributions.of(stat);
        let value = this.data.stats[stat] || 0;
        if (!list.length && !value) return;

        if (!additive) {
            this.link(node, this.plainTotal(stat));
            return;
        }
        this.sourceRows(node, stat, list, value);
    }

    sourceRows(node, stat, list, value) {
        let attributed = 0;
        for (let item of list) {
            if (!item.value) continue;
            attributed += item.value;
            let source = this.source(item.key, stat, item.value);
            this.link(node, source, {parts: [{stat, value: item.value}], sourceKey: item.key});
        }
        let rest = value - attributed;
        if (Math.abs(rest) > 1e-9) {
            node.rows.push({id: node.id + '#' + node.rows.length, kind: 'const', label: {stat: bareStat(stat)}, value: rest, percent: isPercent(bareStat(stat))});
        }
    }

    /**
     * A total of a stat read inside a product: its sources as rows.
     */
    plainTotal(stat) {
        let id = 'total:' + stat;
        if (this.nodes.has(id)) return this.nodes.get(id);

        let node = this.addNode({id, kind: 'total', lane: laneOfStat(stat, this.viewSlot), valueStat: stat, title: this.statTitle(stat), percent: isPercent(bareStat(stat))});
        this.sourceRows(node, stat, this.contributions.of(stat), this.data.stats[stat] || 0);
        return node;
    }

    /**
     * A stat total (ATK = base × (1 + %) + flat): one row per source, with
     * what it adds to each part.
     */
    statTotal(item, path) {
        let names = {base: item.statBaseName(), percent: item.statPercentName(), flat: item.statFlatName()};
        let id = 'total:' + names.flat + '*';
        if (this.nodes.has(id)) return this.nodes.get(id);

        let node = this.addNode({
            id,
            kind: 'total',
            lane: laneOfStat(names.flat, this.viewSlot),
            path,
            title: this.statTitle(names.flat),
            percent: false,
            formula: 'total',
            totalStats: names,
        });

        let bySource = new Map();
        for (let stat of [names.base, names.percent, names.flat]) {
            for (let {key, value} of this.contributions.of(stat)) {
                if (!value) continue;
                if (!bySource.has(key)) bySource.set(key, []);
                bySource.get(key).push({stat, value});
            }
        }
        for (let [key, parts] of bySource) {
            let source = null;
            for (let part of parts) {
                source = this.source(key, part.stat, part.value);
            }
            this.link(node, source, {parts, sourceKey: key});
        }
        return node;
    }

    /**
     * @param {string} stat a stat of the program
     * @returns {Object} its title: a teammate's stat is named with the teammate
     */
    statTitle(stat) {
        let match = MEMBER_ADDRESS.exec(stat);
        if (match) {
            return {parts: [{member: Number(match[1]) - 1}, {stat: bareStat(stat)}]};
        }
        return {stat: bareStat(stat)};
    }

    /**
     * A term of a sum: a multiplier, possibly delivered by a teammate.
     */
    term(ast, path) {
        let id = 'term:' + pathKey(path);
        let origin = ast.origin;
        let node = this.addNode({
            id,
            kind: 'term',
            lane: origin ? 'slot' + origin.slot : laneOfStats(getUsedStats(ast), this.viewSlot),
            path,
            ast,
            formulaPath: path,
            formula: formulaKind(ast),
            percent: isPercentBlock(ast),
            title: termTitle(ast),
        });

        if (origin) {
            let key = this.multiplierKey(origin);
            node.sourceKey = key;
            node.toggle = true;
            this.contributions.register({key, kind: 'multiplier', slot: origin.slot, member: this.evaluation.sourceAt(origin.slot), object: 'char', item: origin.multiplier});
        }
        this.fill(node, ast, path);
        return node;
    }

    multiplierKey(origin) {
        return `multiplier:${origin.slot}:${this.contributions.idOf(origin.multiplier)}`;
    }

    /**
     * The node of a stat source, adding what it gives to `stat`.
     */
    source(key, stat, value) {
        let id = 'source:' + key;
        let node = this.nodes.get(id);
        if (!node) {
            let descriptor = this.contributions.sources.get(key);
            node = this.addNode({
                id,
                kind: 'source',
                lane: sourceLane(descriptor),
                sourceKey: key,
                source: descriptor,
                adds: [],
                toggle: isToggleable(descriptor),
                group: descriptor.kind == SOURCE_KINDS.OBJECT && BUILD_OBJECTS.includes(descriptor.object) ? 'build' : null,
            });
        }
        // What the source adds to a stat is the same on every row it feeds.
        if (!node.adds.some((item) => item.stat == stat)) {
            node.adds.push({stat, value});
        }
        return node;
    }

    /**
     * Column of each lane node: sources are 0, a node is one more than the
     * deepest lane node feeding it.
     */
    computeDepths() {
        let incoming = new Map();
        for (let edge of this.edges) {
            if (!incoming.has(edge.to)) incoming.set(edge.to, []);
            incoming.get(edge.to).push(edge.from);
        }
        let depth = (id, seen = new Set()) => {
            let node = this.nodes.get(id);
            if (node.depth !== undefined) return node.depth;
            if (seen.has(id)) return 0;
            seen.add(id);
            let result = 0;
            for (let from of incoming.get(id) || []) {
                let other = this.nodes.get(from);
                if (other.lane == 'formula' || other.lane == 'result') continue;
                result = Math.max(result, depth(from, seen) + 1);
            }
            node.depth = result;
            return result;
        };
        for (let node of this.nodes.values()) {
            if (node.lane != 'formula' && node.lane != 'result') depth(node.id);
        }
    }

    makeLanes() {
        let used = new Set([...this.nodes.values()].map((node) => node.lane));
        let lanes = [];
        this.evaluation.slots.forEach((member, slot) => {
            if (!member) return;
            let id = 'slot' + slot;
            lanes.push({id, kind: 'member', slot, member, viewed: slot == this.viewSlot, used: used.has(id)});
        });
        // The entries of the legacy source (Team/Legacy) that the feature
        // involves: a lane each, after the members.
        for (let entry of this.evaluation.legacy) {
            let slot = this.evaluation.slotOf(entry);
            if (used.has('slot' + slot)) {
                lanes.push({id: 'slot' + slot, kind: 'member', legacy: true, slot, member: entry, viewed: false, used: true});
            }
        }
        lanes.push({id: 'team', kind: 'team', used: used.has('team')});
        lanes.push({id: 'enemy', kind: 'enemy', used: used.has('enemy')});
        return lanes;
    }

    /**
     * The graph as shown: each member's build (character, weapon, artifacts)
     * is one node unless its lane is expanded; rows from build parts into
     * one node become one row.
     *
     * @param {Set.<string>} [expanded] lanes whose build shows its parts
     * @returns {{nodes: Array.<Object>, edges: Array.<Object>}} new objects; the graph is not changed
     */
    view(expanded = new Set()) {
        let groupOf = (node) => node && node.kind == 'source' && node.group == 'build' && !expanded.has(node.lane) ? 'build:' + node.lane : null;
        let nodes = [];
        let groups = new Map();

        for (let node of this.nodes.values()) {
            let group = groupOf(node);
            if (group) {
                let merged = groups.get(group);
                if (!merged) {
                    let lane = this.lanes.find((item) => item.id == node.lane);
                    merged = {id: group, kind: 'source', lane: node.lane, group: 'build', parts: [], adds: [], rows: [], toggle: false, depth: 0,
                        source: {kind: 'build', slot: lane.slot, member: lane.member}};
                    groups.set(group, merged);
                    nodes.push(merged);
                }
                merged.parts.push(node);
                for (let add of node.adds) {
                    let item = merged.adds.find((other) => other.stat == add.stat);
                    if (item) item.value += add.value; else merged.adds.push({stat: add.stat, value: add.value});
                }
                continue;
            }

            let rows = [];
            for (let row of node.rows) {
                let group2 = row.from ? groupOf(this.nodes.get(row.from)) : null;
                if (!group2) {
                    rows.push(Object.assign({}, row));
                    continue;
                }
                let id = node.id + '#' + group2;
                let merged = rows.find((item) => item.id == id);
                if (!merged) {
                    merged = {id, kind: 'edge', from: group2, parts: []};
                    rows.push(merged);
                }
                for (let part of row.parts || []) {
                    let item = merged.parts.find((other) => other.stat == part.stat);
                    if (item) item.value += part.value; else merged.parts.push({stat: part.stat, value: part.value});
                }
            }
            nodes.push(Object.assign({}, node, {rows}));
        }

        let edges = [];
        for (let node of nodes) {
            for (let row of node.rows) {
                if (row.from) edges.push({id: 'e:' + row.id, from: row.from, to: node.id, row: row.id});
            }
        }
        return {nodes, edges};
    }

    /**
     * A formula constant may be named after a setting (the stacks of a
     * condition): the title of the team's condition with that name.
     *
     * @param {string} name
     * @returns {string|null} a string key
     */
    settingTitle(name) {
        for (let member of this.evaluation.getSources()) {
            for (let object of MEMBER_OBJECTS) {
                for (let cond of member[object]?.getConditions() || []) {
                    if (cond.getName && cond.getName() == name && cond.params?.title) {
                        return cond.params.title;
                    }
                }
            }
        }
        return null;
    }

    // ---- values

    /**
     * Values of the graph with some sources turned off.
     *
     * @param {Set.<string>} [off] source keys
     * @returns {{result: {normal: number, crit: number, average: number}, values: Map.<string, number>, formulas: Map.<string, Object>, stats: Stats}}
     */
    evaluate(off = new Set()) {
        let stats = off.size ? this.contributions.stats(off) : this.contributions.final;
        let tree = this.treeFor(off);

        let values = new Map();
        let formulas = new Map();
        for (let node of this.nodes.values()) {
            if (node.kind == 'source') continue;
            if (node.valueStat) {
                values.set(node.id, stats[node.valueStat] || 0);
            } else if (node.kind != 'result') {
                let ast = resolvePath(tree, node.path);
                values.set(node.id, ast ? this.run(ast, stats) + (node.offset || 0) : 0);
            }
            if (node.formula) {
                formulas.set(node.id, this.formulaValues(node, tree, stats));
            }
        }

        let result = this.result(tree, stats);
        values.set('result', result.normal);
        return {result, values, formulas, stats};
    }

    /**
     * @param {Set.<string>} off
     * @returns {{normal: number, crit: number, average: number}} the result only
     */
    evaluateResult(off) {
        let stats = off.size ? this.contributions.stats(off) : this.contributions.final;
        return this.result(this.treeFor(off), stats);
    }

    result(tree, stats) {
        let value = this.run(tree, stats, true);
        if (!Array.isArray(value)) value = [value, value, value];
        let [normal, crit, average] = value;
        return {normal, crit, average};
    }

    /**
     * The tree, without the delivered multipliers turned off.
     */
    treeFor(off) {
        let keys = [...off].filter((key) => key.startsWith('multiplier:'));
        if (!keys.length) {
            return this.tree;
        }
        let tree = this.feature.getTree(this.data);
        tree.walkReplace((item) => {
            if (item.origin && keys.includes(this.multiplierKey(item.origin))) {
                return new CConst({value: 0});
            }
            return item;
        });
        return tree;
    }

    /**
     * @param {Object} ast a node of the tree
     * @param {Stats} stats
     * @param {boolean} [whole] the whole result (an array for damage)
     * @returns {number|Array.<number>}
     */
    run(ast, stats, whole = false) {
        let type = ast.getType();
        if (type == 'item_const') return ast.value || 0;
        if (type == 'item_stat') return stats[ast.stat] || 0;
        if (type == 'item_stat_total') {
            return (stats[ast.statBaseName()] || 0) * (1 + (stats[ast.statPercentName()] || 0)) + (stats[ast.statFlatName()] || 0);
        }

        let compiled = this.compiled.get(ast);
        if (!compiled) {
            let compiler = new FeatureCompiler(ast);
            let opts = {dontProcessTree: true, dontProcessStaticValues: true};
            compiler.prepare({}, opts);
            compiler.compile(opts);
            compiled = compiler;
            this.compiled.set(ast, compiled);
        }
        stats.ensure(compiled.usedStats);
        let value = compiled.compiled(stats);
        return Array.isArray(value) && !whole ? value[0] : value;
    }

    /**
     * What a node's formula line shows: its operator and the values of its
     * items, or the parts of a stat total.
     */
    formulaValues(node, tree, stats) {
        if (node.formula == 'total') {
            let names = node.totalStats;
            return {kind: 'total', base: stats[names.base] || 0, percent: stats[names.percent] || 0, flat: stats[names.flat] || 0};
        }
        if (node.formula == 'ranking') {
            return this.rankingValues(tree, stats);
        }
        let ast = resolvePath(tree, node.formulaPath);
        if (!ast) return null;
        if (node.formula == 'resistance') {
            // The block compiles to the multiplier; its items are the RES stats.
            let value = children(ast).reduce((sum, [child]) => sum + this.run(child, stats), 0);
            return {kind: 'resistance', value};
        }
        let terms = [];
        for (let [child] of children(ast)) {
            terms.push({value: this.run(child, stats), percent: isPercentItem(child)});
        }
        return {kind: 'op', op: node.formula, terms};
    }

    /**
     * The ranking of a reaction the team deals together, for each result:
     * every contributor's weight and what it adds (its weight × its value).
     * Without a CRIT and with everyone's a contributor has one rank; the
     * average is over every combination of CRITs, each ranked on its own, as
     * the engine does (CDamageContribution): the weight there is the mean of
     * the contributor's weights.
     *
     * @param {Object} tree the reaction's tree
     * @param {Stats} stats
     * @returns {{kind: string, parts: Array.<Object>}} per contributor, in the
     *     tree's order: {value, normal, crit, average}, a result as {weight, share}
     */
    rankingValues(tree, stats) {
        let parts = tree.items.map((part) => {
            let [normal, crit] = this.run(part, stats, true);
            return {normal, crit, rate: this.run(part.critRate, stats)};
        });

        let normal = contributionWeights(parts.map((part) => part.normal));
        let crit = contributionWeights(parts.map((part) => part.crit));
        let average = parts.map(() => ({weight: 0, share: 0}));
        for (let mask = 0; mask < 1 << parts.length; ++mask) {
            let chance = 1;
            let values = parts.map((part, index) => {
                let isCrit = mask >> index & 1;
                chance *= isCrit ? part.rate : 1 - part.rate;
                return isCrit ? part.crit : part.normal;
            });
            contributionWeights(values).forEach((weight, index) => {
                average[index].weight += chance * weight;
                average[index].share += chance * weight * values[index];
            });
        }

        return {
            kind: 'ranking',
            parts: parts.map((part, index) => ({
                value: part.normal,
                normal: {weight: normal[index], share: normal[index] * part.normal},
                crit: {weight: crit[index], share: crit[index] * part.crit},
                average: average[index],
            })),
        };
    }

    // ---- sources

    /**
     * How much the result changes when a source is turned off (or back on).
     *
     * @param {string} key
     * @param {Set.<string>} off current state
     * @param {Object} [current] evaluateResult(off), if known
     * @returns {{normal: number, crit: number, average: number, turningOn: boolean}} relative changes
     */
    impact(key, off, current = this.evaluateResult(off)) {
        let other = new Set(off);
        let turningOn = other.has(key);
        if (turningOn) other.delete(key); else other.add(key);
        let changed = this.evaluateResult(other);
        let ratio = (name) => current[name] ? changed[name] / current[name] - 1 : 0;
        return {normal: ratio('normal'), crit: ratio('crit'), average: ratio('average'), turningOn};
    }
}

/**
 * @param {Object} root a damage tree
 * @param {Array} [base] its path in the feature's tree
 * @returns {Array.<{ast: Object, path: Array}>} the result's factors, groups spread
 */
function rootItems(root, base = []) {
    if (!root.items) {
        return [{ast: root, path: base}];
    }
    let result = [];
    let walk = (items, path) => {
        items.forEach((item, index) => {
            let itemPath = path.concat([['items', index]]);
            if (item.group && item.items) {
                walk(item.items, itemPath);
            } else {
                result.push({ast: item, path: itemPath});
            }
        });
    };
    walk(root.items, base);
    return result;
}

/**
 * @returns {Array.<[Object, Array]>} items of a block with their path step
 */
function children(ast) {
    let result = [];
    (ast.items || []).forEach((item, index) => result.push([item, ['items', index]]));
    (ast.valueItems || []).forEach((item, index) => result.push([item, ['valueItems', index]]));
    return result;
}

function unwrap(ast, path) {
    while (WRAPPERS.has(ast.getType()) && ast.items.length == 1 && ast.items[0].hasItems && ast.items[0].hasItems()) {
        ast = ast.items[0];
        path = path.concat([['items', 0]]);
    }
    return {ast, path};
}

/**
 * @param {Object} tree
 * @param {Array} path steps: [field, index], or [field] for critRate/critDmg
 * @returns {Object|null}
 */
export function resolvePath(tree, path) {
    let node = tree;
    for (let [field, index] of path) {
        if (!node) return null;
        node = index === undefined ? node[field] : (node[field] || [])[index];
    }
    return node || null;
}

function pathKey(path) {
    return path.map((step) => step.join('.')).join('/') || 'root';
}

function formulaKind(ast) {
    let type = ast.getType();
    if (type == 'resistance_value') return 'resistance';
    return OPERATORS[type] || null;
}

function blockTitle(ast) {
    let keys = [];
    if (ast.comment) keys.push('features_view.block_' + ast.comment);
    keys.push('features_view.block_' + ast.getType());
    // Without a string of its own, a block is named after its comment.
    return {any: keys, comment: ast.comment};
}

function termTitle(ast) {
    if (ast.origin) {
        let source = ast.origin.multiplier.getSource ? ast.origin.multiplier.getSource() : '';
        return {parts: [{member: ast.origin.slot}, source ? {comment: source} : {key: 'features_view.graph_multiplier'}]};
    }
    for (let [child] of children(ast)) {
        if (child.getType() == 'item_const' && child.comment && !HIDDEN_COMMENTS.has(child.comment)) {
            return {comment: child.comment};
        }
    }
    return {key: 'features_view.graph_multiplier'};
}

function isPercentBlock(ast) {
    return !!ast.percent || /^multiplier_/.test(ast.getType());
}

function isPercentItem(item) {
    let type = item.getType();
    if (type == 'item_stat') return isPercent(bareStat(item.stat));
    if (type == 'item_stat_total') return false;
    if (type == 'item_const') return !!item.percent;
    return isPercentBlock(item);
}

/**
 * @param {string} stat a stat of a program (m2__atk, enemy__res_pyro, atk)
 * @returns {string} the stat as its owner names it (atk, enemy_res_pyro)
 */
export function bareStat(stat) {
    if (stat.startsWith(ENEMY_PREFIX)) {
        return 'enemy_' + stat.slice(ENEMY_PREFIX.length);
    }
    return stat.replace(MEMBER_ADDRESS, '');
}

function laneOfStat(stat, viewSlot) {
    if (stat.startsWith(ENEMY_PREFIX)) return 'enemy';
    let match = MEMBER_ADDRESS.exec(stat);
    return 'slot' + (match ? Number(match[1]) - 1 : viewSlot);
}

function laneOfStats(stats, viewSlot) {
    let lanes = new Set(stats.map((stat) => laneOfStat(stat, viewSlot)));
    return lanes.size == 1 ? [...lanes][0] : 'slot' + viewSlot;
}

function sourceLane(descriptor) {
    if (descriptor.kind == SOURCE_KINDS.PARTY) return 'team';
    if (descriptor.kind == SOURCE_KINDS.ENEMY) return 'enemy';
    return 'slot' + descriptor.slot;
}

function isToggleable(descriptor) {
    if (descriptor.kind == SOURCE_KINDS.OBJECT) return false;
    if (descriptor.kind == SOURCE_KINDS.ENEMY && !descriptor.item) return false;
    return true;
}
