import { setControlsOff } from '../src/js/classes/ArtifactSetProfile';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeSetArtifacts } from './support/baseline';
import { finalStats, makeBuild, totalMastery, featureValues } from './support/team';

global.DB = DB;

// md/buff_chains.md: Raiden's burst energy restore reads premod (non-extra)
// ER: the game (Avatar_Shougun_ElementalBurst /
// UNIQUE_Shougun_Tachi_ReviveEnergy_Handler) computes
// ExtraReviveEnergy_ValidProp from FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY, and
// KQM (weapons evidence, "Xiphos and Raiden A4 Interactions"; Electro
// Traveler evidence) says Xiphos ER affects neither part of her A4 and the
// amulet ER does not affect it either. Her A4 Electro DMG reads premod ER too
// (Avatar_Shougun_Talent_ChargeEfficiencyToElecAddHurt, same fight prop,
// Actor_ElecAddHurtExtraDelta write): the default, locked in here.
//
// Game-formula constants used below (talent 10, ascension 6):
// - base ER 100% + 32% ascension = 132% premod with no other ER source;
// - restore = 1 + ER_premod x (2.5 x 60 / 100) = 1 + 1.5 x ER_premod
//   (Tachi_BaseReviveEnergy 2.5 x ExtraReviveEnergyRatio, 0.6% per 1% ER);
// - A4 Electro = 0.4% per 1% ER above 100% = 0.4 x (ER_premod - 1);
// - Xiphos Moonlight R1 party: 30% of 0.036% per wielder EM = 0.0108% per
//   EM, written extra (default channels, matching the game);
// - Emblem of Severed Fate 2pc: +20% ER, a plain set bonus (premod; the only
//   extra-ER writers in the game are Xiphos and the Traveler amulet).
// Only the builds' base inputs (carrier premod EM, Raiden base ER) are read
// from the engine; every expected number is computed from those formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function setup() {
    const raiden = makeBuild('RaidenShogun');
    const bennet = makeBuild('Bennet');
    bennet.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    bennet.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const xingqiu = makeBuild('Xingqiu');
    const diona = makeBuild('Diona');
    const team = Team.fromMember(raiden);
    team.setMember(1, bennet);
    team.setMember(2, xingqiu);
    team.setMember(3, diona);
    team.setOnFieldMember(raiden);
    return {raiden, bennet};
}

function withEmblem(raiden) {
    raiden.replaceArtifacts(makeSetArtifacts('EmblemofSeveredFate').slice(0, 2));
    raiden.setArtifactsSettings(setControlsOff('EmblemofSeveredFate'));
}

function premodEr(stats) {
    return stats.get('recharge_base') + stats.get('recharge') - (stats.get('recharge_extra') || 0);
}

function extraEr(stats) {
    return stats.get('recharge_extra') || 0;
}

function restoreOf(raiden) {
    return featureValues(raiden)['burst.baal_energy_recharge'][0];
}

function a4Of(raiden) {
    return finalStats(raiden).get('dmg_electro');
}

describe('Raiden energy restore reads premod ER', () => {
    test('solo numbers: base 132% ER, no extra lane', () => {
        const {raiden} = setup();
        const stats = finalStats(raiden);
        expect(extraEr(stats)).toBe(0);
        // 100% base + 32% ascension.
        expect(premodEr(stats)).toBeCloseTo(1.32, 9);
        // 1 + 1.5 x 1.32; 0.4 x 0.32.
        expect(restoreOf(raiden)).toBeCloseTo(2.98, 9);
        expect(a4Of(raiden)).toBeCloseTo(0.128, 9);
    });

    test('counts premod ER: Emblem 2pc moves both parts of A4', () => {
        const {raiden} = setup();
        withEmblem(raiden);
        const stats = finalStats(raiden);
        // Still no extra ER anywhere: a set bonus is premod.
        expect(extraEr(stats)).toBe(0);
        expect(premodEr(stats)).toBeCloseTo(1.52, 9);
        // +0.2 ER: restore +0.3, Electro +0.08.
        expect(restoreOf(raiden)).toBeCloseTo(3.28, 9);
        expect(a4Of(raiden)).toBeCloseTo(0.208, 9);
    });

    test('ignores extra ER: Xiphos party ER moves neither part', () => {
        const {raiden, bennet} = setup();
        const soloRestore = restoreOf(raiden);
        const soloA4 = a4Of(raiden);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        // The carrier's premod EM is the buff's input (Xiphos reads non-extra
        // EM in the game); the 0.0108 R1 party rate is the game formula.
        const carrierStats = finalStats(bennet);
        const carrierEm = totalMastery(carrierStats) - (carrierStats.get('mastery_extra') || 0);
        const expectedExtra = 0.0108 * carrierEm / 100;

        const stats = finalStats(raiden);
        expect(extraEr(stats)).toBeCloseTo(expectedExtra, 9);
        expect(premodEr(stats)).toBeCloseTo(1.32, 9);
        // The extra ER lands in the total but the restore and the A4 stay.
        expect(stats.get('recharge_base') + stats.get('recharge')).toBeCloseTo(1.32 + expectedExtra, 9);
        expect(restoreOf(raiden)).toBeCloseTo(soloRestore, 9);
        expect(a4Of(raiden)).toBeCloseTo(soloA4, 9);
    });

    test('extra and premod together: only the premod part counts', () => {
        const {raiden, bennet} = setup();
        withEmblem(raiden);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        const carrierStats = finalStats(bennet);
        const carrierEm = totalMastery(carrierStats) - (carrierStats.get('mastery_extra') || 0);

        const stats = finalStats(raiden);
        expect(extraEr(stats)).toBeCloseTo(0.0108 * carrierEm / 100, 9);
        expect(premodEr(stats)).toBeCloseTo(1.52, 9);
        expect(restoreOf(raiden)).toBeCloseTo(3.28, 9);
        expect(a4Of(raiden)).toBeCloseTo(0.208, 9);
    });
});
