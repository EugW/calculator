import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { equipWeapon, matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Hymn of the Maelstrom.
// The team ATK% reads total HP (game: Weapon_Catalyst_Bludnye sets
// _ABILITY_Weapon_Bludnye_MaxHP from FIGHT_PROP_MAX_HP on heal and derives
// Weapon_Bludnye_AttackRatio above 40000 HP) and writes premod ATK% (game:
// Weapon_Bludnye_AttackRatio_WeakN/_StrongN write Actor_AttackRatio, no
// "Extra"). Game formula (R1): per stack min(8%, (holderHP - 40000) / 1000 *
// 0.4%), x1.75 in triumph mode. The holder HP% stacks write premod HP%
// (Actor_MaxHPRatio; conditions are always premod): default confirmed.
// Flins A4 (8% of premod ATK as EM, cap 160) is the real premod reader;
// Bennett burst (base ATK -> extra ATK) is the extra writer the HP read must
// ignore. GO has no entry for this weapon yet and KQM has no interaction
// test, so the game-data trace above is the evidence.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function team() {
    const flins = makeBuild('Flins');
    const holder = makeBuild('Sucrose');
    equipWeapon('catalyst', 'HymnofTheMaelstrom', 1)(holder);
    const aino = makeBuild('Aino');
    const bennett = makeBuild('Bennet');
    const group = Team.fromMember(flins);
    group.setMember(1, holder);
    group.setMember(2, aino);
    group.setMember(3, bennett);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    return {group, flins, holder, bennett};
}

function hymnSettings(holder, stacks, mode = 'hymn') {
    holder.setWeaponSettings({
        weapon_hymn_of_the_maelstrom_mode: mode,
        weapon_hymn_of_the_maelstrom_stacks: stacks,
    });
}

test("game formula: R1 stacks scale holder HP above 40000, x1.75 in triumph, capped", () => {
    const {holder, flins} = team();
    // Totals are matched after setting stacks, so the holder's own HP%
    // stacks are absorbed in the target and the formula is exact.
    hymnSettings(holder, 0);
    const atk0 = finalStats(flins).get('atk_percent');
    // 3 stacks, hymn, holder at 50000 HP: 3 x min(8%, 10000 / 1000 x 0.4%).
    hymnSettings(holder, 3, 'hymn');
    matchCarrierTotals(holder, {hp_total: 50000});
    expect(finalStats(flins).get('atk_percent') - atk0).toBeCloseTo(0.12, 8);
    // Triumph mode: 3 x min(14%, 10000 / 1000 x 0.4% x 1.75) = 21%.
    hymnSettings(holder, 3, 'triumph');
    matchCarrierTotals(holder, {hp_total: 50000});
    expect(finalStats(flins).get('atk_percent') - atk0).toBeCloseTo(0.21, 8);
    // 1 stack: 10000 / 1000 x 0.4% = 4%.
    hymnSettings(holder, 1, 'hymn');
    matchCarrierTotals(holder, {hp_total: 50000});
    expect(finalStats(flins).get('atk_percent') - atk0).toBeCloseTo(0.04, 8);
    // Cap: at 60000 HP, 20000 / 1000 x 0.4% = 8% per stack, 24% for 3 stacks.
    hymnSettings(holder, 3, 'hymn');
    matchCarrierTotals(holder, {hp_total: 60000});
    expect(finalStats(flins).get('atk_percent') - atk0).toBeCloseTo(0.24, 8);
});

test("writes PREMOD: Flins A4 (premod ATK read) counts the Hymn team ATK%", () => {
    const {holder, flins} = team();
    hymnSettings(holder, 0);
    const emOff = totalMastery(finalStats(flins));
    const atkBase = finalStats(flins).get('atk_base');
    hymnSettings(holder, 3, 'hymn');
    matchCarrierTotals(holder, {hp_total: 60000});
    const emOn = totalMastery(finalStats(flins));
    // Game formula: 24% premod ATK at 60k HP (capped); Flins A4 gives 8% of
    // that premod ATK as EM (cap 160 not reached: assert below).
    const expected = 0.08 * 0.24 * atkBase;
    expect(expected).toBeLessThan(150);
    expect(emOn - emOff).toBeCloseTo(expected, 1);
    expect(emOn - emOff).toBeGreaterThan(1);
});

test("reads HP, not ATK: Bennett burst (extra ATK) does not move the Hymn ATK%", () => {
    const {holder, flins, bennett} = team();
    hymnSettings(holder, 3, 'hymn');
    matchCarrierTotals(holder, {hp_total: 50000});
    const atkPercent = finalStats(flins).get('atk_percent');
    const atkOff = finalStats(flins).get('atk');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    const atkOn = finalStats(flins).get('atk');
    // Sanity: Bennett applied (Flins total ATK rose), but his extra ATK is
    // not HP, so the Hymn ATK% does not move.
    expect(atkOn - atkOff).toBeGreaterThan(10);
    expect(finalStats(flins).get('atk_percent')).toBeCloseTo(atkPercent, 8);
});

test("self chain through total HP: holder stacks raise holder HP, which raises the team ATK", () => {
    const {holder, flins} = team();
    hymnSettings(holder, 0);
    matchCarrierTotals(holder, {hp_total: 45000});
    const holderBase = finalStats(holder).get('hp_base');
    const holderHp0 = finalStats(holder).getTotalPercent('hp');
    const atk0 = finalStats(flins).get('atk_percent');
    hymnSettings(holder, 3, 'hymn');
    const holderHp3 = finalStats(holder).getTotalPercent('hp');
    // R1 hymn: 3 stacks x 4% premod HP on the holder.
    expect(holderHp3 - holderHp0).toBeCloseTo(0.12 * holderBase, 6);
    // The team ATK follows the holder's new total HP through the game formula.
    const expected = 3 * Math.min(0.08, Math.max(0, holderHp3 - 40000) / 1000 * 0.004);
    expect(expected).toBeGreaterThan(0.01);
    expect(expected).toBeLessThan(0.24);
    expect(finalStats(flins).get('atk_percent') - atk0).toBeCloseTo(expected, 8);
    // Triumph mode: holder HP stacks x1.75, and the ATK follows.
    hymnSettings(holder, 3, 'triumph');
    const holderHpBoosted = finalStats(holder).getTotalPercent('hp');
    expect(holderHpBoosted - holderHp0).toBeCloseTo(0.12 * 1.75 * holderBase, 6);
    const expectedBoosted = 3 * Math.min(0.08 * 1.75, Math.max(0, holderHpBoosted - 40000) / 1000 * 0.004 * 1.75);
    expect(finalStats(flins).get('atk_percent') - atk0).toBeCloseTo(expectedBoosted, 8);
});
