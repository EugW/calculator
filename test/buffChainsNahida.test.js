import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, featureValues, enemyChange } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Nahida): every effect keeps the
// default channels (no reads/writes params changed in src/js/db/Char/Nahida.js;
// A4 already declared reads: CHANNELS.TOTAL).
//
// - A1 Compassion Illuminated (25% of the party's highest EM, cap 250, to the
//   on-field member): default confirmed. Game data:
//   Avatar_Nahida_PermanentSkill_1 (Trigger_PermanentSkill_1) reads
//   FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY (premod); the burst gadget's
//   UNIQUE_Nahida_ElementalBurst_Hollow_PermanentSkill_MasterUp writes
//   Actor_ElemMasteryExtraDelta (extra). KQM: Key of Khaj-Nisut, Scarlet Sands,
//   Xiphos, Evenstar, Kazuha A4 and Sucrose A4 (extra EM) do not interact;
//   Gilded Dreams flat EM (premod) works. GO: tally.maxEleMas read,
//   teamBuff.total.eleMas write.
// - A4 Awakening Elucidated (0.1% skill DMG / 0.03% CRIT per EM over 200, caps
//   80% / 24%): reads TOTAL (declared). Game data:
//   Avatar_Nahida_PermanentSkill_2 computes EffMastery from
//   FIGHT_PROP_ELEMENT_MASTERY (total) via ModifyDamageMixin on Elemental_Art;
//   GO reads input.total.eleMas. KQM: Sucrose's A4 and her own A1 count.
// - Tri-Karma Purification and C6 Karmic Oblivion EM scalings: game damageExtra
//   ... * FIGHT_PROP_ELEMENT_MASTERY (total); hits read the total by
//   construction (scaling 'mastery*'), so extra EM counts with no params.
// - C4 Stem of Manifest Inference (flat EM 100/120/140/160): game writes
//   Actor_ElemMasteryDelta (no "Extra": premod); GO writes premod. Conditions
//   write premod: confirmed. The premod EM is counted by the premod reader A1.
// - C2 Root of All Fullness: flat reaction CRIT (ModifyBeHitDamageMixin, no stat
//   read) and an enemy DEF shred (Actor_DefenceRatio on the enemy, not a
//   channel): solo parity only.
// - Burst Pyro/Electro/Hydro bonuses: party element counts and talent values,
//   no stat read.
// - KQM has the EM-interaction tests quoted above; A1 also snapshots on cast
//   (rotation timing, not chaining; not tested here).
//
// The team below is dendro/anemo/cryo/geo (all different: no resonance in the
// game or in our engine) with no pyro/electro/hydro, so the burst elemental
// bonuses stay off and dmg_skill_nahida is the A4 bonus alone. A 4-member team
// is used throughout: a smaller team would get Elemental Resonance in our
// engine but not in the game (md/buff_chains.md).

const NAHIDA_A1 = {nahida_compassion_illuminated: true, nahida_illusory_heart: true};
const C4_STACKS = 'weapon.nahida_the_stem_of_manifest_inference';

// Nahida + Sucrose + Kaeya (Key of Khaj-Nisut) + Noelle. Kaeya holds the Key;
// its party EM is extra. Sucrose's A4 share is extra. Totals are matched with
// every effect off, so they are premod values.
function setup(nahidaConstellation = 0) {
    const nahida = makeBuild('Nahida');
    nahida.setCharLevels({level: 90, ascension: 6, constellation: nahidaConstellation});
    const sucrose = makeBuild('Sucrose');
    const kaeya = makeBuild('Kaeya');
    kaeya.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kaeya.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const noelle = makeBuild('Noelle');
    const team = Team.fromMember(nahida);
    team.setMember(1, sucrose);
    team.setMember(2, kaeya);
    team.setMember(3, noelle);
    team.setOnFieldMember(kaeya);
    nahida.setCharSettings({});
    sucrose.setCharSettings({});
    kaeya.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    matchCarrierTotals(nahida, {mastery_total: 500});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    matchCarrierTotals(kaeya, {mastery_total: 100});
    matchCarrierTotals(noelle, {mastery_total: 100});
    return {team, nahida, sucrose, kaeya, noelle};
}

// The A1 bonus on a member: its total over an off-field member that gets
// everything except A1 (the on-field-only share).
function a1On(member, offField) {
    return totalMastery(finalStats(member)) - totalMastery(finalStats(offField));
}

describe('Nahida A1 reads premod EM, writes extra EM', () => {
    test('solo numbers: 25% of the highest premod EM, capped at 250', () => {
        const {nahida, kaeya, noelle} = setup();
        nahida.setCharSettings(NAHIDA_A1);
        // Highest premod EM is Sucrose's 600: 25% = 150.
        expect(a1On(kaeya, noelle)).toBeCloseTo(150, 6);
        expect(totalMastery(finalStats(kaeya))).toBeCloseTo(100 + 150, 6);
    });

    test('caps at 250 when the highest premod EM is large', () => {
        const {team, nahida, sucrose, kaeya, noelle} = setup();
        team.setOnFieldMember(noelle);
        nahida.setCharSettings({});
        matchCarrierTotals(nahida, {mastery_total: 2000});
        matchCarrierTotals(sucrose, {mastery_total: 100});
        nahida.setCharSettings(NAHIDA_A1);
        // 25% of 2000 = 500, capped to 250.
        expect(a1On(noelle, kaeya)).toBeCloseTo(250, 6);
    });

    test('ignores the Key extra EM on every member', () => {
        const {team, nahida, sucrose, kaeya, noelle} = setup();
        team.setOnFieldMember(noelle);
        nahida.setCharSettings(NAHIDA_A1);
        // Noelle (on-field): 100 + 150 A1; Sucrose (off-field): 600, no A1.
        expect(totalMastery(finalStats(noelle)) - totalMastery(finalStats(sucrose))).toBeCloseTo(-350, 6);
        // The Key's party EM is extra: it raises totals but must not move the
        // premod-read A1. Kaeya additionally gains his holder share, so the
        // party share is read off Sucrose.
        kaeya.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        const partyShare = totalMastery(finalStats(sucrose)) - 600;
        expect(partyShare).toBeGreaterThan(1);
        expect(totalMastery(finalStats(noelle))).toBeCloseTo(100 + 150 + partyShare, 6);
        expect(totalMastery(finalStats(noelle)) - totalMastery(finalStats(sucrose))).toBeCloseTo(-350, 6);
    });

    test('ignores Sucrose A4 extra EM', () => {
        const {nahida, sucrose, kaeya, noelle} = setup();
        nahida.setCharSettings(NAHIDA_A1);
        expect(a1On(kaeya, noelle)).toBeCloseTo(150, 6);
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        // 20% of Sucrose premod EM (600) = 120 extra on everyone; the A1 share
        // stays 25% of the premod max (600).
        expect(totalMastery(finalStats(noelle))).toBeCloseTo(100 + 120, 6);
        expect(totalMastery(finalStats(kaeya))).toBeCloseTo(100 + 150 + 120, 6);
        expect(a1On(kaeya, noelle)).toBeCloseTo(150, 6);
    });

    test('counts C4 premod EM on Nahida', () => {
        const {nahida, kaeya, noelle} = setup(4);
        nahida.setCharSettings(NAHIDA_A1);
        // Nahida's own premod EM (500) is not the max: Sucrose has 600.
        expect(a1On(kaeya, noelle)).toBeCloseTo(150, 6);
        // C4 writes premod EM (game: Actor_ElemMasteryDelta): +160 moves the
        // premod max to 660, so A1 grows by 40. Nahida herself is off-field
        // and gets no A1: 500 + 160.
        nahida.setCharSettings(Object.assign({}, NAHIDA_A1, {[C4_STACKS]: 4}));
        expect(totalMastery(finalStats(nahida))).toBeCloseTo(660, 6);
        expect(a1On(kaeya, noelle)).toBeCloseTo(165, 6);
    });
});

describe('Nahida A4 reads total EM', () => {
    test('solo numbers: 0.1% DMG and 0.03% CRIT per EM over 200, capped', () => {
        const {nahida} = setup();
        // No extra EM present: premod and total agree (500 - 200 = 300).
        expect(totalMastery(finalStats(nahida))).toBeCloseTo(500, 6);
        expect(finalStats(nahida).get('dmg_skill_nahida')).toBeCloseTo(0.3, 9);
        expect(finalStats(nahida).get('crit_rate_nahida')).toBeCloseTo(0.09, 9);
    });

    test('caps at 80% DMG and 24% CRIT', () => {
        const {nahida} = setup();
        matchCarrierTotals(nahida, {mastery_total: 1200});
        expect(totalMastery(finalStats(nahida))).toBeCloseTo(1200, 6);
        // 0.1% of 1000 = 100% capped to 80%; 0.03% of 1000 = 30% capped to 24%.
        expect(finalStats(nahida).get('dmg_skill_nahida')).toBeCloseTo(0.8, 9);
        expect(finalStats(nahida).get('crit_rate_nahida')).toBeCloseTo(0.24, 9);
    });

    test('counts her own A1 extra EM (KQM: A4 takes account of A1)', () => {
        const {team, nahida} = setup();
        team.setOnFieldMember(nahida);
        // A1 off: 0.1% / 0.03% of (500 - 200).
        expect(finalStats(nahida).get('dmg_skill_nahida')).toBeCloseTo(0.3, 9);
        nahida.setCharSettings(NAHIDA_A1);
        // On-field Nahida gains 25% of the premod max (Sucrose 600) = 150 extra;
        // the total read counts it: 0.1% / 0.03% of (650 - 200).
        expect(totalMastery(finalStats(nahida))).toBeCloseTo(650, 6);
        expect(finalStats(nahida).get('dmg_skill_nahida')).toBeCloseTo(0.45, 9);
        expect(finalStats(nahida).get('crit_rate_nahida')).toBeCloseTo(0.135, 9);
    });

    test('counts Sucrose A4 extra EM', () => {
        const {nahida, sucrose} = setup();
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        // 500 + 120 extra = 620 total: 0.1% / 0.03% of (620 - 200).
        expect(totalMastery(finalStats(nahida))).toBeCloseTo(620, 6);
        expect(finalStats(nahida).get('dmg_skill_nahida')).toBeCloseTo(0.42, 9);
        expect(finalStats(nahida).get('crit_rate_nahida')).toBeCloseTo(0.126, 9);
    });

    test('counts the Key party extra EM', () => {
        const {nahida, kaeya, noelle} = setup();
        matchCarrierTotals(nahida, {mastery_total: 400});
        kaeya.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        // The party share is extra; the total read counts it. Its size is read
        // off an off-field member that gets nothing else.
        const partyShare = totalMastery(finalStats(noelle)) - 100;
        expect(partyShare).toBeGreaterThan(1);
        expect(totalMastery(finalStats(nahida))).toBeCloseTo(400 + partyShare, 6);
        expect(finalStats(nahida).get('dmg_skill_nahida'))
            .toBeCloseTo(0.001 * (400 + partyShare - 200), 9);
        expect(finalStats(nahida).get('crit_rate_nahida'))
            .toBeCloseTo(0.0003 * (400 + partyShare - 200), 9);
    });

    test('extra EM is indistinguishable from premod EM', () => {
        const first = setup();
        first.sucrose.setCharSettings({sucrose_mollis_favonius: true});
        const withExtra = [
            finalStats(first.nahida).get('dmg_skill_nahida'),
            finalStats(first.nahida).get('crit_rate_nahida'),
        ];

        const second = setup();
        second.nahida.setCharSettings({});
        matchCarrierTotals(second.nahida, {mastery_total: 500 + 120});
        const withPremod = [
            finalStats(second.nahida).get('dmg_skill_nahida'),
            finalStats(second.nahida).get('crit_rate_nahida'),
        ];

        expect(withExtra[0]).toBeCloseTo(0.42, 9);
        expect(withExtra).toEqual(withPremod);
    });
});

describe('Nahida Tri-Karma and C6 hits read total EM', () => {
    function triKarmaAvg(nahida) {
        return featureValues(nahida)['skill.nahida_trikarma_purification_dmg'][2];
    }

    test('Tri-Karma counts extra EM like premod EM', () => {
        const first = setup();
        const withoutExtra = triKarmaAvg(first.nahida);
        first.sucrose.setCharSettings({sucrose_mollis_favonius: true});
        const withExtra = triKarmaAvg(first.nahida);

        const second = setup();
        second.nahida.setCharSettings({});
        matchCarrierTotals(second.nahida, {mastery_total: 500 + 120});
        const withPremod = triKarmaAvg(second.nahida);

        // Game data: damageExtra Chain_Damage_PerMastery * FIGHT_PROP_ELEMENT_MASTERY.
        expect(withExtra).toBeGreaterThan(withoutExtra);
        expect(withExtra).toBeCloseTo(withPremod, 6);
    });

    test('C6 Karmic Oblivion counts extra EM like premod EM', () => {
        const first = setup(6);
        const withoutExtra = featureValues(first.nahida)['skill.nahida_trikarma_purification_karmic_dmg'][2];
        first.sucrose.setCharSettings({sucrose_mollis_favonius: true});
        const withExtra = featureValues(first.nahida)['skill.nahida_trikarma_purification_karmic_dmg'][2];

        const second = setup(6);
        second.nahida.setCharSettings({});
        matchCarrierTotals(second.nahida, {mastery_total: 500 + 120});
        const withPremod = featureValues(second.nahida)['skill.nahida_trikarma_purification_karmic_dmg'][2];

        // Game data: damageExtra Constellation_6_Dmg_PerMastery * FIGHT_PROP_ELEMENT_MASTERY.
        expect(withExtra).toBeGreaterThan(withoutExtra);
        expect(withExtra).toBeCloseTo(withPremod, 6);
    });
});

describe('Nahida C2 is flat (solo parity)', () => {
    test('reaction CRIT is static at C2; the DEF shred is a toggle', () => {
        const {nahida} = setup(2);
        // Game text: 20% CRIT / 100% DMG (Bloom/Burning), 10% / 20% (Lunar-Bloom).
        // The CRIT half is a static team effect at C2 (no toggle, no stat read).
        expect(finalStats(nahida).get('crit_rate_bloom')).toBeCloseTo(0.2, 9);
        expect(finalStats(nahida).get('crit_dmg_bloom')).toBeCloseTo(1, 9);
        expect(finalStats(nahida).get('crit_rate_lunarbloom')).toBeCloseTo(0.1, 9);
        expect(finalStats(nahida).get('crit_dmg_lunarbloom')).toBeCloseTo(0.2, 9);
        // The DEF shred (an enemy debuff, not a channel) needs its toggle.
        expect(enemyChange(nahida, 'enemy_def_reduce')).toBeCloseTo(0, 9);
        nahida.setCharSettings({nahida_the_root_of_all_fullness: true});
        expect(enemyChange(nahida, 'enemy_def_reduce')).toBeCloseTo(0.3, 9);
    });
});
