import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Nilou).
//
// - A4 Dreamy Dance of Aeons (Bountiful Bloom DMG from Max HP, team):
//   Avatar_Nilou_ElementalArt_Buff_Controller computes OvergrowDamageUpCache as
//   [FIGHT_PROP_MAX_HP, MaxHP_Trans_To_Overgrow_Ratio, MUL, 0.001, MUL, ...]
//   (total HP above 30000; ProudSkill Nilou_PermanentSkill_2 params
//   [0.09, 30000, 4]: 9% per 1000 HP, cap 400%) into
//   UNIQUE_Avatar_Nilou_Overgrow_Damage_Up, which writes
//   Actor_ElemReactOvergrowVariationExtraDelta (extra). FIGHT_PROP_MAX_HP is
//   the total marker, as for Baizhu/Candace/Chevreuse/Columbina/Dahlia; the same
//   number as premod while no ability writes extra HP. GO reads input.total.hp.
//   KQM Nilou has no EM/ATK/HP/ER buff-chain test. Declared reads: TOTAL
//   (already was; confirmed, no change).
// - C6 Frostbreaker's Melody (CRIT Rate/DMG from Max HP, self):
//   Avatar_Nilou_MaxHP_Trans_Crit (Avatar_Nilou_Talent_MaxHP_Trans_Crit_Handler)
//   computes Critical_Rate/Damage_Cache as
//   [FIGHT_PROP_MAX_HP, MaxHP_Trans_Critical_Rate/Damage, MUL, 0.001, MUL]
//   (total; Talent Nilou_Constellation_6 params [0.006, 0.012, 0.30, 0.60]:
//   0.6%/1.2% per 1000 HP, caps 30%/60%) into UNIQUE_Nilou_MaxHP_Trans_Crit,
//   which writes Actor_CriticalExtraDelta / Actor_CriticalHurtExtraDelta
//   (extra). The extra_scan lists it (final HP read, extra crit writes). GO
//   reads input.total.hp but writes under premod (guesses; supporting only).
//   Declared reads: TOTAL (CHANGED from the default premod). No number changes
//   while no ability writes extra HP.
// - A1 EM +100: UNIQUE_Nilou_Hit_By_Grass_Mastery_Up writes the flat MasteryUp
//   into Actor_ElemMasteryDelta (premod); flat conditions are always premod.
// - C1 (+65% Illusion), C2 (-35% Hydro/Dendro RES), C4 (+50% burst DMG): flat
//   toggles (Talents Nilou_Constellation_1/2/4 params [0.65, 6],
//   [0.35, 0.35, 10], [15, 0.5, 8]); read no stat, always premod.
// - Skill/burst hits scale on 'hp*' (total by construction; the game puts
//   FIGHT_PROP_MAX_HP in each damageExtra).
//
// A 4-member team is used throughout (except the solo parity checks): a
// smaller team would get Elemental Resonance in our engine but not in the game
// (md/buff_chains.md). Nilou's Bounty gates (A1/A4/C2) need a pure
// Hydro/Dendro party, so the A4 teams below are pure; the C6 bonus has no
// party gate and is tested in mixed teams too.

function c6nilou() {
    const build = makeBuild('Nilou');
    build.setCharLevels({level: 90, ascension: 6, constellation: 6});
    return build;
}

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

// Game formula for the A4 Bountiful Bloom bonus (decimal: 0.9 = 90%).
function expectedA4(hp) {
    return Math.min(Math.max(hp - 30000, 0) * 0.09 / 1000, 4.0);
}

// Game formulas for the C6 bonuses (decimal).
function expectedC6CR(hp) {
    return Math.min(hp * 0.006 / 1000, 0.30);
}

function expectedC6CD(hp) {
    return Math.min(hp * 0.012 / 1000, 0.60);
}

// Nilou's own C6 bonus in place: the C6/C0 difference on the same build
// (constellation changes no base stat, so the delta is the C6 bonus exactly).
function c6bonus(nilou) {
    const onCR = finalStats(nilou).get('crit_rate');
    const onCD = finalStats(nilou).get('crit_dmg');
    nilou.setCharLevels({level: 90, ascension: 6, constellation: 0});
    const bonus = {
        cr: onCR - finalStats(nilou).get('crit_rate'),
        cd: onCD - finalStats(nilou).get('crit_dmg'),
    };
    nilou.setCharLevels({level: 90, ascension: 6, constellation: 6});
    return bonus;
}

function rupture(stats) {
    return stats.get('dmg_reaction_rupture') || 0;
}

test("C6 formula parity solo: 30k/40k, caps bind at 50k and hold at 80k", () => {
    const nilou = c6nilou();
    Team.fromMember(nilou);

    for (const hp of [30000, 40000, 50000, 80000]) {
        matchCarrierTotals(nilou, {hp_total: hp});
        const bonus = c6bonus(nilou);
        expect(bonus.cr).toBeCloseTo(expectedC6CR(hp), 8);
        expect(bonus.cd).toBeCloseTo(expectedC6CD(hp), 8);
    }
    // 30k -> 18% / 36%; 40k -> 24% / 48%; 50k and 80k -> capped 30% / 60%.
    expect(expectedC6CR(30000)).toBeCloseTo(0.18, 9);
    expect(expectedC6CD(30000)).toBeCloseTo(0.36, 9);
    expect(expectedC6CR(50000)).toBeCloseTo(0.30, 9);
    expect(expectedC6CD(50000)).toBeCloseTo(0.60, 9);
    expect(expectedC6CR(80000)).toBeCloseTo(0.30, 9);
});

test("C6 counts Hydro resonance (premod) HP", () => {
    // Resonance team: hydro pair (Nilou + Barbara) -> +25% Max HP (a stage-0
    // premod condition). A total read counts premod writes.
    const nilouR = c6nilou();
    const teamR = Team.fromMember(nilouR);
    teamR.setMember(1, makeBuild('Barbara'));
    teamR.setMember(2, makeBuild('Collei'));
    teamR.setMember(3, makeBuild('Yaoyao'));
    teamR.setOnFieldMember(nilouR);

    // Same Nilou build without resonance: one Hydro, three Dendro, no pair.
    const nilouN = c6nilou();
    const teamN = Team.fromMember(nilouN);
    teamN.setMember(1, makeBuild('Nahida'));
    teamN.setMember(2, makeBuild('Collei'));
    teamN.setMember(3, makeBuild('Yaoyao'));
    teamN.setOnFieldMember(nilouN);

    const hpR = totalHp(finalStats(nilouR));
    const hpN = totalHp(finalStats(nilouN));
    // Sanity: resonance actually raised Nilou's HP% by 25 points.
    expect(finalStats(nilouR).get('hp_percent') - finalStats(nilouN).get('hp_percent')).toBeCloseTo(0.25, 8);
    const bonusR = c6bonus(nilouR);
    const bonusN = c6bonus(nilouN);
    expect(bonusR.cr).toBeCloseTo(expectedC6CR(hpR), 6);
    expect(bonusN.cr).toBeCloseTo(expectedC6CR(hpN), 6);
    expect(bonusR.cd).toBeCloseTo(expectedC6CD(hpR), 6);
    // The whole resonance gain is counted: the difference follows the formula.
    expect(bonusR.cr - bonusN.cr).toBeCloseTo((hpR - hpN) * 0.006 / 1000, 6);
    expect(bonusR.cd - bonusN.cd).toBeCloseTo((hpR - hpN) * 0.012 / 1000, 6);
});

test("C6 ignores Bennett burst extra ATK and Key of Khaj-Nisut extra EM", () => {
    const nilou = c6nilou();
    const team = Team.fromMember(nilou);
    team.setMember(1, makeBuild('Eula'));
    const bennet = makeBuild('Bennet');
    team.setMember(2, bennet);
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(3, kazuha);
    team.setOnFieldMember(nilou);
    matchCarrierTotals(nilou, {hp_total: 40000});
    bennet.setCharSettings({bennet_fantastic_voyage: false});
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});

    const crBefore = finalStats(nilou).get('crit_rate');
    const cdBefore = finalStats(nilou).get('crit_dmg');
    const atkBefore = finalStats(nilou).get('atk');
    const emBefore = totalMastery(finalStats(nilou));

    bennet.setCharSettings({bennet_fantastic_voyage: true});
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});

    // Sanity: the extra ATK and extra EM actually arrived on Nilou.
    expect(finalStats(nilou).get('atk') - atkBefore).toBeGreaterThan(100);
    expect(totalMastery(finalStats(nilou)) - emBefore).toBeGreaterThan(1);
    // The HP-read C6 bonus must not move.
    expect(finalStats(nilou).get('crit_rate')).toBeCloseTo(crBefore, 10);
    expect(finalStats(nilou).get('crit_dmg')).toBeCloseTo(cdBefore, 10);
});

// Pure Hydro/Dendro bounty team with the stance open; the receiver is on field
// and holds the delivered A4 copy.
function bountyTeam(receiverKey, nilouMembers) {
    const nilou = makeBuild('Nilou');
    const receiver = makeBuild(receiverKey);
    const team = Team.fromMember(receiver);
    team.setMember(1, nilou);
    team.setMember(2, makeBuild(nilouMembers[0]));
    team.setMember(3, makeBuild(nilouMembers[1]));
    team.setOnFieldMember(receiver);
    nilou.setCharSettings({nilou_stance_bonus: true});
    return {team, nilou, receiver};
}

test("A4 formula parity: 30k/40k/45k, cap holds at 80k", () => {
    const {nilou, receiver} = bountyTeam('Tartaglia', ['Collei', 'Yaoyao']);

    for (const [hp, expected] of [[30000, 0], [40000, 0.9], [45000, 1.35], [80000, 4.0]]) {
        matchCarrierTotals(nilou, {hp_total: hp});
        expect(totalHp(finalStats(nilou))).toBeCloseTo(hp, 6);
        expect(rupture(finalStats(receiver))).toBeCloseTo(expected, 8);
    }
});

test("A4 counts Hydro resonance (premod) HP", () => {
    // Resonance team: two Hydro (Nilou + Barbara) -> +25% Max HP (premod).
    const res = bountyTeam('Collei', ['Barbara', 'Nahida']);
    // Same shape without resonance: Nilou is the only Hydro.
    const plain = bountyTeam('Collei', ['Nahida', 'Yaoyao']);

    // The A4 only pays HP above 30000, so push both Nilous over the threshold
    // with the SAME flat HP: the plain one lands exactly on 40000 while the
    // resonance gain stays on top in the resonance team.
    const custom = matchCarrierTotals(plain.nilou, {hp_total: 40000});
    res.nilou.modifyBuffsSettings(custom);
    const hpR = totalHp(finalStats(res.nilou));
    const hpN = totalHp(finalStats(plain.nilou));
    expect(hpN).toBeCloseTo(40000, 6);
    expect(hpR - hpN).toBeGreaterThan(1000);
    // Sanity: resonance actually raised Nilou's HP% by 25 points.
    expect(finalStats(res.nilou).get('hp_percent') - finalStats(plain.nilou).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(rupture(finalStats(res.receiver))).toBeCloseTo(expectedA4(hpR), 6);
    expect(rupture(finalStats(plain.receiver))).toBeCloseTo(expectedA4(hpN), 6);
    // The whole resonance gain is counted: the difference follows the formula.
    expect(rupture(finalStats(res.receiver)) - rupture(finalStats(plain.receiver)))
        .toBeCloseTo((hpR - hpN) * 0.09 / 1000, 6);
});

test("A4 ignores Nahida A1 extra EM", () => {
    // Pure team (stays a Nilou party): Tartaglia and Nilou are Hydro, Nahida
    // and Collei Dendro. Nahida's A1 EM is extra EM on the on-field receiver;
    // the HP-read A4 must not move.
    const {nilou, receiver} = bountyTeam('Tartaglia', ['Nahida', 'Collei']);
    const nahida = receiver.team.getMember(2);
    nahida.modifyBuffsSettings({'custom_buffs.mastery': 500});
    matchCarrierTotals(nilou, {hp_total: 40000});
    expect(rupture(finalStats(receiver))).toBeCloseTo(0.9, 8);

    nahida.setCharSettings({nahida_compassion_illuminated: false, nahida_illusory_heart: false});
    const ruptureBefore = rupture(finalStats(receiver));
    const emBefore = totalMastery(finalStats(receiver));
    nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
    expect(totalMastery(finalStats(receiver)) - emBefore).toBeGreaterThan(10);
    expect(rupture(finalStats(receiver))).toBeCloseTo(ruptureBefore, 10);
});
