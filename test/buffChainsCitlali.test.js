import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Citlali):
// - A4 Frostfall Storm (90% EM) and Ice Storm (1200% EM): the game scales
//   damageExtra Ratio1/Ratio2 on FIGHT_PROP_ELEMENT_MASTERY (total EM).
// - Skill shield: shieldHP with FIGHT_PROP_ELEMENT_MASTERY (total EM).
// - C1 Stellar Blade (200% EM): ModifyDamageCountMixin damageExtra on
//   FIGHT_PROP_ELEMENT_MASTERY (total EM).
// - C4 skull (1800% EM): damageExtra Talent_Damage on
//   FIGHT_PROP_ELEMENT_MASTERY (total EM).
//   All five are hit/shield `mastery*` scalings, which read the total by
//   construction: every EM buff counts, so there is no EM buff they must
//   ignore. KQM has no Citlali chain entries; GO reads input.total.eleMas
//   for all four damage bonuses.
// - C2 (+125 self / +250 others): the game writes plain
//   Actor_ElemMasteryDelta (Citlali_Talent_SelfMastery /
//   UNIQUE_Citlali_Talent2_Mastery, no "Extra"): premod. Flat conditions are
//   premod by construction.
// - C6 points (1.5% Pyro/Hydro per point for others, 2.5% all-DMG self):
//   the game team buff (UNIQUE_Avatar_Citlali_Talent6_Buff) writes plain
//   Actor_Fire/WaterAddHurtDelta (no "Extra"): premod, so `writes:
//   CHANNELS.PREMOD` on the points post-effect. The read side is the Cifra
//   points counter, not a stat, so EM buffs must not move it. GO writes the
//   C6 DMG under premod as well.
//
// A 4-member team of four different elements is used throughout: a smaller
// team would get Elemental Resonance in our engine but not in the game
// (md/buff_chains.md).

const NAHIDA_A1 = {nahida_compassion_illuminated: true, nahida_illusory_heart: true};

function setup() {
    const citlali = makeBuild('Citlali');
    citlali.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const nahida = makeBuild('Nahida');
    const sucrose = makeBuild('Sucrose');
    const fischl = makeBuild('Fischl');
    const team = Team.fromMember(citlali);
    team.setMember(1, nahida);
    team.setMember(2, sucrose);
    team.setMember(3, fischl);
    team.setOnFieldMember(citlali);
    citlali.setCharSettings({});
    nahida.setCharSettings({});
    sucrose.setCharSettings({});
    // Totals matched with every effect off, so they are premod values.
    matchCarrierTotals(citlali, {mastery_total: 300});
    matchCarrierTotals(nahida, {mastery_total: 900});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    return {team, citlali, nahida, sucrose, fischl};
}

function a4On(citlali) {
    citlali.setCharSettings({citlali_itzpapalotls_star_garments: true});
}

function frostfall(citlali) {
    return citlali.calcFeatures(1)['skill.citlali_frostfall_storm_dmg'].normal;
}

function iceStorm(citlali) {
    return citlali.calcFeatures(1)['burst.citlali_ice_storm_dmg'].normal;
}

function skull(citlali) {
    return citlali.calcFeatures(1)['other.citlali_obsidian_spiritvessel_skull_dmg'].normal;
}

describe('Citlali A4/C4 total EM reads', () => {
    test('solo numbers: no extra EM present', () => {
        const {citlali} = setup();
        a4On(citlali);
        expect(totalMastery(finalStats(citlali))).toBeCloseTo(300, 6);
        expect(frostfall(citlali)).toBeGreaterThan(0);
        expect(iceStorm(citlali)).toBeGreaterThan(0);
        expect(skull(citlali)).toBeGreaterThan(0);
    });

    test('extra EM counts exactly like premod EM (Frostfall, Ice Storm, C4 skull)', () => {
        const {citlali, nahida} = setup();
        a4On(citlali);
        const base = [frostfall(citlali), iceStorm(citlali), skull(citlali)];

        // +100 premod EM: per-EM rates of the three bonuses (no extra EM
        // present, so matched totals are premod values).
        matchCarrierTotals(citlali, {mastery_total: 400});
        const prem = [frostfall(citlali), iceStorm(citlali), skull(citlali)];
        const rates = prem.map((v, i) => (v - base[i]) / 100);
        for (const rate of rates) expect(rate).toBeGreaterThan(0);
        matchCarrierTotals(citlali, {mastery_total: 300});

        // Nahida A1: 25% of her 900 premod EM = 225 extra EM on Citlali
        // (on field). Total reads grow at the same per-EM rates.
        nahida.setCharSettings(NAHIDA_A1);
        expect(totalMastery(finalStats(citlali))).toBeCloseTo(300 + 225, 6);
        const extra = [frostfall(citlali), iceStorm(citlali), skull(citlali)];
        for (let i = 0; i < 3; i++) {
            expect(extra[i] - base[i]).toBeCloseTo(rates[i] * 225, 1);
        }
    });

    test('counts Sucrose A4 share on top of Nahida A1', () => {
        const {citlali, nahida, sucrose} = setup();
        a4On(citlali);
        const base = frostfall(citlali);
        matchCarrierTotals(citlali, {mastery_total: 400});
        const rate = (frostfall(citlali) - base) / 100;
        matchCarrierTotals(citlali, {mastery_total: 300});

        nahida.setCharSettings(NAHIDA_A1);
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        // Nahida A1 reads premod only, so the Sucrose extra does not grow
        // it: 225 + 120 (20% of Sucrose 600) on top of 300.
        expect(totalMastery(finalStats(citlali))).toBeCloseTo(300 + 225 + 120, 6);
        expect(frostfall(citlali) - base).toBeCloseTo(rate * (225 + 120), 1);
    });
});

describe('Citlali C1 reads total EM', () => {
    test('teammate bonus counts extra EM on Citlali like premod EM', () => {
        const {team, citlali, sucrose, fischl} = setup();
        team.setOnFieldMember(fischl);
        citlali.setCharSettings({citlali_radiant_blades_of_centzon_mimixcoah: true});
        const hit = () => fischl.calcFeatures(1)['attack.normal_hit_1'].normal;
        const base = hit();

        // +100 premod EM on Citlali: per-EM rate of the 200% bonus.
        matchCarrierTotals(citlali, {mastery_total: 400});
        const rate = (hit() - base) / 100;
        expect(rate).toBeGreaterThan(0);
        matchCarrierTotals(citlali, {mastery_total: 300});

        // Sucrose share: 20% of 600 = 120 extra EM on the off-field Citlali.
        // (Fischl also gains 120 EM, which does not move her normal hits.)
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        expect(totalMastery(finalStats(citlali))).toBeCloseTo(300 + 120, 6);
        expect(hit() - base).toBeCloseTo(rate * 120, 1);
    });
});

describe('Citlali C2 writes premod EM', () => {
    test('self +125, others +250, nothing in the extra lanes', () => {
        const {citlali, fischl} = setup();
        citlali.setCharSettings({citlali_heart_devourers_travail: true});
        expect(totalMastery(finalStats(citlali))).toBeCloseTo(300 + 125, 6);
        expect(totalMastery(finalStats(fischl))).toBeCloseTo(
            finalStats(fischl).get('mastery_base') + 250, 6);
        // Premod writes: the extra lanes stay empty.
        expect(finalStats(citlali).get('mastery_extra') || 0).toBeCloseTo(0, 9);
        expect(finalStats(fischl).get('mastery_extra') || 0).toBeCloseTo(0, 9);
    });

    test('total-read bonuses count the C2 EM', () => {
        const {citlali} = setup();
        a4On(citlali);
        const base = frostfall(citlali);
        matchCarrierTotals(citlali, {mastery_total: 400});
        const rate = (frostfall(citlali) - base) / 100;
        matchCarrierTotals(citlali, {mastery_total: 300});
        citlali.setCharSettings({
            citlali_itzpapalotls_star_garments: true,
            citlali_heart_devourers_travail: true,
        });
        // Self +125 premod EM, counted by the total read.
        expect(frostfall(citlali) - base).toBeCloseTo(rate * 125, 1);
    });
});

describe('Citlali C6 points DMG (premod writes, not a stat read)', () => {
    test('40 points: others +60% Pyro/Hydro, self +60% and +100% all-DMG, extra lanes empty', () => {
        const {citlali, fischl} = setup();
        citlali.setCharSettings({citlali_points: 40});
        // Game text: 1.5% per point for nearby members, 2.5% self DMG.
        expect(finalStats(fischl).get('dmg_pyro')).toBeCloseTo(0.6, 9);
        expect(finalStats(fischl).get('dmg_hydro')).toBeCloseTo(0.6, 9);
        expect(finalStats(citlali).get('dmg_pyro')).toBeCloseTo(0.6, 9);
        expect(finalStats(citlali).get('dmg_all')).toBeCloseTo(1.0, 9);
        // Premod writes: nothing lands in the extra lanes.
        expect(finalStats(fischl).get('dmg_pyro_extra') || 0).toBeCloseTo(0, 9);
        expect(finalStats(fischl).get('dmg_hydro_extra') || 0).toBeCloseTo(0, 9);
    });

    test('live points: halving them halves the bonuses', () => {
        const {citlali, fischl} = setup();
        citlali.setCharSettings({citlali_points: 20});
        expect(finalStats(fischl).get('dmg_pyro')).toBeCloseTo(0.3, 9);
        expect(finalStats(citlali).get('dmg_all')).toBeCloseTo(0.5, 9);
        citlali.setCharSettings({citlali_points: 0});
        expect(finalStats(fischl).get('dmg_pyro')).toBe(0);
        expect(finalStats(citlali).get('dmg_all')).toBe(0);
    });

    test('C6 ignores EM buffs (points, not a stat)', () => {
        const {citlali, nahida, sucrose, fischl} = setup();
        citlali.setCharSettings({citlali_points: 40});
        expect(finalStats(fischl).get('dmg_pyro')).toBeCloseTo(0.6, 9);
        nahida.setCharSettings(NAHIDA_A1);
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        expect(totalMastery(finalStats(citlali))).toBeGreaterThan(300 + 200);
        expect(finalStats(fischl).get('dmg_pyro')).toBeCloseTo(0.6, 9);
        expect(finalStats(fischl).get('dmg_hydro')).toBeCloseTo(0.6, 9);
    });
});
