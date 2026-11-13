import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md: Yae Miko's EM-scaled effect and its channel.
//
// - A4 Enlightened Blessing (dmg_skill_yaemiko, 0.15% per EM, no cap) reads the
//   TOTAL EM: Avatar_Yae_PermanentSkill_2 (ModifyDamageMixin on Elemental_Art) scales
//   Yae_PermanentSkill_2_AttackUpRatio * FIGHT_PROP_ELEMENT_MASTERY (ProudSkill 582201:
//   0.0015); GO reads input.total.eleMas, writes total skill_dmg_. KQM Yae: Sucrose A4
//   extra EM counts (also Kazuha C2 / Diona C6 flat EM); KQM Nahida lists Yae A4 among
//   the bonuses counting Nahida A1 extra EM. It counts every extra EM buff, so there
//   is no EM buff it must ignore; the must-not-count side is covered by the contrast
//   test (Sucrose's A4, a premod reader, ignoring Nahida's A1 in the same team).
// - A1 The Shrine's Sacred Shade is a CD reduction (ModifyAvatarSkillCD) plus plain ATK
//   hits (40% / 50% Radiance): no stat read, needs nothing.
// - Edict enhanced lightning (UNIQUE_Yae_EnhanceEAReady(_Star) damageExtra ... *
//   FIGHT_PROP_CUR_ATTACK, total) is a hit: reads the total by construction, needs nothing.
// - C1 (Actor_ElecAddHurtDelta + Stellar-Conduct deltas), C2 (Actor_ElemMasteryDelta
//   60/90/120/200), C4 (Actor_ElecAddHurtDelta + flat burst ModifyDamageMixin), C6
//   (flat DEF-ignore + Stellar-Conduct CRIT DMG): all premod flat writes (no Extra) in
//   the game; GO writes premod. Conditions write premod: defaults confirmed, no params.
//   C2's premod EM is counted by the premod reader Sucrose A4 (pinned below).
//
// A 4-member team is used throughout: a smaller team would get Elemental Resonance in
// our engine but not in the game (md/buff_chains.md). The team is electro/dendro/anemo/geo
// (all different: no resonance in the game or in our engine).

const NAHIDA_A1 = {nahida_compassion_illuminated: true, nahida_illusory_heart: true};

// Yae on field so Nahida's A1 lands on her. Totals are matched with every effect off,
// so they are premod values.
function setup(yaeEM = 500) {
    const yae = makeBuild('YaeMiko');
    const nahida = makeBuild('Nahida');
    const sucrose = makeBuild('Sucrose');
    const noelle = makeBuild('Noelle');
    const team = Team.fromMember(yae);
    team.setMember(1, nahida);
    team.setMember(2, sucrose);
    team.setMember(3, noelle);
    team.setOnFieldMember(yae);
    yae.setCharSettings({});
    nahida.setCharSettings({});
    sucrose.setCharSettings({});
    matchCarrierTotals(yae, {mastery_total: yaeEM});
    matchCarrierTotals(nahida, {mastery_total: 900});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    matchCarrierTotals(noelle, {mastery_total: 100});
    return {team, yae, nahida, sucrose, noelle};
}

function a4Bonus(yae) {
    return finalStats(yae).get('dmg_skill_yaemiko');
}

describe('Yae Miko A4 reads total EM', () => {
    test('solo numbers: 0.15% of EM', () => {
        const {yae} = setup();
        // No extra EM present: premod and total agree.
        expect(totalMastery(finalStats(yae))).toBeCloseTo(500, 6);
        expect(a4Bonus(yae)).toBeCloseTo(0.0015 * 500, 9);
    });

    test('counts Nahida A1 extra EM', () => {
        const {yae, nahida} = setup();
        nahida.setCharSettings(NAHIDA_A1);
        // 25% of the highest premod EM (900) = 225, under the 250 cap.
        expect(totalMastery(finalStats(yae))).toBeCloseTo(500 + 225, 6);
        expect(a4Bonus(yae)).toBeCloseTo(0.0015 * (500 + 225), 9);
    });

    test('counts Sucrose A4 shared EM', () => {
        const {yae, sucrose} = setup();
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        // 20% of Sucrose premod EM (600) = 120.
        expect(totalMastery(finalStats(yae))).toBeCloseTo(500 + 120, 6);
        expect(a4Bonus(yae)).toBeCloseTo(0.0015 * (500 + 120), 9);
    });

    test('counts both extra sources together', () => {
        const {yae, nahida, sucrose} = setup();
        nahida.setCharSettings(NAHIDA_A1);
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        // Nahida A1 reads premod only, so Sucrose extra does not grow it:
        // 225 + 120 on top of 500.
        expect(totalMastery(finalStats(yae))).toBeCloseTo(500 + 225 + 120, 6);
        expect(a4Bonus(yae)).toBeCloseTo(0.0015 * (500 + 225 + 120), 9);
    });

    test('extra EM is indistinguishable from premod EM', () => {
        const first = setup();
        first.nahida.setCharSettings(NAHIDA_A1);
        const withExtra = a4Bonus(first.yae);

        const second = setup(500 + 225);
        const withPremod = a4Bonus(second.yae);

        expect(withExtra).toBeCloseTo(0.0015 * 725, 9);
        expect(withPremod).toBeCloseTo(0.0015 * 725, 9);
    });

    test('contrast: Sucrose A4 (premod) ignores Nahida A1 extra EM', () => {
        const {team, yae, nahida, sucrose} = setup();
        team.setOnFieldMember(sucrose);
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        const before = totalMastery(finalStats(yae));
        expect(before).toBeCloseTo(500 + 120, 6);
        // Nahida A1 now lands on Sucrose (on field): Sucrose total becomes
        // 600 + 225, but her premod share stays 20% of 600 = 120.
        nahida.setCharSettings(NAHIDA_A1);
        expect(totalMastery(finalStats(sucrose))).toBeCloseTo(600 + 225, 6);
        expect(totalMastery(finalStats(yae))).toBeCloseTo(500 + 120, 6);
    });
});

describe('Yae Miko C2 writes premod EM', () => {
    function setupC2() {
        const {team, yae, nahida, sucrose, noelle} = setup();
        yae.setCharLevels({level: 90, ascension: 6, constellation: 2});
        return {team, yae, nahida, sucrose, noelle};
    }

    test('solo numbers: +200 EM on Yae at Sakura level 4', () => {
        const {yae} = setupC2();
        yae.setCharSettings({yae_miko_sesshou_sakura_level: 4});
        // Game text: 60/90/120/200 by Sakura level; conditions write premod.
        expect(totalMastery(finalStats(yae))).toBeCloseTo(500 + 200, 6);
    });

    test('the on-field active character shares it; off-field members do not', () => {
        const {team, yae, sucrose, noelle} = setupC2();
        yae.setCharSettings({yae_miko_sesshou_sakura_level: 4});
        // Yae on field: she keeps her own +200; Sucrose (off field) gets nothing.
        expect(totalMastery(finalStats(sucrose))).toBeCloseTo(600, 6);
        expect(totalMastery(finalStats(noelle))).toBeCloseTo(100, 6);
        // Sucrose on field: she gains the shared +200 on top of her own 600.
        team.setOnFieldMember(sucrose);
        expect(totalMastery(finalStats(sucrose))).toBeCloseTo(600 + 200, 6);
        expect(totalMastery(finalStats(yae))).toBeCloseTo(500 + 200, 6);
    });

    test('Sucrose A4 (premod reader) counts the C2 premod EM', () => {
        const {team, yae, sucrose, noelle} = setupC2();
        team.setOnFieldMember(sucrose);
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        yae.setCharSettings({yae_miko_sesshou_sakura_level: 4});
        // Sucrose premod is 600 + 200 shared = 800; her share is 20% of it = 160.
        // Sucrose does not receive her own share (as in test/buffChannels.test.js):
        // she stays at 800. Noelle is off field and gets nothing else: 100 + 160.
        expect(totalMastery(finalStats(sucrose))).toBeCloseTo(800, 6);
        expect(totalMastery(finalStats(noelle))).toBeCloseTo(100 + 160, 6);
    });
});

describe('Yae Miko C1/C4/C6 are flat (solo parity)', () => {
    test('C1 Electro and Stellar-Conduct DMG are static', () => {
        const {yae} = setup();
        yae.setCharLevels({level: 90, ascension: 6, constellation: 1});
        expect(finalStats(yae).get('dmg_electro')).toBeCloseTo(0, 9);
        yae.setCharSettings({yae_miko_yakan_offering_buff: true});
        // Game text: 50% Electro and Stellar-Conduct DMG.
        expect(finalStats(yae).get('dmg_electro')).toBeCloseTo(0.5, 9);
        expect(finalStats(yae).get('dmg_stellarconduct')).toBeCloseTo(0.5, 9);
    });

    test('C4 Electro DMG plus Burst DMG are static', () => {
        const {yae} = setup();
        yae.setCharLevels({level: 90, ascension: 6, constellation: 4});
        expect(finalStats(yae).get('dmg_burst')).toBeCloseTo(0, 9);
        yae.setCharSettings({miko_sakura_channeling: true});
        // Game text: 20% Electro DMG, 100% Burst DMG.
        expect(finalStats(yae).get('dmg_electro')).toBeCloseTo(0.2, 9);
        expect(finalStats(yae).get('dmg_burst')).toBeCloseTo(1.0, 9);
    });

    test('C6 DEF ignore and Stellar-Conduct CRIT DMG are static', () => {
        const {yae} = setup();
        yae.setCharLevels({level: 90, ascension: 6, constellation: 6});
        // Game text: Sesshou attacks ignore 60% DEF; Stellar-Conduct CRIT DMG +200%.
        expect(finalStats(yae).get('def_ignore_skill')).toBeCloseTo(0.6, 9);
        expect(finalStats(yae).get('crit_dmg_stellarconduct')).toBeCloseTo(2.0, 9);
    });
});
