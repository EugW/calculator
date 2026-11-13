import { Condition } from "../src/js/classes/Condition";
import { ConditionBoolean } from "../src/js/classes/Condition/Boolean";
import { ConditionBooleanValue } from "../src/js/classes/Condition/Boolean/Value";
import { ConditionLevels } from "../src/js/classes/Condition/Levels";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { PostEffectStats } from "../src/js/classes/PostEffect/Stats";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { RECEIVERS } from "../src/js/classes/Team/Receivers";
import { DB } from "../src/js/db/DB";
import { featureValues, finalStats, makeBuild, withSource } from "./support/team";

global.DB = DB;

describe("received talent levels feed outgoing effects", () => {
    test.each([0, 3])("Skirk raises Shenhe's delivered Icy Quill at C%i", (constellation) => {
        const shenhe = makeBuild('Shenhe');
        shenhe.setCharLevels({level: 90, ascension: 6, constellation});
        shenhe.setCharSkills({attack: 10, elemental: 9, burst: 10});
        shenhe.setCharSettings({shenhe_icy_quill: true});
        const skirk = makeBuild('Skirk');
        skirk.setCharSettings({skirk_mutual_weapons_mentorship: true});
        const receiver = makeBuild('Ayaka');
        receiver.setCharSkills({attack: 10, elemental: 9, burst: 10});
        const team = Team.fromMember(receiver);
        team.setMember(1, shenhe);
        team.setMember(2, skirk);
        team.setMember(3, makeBuild('Kokomi'));

        const data = receiver.getBuildData();
        const quill = data.multipliers.find((item) => item.getName() == 'shenhe_dmg_bonus');
        expect(quill.getLevel(data)).toBe(constellation == 3 ? 13 : 10);
        expect(shenhe.getBuildData().settings.getLevel('char_skill_elemental')).toBe(quill.getLevel(data));
        const boosted = featureValues(receiver);

        // Independent reference: remove the passive and raise the two relevant
        // skill levels by hand. Every Ayaka feature must reproduce its value.
        skirk.setCharSettings({skirk_mutual_weapons_mentorship: false});
        const unboosted = featureValues(receiver);
        shenhe.setCharSkills({attack: 10, elemental: 10, burst: 10});
        receiver.setCharSkills({attack: 10, elemental: 10, burst: 10});
        expect(featureValues(receiver)).toEqual(boosted);
        expect(boosted).not.toEqual(unboosted);

        skirk.setCharSettings({skirk_mutual_weapons_mentorship: true});
        const maxData = receiver.getBuildData();
        expect(maxData.multipliers.find((item) => item.getName() == 'shenhe_dmg_bonus').getLevel(maxData))
            .toBe(constellation == 3 ? 14 : 11);
    });

    test.each([false, true])("conditions and post-effects use the received level (reversed slots: %s)", (reverse) => {
        const source = withSource(makeBuild('Kazuha'), [
            new ConditionLevels({
                receivers: RECEIVERS.TEAM,
                levelSetting: 'char_skill_burst',
                stats: [new StatTable('mastery', [10, 20])],
            }),
        ], [new PostEffectStats({
            receivers: RECEIVERS.TEAM,
            from: 'atk_base',
            levelSetting: 'char_skill_burst',
            percent: new StatTable('atk', [0.1, 0.2]),
        })]);
        source.setCharSkills({attack: 10, elemental: 10, burst: 1});
        const booster = withSource(makeBuild('Hutao'), [new ConditionBoolean({
            name: 'test.boost',
            receivers: RECEIVERS.OTHERS,
            settings: {char_skill_burst_bonus_2: 1},
        })], [], {'test.boost': true});
        const receiver = makeBuild('Ayaka');
        const members = reverse ? [source, booster, receiver] : [receiver, booster, source];
        const team = Team.fromMember(members[0]);
        members.slice(1).forEach((member, i) => team.setMember(i + 1, member));
        const originalSettings = source.getSettings();
        const on = [source, receiver].map((member) => finalStats(member));
        const baseAtk = source.getBuildData().stats.get('atk_base');

        booster.static.modifySettings({'test.boost': false});
        for (const [i, member] of [source, receiver].entries()) {
            const off = finalStats(member);
            expect(on[i].get('mastery') - off.get('mastery')).toBeCloseTo(10, 10);
            expect(on[i].get('atk') - off.get('atk')).toBeCloseTo(0.1 * baseAtk, 8);
        }
        expect(source.getSettings()).toEqual(originalSettings);
    });
});

test("preliminary settings rounds do not claim inactive stack sources", () => {
    const source = withSource(makeBuild('Kazuha'), [new Condition({
        receivers: RECEIVERS.TEAM,
        stack: 'test.settings_stack',
        condition: new ConditionBooleanValue({setting: 'test.disabled', cond: 'eq', value: 0}),
        stats: {mastery: 100},
    })]);
    const disabler = withSource(makeBuild('Hutao'), [new Condition({
        receivers: RECEIVERS.OTHERS,
        settings: {'test.disabled': 1},
    })]);
    const team = Team.fromMember(source);
    team.setMember(1, disabler);

    expect(team.stackSources().sources.has('test.settings_stack')).toBe(false);
    expect(source.getBuildData().stats.get('mastery')).toBe(0);
    expect(disabler.getBuildData().stats.get('mastery')).toBe(0);
});

describe("talent level bonuses of different members", () => {
    const booster = (charKey) => withSource(makeBuild(charKey), [new ConditionBoolean({
        name: 'test.boost',
        receivers: RECEIVERS.OTHERS,
        settings: {char_skill_burst_bonus_2: 1},
    })], [], {'test.boost': true});

    test("add up, each counted once", () => {
        const receiver = makeBuild('Ayaka');
        const first = booster('Hutao');
        const second = booster('Kazuha');
        const team = Team.fromMember(receiver);
        team.setMember(1, first);
        team.setMember(2, second);

        expect(receiver.getBuildData().settings.getLevel('char_skill_burst')).toBe(12);
        second.static.modifySettings({'test.boost': false});
        expect(receiver.getBuildData().settings.getLevel('char_skill_burst')).toBe(11);
        // A member's own bonuses stay its own.
        expect(first.getBuildData().settings.getLevel('char_skill_burst')).toBe(10);
    });

    test("Lohen's own +1 and Skirk's +1 to her party give Lohen +2", () => {
        const lohen = makeBuild('Lohen');
        const skirk = makeBuild('Skirk');
        const team = Team.fromMember(lohen);
        team.setMember(1, skirk);
        team.setMember(2, makeBuild('Kokomi'));
        lohen.setCharSettings({lohen_when_the_mood_strikes: true});
        skirk.setCharSettings({skirk_mutual_weapons_mentorship: true});

        expect(lohen.getBuildData().settings.getLevel('char_skill_elemental')).toBe(12);
        expect(skirk.getBuildData().settings.getLevel('char_skill_elemental')).toBe(11);
    });
});

test("a delivered multiplier offers what features use, in its source's scope, and nothing else", () => {
    const source = makeBuild('Bennet');
    const receiver = makeBuild('Hutao');
    const multiplier = new FeatureMultiplier({
        receivers: RECEIVERS.OTHERS,
        leveling: 'char_skill_burst',
        values: new StatTable('test_delivered', [10, 20]),
    });
    // A method features do not call: before, a proxy ran it with the
    // receiver's data when the data came inside another argument.
    multiplier.readNested = ({data}) => data.settings.char_id;
    withSource(source, [], [], {}, [multiplier]);
    source.setCharSkills({attack: 1, elemental: 1, burst: 2});
    const team = Team.fromMember(receiver);
    team.setMember(1, source);

    const delivered = receiver.getBuildData().multipliers.find((item) => item.getName() == 'test_delivered');
    expect(delivered.getLevel()).toBe(2);
    expect(delivered.readNested).toBeUndefined();
});

test("a chain of deliveries resolves whatever its length", () => {
    // A gives B test.s1; B, with it, gives C test.s2; C, with that, gives D test.s3.
    const link = (from, to) => new Condition({
        receivers: RECEIVERS.OTHERS,
        condition: from ? new ConditionBooleanValue({setting: from, cond: 'eq', value: 1}) : undefined,
        settings: {[to]: 1},
    });
    const a = withSource(makeBuild('Hutao'), [link(null, 'test.s1')]);
    const b = withSource(makeBuild('Bennet'), [link('test.s1', 'test.s2')]);
    const c = withSource(makeBuild('Xingqiu'), [link('test.s2', 'test.s3')]);
    const d = makeBuild('Kazuha');
    const team = Team.fromMember(a);
    [b, c, d].forEach((member, i) => team.setMember(i + 1, member));

    const evaluation = team.evaluate();
    expect(evaluation.member(d).settings()['test.s3']).toBe(1);
});
