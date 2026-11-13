import { setControlsOff } from '../src/js/classes/ArtifactSetProfile';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeSetArtifacts } from './support/baseline';
import { finalStats, makeBuild, totalMastery } from './support/team';

global.DB = DB;

// md/buff_chains.md: Alyosha's A4 (Suffer the Winter Wheat Will, dmg_skill
// and dmg_burst from ER, capped at 70%) reads the total ER: the game
// (Avatar_Alyosha_PermanentSkill_2 / UNIQUE_Alyosha_PermanentSkill_2_Buff,
// ModifyDamageMixin) scales on FIGHT_PROP_CHARGE_EFFICIENCY, and GO reads
// input.total.enerRech_. KQM has no Alyosha interaction test. A total read
// counts every ER buff, so there is no ER buff it must ignore; the
// must-not-count side is covered by the contrast test (Raiden's A4, a
// premod ER reader, ignoring Xiphos party ER in the same team).
//
// Game-formula constants used below (level 90, ascension 6):
// - base ER 100% + 26.67% ascension = 126.67% premod with no other source;
// - A4 bonus = 0.35% per 1% of total ER = 0.35 x ER_total, capped at 0.70;
// - Xiphos Moonlight R1 party: 30% of 0.036% per wielder EM = 0.0108% per
//   EM, written extra (default channels, matching the game);
// - Emblem of Severed Fate 2pc: +20% ER, a plain set bonus (premod; the
//   only extra-ER writers in the game are Xiphos and the Traveler amulet).
// Only the builds' base inputs (carrier premod EM, Alyosha base ER) are
// read from the engine; every expected number is computed from those
// formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function setup() {
    const alyosha = makeBuild('Alyosha');
    const bennet = makeBuild('Bennet');
    bennet.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    bennet.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const raiden = makeBuild('RaidenShogun');
    const diona = makeBuild('Diona');
    const team = Team.fromMember(alyosha);
    team.setMember(1, bennet);
    team.setMember(2, raiden);
    team.setMember(3, diona);
    team.setOnFieldMember(alyosha);
    return {alyosha, bennet, raiden};
}

function withEmblem(alyosha) {
    alyosha.replaceArtifacts(makeSetArtifacts('EmblemofSeveredFate').slice(0, 2));
    alyosha.setArtifactsSettings(setControlsOff('EmblemofSeveredFate'));
}

function premodEr(stats) {
    return stats.get('recharge_base') + stats.get('recharge') - (stats.get('recharge_extra') || 0);
}

function extraEr(stats) {
    return stats.get('recharge_extra') || 0;
}

function a4Of(alyosha) {
    const stats = finalStats(alyosha);
    return [stats.get('dmg_skill'), stats.get('dmg_burst')];
}

function bennetPremodEm(bennet) {
    const stats = finalStats(bennet);
    return totalMastery(stats) - (stats.get('mastery_extra') || 0);
}

describe('Alyosha A4 reads total ER', () => {
    test('solo numbers: 0.35 per ER, no extra lane', () => {
        const {alyosha} = setup();
        const stats = finalStats(alyosha);
        expect(extraEr(stats)).toBe(0);
        // 100% base + 26.67% ascension.
        expect(premodEr(stats)).toBeCloseTo(1 + 26.67 / 100, 9);
        // 0.35 x 1.2667 = 0.4433, under the 0.70 cap; skill and burst agree.
        const [skill, burst] = a4Of(alyosha);
        expect(skill).toBeCloseTo(0.35 * (1 + 26.67 / 100), 9);
        expect(burst).toBeCloseTo(0.35 * (1 + 26.67 / 100), 9);
    });

    test('counts premod ER: Emblem 2pc moves the bonus', () => {
        const {alyosha} = setup();
        withEmblem(alyosha);
        const stats = finalStats(alyosha);
        // Still no extra ER anywhere: a set bonus is premod.
        expect(extraEr(stats)).toBe(0);
        expect(premodEr(stats)).toBeCloseTo(1 + 26.67 / 100 + 0.2, 9);
        // +0.2 ER: +0.07 bonus on both.
        const [skill, burst] = a4Of(alyosha);
        expect(skill).toBeCloseTo(0.35 * (1 + 26.67 / 100 + 0.2), 9);
        expect(burst).toBeCloseTo(0.35 * (1 + 26.67 / 100 + 0.2), 9);
    });

    test('counts extra ER: Xiphos party ER moves the bonus', () => {
        const {alyosha, bennet} = setup();
        const solo = a4Of(alyosha);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        // The carrier's premod EM is the buff's input (Xiphos reads
        // non-extra EM in the game); the 0.0108 R1 party rate is the game
        // formula.
        const expectedExtra = 0.0108 * bennetPremodEm(bennet) / 100;

        const stats = finalStats(alyosha);
        expect(extraEr(stats)).toBeCloseTo(expectedExtra, 9);
        expect(premodEr(stats)).toBeCloseTo(1 + 26.67 / 100, 9);
        // The extra ER lands in the total and the A4 counts it.
        const [skill, burst] = a4Of(alyosha);
        expect(skill).toBeCloseTo(solo[0] + 0.35 * expectedExtra, 9);
        expect(burst).toBeCloseTo(solo[1] + 0.35 * expectedExtra, 9);
    });

    test('extra and premod together: both parts count', () => {
        const {alyosha, bennet} = setup();
        withEmblem(alyosha);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        const expectedExtra = 0.0108 * bennetPremodEm(bennet) / 100;

        const stats = finalStats(alyosha);
        expect(extraEr(stats)).toBeCloseTo(expectedExtra, 9);
        expect(premodEr(stats)).toBeCloseTo(1 + 26.67 / 100 + 0.2, 9);
        const [skill, burst] = a4Of(alyosha);
        expect(skill).toBeCloseTo(0.35 * (1 + 26.67 / 100 + 0.2 + expectedExtra), 9);
        expect(burst).toBeCloseTo(0.35 * (1 + 26.67 / 100 + 0.2 + expectedExtra), 9);
    });

    test('still caps at 70% when total ER pushes past 200%', () => {
        const {alyosha} = setup();
        // A flat custom buff is a condition: premod ER (percent-points,
        // like the stat tables: 100 = +100% ER).
        alyosha.modifyBuffsSettings({'custom_buffs.recharge': 100});
        const stats = finalStats(alyosha);
        expect(extraEr(stats)).toBe(0);
        expect(premodEr(stats)).toBeCloseTo(1 + 26.67 / 100 + 1.0, 9);
        // 0.35 x 2.2667 = 0.7933, capped to 0.70.
        const [skill, burst] = a4Of(alyosha);
        expect(skill).toBeCloseTo(0.7, 9);
        expect(burst).toBeCloseTo(0.7, 9);
    });

    test('contrast: Raiden A4 (premod) ignores Xiphos party ER', () => {
        const {raiden, bennet} = setup();
        const before = finalStats(raiden).get('dmg_electro');
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        // Raiden gains the same extra ER lane...
        expect(extraEr(finalStats(raiden))).toBeCloseTo(0.0108 * bennetPremodEm(bennet) / 100, 9);
        // ...but her premod-read A4 stays.
        expect(finalStats(raiden).get('dmg_electro')).toBeCloseTo(before, 9);
    });
});
