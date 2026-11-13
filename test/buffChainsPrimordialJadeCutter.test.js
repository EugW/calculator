import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery, featureValues } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Primordial Jade Cutter.
//
// - ATK from Max HP (Protector's Virtue, PostEffectStatsHP, 1.2/1.5/1.8/2.1/
//   2.4% of Max HP at R1-R5): the game (Weapon_Sword_Morax_HpToAtk,
//   UNIQUE_Sword_Morax_HpToAtk_Buff) writes Actor_AttackExtraDelta as
//   [FIGHT_PROP_MAX_HP, HptoAtk_Factor, MUL] (extra, default); the buff is
//   re-applied whenever FIGHT_PROP_MAX_HP changes (SetGlobalValue
//   _ABILITY_Sword_Morax_Last_MaxHp, on HP events). FIGHT_PROP_MAX_HP is the
//   total marker (md/buff_chains.md), as for Homa, Hu Tao, Baizhu, Candace,
//   Chevreuse and Columbina; the same number as premod while no ability
//   writes extra HP. Declared reads: TOTAL. GO reads input.premod.hp here
//   (supporting evidence only; the data says total). KQM weapons TCL lists
//   the weapon with its description only; no buff-chain interaction test.
//   Game formula (R1): Max HP x 1.2%.
// - HP% (20-40%, ConditionStaticRefine) and the text_percent display number
//   are flat conditions: always premod, right for ordinary percent buffs,
//   and need nothing. The HP% is FIGHT_PROP_HP_PERCENT in the affix
//   (EquipAffixExcelConfigData 111505, openConfig Weapon_Sword_Morax_HpToAtk,
//   paramList [HP rate, HptoAtk_Factor]).
// - atk_bonus (FeaturePostEffectValue) displays the post-effect's value,
//   reads no stat itself and needs nothing.
//
// The weapon has no toggle: the buff is measured through the holder's
// weapon.atk_bonus feature (the post-effect's computed value) and the
// holder's flat atk, in teams with no other ATK/HP sources. A 4-member team
// is used throughout: a smaller team would get Elemental Resonance in our
// engine but not in the game (md/buff_chains.md).

// Game rates (affix paramList HptoAtk_Factor at each refinement).
const RATES = {1: 0.012, 5: 0.024};
// Durin A4 (Primordial Fusion): 3% DMG per 100 ATK of total ATK, cap 75%
// (Durin.js: percent 3/100 on dmg_burst_periodic_special, statCap 75;
// FIGHT_PROP_CUR_ATTACK, reads TOTAL).
const DURIN_RATE = 0.03 / 100;
const DURIN_CAP = 0.75;
// Bennett burst ATK ratio at burst 10, C0 (charTalentTables.Bennett.s3.p4[9]
// = 100.8; no C1 bonus below C1).
const BENNETT_RATIO = 100.8 / 100;

function equipPJC(build, refine = 1) {
    build.setWeapon(DB.Weapons.get('sword').get('PrimordialJadeCutter'));
    build.setWeaponLevels({level: 90, ascension: 6, refine});
}

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

// The weapon's ATK buff on its holder (the post-effect's computed value).
function pjcBuff(holder) {
    return featureValues(holder)['weapon.atk_bonus'][0];
}

// Bennett (pyro) + Eula (cryo) + Sucrose (anemo) + Noelle (geo): four
// different elements, so no Elemental Resonance applies.
function neutralTeam(holderKey = 'Bennet') {
    const holder = makeBuild(holderKey);
    const team = Team.fromMember(holder);
    if (holderKey != 'Bennet') team.setMember(1, makeBuild('Bennet'));
    else team.setMember(1, makeBuild('Eula'));
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(holder);
    equipPJC(holder, 1);
    return {team, holder};
}

test("formula parity: Max HP x rate at R1 and R5; holder alone is unchanged", () => {
    const {holder} = neutralTeam();
    // The HP% is a premod condition: no flat HP, no extra HP lane (before
    // matchCarrierTotals adds its own flat test buff below).
    expect(finalStats(holder).get('hp')).toBeCloseTo(0, 9);
    expect(finalStats(holder).get('hp_extra')).toBe(0);
    expect(pjcBuff(holder)).toBeCloseTo(totalHp(finalStats(holder)) * RATES[1], 6);
    for (const hp of [15000, 30000]) {
        matchCarrierTotals(holder, {hp_total: hp});
        expect(totalHp(finalStats(holder))).toBeCloseTo(hp, 6);
        expect(pjcBuff(holder)).toBeCloseTo(hp * RATES[1], 6);
        // No other flat ATK source: the holder's flat atk is the buff (the
        // flat hp here is matchCarrierTotals' own test buff).
        expect(finalStats(holder).get('atk')).toBeCloseTo(hp * RATES[1], 6);
    }
    // Sanity on the game rate: 30k HP at R1 is 360 ATK.
    matchCarrierTotals(holder, {hp_total: 30000});
    expect(pjcBuff(holder)).toBeCloseTo(360, 6);

    holder.setWeaponLevels({level: 90, ascension: 6, refine: 5});
    matchCarrierTotals(holder, {hp_total: 30000});
    expect(totalHp(finalStats(holder))).toBeCloseTo(30000, 6);
    expect(pjcBuff(holder)).toBeCloseTo(30000 * RATES[5], 6);
    expect(pjcBuff(holder)).toBeCloseTo(720, 6);
});

test("buff counts premod HP: Hydro resonance", () => {
    // Resonance team: hydro pair (Barbara + Xingqiu) -> +25% Max HP (a
    // stage-0 premod condition). A total read counts premod writes.
    const holderR = makeBuild('Bennet');
    const teamR = Team.fromMember(holderR);
    teamR.setMember(1, makeBuild('Barbara'));
    teamR.setMember(2, makeBuild('Xingqiu'));
    teamR.setMember(3, makeBuild('Sucrose'));
    teamR.setOnFieldMember(holderR);
    equipPJC(holderR, 1);

    // Same holder build without resonance: pyro/hydro/cryo/anemo, no pair.
    const holderN = makeBuild('Bennet');
    const teamN = Team.fromMember(holderN);
    teamN.setMember(1, makeBuild('Barbara'));
    teamN.setMember(2, makeBuild('Eula'));
    teamN.setMember(3, makeBuild('Sucrose'));
    teamN.setOnFieldMember(holderN);
    equipPJC(holderN, 1);

    const hpR = totalHp(finalStats(holderR));
    const hpN = totalHp(finalStats(holderN));
    // Sanity: resonance actually raised the holder's HP% by 25 points.
    expect(finalStats(holderR).get('hp_percent') - finalStats(holderN).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(hpR).toBeGreaterThan(hpN);
    expect(pjcBuff(holderR)).toBeCloseTo(hpR * RATES[1], 6);
    expect(pjcBuff(holderN)).toBeCloseTo(hpN * RATES[1], 6);
    // The whole resonance gain is counted.
    expect(pjcBuff(holderR) - pjcBuff(holderN)).toBeCloseTo((hpR - hpN) * RATES[1], 6);
});

test("buff ignores extra EM (Key of Khaj-Nisut party EM)", () => {
    // Bennett + Eula + Kazuha (Key) + Noelle: still no resonance. The Key's
    // party EM is extra EM on the holder; the buff reads HP, not EM.
    const holder = makeBuild('Bennet');
    const team = Team.fromMember(holder);
    team.setMember(1, makeBuild('Eula'));
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(2, kazuha);
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(holder);
    equipPJC(holder, 1);
    matchCarrierTotals(holder, {hp_total: 30000});
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const before = pjcBuff(holder);
    const emBefore = totalMastery(finalStats(holder));

    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    // Sanity: the Key actually raised the holder's (extra) EM.
    expect(totalMastery(finalStats(holder)) - emBefore).toBeGreaterThan(1);
    expect(pjcBuff(holder)).toBeCloseTo(before, 6);
});

test("buff ignores extra ATK (Bennett burst)", () => {
    // Xingqiu (hydro, on field) + Bennett + Sucrose + Noelle: no pair, no
    // resonance. Bennett's burst is extra ATK on the holder; the buff reads
    // HP, so it must not move.
    const holder = makeBuild('Xingqiu');
    const team = Team.fromMember(holder);
    const bennett = makeBuild('Bennet');
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(holder);
    equipPJC(holder, 1);
    matchCarrierTotals(holder, {hp_total: 30000});
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = pjcBuff(holder);
    const atkBefore = totalAtk(finalStats(holder));

    bennett.setCharSettings({bennet_fantastic_voyage: true});
    // Sanity: the burst actually raised the holder's (extra) ATK.
    expect(totalAtk(finalStats(holder)) - atkBefore).toBeGreaterThan(10);
    expect(pjcBuff(holder)).toBeCloseTo(before, 6);
});

test("extra ATK is counted by total readers: Durin A4", () => {
    // Durin (pyro sword) holds PJC: his A4 reads FIGHT_PROP_CUR_ATTACK
    // (total), so it must count the weapon's extra ATK. A premod read of the
    // same ATK would give 0.108 less at 30k HP R1 (0.03 x 360 / 100).
    const durin = makeBuild('Durin');
    const team = Team.fromMember(durin);
    team.setMember(1, makeBuild('Eula'));
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(durin);
    equipPJC(durin, 1);
    matchCarrierTotals(durin, {hp_total: 30000});

    durin.setCharSettings({durin_primordial_fusion: false});
    const off = finalStats(durin).get('dmg_burst_periodic_special') || 0;
    expect(off).toBe(0);
    durin.setCharSettings({durin_primordial_fusion: true});
    const stats = finalStats(durin);
    const atk = totalAtk(stats);
    const wantTotal = Math.min(DURIN_RATE * atk, DURIN_CAP);
    expect(stats.get('dmg_burst_periodic_special')).toBeCloseTo(wantTotal, 8);
    // The buff (360 ATK here) is in that total: a premod read would miss it.
    const buff = pjcBuff(durin);
    expect(buff).toBeCloseTo(360, 6);
    const wantPremod = Math.min(DURIN_RATE * (atk - buff), DURIN_CAP);
    expect(wantTotal - wantPremod).toBeCloseTo(0.108, 8);
    expect(stats.get('dmg_burst_periodic_special') - wantPremod).toBeCloseTo(0.108, 6);
});

test("extra ATK is not counted by base readers: Bennett burst with PJC", () => {
    // Bennett (sword) holds PJC: his burst reads base ATK only, so the
    // weapon's extra ATK must not reach the receiver's share. C0, burst 10:
    // share = base ATK x 100.8%.
    const bennett = makeBuild('Bennet');
    const team = Team.fromMember(bennett);
    const receiver = makeBuild('Eula');
    team.setMember(1, receiver);
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(receiver);
    equipPJC(bennett, 1);
    const baseAtk = finalStats(bennett).get('atk_base');
    // Sanity: PJC actually raised Bennett's (extra) ATK well above base.
    expect(totalAtk(finalStats(bennett)) - baseAtk).toBeGreaterThan(100);

    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const off = totalAtk(finalStats(receiver));
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    const share = totalAtk(finalStats(receiver)) - off;
    expect(share).toBeCloseTo(baseAtk * BENNETT_RATIO, 6);
});
