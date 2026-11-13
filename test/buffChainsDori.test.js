import { setControlsOff } from '../src/js/classes/ArtifactSetProfile';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeSetArtifacts } from './support/baseline';
import { finalStats, makeBuild, totalMastery, featureValues } from './support/team';

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Dori):
// - A4 Compound Interest (skill energy = 5 per 100% ER, cap 15) reads total
//   ER: the game (Avatar_Dori_ElementalArt / ElementalArt_Bullet_Ball,
//   AddGlobalValue _ABILITY_Dori_ElementalArt_ReviveEnergy from
//   FIGHT_PROP_CHARGE_EFFICIENCY, gated by Dori_PermanentSkill_2 =
//   ProudSkill paramList [5, 15]) scales on the final ER. Same pattern as
//   Alyosha's A4, opposite to Sara's Decorum and Raiden's restore (both
//   FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY, premod). GO reads
//   input.total.enerRech_; KQM notes only that every point of ER counts,
//   with no chain test. Declared reads: CHANNELS.TOTAL, locked in here: the
//   extra ER of Xiphos' party share restores more energy.
// - Burst heal_dot scales on Max HP (abilitySpecials HealHP params), C6
//   Sprinkling Weight heals 4% of Max HP (Constellation_6
//   HealHP_OnHittingOthers, talent paramList 0.04): heals read the total and
//   need nothing; no ability writes extra HP. Defaults confirmed, locked in
//   here as solo parity.
// - C4 Discretionary Supplement is flat +50% healing_recv / +30% ER (game:
//   Dori_Constellation_4_Buff_HealedAddUp/_ChargeEfficiencyUp write
//   Actor_HealedAddDelta / Actor_ChargeEfficiencyDelta, no "Extra": premod).
//   Conditions are always premod: default confirmed, locked in here.
// - C2 Special Franchise is 50% of ATK (talent paramList 0.5): a damage hit
//   reads the total and needs nothing. A1 and plain hits read no stat.
//
// Game-formula constants used below (level 90, ascension 6, talents 10):
// - A4 energy = 5 x total ER, capped at 15 (ProudSkill Dori_PermanentSkill_2
//   paramList [5, 15]);
// - Xiphos Moonlight R1 party: 30% of 0.036% per wielder EM = 0.0108% per
//   EM, written extra (default channels, matching the game);
// - Emblem of Severed Fate 2pc: +20% ER, a plain set bonus (premod; the
//   only extra-ER writers in the game are Xiphos and the Traveler amulet);
// - burst heal_dot level 10: 12.006% of Max HP + 1412.4622 (CharTalentTables
//   Dori s3.p2/p3, index 9), C6 heal exactly 4% of Max HP.
// Only the builds' base inputs (Dori premod/total ER and HP, carrier premod
// EM) are read from the engine; every expected number is computed from
// those formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const COMPOUND_PER_ER = 5;
const COMPOUND_CAP = 15;
const HEAL_DOT_RATIO = 12.006 / 100;
const HEAL_DOT_FLAT = 1412.4622;
const C6_HEAL_RATIO = 4 / 100;

function setup() {
    const dori = makeBuild('Dori');
    const bennet = makeBuild('Bennet');
    bennet.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    bennet.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const raiden = makeBuild('RaidenShogun');
    const xingqiu = makeBuild('Xingqiu');
    const team = Team.fromMember(dori);
    team.setMember(1, bennet);
    team.setMember(2, raiden);
    team.setMember(3, xingqiu);
    team.setOnFieldMember(dori);
    return {dori, bennet, raiden, xingqiu};
}

function withEmblem(dori) {
    dori.replaceArtifacts(makeSetArtifacts('EmblemofSeveredFate').slice(0, 2));
    dori.setArtifactsSettings(setControlsOff('EmblemofSeveredFate'));
}

function premodEr(stats) {
    return stats.get('recharge_base') + stats.get('recharge') - (stats.get('recharge_extra') || 0);
}

function extraEr(stats) {
    return stats.get('recharge_extra') || 0;
}

function totalEr(stats) {
    return stats.get('recharge_base') + stats.get('recharge');
}

function compoundOf(dori) {
    return featureValues(dori)['skill.dori_compound_interest'][0];
}

function totalHpOf(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function bennetPremodEm(bennet) {
    const stats = finalStats(bennet);
    return totalMastery(stats) - (stats.get('mastery_extra') || 0);
}

describe('Dori A4 Compound Interest reads total ER', () => {
    test('solo numbers: 5 energy per 100% ER, no extra lane', () => {
        const {dori} = setup();
        const stats = finalStats(dori);
        expect(extraEr(stats)).toBe(0);
        // 100% base ER; Dori's ascension stat is HP%, her default claymore
        // grants no ER.
        expect(premodEr(stats)).toBeCloseTo(1, 9);
        expect(compoundOf(dori)).toBeCloseTo(Math.min(COMPOUND_PER_ER * totalEr(stats), COMPOUND_CAP), 9);
        expect(compoundOf(dori)).toBeCloseTo(5, 9);
    });

    test('counts premod ER: Emblem 2pc moves the energy', () => {
        const {dori} = setup();
        const solo = compoundOf(dori);
        withEmblem(dori);
        const stats = finalStats(dori);
        // Still no extra ER anywhere: a set bonus is premod.
        expect(extraEr(stats)).toBe(0);
        expect(premodEr(stats)).toBeCloseTo(1 + 0.2, 9);
        // +0.2 ER: +1.0 energy.
        expect(compoundOf(dori)).toBeCloseTo(solo + COMPOUND_PER_ER * 0.2, 9);
    });

    test('counts extra ER: Xiphos party ER moves the energy', () => {
        const {dori, bennet} = setup();
        const solo = compoundOf(dori);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        // The carrier's premod EM is the buff's input (Xiphos reads
        // non-extra EM in the game); the 0.0108 R1 party rate is the game
        // formula.
        const expectedExtra = 0.0108 * bennetPremodEm(bennet) / 100;

        const stats = finalStats(dori);
        expect(extraEr(stats)).toBeCloseTo(expectedExtra, 9);
        expect(premodEr(stats)).toBeCloseTo(1, 9);
        // The extra ER lands in the total and the A4 counts it: the changed
        // behaviour (a premod read would stay at the solo value, as Sara's
        // Decorum does in test/buffChainsSara.test.js).
        expect(compoundOf(dori)).toBeCloseTo(solo + COMPOUND_PER_ER * expectedExtra, 9);
    });

    test('extra and premod together: both parts count', () => {
        const {dori, bennet} = setup();
        withEmblem(dori);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        const expectedExtra = 0.0108 * bennetPremodEm(bennet) / 100;

        const stats = finalStats(dori);
        expect(extraEr(stats)).toBeCloseTo(expectedExtra, 9);
        expect(premodEr(stats)).toBeCloseTo(1 + 0.2, 9);
        expect(compoundOf(dori)).toBeCloseTo(COMPOUND_PER_ER * (1 + 0.2 + expectedExtra), 9);
    });

    test('still caps at 15 when total ER pushes past 300%', () => {
        const {dori} = setup();
        // A flat custom buff is a condition: premod ER (percent-points,
        // like the stat tables: 100 = +100% ER).
        dori.modifyBuffsSettings({'custom_buffs.recharge': 250});
        const stats = finalStats(dori);
        expect(extraEr(stats)).toBe(0);
        expect(premodEr(stats)).toBeCloseTo(1 + 2.5, 9);
        // 5 x 3.5 = 17.5, capped to 15.
        expect(compoundOf(dori)).toBeCloseTo(COMPOUND_CAP, 9);
    });

    test('contrast: Raiden A4 (premod) ignores Xiphos party ER', () => {
        const {dori, bennet, raiden} = setup();
        const doriBefore = compoundOf(dori);
        const raidenBefore = finalStats(raiden).get('dmg_electro');
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        // Raiden gains the same extra ER lane...
        expect(extraEr(finalStats(raiden))).toBeCloseTo(0.0108 * bennetPremodEm(bennet) / 100, 9);
        // ...but her premod-read A4 stays, while Dori's total-read A4 moves.
        expect(finalStats(raiden).get('dmg_electro')).toBeCloseTo(raidenBefore, 9);
        expect(compoundOf(dori)).toBeGreaterThan(doriBefore);
    });
});

describe('Dori unchanged effects: solo parity', () => {
    test('burst heal_dot: 12.006% of Max HP + 1412.4622', () => {
        const {dori} = setup();
        const stats = finalStats(dori);
        expect(featureValues(dori)['burst.heal_dot'][0]).toBeCloseTo(
            HEAL_DOT_RATIO * totalHpOf(stats) + HEAL_DOT_FLAT, 6);
    });

    test('C6 heal is exactly 4% of total Max HP', () => {
        const {dori} = setup();
        dori.setCharLevels({level: 90, ascension: 6, constellation: 6});
        const stats = finalStats(dori);
        expect(featureValues(dori)['skill.dori_sprinkling_weight'][0]).toBeCloseTo(
            C6_HEAL_RATIO * totalHpOf(stats), 6);
    });

    test('C4 toggles give exactly +50% healing_recv and +30% ER', () => {
        const {dori, xingqiu} = setup();
        dori.setCharLevels({level: 90, ascension: 6, constellation: 4});
        const recvBefore = finalStats(xingqiu).get('healing_recv');
        const rechargeBefore = totalEr(finalStats(xingqiu));
        dori.setCharSettings({
            dori_discretionary_supplement_1: true,
            dori_discretionary_supplement_2: true,
        });
        // Flat condition buffs: exact game-text values (talent paramList
        // [0.5, 0.3]), premod as the game writes them (no "Extra").
        expect(finalStats(xingqiu).get('healing_recv') - recvBefore).toBeCloseTo(0.5, 9);
        expect(totalEr(finalStats(xingqiu)) - rechargeBefore).toBeCloseTo(0.3, 9);
    });
});
