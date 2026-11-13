import { FeatureCompiler } from '../src/js/classes/Feature2/Compiler';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, featureValues } from './support/team';

global.DB = DB;

// md/buff_chains.md: Xingqiu's Rain-Sword damage reduction reads premod
// (non-extra) Hydro DMG. The game (Avatar_Xingqiu_PhantomShield
// onAbilityStart) computes the Hydro-derived part from
// FIGHT_PROP_NONEXTRA_WATER_ADD_HURT x WaterAddHurt2SubHurtRatio (0.2),
// plus the talent BaseSubHurtDelta; KQM (jamberry#7142, v1.6) tested that
// Kazuha's A4 Hydro DMG does not count. GO reads input.premod.hydro_dmg_.
//
// Game-formula constants used below (Xingqiu skill 10, ascension 6):
// - base reduction 29% (talent table s2 p3 at 10);
// - Hydro-derived part 20% x premod Hydro DMG;
// - solo premod Hydro is his own A4, 20%: display 29 + 20 x 0.20 = 33;
// - Kazuha A4 Hydro (extra): 0.04% per point of his premod EM
//   (TalentValues.A4ElementalBonus), counted in the total but not here;
// - a flat (custom) Hydro buff is premod and counts, 20% of its value;
// - A1 heals 6% of Max HP (total, by construction; no extra-HP writer
//   exists, so solo parity pins the formula).
// Only the builds' base inputs (talent table value, A4 rate, carrier premod
// EM, total HP) are read from the engine; every expected number is computed
// from those formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function setup() {
    const xingqiu = makeBuild('Xingqiu');
    const kazuha = makeBuild('Kazuha');
    const xiangling = makeBuild('Xiangling');
    const diona = makeBuild('Diona');
    const team = Team.fromMember(xingqiu);
    team.setMember(1, kazuha);
    team.setMember(2, xiangling);
    team.setMember(3, diona);
    team.setOnFieldMember(xingqiu);
    return {xingqiu, kazuha};
}

function withKazuhaHydro(kazuha, em = 800) {
    kazuha.modifyBuffsSettings({'custom_buffs.mastery': em});
    kazuha.setCharSettings({kaedehara_kazuha_poetics_of_fuubutsu: ['hydro']});
}

function premodHydro(stats) {
    return stats.get('dmg_hydro') - (stats.get('dmg_hydro_extra') || 0);
}

function extraHydro(stats) {
    return stats.get('dmg_hydro_extra') || 0;
}

function reductionFeature() {
    return DB.Chars.get('Xingqiu').getFeatures().find((f) => f.getName() === 'skill.dmg_reduction');
}

function reductionOf(xingqiu) {
    // Features cache their compiled program, built from the first
    // evaluation's active effects; recompile so this team's buffs apply
    // (travelerAnemoWindwrath.test.js does the same).
    reductionFeature().compiled = undefined;
    return featureValues(xingqiu)['skill.dmg_reduction'][0];
}

function healOf(xingqiu) {
    return featureValues(xingqiu)['skill.xingqiu_hydropathic'][0];
}

describe('Xingqiu damage reduction reads premod Hydro DMG', () => {
    test('solo numbers: base 29%, A4 20% Hydro, no extra lane', () => {
        const {xingqiu} = setup();
        const stats = finalStats(xingqiu);
        expect(extraHydro(stats)).toBe(0);
        expect(premodHydro(stats)).toBeCloseTo(0.20, 9);
        expect(stats.get('dmg_hydro')).toBeCloseTo(0.20, 9);
        // 29 + 20 x 0.20.
        expect(reductionOf(xingqiu)).toBeCloseTo(33, 9);
    });

    test('counts premod Hydro: a flat Hydro buff moves the display', () => {
        const {xingqiu} = setup();
        xingqiu.modifyBuffsSettings({'custom_buffs.dmg_hydro': 30});
        const stats = finalStats(xingqiu);
        // A flat buff is premod: still no extra lane.
        expect(extraHydro(stats)).toBe(0);
        expect(premodHydro(stats)).toBeCloseTo(0.50, 9);
        // +30% Hydro: display +6.
        expect(reductionOf(xingqiu)).toBeCloseTo(39, 9);
    });

    test('ignores extra Hydro: Kazuha A4 moves the total but not the display', () => {
        const {xingqiu, kazuha} = setup();
        withKazuhaHydro(kazuha);
        // The carrier's premod EM is the buff's input (Kazuha A4 reads
        // non-extra EM in the game); the 0.04% rate is the game formula.
        const carrierStats = finalStats(kazuha);
        const carrierEm = totalMastery(carrierStats) - (carrierStats.get('mastery_extra') || 0);
        const expectedExtra = 0.04 * carrierEm / 100;

        const stats = finalStats(xingqiu);
        expect(extraHydro(stats)).toBeCloseTo(expectedExtra, 9);
        expect(expectedExtra).toBeGreaterThan(0.2);
        expect(premodHydro(stats)).toBeCloseTo(0.20, 9);
        expect(stats.get('dmg_hydro')).toBeCloseTo(0.20 + expectedExtra, 9);
        // The extra Hydro lands in the total but the display stays at the
        // premod value: 29 + 20 x 0.20.
        expect(reductionOf(xingqiu)).toBeCloseTo(33, 9);
    });

    test('extra and premod together: only the premod part counts', () => {
        const {xingqiu, kazuha} = setup();
        xingqiu.modifyBuffsSettings({'custom_buffs.dmg_hydro': 30});
        withKazuhaHydro(kazuha);
        const carrierStats = finalStats(kazuha);
        const carrierEm = totalMastery(carrierStats) - (carrierStats.get('mastery_extra') || 0);

        const stats = finalStats(xingqiu);
        expect(extraHydro(stats)).toBeCloseTo(0.04 * carrierEm / 100, 9);
        expect(premodHydro(stats)).toBeCloseTo(0.50, 9);
        // 29 + 20 x 0.50.
        expect(reductionOf(xingqiu)).toBeCloseTo(39, 9);
    });

    test('solo A1 heal: 6% of Max HP', () => {
        const {xingqiu} = setup();
        const stats = finalStats(xingqiu);
        const totalHp = stats.get('hp_base') + stats.get('hp');
        expect(healOf(xingqiu)).toBeCloseTo(0.06 * totalHp, 6);
    });

    test('the display value itself reads premod Hydro with an extra lane present', () => {
        const {xingqiu, kazuha} = setup();
        withKazuhaHydro(kazuha);
        const stats = finalStats(xingqiu);
        // Real team numbers: Kazuha's extra Hydro and the total with it.
        const extra = extraHydro(stats);
        expect(extra).toBeGreaterThan(0.2);
        const total = stats.get('dmg_hydro');

        // The display's own tree, no post-effects applied, but with the
        // extra lane present as a team buff would leave it: a premod read
        // subtracts the lane, a total read counts it.
        const data = xingqiu.getBuildData();
        data.stats.add('dmg_hydro', extra);
        data.stats.add('dmg_hydro_extra', extra);
        const feat = reductionFeature();
        const tree = feat.getTree(data);
        const compiler = new FeatureCompiler(tree, []);
        data.stats.ensure(compiler.usedStats);
        compiler.prepare(data, {dontProcessTree: 1});
        compiler.compile({});
        const [normal] = compiler.execute(data);
        // 29 + 20 x (total - extra): the extra Hydro is not counted.
        expect(normal * 100).toBeCloseTo(29 + 20 * (total - extra), 9);
        expect(normal * 100).toBeCloseTo(33, 9);
    });
});
