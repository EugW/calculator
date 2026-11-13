import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery, featureValues } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Finale Of The Deep (sword).
//
// - Bond of Life cleared -> flat ATK (PostEffectStatsBondOfLife, R1 2.4% of
//   the cleared bond, cap 150): the game (Weapon_Sword_Vorpal,
//   EquipAbilities ConfigAbility_Weapon_Sword.json index 41) grants the debt
//   as AddHPDebts [Debts, FIGHT_PROP_MAX_HP, MUL] (total HP, 25% of Max HP)
//   in UNIQUE_Sword_Vorpal_TriggerCD, then sets Attack as
//   [TotalDebts, Ratio2, MUL] capped by MaxAttack in HPDebtsMixin
//   (GetHPPaidDebts -> TotalDebts * Ratio2 -> Attack) and writes it via
//   UNIQUE_Sword_Vorpal_Buff2 properties Actor_AttackDelta (no "Extra":
//   premod). Refinement values (EquipAffixExcelConfigData.json id 111425:
//   R1 0.12/15s, 0.25 debt, 0.024 ratio, 150 cap) match the content tables.
//   Declared reads: TOTAL, writes: PREMOD. GO reads input.total.hp into
//   premod atk (supporting evidence). KQM has no Finale Of The Deep
//   buff-chain test (weapons evidence and Bond of Life healing page describe
//   the mechanic only). The total HP read is declared even though no ability
//   writes extra HP today, so the model matches the game when one appears.
// - Skill ATK% (12%/15%/18%/21%/24%, UNIQUE_Sword_Vorpal_Buff1
//   Actor_AttackRatio): flat toggle, always premod, needs nothing.
// - FeaturePostEffectValue weapon_finale_of_the_deep_bonus just displays the
//   post-effect's value and needs nothing.
//
// Game formula at R1 with a fully cleared bond: min(HP * 25% * 2.4%,
// 150) = min(HP * 0.006, 150). Only the holder's base inputs (carrier total
// HP via matchCarrierTotals, base ATK) are read from the engine; every
// expected number is computed from this formula.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const BOL_FULL = 25; // 25% of Max HP granted and fully cleared
const R1_RATE = 0.024;
const R1_CAP = 150;
const DEBT = 0.25;

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function expectedBuff(hp) {
    return Math.min(hp * DEBT * R1_RATE, R1_CAP);
}

function equipFinale(holder) {
    holder.setWeapon(DB.Weapons.get('sword').get('FinaleOfTheDeep'));
    holder.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    holder.setWeaponSettings({weapon_finale_of_the_deep_1: false, weapon_finale_of_the_deep_bol: 0});
}

function setBol(holder, value) {
    holder.setWeaponSettings({weapon_finale_of_the_deep_bol: value});
}

// Holder's BoL ATK buff: total-ATK delta between BoL cleared and not, at the
// same HP. HP is untouched by the toggle, so the delta is the buff.
function bolBuff(holder) {
    setBol(holder, 0);
    const off = totalAtk(finalStats(holder));
    setBol(holder, BOL_FULL);
    const on = totalAtk(finalStats(holder));
    return on - off;
}

// Cryo Traveler (sword, premod ATK -> EM A4) holds Finale; the rest are
// neutral elements, so no resonance applies.
function neutralTeam() {
    const traveler = makeBuild('TravelerCryo');
    const team = Team.fromMember(traveler);
    team.setMember(1, makeBuild('Barbara'));
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(traveler);
    equipFinale(traveler);
    return {team, traveler};
}

test("solo formula parity: min(HP * 0.6%, 150), extra lane empty", () => {
    const {traveler} = neutralTeam();
    // Sanity on the game formula.
    expect(expectedBuff(15000)).toBeCloseTo(90, 9);
    expect(expectedBuff(20000)).toBeCloseTo(120, 9);
    expect(expectedBuff(30000)).toBeCloseTo(R1_CAP, 9);

    for (const hp of [15000, 20000]) {
        matchCarrierTotals(traveler, {hp_total: hp});
        const gotHp = totalHp(finalStats(traveler));
        expect(gotHp).toBeCloseTo(hp, 6);
        expect(bolBuff(traveler)).toBeCloseTo(expectedBuff(gotHp), 6);
    }

    // High HP binds the cap.
    matchCarrierTotals(traveler, {hp_total: 30000});
    const hpCapped = totalHp(finalStats(traveler));
    expect(hpCapped * DEBT * R1_RATE).toBeGreaterThan(R1_CAP);
    expect(bolBuff(traveler)).toBeCloseTo(R1_CAP, 6);

    // Premod write: nothing lands in the extra ATK lane.
    setBol(traveler, BOL_FULL);
    expect(finalStats(traveler).get('atk_extra') || 0).toBeCloseTo(0, 9);
    setBol(traveler, 0);
});

test("displayed bonus equals the ATK buff", () => {
    const {traveler} = neutralTeam();
    matchCarrierTotals(traveler, {hp_total: 20000});
    const hp = totalHp(finalStats(traveler));
    const buff = bolBuff(traveler);
    setBol(traveler, BOL_FULL);
    const values = featureValues(traveler);
    const key = Object.keys(values).find((name) => name.endsWith('weapon_finale_of_the_deep_bonus'));
    expect(key).toBeTruthy();
    expect(values[key][0]).toBeCloseTo(buff, 6);
    expect(values[key][0]).toBeCloseTo(expectedBuff(hp), 6);
    setBol(traveler, 0);
});

test("reads total HP: Hydro resonance (premod HP) is counted", () => {
    // Resonance team: hydro pair (Barbara + Xingqiu) -> +25% Max HP (a
    // stage-0 premod condition). A total read counts premod writes.
    const travelerR = makeBuild('TravelerCryo');
    const teamR = Team.fromMember(travelerR);
    teamR.setMember(1, makeBuild('Barbara'));
    teamR.setMember(2, makeBuild('Xingqiu'));
    teamR.setMember(3, makeBuild('Fischl'));
    teamR.setOnFieldMember(travelerR);
    equipFinale(travelerR);

    // Same holder without resonance: cryo/hydro/electro/anemo, no pair.
    const travelerN = makeBuild('TravelerCryo');
    const teamN = Team.fromMember(travelerN);
    teamN.setMember(1, makeBuild('Barbara'));
    teamN.setMember(2, makeBuild('Fischl'));
    teamN.setMember(3, makeBuild('Sucrose'));
    teamN.setOnFieldMember(travelerN);
    equipFinale(travelerN);

    const hpR = totalHp(finalStats(travelerR));
    const hpN = totalHp(finalStats(travelerN));
    // Sanity: resonance actually raised the holder's HP% by 25 points.
    expect(finalStats(travelerR).get('hp_percent') - finalStats(travelerN).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(hpR).toBeGreaterThan(hpN);
    expect(bolBuff(travelerR)).toBeCloseTo(expectedBuff(hpR), 5);
    expect(bolBuff(travelerN)).toBeCloseTo(expectedBuff(hpN), 5);
    // The whole resonance gain is counted (both under the cap here).
    expect(bolBuff(travelerR) - bolBuff(travelerN)).toBeCloseTo((hpR - hpN) * DEBT * R1_RATE, 5);
});

test("read ignores extra ATK (Bennett burst)", () => {
    const traveler = makeBuild('TravelerCryo');
    const team = Team.fromMember(traveler);
    const bennett = makeBuild('Bennet');
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(traveler);
    equipFinale(traveler);
    matchCarrierTotals(traveler, {hp_total: 20000});
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = bolBuff(traveler);
    const atkBefore = totalAtk(finalStats(traveler));

    bennett.setCharSettings({bennet_fantastic_voyage: true});
    // Sanity: the burst actually raised the holder's (extra) ATK.
    expect(totalAtk(finalStats(traveler)) - atkBefore).toBeGreaterThan(10);
    // The HP-read bond buff does not move.
    expect(bolBuff(traveler)).toBeCloseTo(before, 6);
});

test("read ignores extra EM (Key of Khaj-Nisut party EM)", () => {
    const traveler = makeBuild('TravelerCryo');
    const team = Team.fromMember(traveler);
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(1, kazuha);
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(traveler);
    equipFinale(traveler);
    matchCarrierTotals(traveler, {hp_total: 20000});
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const before = bolBuff(traveler);
    const emBefore = totalMastery(finalStats(traveler));

    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    // Sanity: the Key actually raised the holder's (extra) EM.
    expect(totalMastery(finalStats(traveler)) - emBefore).toBeGreaterThan(1);
    expect(bolBuff(traveler)).toBeCloseTo(before, 6);
});

test("writes PREMOD: Traveler A4 (premod ATK read) counts the bond ATK", () => {
    const {traveler} = neutralTeam();
    matchCarrierTotals(traveler, {hp_total: 20000, atk_total: 1000});
    const hp = totalHp(finalStats(traveler));
    const bond = expectedBuff(hp);
    expect(bond).toBeGreaterThan(10);
    // Traveler A4 linear zone: 8% of ATK, cap 160 far above.
    expect(0.08 * bond).toBeLessThan(150);

    setBol(traveler, 0);
    const emOff = totalMastery(finalStats(traveler));
    setBol(traveler, BOL_FULL);
    const emOn = totalMastery(finalStats(traveler));
    // Game formula: 8% of the premod bond ATK.
    expect(emOn - emOff).toBeCloseTo(0.08 * bond, 1);
    expect(emOn - emOff).toBeGreaterThan(1);
    setBol(traveler, 0);
});

test("premod proof: Bennett burst (extra ATK) does NOT move Traveler A4 EM", () => {
    const traveler = makeBuild('TravelerCryo');
    const team = Team.fromMember(traveler);
    const bennett = makeBuild('Bennet');
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(traveler);
    equipFinale(traveler);
    matchCarrierTotals(traveler, {atk_total: 1000});
    setBol(traveler, 0);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const emOff = totalMastery(finalStats(traveler));
    const atkOff = finalStats(traveler).get('atk');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    const emOn = totalMastery(finalStats(traveler));
    const atkOn = finalStats(traveler).get('atk');
    // Sanity: Bennett applied (total ATK rose), but his extra ATK is
    // invisible to the premod read, so Traveler A4 EM does not move.
    expect(atkOn - atkOff).toBeGreaterThan(10);
    expect(emOn - emOff).toBeCloseTo(0, 8);
});
