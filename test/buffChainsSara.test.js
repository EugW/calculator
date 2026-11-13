import { setControlsOff } from '../src/js/classes/ArtifactSetProfile';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeSetArtifacts } from './support/baseline';
import { finalStats, makeBuild, totalMastery, featureValues } from './support/team';

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Sara):
// - Skill ATK buff (Tengu Juurai) reads Sara's base ATK and writes extra
//   ATK: the game (Avatar_Sara_AttackUp / UNIQUE_Sara_AttackUp) writes
//   Actor_AttackExtraDelta from FIGHT_PROP_BASE_ATTACK. A base read can
//   never chain; the extra write is invisible to premod ATK readers
//   (Flins A4) but counted by total readers and damage hits. GO reads
//   input.base.atk into teamBuff.total.atk. The default channels are
//   confirmed, locked in here.
// - A4 Decorum energy reads premod (non-extra) ER: the game
//   (Avatar_Sara_PermanentSkill_2 / Sara_PermanentSkill_2_ReviveEnergy,
//   ReviveElemEnergy) scales on FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY.
//   KQM's pre-A4 Electro Traveler amulet test says the amulet ER does not
//   affect it; GO reads input.total.enerRech_, contradicted by the game
//   data. The default (premod) is confirmed, locked in here.
// - C6 Sin of Pride is a flat +60% Electro CRIT DMG (game:
//   UNIQUE_Sara_Constellation_6_CriticalHurt, ModifyDamageMixin
//   bonusCriticalHurt, no stat read); flat conditions are always premod.
// - C2 Dark Wings is 30% of a damage hit (reads the total, needs nothing);
//   A1/C1/C3/C4/C5 read no stat.
//
// Game-formula constants used below (level 90, ascension 6, talents 10):
// - skill ATK bonus ratio 77.328% (CharTalentTables Sara s2.p2, level 10)
//   of Sara's base ATK;
// - Decorum energy = 1.2 per 100% of premod ER;
// - Flins A4: 8% of premod ATK into EM (capped at 160), the premod reader
//   that must ignore Sara's extra ATK;
// - Xiphos Moonlight R1 party: 30% of 0.036% per wielder EM = 0.0108% per
//   EM, written extra (default channels, matching the game);
// - Emblem of Severed Fate 2pc: +20% ER, a plain set bonus (premod; the
//   only extra-ER writers in the game are Xiphos and the Traveler amulet).
// Only the builds' base inputs (Sara base ATK and premod ER, carrier
// premod EM) are read from the engine; every expected number is computed
// from those formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const SKILL_ATK_RATIO = 77.328 / 100;
const DECORUM_PER_ER = 1.2;

function setupEnergy() {
    const sara = makeBuild('Sara');
    const bennet = makeBuild('Bennet');
    bennet.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    bennet.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const xingqiu = makeBuild('Xingqiu');
    const diona = makeBuild('Diona');
    const team = Team.fromMember(sara);
    team.setMember(1, bennet);
    team.setMember(2, xingqiu);
    team.setMember(3, diona);
    team.setOnFieldMember(sara);
    return {sara, bennet};
}

function setupBuff() {
    const sara = makeBuild('Sara');
    const flins = makeBuild('Flins');
    const xingqiu = makeBuild('Xingqiu');
    const diona = makeBuild('Diona');
    const team = Team.fromMember(sara);
    team.setMember(1, flins);
    team.setMember(2, xingqiu);
    team.setMember(3, diona);
    team.setOnFieldMember(flins);
    return {sara, flins};
}

function withEmblem(sara) {
    sara.replaceArtifacts(makeSetArtifacts('EmblemofSeveredFate').slice(0, 2));
    sara.setArtifactsSettings(setControlsOff('EmblemofSeveredFate'));
}

function premodEr(stats) {
    return stats.get('recharge_base') + stats.get('recharge') - (stats.get('recharge_extra') || 0);
}

function extraEr(stats) {
    return stats.get('recharge_extra') || 0;
}

function decorumOf(sara) {
    return featureValues(sara)['skill.sara_decorum'][0];
}

function atkBonusOf(sara) {
    return featureValues(sara)['skill.sara_atk_bonus'][0];
}

function bennetPremodEm(bennet) {
    const stats = finalStats(bennet);
    return totalMastery(stats) - (stats.get('mastery_extra') || 0);
}

function totalAtkOf(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

describe('Sara A4 Decorum reads premod ER', () => {
    test('solo numbers: 1.2 energy per 100% premod ER, no extra lane', () => {
        const {sara} = setupEnergy();
        const stats = finalStats(sara);
        expect(extraEr(stats)).toBe(0);
        // 1.2 x premod ER (100% base plus the default bow, if any).
        expect(decorumOf(sara)).toBeCloseTo(DECORUM_PER_ER * premodEr(stats), 9);
    });

    test('counts premod ER: Emblem 2pc moves the energy', () => {
        const {sara} = setupEnergy();
        const soloPremod = premodEr(finalStats(sara));
        const solo = decorumOf(sara);
        withEmblem(sara);
        const stats = finalStats(sara);
        // Still no extra ER anywhere: a set bonus is premod.
        expect(extraEr(stats)).toBe(0);
        expect(premodEr(stats)).toBeCloseTo(soloPremod + 0.2, 9);
        // +0.2 ER: +0.24 energy.
        expect(decorumOf(sara)).toBeCloseTo(solo + DECORUM_PER_ER * 0.2, 9);
    });

    test('ignores extra ER: Xiphos party ER moves nothing', () => {
        const {sara, bennet} = setupEnergy();
        const solo = decorumOf(sara);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        // The carrier's premod EM is the buff's input (Xiphos reads
        // non-extra EM in the game); the 0.0108 R1 party rate is the game
        // formula.
        const expectedExtra = 0.0108 * bennetPremodEm(bennet) / 100;

        const stats = finalStats(sara);
        expect(extraEr(stats)).toBeCloseTo(expectedExtra, 9);
        // The extra ER lands in the total but the energy stays.
        expect(decorumOf(sara)).toBeCloseTo(solo, 9);
    });

    test('extra and premod together: only the premod part counts', () => {
        const {sara, bennet} = setupEnergy();
        withEmblem(sara);
        const soloPremod = premodEr(finalStats(sara));
        const solo = decorumOf(sara);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        const expectedExtra = 0.0108 * bennetPremodEm(bennet) / 100;

        const stats = finalStats(sara);
        expect(extraEr(stats)).toBeCloseTo(expectedExtra, 9);
        expect(premodEr(stats)).toBeCloseTo(soloPremod, 9);
        expect(decorumOf(sara)).toBeCloseTo(solo, 9);
    });
});

describe('Sara skill ATK buff reads base ATK, writes extra ATK', () => {
    test('solo formula: 77.328% of base ATK', () => {
        const {sara} = setupBuff();
        const base = finalStats(sara).get('atk_base');
        const atkBefore = totalAtkOf(finalStats(sara));
        sara.setCharSettings({sara_tengu_juurai: true});
        // The displayed bonus and the receiver's total ATK gain agree.
        expect(atkBonusOf(sara)).toBeCloseTo(base * SKILL_ATK_RATIO, 9);
        expect(totalAtkOf(finalStats(sara)) - atkBefore).toBeCloseTo(base * SKILL_ATK_RATIO, 9);
    });

    test('ignored by premod readers: Flins A4 EM stays, total ATK rises', () => {
        const {sara, flins} = setupBuff();
        const expected = finalStats(sara).get('atk_base') * SKILL_ATK_RATIO;
        const atkBefore = totalAtkOf(finalStats(flins));
        const emBefore = totalMastery(finalStats(flins));
        sara.setCharSettings({sara_tengu_juurai: true});
        // Extra ATK lands in the total...
        expect(totalAtkOf(finalStats(flins)) - atkBefore).toBeCloseTo(expected, 6);
        // ...but Flins A4 reads premod ATK, so his EM does not move.
        expect(totalMastery(finalStats(flins)) - emBefore).toBeCloseTo(0, 8);
    });

    test('counted by total readers: Flins skill damage rises', () => {
        const {sara, flins} = setupBuff();
        const before = featureValues(flins)['skill.flins_northland_spearstorm_dmg'][0];
        sara.setCharSettings({sara_tengu_juurai: true});
        // Damage hits read the total, so the extra ATK counts.
        expect(featureValues(flins)['skill.flins_northland_spearstorm_dmg'][0]).toBeGreaterThan(before);
    });
});

describe('Sara C6 is a flat Electro CRIT DMG buff', () => {
    test('buffed teammates gain 60% Electro CRIT DMG', () => {
        const sara = makeBuild('Sara');
        sara.setCharLevels({level: 90, ascension: 6, constellation: 6});
        const flins = makeBuild('Flins');
        const xingqiu = makeBuild('Xingqiu');
        const diona = makeBuild('Diona');
        const team = Team.fromMember(sara);
        team.setMember(1, flins);
        team.setMember(2, xingqiu);
        team.setMember(3, diona);
        team.setOnFieldMember(flins);
        const before = finalStats(flins).get('crit_dmg_electro');
        sara.setCharSettings({sara_tengu_juurai: true});
        expect(finalStats(flins).get('crit_dmg_electro') - before).toBeCloseTo(0.6, 9);
    });
});
