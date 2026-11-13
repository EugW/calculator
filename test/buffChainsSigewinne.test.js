import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { featureValues, finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Sigewinne.
//
// - A1 Convalescence flat skill DMG (FeatureMultiplier, receivers OTHERS +
//   off-field, scaling 'hp*', exceed 30000, capped): the game
//   (Avatar_Sigewinne_PermanentSkill_1_Driver) reads FIGHT_PROP_MAX_HP
//   (total) into DamageUpRatioCache and applies it as ModifyDamageCountMixin
//   damageExtra on Elemental Skill hits. scaling 'hp*' is the total by
//   construction: default confirmed, no params. KQM Sigewinne has no
//   EM/ATK/HP/ER buff-chain test. GO reads input.total.hp. Game formula:
//   min(max(HP - 30000, 0) * 80/1000, 2800), C1 100/1000 max 3500
//   (ProudSkill Sigewinne_PermanentSkill_1 params [80, 2800, ..., 30000]).
// - A1 display value (FeaturePostEffectValue sigewinne_hp_buff,
//   PostEffectStatsHP, reads TOTAL since the channel migration): same game
//   read as above; the TOTAL declaration is the classification. Tables
//   (80/1000, 100/1000; caps 2800/3500) match the text; verified, unchanged.
// - A1 self Hydro DMG 8% (Avatar_Sigewinne_P1_Buff_On_Sigewinne writes
//   Actor_WaterAddHurtDelta, no stat read): flat condition, always premod.
// - A4 healing bonus (PostEffectStats from sigewinne_detailed_diagnosis):
//   the game (Avatar_Sigewinne_PermanentSkill_2) reads the Bond of Life
//   (FIGHT_PROP_CUR_HP_DEBTS), not a split stat, and writes through a
//   heal-up mixin (no Actor channel). Default (extra write) confirmed.
//   Formula: min(bond * 3/1000, 30%).
// - C2 shield (FeatureShield scaling 'hp*') reads the total by construction;
//   C2 Hydro RES shred (UNIQUE_Sigewinne_Talent_2_Water_Subhurt writes
//   Actor_WaterSubHurtDelta, no stat read) is a flat TEAM condition.
// - C6 CRIT (two PostEffectStatsHP): the game
//   (Avatar_Sigewinne_Talent_6_Crit_Buff_Driver) reads FIGHT_PROP_MAX_HP
//   (total) into Critical_Rate/Damage_Cache, applied as ModifyDamageMixin
//   bonusCritical/bonusCriticalHurt scoped to the burst. GO reads
//   input.total.hp (burst-scoped). Declared reads: TOTAL. The game writes a
//   burst hit bonus, not an attribute (text and game data both scope it to
//   Super Saturated Syringing): the effects write crit_rate_burst and
//   crit_dmg_burst, which only her burst hits read and which have no extra
//   lane. Value fix: both tables were /10 (100x over scale, always at
//   cap); now /1000 (0.4%/2.2% per 1000 HP, caps 20%/110%), as Nilou's C6.
// - C1 only switches the A1 ratio through sigewinne_buff_level; no stat read.
//
// No ability writes extra HP, so premod and total HP agree until one does;
// per the worker guide an explicit total read (FIGHT_PROP_MAX_HP) is still
// declared TOTAL. A 4-member team is used throughout: a smaller team would
// get Elemental Resonance in our engine but not in the game.

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

// Game formulas (decimal crit/healing, flat skill DMG).
function expectedA1(hp, c1) {
    return Math.min(Math.max(hp - 30000, 0) * (c1 ? 100 : 80) / 1000, c1 ? 3500 : 2800);
}

function expectedC6CR(hp) {
    return Math.min(hp * 0.4 / 100 / 1000, 0.20);
}

function expectedC6CD(hp) {
    return Math.min(hp * 2.2 / 100 / 1000, 1.10);
}

// Sigewinne (hydro) + Eula (cryo) + Sucrose (anemo) + Noelle (geo): four
// different elements, so no Elemental Resonance applies.
function neutralTeam(constellation = 0) {
    const sigewinne = makeBuild('Sigewinne');
    sigewinne.setCharLevels({level: 90, ascension: 6, constellation});
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, sigewinne);
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Noelle'));
    // Sigewinne on field, so the receiver is off-field for her A1.
    team.setOnFieldMember(sigewinne);
    return {team, sigewinne, receiver};
}

function firstSkillNormal(build) {
    const feats = build.calcFeatures(1);
    const key = Object.keys(feats).find((k) => k.startsWith('skill.'));
    return feats[key].normal;
}

// A1 bonus: receiver skill flat-DMG delta between the toggle on and off at
// the same Sigewinne HP. Feature damage goes through enemy mitigation, so
// delivered deltas are only compared as ratios/differences; the absolute
// HP-to-bonus math is pinned by the display value below (same constants).
function a1bonus(sigewinne, receiver) {
    sigewinne.setCharSettings({sigewinne_requires_appropriate_rest: true});
    const on = firstSkillNormal(receiver);
    sigewinne.setCharSettings({sigewinne_requires_appropriate_rest: false});
    return on - firstSkillNormal(receiver);
}

// A1 display value (other.sigewinne_hp_buff): the raw HP-scaled bonus with
// no mitigation, for absolute parity checks.
function a1display(sigewinne) {
    const feat = sigewinne.calcFeatures(1)['other.sigewinne_hp_buff'];
    return feat ? feat.normal : 0;
}

// C6 bonus: Sigewinne's burst CRIT deltas between the toggle on and off.
function c6bonus(sigewinne) {
    sigewinne.setCharSettings({sigewinne_would_the_most_radiant_of_spirits_pray_for_me: true});
    const onCR = finalStats(sigewinne).get('crit_rate_burst') || 0;
    const onCD = finalStats(sigewinne).get('crit_dmg_burst') || 0;
    sigewinne.setCharSettings({sigewinne_would_the_most_radiant_of_spirits_pray_for_me: false});
    return {
        cr: onCR - (finalStats(sigewinne).get('crit_rate_burst') || 0),
        cd: onCD - (finalStats(sigewinne).get('crit_dmg_burst') || 0),
    };
}

test("A1 formula parity: HP-scaled flat skill DMG, C0 and C1, cap binds", () => {
    const {sigewinne, receiver} = neutralTeam(0);
    // Sanity on the game formula itself.
    expect(expectedA1(30000, false)).toBeCloseTo(0, 9);
    expect(expectedA1(40000, false)).toBeCloseTo(800, 9);
    expect(expectedA1(65000, false)).toBeCloseTo(2800, 9);

    // Absolute math through the unmitigated display value (same constants as
    // the delivered multiplier).
    for (const hp of [30000, 32000, 40000, 65000, 80000]) {
        matchCarrierTotals(sigewinne, {hp_total: hp});
        expect(totalHp(finalStats(sigewinne))).toBeCloseTo(hp, 6);
        expect(a1display(sigewinne)).toBeCloseTo(expectedA1(hp, false), 6);
    }
    // Delivered to the off-field receiver: zero at the threshold, scales
    // 5x from 32k to 40k ((40000-30000)/(32000-30000)), capped flat above.
    matchCarrierTotals(sigewinne, {hp_total: 30000});
    expect(a1bonus(sigewinne, receiver)).toBeCloseTo(0, 8);
    matchCarrierTotals(sigewinne, {hp_total: 32000});
    const bonus32 = a1bonus(sigewinne, receiver);
    expect(bonus32).toBeGreaterThan(0);
    matchCarrierTotals(sigewinne, {hp_total: 40000});
    expect(a1bonus(sigewinne, receiver) / bonus32).toBeCloseTo(5, 6);
    matchCarrierTotals(sigewinne, {hp_total: 65000});
    const bonusCap = a1bonus(sigewinne, receiver);
    matchCarrierTotals(sigewinne, {hp_total: 80000});
    expect(a1bonus(sigewinne, receiver)).toBeCloseTo(bonusCap, 6);
    // C1 ratio: 100 per 1000, cap 3500.
    const c1 = neutralTeam(1);
    matchCarrierTotals(c1.sigewinne, {hp_total: 40000});
    expect(a1display(c1.sigewinne)).toBeCloseTo(1000, 6);
    expect(a1bonus(c1.sigewinne, c1.receiver) / bonus32).toBeCloseTo(1000 / 160, 5);
    matchCarrierTotals(c1.sigewinne, {hp_total: 80000});
    expect(a1display(c1.sigewinne)).toBeCloseTo(3500, 6);
    // Gates: ascension 0 removes both the display and the delivered bonus;
    // an on-field receiver gets nothing (off-field required).
    sigewinne.setCharLevels({level: 90, ascension: 0, constellation: 0});
    matchCarrierTotals(sigewinne, {hp_total: 40000});
    expect(a1display(sigewinne)).toBeCloseTo(0, 8);
    expect(a1bonus(sigewinne, receiver)).toBeCloseTo(0, 8);
    sigewinne.setCharLevels({level: 90, ascension: 6, constellation: 0});
    matchCarrierTotals(sigewinne, {hp_total: 40000});
    receiver.team.setOnFieldMember(receiver);
    expect(a1bonus(sigewinne, receiver)).toBeCloseTo(0, 8);
});

test("A1 counts premod HP: Hydro resonance", () => {
    // Resonance team: hydro pair (Barbara + Xingqiu) -> +25% Max HP (a
    // stage-0 premod condition). A total read counts premod writes.
    const sigewinneR = makeBuild('Sigewinne');
    sigewinneR.setCharLevels({level: 90, ascension: 6, constellation: 0});
    const receiverR = makeBuild('Eula');
    const teamR = Team.fromMember(receiverR);
    teamR.setMember(1, sigewinneR);
    teamR.setMember(2, makeBuild('Barbara'));
    teamR.setMember(3, makeBuild('Xingqiu'));
    teamR.setOnFieldMember(sigewinneR);
    // Both carriers need HP above the 30000 threshold for a nonzero bonus;
    // the flat custom buff preserves the resonance gap.
    sigewinneR.modifyBuffsSettings({'custom_buffs.hp': 20000});
    const {sigewinne, receiver} = neutralTeam(0);
    sigewinne.modifyBuffsSettings({'custom_buffs.hp': 20000});
    const hpR = totalHp(finalStats(sigewinneR));
    const hpN = totalHp(finalStats(sigewinne));
    // Sanity: resonance actually raised Sigewinne's HP% by 25 points.
    expect(finalStats(sigewinneR).get('hp_percent') - finalStats(sigewinne).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(hpR).toBeGreaterThan(hpN);
    // Absolute: the display follows the live (resonated) HP exactly.
    expect(a1display(sigewinneR)).toBeCloseTo(expectedA1(hpR, false), 5);
    expect(a1display(sigewinne)).toBeCloseTo(expectedA1(hpN, false), 5);
    // Delivered scales by the same factor (mitigation cancels in the ratio).
    expect(a1bonus(sigewinneR, receiverR) / a1bonus(sigewinne, receiver))
        .toBeCloseTo(expectedA1(hpR, false) / expectedA1(hpN, false), 5);
});

test("A1 ignores extra stats of other kinds (Key party EM, Bennett ATK)", () => {
    const {sigewinne, receiver} = neutralTeam(0);
    const team = receiver.team;
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    // Neutral team has no spare slot: Kazuha holds the Key from Sucrose's.
    team.setMember(2, kazuha);
    const bennett = makeBuild('Bennet');
    team.setMember(3, bennett);
    team.setOnFieldMember(sigewinne);
    matchCarrierTotals(sigewinne, {hp_total: 40000});
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = a1bonus(sigewinne, receiver);
    const displayBefore = a1display(sigewinne);
    expect(displayBefore).toBeCloseTo(800, 5);
    expect(before).toBeGreaterThan(0);

    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    // Sanity: the Key and the burst actually moved extra EM/ATK on Sigewinne.
    expect(totalMastery(finalStats(sigewinne)) - sigewinne.getBuildData().stats.get('mastery_base')).toBeGreaterThan(1);
    expect(totalAtk(finalStats(sigewinne))).toBeGreaterThan(0);
    // The HP-read A1 bonus does not move, displayed or delivered.
    expect(a1display(sigewinne)).toBeCloseTo(displayBefore, 8);
    expect(a1bonus(sigewinne, receiver)).toBeCloseTo(before, 8);
});

test("C6 formula parity: 0.4%/2.2% per 1000 HP, caps bind at 50k and hold", () => {
    const {sigewinne} = neutralTeam(6);
    // Sanity on the game formula itself.
    expect(expectedC6CR(30000)).toBeCloseTo(0.12, 9);
    expect(expectedC6CD(30000)).toBeCloseTo(0.66, 9);
    expect(expectedC6CR(40000)).toBeCloseTo(0.16, 9);
    expect(expectedC6CD(40000)).toBeCloseTo(0.88, 9);

    for (const hp of [30000, 40000, 50000, 80000]) {
        matchCarrierTotals(sigewinne, {hp_total: hp});
        const bonus = c6bonus(sigewinne);
        expect(bonus.cr).toBeCloseTo(expectedC6CR(hp), 6);
        expect(bonus.cd).toBeCloseTo(expectedC6CD(hp), 6);
    }
    // Below C6 the toggle writes nothing.
    const c0 = neutralTeam(0);
    matchCarrierTotals(c0.sigewinne, {hp_total: 50000});
    const none = c6bonus(c0.sigewinne);
    expect(none.cr).toBeCloseTo(0, 10);
    expect(none.cd).toBeCloseTo(0, 10);
});

test("C6 counts premod HP: Hydro resonance", () => {
    const sigewinneR = makeBuild('Sigewinne');
    sigewinneR.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const teamR = Team.fromMember(makeBuild('Eula'));
    teamR.setMember(1, sigewinneR);
    teamR.setMember(2, makeBuild('Barbara'));
    teamR.setMember(3, makeBuild('Xingqiu'));
    teamR.setOnFieldMember(sigewinneR);

    const {sigewinne} = neutralTeam(6);
    const hpR = totalHp(finalStats(sigewinneR));
    const hpN = totalHp(finalStats(sigewinne));
    expect(hpR).toBeGreaterThan(hpN);
    const bonusR = c6bonus(sigewinneR);
    const bonusN = c6bonus(sigewinne);
    expect(bonusR.cr).toBeCloseTo(expectedC6CR(hpR), 6);
    expect(bonusR.cd).toBeCloseTo(expectedC6CD(hpR), 6);
    expect(bonusN.cr).toBeCloseTo(expectedC6CR(hpN), 6);
    expect(bonusN.cd).toBeCloseTo(expectedC6CD(hpN), 6);
});

test("C6 CRIT reaches her burst hits only", () => {
    const {sigewinne} = neutralTeam(6);
    matchCarrierTotals(sigewinne, {hp_total: 40000});
    const C6 = 'sigewinne_would_the_most_radiant_of_spirits_pray_for_me';

    // crit / normal of a hit is 1 + its CRIT DMG.
    function critDmg(name) {
        // Features cache their compiled program: recompile for this state.
        for (const feature of DB.Chars.get('Sigewinne').getFeatures()) feature.compiled = undefined;
        const [normal, crit] = featureValues(sigewinne)[name];
        return crit / normal - 1;
    }

    sigewinne.setCharSettings({[C6]: false});
    const off = finalStats(sigewinne);
    const burstOff = critDmg('burst.burst_dmg');
    const skillOff = critDmg('skill.sigewinne_bolstering_bubblebalm_dmg');
    const normalOff = critDmg('attack.normal_hit_1');

    sigewinne.setCharSettings({[C6]: true});
    const on = finalStats(sigewinne);
    // Her general CRIT does not move, and nothing lands in the extra lanes.
    expect(on.get('crit_rate')).toBeCloseTo(off.get('crit_rate'), 10);
    expect(on.get('crit_dmg')).toBeCloseTo(off.get('crit_dmg'), 10);
    expect(on.get('crit_rate_extra') || 0).toBe(0);
    expect(on.get('crit_dmg_extra') || 0).toBe(0);
    expect(on.get('crit_rate_burst')).toBeCloseTo(expectedC6CR(40000), 6);
    expect(on.get('crit_dmg_burst')).toBeCloseTo(expectedC6CD(40000), 6);

    // Super Saturated Syringing gains the CRIT DMG; her skill and Normal
    // Attacks do not.
    expect(critDmg('burst.burst_dmg') - burstOff).toBeCloseTo(expectedC6CD(40000), 6);
    expect(critDmg('skill.sigewinne_bolstering_bubblebalm_dmg')).toBeCloseTo(skillOff, 8);
    expect(critDmg('attack.normal_hit_1')).toBeCloseTo(normalOff, 8);
});

test("C6 ignores extra stats of other kinds (Key party EM, Bennett ATK)", () => {
    const {sigewinne} = neutralTeam(6);
    const team = sigewinne.team;
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(2, kazuha);
    const bennett = makeBuild('Bennet');
    team.setMember(3, bennett);
    team.setOnFieldMember(sigewinne);
    matchCarrierTotals(sigewinne, {hp_total: 40000});
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = c6bonus(sigewinne);

    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(totalMastery(finalStats(sigewinne)) - sigewinne.getBuildData().stats.get('mastery_base')).toBeGreaterThan(1);
    const after = c6bonus(sigewinne);
    expect(after.cr).toBeCloseTo(before.cr, 6);
    expect(after.cd).toBeCloseTo(before.cd, 6);
});

test("A4 formula parity: healing bonus from Bond of Life", () => {
    const {sigewinne} = neutralTeam(0);
    sigewinne.setCharSettings({sigewinne_detailed_diagnosis: 0});
    const base = finalStats(sigewinne).get('healing') || 0;
    sigewinne.setCharSettings({sigewinne_detailed_diagnosis: 10000});
    expect(finalStats(sigewinne).get('healing') - base).toBeCloseTo(0.3, 8);
    sigewinne.setCharSettings({sigewinne_detailed_diagnosis: 5000});
    expect(finalStats(sigewinne).get('healing') - base).toBeCloseTo(0.15, 8);
});

test("solo parity: A1 and C6 follow the game formula with no teammate stats", () => {
    const sigewinne = makeBuild('Sigewinne');
    sigewinne.setCharLevels({level: 90, ascension: 6, constellation: 6});
    Team.fromMember(sigewinne);
    matchCarrierTotals(sigewinne, {hp_total: 40000});
    const bonus = c6bonus(sigewinne);
    expect(bonus.cr).toBeCloseTo(expectedC6CR(40000), 6);
    expect(bonus.cd).toBeCloseTo(expectedC6CD(40000), 6);
});
