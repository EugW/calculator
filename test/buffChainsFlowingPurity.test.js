import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Flowing Purity (Weapon_Catalyst_Vorpal).
//
// - Flat Elemental DMG% on skill (ConditionBooleanRefine, 8% R1): the game
//   (UNIQUE_Catalyst_Vorpal_Buff1) writes plain Actor_*AddHurtDelta = Rate1
//   (no "Extra"): premod. Flat conditions are premod by construction, no
//   params. GO writes it under premod: as well.
// - BoL-cleared Elemental DMG% (PostEffectStatsBondOfLife, 2% R1 per 1000 HP
//   cleared, cap 12% R1): the game grants the Bond with AddHPDebts value
//   [Debts, FIGHT_PROP_MAX_HP, MUL] (FIGHT_PROP_MAX_HP is the total marker;
//   affix 114425 R1 Debts 0.24 = 24% of Max HP), then the HPDebtsMixin sets
//   Attack = TotalDebts (GetHPPaidDebts) * Ratio2 * 0.001 (R1 Ratio2 0.02:
//   1000 HP -> 2%) capped at MaxAttack (R1 0.12 = 12%), and
//   UNIQUE_Catalyst_Vorpal_Buff2 writes plain Actor_*AddHurtDelta (no
//   "Extra"): a premod DMG% write, as Citlali C6. GO
//   (Weapons/Catalyst/FlowingPurity) reads input.total.hp and writes both
//   DMG% parts under premod:. KQM TCL lists the weapon text with no
//   buff-chain test. Declared reads: TOTAL (explicit total read, same number
//   as premod while no ability writes extra HP) and writes: PREMOD.
// - Bond-of-Life amount entry (ConditionNumberLevels, text_* only): display,
//   needs nothing.
// - FeaturePostEffectValue shows the post-effect's value: display, needs
//   nothing.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).
//
// Note: setWeaponSettings replaces the build's weapon settings, so every
// call below passes the holder's full relevant settings (flat toggle and
// Bond amount together).

// Game formula at R1 (weapon text, affix 114425, GO): flat 8%, plus cleared
// HP * 2% per 1000 (0.00002 per HP), capped at 12%. Cleared HP in our model
// is HP_total * bol / 100, where bol is the weapon_bol setting (BoL %).
const FLAT_R1 = 0.08;
const PER_HP_R1 = 0.02 / 1000;
const CAP_R1 = 0.12;

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function expectedBol(hp, bol) {
    return Math.min(hp * (bol / 100) * PER_HP_R1, CAP_R1);
}

function withFlowingPurity(key) {
    const build = makeBuild(key);
    build.setWeapon(DB.Weapons.get('catalyst').get('FlowingPurity'));
    build.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    return build;
}

// Barbara (hydro catalyst) holds, Eula (cryo) + Sucrose (anemo) + Noelle
// (geo): four different elements, so no Elemental Resonance applies.
// Barbara has no attribute post-effects of her own, so her dmg_* is the
// weapon's alone. She stays on field throughout.
function neutralTeam() {
    const holder = withFlowingPurity('Barbara');
    const team = Team.fromMember(holder);
    team.setMember(1, makeBuild('Eula'));
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(holder);
    holder.setWeaponSettings({weapon_flowing_purity_1: false, weapon_flowing_purity_bol: 0});
    return {team, holder};
}

// The BoL-cleared bonus in isolation (flat off): holder dmg_hydro with the
// Bond amount on minus with it off. HP is untouched by the DMG% toggles, so
// the delta is the buff.
function bolBuff(holder, bol) {
    holder.setWeaponSettings({weapon_flowing_purity_1: false, weapon_flowing_purity_bol: 0});
    const off = finalStats(holder).get('dmg_hydro');
    holder.setWeaponSettings({weapon_flowing_purity_1: false, weapon_flowing_purity_bol: bol});
    const on = finalStats(holder).get('dmg_hydro');
    return on - off;
}

function flatBuff(holder) {
    holder.setWeaponSettings({weapon_flowing_purity_1: false, weapon_flowing_purity_bol: 0});
    const off = finalStats(holder).get('dmg_hydro');
    holder.setWeaponSettings({weapon_flowing_purity_1: true, weapon_flowing_purity_bol: 0});
    const on = finalStats(holder).get('dmg_hydro');
    return on - off;
}

test("formula parity: flat 8%, BoL 2% per 1000 HP capped at 12%, solo numbers unchanged", () => {
    const {holder} = neutralTeam();
    // Sanity: the game rates at R1 (weapon text, affix 114425).
    expect(FLAT_R1).toBeCloseTo(0.08, 9);
    expect(PER_HP_R1 * 1000).toBeCloseTo(0.02, 9);
    expect(expectedBol(6000, 100)).toBeCloseTo(CAP_R1, 9);
    expect(flatBuff(holder)).toBeCloseTo(FLAT_R1, 9);

    // Linear zone: HP 20000, BoL 10% -> cleared 2000 -> 4%.
    matchCarrierTotals(holder, {hp_total: 20000});
    const hp20 = totalHp(finalStats(holder));
    expect(hp20).toBeCloseTo(20000, 6);
    expect(bolBuff(holder, 10)).toBeCloseTo(expectedBol(hp20, 10), 6);
    expect(expectedBol(hp20, 10)).toBeCloseTo(0.04, 6);
    expect(expectedBol(hp20, 10)).toBeLessThan(CAP_R1);

    // Capped zone: HP 30000, BoL 24% -> cleared 7200 -> 14.4%, capped 12%.
    matchCarrierTotals(holder, {hp_total: 30000});
    const hp30 = totalHp(finalStats(holder));
    expect(hp30).toBeCloseTo(30000, 6);
    expect(bolBuff(holder, 24)).toBeCloseTo(CAP_R1, 6);
    expect(hp30 * 0.24 * PER_HP_R1).toBeGreaterThan(CAP_R1);

    // Both parts stack: flat + capped BoL = 20% at R1.
    holder.setWeaponSettings({weapon_flowing_purity_1: false, weapon_flowing_purity_bol: 0});
    const base = finalStats(holder).get('dmg_hydro');
    holder.setWeaponSettings({weapon_flowing_purity_1: true, weapon_flowing_purity_bol: 24});
    expect(finalStats(holder).get('dmg_hydro') - base).toBeCloseTo(FLAT_R1 + CAP_R1, 6);
});

test("premod DMG% writes: nothing lands in the extra lanes", () => {
    const {holder} = neutralTeam();
    matchCarrierTotals(holder, {hp_total: 20000});
    holder.setWeaponSettings({weapon_flowing_purity_1: true, weapon_flowing_purity_bol: 10});
    const stats = finalStats(holder);
    const hp = totalHp(stats);
    expect(hp).toBeCloseTo(20000, 6);
    // Flat 8% + linear 4% on every element, all premod.
    for (const ele of ['anemo', 'geo', 'pyro', 'electro', 'hydro', 'cryo', 'dendro']) {
        expect(stats.get('dmg_' + ele)).toBeCloseTo(FLAT_R1 + expectedBol(hp, 10), 6);
        expect(stats.get('dmg_' + ele + '_extra') || 0).toBeCloseTo(0, 9);
    }
});

test("holder hits count the bonus (total DMG% read)", () => {
    const {holder} = neutralTeam();
    matchCarrierTotals(holder, {hp_total: 20000});
    const feature = DB.Chars.get('Barbara').getFeatures()
        .find((item) => item.getName() === 'attack.normal_hit_1');
    holder.setWeaponSettings({weapon_flowing_purity_1: false, weapon_flowing_purity_bol: 0});
    const base = feature.getResult(holder.getBuildData())['attack.normal_hit_1'].normal;
    expect(base).toBeGreaterThan(0);

    holder.setWeaponSettings({weapon_flowing_purity_1: true, weapon_flowing_purity_bol: 10});
    const bonus = FLAT_R1 + expectedBol(totalHp(finalStats(holder)), 10);
    const buffed = feature.getResult(holder.getBuildData())['attack.normal_hit_1'].normal;
    // No other DMG% on Barbara, so the hit scales by (1 + bonus).
    expect(buffed).toBeCloseTo(base * (1 + bonus), 6);
});

test("counts premod HP: Hydro resonance", () => {
    // Resonance team: hydro pair (Barbara holder + Xingqiu) -> +25% Max HP
    // (a stage-0 premod condition). A total read counts premod writes.
    const holderR = withFlowingPurity('Barbara');
    const teamR = Team.fromMember(holderR);
    teamR.setMember(1, makeBuild('Xingqiu'));
    teamR.setMember(2, makeBuild('Eula'));
    teamR.setMember(3, makeBuild('Sucrose'));
    teamR.setOnFieldMember(holderR);

    // Same holder build without resonance: hydro/cryo/anemo/geo.
    const {holder: holderN} = neutralTeam();

    holderR.setWeaponSettings({weapon_flowing_purity_1: false, weapon_flowing_purity_bol: 0});
    holderN.setWeaponSettings({weapon_flowing_purity_1: false, weapon_flowing_purity_bol: 0});
    const hpR = totalHp(finalStats(holderR));
    const hpN = totalHp(finalStats(holderN));
    // Sanity: resonance actually raised the holder's HP% by 25 points.
    expect(finalStats(holderR).get('hp_percent') - finalStats(holderN).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(hpR).toBeGreaterThan(hpN);

    // Both under the cap at BoL 10% (natural HP ~15k-19k): the whole
    // resonance gain is counted at 2% per 1000.
    const bol = 10;
    expect(expectedBol(hpR, bol)).toBeLessThan(CAP_R1);
    expect(expectedBol(hpN, bol)).toBeLessThan(CAP_R1);
    expect(bolBuff(holderR, bol)).toBeCloseTo(expectedBol(hpR, bol), 6);
    expect(bolBuff(holderN, bol)).toBeCloseTo(expectedBol(hpN, bol), 6);
    expect(bolBuff(holderR, bol) - bolBuff(holderN, bol)).toBeCloseTo((hpR - hpN) * (bol / 100) * PER_HP_R1, 6);
});

test("ignores extra ATK (Bennett burst)", () => {
    // Barbara holder + Bennett (pyro) + Eula + Sucrose: hydro/pyro/cryo/anemo,
    // no resonance. Barbara on field so the burst reaches her; the bonus
    // reads her HP.
    const holder = withFlowingPurity('Barbara');
    const team = Team.fromMember(holder);
    const bennett = makeBuild('Bennet');
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Eula'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(holder);
    matchCarrierTotals(holder, {hp_total: 20000});
    const totalAtk = (stats) => stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');

    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = bolBuff(holder, 10);
    const atkBefore = totalAtk(finalStats(holder));

    bennett.setCharSettings({bennet_fantastic_voyage: true});
    // Sanity: the burst actually raised Barbara's (extra) ATK.
    expect(totalAtk(finalStats(holder)) - atkBefore).toBeGreaterThan(10);
    // The HP-read bonus does not move.
    expect(bolBuff(holder, 10)).toBeCloseTo(before, 6);
});

test("ignores extra EM (Key of Khaj-Nisut party EM)", () => {
    // Barbara holder + Kazuha (anemo, Key holder) + Eula + Noelle: no
    // resonance. The Key's party EM is extra EM on Barbara.
    const holder = withFlowingPurity('Barbara');
    const team = Team.fromMember(holder);
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(1, kazuha);
    team.setMember(2, makeBuild('Eula'));
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(holder);
    matchCarrierTotals(holder, {hp_total: 20000});
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const before = bolBuff(holder, 10);
    const emBefore = totalMastery(finalStats(holder));

    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    // Sanity: the Key actually raised Barbara's (extra) EM.
    expect(totalMastery(finalStats(holder)) - emBefore).toBeGreaterThan(1);
    expect(bolBuff(holder, 10)).toBeCloseTo(before, 6);
});
