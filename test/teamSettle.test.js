import { Condition } from "../src/js/classes/Condition";
import { ConditionBoolean } from "../src/js/classes/Condition/Boolean";
import { Team } from "../src/js/classes/Team";
import { VirtualCharacter } from "../src/js/classes/Team/Legacy";
import { RECEIVERS } from "../src/js/classes/Team/Receivers";
import { DB } from "../src/js/db/DB";
import { checkPairs, keptFromEarlyRounds } from "./support/settle";
import { makeBuild, makeSolo, withSource } from "./support/team";

global.DB = DB;

/**
 * How a source's settings settle (TeamEvaluation.resolveSettings,
 * resolveAlone): a source nobody delivers to takes the same rounds as one
 * that is delivered to, and an evaluation says whether it settled
 * (isSettled). The database is checked in teamSettleOwn.test.js and
 * teamSettlePairs*.test.js.
 */

const stage0 = (member) => member.team.evaluate().resolveFull(member);

/** A delivery that is declared and gives nothing: its receivers take rounds. */
const declaredDelivery = () => new ConditionBoolean({name: 'test_declared_delivery', receivers: RECEIVERS.OTHERS, stats: {}});

function pair(first, second) {
    Team.fromMember(first).setMember(1, second);
    return first;
}

function kaveh(constellation) {
    const build = makeBuild('Kaveh');
    build.setCharLevels({level: 90, ascension: 6, constellation});
    build.setCharSettings({kaveh_painted_dome: true});
    return build;
}

describe("a member's own numbers do not depend on what its teammates deliver", () => {
    // Painted Dome's Dendro Core bonus scales with the burst's level, and
    // C3 ("Increases the Level of Painted Dome by 3") comes after it in
    // Kaveh's conditions: the bonus is the one of level 13 (58.41%), with
    // C4's 60% on top from C4 on. One pass in order read level 10 (49.48%),
    // as the released calculator does.
    const table = () => DB.Chars.get('Kaveh').talents.get('burst.kaveh_bloom_dmg_bonus');
    const rupture = (member) => stage0(member).stats.get('dmg_reaction_rupture');

    test.each([3, 4, 6])("Kaveh C%i: Painted Dome at the level his C3 gives, alone and in a team", (constellation) => {
        expect(table().getValue(10)).toBeCloseTo(49.48, 10);
        expect(table().getValue(13)).toBeCloseTo(58.41, 10);
        const own = table().getValue(13) + (constellation >= 4 ? 60 : 0);

        const alone = kaveh(constellation);
        Team.fromMember(alone);
        expect(rupture(alone)).toBeCloseTo(own, 10);

        // A teammate that delivers nothing, and what it receives from him.
        const plain = makeBuild('Amber');
        const first = pair(kaveh(constellation), plain);
        expect(first.team.evaluate().deliveredConditions(plain)).toEqual([]);
        expect(rupture(first)).toBeCloseTo(own, 10);
        expect(rupture(plain)).toBeCloseTo(table().getValue(13), 10);

        // A teammate that declares a delivery.
        const delivering = withSource(makeBuild('Amber'), [declaredDelivery()]);
        const second = pair(kaveh(constellation), delivering);
        expect(rupture(second)).toBeCloseTo(own, 10);
        expect(rupture(delivering)).toBeCloseTo(table().getValue(13), 10);
    });

    test("Kaveh before C3 has the bonus of his burst's own level", () => {
        const alone = kaveh(2);
        Team.fromMember(alone);
        expect(rupture(alone)).toBeCloseTo(table().getValue(10), 10);
    });

    test("a condition sees what a later condition of its member derives, whoever its teammates are", () => {
        const conditions = () => [
            new ConditionBoolean({name: 'test_late_setting', stats: {atk: 100}}),
            new Condition({settings: {test_late_setting: 1}}),
        ];
        const atk = (member) => stage0(member).stats.get('atk');

        const alone = withSource(makeSolo('Amber'), conditions());
        expect(atk(alone) - atk(makeSolo('Amber'))).toBeCloseTo(100, 10);
        expect(alone.team.evaluate().isSettled()).toBe(true);

        // A teammate that delivers nothing, and one that declares a delivery.
        const plain = pair(makeBuild('Amber'), makeBuild('Lisa'));
        const inert = pair(withSource(makeBuild('Amber'), conditions()), makeBuild('Lisa'));
        const delivered = pair(withSource(makeBuild('Amber'), conditions()),
            withSource(makeBuild('Lisa'), [declaredDelivery()]));
        expect(atk(inert) - atk(plain)).toBeCloseTo(100, 10);
        expect({...stage0(delivered).stats}).toEqual({...stage0(inert).stats});
        expect({...stage0(delivered).settings}).toEqual({...stage0(inert).settings});
    });

    test("a legacy entry settles the same way: what it delivers follows its settled settings", () => {
        const withEntry = (conditions) => {
            const member = makeSolo('Amber');
            const entry = new VirtualCharacter(DB.Chars.get('Lisa'));
            entry.char.getConditions = () => conditions;
            member.team.addLegacy(entry);
            return member;
        };
        const late = new Condition({settings: {test_late_setting: 1}});
        const delivery = new ConditionBoolean({name: 'test_derived', receivers: RECEIVERS.OTHERS, stats: {atk: 100}});
        // What the entry delivers needs a setting its first condition
        // derives from one its second condition derives.
        const derived = new Condition({
            settings: {test_derived: 1}, subConditions: [new ConditionBoolean({name: 'test_late_setting'})],
        });

        const without = withEntry([late, delivery]);
        const member = withEntry([derived, late, delivery]);
        expect(stage0(member).stats.get('atk') - stage0(without).stats.get('atk')).toBeCloseTo(100, 10);
        expect(member.team.evaluate().isSettled()).toBe(true);
    });
});

describe("an evaluation says whether it settled", () => {
    const when = (name, settings, invert = false) => new Condition({
        settings, subConditions: [new ConditionBoolean({name, invert})],
    });
    const to = (name, settings, invert = false) => new Condition({
        receivers: RECEIVERS.OTHERS, settings, subConditions: [new ConditionBoolean({name, invert})],
    });
    // The first gives p unless it has q; the second gives q while it has p.
    const contradiction = () => [
        withSource(makeBuild('Amber'), [to('test_q', {test_p: 0}), to('test_q', {test_p: 1}, true)]),
        withSource(makeBuild('Lisa'), [to('test_p', {test_q: 1}), to('test_p', {test_q: 0}, true)]),
    ];

    test("teams settle", () => {
        const members = ['Xiangling', 'Bennet', 'Xingqiu', 'Kazuha'].map(makeBuild);
        const team = Team.fromMember(members[0]);
        members.slice(1).forEach((member, index) => team.setMember(index + 1, member));
        expect(team.evaluate().isSettled()).toBe(true);
        expect(team.evaluate().traced().isSettled()).toBe(true);
        expect(makeSolo('Hutao').team.evaluate().isSettled()).toBe(true);
    });

    test("a member whose own conditions contradict each other does not", () => {
        // a follows b, and b is the opposite of a: no state holds.
        const member = withSource(makeSolo('Amber'), [
            when('test_b', {test_a: 1}),
            when('test_b', {test_a: 0}, true),
            when('test_a', {test_b: 0}),
            when('test_a', {test_b: 1}, true),
        ]);
        const evaluation = member.team.evaluate();
        expect(evaluation.isSettled()).toBe(false);
        expect(evaluation.traced().isSettled()).toBe(false);
        // It keeps its last round and is still read.
        expect(evaluation.resolveFull(member).stats.get('atk_base')).toBeGreaterThan(0);
        expect(member.getBuildData().stats.get('atk_base')).toBeGreaterThan(0);
    });

    test("members whose deliveries contradict each other do not", () => {
        const [first, second] = contradiction();
        pair(first, second);
        const evaluation = first.team.evaluate();
        expect(evaluation.isSettled()).toBe(false);
        expect(evaluation.resolveFull(first).stats.get('atk_base')).toBeGreaterThan(0);

        // Without the contradiction the same two members settle.
        second.static.conditions = [to('test_p', {test_q: 1})];
        expect(first.team.evaluate().isSettled()).toBe(true);
    });

    test("the settle suites report a team that does not settle", () => {
        const [first, second] = contradiction();
        expect(checkPairs([['contradiction', first, second]])).toEqual({teams: 1, unsettled: ['contradiction'], kept: {}});
        // The builds are on their own again.
        expect(first.team).toBeNull();
        expect(second.team).toBeNull();
    });
});

/**
 * A known limit. A round starts from the settings of the one before, and an
 * inactive condition gives no settings back: a setting one round derived
 * stays after its cause is gone. Stats are built anew every round and do not
 * stay. No team of the database has such a setting; the settle suites look
 * for one (support/settle.keptFromEarlyRounds).
 */
describe("a derived setting whose cause is gone", () => {
    // The giver delivers s and 100 ATK unless it has q, and the other
    // member delivers q: once the rounds settle the giver has q and
    // delivers nothing.
    const members = () => [
        withSource(makeBuild('Amber'), [new Condition({
            receivers: RECEIVERS.OTHERS,
            settings: {test_s: 1},
            stats: {atk: 100},
            subConditions: [new ConditionBoolean({name: 'test_q', invert: true})],
        })]),
        withSource(makeBuild('Lisa'), [new Condition({receivers: RECEIVERS.OTHERS, settings: {test_q: 1}})]),
    ];

    test("the setting stays, its stats do not", () => {
        const [giver, other] = members();
        pair(giver, other);
        const evaluation = giver.team.evaluate();
        expect(evaluation.isSettled()).toBe(true);
        expect(evaluation.resolveFull(giver).settings.test_q).toBe(1);

        const plain = pair(makeBuild('Amber'), withSource(makeBuild('Lisa'), []));
        expect(evaluation.resolveFull(other).stats.get('atk')).toBeCloseTo(stage0(plain.team.getMember(1)).stats.get('atk'), 10);
        // The limit: the first round delivered it, and nothing removes it.
        expect(evaluation.resolveFull(other).settings.test_s).toBe(1);
    });

    test("the settle suites find it", () => {
        const [giver, other] = members();
        pair(giver, other);
        const evaluation = giver.team.evaluate();
        expect(keptFromEarlyRounds(evaluation, giver)).toEqual([]);
        expect(keptFromEarlyRounds(evaluation, other)).toEqual(['test_s']);

        const [first, second] = members();
        const result = checkPairs([['kept', first, second]]);
        expect(result.unsettled).toEqual([]);
        expect(Object.values(result.kept)).toEqual([['test_s']]);
    });
});
