import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Vodyanitsa.
//
// - C1 team ATK from Max HP (PostEffectStatsHP, 0.8% of HP): the game
//   (UNIQUE_Avatar_Vodyanitsa_Constellation_1_Handler properties)
//   writes Actor_AttackExtraDelta (extra, default) as
//   [FIGHT_PROP_MAX_HP, Vodyanitsa_Constellation_1_AttackUpRatio, MUL].
//   FIGHT_PROP_MAX_HP is the total marker (md/buff_chains.md), as for Hu
//   Tao/Baizhu/Candace/Chevreuse/Columbina; the same number as premod while
//   no ability writes extra HP. Declared reads: TOTAL. No GO sheet and no
//   KQM buff-chain test for Vodyanitsa. Game formula: HP * 0.8% (talent
//   1401 paramList[0] = 0.008, 5s duration).
// - A4 Lead Vocal / Chorus flat damage (FeatureMultiplier scaling 'hp*',
//   40k threshold, 0.14/0.26 per HP, 3500/6500 caps): the game computes
//   Vodyanitsa_Concerto_DamageExtra_IceWater/_StarSwirl from
//   FIGHT_PROP_MAX_HP (total) in
//   UNIQUE_Avatar_Vodyanitsa_Concerto_GrandHandler (and the
//   Concerto_Pre/ExtraPreHandlers; talent 14022 paramList
//   [25, 10, 40000, 260, 140, 6500, 3500]) and applies it as damageExtra
//   (hit-level, no extra lane). Scaling 'hp*' reads the total by
//   construction and needs nothing.
// - Talent hits (skill initial / Horn / burst damageExtra on
//   FIGHT_PROP_MAX_HP) and the skill heal (HealHP amountByCasterMaxHPRatio)
//   read the total by construction (scaling 'hp*') and need nothing.
// - C2/C6 are ModifyDamageMixin hit bonuses with no stat read (flat
//   conditions, always premod, need nothing); C4 HP is Actor_MaxHPRatio
//   (premod HP%, talent 1404 paramList [0.4, 0.5, 0.2, 6, 3]) and a
//   ConditionStacks hp_percent is premod by construction. A1 and the skill
//   RES shred read no stat.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).
//
// Note: setCharSettings replaces the build's char settings, so every call
// below passes the carrier's full relevant settings (C1 toggle, C4 stacks,
// Lead Vocal / Chorus counts).

const C1_RATE = 0.008;
const A4_THRESHOLD = 40000;
const A4_HYDRO_CRYO_PER_HP = 0.14;
const A4_HYDRO_CRYO_CAP = 3500;

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function expectedC1(hp) {
    return hp * C1_RATE;
}

function expectedA4Flat(hp) {
    return Math.min(Math.max(hp - A4_THRESHOLD, 0) * A4_HYDRO_CRYO_PER_HP, A4_HYDRO_CRYO_CAP);
}

function withConstellation(key, constellation) {
    const build = makeBuild(key);
    build.setCharLevels({level: 90, ascension: 6, constellation});
    return build;
}

// Eula (cryo) receives, Vodyanitsa (hydro) carries, Sucrose (anemo) and
// Noelle (geo): four different elements, so no Elemental Resonance applies.
function neutralTeam(vodyConstellation = 1) {
    const receiver = makeBuild('Eula');
    const vody = withConstellation('Vodyanitsa', vodyConstellation);
    const team = Team.fromMember(receiver);
    team.setMember(1, vody);
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(receiver);
    vody.setCharSettings({vodyanitsa_c1_healing: false});
    return {team, receiver, vody};
}

// Vodyanitsa's C1 ATK buff on the receiver: total-ATK delta between C1 on
// and off at the same carrier HP. The carrier's HP is untouched by the
// toggle, so the delta is the buff. `rest` is the carrier's other settings
// (C4 stacks), re-passed because setCharSettings replaces.
function c1Buff(vody, receiver, rest = {}) {
    vody.setCharSettings({...rest, vodyanitsa_c1_healing: false});
    const off = totalAtk(finalStats(receiver));
    vody.setCharSettings({...rest, vodyanitsa_c1_healing: true});
    const on = totalAtk(finalStats(receiver));
    return on - off;
}

test("C1 formula parity: 0.8% of Max HP, solo numbers unchanged", () => {
    const {vody, receiver} = neutralTeam();
    // Sanity: the game rate (talent 1401 paramList[0]).
    expect(C1_RATE).toBeCloseTo(0.008, 9);
    expect(expectedC1(50000)).toBeCloseTo(400, 9);

    for (const hp of [30000, 50000]) {
        matchCarrierTotals(vody, {hp_total: hp});
        const gotHp = totalHp(finalStats(vody));
        expect(gotHp).toBeCloseTo(hp, 6);
        expect(c1Buff(vody, receiver)).toBeCloseTo(expectedC1(gotHp), 6);
    }
});

test("C1 counts premod HP: Hydro resonance", () => {
    // Resonance team: hydro pair (Vodyanitsa + Barbara) -> +25% Max HP (a
    // stage-0 premod condition). A total read counts premod writes.
    const receiverR = makeBuild('Eula');
    const vodyR = withConstellation('Vodyanitsa', 1);
    const teamR = Team.fromMember(receiverR);
    teamR.setMember(1, vodyR);
    teamR.setMember(2, makeBuild('Barbara'));
    teamR.setMember(3, makeBuild('Sucrose'));
    teamR.setOnFieldMember(receiverR);

    // Same Vodyanitsa build without resonance: hydro/cryo/anemo/geo.
    const {receiver: receiverN, vody: vodyN} = neutralTeam();

    const hpR = totalHp(finalStats(vodyR));
    const hpN = totalHp(finalStats(vodyN));
    // Sanity: resonance actually raised Vodyanitsa's HP% by 25 points.
    expect(finalStats(vodyR).get('hp_percent') - finalStats(vodyN).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(hpR).toBeGreaterThan(hpN);
    expect(c1Buff(vodyR, receiverR)).toBeCloseTo(expectedC1(hpR), 6);
    expect(c1Buff(vodyN, receiverN)).toBeCloseTo(expectedC1(hpN), 6);
    // The whole resonance gain is counted (C1 has no threshold or cap).
    expect(c1Buff(vodyR, receiverR) - c1Buff(vodyN, receiverN)).toBeCloseTo((hpR - hpN) * C1_RATE, 6);
});

test("C1 counts C4 premod HP stacks", () => {
    const {vody, receiver} = neutralTeam(4);
    const rest0 = {vodyanitsa_c4_hp_stacks: 0};
    vody.setCharSettings({...rest0, vodyanitsa_c1_healing: true});
    matchCarrierTotals(vody, {hp_total: 30000});
    const hpOff = totalHp(finalStats(vody));
    const atkOff = totalAtk(finalStats(receiver));
    expect(c1Buff(vody, receiver, rest0)).toBeCloseTo(expectedC1(hpOff), 6);

    const rest3 = {vodyanitsa_c4_hp_stacks: 3};
    vody.setCharSettings({...rest3, vodyanitsa_c1_healing: true});
    const hpOn = totalHp(finalStats(vody));
    // Sanity: C4 actually raised HP (3 x 20% premod HP%).
    expect(hpOn - hpOff).toBeGreaterThan(1000);
    expect(c1Buff(vody, receiver, rest3)).toBeCloseTo(expectedC1(hpOn), 6);
    expect(totalAtk(finalStats(receiver)) - atkOff).toBeCloseTo((hpOn - hpOff) * C1_RATE, 6);
});

test("C1 ignores extra ATK (Bennett burst)", () => {
    // Eula + Vodyanitsa + Bennett (pyro) + Sucrose: still no resonance.
    // Eula on field so the burst reaches her; C1 reads Vodyanitsa's HP.
    const receiver = makeBuild('Eula');
    const vody = withConstellation('Vodyanitsa', 1);
    const team = Team.fromMember(receiver);
    team.setMember(1, vody);
    const bennett = makeBuild('Bennet');
    team.setMember(2, bennett);
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(receiver);
    matchCarrierTotals(vody, {hp_total: 30000});
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = c1Buff(vody, receiver);
    const atkBefore = totalAtk(finalStats(receiver));

    bennett.setCharSettings({bennet_fantastic_voyage: true});
    // Sanity: the burst actually raised Eula's (extra) ATK.
    expect(totalAtk(finalStats(receiver)) - atkBefore).toBeGreaterThan(10);
    // The HP-read C1 buff does not move.
    expect(c1Buff(vody, receiver)).toBeCloseTo(before, 6);
});

test("C1 ignores extra EM (Key of Khaj-Nisut party EM)", () => {
    // Eula + Vodyanitsa + Kazuha (anemo, Key holder) + Noelle: no resonance.
    const receiver = makeBuild('Eula');
    const vody = withConstellation('Vodyanitsa', 1);
    const team = Team.fromMember(receiver);
    team.setMember(1, vody);
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(2, kazuha);
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(receiver);
    matchCarrierTotals(vody, {hp_total: 30000});
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const before = c1Buff(vody, receiver);
    const emBefore = totalMastery(finalStats(receiver));

    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    // Sanity: the Key actually raised Eula's (extra) EM.
    expect(totalMastery(finalStats(receiver)) - emBefore).toBeGreaterThan(1);
    expect(c1Buff(vody, receiver)).toBeCloseTo(before, 6);
});

test("C1 extra ATK: Durin A4 (total) counts it, Flins A4 (premod) ignores it", () => {
    // Durin (pyro, on field) + Vodyanitsa (hydro, C1) + Flins (electro) +
    // Sucrose (anemo): no resonance. Durin's A4 reads total ATK (game:
    // FIGHT_PROP_CUR_ATTACK); Flins's A4 reads premod ATK (game:
    // FIGHT_PROP_NONEXTRA_ATTACK). Both start at 1000 total ATK (linear
    // zone for both: Durin 0.0003*1000 = 0.30 under the 0.75 cap; Flins
    // 8%*1000 = 80 EM under the 160 cap).
    const durin = makeBuild('Durin');
    const vody = withConstellation('Vodyanitsa', 1);
    const flins = makeBuild('Flins');
    const team = Team.fromMember(durin);
    team.setMember(1, vody);
    team.setMember(2, flins);
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(durin);
    durin.setCharSettings({durin_primordial_fusion: true});
    vody.setCharSettings({vodyanitsa_c1_healing: false});
    matchCarrierTotals(vody, {hp_total: 50000});
    matchCarrierTotals(durin, {atk_total: 1000});
    matchCarrierTotals(flins, {atk_total: 1000});

    const atkBefore = totalAtk(finalStats(durin));
    const specialBefore = finalStats(durin).get('dmg_burst_periodic_special');
    const flinsEmBefore = totalMastery(finalStats(flins));

    vody.setCharSettings({vodyanitsa_c1_healing: true});
    const atkAfter = totalAtk(finalStats(durin));
    const specialAfter = finalStats(durin).get('dmg_burst_periodic_special');
    // Sanity: C1 delivered 0.8% of 50000 = 400 extra ATK to Durin.
    expect(atkAfter - atkBefore).toBeCloseTo(400, 6);
    // Durin (total read) counts the extra ATK: 3% per 100 ATK.
    expect(specialAfter - specialBefore).toBeCloseTo(0.0003 * (atkAfter - atkBefore), 8);
    expect(specialAfter - specialBefore).toBeGreaterThan(0.01);
    // Flins (premod read) ignores the extra ATK.
    expect(totalMastery(finalStats(flins)) - flinsEmBefore).toBeCloseTo(0, 8);
});

// Barbara (hydro catalyst) on field receives Vodyanitsa's A4 Hydro/Cryo
// flat damage on her normal hits (Lead Vocal stacks). Barbara + Vodyanitsa
// are a hydro pair, so this team HAS Hydro resonance; the carrier totals
// are matched after setup so the resonance is absorbed, and every
// assertion below is a delta at fixed custom buffs.
function a4Team(vodyConstellation = 1) {
    const receiver = makeBuild('Barbara');
    const vody = withConstellation('Vodyanitsa', vodyConstellation);
    const team = Team.fromMember(receiver);
    team.setMember(1, vody);
    team.setMember(2, makeBuild('Eula'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(receiver);
    team.enemy.setResistances({hydro: 0});
    vody.setCharSettings({vodyanitsa_lead_vocal: 0, vodyanitsa_chorus: 0});
    return {team, receiver, vody};
}

// The A4 flat damage delivered to the receiver's normal hit: buffed (Lead
// Vocal stacks) minus baseline (0 stacks). The enemy multiplier is the
// same in both, so deltas scale exactly with the flat. `rest` is the
// carrier's other settings (C4 stacks), re-passed because setCharSettings
// replaces.
function a4Delta(receiver, vody, stacks, rest = {}) {
    const feature = DB.Chars.get('Barbara').getFeatures()
        .find((item) => item.getName() === 'attack.normal_hit_1');
    vody.setCharSettings({...rest, vodyanitsa_lead_vocal: 0, vodyanitsa_chorus: 0});
    const baseline = feature.getResult(receiver.getBuildData())['attack.normal_hit_1'];
    vody.setCharSettings({...rest, vodyanitsa_lead_vocal: stacks, vodyanitsa_chorus: 0});
    const buffed = feature.getResult(receiver.getBuildData())['attack.normal_hit_1'];
    return buffed.normal - baseline.normal;
}

test("A4 formula parity: (HP - 40k) * 0.14, cap 3500", () => {
    const {receiver, vody} = a4Team();
    // Sanity: the game rate, threshold and cap (talent 14022 paramList).
    expect(A4_HYDRO_CRYO_PER_HP).toBeCloseTo(0.14, 9);
    expect(expectedA4Flat(50000)).toBeCloseTo(1400, 9);
    expect(expectedA4Flat(100000)).toBeCloseTo(A4_HYDRO_CRYO_CAP, 9);

    matchCarrierTotals(vody, {hp_total: 50000});
    const hp50 = totalHp(finalStats(vody));
    expect(hp50).toBeCloseTo(50000, 6);
    const delta50 = a4Delta(receiver, vody, 25);
    expect(delta50).toBeGreaterThan(0);
    // The enemy multiplier k = delta50 / flat50 is measured, not assumed.
    const k = delta50 / expectedA4Flat(hp50);

    matchCarrierTotals(vody, {hp_total: 60000});
    const hp60 = totalHp(finalStats(vody));
    expect(a4Delta(receiver, vody, 25)).toBeCloseTo(k * expectedA4Flat(hp60), 6);
    // Linear zone: +10k HP is +1400 flat, so the delta doubles.
    expect(a4Delta(receiver, vody, 25)).toBeCloseTo(2 * delta50, 6);
});

test("A4 counts carrier C4 premod HP, ignores Bennett extra ATK", () => {
    const {receiver, vody} = a4Team(4);
    const rest0 = {vodyanitsa_c4_hp_stacks: 0};
    vody.setCharSettings({...rest0, vodyanitsa_lead_vocal: 0, vodyanitsa_chorus: 0});
    matchCarrierTotals(vody, {hp_total: 50000});
    const hp0 = totalHp(finalStats(vody));
    const k = a4Delta(receiver, vody, 25, rest0) / expectedA4Flat(hp0);

    const rest3 = {vodyanitsa_c4_hp_stacks: 3};
    vody.setCharSettings({...rest3, vodyanitsa_lead_vocal: 0, vodyanitsa_chorus: 0});
    const hp3 = totalHp(finalStats(vody));
    expect(hp3 - hp0).toBeGreaterThan(1000);
    // The whole C4 premod gain is counted (still under the 3500 cap).
    expect(expectedA4Flat(hp3)).toBeLessThan(A4_HYDRO_CRYO_CAP);
    expect(a4Delta(receiver, vody, 25, rest3)).toBeCloseTo(k * expectedA4Flat(hp3), 6);

    // Bennett's burst ATK is extra ATK on the on-field receiver; the bonus
    // reads the carrier's HP, so it must not move. Bennett (pyro) replaces
    // Eula (cryo): the hydro pair stays, no new resonance.
    const bennett = makeBuild('Bennet');
    receiver.team.setMember(2, bennett);
    const before = a4Delta(receiver, vody, 25, rest3);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const atkBefore = totalAtk(finalStats(receiver));
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(totalAtk(finalStats(receiver)) - atkBefore).toBeGreaterThan(10);
    expect(a4Delta(receiver, vody, 25, rest3)).toBeCloseTo(before, 6);
});
