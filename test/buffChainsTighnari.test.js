import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md: Tighnari's A4 (Scholarly Blade, dmg_charged_tighnari and
// dmg_burst_tighnari, 0.06% per EM, capped at 60%) reads the total EM: the
// game (Avatar_Tighnari_PermanentSkill_2, ModifyDamageMixin on ExtraAttack +
// Elemental_Burst) scales on FIGHT_PROP_ELEMENT_MASTERY, GO reads
// input.total.eleMas, and KQM counts Nahida's A1 extra EM (Nahida page:
// Tighnari A4 works) and Sucrose's A4 extra EM (Tighnari page: percentage
// EM buffs counted) in it. A total read counts every EM buff, so there is
// no EM buff it must ignore; the must-not-count side is covered by the
// contrast test (Sucrose's A4, a premod reader, ignoring Nahida's A1 in the
// same team).
//
// A 4-member team is used throughout: a 2-member team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const NAHIDA_A1 = {nahida_compassion_illuminated: true, nahida_illusory_heart: true};

function setup() {
    const tighnari = makeBuild('Tighnari');
    const nahida = makeBuild('Nahida');
    const sucrose = makeBuild('Sucrose');
    const fischl = makeBuild('Fischl');
    const team = Team.fromMember(tighnari);
    team.setMember(1, nahida);
    team.setMember(2, sucrose);
    team.setMember(3, fischl);
    team.setOnFieldMember(tighnari);
    tighnari.setCharSettings({});
    nahida.setCharSettings({});
    sucrose.setCharSettings({});
    // Totals matched with every effect off, so they are premod values.
    matchCarrierTotals(tighnari, {mastery_total: 300});
    matchCarrierTotals(nahida, {mastery_total: 900});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    return {team, tighnari, nahida, sucrose, fischl};
}

function a4Bonus(member) {
    const stats = finalStats(member);
    return [stats.get('dmg_charged_tighnari'), stats.get('dmg_burst_tighnari')];
}

describe('Tighnari A4 reads total EM', () => {
    test('solo numbers: 0.06% of EM, capped at 60%', () => {
        const {tighnari} = setup();
        // No extra EM present: premod and total agree.
        expect(totalMastery(finalStats(tighnari))).toBeCloseTo(300, 6);
        const [charged, burst] = a4Bonus(tighnari);
        expect(charged).toBeCloseTo(0.0006 * 300, 9);
        expect(burst).toBeCloseTo(0.0006 * 300, 9);
    });

    test('counts Nahida A1 extra EM', () => {
        const {tighnari, nahida} = setup();
        nahida.setCharSettings(NAHIDA_A1);
        // 25% of the highest premod EM (900) = 225, under the 250 cap.
        expect(totalMastery(finalStats(tighnari))).toBeCloseTo(300 + 225, 6);
        const [charged, burst] = a4Bonus(tighnari);
        expect(charged).toBeCloseTo(0.0006 * (300 + 225), 9);
        expect(burst).toBeCloseTo(0.0006 * (300 + 225), 9);
    });

    test('counts Sucrose A4 shared EM', () => {
        const {tighnari, sucrose} = setup();
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        // 20% of Sucrose premod EM (600) = 120.
        expect(totalMastery(finalStats(tighnari))).toBeCloseTo(300 + 120, 6);
        const [charged, burst] = a4Bonus(tighnari);
        expect(charged).toBeCloseTo(0.0006 * (300 + 120), 9);
        expect(burst).toBeCloseTo(0.0006 * (300 + 120), 9);
    });

    test('counts both extra sources together', () => {
        const {tighnari, nahida, sucrose} = setup();
        nahida.setCharSettings(NAHIDA_A1);
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        // Nahida A1 reads premod only, so Sucrose extra does not grow it:
        // 225 + 120 on top of 300.
        expect(totalMastery(finalStats(tighnari))).toBeCloseTo(300 + 225 + 120, 6);
        const [charged, burst] = a4Bonus(tighnari);
        expect(charged).toBeCloseTo(0.0006 * (300 + 225 + 120), 9);
        expect(burst).toBeCloseTo(0.0006 * (300 + 225 + 120), 9);
    });

    test('still caps at 60% when extra EM pushes past it', () => {
        const {tighnari, nahida} = setup();
        matchCarrierTotals(tighnari, {mastery_total: 900});
        matchCarrierTotals(nahida, {mastery_total: 1000});
        nahida.setCharSettings(NAHIDA_A1);
        // 25% of 1000 = 250 (capped); 900 + 250 = 1150 -> 69% capped to 60%.
        expect(totalMastery(finalStats(tighnari))).toBeCloseTo(1150, 6);
        const [charged, burst] = a4Bonus(tighnari);
        expect(charged).toBeCloseTo(0.6, 9);
        expect(burst).toBeCloseTo(0.6, 9);
    });

    test('contrast: Sucrose A4 (premod) ignores Nahida A1 extra EM', () => {
        const {team, tighnari, nahida, sucrose} = setup();
        team.setOnFieldMember(sucrose);
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        const before = totalMastery(finalStats(tighnari));
        expect(before).toBeCloseTo(300 + 120, 6);
        // Nahida A1 now lands on Sucrose (on field): Sucrose total becomes
        // 600 + 225, but her premod share stays 20% of 600 = 120.
        nahida.setCharSettings(NAHIDA_A1);
        expect(totalMastery(finalStats(sucrose))).toBeCloseTo(600 + 225, 6);
        expect(totalMastery(finalStats(tighnari))).toBeCloseTo(300 + 120, 6);
    });
});
