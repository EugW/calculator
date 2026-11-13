import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md: Kazuha's A4 (Poetics of Fuubutsu, team elemental DMG%
// from his EM) reads premod EM: the game
// (Avatar_Kazuha_PermanentSkill_2,
// UNIQUE_Avatar_Kazuha_PermanentSkill_2_{Fire,Water,Electric,Ice}) computes
// Actor_*AddHurtExtraDelta (extra) from FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY.
// KQM: Key of Khaj-Nisut's EM does not affect it. His C6 (Crimson Momiji,
// Normal/Charged/Plunging DMG from EM) reads total EM: the game
// (Avatar_Kazuha_Constellation_6_DamageUp, ModifyDamageMixin) scales
// damagePercentageRatio on FIGHT_PROP_ELEMENT_MASTERY. GO guesses premod
// for C6 ("I am guessing premod"); the game data overrules the guess.
// A total read counts every EM buff, so there is no EM buff C6 must ignore;
// the must-not-count side is covered by contrast tests on A4.
//
// A 4-member team is used throughout: a 2-member team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const NAHIDA_A1 = {nahida_compassion_illuminated: true, nahida_illusory_heart: true};
const SUCROSE_A4 = {sucrose_mollis_favonius: true};
const KAZUHA_A4_PYRO = {kaedehara_kazuha_poetics_of_fuubutsu: ['pyro']};

function setup(constellation = 0) {
    const kazuha = makeBuild('Kazuha');
    const nahida = makeBuild('Nahida');
    const sucrose = makeBuild('Sucrose');
    const fischl = makeBuild('Fischl');
    const team = Team.fromMember(kazuha);
    team.setMember(1, nahida);
    team.setMember(2, sucrose);
    team.setMember(3, fischl);
    team.setOnFieldMember(kazuha);
    kazuha.setCharLevels({level: 90, ascension: 6, constellation});
    kazuha.setCharSettings({});
    nahida.setCharSettings({});
    sucrose.setCharSettings({});
    // Totals matched with every effect off, so they are premod values.
    matchCarrierTotals(kazuha, {mastery_total: 500});
    matchCarrierTotals(nahida, {mastery_total: 900});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    return {team, kazuha, nahida, sucrose, fischl};
}

function a4Pyro(member) {
    return finalStats(member).get('dmg_pyro');
}

function c6Bonus(member) {
    const stats = finalStats(member);
    return [stats.get('dmg_normal'), stats.get('dmg_charged'), stats.get('dmg_plunge')];
}

describe('Kazuha A4 reads premod EM', () => {
    test('solo numbers: 0.04% of premod EM', () => {
        const {kazuha, fischl} = setup();
        kazuha.setCharSettings(KAZUHA_A4_PYRO);
        expect(totalMastery(finalStats(kazuha))).toBeCloseTo(500, 6);
        // No extra EM present: premod and total agree.
        expect(a4Pyro(fischl)).toBeCloseTo(0.0004 * 500, 9);
    });

    test('counts own C2 flat EM (premod)', () => {
        const {kazuha, fischl} = setup(2);
        kazuha.setCharSettings({
            ...KAZUHA_A4_PYRO,
            kaedehara_kazuha_yamaarashi_tailwind: true,
        });
        // C2 writes Actor_ElemMasteryDelta (premod): +200 on Kazuha.
        expect(totalMastery(finalStats(kazuha))).toBeCloseTo(500 + 200, 6);
        expect(a4Pyro(fischl)).toBeCloseTo(0.0004 * (500 + 200), 9);
    });

    test('ignores Sucrose A4 extra EM', () => {
        const {kazuha, sucrose, fischl} = setup();
        kazuha.setCharSettings(KAZUHA_A4_PYRO);
        sucrose.setCharSettings(SUCROSE_A4);
        // 20% of Sucrose premod EM (600) = 120 extra EM on Kazuha.
        expect(totalMastery(finalStats(kazuha))).toBeCloseTo(500 + 120, 6);
        expect(a4Pyro(fischl)).toBeCloseTo(0.0004 * 500, 9);
    });

    test('ignores Nahida A1 extra EM', () => {
        const {kazuha, nahida, fischl} = setup();
        kazuha.setCharSettings(KAZUHA_A4_PYRO);
        nahida.setCharSettings(NAHIDA_A1);
        // 25% of the highest premod EM (900) = 225, under the 250 cap.
        expect(totalMastery(finalStats(kazuha))).toBeCloseTo(500 + 225, 6);
        expect(a4Pyro(fischl)).toBeCloseTo(0.0004 * 500, 9);
    });
});

describe('Kazuha C6 reads total EM', () => {
    function setupC6() {
        const builds = setup(6);
        builds.kazuha.setCharSettings({kaedehara_kazuha_crimson_momiji: true});
        return builds;
    }

    test('solo numbers: 0.2% of EM', () => {
        const {kazuha} = setupC6();
        matchCarrierTotals(kazuha, {mastery_total: 400});
        // No extra EM present: premod and total agree.
        expect(totalMastery(finalStats(kazuha))).toBeCloseTo(400, 6);
        const [normal, charged, plunge] = c6Bonus(kazuha);
        expect(normal).toBeCloseTo(0.002 * 400, 9);
        expect(charged).toBeCloseTo(0.002 * 400, 9);
        expect(plunge).toBeCloseTo(0.002 * 400, 9);
    });

    test('counts Nahida A1 extra EM', () => {
        const {kazuha, nahida} = setupC6();
        nahida.setCharSettings(NAHIDA_A1);
        // 25% of the highest premod EM (900) = 225, under the 250 cap.
        expect(totalMastery(finalStats(kazuha))).toBeCloseTo(500 + 225, 6);
        const [normal, charged, plunge] = c6Bonus(kazuha);
        expect(normal).toBeCloseTo(0.002 * (500 + 225), 9);
        expect(charged).toBeCloseTo(0.002 * (500 + 225), 9);
        expect(plunge).toBeCloseTo(0.002 * (500 + 225), 9);
    });

    test('counts Sucrose A4 extra EM', () => {
        const {kazuha, sucrose} = setupC6();
        sucrose.setCharSettings(SUCROSE_A4);
        // 20% of Sucrose premod EM (600) = 120 extra EM on Kazuha.
        expect(totalMastery(finalStats(kazuha))).toBeCloseTo(500 + 120, 6);
        const [normal, charged, plunge] = c6Bonus(kazuha);
        expect(normal).toBeCloseTo(0.002 * (500 + 120), 9);
        expect(charged).toBeCloseTo(0.002 * (500 + 120), 9);
        expect(plunge).toBeCloseTo(0.002 * (500 + 120), 9);
    });

    test('counts own C2 flat EM', () => {
        const {kazuha} = setupC6();
        kazuha.setCharSettings({
            kaedehara_kazuha_crimson_momiji: true,
            kaedehara_kazuha_yamaarashi_tailwind: true,
        });
        // C2 writes Actor_ElemMasteryDelta (premod): +200, part of the total.
        expect(totalMastery(finalStats(kazuha))).toBeCloseTo(500 + 200, 6);
        const [normal, charged, plunge] = c6Bonus(kazuha);
        expect(normal).toBeCloseTo(0.002 * (500 + 200), 9);
        expect(charged).toBeCloseTo(0.002 * (500 + 200), 9);
        expect(plunge).toBeCloseTo(0.002 * (500 + 200), 9);
    });

    test('counts both extra sources together', () => {
        const {kazuha, nahida, sucrose} = setupC6();
        nahida.setCharSettings(NAHIDA_A1);
        sucrose.setCharSettings(SUCROSE_A4);
        // Nahida A1 reads premod only, so Sucrose extra does not grow it:
        // 225 + 120 on top of 500.
        expect(totalMastery(finalStats(kazuha))).toBeCloseTo(500 + 225 + 120, 6);
        const [normal, charged, plunge] = c6Bonus(kazuha);
        expect(normal).toBeCloseTo(0.002 * (500 + 225 + 120), 9);
        expect(charged).toBeCloseTo(0.002 * (500 + 225 + 120), 9);
        expect(plunge).toBeCloseTo(0.002 * (500 + 225 + 120), 9);
    });
});
