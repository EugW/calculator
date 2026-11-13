import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Peak Patrol Song): the team
// Elemental DMG% from DEF reads premod DEF and writes premod DMG%.
// - Read: Weapon_Sword_XochitlsTube onAbilityStart computes Defence_InCalc
//   from FIGHT_PROP_NONEXTRA_DEFENSE (premod, capped by MaxDefence) into
//   ElementDamageUp. Default premod read confirmed (no reads param).
// - Write: UNIQUE_Weapon_Sword_XochitlsTube_TeamBuff properties
//   Actor_*AddHurtDelta without "Extra": premod DMG%, unlike Kazuha A4's
//   Actor_*AddHurtExtraDelta (extra). So writes CHANNELS.PREMOD.
//   GO reads input.total.def (wrong per data) but writes the team buff under
//   premod (right). KQM has snapshot/timing entries, no stat-interaction test.
// - The Ode stacks (DEF% + flat Elemental DMG%) and the refine toggle text
//   are flat conditions (always premod): no params. The feature is a display
//   of the post-effect value: no channel.
// - No ability writes extra DEF (md/buff_chains.md), so total == premod for
//   the DEF read today; an explicit NONEXTRA read still confirms the default.
//   The only premod DMG% reader in the game is Xingqiu's damage reduction
//   (batch 8, not yet classified), so the write side is pinned by the extra
//   lanes (empty) and by total readers, with Kazuha's extra DMG% as control.
//
// A 4-member team of four different elements is used throughout: a smaller
// team would get Elemental Resonance in our engine but not in the game
// (md/buff_chains.md). R1 throughout: 0.008% per DEF (0.00008 ratio),
// cap 25.6% (0.256) at 3200 DEF.

const R1_FACTOR = 0.008 / 100;
const R1_CAP = 25.6 / 100;

function peakBonus(defTotal) {
    return Math.min(defTotal * R1_FACTOR, R1_CAP);
}

function equipPeak(build, refine = 1) {
    build.setWeapon(DB.Weapons.get('sword').get('PeakPatrolSong'));
    build.setWeaponLevels({level: 90, ascension: 6, refine});
    build.setWeaponSettings({});
}

function peakOn(build) {
    build.setWeaponSettings({weapon_peak_patrol_song_2: true});
}

function peakOff(build) {
    build.setWeaponSettings({});
}

// Kaeya (cryo sword) holds Peak; Bennett (pyro), Sucrose (anemo) and Fischl
// (electro) are neutral teammates with no DEF/DMG% post-effects. Bennett, who
// has no innate Elemental DMG%, is the receiver for DMG% checks.
function neutralTeam() {
    const kaeya = makeBuild('Kaeya');
    equipPeak(kaeya, 1);
    const team = Team.fromMember(kaeya);
    const bennett = makeBuild('Bennet');
    team.setMember(1, bennett);
    const sucrose = makeBuild('Sucrose');
    team.setMember(2, sucrose);
    const fischl = makeBuild('Fischl');
    team.setMember(3, fischl);
    team.setOnFieldMember(kaeya);
    kaeya.setWeaponSettings({});
    bennett.setCharSettings({});
    sucrose.setCharSettings({});
    return {team, kaeya, bennett, sucrose, fischl};
}

function delta(member, apply) {
    const before = finalStats(member);
    apply();
    const after = finalStats(member);
    return (stat) => after.get(stat) - before.get(stat);
}

describe('Peak Patrol Song team buff formula (solo parity, no extra stats)', () => {
    test('R1 bonus from holder DEF, with cap, extra lanes empty', () => {
        const {kaeya, bennett} = neutralTeam();
        for (const [defTotal, expected] of [
            [1000, peakBonus(1000)],
            [2000, peakBonus(2000)],
            [5000, peakBonus(5000)],
        ]) {
            peakOff(kaeya);
            matchCarrierTotals(kaeya, {def_total: defTotal});
            expect(finalStats(bennett).get('dmg_pyro')).toBeCloseTo(0, 9);
            peakOn(kaeya);
            expect(finalStats(bennett).get('dmg_pyro')).toBeCloseTo(expected, 8);
            expect(finalStats(bennett).get('dmg_cryo')).toBeCloseTo(expected, 8);
            expect(finalStats(bennett).get('dmg_hydro')).toBeCloseTo(expected, 8);
            // Premod write: nothing lands in the extra lanes.
            expect(finalStats(bennett).get('dmg_pyro_extra') || 0).toBeCloseTo(0, 9);
            expect(finalStats(bennett).get('dmg_hydro_extra') || 0).toBeCloseTo(0, 9);
            // The holder gets its own team copy as well.
            expect(finalStats(kaeya).get('dmg_pyro')).toBeCloseTo(expected, 8);
        }
        // Game-text spot checks: 8% per 1000 DEF, 25.6% cap.
        expect(peakBonus(1000)).toBeCloseTo(0.08, 9);
        expect(peakBonus(3200)).toBeCloseTo(0.256, 9);
        expect(peakBonus(5000)).toBeCloseTo(0.256, 9);
    });

    test('holder-alone numbers: effect off leaves no DMG%', () => {
        const {kaeya, bennett} = neutralTeam();
        peakOff(kaeya);
        matchCarrierTotals(kaeya, {def_total: 2000});
        expect(finalStats(bennett).get('dmg_pyro')).toBe(0);
        expect(finalStats(kaeya).get('dmg_pyro')).toBe(0);
    });
});

describe('Peak Patrol Song reads premod DEF', () => {
    // Kaeya (cryo, on field) holds Peak; Columbina C2 (geo) gives him 1% of
    // her 30000 HP = 300 premod DEF; Flins (electro) is the second Moonsign
    // member the C2 delivery needs; Bennett (pyro) keeps four elements.
    // Matched with C2 on (like test/buffChainsColumbina.test.js): Columbina
    // HP 30000 includes her C2 40% HP, Kaeya DEF 1300 includes the 300 C2.
    function c2Team() {
        const kaeya = makeBuild('Kaeya');
        equipPeak(kaeya, 1);
        const columbina = makeBuild('Columbina');
        columbina.setCharLevels({level: 90, ascension: 6, constellation: 2});
        const team = Team.fromMember(kaeya);
        team.setMember(1, columbina);
        const flins = makeBuild('Flins');
        team.setMember(2, flins);
        const bennett = makeBuild('Bennet');
        team.setMember(3, bennett);
        team.setOnFieldMember(kaeya);
        peakOn(kaeya);
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'geo',
        });
        matchCarrierTotals(columbina, {hp_total: 30000});
        matchCarrierTotals(kaeya, {def_total: 1300});
        return {team, kaeya, columbina, flins, bennett};
    }

    const C2_ON = {
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: 'geo',
    };

    test('counts Columbina C2 premod DEF', () => {
        const {kaeya, columbina, bennett} = c2Team();
        expect(finalStats(bennett).get('dmg_pyro')).toBeCloseTo(peakBonus(1300), 8);
        // 1% of 30000 total HP, premod: turning C2 off removes 300 DEF.
        expect(delta(kaeya, () => columbina.setCharSettings({}))('def')).toBeCloseTo(-300, 6);
        expect(finalStats(bennett).get('dmg_pyro')).toBeCloseTo(peakBonus(1000), 8);
        columbina.setCharSettings(C2_ON);
        // Back on: (1000 + 300) moves the bonus by 300 * 0.008% = 2.4%.
        expect(finalStats(bennett).get('dmg_pyro')).toBeCloseTo(peakBonus(1300), 8);
        expect(delta(bennett, () => columbina.setCharSettings({}))('dmg_pyro')).toBeCloseTo(-0.024, 8);
        columbina.setCharSettings(C2_ON);
        expect(finalStats(bennett).get('dmg_pyro')).toBeCloseTo(peakBonus(1300), 8);
        // No ability writes extra DEF (md/buff_chains.md), so there is no
        // must-not-count case for the DEF read; total == premod today.
    });

    test('ignores unrelated extra stats (Bennett ATK, Key party EM)', () => {
        const {kaeya, bennett, sucrose} = neutralTeam();
        peakOn(kaeya);
        matchCarrierTotals(kaeya, {def_total: 2000});
        expect(finalStats(sucrose).get('dmg_pyro')).toBeCloseTo(peakBonus(2000), 8);

        // Bennett's burst reads base ATK and writes extra ATK: it raises
        // Kaeya's total ATK but must not move the DEF-read bonus.
        const atkBefore = finalStats(kaeya).get('atk');
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(finalStats(kaeya).get('atk') - atkBefore).toBeGreaterThan(100);
        expect(finalStats(sucrose).get('dmg_pyro')).toBeCloseTo(peakBonus(2000), 8);
    });

    test('ignores the Key party EM (extra)', () => {
        // Fresh team (builds cannot join two teams): Kaeya (cryo, Peak) +
        // Bennett (pyro) + Kazuha (anemo, Key) + Fischl (electro).
        const kaeya = makeBuild('Kaeya');
        equipPeak(kaeya, 1);
        const team = Team.fromMember(kaeya);
        const bennett = makeBuild('Bennet');
        team.setMember(1, bennett);
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        team.setMember(2, kazuha);
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(kaeya);
        peakOn(kaeya);
        matchCarrierTotals(kaeya, {def_total: 2000});
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        expect(finalStats(bennett).get('dmg_pyro')).toBeCloseTo(peakBonus(2000), 8);
        // The Key's party EM is extra: it raises total EM but must not move
        // the DEF-read bonus.
        const emBefore = totalMastery(finalStats(bennett));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(bennett)) - emBefore).toBeGreaterThan(1);
        expect(finalStats(bennett).get('dmg_pyro')).toBeCloseTo(peakBonus(2000), 8);
    });
});

describe('Peak Patrol Song writes premod DMG% (Kazuha control)', () => {
    test('premod team DMG% leaves extra lanes empty; Kazuha extra does not', () => {
        // Kaeya (cryo, Peak) + Bennett (pyro receiver) + Sucrose (anemo) +
        // Kazuha (anemo? two anemo resonates). Use Kaeya + Bennett + Fischl
        // (electro) + Kazuha (anemo): cryo/pyro/electro/anemo, no resonance.
        const kaeya = makeBuild('Kaeya');
        equipPeak(kaeya, 1);
        const team = Team.fromMember(kaeya);
        const bennett = makeBuild('Bennet');
        team.setMember(1, bennett);
        const fischl = makeBuild('Fischl');
        team.setMember(2, fischl);
        const kazuha = makeBuild('Kazuha');
        team.setMember(3, kazuha);
        team.setOnFieldMember(kaeya);
        peakOn(kaeya);
        matchCarrierTotals(kaeya, {def_total: 2000});
        matchCarrierTotals(kazuha, {mastery_total: 800});
        kazuha.setCharSettings({});

        // Peak alone: 16% Pyro to Bennett, all premod (extra lane empty).
        expect(finalStats(bennett).get('dmg_pyro')).toBeCloseTo(peakBonus(2000), 8);
        expect(finalStats(bennett).get('dmg_pyro_extra') || 0).toBeCloseTo(0, 9);

        // Kazuha A4 (0.04% per EM, extra): 800 premod EM -> 32% extra Pyro
        // when swirling Pyro. It adds to the total but fills the extra lane,
        // unlike Peak's premod share.
        kazuha.setCharSettings({kaedehara_kazuha_poetics_of_fuubutsu: ['pyro']});
        expect(finalStats(bennett).get('dmg_pyro')).toBeCloseTo(peakBonus(2000) + 0.0004 * 800, 6);
        expect(finalStats(bennett).get('dmg_pyro_extra')).toBeCloseTo(0.0004 * 800, 6);
        // The premod part is still Peak's alone: total less extra.
        expect(finalStats(bennett).get('dmg_pyro') - finalStats(bennett).get('dmg_pyro_extra'))
            .toBeCloseTo(peakBonus(2000), 8);
    });
});
