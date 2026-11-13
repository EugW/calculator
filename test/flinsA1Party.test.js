import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";

global.DB = DB;

// Former party-API regressions for Flins, moved onto real teams: Flins has no
// partyData left, so every check below builds a team with a real carrier.

function makeFlins(constellation = 6) {
    const flins = makeBuild('Flins');
    flins.setCharLevels({level: 90, ascension: 6, constellation});
    return flins;
}

test("Flins A1 is self-only: teammates get no Symphony of Winter", () => {
    const receiver = makeBuild('Keqing');
    const flins = makeFlins();
    flins.setCharSettings({flins_symphony_of_winter: true});
    const ineffa = makeBuild('Ineffa');
    const team = Team.fromMember(receiver);
    team.setMember(1, flins);
    team.setMember(2, ineffa);
    // Ascendant Gleam (two Nod-Krai members), still nothing delivered.
    expect(finalStats(receiver).get('dmg_reaction_lunarcharged')).toBe(0);
});

test("Flins self A1 only buffs at Ascendant Gleam (party_moonsign 2)", () => {
    const flins = makeFlins(0);
    flins.setCharLevels({level: 90, ascension: 1, constellation: 0});
    flins.setCharSettings({flins_symphony_of_winter: true});
    const receiver = makeBuild('Keqing');
    const team = Team.fromMember(flins);
    team.setMember(1, receiver);
    // Solo Flins is the only Nod-Krai member: Nascent Gleam, no bonus.
    expect(finalStats(flins).get('dmg_reaction_lunarcharged')).toBe(0);

    const ineffa = makeBuild('Ineffa');
    team.setMember(2, ineffa);
    // Two Nod-Krai members: Ascendant Gleam, +20% Lunar-Charged for Flins.
    expect(finalStats(flins).get('dmg_reaction_lunarcharged')).toBeCloseTo(0.2, 5);
});

test("Flins self A1 requires ascension 1", () => {
    const flins = makeFlins(0);
    flins.setCharLevels({level: 60, ascension: 0, constellation: 0});
    flins.setCharSettings({flins_symphony_of_winter: true});
    const ineffa = makeBuild('Ineffa');
    const team = Team.fromMember(flins);
    team.setMember(1, ineffa);
    expect(finalStats(flins).get('dmg_reaction_lunarcharged')).toBe(0);
});

test("Flins C6 elevates himself by 35 and teammates by 10 at Ascendant Gleam", () => {
    const receiver = makeBuild('Keqing');
    const flins = makeFlins();
    flins.setCharSettings({flins_songs_and_dances_of_death: true});
    const team = Team.fromMember(receiver);
    team.setMember(1, flins);
    // Nascent Gleam (one Nod-Krai member): Flins keeps 35, teammate gets 0.
    expect(finalStats(flins).get('dmg_lunarcharged_special')).toBeCloseTo(0.35, 5);
    expect(finalStats(receiver).get('dmg_lunarcharged_special')).toBe(0);

    // Ascendant Gleam (Flins + Ineffa): teammate gets 10, Flins keeps 35.
    const ineffa = makeBuild('Ineffa');
    team.setMember(2, ineffa);
    expect(finalStats(receiver).get('dmg_lunarcharged_special')).toBeCloseTo(0.1, 5);
    expect(finalStats(flins).get('dmg_lunarcharged_special')).toBeCloseTo(0.35, 5);
});

test("Flins Lunar-Charged base bonus scales on his live ATK", () => {
    const receiver = makeBuild('Keqing');
    const flins = makeFlins();
    const team = Team.fromMember(receiver);
    team.setMember(1, flins);
    // Move below the 14-point cap first, then raise ATK by 500.
    flins.modifyBuffsSettings({'custom_buffs.atk': -1000});
    const before = finalStats(receiver).get('lunarcharged_multi');
    flins.modifyBuffsSettings({'custom_buffs.atk': -500});
    const after = finalStats(receiver).get('lunarcharged_multi');
    // 0.7% per 100 ATK: +500 ATK raises the bonus by 3.5 points of multi.
    expect(after - before).toBeCloseTo(0.035, 5);
});
