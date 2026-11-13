import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Dahlia.
//
// - A4 Prayer of Well-Wrought Joy (team ATK SPD from Max HP):
//   game computes SetGlobalValue _ABILITY_Dahlia_AttackSpeedBuff as
//   [FIGHT_PROP_MAX_HP, HpToSpeed_Ratio, MUL] capped by MaxAttackSpeed in
//   Avatar_Dahlia_PermanentSkill_2_OnCurAvatar (onAdded and onThinkInterval),
//   gated by Dahlia_PermanentSkill_2 (ProudSkill 1152201 params [5e-06, 0.2]:
//   0.5% per 1000 HP, cap 20%; talent text: Prayer of Well-Wrought Joy).
//   FIGHT_PROP_MAX_HP is the total marker (md/buff_chains.md), as for Baizhu,
//   Candace, Chevreuse and Columbina; the same number as premod while no
//   ability writes extra HP. GO reads input.total.hp and writes
//   teamBuff.premod (atk_speed has no extra lane here). KQM Dahlia has no
//   EM/ATK/HP/ER buff-chain test. Declared reads: TOTAL. Game formula:
//   min(HP * 0.0005, 20) / 100 on the active affected member.
// - Burst shield (FeatureShield scaling 'hp*'): the game builds it in
//   UNIQUE_Dahlia_ElementBurst_Shield_Team_A/B with GlobalMainShieldMixin
//   (Shield_HpValue, maxShieldByHPRatio Shield_MaxHpRatio; no FIGHT_PROP
//   marker). scaling 'hp*' reads the total by construction and needs nothing.
// - Talent hits (normal/charged/plunge/skill/burst): ModifyDamageMixin with a
//   plain damagePercentage and no FIGHT_PROP read; damage multipliers read the
//   total by construction and need nothing.
// - A1 (Benison on Frozen, gated by Dahlia_PermanentSkill_1) and A3 (move
//   speed, PermanentSkill_3) read no stat. C1 restores flat energy
//   (ReviveElemEnergy EnergyValue, param 2.5). C2 Shield Strength +25% writes
//   Actor_ShieldCostMinusRatio from the flat ShieldMinusRatio (params
//   [0.25, 12]). C4 adds burst time. C6 writes Animator_AttackSpeedRatio from
//   the flat Extra_AtkSpeedRatio (param 0.1). Flat toggles are always premod
//   and need nothing; atk_speed has no extra lane.
// - The extra_scan misses Dahlia by design: the A4 goes through the
//   intermediate global value _ABILITY_Dahlia_AttackSpeedBuff into
//   Animator_AttackSpeedRatio (not an Actor_ stat), and its only FIGHT_PROP is
//   the final read FIGHT_PROP_MAX_HP.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

// Dahlia plus a receiver and two neutral members; all four elements differ,
// so no Elemental Resonance applies. The receiver is on field, so it holds
// the A4 copy; Dahlia (off field) holds none.
function neutralTeam() {
    const dahlia = makeBuild('Dahlia');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, dahlia);
    team.setMember(2, makeBuild('Hutao'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(receiver);
    dahlia.setCharSettings({dahlia_prayer_of_well_wrought_joy: true});
    return {team, dahlia, receiver};
}

// Game formula for the delivered A4 ATK SPD at a given Dahlia Max HP
// (decimal, as finalStats reports it: 15% -> 0.15).
function expectedA4(hp) {
    return Math.min(hp * 0.0005, 20) / 100;
}

test("A4 formula parity: 20k/30k/50k, cap holds at 60k; off-field receiver gets nothing", () => {
    const {dahlia, receiver} = neutralTeam();

    for (const hp of [20000, 30000, 50000, 60000]) {
        matchCarrierTotals(dahlia, {hp_total: hp});
        expect(finalStats(receiver).get('atk_speed')).toBeCloseTo(expectedA4(hp), 8);
    }
    // 20k -> 10%; 30k -> 15%; 50k and 60k -> capped 20%.
    expect(expectedA4(20000)).toBeCloseTo(0.10, 9);
    expect(expectedA4(30000)).toBeCloseTo(0.15, 9);
    expect(expectedA4(50000)).toBeCloseTo(0.20, 9);
    expect(expectedA4(60000)).toBeCloseTo(0.20, 9);

    // The bonus follows the active member: with Dahlia herself on field the
    // off-field receiver keeps no copy while Dahlia holds her own.
    matchCarrierTotals(dahlia, {hp_total: 30000});
    const team = receiver.team;
    team.setOnFieldMember(dahlia);
    expect(finalStats(receiver).get('atk_speed')).toBe(0);
    expect(finalStats(dahlia).get('atk_speed')).toBeCloseTo(expectedA4(30000), 8);
    team.setOnFieldMember(receiver);
    expect(finalStats(receiver).get('atk_speed')).toBeCloseTo(expectedA4(30000), 8);
});

test("A4 counts premod HP: Hydro resonance", () => {
    // Resonance team: hydro pair (Dahlia + Barbara) -> +25% Max HP (a stage-0
    // premod condition). A total read counts premod writes.
    const dahlia = makeBuild('Dahlia');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, dahlia);
    team.setMember(2, makeBuild('Barbara'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(receiver);
    dahlia.setCharSettings({dahlia_prayer_of_well_wrought_joy: true});

    // Same Dahlia build without resonance: hydro/pyro/cryo/anemo, no pair.
    const plain = makeBuild('Dahlia');
    const receiver2 = makeBuild('Eula');
    const team2 = Team.fromMember(receiver2);
    team2.setMember(1, plain);
    team2.setMember(2, makeBuild('Hutao'));
    team2.setMember(3, makeBuild('Sucrose'));
    team2.setOnFieldMember(receiver2);
    plain.setCharSettings({dahlia_prayer_of_well_wrought_joy: true});

    const hpR = totalHp(finalStats(dahlia));
    const hpN = totalHp(finalStats(plain));
    // Sanity: resonance actually raised Dahlia's HP% by 25 points.
    expect(finalStats(dahlia).get('hp_percent') - finalStats(plain).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(finalStats(receiver).get('atk_speed')).toBeCloseTo(expectedA4(hpR), 8);
    expect(finalStats(receiver2).get('atk_speed')).toBeCloseTo(expectedA4(hpN), 8);
    // The whole resonance gain is counted: the difference follows the formula.
    expect(finalStats(receiver).get('atk_speed') - finalStats(receiver2).get('atk_speed'))
        .toBeCloseTo((hpR - hpN) * 0.0005 / 100, 8);
});

test("A4 ignores extra ATK (Bennett burst) and extra EM (Key of Khaj-Nisut)", () => {
    const {dahlia, receiver} = neutralTeam();
    matchCarrierTotals(dahlia, {hp_total: 30000});
    const before = finalStats(receiver).get('atk_speed');
    expect(before).toBeCloseTo(expectedA4(30000), 8);

    // Bennett's burst ATK is extra ATK on the on-field receiver; the bonus
    // reads HP, so it must not move. Bennett is Pyro here, still no resonance.
    const bennett = makeBuild('Bennet');
    const team = receiver.team;
    team.setMember(2, bennett);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const atkBefore = finalStats(receiver).get('atk');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(finalStats(receiver).get('atk') - atkBefore).toBeGreaterThan(10);
    expect(finalStats(receiver).get('atk_speed')).toBeCloseTo(before, 10);

    // The Key's party EM is extra EM; it must not move the HP-read bonus.
    // Kazuha cannot resonate here (anemo, alone among the four).
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(2, kazuha);
    team.setMember(3, makeBuild('Hutao'));
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const emBefore = totalMastery(finalStats(receiver));
    expect(finalStats(receiver).get('atk_speed')).toBeCloseTo(before, 8);
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    expect(totalMastery(finalStats(receiver)) - emBefore).toBeGreaterThan(1);
    expect(finalStats(receiver).get('atk_speed')).toBeCloseTo(before, 8);
});
