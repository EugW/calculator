import { Condition } from "../src/js/classes/Condition";
import { ConditionBoolean } from "../src/js/classes/Condition/Boolean";
import { PostEffectStatsMastery } from "../src/js/classes/PostEffect/Stats/Mastery";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { RECEIVERS } from "../src/js/classes/Team/Receivers";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, makeSolo, stackKeys, stackSource, withSource } from "./support/team";

global.DB = DB;

// A whole effect that cannot stack, like Noblesse Oblige 4pc.
const noblesse = () => new ConditionBoolean({
    name: 'test.noblesse',
    receivers: RECEIVERS.TEAM,
    stack: 'test_noblesse',
    stats: {atk_percent: 20},
});

// Effects with one non-stacking part, like Elegy for the End and Song of
// Broken Pines: the ATK% parts share a key, the other parts stack.
const millennialEffect = (toggle, atkPercent, otherStats) => {
    const isOn = new ConditionBoolean({name: toggle});
    return [
        new ConditionBoolean({name: toggle}),
        new Condition({receivers: RECEIVERS.TEAM, condition: isOn, stats: otherStats}),
        new Condition({receivers: RECEIVERS.TEAM, condition: isOn, stack: 'test_millennial_atk', stats: {atk_percent: atkPercent}}),
    ];
};

function atkPercentGain(build, charKey) {
    return build.getBuildData().stats.get('atk_percent') - makeSolo(charKey).getBuildData().stats.get('atk_percent');
}

describe("a whole effect with a stack key", () => {
    function makeTeam() {
        const a = withSource(makeBuild('Hutao'), [noblesse()], [], {'test.noblesse': true});
        const b = withSource(makeBuild('Kazuha'), [noblesse()], [], {'test.noblesse': true});
        const team = Team.fromMember(a);
        team.setMember(1, b);
        return {team, a, b};
    }

    test("the earliest slot supplies it by default", () => {
        const {team, a} = makeTeam();

        expect(stackKeys(team)).toEqual(['test_noblesse']);
        expect(stackSource(team, 'test_noblesse')).toBe(a);
        expect(team.stackSources().sources.get('test_noblesse')).toEqual(new Set([a]));
    });

    test("the team receives the effect once", () => {
        const {a, b} = makeTeam();

        expect(atkPercentGain(a, 'Hutao')).toBeCloseTo(0.2, 10);
        expect(atkPercentGain(b, 'Kazuha')).toBeCloseTo(0.2, 10);
    });

    test("a chosen source supplies it", () => {
        const {team, a, b} = makeTeam();

        team.setStackSource('test_noblesse', b);

        expect(stackSource(team, 'test_noblesse')).toBe(b);
        expect(atkPercentGain(a, 'Hutao')).toBeCloseTo(0.2, 10);
        expect(team.stackSources().sources.get('test_noblesse')).toEqual(new Set([b]));
    });

    test("choosing nobody turns it off, and the choice stays listed", () => {
        const {team, a, b} = makeTeam();

        team.setStackSource('test_noblesse', null);

        expect(stackSource(team, 'test_noblesse')).toBeNull();
        expect(atkPercentGain(a, 'Hutao')).toBeCloseTo(0, 10);
        expect(atkPercentGain(b, 'Kazuha')).toBeCloseTo(0, 10);
    });

    test("a member that is not a source cannot be chosen", () => {
        const {team} = makeTeam();
        const c = makeBuild('Xingqiu');
        team.setMember(2, c);

        expect(() => team.setStackSource('test_noblesse', c)).toThrow();
    });

    test("when the source leaves, the other one supplies it", () => {
        const {team, b} = makeTeam();
        team.removeMember(0);

        expect(atkPercentGain(b, 'Kazuha')).toBeCloseTo(0.2, 10);
        expect(stackKeys(team)).toEqual([]);
    });

    test("a chosen source that leaves falls back to the earliest slot, and supplies it again when it returns", () => {
        const {team, a, b} = makeTeam();
        team.setStackSource('test_noblesse', b);

        team.removeMember(1);
        expect(atkPercentGain(a, 'Hutao')).toBeCloseTo(0.2, 10);

        team.setMember(1, b);
        expect(stackSource(team, 'test_noblesse')).toBe(b);
    });

    test("turning a later source on leaves the earliest slot supplying it", () => {
        const a = withSource(makeBuild('Hutao'), [noblesse()], [], {'test.noblesse': true});
        const b = withSource(makeBuild('Kazuha'), [noblesse()], [], {'test.noblesse': false});
        const team = Team.fromMember(a);
        team.setMember(1, b);
        expect(stackKeys(team)).toEqual([]);

        b.static.settings['test.noblesse'] = true;

        expect(stackSource(team, 'test_noblesse')).toBe(a);
        expect(atkPercentGain(a, 'Hutao')).toBeCloseTo(0.2, 10);
    });

    test("results do not depend on what was read first", () => {
        const {team, a} = makeTeam();
        const evaluation = team.evaluate();

        const before = evaluation.member(a).memberData().stats.get('atk_percent');
        evaluation.collectStackSources();
        expect(evaluation.member(a).memberData().stats.get('atk_percent')).toBe(before);
    });

    test("a member on its own supplies it", () => {
        const {team, b} = makeTeam();
        team.removeMember(1);

        Team.fromMember(b);
        expect(atkPercentGain(b, 'Kazuha')).toBeCloseTo(0.2, 10);
    });

    test("a rotation copy keeps the choice", () => {
        const {team, b} = makeTeam();
        team.setStackSource('test_noblesse', b);
        const copy = b.cloneWithArtifactSettings();

        expect(copy.team.stackChoices).toEqual({test_noblesse: b.char.getId()});
    });
});

describe("a stack key on one part of an effect", () => {
    function makeTeam() {
        const a = withSource(makeBuild('Hutao'), millennialEffect('test.elegy', 20, {mastery: 100}), [], {'test.elegy': true});
        const b = withSource(makeBuild('Kazuha'), millennialEffect('test.pines', 10, {atk_speed: 12}), [], {'test.pines': true});
        const team = Team.fromMember(a);
        team.setMember(1, b);
        return {team, a, b};
    }

    test("only the conflicting part yields", () => {
        const {team, a} = makeTeam();

        expect(stackKeys(team)).toEqual(['test_millennial_atk']);

        const stats = a.getBuildData().stats;
        const base = makeSolo('Hutao').getBuildData().stats;
        expect(stats.get('atk_percent') - base.get('atk_percent')).toBeCloseTo(0.2, 10);
        expect(stats.get('mastery') - base.get('mastery')).toBeCloseTo(100, 10);
        expect(stats.get('atk_speed') - base.get('atk_speed')).toBeCloseTo(0.12, 10);
    });

    test("the chosen source's value applies", () => {
        const {team, a, b} = makeTeam();
        team.setStackSource('test_millennial_atk', b);

        expect(atkPercentGain(a, 'Hutao')).toBeCloseTo(0.1, 10);
        expect(atkPercentGain(b, 'Kazuha')).toBeCloseTo(0.1, 10);
    });
});

test("post-effects with a stack key follow the same rule", () => {
    const share = () => new PostEffectStatsMastery({
        receivers: RECEIVERS.TEAM,
        stack: 'test_share',
        percent: new StatTable('dmg_all', [0.04]),
        conditions: [new ConditionBoolean({name: 'test.share'})],
    });

    const a = withSource(makeBuild('Hutao'), [], [share()], {'test.share': true});
    const b = withSource(makeBuild('Kazuha'), [], [share()], {'test.share': true});
    const team = Team.fromMember(a);

    team.setMember(1, b);

    expect(stackKeys(team)).toEqual(['test_share']);

    const stats = finalStats(a);
    const aMastery = a.getBuildData().stats.get('mastery_base') + a.getBuildData().stats.get('mastery');
    const alone = finalStats(makeSolo('Hutao'));
    expect(stats.get('dmg_all') - alone.get('dmg_all')).toBeCloseTo(0.0004 * aMastery, 10);
});
