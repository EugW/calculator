import { setControlsOff } from '../src/js/classes/ArtifactSetProfile';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeSetArtifacts } from './support/baseline';
import { finalStats, makeBuild, featureValues } from './support/team';

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Electro Traveler): both amulet
// effects keep the default channels (no reads/writes params changed in
// src/js/db/Char/TravelerElectro.js).
//
// - Pre-A4 flat part (20% ER): game
//   Player_Electric_ElementalArt_Magatama_Pickable /
//   UNIQUE_Player_Electric_ElementalArt_Magatama_EfficiencyUp writes
//   Actor_ChargeEfficiencyExtraDelta (extra) with no stat read.
// - A4 part (Resounding Roar: 10% of the Traveler's ER + the 20% flat):
//   game .../UNIQUE_Player_Electric_ElementalArt_Magatama_ExtraEfficiencyUp
//   (gated by ByUnlockTalentParam
//   Player_Electric_ElementalArt_ExtraChargeEfficiency) writes
//   Actor_ChargeEfficiencyExtraDelta (extra) from
//   FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY (premod). GO reads
//   input.premod.enerRech_ into teamBuff.total.enerRech_.
// - KQM (Electro Traveler evidence): the amulet ER affects neither Raiden's
//   nor Mona's A4, nor Emblem 4pc, nor Engulfing Lightning; and A4 only
//   takes the Traveler's original ER, so its own write does not feed it.
// - A1 (skill CD), C1 (+1 amulet), C2 (flat enemy Electro RES shred, no
//   extra lane), C3/C5 (talent levels), C4 (flat energy), C6 (a damage hit,
//   total by construction): no stat channels; flat toggles stay premod.
//
// Game-formula constants used below (ascension 6, so A4 is on):
// - amulet ER = 10% x traveler premod ER + 20% (PostEffectStatsRecharge
//   percent 10 + flatBonus 0.2); pre-A4 (ascension below 4) it is 20% flat;
// - Emblem of Severed Fate 2pc: +20% ER, a plain set bonus (premod);
// - Xiphos Moonlight R1 party: 30% of 0.036% per wielder premod EM, written
//   extra (default channels, matching the game).
// Only the builds' live inputs (the Traveler's premod ER) are read from the
// engine; every expected number is computed from those formulas.
//
// A 4-member team with four different elements is used throughout: a smaller
// team would get Elemental Resonance in our engine but not in the game
// (md/buff_chains.md).

function premodEr(stats) {
    return stats.get('recharge_base') + stats.get('recharge') - (stats.get('recharge_extra') || 0);
}

function extraEr(stats) {
    return stats.get('recharge_extra') || 0;
}

// Traveler (electro) + Bennett (pyro) + Xingqiu (hydro) + Diona (cryo):
// four different elements, so no resonance. The amulet goes to Xingqiu.
function setup() {
    const traveler = makeBuild('TravelerElectro');
    const team = Team.fromMember(traveler);
    const bennet = makeBuild('Bennet');
    team.setMember(1, bennet);
    const xingqiu = makeBuild('Xingqiu');
    team.setMember(2, xingqiu);
    const diona = makeBuild('Diona');
    team.setMember(3, diona);
    team.setOnFieldMember(xingqiu);
    traveler.setCharSettings({});
    return {team, traveler, bennet, xingqiu, diona};
}

function amuletOn(traveler, receiver) {
    traveler.setCharSettings({
        traveler_abundance_amulet: true,
        traveler_abundance_amulet_receiver: String(receiver.char.getId()),
    });
}

function amuletOff(traveler) {
    traveler.setCharSettings({});
}

// The receiver's ER gain from the amulet: on minus off, leaving it on.
function amuletDelta(traveler, receiver) {
    const before = finalStats(receiver).get('recharge');
    amuletOn(traveler, receiver);
    return finalStats(receiver).get('recharge') - before;
}

function withEmblem(traveler) {
    traveler.replaceArtifacts(makeSetArtifacts('EmblemofSeveredFate').slice(0, 2));
    traveler.setArtifactsSettings(setControlsOff('EmblemofSeveredFate'));
}

function withXiphos(bennet) {
    bennet.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    bennet.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    bennet.setWeaponSettings({whisper_of_the_jinn: true});
}

describe('Amulet ER formulas (no extra stat present)', () => {
    test('pre-A4 is a flat 20% extra ER', () => {
        const {traveler, xingqiu} = setup();
        traveler.setCharLevels({level: 90, ascension: 0, constellation: 0});
        amuletOff(traveler);
        expect(extraEr(finalStats(xingqiu))).toBe(0);
        expect(amuletDelta(traveler, xingqiu)).toBeCloseTo(0.2, 9);
        // The write lands in the extra lane.
        expect(extraEr(finalStats(xingqiu))).toBeCloseTo(0.2, 9);
    });

    test('A4 is 10% of the Traveler premod ER plus the 20% flat', () => {
        const {traveler, xingqiu} = setup();
        amuletOff(traveler);
        const premod = premodEr(finalStats(traveler));
        expect(extraEr(finalStats(traveler))).toBe(0);
        expect(amuletDelta(traveler, xingqiu)).toBeCloseTo(0.1 * premod + 0.2, 9);
        expect(extraEr(finalStats(xingqiu))).toBeCloseTo(0.1 * premod + 0.2, 9);
    });
});

describe('A4 reads premod ER', () => {
    test('counts premod ER: Emblem 2pc moves the share', () => {
        const {traveler, xingqiu} = setup();
        amuletOn(traveler, xingqiu);
        const before = finalStats(xingqiu).get('recharge');
        withEmblem(traveler);
        // +20% premod ER on the Traveler, still no extra ER anywhere.
        expect(extraEr(finalStats(traveler))).toBe(0);
        expect(premodEr(finalStats(traveler))).toBeGreaterThan(1);
        // 10% of +0.2 premod ER: the receiver gains +0.02.
        expect(finalStats(xingqiu).get('recharge') - before).toBeCloseTo(0.02, 9);
    });

    test('ignores extra ER: Xiphos party ER leaves the share unchanged', () => {
        const {traveler, bennet, xingqiu} = setup();
        withXiphos(bennet);
        amuletOff(traveler);
        const premod = premodEr(finalStats(traveler));
        // The Xiphos party share lands on the Traveler as extra ER.
        expect(extraEr(finalStats(traveler))).toBeGreaterThan(0.005);
        expect(premodEr(finalStats(traveler))).toBeCloseTo(premod, 9);
        // The A4 share is still 10% of the premod ER plus the flat.
        expect(amuletDelta(traveler, xingqiu)).toBeCloseTo(0.1 * premod + 0.2, 9);
    });

    test('ignores its own write: the Traveler as its own receiver', () => {
        const {traveler} = setup();
        const self = traveler;
        amuletOff(traveler);
        const premod = premodEr(finalStats(traveler));
        // KQM: picking up an amulet does not change the ER shared by A4.
        const before = finalStats(self).get('recharge');
        amuletOn(traveler, self);
        expect(finalStats(self).get('recharge') - before).toBeCloseTo(0.1 * premod + 0.2, 9);
    });
});

describe('Amulet ER writes extra (Raiden reads premod ER)', () => {
    // Raiden (electro, receiver) + Traveler (electro) + Bennett (pyro) +
    // Xingqiu (hydro). The double electro gives only particle resonance, no
    // ER stat, in the game and in our engine.
    function raidenSetup() {
        const raiden = makeBuild('RaidenShogun');
        const team = Team.fromMember(raiden);
        const traveler = makeBuild('TravelerElectro');
        team.setMember(1, traveler);
        const bennet = makeBuild('Bennet');
        team.setMember(2, bennet);
        const xingqiu = makeBuild('Xingqiu');
        team.setMember(3, xingqiu);
        team.setOnFieldMember(raiden);
        traveler.setCharSettings({});
        return {team, raiden, traveler, bennet};
    }

    function restoreOf(raiden) {
        return featureValues(raiden)['burst.baal_energy_recharge'][0];
    }

    function a4Of(raiden) {
        return finalStats(raiden).get('dmg_electro');
    }

    test('solo numbers: base 132% ER, no extra lane', () => {
        const {raiden} = raidenSetup();
        expect(extraEr(finalStats(raiden))).toBe(0);
        expect(premodEr(finalStats(raiden))).toBeCloseTo(1.32, 9);
        // 1 + 1.5 x 1.32; 0.4 x 0.32 (talent 10, ascension 6).
        expect(restoreOf(raiden)).toBeCloseTo(2.98, 9);
        expect(a4Of(raiden)).toBeCloseTo(0.128, 9);
    });

    test('the amulet raises total ER but moves neither part of Raiden A4', () => {
        const {raiden, traveler} = raidenSetup();
        const soloRestore = restoreOf(raiden);
        const soloA4 = a4Of(raiden);
        const premod = premodEr(finalStats(traveler));
        const before = finalStats(raiden).get('recharge');
        amuletOn(traveler, raiden);
        // KQM: the amulet ER is not factored in for Raiden A4 (nor Mona A4,
        // Emblem, Engulfing). The extra ER lands in the total only.
        expect(extraEr(finalStats(raiden))).toBeCloseTo(0.1 * premod + 0.2, 9);
        expect(finalStats(raiden).get('recharge') - before)
            .toBeCloseTo(0.1 * premod + 0.2, 9);
        expect(premodEr(finalStats(raiden))).toBeCloseTo(1.32, 9);
        expect(restoreOf(raiden)).toBeCloseTo(soloRestore, 9);
        expect(a4Of(raiden)).toBeCloseTo(soloA4, 9);
    });

    test('amulet plus Xiphos extra ER still move neither part', () => {
        const {raiden, traveler, bennet} = raidenSetup();
        withXiphos(bennet);
        const soloRestore = restoreOf(raiden);
        const soloA4 = a4Of(raiden);
        amuletOn(traveler, raiden);
        expect(extraEr(finalStats(raiden))).toBeGreaterThan(0.1 * 1 + 0.2);
        expect(premodEr(finalStats(raiden))).toBeCloseTo(1.32, 9);
        expect(restoreOf(raiden)).toBeCloseTo(soloRestore, 9);
        expect(a4Of(raiden)).toBeCloseTo(soloA4, 9);
    });
});
