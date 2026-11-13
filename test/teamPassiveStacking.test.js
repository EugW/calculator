import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// Reaction base bonuses from different members' passives stack: several
// Moonsign Benedictions, or several Stellar base bonuses, all apply to the
// same receiver. They have no stack key.
//
// The team stays the same (adding a Moonsign member also changes the
// Moonsign level); only the stat each source scales on changes. Under a
// non-stacking rule raising a source that does not apply would change
// nothing.

function setup(sources) {
    const receiver = makeBuild('Noelle');
    const team = Team.fromMember(receiver);
    const members = sources.map(([name], i) => {
        const member = makeBuild(name);
        team.setMember(i + 1, member);
        return member;
    });
    return {receiver, members};
}

function expectStacking(sources, stat) {
    const {receiver, members} = setup(sources);
    const value = (raised) => {
        members.forEach((member, i) => {
            const [, total, base, step] = sources[i];
            matchCarrierTotals(member, {[total]: base + (raised.includes(i) ? step : 0)});
        });
        return finalStats(receiver).get(stat);
    };

    const start = value([]);
    const gains = members.map((member, i) => value([i]) - start);
    for (const gain of gains) {
        expect(gain).toBeGreaterThan(0);
    }

    const all = value(members.map((member, i) => i)) - start;
    expect(all).toBeCloseTo(gains.reduce((sum, gain) => sum + gain, 0), 9);
}

test("Moonsign Benedictions of different members stack", () => {
    expectStacking([
        ['Lauma', 'mastery_total', 200, 50],
        ['Nefer', 'mastery_total', 200, 50],
        ['Columbina', 'hp_total', 20000, 2000],
    ], 'lunarbloom_multi');
    expectStacking([
        ['Flins', 'atk_total', 1000, 100],
        ['Ineffa', 'atk_total', 1000, 100],
    ], 'lunarcharged_multi');
    expectStacking([
        ['Zibai', 'def_total', 1000, 100],
        ['Linnea', 'def_total', 1000, 100],
    ], 'lunarcrystallize_multi');
});

test("Stellar base bonuses of different members stack", () => {
    expectStacking([
        ['Sandrone', 'atk_total', 1000, 100],
        ['TravelerCryo', 'atk_total', 1000, 100],
    ], 'stellarglimmer_multi');
});
