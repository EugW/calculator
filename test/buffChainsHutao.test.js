import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Hu Tao.
//
// - Skill ATK from Max HP (Paramita Papilio, PostEffectStatsHP): the game
//   (Avatar_Hutao_CrimsonPlum onAbilityStart) sets
//   _ABILITY_Hutao_CrimsonPlum_AttackDelta as [FIGHT_PROP_MAX_HP,
//   CrimsonPlum_MAXHP_To_AttackDelta_Factor, MUL] (total), capped by
//   [FIGHT_PROP_BASE_ATTACK, CrimsonPlum_MAX_AttackDelta_Factor, MUL]
//   (base); UNIQUE_Hutao_CrimsonPlum_Main_Handler writes
//   Actor_AttackExtraDelta (extra, default). FIGHT_PROP_MAX_HP is the total
//   marker (md/buff_chains.md), as for Baizhu/Candace/Chevreuse/Columbina;
//   the same number as premod while no ability writes extra HP. Declared
//   reads: TOTAL. GO reads input.premod.hp here (supporting evidence only;
//   the data says total). KQM Hu Tao has no EM/ATK/HP/ER buff-chain test.
//   Game formula at skill 10: min(HP * 6.256%, 400% * base ATK).
// - Cap reads base ATK (from 'atk_base'); Bennett's extra ATK must not lift
//   it.
// - Blood Blossom hits, burst hits (plain damagePercentage, no FIGHT_PROP
//   read), burst heals (HealHP amountByCasterMaxHPRatio) and the C2 HP bonus
//   (damageExtra [FIGHT_PROP_MAX_HP, ...] , total) read the total by
//   construction (scaling 'atk*'/'hp*') and need nothing. GO uses
//   dmgNode('atk', ...), customHealNode(prod(input.total.hp, ...)) and
//   prod(input.total.hp, ...) (all total) for them.
// - A1 (Actor_CriticalDelta via PermanentSkill_1), A4 (Actor_FireAddHurtDelta
//   via PermanentSkill_2, HP-ratio gated), C4 (Actor_CriticalDelta on kill)
//   and C6 (Actor_CriticalDelta + Actor_*SubHurtDelta, HP-ratio gated) are
//   flat toggles with no stat read; C1 reads no stat. Flat conditions are
//   always premod and need nothing.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

// Skill 10 HP->ATK rate (charTalentTables.Hutao.s2.p2[9] = 6.256) and the
// 400% base-ATK cap (TalentValues.SkillMaxBonus). Only the builds' base
// inputs (carrier total HP via matchCarrierTotals, base ATK) are read from
// the engine; every expected number is computed from these formulas.
const SKILL_RATE = 6.256 / 100;
const SKILL_CAP_RATIO = 400 / 100;

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function expectedBuff(hp, baseAtk) {
    return Math.min(hp * SKILL_RATE, SKILL_CAP_RATIO * baseAtk);
}

// Hu Tao's skill ATK buff: total-ATK delta between skill on and off at the
// same HP. HP is untouched by the toggle, so the delta is the buff.
function skillBuff(hutao) {
    hutao.setCharSettings({hutao_paramita_papilio: false});
    const off = totalAtk(finalStats(hutao));
    hutao.setCharSettings({hutao_paramita_papilio: true});
    const on = totalAtk(finalStats(hutao));
    return on - off;
}

// Hu Tao (pyro) + Eula (cryo) + Sucrose (anemo) + Noelle (geo): four
// different elements, so no Elemental Resonance applies.
function neutralTeam() {
    const hutao = makeBuild('Hutao');
    const team = Team.fromMember(hutao);
    team.setMember(1, makeBuild('Eula'));
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(hutao);
    return {team, hutao};
}

test("skill formula parity: HP-scaled ATK, capped at 400% base ATK", () => {
    const {hutao} = neutralTeam();
    const baseAtk = finalStats(hutao).get('atk_base');
    // Sanity: skill 10 rate and cap from the game formula.
    expect(SKILL_RATE).toBeCloseTo(0.06256, 9);
    expect(expectedBuff(20000, 1000)).toBeCloseTo(1251.2, 9);
    expect(expectedBuff(70000, 1000)).toBeCloseTo(4000, 9);

    for (const hp of [15000, 20000]) {
        matchCarrierTotals(hutao, {hp_total: hp});
        const gotHp = totalHp(finalStats(hutao));
        expect(gotHp).toBeCloseTo(hp, 6);
        expect(skillBuff(hutao)).toBeCloseTo(expectedBuff(gotHp, baseAtk), 6);
    }
    // 20k HP at skill 10, uncapped with this build's base ATK.
    matchCarrierTotals(hutao, {hp_total: 20000});
    const hp = totalHp(finalStats(hutao));
    const buff = skillBuff(hutao);
    expect(buff).toBeCloseTo(hp * SKILL_RATE, 6);
    expect(buff).toBeLessThan(SKILL_CAP_RATIO * baseAtk);

    // High HP binds the cap: the buff equals 400% base ATK.
    matchCarrierTotals(hutao, {hp_total: 60000});
    const hpCapped = totalHp(finalStats(hutao));
    expect(hpCapped * SKILL_RATE).toBeGreaterThan(SKILL_CAP_RATIO * baseAtk);
    expect(skillBuff(hutao)).toBeCloseTo(SKILL_CAP_RATIO * baseAtk, 6);
});

test("skill counts premod HP: Hydro resonance", () => {
    // Resonance team: hydro pair (Barbara + Xingqiu) -> +25% Max HP (a
    // stage-0 premod condition). A total read counts premod writes.
    const hutaoR = makeBuild('Hutao');
    const teamR = Team.fromMember(hutaoR);
    teamR.setMember(1, makeBuild('Barbara'));
    teamR.setMember(2, makeBuild('Xingqiu'));
    teamR.setMember(3, makeBuild('Sucrose'));
    teamR.setOnFieldMember(hutaoR);

    // Same Hu Tao build without resonance: pyro/hydro/cryo/anemo, no pair.
    const hutaoN = makeBuild('Hutao');
    const teamN = Team.fromMember(hutaoN);
    teamN.setMember(1, makeBuild('Barbara'));
    teamN.setMember(2, makeBuild('Eula'));
    teamN.setMember(3, makeBuild('Sucrose'));
    teamN.setOnFieldMember(hutaoN);

    const hpR = totalHp(finalStats(hutaoR));
    const hpN = totalHp(finalStats(hutaoN));
    // Sanity: resonance actually raised Hu Tao's HP% by 25 points.
    expect(finalStats(hutaoR).get('hp_percent') - finalStats(hutaoN).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(hpR).toBeGreaterThan(hpN);
    const baseAtk = finalStats(hutaoR).get('atk_base');
    expect(skillBuff(hutaoR)).toBeCloseTo(expectedBuff(hpR, baseAtk), 6);
    expect(skillBuff(hutaoN)).toBeCloseTo(expectedBuff(hpN, baseAtk), 6);
    // The whole resonance gain is counted (both under the cap here).
    expect(skillBuff(hutaoR) - skillBuff(hutaoN)).toBeCloseTo((hpR - hpN) * SKILL_RATE, 6);
});

test("skill ignores extra ATK (Bennett burst)", () => {
    // Hu Tao + Bennett (pyro pair -> Pyro resonance, constant here) +
    // Sucrose + Eula. Hu Tao on field so the burst reaches her.
    const hutao = makeBuild('Hutao');
    const team = Team.fromMember(hutao);
    const bennett = makeBuild('Bennet');
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Eula'));
    team.setOnFieldMember(hutao);
    matchCarrierTotals(hutao, {hp_total: 20000});
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = skillBuff(hutao);
    const atkBefore = totalAtk(finalStats(hutao));

    bennett.setCharSettings({bennet_fantastic_voyage: true});
    // Sanity: the burst actually raised Hu Tao's (extra) ATK.
    expect(totalAtk(finalStats(hutao)) - atkBefore).toBeGreaterThan(10);
    // The HP-read skill buff does not move.
    expect(skillBuff(hutao)).toBeCloseTo(before, 6);
});

test("skill ignores extra EM (Key of Khaj-Nisut party EM)", () => {
    // Neutral elements with Kazuha (anemo) in Sucrose's slot: still no
    // resonance. The Key's party EM is extra EM on Hu Tao.
    const hutao = makeBuild('Hutao');
    const team = Team.fromMember(hutao);
    team.setMember(1, makeBuild('Eula'));
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(2, kazuha);
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(hutao);
    matchCarrierTotals(hutao, {hp_total: 20000});
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const before = skillBuff(hutao);
    const emBefore = totalMastery(finalStats(hutao));

    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    // Sanity: the Key actually raised Hu Tao's (extra) EM.
    expect(totalMastery(finalStats(hutao)) - emBefore).toBeGreaterThan(1);
    expect(skillBuff(hutao)).toBeCloseTo(before, 6);
});

test("cap reads base ATK: Bennett burst does not lift a bound cap", () => {
    const hutao = makeBuild('Hutao');
    const team = Team.fromMember(hutao);
    const bennett = makeBuild('Bennet');
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Eula'));
    team.setOnFieldMember(hutao);
    const baseAtk = finalStats(hutao).get('atk_base');
    matchCarrierTotals(hutao, {hp_total: 60000});
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    // Sanity: bound at 400% base ATK without the burst.
    expect(skillBuff(hutao)).toBeCloseTo(SKILL_CAP_RATIO * baseAtk, 6);

    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(totalAtk(finalStats(hutao))).toBeGreaterThan(0);
    // Extra ATK is not base ATK: the cap (and the bound buff) stay.
    expect(skillBuff(hutao)).toBeCloseTo(SKILL_CAP_RATIO * baseAtk, 6);
});
