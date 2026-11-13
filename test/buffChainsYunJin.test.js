import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery, featureValues } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Yun Jin.
//
// - Burst Flying Cloud Flag Formation (Normal Attack DMG bonus from DEF,
//   team): the game computes damageExtra as FIGHT_PROP_CUR_DEFENSE (total) x
//   Yunjin_ElementalBurst_Buff_ExtraDamage_DefRatio plus FIGHT_PROP_CUR_DEFENSE
//   (total) x Yunjin_ElementalBurst_Buff_ExtraDamage_ElementNum (the A4 term) in
//   Avatar_Yunjin_ElementalBurst_Buff (UNIQUE_Avatar_Yunjin_ElementalBurst_Buff,
//   ModifyDamageCountMixin). Modifier-to-talent mapping confirmed through
//   paramList values (no Furina-style rename): burst ProudSkill 6439 param 1 is
//   the DEF ratio (32.16% at lv1, CharTalentTables s3.p2), A4 ProudSkill 6422
//   params are [2.5%, 5%, 7.5%, 11.5%], C2 talent params [0.15, 12s], C4
//   [0.2, 12s], C6 [0.12]. FIGHT_PROP_CUR_DEFENSE is the explicit total marker,
//   so the display post-effect (FeaturePostEffectValue yunjin_dmg_bonus,
//   PostEffectStatsDef) declares reads: CHANNELS.TOTAL. No ability writes extra
//   DEF, so premod and total DEF agree today and no number changes. GO reads
//   input.premod.def for the same bonus; the game data (CUR, not NONEXTRA)
//   wins. KQM Yun Jin has no premod/total interaction test (the burst does not
//   snapshot: live DEF counts). The delivered flat bonus (multipliers, TEAM,
//   scaling 'def*') reads the total by construction; no params. The write is a
//   talent DMG bonus (no extra lane), so no writes param.
// - Skill press / charge-1 / charge-2 hits: game sizes them with damageExtra on
//   FIGHT_PROP_CUR_DEFENSE (total) in Avatar_Yunjin_ElementalArt_Strike.
//   Damage hits read the total by construction (scaling 'def*'); nothing needed.
// - Skill shield: game builds it in an EliteShieldMixin from
//   Yunjin_ElementalArt_Shield_HPRatio/Base (no FIGHT_PROP read); scaling 'hp*'
//   reads the total by construction; nothing needed.
// - Burst hit (burst_dmg): plain ATK-scaled damage; needs nothing.
// - A1 True to Oneself (charged-form timing), A4 Breaking Conventions (element
//   count; its bonus is the ElementNum term above, still DEF-scaled), C1 (skill
//   CD), C3/C5 (talent levels): read no stat.
// - C2 Myriad Mise-En-Scene (flat 15% Normal DMG, team): game sets
//   Yunjin_Constellation_2_Buff_DamagePercentageRatio with no stat read
//   (UNIQUE_Avatar_Yunjin_Constellation_2_Buff, ModifyDamageMixin). Flat toggle,
//   premod by construction; needs nothing.
// - C4 Flower and a Fighter (+20% DEF on Crystallize): game writes
//   Actor_DefenceRatio (no "Extra", i.e. premod) in UNIQUE_Yunjin_CrystallizeAddDef.
//   GO puts it under premod. Conditions are always premod; needs nothing. KQM
//   notes the DEF misses the triggering hit (timing, not chains).
// - C6 Decorous Harmony (+12% Normal ATK SPD under the banner): game writes
//   Animator_AttackSpeedRatio with no stat read; flat toggle, needs nothing.
//
// A total DEF read counts every DEF buff; no ability writes extra DEF, so the
// must-not-count side is covered by unrelated extra buffs (Bennett burst ATK,
// Key of Khaj-Nisut party EM) leaving the bonus untouched.
// 4-member teams throughout: a smaller team would get Elemental Resonance in
// our engine but not in the game (md/buff_chains.md).

// Burst level 10 talent ratio (CharTalentTables YunJin s3.p2): 57.888%.
// At constellation 3+, the burst runs at level 13: 68.34%.
const BURST_RATIO = 57.888 / 100;
const BURST_RATIO_C3 = 68.34 / 100;
// Breaking Conventions by party element count (A4 ProudSkill 6422 params).
const STACK_BONUS = {1: 0.025, 2: 0.05, 3: 0.075, 4: 0.115};

function totalDef(stats) {
    return stats.get('def_base') * (1 + stats.get('def_percent')) + stats.get('def');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function display(member) {
    return featureValues(member)['burst.yunjin_dmg_bonus'][2];
}

// Yun Jin plus a receiver and two neutral members; all four elements differ
// (geo/cryo/pyro/anemo), so no Elemental Resonance applies and A4 sits at 4
// stacks (11.5%).
function neutralTeam() {
    const yunjin = makeBuild('YunJin');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, yunjin);
    team.setMember(2, makeBuild('Hutao'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(receiver);
    yunjin.setCharSettings({yunjin_flag: true});
    return {team, yunjin, receiver};
}

// Game formula for the banner bonus at a given Yun Jin total DEF (4 types).
function expectedDisplay(def) {
    return def * (BURST_RATIO + STACK_BONUS[4]);
}

// The receiver's normal hit gained from the banner alone (flag on minus off),
// isolating it from the receiver's own stats. C2/C6 locked at C0. Extra held
// settings (such as C4) stay on across the toggle.
function receiverDelta(yunjin, receiver, extra = {}) {
    yunjin.setCharSettings(extra);
    const off = featureValues(receiver)['attack.normal_hit_1'][0];
    yunjin.setCharSettings(Object.assign({yunjin_flag: true}, extra));
    return featureValues(receiver)['attack.normal_hit_1'][0] - off;
}

test("burst bonus formula parity: display is total DEF x (talent ratio + A4 stacks)", () => {
    const {yunjin, receiver} = neutralTeam();
    for (const def of [1000, 2000]) {
        matchCarrierTotals(yunjin, {def_total: def});
        // No extra DEF present: premod and total agree.
        expect(totalDef(finalStats(yunjin))).toBeCloseTo(def, 6);
        expect(display(yunjin)).toBeCloseTo(expectedDisplay(def), 6);
    }
    // 2000 -> 2000 x (0.57888 + 0.115) = 1387.76.
    expect(expectedDisplay(2000)).toBeCloseTo(1387.76, 8);
    // The delivered bonus reaches the receiver's normal hits and doubles when
    // DEF doubles (same total, same per-DEF rate).
    matchCarrierTotals(yunjin, {def_total: 1000});
    const half = receiverDelta(yunjin, receiver);
    expect(half).toBeGreaterThan(100);
    matchCarrierTotals(yunjin, {def_total: 2000});
    expect(receiverDelta(yunjin, receiver) / half).toBeCloseTo(2, 6);
});

test("A4 stacks follow the party element count", () => {
    const yunjin = makeBuild('YunJin');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, yunjin);
    team.setMember(2, makeBuild('Hutao'));
    team.setMember(3, makeBuild('Noelle')); // second geo: 3 element types
    team.setOnFieldMember(receiver);
    yunjin.setCharSettings({yunjin_flag: true});
    matchCarrierTotals(yunjin, {def_total: 2000});
    // Geo resonance touches no DEF stat; only the stack term moves.
    expect(display(yunjin)).toBeCloseTo(2000 * (BURST_RATIO + STACK_BONUS[3]), 6);
    // 2000 x (0.57888 + 0.075) = 1307.76.
    expect(2000 * (BURST_RATIO + STACK_BONUS[3])).toBeCloseTo(1307.76, 8);
});

test("counts own C4 premod DEF", () => {
    const yunjin = makeBuild('YunJin');
    yunjin.setCharLevels({level: 90, ascension: 6, constellation: 4});
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, yunjin);
    team.setMember(2, makeBuild('Hutao'));
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(receiver);
    yunjin.setCharSettings({yunjin_flag: true});
    matchCarrierTotals(yunjin, {def_total: 2000});
    const defOff = totalDef(finalStats(yunjin));
    const dispOff = display(yunjin);
    const recvOff = receiverDelta(yunjin, receiver);
    yunjin.setCharSettings({yunjin_flag: true, yunjin_flower: true});
    const defOn = totalDef(finalStats(yunjin));
    const dispOn = display(yunjin);
    // Sanity: C4 added 20% of base DEF (a premod condition).
    expect(defOn - defOff).toBeCloseTo(0.2 * finalStats(yunjin).get('def_base'), 6);
    // The whole premod gain is counted, in the display and on the receiver.
    // Constellation 4 includes C3, so the burst runs at level 13 (68.34%).
    expect(dispOn - dispOff).toBeCloseTo((BURST_RATIO_C3 + STACK_BONUS[4]) * (defOn - defOff), 6);
    expect(receiverDelta(yunjin, receiver, {yunjin_flower: true}) / recvOff).toBeCloseTo(dispOn / dispOff, 6);
});

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'geo',
};

// Yun Jin on field (Columbina C2 feeds the active member) with Columbina C2,
// Aino and Fischl (Moonsign gate). Totals are matched with C2 on, so turning
// it off drops Yun Jin by 1% of Columbina's 30000 total HP = 300 premod DEF.
function setupC2() {
    const yunjin = makeBuild('YunJin');
    const columbina = makeBuild('Columbina');
    columbina.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const team = Team.fromMember(yunjin);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(yunjin);
    yunjin.setCharSettings({yunjin_flag: true});
    columbina.setCharSettings(C2_ON);
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(yunjin, {def_total: 2000});
    return {team, yunjin, columbina};
}

// Yun Jin's own normal hit gained from the banner alone (TEAM delivery
// includes the source).
function selfDelta(yunjin) {
    yunjin.setCharSettings({});
    const off = featureValues(yunjin)['attack.normal_hit_1'][0];
    yunjin.setCharSettings({yunjin_flag: true});
    return featureValues(yunjin)['attack.normal_hit_1'][0] - off;
}

test("counts Columbina C2 geo premod DEF", () => {
    const {yunjin, columbina} = setupC2();
    const defOn = totalDef(finalStats(yunjin));
    const dispOn = display(yunjin);
    const hitOn = selfDelta(yunjin);
    columbina.setCharSettings({});
    const defOff = totalDef(finalStats(yunjin));
    const dispOff = display(yunjin);
    const hitOff = selfDelta(yunjin);
    // 1% of 30000 total HP, premod, on the active character.
    expect(defOn - defOff).toBeCloseTo(300, 6);
    // The whole premod gain is counted at the same per-DEF rate, in the
    // display and in the delivered hits.
    expect((dispOn - dispOff) / (defOn - defOff)).toBeCloseTo(dispOn / defOn, 8);
    expect(hitOn / hitOff).toBeCloseTo(dispOn / dispOff, 6);
});

test("ignores Bennett burst ATK and Key of Khaj-Nisut party EM", () => {
    const yunjin = makeBuild('YunJin');
    const receiver = makeBuild('Eula');
    const bennett = makeBuild('Bennet');
    const xingqiu = makeBuild('Xingqiu');
    xingqiu.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    xingqiu.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const team = Team.fromMember(receiver);
    team.setMember(1, yunjin);
    team.setMember(2, bennett);
    team.setMember(3, xingqiu);
    team.setOnFieldMember(receiver);
    yunjin.setCharSettings({yunjin_flag: true});
    bennett.setCharSettings({});
    xingqiu.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    matchCarrierTotals(yunjin, {def_total: 2000});
    // geo/cryo/pyro/hydro: four types, no resonance.
    const before = display(yunjin);
    expect(before).toBeCloseTo(expectedDisplay(2000), 6);

    // Bennett's burst ATK is extra ATK on the on-field receiver; the bonus
    // reads DEF, so it must not move.
    const atkBefore = totalAtk(finalStats(receiver));
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(totalAtk(finalStats(receiver)) - atkBefore).toBeGreaterThan(10);
    expect(display(yunjin)).toBeCloseTo(before, 8);

    // The Key's party EM is extra EM; it must not move the DEF-read bonus.
    const emBefore = totalMastery(finalStats(receiver));
    xingqiu.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
    expect(totalMastery(finalStats(receiver)) - emBefore).toBeGreaterThan(1);
    expect(display(yunjin)).toBeCloseTo(before, 8);
});
