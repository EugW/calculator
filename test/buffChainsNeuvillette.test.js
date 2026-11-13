import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Neuvillette.
//
// - A4 Discipline of the Supreme Arbitration (Hydro DMG from the current-HP
//   ratio): the game (Avatar_Neuvillette_PermanentSkill_2_Calculator) sets
//   _ABILITY_Neuvillette_PermanentSkill_Hp from FIGHT_PROP_CUR_HP /
//   FIGHT_PROP_MAX_HP (total markers) into HpMinus_Eff, and
//   Avatar_Neuvillette_PermanentSkill_2_Buff writes
//   Actor_WaterAddHurtExtraDelta (extra, the default write; GO's premod:
//   hydro_dmg_ is its guess, with no HP stat read). ProudSkill
//   Neuvillette_PermanentSkill_2 params [0.3, 0.8, 0.6] match the talent text
//   (30% threshold, 80% cap edge, 0.6% per 1% HP). KQM Neuvillette has no
//   EM/ATK/HP/ER buff-chain test. Declared reads: TOTAL (explicit total reads
//   are evidence even though no ability writes extra HP today, so premod and
//   total HP agree numerically). Game formula for the self Hydro DMG bonus:
//   min(max(100 * curHP / maxHP - 30, 0) * 0.006, 0.3).
// - A1 (Past Draconic Glories stacks, PermanentSkill_1) sets only reaction
//   counters (no Actor_*/FIGHT_PROP in the ability); the charged multiplier
//   reads no stat. C1 is flat interruption resistance (Actor_EndureDelta).
//   C2 is hit-level CRIT DMG per A1 stack (ModifyDamageMixin
//   bonusCriticalHurt, no stat read, no Actor channel). C4 spawns a droplet
//   on heal (no stat read). C6 adds a 10%-Max-HP hit (total by construction)
//   plus an unmodeled heal. Talent hits scale on hp* (total by construction).
//   None of these needs a channel; only the A4 is tested here.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

// Neuvillette plus three neutral members; all four elements differ, so no
// Elemental Resonance applies. The bonus is on Neuvillette himself.
function neutralTeam() {
    const neuvillette = makeBuild('Neuvillette');
    neuvillette.setWeapon(DB.Weapons.get('catalyst').get('ThrillingTales'));
    neuvillette.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const team = Team.fromMember(neuvillette);
    team.setMember(1, makeBuild('Eula'));
    team.setMember(2, makeBuild('Hutao'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(neuvillette);
    return {team, neuvillette};
}

function setHpInput(neuvillette, value) {
    neuvillette.setCharSettings({neuvillette_the_high_arbitrators_discipline: value});
}

// Game formula for the A4 Hydro DMG bonus (decimal) at a given current HP
// (absolute, the >100 path our tests use) and Max HP.
function expectedA4(cur, max) {
    return Math.min(Math.max(cur * 100 / max - 30, 0) * 0.006, 0.3);
}

function hydroBonus(neuvillette) {
    return finalStats(neuvillette).get('dmg_hydro') || 0;
}

test("A4 formula parity: threshold, slope, cap; ascension gate; input off", () => {
    const {neuvillette} = neutralTeam();

    // Input off (or below ascension 4): no bonus.
    setHpInput(neuvillette, 0);
    matchCarrierTotals(neuvillette, {hp_total: 30000});
    expect(hydroBonus(neuvillette)).toBe(0);
    setHpInput(neuvillette, 15000);
    neuvillette.setCharLevels({level: 90, ascension: 0, constellation: 0});
    expect(hydroBonus(neuvillette)).toBe(0);
    neuvillette.setCharLevels({level: 90, ascension: 6, constellation: 0});

    // 30k Max HP: 9k (30%) -> 0, 6k (20%) -> 0, 15k (50%) -> 12%,
    // 24k (80%) -> capped 30%, 30k (100%) -> capped 30%.
    matchCarrierTotals(neuvillette, {hp_total: 30000});
    setHpInput(neuvillette, 9000);
    expect(hydroBonus(neuvillette)).toBeCloseTo(0, 9);
    setHpInput(neuvillette, 6000);
    expect(hydroBonus(neuvillette)).toBeCloseTo(0, 9);
    setHpInput(neuvillette, 15000);
    expect(hydroBonus(neuvillette)).toBeCloseTo(0.12, 8);
    setHpInput(neuvillette, 24000);
    expect(hydroBonus(neuvillette)).toBeCloseTo(0.3, 8);
    setHpInput(neuvillette, 30000);
    expect(hydroBonus(neuvillette)).toBeCloseTo(0.3, 8);

    // Same ratio, different Max HP: the bonus follows the ratio, not the
    // absolute HP (20k max / 10k cur and 40k max / 20k cur both give 12%).
    matchCarrierTotals(neuvillette, {hp_total: 20000});
    setHpInput(neuvillette, 10000);
    expect(hydroBonus(neuvillette)).toBeCloseTo(0.12, 8);
    matchCarrierTotals(neuvillette, {hp_total: 40000});
    setHpInput(neuvillette, 20000);
    expect(hydroBonus(neuvillette)).toBeCloseTo(0.12, 8);

    // Hard numbers from the formula (not copied from the engine).
    expect(expectedA4(15000, 30000)).toBeCloseTo(0.12, 9);
    expect(expectedA4(24000, 30000)).toBeCloseTo(0.3, 9);
    expect(expectedA4(30000, 30000)).toBeCloseTo(0.3, 9);
});

test("A4 counts premod HP: Hydro resonance moves the ratio", () => {
    // Resonance team: hydro pair -> +25% Max HP (a stage-0 premod
    // condition). The current-HP input stays fixed, so the ratio falls and
    // the bonus follows the formula down: the resonance HP is counted.
    const neuvillette = makeBuild('Neuvillette');
    neuvillette.setWeapon(DB.Weapons.get('catalyst').get('ThrillingTales'));
    neuvillette.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const team = Team.fromMember(neuvillette);
    team.setMember(1, makeBuild('Barbara'));
    team.setMember(2, makeBuild('Eula'));
    team.setMember(3, makeBuild('Hutao'));
    team.setOnFieldMember(neuvillette);

    // Same build without resonance: hydro/cryo/pyro/anemo, no pair.
    const plain = makeBuild('Neuvillette');
    plain.setWeapon(DB.Weapons.get('catalyst').get('ThrillingTales'));
    plain.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const team2 = Team.fromMember(plain);
    team2.setMember(1, makeBuild('Eula'));
    team2.setMember(2, makeBuild('Hutao'));
    team2.setMember(3, makeBuild('Sucrose'));
    team2.setOnFieldMember(plain);

    // Fixed current HP, low enough to stay under the cap on both sides.
    setHpInput(neuvillette, 8000);
    setHpInput(plain, 8000);
    const hpR = totalHp(finalStats(neuvillette));
    const hpN = totalHp(finalStats(plain));
    // Sanity: resonance actually raised Max HP% by 25 points.
    expect(finalStats(neuvillette).get('hp_percent') - finalStats(plain).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(hpR - hpN).toBeGreaterThan(1000);
    const gotR = hydroBonus(neuvillette);
    const gotN = hydroBonus(plain);
    // Both sides uncapped, so the test is sensitive to the HP value.
    expect(gotN).toBeGreaterThan(0.01);
    expect(gotN).toBeLessThan(0.3);
    expect(gotR).toBeGreaterThan(0.01);
    expect(gotR).toBeLessThan(0.3);
    expect(gotR).toBeCloseTo(expectedA4(8000, hpR), 8);
    expect(gotN).toBeCloseTo(expectedA4(8000, hpN), 8);
    // The whole resonance gain is counted: the drop follows the formula.
    expect(gotR - gotN).toBeCloseTo(expectedA4(8000, hpR) - expectedA4(8000, hpN), 8);
});

test("A4 ignores extra ATK (Bennett burst) and extra EM (Key of Khaj-Nisut)", () => {
    const {neuvillette} = neutralTeam();
    matchCarrierTotals(neuvillette, {hp_total: 30000});
    setHpInput(neuvillette, 15000);
    const before = hydroBonus(neuvillette);
    expect(before).toBeCloseTo(0.12, 8);

    // Bennett's burst ATK is extra ATK on the on-field member; the bonus
    // reads HP, so it must not move. Bennett is Pyro here, still no resonance.
    const bennett = makeBuild('Bennet');
    const team = neuvillette.team;
    team.setMember(2, bennett);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const atkBefore = finalStats(neuvillette).get('atk');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(finalStats(neuvillette).get('atk') - atkBefore).toBeGreaterThan(10);
    expect(hydroBonus(neuvillette)).toBeCloseTo(before, 10);

    // The Key's party EM is extra EM; it must not move the HP-read bonus.
    // Kazuha + Hutao keep all four elements different (no resonance).
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(2, kazuha);
    team.setMember(3, makeBuild('Hutao'));
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const emBefore = totalMastery(finalStats(neuvillette));
    expect(hydroBonus(neuvillette)).toBeCloseTo(before, 8);
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    expect(totalMastery(finalStats(neuvillette)) - emBefore).toBeGreaterThan(1);
    expect(hydroBonus(neuvillette)).toBeCloseTo(before, 8);
});
