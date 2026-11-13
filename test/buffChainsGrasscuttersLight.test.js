import { setControlsOff } from '../src/js/classes/ArtifactSetProfile';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeSetArtifacts } from './support/baseline';
import { finalStats, makeBuild, totalMastery } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md: Engulfing Lightning's ATK% reads premod (non-extra) ER
// and writes extra ATK: the game (Weapon_Pole_Narukami /
// UNIQUE_Pole_Narukami_ChargeToAtk_Refresh) computes AttackRatio =
// ChargetoAtk_Factor x (FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY - 1), capped at
// MaxAttackRatio (affix 113509: 28%/80% .. 56%/120%), into
// Actor_AttackExtraDelta; KQM (Electro Traveler evidence) says the amulet ER
// does not move Engulfing's ATK. GO reads input.premod.enerRech_ (agrees) but
// writes premod.atk_ (the game writes extra). The burst ER buff
// (UNIQUE_Weapon_Pole_Narukami_ChargeUp) writes Actor_ChargeEfficiencyDelta
// (premod; 30% .. 50% for 12s): a condition, always premod. The default
// channels hold everywhere, locked in here.
//
// The holder is Flins (polearm): his A4 reads premod ATK (batch 3), so it
// pins the write side — Engulfing's extra ATK must not feed it — while the
// weapon's own premod ER toggle pins the read side from inside the weapon.
//
// Game-formula constants used below:
// - bonus = factor x (ER_premod - 1), cap MaxAttackRatio (R1 0.28/0.80,
//   R5 0.56/1.20);
// - Emblem of Severed Fate 2pc: +20% ER, a plain set bonus (premod; the only
//   extra-ER writers in the game are Xiphos and the Traveler amulet);
// - weapon toggle R1: +30% ER (premod); R5: +50% ER;
// - Xiphos Moonlight R1 party: 30% of 0.036% per wielder EM = 0.0108% per EM,
//   written extra (default channels, matching the game);
// - Flins A4: 8% of premod ATK as EM (cap 160).
// Only the builds' base inputs (holder premod ER and base ATK, carrier premod
// EM) are read from the engine; every expected number is computed from those
// formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md). The four
// members are four elements (Electro/Hydro/Pyro/Cryo), so no resonance anyway.

function setup() {
    const flins = makeBuild('Flins');
    flins.setWeapon(DB.Weapons.get('polearm').get('GrasscuttersLight'));
    flins.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const bennet = makeBuild('Bennet');
    bennet.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    bennet.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const aino = makeBuild('Aino');
    const diona = makeBuild('Diona');
    const team = Team.fromMember(flins);
    team.setMember(1, bennet);
    team.setMember(2, aino);
    team.setMember(3, diona);
    team.setOnFieldMember(flins);
    return {flins, bennet};
}

function withEmblem(flins) {
    flins.replaceArtifacts(makeSetArtifacts('EmblemofSeveredFate').slice(0, 2));
    flins.setArtifactsSettings(setControlsOff('EmblemofSeveredFate'));
}

function premodEr(stats) {
    return stats.get('recharge_base') + stats.get('recharge') - (stats.get('recharge_extra') || 0);
}

function extraEr(stats) {
    return stats.get('recharge_extra') || 0;
}

function bonusOf(flins) {
    return finalStats(flins).get('atk_percent_extra') || 0;
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function premodAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent') - (stats.get('atk_percent_extra') || 0))
        + stats.get('atk') - (stats.get('atk_extra') || 0);
}

describe('Engulfing Lightning ATK reads premod ER', () => {
    test('solo R1 numbers: 28% of ER above 100%, no extra lane', () => {
        const {flins} = setup();
        const stats = finalStats(flins);
        expect(extraEr(stats)).toBe(0);
        const expected = Math.min(0.28 * (premodEr(stats) - 1), 0.80);
        expect(expected).toBeGreaterThan(0.05);
        expect(bonusOf(flins)).toBeCloseTo(expected, 9);
    });

    test('solo R5 numbers: 56% of ER above 100%', () => {
        const {flins} = setup();
        flins.setWeaponLevels({level: 90, ascension: 6, refine: 5});
        const stats = finalStats(flins);
        expect(extraEr(stats)).toBe(0);
        const expected = Math.min(0.56 * (premodEr(stats) - 1), 1.20);
        expect(expected).toBeGreaterThan(0.1);
        expect(bonusOf(flins)).toBeCloseTo(expected, 9);
    });

    test('counts premod ER: Emblem 2pc and the weapon toggle move the bonus', () => {
        const {flins} = setup();
        const soloBonus = bonusOf(flins);
        withEmblem(flins);
        // +0.2 premod ER at 28%: +0.056 ATK.
        expect(bonusOf(flins) - soloBonus).toBeCloseTo(0.056, 9);
        flins.setWeaponSettings({weapon_grasscutters_light: true});
        // The burst ER buff is a premod write, so it counts too: +0.3 ER at
        // 28% is another +0.084 ATK.
        expect(bonusOf(flins) - soloBonus).toBeCloseTo(0.056 + 0.084, 9);
    });

    test('ignores extra ER: Xiphos party ER does not move the bonus', () => {
        const {flins, bennet} = setup();
        const soloBonus = bonusOf(flins);
        const soloAtk = totalAtk(finalStats(flins));
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        // The carrier's premod EM is the buff's input (Xiphos reads non-extra
        // EM in the game); the 0.0108 R1 party rate is the game formula.
        const carrierStats = finalStats(bennet);
        const carrierEm = totalMastery(carrierStats) - (carrierStats.get('mastery_extra') || 0);
        const expectedExtra = 0.0108 * carrierEm / 100;

        const stats = finalStats(flins);
        expect(extraEr(stats)).toBeCloseTo(expectedExtra, 9);
        expect(premodEr(stats)).toBeCloseTo(
            stats.get('recharge_base') + stats.get('recharge') - expectedExtra, 9);
        // The extra ER lands in the total but the bonus and total ATK stay.
        expect(bonusOf(flins)).toBeCloseTo(soloBonus, 9);
        expect(totalAtk(stats)).toBeCloseTo(soloAtk, 9);
    });

    test('extra and premod together: only the premod part counts', () => {
        const {flins, bennet} = setup();
        withEmblem(flins);
        const emblemBonus = bonusOf(flins);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        const carrierStats = finalStats(bennet);
        const carrierEm = totalMastery(carrierStats) - (carrierStats.get('mastery_extra') || 0);

        const stats = finalStats(flins);
        expect(extraEr(stats)).toBeCloseTo(0.0108 * carrierEm / 100, 9);
        expect(bonusOf(flins)).toBeCloseTo(emblemBonus, 9);
    });
});

describe('Engulfing Lightning ATK writes extra (Flins A4 must not see it)', () => {
    test('the weapon toggle raises total ATK but not Flins A4 EM', () => {
        const {flins} = setup();
        matchCarrierTotals(flins, {atk_total: 1000});
        // Flins's A4 reads premod ATK at 8% (cap 160): with the total matched
        // to 1000 the premod value sits below the cap, so a zero move below
        // is not vacuous.
        let stats = finalStats(flins);
        expect(0.08 * premodAtk(stats)).toBeLessThan(160);
        expect(stats.get('mastery_extra')).toBeCloseTo(0.08 * premodAtk(stats), 6);
        const emBefore = totalMastery(stats);
        const premodBefore = premodAtk(stats);
        const atkBefore = totalAtk(stats);
        const baseAtk = stats.get('atk_base');

        // +0.3 premod ER at 28%: the bonus grows by 0.084 of base ATK, all of
        // it extra, so the premod value and Flins's premod-read A4 stay.
        flins.setWeaponSettings({weapon_grasscutters_light: true});
        stats = finalStats(flins);
        expect(totalAtk(stats) - atkBefore).toBeCloseTo(baseAtk * 0.084, 6);
        expect(premodAtk(stats)).toBeCloseTo(premodBefore, 8);
        expect(totalMastery(stats) - emBefore).toBeCloseTo(0, 8);
        expect(stats.get('mastery_extra')).toBeCloseTo(0.08 * premodBefore, 6);
    });
});
