import { Team } from "../src/js/classes/Team";
import { teammateContributions } from "../src/js/classes/Team/Contributions";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";

global.DB = DB;

test("each teammate's contribution is the member's stats with it minus without it", () => {
    const hutao = makeBuild('Hutao');
    const bennet = makeBuild('Bennet');
    const xingqiu = makeBuild('Xingqiu');
    const team = Team.fromMember(hutao);
    team.setMember(1, bennet);
    team.setMember(3, xingqiu);
    bennet.setCharSettings({bennet_fantastic_voyage: true});

    const withTeam = finalStats(hutao);
    const contributions = teammateContributions(hutao);
    expect(contributions.map(({member}) => member)).toEqual([bennet, xingqiu]);

    const withoutBennet = hutao.clone();
    withoutBennet.team.removeMember(1);
    const expected = withTeam.get('atk') - finalStats(withoutBennet).get('atk');
    expect(expected).toBeGreaterThan(0);
    expect(contributions[0].stats.get('atk')).toBeCloseTo(expected, 6);

    // The real team is untouched.
    expect(team.getMembers()).toEqual([hutao, bennet, xingqiu]);
    expect(finalStats(hutao).get('atk')).toBeCloseTo(withTeam.get('atk'), 6);
    expect(Object.keys(contributions[0].stats).some((stat) => /^m\d+__/.test(stat))).toBe(false);
});

test("a standalone build receives nothing", () => {
    expect(teammateContributions(makeBuild('Hutao'))).toEqual([]);
});
