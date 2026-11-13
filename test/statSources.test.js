import { CalcSet } from "../src/js/classes/CalcSet";
import { Serializer } from "../src/js/classes/Serializer";
import { Team } from "../src/js/classes/Team";
import { SOURCE_KINDS } from "../src/js/classes/Team/StatSources";
import { DB } from "../src/js/db/DB";
import released from "./fixtures/public-main-builds.json";
import { makeSkirkTeam } from "./support/skirkTeam";
import { makeBuild } from "./support/team";

global.DB = DB;

const numbers = (stats) => Object.fromEntries(Object.entries(stats).filter(([, value]) => typeof value == 'number' && value));

function expectSame(actual, expected) {
    const keys = new Set([...Object.keys(numbers(actual)), ...Object.keys(numbers(expected))]);
    for (const key of keys) {
        const a = actual[key] || 0, b = expected[key] || 0;
        if (Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(b))) {
            throw new Error(`${key}: sources add up to ${a}, stats hold ${b}`);
        }
    }
}

/**
 * Every member's sources add up to its stage 0 stats, the enemy's to its stats.
 *
 * @param {Team} team
 */
function expectSourcesAddUp(team) {
    const evaluation = team.evaluate().traced();
    for (const member of team.getMembers()) {
        expectSame(evaluation.sourcesOf(member).total(), evaluation.resolveFull(member).stats);
    }
    expectSame(evaluation.enemySourcesOf().total(), evaluation.enemyStats());
    return evaluation;
}

test("sources add up to every member's stats and the enemy's in a team with delivered effects", () => {
    const {team, citlali, escoffier} = makeSkirkTeam();
    const evaluation = expectSourcesAddUp(team);

    // Thrilling Tales is Citlali's condition, received by Escoffier.
    const heritage = evaluation.sourcesOf(escoffier).entries.find((entry) => entry.source === citlali && entry.stats.atk_percent);
    expect(heritage.kind).toBe(SOURCE_KINDS.CONDITION);
    expect(heritage.stats.atk_percent).toBeCloseTo(48, 10);

    // Escoffier's A4 lowers the enemy's Cryo RES, once for the team.
    const shred = evaluation.enemySourcesOf().entries.find((entry) => entry.source === escoffier);
    expect(shred.object).toBe('char');
    expect(shred.stats.enemy_res_cryo).toBeCloseTo(-55, 10);
});

test("an object's own stats are one entry per object", () => {
    const {team, skirk} = makeSkirkTeam();
    const entries = team.evaluate().traced().sourcesOf(skirk).entries.filter((entry) => entry.kind == SOURCE_KINDS.OBJECT);
    expect(entries.map((entry) => entry.object)).toEqual(['char', 'weapon', 'artifacts']);
    expect(entries.every((entry) => entry.source === skirk && entry.item === null)).toBe(true);
});

test("a traced evaluation gives the same program data", () => {
    const {team} = makeSkirkTeam();
    const evaluation = team.evaluate();
    const traced = evaluation.traced();
    for (const member of team.getMembers()) {
        expect(numbers(traced.member(member).programData().stats)).toEqual(numbers(evaluation.member(member).programData().stats));
    }
});

test("only a traced evaluation has sources", () => {
    const {team, skirk} = makeSkirkTeam();
    expect(() => team.evaluate().sourcesOf(skirk)).toThrow();
});

test("party effects are the team's entries", () => {
    // Two Pyro members: Pyro resonance, a party condition.
    const hutao = makeBuild('Hutao');
    const team = Team.fromMember(hutao);
    team.setMember(1, makeBuild('Bennet'));
    const evaluation = expectSourcesAddUp(team);
    const party = evaluation.sourcesOf(hutao).entries.filter((entry) => entry.kind == SOURCE_KINDS.PARTY);
    expect(party.some((entry) => entry.stats.atk_percent == 25)).toBe(true);
    expect(party.every((entry) => entry.source === null)).toBe(true);
});

test.each(Object.entries(released.fixtures))("released %s: sources add up", (_, fixture) => {
    const build = CalcSet.deserialize(Serializer.unpack(fixture.packed));
    expectSourcesAddUp(Team.fromMember(build));
});
