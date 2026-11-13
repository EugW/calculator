import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, featureValues } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md: Xiphos Moonlight (Jinni's Whisper, self and party ER from
// the wielder's EM) keeps the default channels (no reads/writes params changed
// in src/js/db/Weapon/Sword/XiphosMoonlight.js).
//
// - Self buff: game data Weapon_Sword_Pleroma / UNIQUE_Sword_Pleroma_Handler
//   reads FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY (premod EM) into MasteryCache,
//   and Sword_Pleroma_Buff_Self writes Actor_ChargeEfficiencyExtraDelta
//   (extra ER) from MasteryCache x MasteryTransformRatio (R1-R5 0.036-0.072,
//   EquipAffixExcelConfigData id 111418, openConfig Weapon_Sword_Pleroma).
// - Party buff: game data Sword_Pleroma_Buff_Other writes
//   Actor_ChargeEfficiencyExtraDelta (extra ER) from MasteryCache x
//   MasteryTransformRatio x TeamInheritRatio (0.3, same affix entry); the read
//   is the same wielder premod EM.
// - KQM weapons evidence ("Xiphos and Raiden A4 Interactions"): its ER affects
//   neither part of Raiden's A4 nor Emblem's Burst DMG bonus (premod ER
//   readers). KQM Nahida evidence (summarized in md/buff_chains.md): Nahida
//   A1 extra EM does not feed Xiphos/Evenstar/Scarlet Sands (premod EM
//   readers).
// - GO (Sword/XiphosMoonlight): reads input.premod.eleMas, writes
//   total.enerRech_ (self) and teamBuff.total.enerRech_ (party).
// - Game text (data/raw/weapon_texts.txt, xiphos_moonlight): "0.036% Energy
//   Recharge for each point of Elemental Mastery they possess ... nearby party
//   members gaining 30% of this buff".
// - Display-only FeaturePostEffectValue entries read through the same
//   post-effects; the party display copy has no toggle because it is never
//   applied. The whisper_of_the_jinn toggle's text_percent is display text;
//   conditions write premod by construction.
//
// Game-formula constants used below (R1):
// - self ER = 0.036% per wielder premod EM = 0.00036 x EM (fraction);
// - party ER = 30% of that = 0.0108% per EM = 0.000108 x EM;
// - Sucrose A4 share = 20% of her premod EM (extra); Nahida A1 = 25% of the
//   highest premod EM, cap 250 (extra); Kazuha C2 = +200 flat EM (premod,
//   Actor_ElemMasteryDelta, team);
// - Alyosha A4 = 0.35 x total ER, cap 0.70 (total reader); Raiden restore =
//   1 + 1.5 x premod ER and A4 Electro = 0.4 x (premod ER - 1) (premod
//   readers, talent 10, ascension 6).
// Only the builds' live inputs (holder premod EM, readers' base ER) are read
// from the engine; every expected number is computed from those formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const SELF_RATE = 0.036 / 100;
const PARTY_RATE = 0.0108 / 100;

function premodEm(stats) {
    return totalMastery(stats) - (stats.get('mastery_extra') || 0);
}

function extraEm(stats) {
    return stats.get('mastery_extra') || 0;
}

function premodEr(stats) {
    return stats.get('recharge_base') + stats.get('recharge') - (stats.get('recharge_extra') || 0);
}

function extraEr(stats) {
    return stats.get('recharge_extra') || 0;
}

// Bennett (pyro, holder) + Kazuha (anemo) + Nahida (dendro) + Sucrose (anemo):
// no stat-giving resonance (double anemo is movement only). The holder is
// on-field so Nahida's A1 reaches him.
function setupRead() {
    const bennet = makeBuild('Bennet');
    bennet.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    bennet.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const kazuha = makeBuild('Kazuha');
    kazuha.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const nahida = makeBuild('Nahida');
    const sucrose = makeBuild('Sucrose');
    const team = Team.fromMember(bennet);
    team.setMember(1, kazuha);
    team.setMember(2, nahida);
    team.setMember(3, sucrose);
    team.setOnFieldMember(bennet);
    bennet.setWeaponSettings({});
    kazuha.setCharSettings({});
    nahida.setCharSettings({});
    sucrose.setCharSettings({});
    // Matched with every effect off, so these are premod values.
    matchCarrierTotals(bennet, {mastery_total: 500});
    matchCarrierTotals(kazuha, {mastery_total: 400});
    matchCarrierTotals(nahida, {mastery_total: 900});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    return {team, bennet, kazuha, nahida, sucrose};
}

// Bennett (pyro, holder) + Alyosha (electro, total ER reader) + Raiden
// (electro, premod ER reader) + Diona (cryo, filler): the double electro is
// particle resonance only, no ER stat, in the game and in our engine.
function setupWrite() {
    const bennet = makeBuild('Bennet');
    bennet.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    bennet.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const alyosha = makeBuild('Alyosha');
    const raiden = makeBuild('RaidenShogun');
    const diona = makeBuild('Diona');
    const team = Team.fromMember(bennet);
    team.setMember(1, alyosha);
    team.setMember(2, raiden);
    team.setMember(3, diona);
    team.setOnFieldMember(bennet);
    bennet.setWeaponSettings({});
    matchCarrierTotals(bennet, {mastery_total: 500});
    return {team, bennet, alyosha, raiden};
}

function holderPremodEm(bennet) {
    return premodEm(finalStats(bennet));
}

describe('Xiphos Moonlight reads premod EM', () => {
    test('solo numbers: 0.036% self and 30% of that for the party', () => {
        const {bennet, kazuha} = setupRead();
        expect(extraEr(finalStats(bennet))).toBe(0);
        expect(extraEr(finalStats(kazuha))).toBe(0);
        const premodBefore = premodEr(finalStats(bennet));
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        // No extra EM present: premod and total agree (500).
        expect(holderPremodEm(bennet)).toBeCloseTo(500, 6);
        expect(extraEm(finalStats(bennet))).toBe(0);
        expect(extraEr(finalStats(bennet))).toBeCloseTo(SELF_RATE * 500, 9);
        expect(extraEr(finalStats(kazuha))).toBeCloseTo(PARTY_RATE * 500, 9);
        // The premod ER lane does not move: the writes are extra.
        expect(premodEr(finalStats(bennet))).toBeCloseTo(premodBefore, 9);
    });

    test('counts Kazuha C2 premod EM on the holder', () => {
        const {bennet, kazuha} = setupRead();
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        const beforeSelf = extraEr(finalStats(bennet));
        const beforeParty = extraEr(finalStats(kazuha));
        expect(beforeSelf).toBeCloseTo(SELF_RATE * 500, 9);
        kazuha.setCharSettings({kaedehara_kazuha_yamaarashi_tailwind: true});
        // C2 writes Actor_ElemMasteryDelta (premod): +200 on the holder.
        expect(holderPremodEm(bennet)).toBeCloseTo(700, 6);
        expect(extraEm(finalStats(bennet))).toBe(0);
        expect(extraEr(finalStats(bennet))).toBeCloseTo(SELF_RATE * 700, 9);
        expect(extraEr(finalStats(kazuha))).toBeCloseTo(PARTY_RATE * 700, 9);
        expect(extraEr(finalStats(bennet)) - beforeSelf).toBeCloseTo(SELF_RATE * 200, 9);
        expect(extraEr(finalStats(kazuha)) - beforeParty).toBeCloseTo(PARTY_RATE * 200, 9);
    });

    test('ignores Sucrose A4 extra EM', () => {
        const {bennet, sucrose, kazuha} = setupRead();
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        const beforeSelf = extraEr(finalStats(bennet));
        const beforeParty = extraEr(finalStats(kazuha));
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        // 20% of Sucrose premod EM (600) = 120 extra EM on the holder.
        expect(totalMastery(finalStats(bennet))).toBeCloseTo(500 + 120, 6);
        expect(extraEm(finalStats(bennet))).toBeCloseTo(120, 6);
        expect(holderPremodEm(bennet)).toBeCloseTo(500, 6);
        // The premod-read shares stay.
        expect(extraEr(finalStats(bennet))).toBeCloseTo(beforeSelf, 9);
        expect(extraEr(finalStats(kazuha))).toBeCloseTo(beforeParty, 9);
    });

    test('ignores Nahida A1 extra EM', () => {
        const {bennet, nahida, kazuha} = setupRead();
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        const beforeSelf = extraEr(finalStats(bennet));
        const beforeParty = extraEr(finalStats(kazuha));
        nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
        // 25% of the highest premod EM (900) = 225, under the 250 cap.
        expect(totalMastery(finalStats(bennet))).toBeCloseTo(500 + 225, 6);
        expect(extraEm(finalStats(bennet))).toBeCloseTo(225, 6);
        expect(holderPremodEm(bennet)).toBeCloseTo(500, 6);
        expect(extraEr(finalStats(bennet))).toBeCloseTo(beforeSelf, 9);
        expect(extraEr(finalStats(kazuha))).toBeCloseTo(beforeParty, 9);
    });
});

describe('Xiphos Moonlight writes extra ER', () => {
    function alyoshaBonus(alyosha) {
        const stats = finalStats(alyosha);
        return [stats.get('dmg_skill'), stats.get('dmg_burst')];
    }

    function restoreOf(raiden) {
        return featureValues(raiden)['burst.baal_energy_recharge'][0];
    }

    function a4Of(raiden) {
        return finalStats(raiden).get('dmg_electro');
    }

    test('solo numbers: no extra ER anywhere', () => {
        const {alyosha, raiden} = setupWrite();
        expect(extraEr(finalStats(alyosha))).toBe(0);
        expect(extraEr(finalStats(raiden))).toBe(0);
        // Alyosha 100% + 26.67% ascension; Raiden 100% + 32% ascension.
        expect(premodEr(finalStats(alyosha))).toBeCloseTo(1 + 26.67 / 100, 9);
        expect(premodEr(finalStats(raiden))).toBeCloseTo(1.32, 9);
        const [skill, burst] = alyoshaBonus(alyosha);
        expect(skill).toBeCloseTo(0.35 * (1 + 26.67 / 100), 9);
        expect(burst).toBeCloseTo(0.35 * (1 + 26.67 / 100), 9);
        expect(restoreOf(raiden)).toBeCloseTo(2.98, 9);
        expect(a4Of(raiden)).toBeCloseTo(0.128, 9);
    });

    test('counts for Alyosha A4 (total ER reader)', () => {
        const {bennet, alyosha} = setupWrite();
        const [soloSkill, soloBurst] = alyoshaBonus(alyosha);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        const expectedExtra = PARTY_RATE * holderPremodEm(bennet);
        expect(holderPremodEm(bennet)).toBeCloseTo(500, 6);
        const stats = finalStats(alyosha);
        expect(extraEr(stats)).toBeCloseTo(expectedExtra, 9);
        expect(premodEr(stats)).toBeCloseTo(1 + 26.67 / 100, 9);
        // The extra ER lands in the total and the total-read A4 counts it.
        const [skill, burst] = alyoshaBonus(alyosha);
        expect(skill).toBeCloseTo(soloSkill + 0.35 * expectedExtra, 9);
        expect(burst).toBeCloseTo(soloBurst + 0.35 * expectedExtra, 9);
    });

    test('ignored by Raiden A4 (premod ER reader)', () => {
        const {bennet, raiden} = setupWrite();
        const soloRestore = restoreOf(raiden);
        const soloA4 = a4Of(raiden);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        const expectedExtra = PARTY_RATE * holderPremodEm(bennet);
        const stats = finalStats(raiden);
        expect(extraEr(stats)).toBeCloseTo(expectedExtra, 9);
        expect(premodEr(stats)).toBeCloseTo(1.32, 9);
        // KQM: Xiphos ER affects neither part of Raiden's A4.
        expect(stats.get('recharge_base') + stats.get('recharge')).toBeCloseTo(1.32 + expectedExtra, 9);
        expect(restoreOf(raiden)).toBeCloseTo(soloRestore, 9);
        expect(a4Of(raiden)).toBeCloseTo(soloA4, 9);
    });
});
