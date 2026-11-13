import { CalcSet } from "../src/js/classes/CalcSet";
import { DamageGraph } from "../src/js/classes/DamageGraph";
import { Serializer } from "../src/js/classes/Serializer";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import released from "./fixtures/public-main-builds.json";
import { makeSkirkTeam } from "./support/skirkTeam";

global.DB = DB;

const FEATURE = 'attack.normal_hit_1';
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

function expectResult(actual, expected) {
    for (const name of ['normal', 'crit', 'average']) {
        if (!close(actual[name], expected[name])) {
            throw new Error(`${name}: graph ${actual[name]}, engine ${expected[name]}`);
        }
    }
}

/**
 * @param {CalcSet} member
 * @returns {Array.<string>} the member's features with details, as the Details dropdown lists them
 */
function detailFeatures(member) {
    const view = member.view();
    return Object.keys(view.getFeaturesHash(view.getBuildData(), {checkCallback: (feature) => feature.hasDetails()}));
}

function engineResult(member, name) {
    return member.calcFeatures()[name];
}

const sourceNode = (graph, predicate) => [...graph.nodes.values()].find((node) => node.kind == 'source' && predicate(node.source));

test("the Skirk graph joins her formula with the whole team's sources", () => {
    const {skirk, citlali, escoffier} = makeSkirkTeam();
    const graph = new DamageGraph(skirk.view(), FEATURE);
    const {result, values} = graph.evaluate();
    expectResult(result, engineResult(skirk, FEATURE));

    // Escoffier's C2 is a term of Skirk's base damage in Escoffier's lane,
    // reading Escoffier's ATK, which Citlali's Thrilling Tales raises.
    const c2 = [...graph.nodes.values()].find((node) => node.kind == 'term' && node.sourceKey?.startsWith('multiplier:1:'));
    expect(c2.lane).toBe('slot1');
    const atk = graph.nodes.get('total:m2__atk*');
    expect(c2.rows.some((row) => row.from == atk.id)).toBe(true);
    const heritage = sourceNode(graph, (source) => source.member === citlali && source.object == 'weapon');
    expect(heritage.lane).toBe('slot3');
    expect(atk.rows.find((row) => row.from == heritage.id).parts).toEqual([{stat: 'm2__atk_percent', value: 0.48}]);
    expect(values.get(atk.id)).toBeCloseTo(856.41461 * (1 + 1.7093) + 346.015, 6);

    // Escoffier's A4 lowers the enemy's RES: an input of the RES factor.
    const shred = sourceNode(graph, (source) => source.member === escoffier && source.object == 'char' && source.item?.params?.levelSetting);
    const res = [...graph.nodes.values()].find((node) => node.rows.some((row) => row.from == shred.id));
    expect(res.kind).toBe('factor');
    expect(values.get(res.id)).toBeCloseTo(1.225, 10);

    // Lanes are the members in slot order, then the team and the enemy.
    expect(graph.lanes.map((lane) => lane.id)).toEqual(['slot0', 'slot1', 'slot2', 'slot3', 'team', 'enemy']);
    expect(graph.lanes[0].viewed).toBe(true);
});

test("every stat of the program is the sum of its contributions", () => {
    const {skirk} = makeSkirkTeam();
    const graph = new DamageGraph(skirk.view(), FEATURE);
    const final = graph.contributions.final;
    for (const [stat, value] of Object.entries(final)) {
        if (typeof value != 'number') continue;
        const sum = graph.contributions.of(stat).reduce((total, item) => total + item.value, 0);
        if (!close(sum, value)) throw new Error(`${stat}: contributions ${sum}, stats ${value}`);
    }
});

test("turning sources off matches the engine with those effects off", () => {
    const {skirk, citlali, escoffier, furina} = makeSkirkTeam();
    const graph = new DamageGraph(skirk.view(), FEATURE);
    const heritage = sourceNode(graph, (source) => source.member === citlali && source.object == 'weapon');
    const fanfare = [...graph.nodes.values()].find((node) => node.kind == 'source' && node.source.kind == 'post' && node.source.member === furina);
    const c2 = [...graph.nodes.values()].find((node) => node.kind == 'term' && node.toggle);

    const off = graph.evaluateResult(new Set([heritage.sourceKey, fanfare.sourceKey, c2.sourceKey]));

    citlali.setWeaponSettings({weapon_thrilling_tales: false});
    furina.setCharSettings({furina_fanfare_stacks: 0});
    escoffier.setCharSettings({escoffier_fresh_fragrant_stew_is_an_art: false});
    expectResult(off, engineResult(skirk, FEATURE));
});

test("impact of a source is relative to the current state", () => {
    const {skirk, citlali} = makeSkirkTeam();
    const graph = new DamageGraph(skirk.view(), FEATURE);
    const heritage = sourceNode(graph, (source) => source.member === citlali && source.object == 'weapon');
    const impact = graph.impact(heritage.sourceKey, new Set());
    expect(impact.turningOn).toBe(false);
    expect(impact.normal).toBeLessThan(0);
    expect(impact.average).toBeCloseTo(impact.normal, 10);
    const back = graph.impact(heritage.sourceKey, new Set([heritage.sourceKey]));
    expect(back.turningOn).toBe(true);
    expect((1 + impact.normal) * (1 + back.normal)).toBeCloseTo(1, 10);
});

test("build parts and toggles: objects are fixed, effects can be turned off", () => {
    const {skirk} = makeSkirkTeam();
    const graph = new DamageGraph(skirk.view(), FEATURE);
    for (const node of graph.nodes.values()) {
        if (node.kind != 'source') continue;
        expect(node.toggle).toBe(node.source.kind != 'object' && !(node.source.kind == 'enemy' && !node.source.item));
        expect(node.group == 'build').toBe(node.source.kind == 'object' && ['char', 'weapon', 'artifacts'].includes(node.source.object));
    }
});

test.each([0, 1, 2, 3])("Skirk team slot %i: every feature with details matches the engine", (slot) => {
    const {team} = makeSkirkTeam();
    const member = team.getMember(slot);
    const names = detailFeatures(member);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
        const graph = new DamageGraph(member.view(), name);
        expectResult(graph.evaluate().result, engineResult(member, name));
    }
});

test.each(Object.entries(released.fixtures))("released %s: every feature with details matches the engine", (_, fixture) => {
    const team = Team.fromMember(CalcSet.deserialize(Serializer.unpack(fixture.packed)));
    for (const member of team.getMembers()) {
        for (const name of detailFeatures(member)) {
            const graph = new DamageGraph(member.view(), name);
            expectResult(graph.evaluate().result, engineResult(member, name));
        }
    }
});

test("a member's build is one node unless its lane is expanded", () => {
    const {skirk} = makeSkirkTeam();
    const graph = new DamageGraph(skirk.view(), FEATURE);

    const collapsed = graph.view();
    const build = collapsed.nodes.find((node) => node.id == 'build:slot0');
    expect(build.parts.map((part) => part.source.object)).toEqual(['char', 'weapon', 'artifacts']);
    const atk = collapsed.nodes.find((node) => node.id == 'total:atk*');
    const row = atk.rows.find((item) => item.from == build.id);
    expect(atk.rows).toHaveLength(1);
    expect(Object.fromEntries(row.parts.map((part) => [part.stat, part.value]))).toEqual({
        atk_base: 358.76757 + 674.3345459999999, atk_percent: 0.81575, atk: 363.52,
    });
    expect(collapsed.edges.filter((edge) => edge.to == atk.id)).toEqual([{id: 'e:' + row.id, from: build.id, to: atk.id, row: row.id}]);
    expect(collapsed.nodes.some((node) => node.id == 'source:object:0:char')).toBe(false);

    const expanded = graph.view(new Set(['slot0']));
    expect(expanded.nodes.some((node) => node.id == 'build:slot0')).toBe(false);
    expect(expanded.nodes.find((node) => node.id == 'total:atk*').rows).toHaveLength(3);
    // Escoffier's lane stays collapsed.
    expect(expanded.nodes.some((node) => node.id == 'build:slot1')).toBe(true);
});

test("a heal has one value and no crit factors", () => {
    const {escoffier} = makeSkirkTeam();
    const graph = new DamageGraph(escoffier.view(), 'burst.heal');
    expect(graph.hasCrit).toBe(false);
    expect(graph.nodes.has('factor:critRate')).toBe(false);
    expectResult(graph.evaluate().result, engineResult(escoffier, 'burst.heal'));
});
