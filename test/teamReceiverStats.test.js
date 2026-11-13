import { Condition } from "../src/js/classes/Condition";
import { FeatureCompiler } from "../src/js/classes/Feature2/Compiler";
import { CBlock } from "../src/js/classes/Feature2/Compile/Types";
import { PRIORITIES } from "../src/js/classes/PostEffect";
import { PostEffectStats } from "../src/js/classes/PostEffect/Stats";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { RECEIVERS } from "../src/js/classes/Team/Receivers";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery, withSource } from "./support/team";

global.DB = DB;

function recipientBonus(from, to, ratio, extra = {}) {
    return new PostEffectStats({
        receivers: RECEIVERS.TEAM,
        from,
        fromScope: 'receiver',
        percent: new StatTable(to, [ratio]),
        ...extra,
    });
}

test("a delivered bonus reads each recipient's energy cost, including after static folding", () => {
    const source = withSource(makeBuild('RaidenShogun'), [], [recipientBonus('burst_energy_cost', 'dmg_burst', 0.3)]);
    const receiver = makeBuild('Keqing');
    const third = makeBuild('Kazuha');
    const team = Team.fromMember(source);
    team.setMember(1, receiver);
    team.setMember(2, third);

    for (const [member, expected] of [[source, 0.27], [receiver, 0.12], [third, 0.18]]) {
        expect(finalStats(member).get('dmg_burst')).toBeCloseTo(expected, 10);
        const data = member.getBuildData();
        const compiler = new FeatureCompiler(new CBlock([]), data.getActivePostEffectsTree());
        const apply = compiler.compilePostTree({
            dontProcessStats: true,
            staticStats: Object.keys(data.stats).filter((stat) => stat.endsWith('burst_energy_cost')),
        });
        data.stats.ensure(compiler.usedStats);
        data.stats.ensure(compiler.assignedStats);
        apply(data.stats);
        expect(data.stats.get('dmg_burst')).toBeCloseTo(expected, 10);
    }
});

test.each(['mastery*', 'atk*'])("recipient %s totals use all components and earlier-stage effects", (from) => {
    const source = withSource(makeBuild('RaidenShogun'), [], [
        recipientBonus(from, 'dmg_all', 0.1, {priority: PRIORITIES.STAT_GLOBAL}),
    ]);
    const receiver = withSource(makeBuild('Keqing'), [new Condition({stats: {mastery: 100, atk_percent: 25}})], [
        new PostEffectStats({
            from: 'burst_energy_cost',
            percent: new StatTable(from === 'mastery*' ? 'mastery' : 'atk', [2]),
            priority: PRIORITIES.STAT_LOCAL,
        }),
    ]);
    const team = Team.fromMember(source);
    team.setMember(1, receiver);
    const stats = finalStats(receiver);
    const total = from === 'mastery*' ? totalMastery(stats) : stats.getTotalPercent('atk');
    expect(stats.get('dmg_all')).toBeCloseTo(total * 0.001, 10);
    // Viewing the donor still evaluates the recipient's program namespace.
    expect(finalStats(source).get('m2__dmg_all')).toBeCloseTo(total * 0.001, 10);
});

test("receiver-scoped reads fall back to the owner in a team of one", () => {
    const source = withSource(makeBuild('Keqing'), [], [recipientBonus('burst_energy_cost', 'dmg_burst', 0.3)]);
    Team.fromMember(source);
    expect(finalStats(source).get('dmg_burst')).toBeCloseTo(0.12, 10);
});
