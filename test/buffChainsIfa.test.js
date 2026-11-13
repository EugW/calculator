import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { featureValues, finalStats, makeBuild, makeSolo, totalMastery } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Ifa): every effect keeps the default
// channels (no reads/writes params in src/js/db/Char/Ifa.js).
//
// - A1 Field Medic's Vision (Rescue Essentials raise nearby members' Swirl,
//   Electro-Charged, Lunar-Charged and Stellar Swirl DMG): scales on the
//   counter, not on any stat. Game data: Avatar_Ifa_PermanentSkill_1,
//   UNIQUE_Ifa_PermanentSkill_1_Handler_Buff writes
//   Actor_ElemReactSwirl*Delta / Actor_ElemReactElectricDelta as CharmerCount x
//   Permanent_1_ElemReactDelta, Actor_ElemReactMoonShockDelta as CharmerCount x
//   0.002, Actor_ElemReactStarSwirl*Delta as CharmerCount x
//   Permanent_1_ElemReactDelta_Star, with no FIGHT_PROP read (ProudSkill
//   1132101: 150 max, 0.015 swirl/Electro-Charged, 0.0024 Stellar Swirl). GO
//   multiplies the Essentials count by the same per-point factors. KQM has no
//   EM-interaction test for Ifa. Reaction bonuses have no extra lane: extra EM
//   anywhere must not move the bonus.
// - A4 Mutual Aid Agreement (+80 EM on Nightsoul Bursts): the game
//   (Avatar_Ifa_PermanentSkill_2, ProudSkill 11322) writes
//   Actor_ElemMasteryDelta (no "Extra": premod). GO writes premod. Conditions
//   write premod: default confirmed. The premod EM is counted by premod
//   readers (Nahida's A1).
// - C4 Decayed Vessel's Permutation (+100 EM after the burst): the game
//   (Avatar_Ifa_Talent_4) writes Actor_ElemMasteryDelta (premod). Same as A4.
// - Skill Tonicshot heal: the game (Avatar_Ifa_HoverAttack_Heal) caches
//   GetFightProperty FIGHT_PROP_ELEMENT_MASTERY (total) and heals
//   MasteryCache x ratio + flat. scaling 'mastery*' already reads the total,
//   so extra EM counts with no params (skill 10: 36.288% EM + 105.9347).
// - C6 Oath on a Feathered Knot (120% ATK hit; GO reads input.total.atk) and
//   every other damage hit read the total and need nothing.
// - C1 (flat 6 Energy, Avatar_Ifa_DropBall Talent_1_EnergyRecover) and C2
//   (extra Rescue Essentials per Nightsoul point over 60, Talent_2_NyxCVR /
//   NyxLimit global values) read no stat.
// - No Moonsign Benediction (SetNewElementReactionBaseDamageRatioParam): the
//   Lunar-Charged and Stellar Swirl entries above are flat per-point bonuses.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const NIGHTSOUL = 'common.nightsoul_blessing_state';
const ifaA1 = (points) => ({[NIGHTSOUL]: true, ifa_field_medics_vision: points});
const SUCROSE_A4 = {sucrose_mollis_favonius: true};
const NAHIDA_A1 = {nahida_compassion_illuminated: true, nahida_illusory_heart: true};

// Game formula: 1.5% Swirl / Electro-Charged, 0.2% Lunar-Charged, 0.24%
// Stellar Swirl per Rescue Essentials point.
function reactionBonuses(stats) {
    return {
        swirl: stats.get('dmg_reaction_swirl'),
        electrocharged: stats.get('dmg_reaction_electrocharged'),
        lunar: stats.get('dmg_reaction_lunarcharged'),
        stellar: stats.get('dmg_stellarswirl'),
    };
}

function expectBonuses(stats, points) {
    const got = reactionBonuses(stats);
    expect(got.swirl).toBeCloseTo(0.015 * points, 8);
    expect(got.electrocharged).toBeCloseTo(0.015 * points, 8);
    expect(got.lunar).toBeCloseTo(0.002 * points, 8);
    expect(got.stellar).toBeCloseTo(0.0024 * points, 8);
}

// Ifa + Sucrose + Kaeya + Noelle (anemo/anemo/cryo/geo: Anemo Resonance
// touches no measured stat). Totals matched with every effect off, so they
// are premod values.
function counterTeam() {
    const ifa = makeBuild('Ifa');
    const sucrose = makeBuild('Sucrose');
    const kaeya = makeBuild('Kaeya');
    const noelle = makeBuild('Noelle');
    const team = Team.fromMember(noelle);
    team.setMember(1, ifa);
    team.setMember(2, sucrose);
    team.setMember(3, kaeya);
    team.setOnFieldMember(noelle);
    ifa.setCharSettings({});
    sucrose.setCharSettings({});
    matchCarrierTotals(ifa, {mastery_total: 400});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    matchCarrierTotals(kaeya, {mastery_total: 100});
    matchCarrierTotals(noelle, {mastery_total: 100});
    return {team, ifa, sucrose, kaeya, noelle};
}

// Nahida + Ifa + Kaeya + Noelle (dendro/anemo/cryo/geo: no resonance).
// Ifa holds the highest premod EM, so Nahida's A1 reads it.
function premodTeam() {
    const nahida = makeBuild('Nahida');
    const ifa = makeBuild('Ifa');
    const kaeya = makeBuild('Kaeya');
    const noelle = makeBuild('Noelle');
    const team = Team.fromMember(nahida);
    team.setMember(1, ifa);
    team.setMember(2, kaeya);
    team.setMember(3, noelle);
    team.setOnFieldMember(noelle);
    nahida.setCharSettings({});
    ifa.setCharSettings({});
    matchCarrierTotals(nahida, {mastery_total: 500});
    matchCarrierTotals(ifa, {mastery_total: 800});
    matchCarrierTotals(kaeya, {mastery_total: 100});
    matchCarrierTotals(noelle, {mastery_total: 100});
    return {team, nahida, ifa, kaeya, noelle};
}

// Nahida's A1 bonus on the on-field member, isolated from every other team EM
// buff by differencing against an off-field member (both get the same shares).
function a1On(noelle, kaeya) {
    return totalMastery(finalStats(noelle)) - totalMastery(finalStats(kaeya));
}

describe('Ifa A1 scales on the counter only', () => {
    test('100 points: game-formula bonuses on a teammate', () => {
        const {ifa, noelle} = counterTeam();
        ifa.setCharSettings(ifaA1(100));
        expectBonuses(finalStats(noelle), 100);
        expectBonuses(finalStats(ifa), 100);
    });

    test('extra EM (Sucrose A4) and Ifa A4 self EM do not move it', () => {
        const {ifa, sucrose, noelle} = counterTeam();
        ifa.setCharSettings(ifaA1(100));
        expectBonuses(finalStats(noelle), 100);
        sucrose.setCharSettings(SUCROSE_A4);
        // 20% of Sucrose premod EM (600) = 120 extra on Ifa ...
        expect(totalMastery(finalStats(ifa))).toBeCloseTo(400 + 120, 6);
        // ... but the counter bonus stays 100 x per-point.
        expectBonuses(finalStats(noelle), 100);
        // Ifa's own A4 is premod EM on himself: counted in his total ...
        ifa.setCharSettings(Object.assign(ifaA1(100), {ifa_mutual_aid_agreement: true}));
        expect(totalMastery(finalStats(ifa))).toBeCloseTo(400 + 120 + 80, 6);
        // ... but moves no counter bonus.
        expectBonuses(finalStats(noelle), 100);
    });

    test('solo numbers unchanged', () => {
        const solo = makeSolo('Ifa');
        solo.setCharSettings(ifaA1(100));
        expectBonuses(finalStats(solo), 100);
        const {noelle} = counterTeam();
        // No team EM buff reaches Noelle with everything off, so the solo and
        // team bonuses agree trivially; the point is the formula, not the lane.
        expect(reactionBonuses(finalStats(noelle)).swirl).toBe(0);
    });
});

describe('Ifa A4 and C4 write premod EM: Nahida A1 counts it', () => {
    test('solo numbers: 25% of the highest premod EM', () => {
        const {nahida, noelle, kaeya} = premodTeam();
        nahida.setCharSettings(NAHIDA_A1);
        // Highest premod EM is Ifa's 800: 25% = 200.
        expect(a1On(noelle, kaeya)).toBeCloseTo(200, 6);
    });

    test('counts A4 premod EM on Ifa', () => {
        const {nahida, ifa, noelle, kaeya} = premodTeam();
        nahida.setCharSettings(NAHIDA_A1);
        expect(a1On(noelle, kaeya)).toBeCloseTo(200, 6);
        ifa.setCharSettings({ifa_mutual_aid_agreement: true});
        // A4 writes Actor_ElemMasteryDelta (premod): +80 on Ifa.
        expect(totalMastery(finalStats(ifa))).toBeCloseTo(800 + 80, 6);
        expect(a1On(noelle, kaeya)).toBeCloseTo(0.25 * 880, 6);
    });

    test('counts C4 premod EM on Ifa', () => {
        const {nahida, ifa, noelle, kaeya} = premodTeam();
        ifa.setCharLevels({level: 90, ascension: 6, constellation: 4});
        nahida.setCharSettings(NAHIDA_A1);
        expect(a1On(noelle, kaeya)).toBeCloseTo(200, 6);
        ifa.setCharSettings({ifa_decayed_vessels_permutation: true});
        // C4 writes Actor_ElemMasteryDelta (premod): +100 on Ifa.
        expect(totalMastery(finalStats(ifa))).toBeCloseTo(800 + 100, 6);
        expect(a1On(noelle, kaeya)).toBeCloseTo(0.25 * 900, 6);
    });

    test('ignores Key of Khaj-Nisut party EM (extra) on the max member', () => {
        const {nahida, ifa, kaeya, noelle} = premodTeam();
        kaeya.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kaeya.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        kaeya.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        // The Key scales on max HP: raise it so the party share is visible.
        matchCarrierTotals(kaeya, {hp_total: 40000});
        nahida.setCharSettings(NAHIDA_A1);
        // The extra party EM reaches off-field Ifa (no A1 off field) ...
        const partyShare = totalMastery(finalStats(ifa)) - 800;
        expect(partyShare).toBeGreaterThan(5);
        // ... but the premod-read A1 on Noelle stays 25% of 800.
        expect(totalMastery(finalStats(noelle)) - 100 - partyShare).toBeCloseTo(200, 6);
    });
});

describe('Ifa skill heal reads total EM', () => {
    // Skill 10 (makeBuild): 36.288% EM + 105.9347 (CharTalentTables, s2 p2/p3).
    const RATIO = 36.288;
    const FLAT = 105.9347;

    function heal(build) {
        return featureValues(build)['skill.ifa_tonicshot_heal'][0];
    }

    test('solo numbers from the game formula', () => {
        const solo = makeSolo('Ifa');
        matchCarrierTotals(solo, {mastery_total: 400});
        expect(heal(solo)).toBeCloseTo(RATIO / 100 * 400 + FLAT, 6);
    });

    test('counts Nahida A1 extra EM on the field', () => {
        const {team, nahida, ifa} = premodTeam();
        team.setOnFieldMember(ifa);
        matchCarrierTotals(nahida, {mastery_total: 300});
        expect(heal(ifa)).toBeCloseTo(RATIO / 100 * 800 + FLAT, 6);
        nahida.setCharSettings(NAHIDA_A1);
        // 25% of the highest premod EM (800) = 200 extra on the on-field Ifa.
        expect(totalMastery(finalStats(ifa))).toBeCloseTo(800 + 200, 6);
        expect(heal(ifa)).toBeCloseTo(RATIO / 100 * 1000 + FLAT, 6);
    });
});
