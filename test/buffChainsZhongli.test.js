import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery, featureValues } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Zhongli.
//
// - A4 Dominance of Earth (Normal/Charged/Plunge +1.39% of Max HP, skill
//   +1.9%, burst +33%): the game adds damageExtra [FIGHT_PROP_MAX_HP,
//   HP2ATK_Ratio1/2/3, MUL] (total) gated by HP2ATK (Zhongli_PermanentSkill_2,
//   ProudSkill 302201 params [0.0139, 0.019, 0.33]) in
//   Avatar_Zhongli_NormalAttack / SkillObj_Zhongli_PrimoPillar /
//   Avatar_Zhongli_RockShield / Avatar_Zhongli_GeoOrder. FIGHT_PROP_MAX_HP is
//   the total marker (md/buff_chains.md); the same number as premod while no
//   ability writes extra HP. Declared reads: TOTAL on the three display
//   FeaturePostEffectValue rows (explicit total reads are evidence even with
//   no extra-HP writer today). The mechanical damage (char-level
//   FeatureMultiplier scaling 'hp*' and the ConditionStatic *_base_hp_percent
//   consumed via Stats.getBaseBonus) reads the total by construction and needs
//   nothing. GO prods input.premod.hp here with a TODO saying it should be
//   total (supporting evidence only; the data says total). KQM Zhongli has no
//   EM/ATK/HP/ER buff-chain test (the Tenacity entry only confirms the
//   ATK% + HP x ratio formula shape).
// - Skill shield (FeatureShield scaling 'hp*'): talent HP scaling
//   (GlobalMainShieldMixin shieldHP ShieldBaseDuability in
//   Avatar_Zhongli_RockShield) reads the total by construction; GO
//   shieldNodeTalent('hp', ...) reads input.total.hp. No params.
// - C6 (40% of taken damage as heal, cap 8% of Max HP): display-only text
//   stats in content (no heal feature); the game caps via
//   healLimitedByLocalCreatureMaxHPRatio (talent 306 params [0.4, 0.08]). No
//   params.
// - A1 stacks (flat shield %) and the RES shred (flat -20%): flat toggles
//   (game: Zhongli_ToughShield_L1..L5 Actor_ShieldCostMinusRatio,
//   UNIQUE_Zhongli_RockShield_Debuff Actor_*SubHurtDelta -0.2) with no stat
//   read; conditions are premod by construction, right for flat buffs.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const RATE_ATTACK = 0.0139;
const RATE_SKILL = 0.019;
const RATE_BURST = 0.33;

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

// Display values of the three A4 rows (absolute bonus damage).
function a4Display(zhongli) {
    const values = featureValues(zhongli);
    const pick = (key) => (values[key] ? values[key][0] : 0);
    return {
        attack: pick('attack.zhongli_additional_dmg'),
        skill: pick('skill.zhongli_additional_dmg'),
        burst: pick('burst.zhongli_additional_dmg'),
    };
}

// Zhongli (geo) + Eula (cryo) + Hutao (pyro) + Sucrose (anemo): four
// different elements, so no Elemental Resonance applies.
function neutralTeam() {
    const zhongli = makeBuild('Zhongli');
    const team = Team.fromMember(zhongli);
    team.setMember(1, makeBuild('Eula'));
    team.setMember(2, makeBuild('Hutao'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(zhongli);
    return {team, zhongli};
}

test("A4 formula parity: all three rates scale on total HP; ascension gate", () => {
    const {zhongli} = neutralTeam();

    // Sanity: the content rates match the game params (ProudSkill 302201).
    expect(RATE_ATTACK).toBeCloseTo(0.0139, 9);
    expect(RATE_SKILL).toBeCloseTo(0.019, 9);
    expect(RATE_BURST).toBeCloseTo(0.33, 9);
    expect(30000 * RATE_ATTACK).toBeCloseTo(417, 9);
    expect(30000 * RATE_SKILL).toBeCloseTo(570, 9);
    expect(30000 * RATE_BURST).toBeCloseTo(9900, 9);

    // Below ascension 4 the rows are off.
    zhongli.setCharLevels({level: 90, ascension: 0, constellation: 0});
    matchCarrierTotals(zhongli, {hp_total: 30000});
    expect(a4Display(zhongli).attack).toBe(0);
    expect(a4Display(zhongli).skill).toBe(0);
    expect(a4Display(zhongli).burst).toBe(0);
    zhongli.setCharLevels({level: 90, ascension: 6, constellation: 0});

    // Solo numbers with no extra stat present (premod == total): the display
    // follows the game formula HP x rate at every HP value.
    for (const hp of [15000, 30000, 45000]) {
        matchCarrierTotals(zhongli, {hp_total: hp});
        const gotHp = totalHp(finalStats(zhongli));
        expect(gotHp).toBeCloseTo(hp, 6);
        const got = a4Display(zhongli);
        expect(got.attack).toBeCloseTo(gotHp * RATE_ATTACK, 6);
        expect(got.skill).toBeCloseTo(gotHp * RATE_SKILL, 6);
        expect(got.burst).toBeCloseTo(gotHp * RATE_BURST, 6);
    }
});

test("A4 counts premod HP: Hydro resonance", () => {
    // Resonance team: hydro pair (Barbara + Xingqiu) -> +25% Max HP (a
    // stage-0 premod condition). A total read counts premod writes.
    const zhongliR = makeBuild('Zhongli');
    const teamR = Team.fromMember(zhongliR);
    teamR.setMember(1, makeBuild('Barbara'));
    teamR.setMember(2, makeBuild('Xingqiu'));
    teamR.setMember(3, makeBuild('Sucrose'));
    teamR.setOnFieldMember(zhongliR);

    // Same build without resonance: geo/hydro/cryo/anemo, no pair.
    const zhongliN = makeBuild('Zhongli');
    const teamN = Team.fromMember(zhongliN);
    teamN.setMember(1, makeBuild('Barbara'));
    teamN.setMember(2, makeBuild('Eula'));
    teamN.setMember(3, makeBuild('Sucrose'));
    teamN.setOnFieldMember(zhongliN);

    const hpR = totalHp(finalStats(zhongliR));
    const hpN = totalHp(finalStats(zhongliN));
    // Sanity: resonance actually raised Max HP% by 25 points.
    expect(finalStats(zhongliR).get('hp_percent') - finalStats(zhongliN).get('hp_percent')).toBeCloseTo(0.25, 8);
    expect(hpR).toBeGreaterThan(hpN);
    const gotR = a4Display(zhongliR);
    const gotN = a4Display(zhongliN);
    expect(gotR.attack).toBeCloseTo(hpR * RATE_ATTACK, 6);
    expect(gotN.attack).toBeCloseTo(hpN * RATE_ATTACK, 6);
    expect(gotR.skill).toBeCloseTo(hpR * RATE_SKILL, 6);
    expect(gotR.burst).toBeCloseTo(hpR * RATE_BURST, 6);
    // The whole resonance gain is counted on all three rows.
    expect(gotR.attack - gotN.attack).toBeCloseTo((hpR - hpN) * RATE_ATTACK, 6);
    expect(gotR.skill - gotN.skill).toBeCloseTo((hpR - hpN) * RATE_SKILL, 6);
    expect(gotR.burst - gotN.burst).toBeCloseTo((hpR - hpN) * RATE_BURST, 6);
});

test("A4 ignores extra ATK (Bennett burst)", () => {
    // Zhongli + Bennett (geo/pyro/anemo/cryo, no resonance) with Zhongli on
    // field so the burst reaches him.
    const zhongli = makeBuild('Zhongli');
    const team = Team.fromMember(zhongli);
    const bennett = makeBuild('Bennet');
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Eula'));
    team.setOnFieldMember(zhongli);
    matchCarrierTotals(zhongli, {hp_total: 30000});
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = a4Display(zhongli);
    const atkBefore = totalAtk(finalStats(zhongli));

    bennett.setCharSettings({bennet_fantastic_voyage: true});
    // Sanity: the burst actually raised Zhongli's (extra) ATK.
    expect(totalAtk(finalStats(zhongli)) - atkBefore).toBeGreaterThan(10);
    // The HP-read rows do not move.
    const after = a4Display(zhongli);
    expect(after.attack).toBeCloseTo(before.attack, 6);
    expect(after.skill).toBeCloseTo(before.skill, 6);
    expect(after.burst).toBeCloseTo(before.burst, 6);
});

test("A4 ignores extra EM (Key of Khaj-Nisut party EM)", () => {
    // Neutral elements with Kazuha (anemo) holding the Key: still no
    // resonance. The Key's party EM is extra EM on Zhongli.
    const zhongli = makeBuild('Zhongli');
    const team = Team.fromMember(zhongli);
    team.setMember(1, makeBuild('Eula'));
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(2, kazuha);
    team.setMember(3, makeBuild('Noelle'));
    team.setOnFieldMember(zhongli);
    matchCarrierTotals(zhongli, {hp_total: 30000});
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    const before = a4Display(zhongli);
    const emBefore = totalMastery(finalStats(zhongli));

    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    // Sanity: the Key actually raised Zhongli's (extra) EM.
    expect(totalMastery(finalStats(zhongli)) - emBefore).toBeGreaterThan(1);
    const after = a4Display(zhongli);
    expect(after.attack).toBeCloseTo(before.attack, 6);
    expect(after.skill).toBeCloseTo(before.skill, 6);
    expect(after.burst).toBeCloseTo(before.burst, 6);
});
