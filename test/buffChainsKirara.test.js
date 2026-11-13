import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Kirara.
// A4 (Pupillary Variance, dmg_skill_kirara / dmg_burst_kirara from Max HP)
// reads TOTAL HP: the game (Avatar_Momoka_PermanentSkill_2_Handler,
// ModifyDamageMixin, openConfig Momoka_PermanentSkill_2 = ProudSkill 612201
// params [0.004, 0.003]) scales ElementalArtDMGRatio / ElementalBurstDMGRatio
// x FIGHT_PROP_MAX_HP into Elemental_Art / Elemental_Burst damage, and GO
// prods input.total.hp. KQM Kirara has no stat-interaction test (only frame
// data, snapshot, ICD, particles, C4 range).
// Game formula (uncapped): skill +0.4% per 1000 Max HP (HP * 0.000004),
// burst +0.3% per 1000 Max HP (HP * 0.000003).
// No ability writes extra HP, so premod and total HP agree today; the tests
// lock the formula and the counted side (premod HP such as Hydro resonance),
// plus isolation from unrelated extra stats (Bennett burst ATK, Key party EM).
// Shields (skill, max, C2 party 40%), C1 extra-mine count (floor(HP/8000),
// cap 4), C4 coordinated hit (200% ATK) and C6 flat 12% elemental DMG read
// the total by construction (hp*/ATK hits) or are flat conditions (premod):
// confirmed defaults, need nothing (see Kirara.js notes).

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

// Kirara (dendro) + Eula (cryo) + Hutao (pyro) + Sucrose (anemo): four
// different elements, so no Elemental Resonance applies.
function neutralTeam() {
    const kirara = makeBuild('Kirara');
    const team = Team.fromMember(kirara);
    team.setMember(1, makeBuild('Eula'));
    team.setMember(2, makeBuild('Hutao'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(kirara);
    return {team, kirara};
}

function a4Bonus(member) {
    const stats = finalStats(member);
    return {
        skill: stats.get('dmg_skill_kirara') || 0,
        burst: stats.get('dmg_burst_kirara') || 0,
    };
}

// Game formula for Kirara's A4 at a given Max HP (decimal bonus).
function expectedA4(hp) {
    return {
        skill: hp * 0.004 / 1000,
        burst: hp * 0.003 / 1000,
    };
}

test("A4 formula parity: 20k/30k/40k HP; solo numbers unchanged with no extra stat", () => {
    const {kirara} = neutralTeam();

    for (const hp of [20000, 30000, 40000]) {
        matchCarrierTotals(kirara, {hp_total: hp});
        const got = a4Bonus(kirara);
        const want = expectedA4(hp);
        expect(got.skill).toBeCloseTo(want.skill, 8);
        expect(got.burst).toBeCloseTo(want.burst, 8);
    }
    // 30k -> 12% skill / 9% burst.
    expect(expectedA4(30000).skill).toBeCloseTo(0.12, 9);
    expect(expectedA4(30000).burst).toBeCloseTo(0.09, 9);
});

test("A4 counts Hydro resonance HP (premod)", () => {
    // Resonance team: hydro pair -> +25% Max HP (a stage-0 premod condition).
    const kiraraR = makeBuild('Kirara');
    const teamR = Team.fromMember(kiraraR);
    teamR.setMember(1, makeBuild('Barbara'));
    teamR.setMember(2, makeBuild('Xingqiu'));
    teamR.setMember(3, makeBuild('Eula'));
    teamR.setOnFieldMember(kiraraR);

    // Same Kirara build without resonance: dendro/hydro/pyro/cryo, no pair.
    const kiraraN = makeBuild('Kirara');
    const teamN = Team.fromMember(kiraraN);
    teamN.setMember(1, makeBuild('Barbara'));
    teamN.setMember(2, makeBuild('Hutao'));
    teamN.setMember(3, makeBuild('Eula'));
    teamN.setOnFieldMember(kiraraN);

    const hpR = totalHp(finalStats(kiraraR));
    const hpN = totalHp(finalStats(kiraraN));
    // Sanity: resonance actually raised Kirara's HP% by 25 points.
    expect(finalStats(kiraraR).get('hp_percent') - finalStats(kiraraN).get('hp_percent')).toBeCloseTo(0.25, 8);
    const gotR = a4Bonus(kiraraR);
    const gotN = a4Bonus(kiraraN);
    const wantR = expectedA4(hpR);
    const wantN = expectedA4(hpN);
    expect(gotR.skill).toBeCloseTo(wantR.skill, 8);
    expect(gotN.skill).toBeCloseTo(wantN.skill, 8);
    expect(gotR.burst).toBeCloseTo(wantR.burst, 8);
    // The whole resonance gain is counted: the difference follows the formula.
    expect(gotR.skill - gotN.skill).toBeCloseTo(0.004 * (hpR - hpN) / 1000, 8);
    expect(gotR.burst - gotN.burst).toBeCloseTo(0.003 * (hpR - hpN) / 1000, 8);
});

test("A4 ignores unrelated extra stats (Bennett burst ATK, Key party EM)", () => {
    const {kirara, team} = neutralTeam();
    matchCarrierTotals(kirara, {hp_total: 30000});
    const before = a4Bonus(kirara);
    expect(before.skill).toBeCloseTo(0.12, 8);

    // Bennett's burst is extra ATK on the on-field receiver; the A4 reads
    // HP, so it must not move. Bennett is pyro: still no resonance here
    // (dendro/cryo/pyro/anemo with Hutao replaced).
    const bennett = makeBuild('Bennet');
    team.setMember(2, bennett);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const atkBefore = finalStats(kirara).get('atk');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(finalStats(kirara).get('atk') - atkBefore).toBeGreaterThan(10);
    const afterBennett = a4Bonus(kirara);
    expect(afterBennett.skill).toBeCloseTo(before.skill, 10);
    expect(afterBennett.burst).toBeCloseTo(before.burst, 10);

    // The Key's party EM is extra EM; it must not move the HP-read bonus.
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(3, kazuha);
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const emBefore = totalMastery(finalStats(kirara));
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    expect(totalMastery(finalStats(kirara)) - emBefore).toBeGreaterThan(1);
    const afterKey = a4Bonus(kirara);
    expect(afterKey.skill).toBeCloseTo(before.skill, 10);
    expect(afterKey.burst).toBeCloseTo(before.burst, 10);
});
