import { hasExtraLane } from '../src/js/classes/PostEffect/Channels';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, featureValues } from './support/team';

global.DB = DB;

// md/buff_chains.md: Akuoumaru (Watatsumi Wavewalker, Burst DMG from the
// party's combined max Energy) reads a static property and writes a
// hit-level bonus, so the default channels hold (no reads/writes params in
// src/js/db/Weapon/Claymore/Akoumaru.js).
//
// - Game data: Weapon_Claymore_Maria (ConfigAbility_Weapon_Claymore.json,
//   openConfig of affix id 112416) runs GetTeamTotalMaxEnergyToOverridemap
//   into Claymore_Maria_TeamEnergy, sets BuffValue = TeamEnergy x Ratio / 100
//   capped at Max_Value, and applies ModifyDamageMixin with
//   damagePercentageRatio and attackTags [Elemental_Burst]. No FIGHT_PROP
//   read (the energy sum is a static per-character property nothing writes)
//   and no Actor_*Delta write. extra_scan.js flags 54 abilities; none is
//   *Maria*. The bow (Mouun's Moon) and polearm (Wavebreaker's Fin) copies
//   are the same shape with Bow_/Pole_ prefixes.
// - KQM weapons evidence: no Akuoumaru chaining entry (no buff changes max
//   Energy, so there is no counted/not-counted interaction).
// - GO (Claymore/Akuoumaru): burst_dmg_ = min(refineRatio x teamEnergy,
//   refineMax) written under premod:; the same value here because dmg_burst
//   has no extra lane.
// - Game text (data/raw/weapon_texts.txt, akuoumaru): "For every point of
//   the entire party's combined maximum Energy capacity, the Elemental Burst
//   DMG ... is increased by 0.12%. A maximum of 40% ...".
//
// Game-formula constants (R1): 0.12% per team energy point = 0.0012 x
// energy (fraction), cap 0.40; R5: 0.0024 x energy, cap 0.80.
// Only the builds' live inputs (each member's burst_energy_cost) are read
// from the engine; every expected number is computed from those formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function setup(refine = 1) {
    // Eula (cryo, holder) + Bennett (pyro) + Nahida (dendro) + Sucrose
    // (anemo): four elements, so no resonance on either side.
    const eula = makeBuild('Eula');
    eula.setWeapon(DB.Weapons.get('claymore').get('Akoumaru'));
    eula.setWeaponLevels({level: 90, ascension: 6, refine});
    const bennet = makeBuild('Bennet');
    const nahida = makeBuild('Nahida');
    const sucrose = makeBuild('Sucrose');
    const team = Team.fromMember(eula);
    team.setMember(1, bennet);
    team.setMember(2, nahida);
    team.setMember(3, sucrose);
    team.setOnFieldMember(eula);
    return {team, eula, bennet, nahida, sucrose};
}

function teamEnergy(team) {
    return team.getMembers().reduce((sum, m) => sum + m.getBuildData().stats.get('burst_energy_cost'), 0);
}

function burstBonus(eula) {
    const stats = finalStats(eula);
    return stats.get('dmg_burst') - eula.getBuildData().stats.get('dmg_burst');
}

function displayedBonus(eula) {
    return featureValues(eula)['weapon.burst_dmg_bonus'][0];
}

test('R1: 0.12% per team energy point, at most 40%, no extra lane', () => {
    const {team, eula} = setup();
    // Live inputs only: Eula 80 + Bennett 60 + Nahida 50 + Sucrose 80.
    const energy = teamEnergy(team);
    expect(energy).toBe(270);
    const expected = Math.min(0.40, 0.0012 * energy);
    expect(burstBonus(eula)).toBeCloseTo(expected, 9);
    expect(displayedBonus(eula)).toBeCloseTo(expected * 100, 6);
    // The write is a hit-level bonus, not an attribute: no extra lane.
    expect(hasExtraLane('dmg_burst')).toBe(false);
    expect(finalStats(eula).get('dmg_burst_extra') || 0).toBe(0);
});

test('reaches the 40% cap on a high-energy team', () => {
    const eula = makeBuild('Eula');
    eula.setWeapon(DB.Weapons.get('claymore').get('Akoumaru'));
    eula.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const team = Team.fromMember(eula);
    team.setMember(1, makeBuild('RaidenShogun'));
    team.setMember(2, makeBuild('YaeMiko'));
    team.setMember(3, makeBuild('Ayaka'));
    team.setOnFieldMember(eula);
    // Live inputs: 80 + 90 + 90 + 80 = 340; 0.0012 x 340 = 0.408 -> cap.
    expect(teamEnergy(team)).toBe(340);
    expect(burstBonus(eula)).toBeCloseTo(0.40, 9);
    expect(displayedBonus(eula)).toBeCloseTo(40, 6);
});

test('ignores extra EM (Nahida A1, Sucrose A4) and extra ATK (Bennett burst)', () => {
    const {eula, bennet, nahida, sucrose} = setup();
    const before = burstBonus(eula);
    const emBefore = totalMastery(finalStats(eula));
    const atkBefore = finalStats(eula).get('atk');
    nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
    sucrose.setCharSettings({sucrose_mollis_favonius: true});
    bennet.setCharSettings({bennet_fantastic_voyage: true});
    // The buffs land: extra EM from Nahida's A1 and Sucrose's A4, extra ATK
    // from Bennett's burst.
    expect(totalMastery(finalStats(eula)) - emBefore).toBeGreaterThan(10);
    expect(finalStats(eula).get('atk') - atkBefore).toBeGreaterThan(10);
    // The static energy read does not see them.
    expect(burstBonus(eula)).toBeCloseTo(before, 9);
});

test('follows the team energy when a member changes', () => {
    const {team, eula} = setup();
    const before = burstBonus(eula);
    // Sucrose (80) out, Kazuha (60) in: -20 energy -> -0.024 bonus.
    team.setMember(3, makeBuild('Kazuha'));
    expect(teamEnergy(team)).toBe(250);
    expect(burstBonus(eula)).toBeCloseTo(before - 20 * 0.0012, 9);
});

test('R5: 0.24% per point, at most 80%', () => {
    const {team, eula} = setup(5);
    const energy = teamEnergy(team);
    expect(energy).toBe(270);
    const expected = Math.min(0.80, 0.0024 * energy);
    expect(expected).toBeCloseTo(0.648, 9);
    expect(burstBonus(eula)).toBeCloseTo(expected, 9);
    expect(displayedBonus(eula)).toBeCloseTo(expected * 100, 6);
});
