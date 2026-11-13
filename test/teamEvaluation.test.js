import { Condition } from "../src/js/classes/Condition";
import { ConditionBoolean } from "../src/js/classes/Condition/Boolean";
import { ConditionBooleanCharElement } from "../src/js/classes/Condition/Boolean/CharElement";
import { ConditionHexereiResonance } from "../src/js/classes/Condition/HexereiResonance";
import { ConditionReceiver } from "../src/js/classes/Condition/Receiver";
import { PRIORITIES } from "../src/js/classes/PostEffect";
import { PostEffectStatsMastery } from "../src/js/classes/PostEffect/Stats/Mastery";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { partyView } from "../src/js/classes/Team/Party";
import { RECEIVERS } from "../src/js/classes/Team/Receivers";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { DB } from "../src/js/db/DB";
import { enemyOf, featureValues, finalStats, makeBuild, makeSolo, TestSource, totalMastery, withSource } from "./support/team";

global.DB = DB;

const flatMastery = (name, value) => new ConditionBoolean({name: name, stats: {mastery: value}});

describe("a team of one", () => {
    test.each(['Hutao', 'Kazuha', 'Nahida', 'Furina'])("%s on its own is evaluated in a team of one", (charKey) => {
        const build = makeBuild(charKey);
        // Only a team is evaluated.
        expect(() => build.getBuildData()).toThrow(/team/);

        // Team.solo evaluates a copy in a new team of one, as a team made
        // from the build does, and leaves the build alone.
        const solo = Team.solo(build);
        const member = makeSolo(charKey);
        expect(solo).not.toBe(build);
        expect(build.team).toBeNull();
        expect(solo.team.getMembers()).toEqual([solo]);
        expect({...solo.getBuildData().stats}).toEqual({...member.getBuildData().stats});
        expect(featureValues(solo)).toEqual(featureValues(member));

        // A member is its own solo build.
        expect(Team.solo(member)).toBe(member);
    });
});

describe("team membership", () => {
    test("members are evaluated against the team's enemy", () => {
        const a = makeBuild('Hutao');
        const b = makeBuild('Kazuha');
        const team = Team.fromMember(a);
        team.setMember(1, b);

        team.enemy.setLevels({level: 100});

        expect(enemyOf(a).enemy_level).toBe(100);
        expect(enemyOf(b).enemy_level).toBe(100);
        // Members read the enemy; it is not copied into their settings.
        expect(a.getBuildData().settings.enemy_level).toBeUndefined();
    });

    test("a character cannot be in a team twice", () => {
        const team = Team.fromMember(makeBuild('Hutao'));
        expect(() => team.setMember(1, makeBuild('Hutao'))).toThrow();
    });

    test("a removed member is on its own: its team of one has the default enemy", () => {
        const a = makeBuild('Hutao');
        const b = makeBuild('Kazuha');
        const team = Team.fromMember(a);
        team.setMember(1, b);
        team.enemy.setLevels({level: 95});

        expect(team.removeMember(1)).toBe(b);
        expect(b.team).toBeNull();
        expect(() => b.getBuildData()).toThrow(/team/);
        expect(enemyOf(Team.solo(b)).enemy_level).toBe(1);
    });

    test("each member sees the real team composition", () => {
        const a = makeBuild('Hutao');
        const b = makeBuild('Kazuha');
        const c = makeBuild('Nahida');
        const team = Team.fromMember(a);
        team.setMember(1, b);
        team.setMember(3, c);

        expect(partyView(a.getBuildData().settings).others.map((m) => m.charId)).toEqual([b.char.getId(), c.char.getId()]);
        expect(partyView(c.getBuildData().settings).others.map((m) => m.charId)).toEqual([a.char.getId(), b.char.getId()]);
    });
});

describe("delivered conditions", () => {
    function team(receivers) {
        const a = withSource(makeBuild('Hutao'), [
            new ConditionBoolean({name: 'test.buff', receivers: receivers, stats: {atk_percent: 20}}),
        ], [], {'test.buff': true});
        const b = makeBuild('Kazuha');
        const t = Team.fromMember(a);
        t.setMember(1, b);
        return {a, b};
    }

    function atkPercent(build) {
        return build.getBuildData().stats.get('atk_percent');
    }

    test("self reaches only the source", () => {
        const {a, b} = team(RECEIVERS.SELF);
        const baseA = atkPercent(makeSolo('Hutao'));
        const baseB = atkPercent(makeSolo('Kazuha'));
        expect(atkPercent(a) - baseA).toBeCloseTo(0.2, 10);
        expect(atkPercent(b) - baseB).toBeCloseTo(0, 10);
    });

    test("team reaches every member", () => {
        const {a, b} = team(RECEIVERS.TEAM);
        expect(atkPercent(a) - atkPercent(makeSolo('Hutao'))).toBeCloseTo(0.2, 10);
        expect(atkPercent(b) - atkPercent(makeSolo('Kazuha'))).toBeCloseTo(0.2, 10);
    });

    test("others reaches every member except the source", () => {
        const {a, b} = team(RECEIVERS.OTHERS);
        expect(atkPercent(a) - atkPercent(makeSolo('Hutao'))).toBeCloseTo(0, 10);
        expect(atkPercent(b) - atkPercent(makeSolo('Kazuha'))).toBeCloseTo(0.2, 10);
    });

    test("the toggle is read from the source, not the receiver", () => {
        const {a, b} = team(RECEIVERS.OTHERS);
        a.static.modifySettings({'test.buff': false});
        b.static = new TestSource([], [], {'test.buff': true});

        expect(atkPercent(b) - atkPercent(makeSolo('Kazuha'))).toBeCloseTo(0, 10);
    });

    test("receiver scope conditions read the receiver", () => {
        const a = withSource(makeBuild('Kazuha'), [
            new ConditionBoolean({
                name: 'test.pyro_buff',
                receivers: RECEIVERS.TEAM,
                condition: new ConditionReceiver({
                    condition: new ConditionBooleanCharElement({element: ['pyro']}),
                }),
                stats: {dmg_pyro: 15},
            }),
        ], [], {'test.pyro_buff': true});
        const b = makeBuild('Hutao');
        const t = Team.fromMember(a);
        t.setMember(1, b);

        expect(a.getBuildData().stats.get('dmg_pyro')).toBeCloseTo(makeSolo('Kazuha').getBuildData().stats.get('dmg_pyro'), 10);
        expect(b.getBuildData().stats.get('dmg_pyro') - makeSolo('Hutao').getBuildData().stats.get('dmg_pyro')).toBeCloseTo(0.15, 10);
    });

    test("derived settings of a delivered condition reach the receiver", () => {
        const a = withSource(makeBuild('Kazuha'), [
            new ConditionBoolean({name: 'test.flag', receivers: RECEIVERS.OTHERS, settings: {test_received_flag: 1}}),
        ], [], {'test.flag': true});
        const b = makeBuild('Hutao');
        const t = Team.fromMember(a);
        t.setMember(1, b);

        expect(b.getBuildData().settings.test_received_flag).toBe(1);
        expect(a.getBuildData().settings.test_received_flag).toBeUndefined();
    });
});

describe("staged post-effects across members", () => {
    // A gives the others 20% of its Elemental Mastery as Elemental Mastery.
    const shareMastery = (priority) => new PostEffectStatsMastery({
        receivers: RECEIVERS.OTHERS,
        percent: new StatTable('mastery', [0.2]),
        priority: priority,
        conditions: [new ConditionBoolean({name: 'test.share_mastery'})],
    });

    // B gives the others 0.04% DMG Bonus per point of its Elemental Mastery.
    const masteryToDamage = (priority) => new PostEffectStatsMastery({
        receivers: RECEIVERS.OTHERS,
        percent: new StatTable('dmg_all', [0.04]),
        priority: priority,
        conditions: [new ConditionBoolean({name: 'test.mastery_to_damage'})],
    });

    function makeTeam(sharePriority, damagePriority) {
        const a = withSource(makeBuild('Hutao'), [flatMastery('test.a_mastery', 300)], [shareMastery(sharePriority)], {
            'test.a_mastery': true,
            'test.share_mastery': true,
        });
        const b = withSource(makeBuild('Kazuha'), [flatMastery('test.b_mastery', 500)], [masteryToDamage(damagePriority)], {
            'test.b_mastery': true,
            'test.mastery_to_damage': true,
        });
        const team = Team.fromMember(a);
        team.setMember(1, b);
        return {a, b};
    }

    test("a source read uses the source member's stats", () => {
        const {a, b} = makeTeam(PRIORITIES.STAT_LOCAL, PRIORITIES.STAT_GLOBAL);

        const bStage0 = b.getBuildData().stats;
        const aStats = finalStats(a);
        const aBase = finalStats(withSource(makeSolo('Hutao'), [flatMastery('test.a_mastery', 300)], [], {'test.a_mastery': true}));

        // B's EM at STAT_GLOBAL includes A's STAT_LOCAL share: a chain A -> B -> A.
        const bMastery = totalMastery(bStage0) + 0.2 * totalMastery(a.getBuildData().stats);
        expect(aStats.get('dmg_all') - aBase.get('dmg_all')).toBeCloseTo(0.0004 * bMastery, 10);
    });

    test("an effect does not see effects of its own stage", () => {
        const {a, b} = makeTeam(PRIORITIES.STAT_GLOBAL, PRIORITIES.STAT_GLOBAL);

        const aStats = finalStats(a);
        const aBase = finalStats(withSource(makeSolo('Hutao'), [flatMastery('test.a_mastery', 300)], [], {'test.a_mastery': true}));

        expect(aStats.get('dmg_all') - aBase.get('dmg_all')).toBeCloseTo(0.0004 * totalMastery(b.getBuildData().stats), 10);
    });

    test("teammate stats are namespaced by slot in the viewed member's program", () => {
        const {a, b} = makeTeam(PRIORITIES.STAT_LOCAL, PRIORITIES.STAT_GLOBAL);

        const fromA = finalStats(a);
        const fromB = finalStats(b);

        expect(fromA.get('m2__mastery')).toBeCloseTo(fromB.get('mastery'), 10);
        expect(fromB.get('m1__dmg_all')).toBeCloseTo(fromA.get('dmg_all'), 10);
        expect(totalMastery(fromB) - totalMastery(b.getBuildData().stats)).toBeCloseTo(0.2 * totalMastery(a.getBuildData().stats), 10);
    });

    test("delivered post-effects change the receiver's damage", () => {
        const {a} = makeTeam(PRIORITIES.STAT_LOCAL, PRIORITIES.STAT_GLOBAL);
        const alone = withSource(makeSolo('Hutao'), [flatMastery('test.a_mastery', 300)], [], {'test.a_mastery': true});

        const inTeam = featureValues(a);
        const solo = featureValues(alone);
        const increased = Object.keys(solo).filter((key) => inTeam[key][0] > solo[key][0] + 1e-9);

        expect(increased.length).toBeGreaterThan(0);
    });
});

test("a rotation copy keeps the teammates", () => {
    const a = makeBuild('Hutao');
    const b = makeBuild('Kazuha');
    const team = Team.fromMember(a);
    team.setMember(2, b);

    const copy = b.cloneWithArtifactSettings();

    expect(copy).not.toBe(b);
    expect(copy.team).not.toBe(team);
    expect(copy.team.slotOf(copy)).toBe(2);
    expect(copy.team.getMember(0).char.getId()).toBe(a.char.getId());
    expect({...finalStats(copy)}).toEqual({...finalStats(b)});
});

describe("delivered multipliers", () => {
    const flatDamage = () => new FeatureMultiplier({
        scaling: 'atk*',
        values: new StatTable('test_flat_damage', [50]),
        receivers: RECEIVERS.OTHERS,
        condition: new ConditionBoolean({name: 'test.flat_damage'}),
    });

    function makeTeam(enabled) {
        const a = makeBuild('Hutao');
        a.static = new TestSource([], [], {'test.flat_damage': enabled}, [flatDamage()]);
        const b = makeBuild('Kazuha');
        const team = Team.fromMember(a);
        team.setMember(1, b);
        return {a, b};
    }

    function delivered(build) {
        return build.getBuildData().multipliers.filter((item) => item.getName && item.getName() == 'test_flat_damage');
    }

    test("a multiplier reaches others only while its source enables it", () => {
        expect(delivered(makeTeam(true).a).length).toBe(0);
        expect(delivered(makeTeam(true).b).length).toBe(1);
        expect(delivered(makeTeam(false).b).length).toBe(0);
    });

    test("a delivered multiplier scales on its source's stats", () => {
        const {a, b} = makeTeam(true);
        const data = b.getBuildData();
        const [item] = delivered(b);

        const value = item.getTree(data).execute(data);
        const sourceStats = a.getBuildData().stats;
        const sourceAtk = sourceStats.get('atk_base') * (1 + sourceStats.get('atk_percent')) + sourceStats.get('atk');

        expect(value).toBeCloseTo(0.5 * sourceAtk, 6);
    });

    test("a delivered multiplier raises the receiver's damage", () => {
        const {b} = makeTeam(true);
        const alone = makeSolo('Kazuha');

        const inTeam = featureValues(b);
        const solo = featureValues(alone);
        const increased = Object.keys(solo).filter((key) => inTeam[key] && inTeam[key][0] > solo[key][0] + 1e-9);

        expect(increased.length).toBeGreaterThan(0);
    });
});

test("a condition with an unknown receivers value is rejected", () => {
    const a = withSource(makeSolo('Hutao'), [new Condition({receivers: 'everyone', stats: {atk: 1}})], [], {});
    expect(() => a.getBuildData()).toThrow(/receivers/);
});

describe("Hexerei in a team", () => {
    const resonance = new ConditionHexereiResonance({});

    function hexereiMember(charKey, on) {
        const build = makeBuild(charKey);
        const name = build.char.get().name;
        build.setCharSettings({[name + '_witch_homework']: on});
        return build;
    }

    test("counts members whose own Witch's Homework is on", () => {
        const durin = hexereiMember('Durin', true);
        const venti = hexereiMember('Venti', true);
        const team = Team.fromMember(durin);
        team.setMember(1, venti);
        team.setMember(2, makeBuild('Hutao'));

        for (const member of team.getMembers()) {
            expect(resonance.isActive(member.getBuildData().settings)).toBe(true);
        }

        venti.setCharSettings({venti_witch_homework: false});
        expect(resonance.isActive(durin.getBuildData().settings)).toBe(false);
    });

    test("typed-in party toggles do not count in a team", () => {
        const durin = hexereiMember('Durin', true);
        const venti = hexereiMember('Venti', false);
        const team = Team.fromMember(durin);
        team.setMember(1, venti);
        durin.modifyBuffsSettings({'party.venti_witch_homework': true});

        expect(resonance.isActive(durin.getBuildData().settings)).toBe(false);
    });
});
