import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Key of Khaj-Nisut.
//
// - Self EM from Grand Hymn stacks (PostEffectStatsHP, R1 0.12% of Max HP
//   per stack): the game (UNIQUE_Sword_Deshret_Stack_MasteryUp properties)
//   writes Actor_ElemMasteryExtraDelta (extra, the default) as
//   [FIGHT_PROP_MAX_HP, MaxHPTransformRatio, MUL, Stack, MUL].
//   FIGHT_PROP_MAX_HP is the total marker (md/buff_chains.md), as for Hu
//   Tao/Baizhu/Candace/Chevreuse/Vodyanitsa; the same number as premod
//   while no ability writes extra HP. Declared reads: TOTAL. GO reads
//   input.total.hp and writes total.eleMas. Game formula R1: HP * 0.0012
//   per stack (affix 111511 paramList[1]).
// - Party EM at 3 stacks (PostEffectStatsHP, R1 0.2% of the wielder's Max
//   HP): the game (UNIQUE_Sword_Deshret_MasteryUp_Team properties) writes
//   Actor_ElemMasteryExtraDelta as [FIGHT_PROP_MAX_HP,
//   MaxHPTransformRatioForTeam, MUL]. Declared reads: TOTAL. GO reads
//   input.total.hp and writes teamBuff.total.eleMas. Game formula R1:
//   HP * 0.002 (affix 111511 paramList[4]); both parts reach the wielder
//   (KQM weapons: 273 + 3*70494*0.0012 + 0.002*70494 = 667.8).
// - The HP% (affix 111511 addProps FIGHT_PROP_HP_PERCENT, 20-40%) and the
//   Grand Hymn text_percent stacks are flat conditions, always premod, and
//   need nothing (GO premod.hp_).
// - Write side (extra EM, the default): KQM weapons (CrystalOfSugar#8624,
//   v3.2) shows the self and party EM are not used by Kazuha's A4; KQM
//   Nahida (Omglolz#2082) shows the Key does not work with Nahida's A1
//   (neither on the Key user nor on another member). Sucrose's A4 is a
//   premod reader like them. Total EM readers do count it (Alhaitham's A4,
//   batch 1: FIGHT_PROP_ELEMENT_MASTERY).
// - Read side: no shipped ability writes extra HP (md/buff_chains.md), so
//   no forbidden HP chain exists to test; the read is pinned to HP itself
//   by showing extra ATK (Bennett's burst) and extra EM (Nahida's A1) do
//   not move it, while premod HP (Hydro resonance, Furina's C2 premod HP%)
//   is counted in full.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

// Game formulas at R1 (affix 111511 paramList).
const SELF_RATE = 0.0012;
const TEAM_RATE = 0.002;
const HOLDER_RATE = 3 * SELF_RATE + TEAM_RATE;

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function equipKey(build, stacks) {
    build.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    build.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    build.setWeaponSettings({weapon_key_of_khaj_nisut: stacks});
    return build;
}

// Kazuha (anemo) + Eula (cryo) + Barbara (hydro) + Noelle (geo): four
// different elements, so no Elemental Resonance applies.
function neutralTeam() {
    const kazuha = makeBuild('Kazuha');
    equipKey(kazuha, 0);
    kazuha.setCharSettings({});
    const team = Team.fromMember(kazuha);
    const eula = makeBuild('Eula');
    team.setMember(1, eula);
    team.setMember(2, makeBuild('Barbara'));
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(kazuha);
    return {team, kazuha, eula};
}

// The Key's EM on a member: total-EM delta between 3 stacks and 0 stacks.
// The holder's HP is untouched by the stacks toggle, so the delta is the
// buff. Totals below are matched with the effect off (0 stacks), so the
// custom buffs are premod values.
function keyEmDelta(holder, member) {
    holder.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const off = totalMastery(finalStats(member));
    holder.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    const on = totalMastery(finalStats(member));
    return on - off;
}

test("formula parity: R1 0.12% of Max HP per self stack, 0.2% party at 3 stacks", () => {
    // Sanity: the game rates (affix 111511 paramList[1] and [4]).
    expect(SELF_RATE).toBeCloseTo(0.0012, 9);
    expect(TEAM_RATE).toBeCloseTo(0.002, 9);
    expect(3 * SELF_RATE * 50000).toBeCloseTo(180, 9);
    expect(TEAM_RATE * 50000).toBeCloseTo(100, 9);

    for (const hp of [30000, 50000]) {
        const {kazuha, eula} = neutralTeam();
        matchCarrierTotals(kazuha, {hp_total: hp});
        const gotHp = totalHp(finalStats(kazuha));
        expect(gotHp).toBeCloseTo(hp, 6);
        // Both parts reach the wielder: 3 x 0.12% + 0.2% of her HP.
        expect(keyEmDelta(kazuha, kazuha)).toBeCloseTo(HOLDER_RATE * gotHp, 6);
        // Nearby members get the party part only.
        expect(keyEmDelta(kazuha, eula)).toBeCloseTo(TEAM_RATE * gotHp, 6);
    }
});

test("counts premod HP: Hydro resonance", () => {
    // Resonance team: hydro pair (Barbara + Xingqiu) -> +25% Max HP (a
    // stage-0 premod condition). A total read counts premod writes.
    const kazuhaR = makeBuild('Kazuha');
    equipKey(kazuhaR, 0);
    kazuhaR.setCharSettings({});
    const teamR = Team.fromMember(kazuhaR);
    const eulaR = makeBuild('Eula');
    teamR.setMember(1, eulaR);
    teamR.setMember(2, makeBuild('Barbara'));
    teamR.setMember(3, makeBuild('Xingqiu'));
    teamR.setOnFieldMember(kazuhaR);

    // Same holder build without resonance: anemo/hydro/cryo/geo.
    const {kazuha: kazuhaN, eula: eulaN} = neutralTeam();

    const hpR = totalHp(finalStats(kazuhaR));
    const hpN = totalHp(finalStats(kazuhaN));
    // Sanity: resonance actually raised the holder's HP% by 25 points.
    expect(finalStats(kazuhaR).get('hp_percent') - finalStats(kazuhaN).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(hpR).toBeGreaterThan(hpN);
    expect(keyEmDelta(kazuhaR, kazuhaR)).toBeCloseTo(HOLDER_RATE * hpR, 6);
    expect(keyEmDelta(kazuhaN, kazuhaN)).toBeCloseTo(HOLDER_RATE * hpN, 6);
    // The whole resonance gain is counted on both parts.
    expect(keyEmDelta(kazuhaR, kazuhaR) - keyEmDelta(kazuhaN, kazuhaN)).toBeCloseTo(HOLDER_RATE * (hpR - hpN), 6);
    expect(keyEmDelta(kazuhaR, eulaR) - keyEmDelta(kazuhaN, eulaN)).toBeCloseTo(TEAM_RATE * (hpR - hpN), 6);
});

test("counts a premod HP post-effect: Furina C2 overflow", () => {
    // Furina holds the Key: her C2 Fanfare overflow is +0.35% premod HP%
    // per Fanfare above 400, capped at +140% (test/buffChainsFurina.test.js).
    // A total HP read counts premod writes.
    function furinaTeam(fanfare) {
        const furina = makeBuild('Furina');
        furina.setCharLevels({level: 90, ascension: 6, constellation: 2});
        equipKey(furina, 0);
        furina.setCharSettings({furina_fanfare_stacks: fanfare});
        const team = Team.fromMember(furina);
        const xiangling = makeBuild('Xiangling');
        team.setMember(1, xiangling);
        team.setMember(2, makeBuild('Eula'));
        team.setMember(3, makeBuild('Noelle'));
        team.setOnFieldMember(furina);
        return {furina, xiangling};
    }

    const atCap = furinaTeam(400);
    const baseHp = finalStats(atCap.furina).get('hp_base');
    const hpAt400 = totalHp(finalStats(atCap.furina));
    expect(keyEmDelta(atCap.furina, atCap.furina)).toBeCloseTo(HOLDER_RATE * hpAt400, 6);

    const over = furinaTeam(800);
    // Game formula: (800 - 400) x 0.35% = 140%, capped at 140%, of base HP.
    const expectedHp = hpAt400 + baseHp * 1.4;
    expect(totalHp(finalStats(over.furina))).toBeCloseTo(expectedHp, 6);
    expect(keyEmDelta(over.furina, over.furina)).toBeCloseTo(HOLDER_RATE * expectedHp, 6);
    expect(keyEmDelta(over.furina, over.xiangling)).toBeCloseTo(TEAM_RATE * expectedHp, 6);
});

test("ignores extra ATK (Bennett burst)", () => {
    // Kazuha (Key) + Bennett (pyro) + Eula (cryo) + Barbara (hydro): no
    // resonance. Kazuha on field so the burst reaches him; the Key reads
    // his HP, not his ATK.
    const kazuha = makeBuild('Kazuha');
    equipKey(kazuha, 0);
    kazuha.setCharSettings({});
    const team = Team.fromMember(kazuha);
    const bennett = makeBuild('Bennet');
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Eula'));
    team.setMember(3, makeBuild('Barbara'));
    team.setOnFieldMember(kazuha);
    matchCarrierTotals(kazuha, {hp_total: 30000});
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = keyEmDelta(kazuha, kazuha);
    const atkBefore = finalStats(kazuha).get('atk_base') * (1 + finalStats(kazuha).get('atk_percent')) + finalStats(kazuha).get('atk');

    bennett.setCharSettings({bennet_fantastic_voyage: true});
    // Sanity: the burst actually raised Kazuha's (extra) ATK.
    const statsAfter = finalStats(kazuha);
    const atkAfter = statsAfter.get('atk_base') * (1 + statsAfter.get('atk_percent')) + statsAfter.get('atk');
    expect(atkAfter - atkBefore).toBeGreaterThan(10);
    // The HP-read EM does not move.
    expect(keyEmDelta(kazuha, kazuha)).toBeCloseTo(before, 6);
});

test("ignores extra EM (Nahida A1)", () => {
    // Kazuha (Key) + Nahida + Eula + Barbara: no resonance. Kazuha on
    // field so Nahida's A1 lands on him; the Key reads his HP, not his EM
    // (no ability writes extra HP, so there is no forbidden HP chain).
    const kazuha = makeBuild('Kazuha');
    equipKey(kazuha, 0);
    kazuha.setCharSettings({});
    const team = Team.fromMember(kazuha);
    const nahida = makeBuild('Nahida');
    team.setMember(1, nahida);
    team.setMember(2, makeBuild('Eula'));
    team.setMember(3, makeBuild('Barbara'));
    team.setOnFieldMember(kazuha);
    matchCarrierTotals(kazuha, {hp_total: 30000});
    nahida.setCharSettings({});
    const before = keyEmDelta(kazuha, kazuha);
    const emBefore = totalMastery(finalStats(kazuha));

    nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
    // Sanity: Nahida's A1 actually raised Kazuha's (extra) EM.
    expect(totalMastery(finalStats(kazuha)) - emBefore).toBeGreaterThan(1);
    expect(keyEmDelta(kazuha, kazuha)).toBeCloseTo(before, 6);
});

// The Key's EM with Sucrose's A4, Kazuha's A4 and Nahida's A1: KQM shows
// the Key (self and party EM both) is not used by Kazuha's A4 (weapons
// evidence) nor by Nahida's A1 (Nahida evidence); Sucrose's A4 is a
// premod reader like them. Same team as test/buffChannels.test.js: Kazuha
// (Key R1, +700 EM, A4 Pyro), Sucrose (+600 EM, A4), Xiangling on field,
// Nahida (+500 EM, A1 in burst).
function chainTeam() {
    const kazuha = makeBuild('Kazuha');
    equipKey(kazuha, 0);
    kazuha.modifyBuffsSettings({'custom_buffs.mastery': 700});
    const team = Team.fromMember(kazuha);
    const sucrose = makeBuild('Sucrose');
    sucrose.modifyBuffsSettings({'custom_buffs.mastery': 600});
    const xiangling = makeBuild('Xiangling');
    const nahida = makeBuild('Nahida');
    nahida.modifyBuffsSettings({'custom_buffs.mastery': 500});
    team.setMember(1, sucrose);
    team.setMember(2, xiangling);
    team.setMember(3, nahida);
    team.setOnFieldMember(xiangling);
    kazuha.setCharSettings({});
    sucrose.setCharSettings({});
    nahida.setCharSettings({});
    return {team, kazuha, sucrose, xiangling, nahida};
}

function sucroseShare(sucrose, xiangling) {
    sucrose.setCharSettings({});
    const off = totalMastery(finalStats(xiangling));
    sucrose.setCharSettings({sucrose_mollis_favonius: true});
    const on = totalMastery(finalStats(xiangling));
    return on - off;
}

function kazuhaA4(kazuha, xiangling) {
    kazuha.setCharSettings({});
    const base = xiangling.getBuildData().stats.get('dmg_pyro');
    const off = finalStats(xiangling).get('dmg_pyro') - base;
    kazuha.setCharSettings({kaedehara_kazuha_poetics_of_fuubutsu: ['pyro']});
    const on = finalStats(xiangling).get('dmg_pyro') - base;
    return on - off;
}

function nahidaA1(nahida, xiangling) {
    nahida.setCharSettings({});
    const off = totalMastery(finalStats(xiangling));
    nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
    const on = totalMastery(finalStats(xiangling));
    return on - off;
}

test("Sucrose A4 (premod) ignores the Key's party EM", () => {
    const {kazuha, sucrose, xiangling} = chainTeam();
    // 20% of Sucrose's premod EM (600 + base, no extra anywhere yet).
    const before = sucroseShare(sucrose, xiangling);
    expect(before).toBeCloseTo(120, 1);
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    // Sanity: the Key actually raised Xiangling's (extra) EM.
    expect(totalMastery(finalStats(xiangling))).toBeGreaterThan(90);
    expect(sucroseShare(sucrose, xiangling)).toBeCloseTo(before, 6);
});

test("Kazuha A4 (premod) ignores the Key's own EM", () => {
    const {kazuha, sucrose, xiangling, nahida} = chainTeam();
    sucrose.setCharSettings({sucrose_mollis_favonius: true});
    nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
    // Kazuha's premod EM: 700 custom + base. A total read would grow with
    // the Key; the premod A4 (0.04% per EM) must not.
    const premod = totalMastery(finalStats(kazuha)) - (finalStats(kazuha).get('mastery_extra') || 0);
    expect(premod).toBeCloseTo(815.2, 1);
    const before = kazuhaA4(kazuha, xiangling);
    expect(before).toBeCloseTo(0.0004 * premod, 6);
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    // Sanity: the Key actually raised Kazuha's total EM.
    expect(totalMastery(finalStats(kazuha)) - premod).toBeGreaterThan(100);
    expect(kazuhaA4(kazuha, xiangling)).toBeCloseTo(before, 6);
});

test("Nahida A1 (premod) ignores the Key's EM", () => {
    const {kazuha, sucrose, xiangling, nahida} = chainTeam();
    sucrose.setCharSettings({sucrose_mollis_favonius: true});
    // 25% of the highest premod EM (Kazuha's 815.2), under the 250 cap.
    const before = nahidaA1(nahida, xiangling);
    expect(before).toBeCloseTo(203.8, 1);
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    expect(nahidaA1(nahida, xiangling)).toBeCloseTo(before, 6);
});

test("Alhaitham A4 (total) counts the Key's party EM", () => {
    // Alhaitham (dendro) + Kazuha (anemo, Key) + Fischl (electro) +
    // Noelle (geo): no resonance. Alhaitham's A4 reads total EM
    // (FIGHT_PROP_ELEMENT_MASTERY, batch 1): 0.1% per EM, cap 100%.
    const alhaitham = makeBuild('Alhaitham');
    alhaitham.setCharSettings({});
    const kazuha = makeBuild('Kazuha');
    equipKey(kazuha, 0);
    kazuha.setCharSettings({});
    const team = Team.fromMember(alhaitham);
    team.setMember(1, kazuha);
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(alhaitham);
    matchCarrierTotals(alhaitham, {mastery_total: 300});
    matchCarrierTotals(kazuha, {hp_total: 50000});

    function a4() {
        const stats = finalStats(alhaitham);
        return [stats.get('dmg_skill_alhaitham'), stats.get('dmg_burst_alhaitham')];
    }

    // No extra EM present: premod and total agree, 10% of 300 EM.
    expect(totalMastery(finalStats(alhaitham))).toBeCloseTo(300, 6);
    const [soloSkill, soloBurst] = a4();
    expect(soloSkill).toBeCloseTo(0.3, 9);
    expect(soloBurst).toBeCloseTo(0.3, 9);

    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    const holderHp = totalHp(finalStats(kazuha));
    // The party EM (0.2% of the holder's HP) lands on Alhaitham and his
    // total-read A4 counts it: 0.1% x (300 + 100).
    expect(totalMastery(finalStats(alhaitham))).toBeCloseTo(300 + TEAM_RATE * holderHp, 6);
    const [skill, burst] = a4();
    expect(skill).toBeCloseTo(0.001 * (300 + TEAM_RATE * holderHp), 9);
    expect(burst).toBeCloseTo(0.001 * (300 + TEAM_RATE * holderHp), 9);
});
