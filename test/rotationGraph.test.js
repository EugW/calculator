import { Condition } from "../src/js/classes/Condition";
import { RotationStops } from "../src/js/classes/DamageGraph/RotationStops";
import { getActiveFeature, hitData } from "../src/js/classes/Feature2/Rotation/Tree";
import { Rotation } from "../src/js/classes/Rotation";
import { RotationCompiler } from "../src/js/classes/RotationCompiler";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeSkirkTeam } from "./support/skirkTeam";
import { makeBuild } from "./support/team";

global.DB = DB;

/**
 * The damage graph of a team's rotation (DamageGraph/RotationStops): a graph
 * per hit, of the hit's feature in the team as it is at the hit's point of
 * the rotation.
 */

const PYRONADO = 'burst.xiangling_pyronado';
const BURST = 'burst.burst_dmg';
const VOYAGE = 'bennet_fantastic_voyage';
const LUNAR_CHARGED = 'reaction.lunarcharged';
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

const hit = (member, feature, extra = {}) => Object.assign({type: 'feature', charId: member.char.getId(), feature, count: 1, reaction: 0}, extra);
const switchTo = (member) => ({type: 'action', action: 'switch', charId: member.char.getId()});

function makeTeam(...charKeys) {
    const members = charKeys.map(makeBuild);
    const team = Team.fromMember(members[0]);
    members.slice(1).forEach((member, index) => team.setMember(index + 1, member));
    return {team, members};
}

function voyage(bennett, value) {
    const cond = Condition.unwrap(DB.Chars.get('Bennet').getAllConditions()).find((item) => item.getName() == VOYAGE);
    return {type: 'condition', subtype: 'member', object: 'char', charId: bennett.char.getId(), itemId: bennett.char.getId(), conditionId: cond.getId(), value};
}

function stopsOf(team, items) {
    team.setRotation(new Rotation({items}).clone());
    return new RotationStops(team);
}

/** What the Rotation list shows for a stop's hit: the hit with its member's data at its state. */
function engineResult(stop) {
    const data = hitData(stop.hit);
    const feature = getActiveFeature(stop.hit.feature, data);
    return feature.getResult(data)[feature.getName()];
}

function expectGraphsEqualEngine(rotation) {
    for (const stop of rotation.stops) {
        const actual = rotation.graph(stop).evaluate().result;
        const expected = engineResult(stop);
        for (const name of ['normal', 'crit', 'average']) {
            if (!close(actual[name], expected[name] || 0)) {
                throw new Error(`stop ${stop.index} (${stop.feature}) ${name}: graph ${actual[name]}, engine ${expected[name]}`);
            }
        }
    }
}

/** Xiangling and Bennett: steps, a switch, both kinds of block, hits that deal nothing. */
function xianglingRotation() {
    const {team, members: [xiangling, bennett]} = makeTeam('Xiangling', 'Bennet');
    const rotation = stopsOf(team, [
        hit(xiangling, PYRONADO),
        voyage(bennett, 1),
        hit(xiangling, PYRONADO, {reaction: 2, count: 2}),
        switchTo(bennett),
        hit(bennett, BURST),
        {type: 'repeat', count: 3, items: [voyage(bennett, 0), hit(xiangling, PYRONADO)]},
        {type: 'uptime', typeId: 1, percent: 60, conditions: [voyage(bennett, 0)], features: [hit(xiangling, PYRONADO)]},
        // No stops: a feature the member does not have, one that is not active, a disabled hit.
        hit(xiangling, 'burst.no_such_hit'),
        hit(xiangling, 'reaction.hyperbloom'),
        Object.assign(hit(xiangling, PYRONADO), {disabled: true}),
        {type: 'uptime', typeId: 1, percent: 100, conditions: [], features: [hit(bennett, BURST)]},
    ]);
    return {team, xiangling, bennett, rotation};
}

test("the stops are the hits that deal damage, in the rotation's order, with their blocks", () => {
    const {rotation} = xianglingRotation();

    expect(rotation.stops.map((stop) => [stop.index, stop.slot, stop.feature, stop.reaction, stop.count, stop.blocks])).toEqual([
        [0, 0, PYRONADO, '', 1, []],
        [1, 0, PYRONADO, 'vaporize', 2, []],
        [2, 1, BURST, '', 1, []],
        [3, 0, PYRONADO, '', 1, [{type: 'repeat', count: 3}]],
        [4, 0, PYRONADO, '', 1, [{type: 'uptime', on: true, percent: 60}]],
        [5, 0, PYRONADO, '', 1, [{type: 'uptime', on: false, percent: 40}]],
        // A branch that never happens has no stops.
        [6, 1, BURST, '', 1, [{type: 'uptime', on: true, percent: 100}]],
    ]);

    // The hits of one block share their blocks; the hits outside blocks too.
    expect(rotation.stops[0].blocks).toBe(rotation.stops[2].blocks);
    expect(rotation.stops[4].blocks).not.toBe(rotation.stops[5].blocks);
});

test("a rotation without hits has no stops", () => {
    const {team, members: [, bennett]} = makeTeam('Xiangling', 'Bennet');
    expect(stopsOf(team, []).stops).toEqual([]);
    expect(stopsOf(team, [voyage(bennett, 1)]).stops).toEqual([]);
});

test("the graph of a stop is the hit as the Rotation list shows it", () => {
    const {rotation} = xianglingRotation();
    expectGraphsEqualEngine(rotation);

    // The team is the one at the hit's point: Bennett's burst reaches the
    // second hit, and a block's steps reach only its own hits.
    const average = rotation.stops.map((stop) => rotation.graph(stop).evaluate().result.average);
    expect(average[1]).toBeGreaterThan(average[0] * 1.5);
    expect(average[3]).toBeCloseTo(average[0], 6);
    expect(average[4]).toBeCloseTo(average[0], 6);
    expect(average[5]).toBeGreaterThan(average[4]);

    // A stop has its hit's result, to name it as the Rotation list does.
    expect(rotation.stops.map((stop) => stop.result.average)).toEqual(rotation.stops.map(engineResult).map((result) => result.average));
    expect(rotation.stops.map((stop) => stop.result.nameStyle)).toEqual(new Array(7).fill('element-pyro'));
    expect(rotation.stops.map((stop) => !!stop.result.isReacted)).toEqual([false, true, false, false, false, false, false]);

    // The viewed member of a graph is the hit's.
    expect(rotation.graph(rotation.stops[2]).viewSlot).toBe(1);
    // A hit inside a block is computed as one (Feature2/Rotation/Tree.hitData).
    expect(rotation.graph(rotation.stops[0]).data.settings.inside_rotation_block).toBeFalsy();
    expect(rotation.graph(rotation.stops[3]).data.settings.inside_rotation_block).toBe(1);
});

test("every hit the Skirk team can deal has its graph", () => {
    const {team} = makeSkirkTeam();
    const items = [];
    for (const member of team.getMembers()) {
        const data = member.view().getBuildData();
        for (const feature of member.getFeaturesList({ignoreRotation: true})) {
            if (!feature.checkConditions(data) || !feature.usedInRotation()) continue;
            if (!DB.Features.Rotation.getByName(feature.getName()) || !feature.isRotationChoice()) continue;
            items.push(hit(member, feature.getName()));
        }
    }

    const rotation = stopsOf(team, items);
    expect(rotation.stops.length).toBe(items.length);
    expect(rotation.stops.length).toBeGreaterThan(40);
    expectGraphsEqualEngine(rotation);
});

test("a hit's own steps change the team for the hits after it", () => {
    const {team, members: [arlecchino]} = makeTeam('Arlecchino');
    arlecchino.setCharSettings({'common.bond_of_life': 100});
    const rotation = stopsOf(team, [hit(arlecchino, 'attack.normal_hit_1'), hit(arlecchino, 'attack.normal_hit_1')]);

    expectGraphsEqualEngine(rotation);
    // The setting is kept as the control shows it, a string.
    const bond = rotation.stops.map((stop) => Number(rotation.graph(stop).data.settings['common.bond_of_life']));
    expect(bond[0]).toBeCloseTo(100, 6);
    expect(bond[1]).toBeCloseTo(92.5, 6);
});

test("a reaction the team deals together is ranked with the team at its point", () => {
    const {team, members: [ineffa, fischl, xingqiu]} = makeTeam('Ineffa', 'Fischl', 'Xingqiu', 'Bennet');
    const control = Condition.unwrap(DB.Conditions.Character).find((cond) => cond.getName() == 'no_lunarcharged_contribution');
    const step = {
        type: 'condition', subtype: 'member', object: 'char',
        charId: xingqiu.char.getId(), itemId: xingqiu.char.getId(), conditionId: control.getId(), value: 1,
    };
    const rotation = stopsOf(team, [hit(ineffa, LUNAR_CHARGED), hit(fischl, 'attack.normal_hit_1'), step, hit(ineffa, LUNAR_CHARGED)]);

    expectGraphsEqualEngine(rotation);
    const contributors = (stop) => rotation.graph(stop).nodes.get('result').rows.map((row) => row.label.member);
    expect(contributors(rotation.stops[0])).toEqual([0, 1, 2]);
    expect(contributors(rotation.stops[2])).toEqual([0, 1]);
});

test("a source has one key at every stop: what is turned off stays off", () => {
    const {team, members: [xiangling, bennett]} = makeTeam('Xiangling', 'Bennet');
    // The switch changes nothing but makes a state of its own.
    const rotation = stopsOf(team, [voyage(bennett, 1), hit(xiangling, PYRONADO), switchTo(xiangling), hit(xiangling, PYRONADO)]);
    const [first, second] = rotation.stops.map((stop) => rotation.graph(stop));
    expect(rotation.stops[0].hit.state).not.toBe(rotation.stops[1].hit.state);

    // What Bennett gives Xiangling: the sources of his lane that can be turned off.
    const keysOf = (graph) => [...graph.nodes.values()].filter((node) => node.kind == 'source' && node.toggle && node.lane == 'slot1').map((node) => node.sourceKey);
    expect(keysOf(first).length).toBeGreaterThan(0);
    expect(keysOf(second)).toEqual(keysOf(first));

    const off = new Set(keysOf(first));
    expect(second.evaluate(off).result.average).toBeLessThan(second.evaluate().result.average * 0.7);
    expect(second.evaluate(off).result.average).toBeCloseTo(first.evaluate(off).result.average, 6);
});

test("only a compiler asked to keeps the teams of its states", () => {
    const {team, members: [xiangling, bennett]} = makeTeam('Xiangling', 'Bennet');
    team.setRotation(new Rotation({items: [hit(xiangling, PYRONADO), voyage(bennett, 1), hit(xiangling, PYRONADO)]}).clone());
    const states = (compiled) => compiled.items.filter((item) => item.type == 'state');

    expect(states(new RotationCompiler(team).compile()).map((state) => state.team)).toEqual([undefined, undefined]);

    const kept = states(new RotationCompiler(team, {keepTeams: true}).compile());
    expect(kept.length).toBe(2);
    // Each state has a team of its own, as it was then: the burst is on in the second only.
    expect(kept[0].team).not.toBe(kept[1].team);
    expect(kept[0].team).not.toBe(team);
    expect(kept.map((state) => !!state.team.getMember(1).getSettings()[VOYAGE])).toEqual([false, true]);
});
