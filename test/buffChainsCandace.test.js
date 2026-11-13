import { PostEffectStats } from "../src/js/classes/PostEffect/Stats";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { featureValues, finalStats, makeBuild, totalMastery, withSource } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Candace.
//
// - Burst Prayer base 20% NormalAttack elemental DMG: the game adds
//   Buff_NormalAttack_BaseDMGRatio with no stat read
//   (UNIQUE_Candace_ElementalBurst_WaterField_LocalHandler, ModifyDamageMixin).
//   GO sums it with the A4 part under teamBuff.premod. Flat toggles write
//   premod by construction; needs nothing.
// - Burst A4 NormalAttack elemental DMG from Max HP (team, dmg_normal_*):
//   game computes [Buff_NormalAttack_MaxHP2DMGRatio, FIGHT_PROP_MAX_HP, MUL,
//   1000, DIV] gated by Talent_Candace_PermanentSkill_2 (A4, ProudSkill 722201
//   param 0.005) in the same LocalHandler modifier. FIGHT_PROP_MAX_HP is the
//   total marker, but no FIGHT_PROP_NONEXTRA_HP exists and no ability writes
//   extra HP, so premod and total HP agree today. GO reads input.total.hp and
//   writes teamBuff.premod; KQM Candace has no buff-chain test. Default premod
//   read and extra (total) DMG% write kept; reported as uncertain (Baizhu,
//   Chevreuse and Columbina declare TOTAL for the same FIGHT_PROP_MAX_HP
//   marker). Game formula: 20% + 0.5% per 1000 Max HP (0.2 + HP * 0.0005/100).
// - C2 Max HP +20%: game writes Actor_MaxHPRatio (no "Extra", i.e. premod) in
//   UNIQUE_Candace_Constellation_2_MaxHPUp (Talent Candace_Constellation_2
//   paramList [0.2, 15]); GO puts it under premod hp_. Flat conditions are
//   always premod; needs nothing.
// - Skill press/hold, burst, wave and C6 Overflow wave hits scale with
//   FIGHT_PROP_MAX_HP (total) in damageExtra; scaling 'hp*' reads the total
//   by construction and needs nothing. The skill shield (EliteShieldMixin
//   Shield_HP_Ratio/Delta) names no FIGHT_PROP read and needs nothing.
// - A1 (instant charge), C1/C3/C4/C5 and the C6 display stat (text_percent_dmg,
//   no extra lane) read no stat and need nothing.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

// Candace plus a melee receiver and two neutral members; all four elements
// differ, so no Elemental Resonance applies.
function neutralTeam() {
    const candace = makeBuild('Candace');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, candace);
    team.setMember(2, makeBuild('Hutao'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(receiver);
    return {team, candace, receiver};
}

// Game formula for the delivered Prayer bonus at a given Candace Max HP.
function expectedBonus(hp) {
    return 0.2 + hp * 0.0005 / 100;
}

test("Prayer formula parity: off gives 0, asc0 gives flat 20%, HP scaling is live", () => {
    const {candace, receiver} = neutralTeam();
    candace.setCharSettings({candace_prayer_of_the_crimson_crown: false});
    expect(finalStats(receiver).get('dmg_normal_pyro')).toBe(0);

    candace.setCharSettings({candace_prayer_of_the_crimson_crown: true});
    // Below ascension 4 the A4 HP part is off: flat 20% only.
    candace.setCharLevels({level: 90, ascension: 0, constellation: 0});
    expect(finalStats(receiver).get('dmg_normal_pyro')).toBeCloseTo(0.2, 8);
    // All elements share the same value; melee-only infusion does not gate it.
    expect(finalStats(receiver).get('dmg_normal_hydro')).toBeCloseTo(0.2, 8);

    candace.setCharLevels({level: 90, ascension: 6, constellation: 0});
    for (const hp of [20000, 30000, 50000]) {
        matchCarrierTotals(candace, {hp_total: hp});
        const got = finalStats(receiver).get('dmg_normal_pyro');
        expect(got).toBeCloseTo(expectedBonus(hp), 8);
        expect(finalStats(receiver).get('dmg_normal_electro')).toBeCloseTo(expectedBonus(hp), 8);
    }
    // 30k -> 35%; 50k -> 45%.
    expect(expectedBonus(30000)).toBeCloseTo(0.35, 9);
    expect(expectedBonus(50000)).toBeCloseTo(0.45, 9);
});

test("A4 counts premod HP: Hydro resonance and C2", () => {
    // Resonance team: hydro pair -> +25% Max HP (a stage-0 premod condition).
    const candace = makeBuild('Candace');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, candace);
    team.setMember(2, makeBuild('Barbara'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(receiver);
    candace.setCharSettings({candace_prayer_of_the_crimson_crown: true});

    // Same Candace build without resonance: hydro/pyro/cryo/anemo, no pair.
    const plain = makeBuild('Candace');
    const receiver2 = makeBuild('Eula');
    const team2 = Team.fromMember(receiver2);
    team2.setMember(1, plain);
    team2.setMember(2, makeBuild('Hutao'));
    team2.setMember(3, makeBuild('Sucrose'));
    team2.setOnFieldMember(receiver2);
    plain.setCharSettings({candace_prayer_of_the_crimson_crown: true});

    const hpR = totalHp(finalStats(candace));
    const hpN = totalHp(finalStats(plain));
    // Sanity: resonance actually raised Candace's HP% by 25 points.
    expect(finalStats(candace).get('hp_percent') - finalStats(plain).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(finalStats(receiver).get('dmg_normal_pyro')).toBeCloseTo(expectedBonus(hpR), 8);
    expect(finalStats(receiver2).get('dmg_normal_pyro')).toBeCloseTo(expectedBonus(hpN), 8);
    // The whole resonance gain is counted.
    expect(finalStats(receiver).get('dmg_normal_pyro') - finalStats(receiver2).get('dmg_normal_pyro'))
        .toBeCloseTo((hpR - hpN) * 0.0005 / 100, 8);

    // C2: +20% Max HP on skill hit (a premod condition). Needs constellation 2.
    const c2 = makeBuild('Candace');
    c2.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const recv3 = makeBuild('Eula');
    const team3 = Team.fromMember(recv3);
    team3.setMember(1, c2);
    team3.setMember(2, makeBuild('Hutao'));
    team3.setMember(3, makeBuild('Sucrose'));
    team3.setOnFieldMember(recv3);
    c2.setCharSettings({candace_prayer_of_the_crimson_crown: true});
    matchCarrierTotals(c2, {hp_total: 30000});
    c2.setCharSettings({candace_prayer_of_the_crimson_crown: true, candace_moon_piercing_brilliance: false});
    const hpOff = totalHp(finalStats(c2));
    const bonusOff = finalStats(recv3).get('dmg_normal_pyro');
    expect(bonusOff).toBeCloseTo(expectedBonus(hpOff), 8);
    c2.setCharSettings({candace_prayer_of_the_crimson_crown: true, candace_moon_piercing_brilliance: true});
    const hpOn = totalHp(finalStats(c2));
    // Sanity: C2 actually raised HP% by 20 points.
    expect(finalStats(c2).get('hp_percent') - 0).toBeGreaterThan(0.19);
    expect(hpOn - hpOff).toBeGreaterThan(1000);
    expect(finalStats(recv3).get('dmg_normal_pyro')).toBeCloseTo(expectedBonus(hpOn), 8);
    expect(finalStats(recv3).get('dmg_normal_pyro') - bonusOff).toBeCloseTo((hpOn - hpOff) * 0.0005 / 100, 8);
});

test("A4 ignores extra ATK (Bennett burst) and extra EM (Key of Khaj-Nisut)", () => {
    const {candace, receiver} = neutralTeam();
    candace.setCharSettings({candace_prayer_of_the_crimson_crown: true});
    matchCarrierTotals(candace, {hp_total: 30000});
    const before = finalStats(receiver).get('dmg_normal_pyro');
    expect(before).toBeCloseTo(expectedBonus(30000), 8);

    // Bennett's burst ATK is extra ATK on the on-field receiver; the bonus
    // reads HP, so it must not move. Bennett is Pyro here, still no resonance.
    const bennett = makeBuild('Bennet');
    const team = receiver.team;
    team.setMember(2, bennett);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const atkBefore = finalStats(receiver).get('atk');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(finalStats(receiver).get('atk') - atkBefore).toBeGreaterThan(10);
    expect(finalStats(receiver).get('dmg_normal_pyro')).toBeCloseTo(before, 10);

    // The Key's party EM is extra EM; it must not move the HP-read bonus.
    // Kazuha cannot resonate here (anemo, alone among the four).
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(2, kazuha);
    team.setMember(3, makeBuild('Hutao'));
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const emBefore = totalMastery(finalStats(receiver));
    expect(finalStats(receiver).get('dmg_normal_pyro')).toBeCloseTo(before, 8);
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    expect(totalMastery(finalStats(receiver)) - emBefore).toBeGreaterThan(1);
    expect(finalStats(receiver).get('dmg_normal_pyro')).toBeCloseTo(before, 8);
});

test("A4 and its display row count extra HP alike (total HP read)", () => {
    // No shipped ability writes extra HP (md/buff_chains.md), so a synthetic
    // HP% write tells a total read from a premod one, as in the Homa and Ring
    // of Ceiba tests. Default channels: premod ATK read, extra HP% write.
    function display(candace) {
        const name = 'burst.candace_dmg_bonus';
        // Features cache their compiled program: recompile for this build.
        DB.Chars.get('Candace').getFeatures().find((f) => f.getName() === name).compiled = undefined;
        return featureValues(candace)[name][0];
    }

    const plain = neutralTeam();
    plain.candace.setCharSettings({candace_prayer_of_the_crimson_crown: true});
    const plainBonus = finalStats(plain.receiver).get('dmg_normal_pyro');
    expect(plainBonus).toBeCloseTo(expectedBonus(totalHp(finalStats(plain.candace))), 8);
    // The row shows the delivered bonus; its unit is read from this case.
    const unit = display(plain.candace) / plainBonus;

    const {candace, receiver} = neutralTeam();
    candace.setCharSettings({candace_prayer_of_the_crimson_crown: true});
    withSource(candace, [], [
        new PostEffectStats({from: 'atk*', percent: new StatTable('hp_percent', [0.05])}),
    ], {}, []);
    const stats = finalStats(candace);
    const extraHp = stats.get('hp_base') * stats.get('hp_percent_extra');
    expect(extraHp).toBeGreaterThan(1000);

    const bonus = finalStats(receiver).get('dmg_normal_pyro');
    // The total HP, extra part included, feeds the bonus...
    expect(bonus).toBeCloseTo(expectedBonus(totalHp(stats)), 8);
    expect(bonus - plainBonus).toBeCloseTo(extraHp * 0.0005 / 100, 8);
    // ...and the display row shows the same number.
    expect(display(candace)).toBeCloseTo(unit * bonus, 6);
});
