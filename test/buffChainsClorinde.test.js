import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery, featureValues } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Clorinde):
// - A1 Dark-Shattering Flame (flat Electro DMG on Normal Attacks and Last Lightfall,
//   20% of ATK per stack, 3 stacks, cap 1800; C2: 30% per stack, cap 2700) reads total
//   ATK: the game (Avatar_Clorinde_Talent_PassiveSkill,
//   UNIQUE_Clorinde_PermanentSkill_1_Buff_DamageExtra onAdded/onThinkInterval
//   SetOverrideMapValue [FIGHT_PROP_CUR_ATTACK x Ratio] into DamageExtra, applied by
//   ModifyDamageMixin) scales on FIGHT_PROP_CUR_ATTACK, and GO reads input.total.atk.
//   The default atk* scaling already reads the total, so no params. A total read counts
//   every ATK buff (Bennett extra, Columbina C2 premod); the must-not-count side is
//   covered by the contrast test (Flins's A4, a premod reader, ignoring Bennett's burst
//   in the same team).
// - C4 To Enshrine Tears (burst DMG from Bond of Life, 2% per 1% BoL, max 200%) reads
//   CUR_HP_DEBTS and total HP (FIGHT_PROP_MAX_HP) in the game; our from 'bond_of_life'
//   (BoL percent) matches that formula, and neither stat has an extra lane: default kept.
// - Skill heals (Impale the Night, subtractBoL) read total HP by construction (hp*) and
//   Bond of Life (no lane): default confirmed. No ability writes extra HP, so premod and
//   total HP agree today.
// - C1/C6 shade hits and all other damage hits read total ATK by construction: nothing
//   declared or tested beyond the A1 chain.
// - A4 Lawful Remuneration (flat CRIT) is user-toggled; its game gate (BoL >= MaxHP) is
//   not a scaling.
// - KQM Clorinde evidence page lists no ATK/EM/ER interaction test.
// - 4-member teams throughout: a smaller team would get Elemental Resonance in our
//   engine but not in the game (md/buff_chains.md).

function withConstellation(key, constellation) {
    const build = makeBuild(key);
    build.setCharLevels({level: 90, ascension: 6, constellation});
    return build;
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

// Burst hit (Last Lightfall) normal damage, the A1 carrier used below.
function burstDmg(member) {
    return featureValues(member)['burst.burst_dmg'][0];
}

// Burst talent at level 10 (makeBuild sets skills to 10): CharTalentTables s3.p1[9].
const BURST_TALENT_L10 = 228.384;

// Clorinde on field with Bennett (extra ATK source) and two neutral members
// (electro/pyro/hydro/dendro: no Elemental Resonance).
function setupBennett() {
    const clorinde = makeBuild('Clorinde');
    const bennett = makeBuild('Bennet');
    const team = Team.fromMember(clorinde);
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Yaoyao'));
    team.setOnFieldMember(clorinde);
    bennett.setCharSettings({});
    matchCarrierTotals(clorinde, {atk_total: 1000});
    return {team, clorinde, bennett};
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

// Clorinde on field with Columbina C2 (electro, 30000 HP -> +300 premod ATK).
// Columbina C2 needs Moonsign Ascendant Gleam (2 Nod-Krai members), so Aino stands
// in as the second one; resonance absorbed by matchCarrierTotals and cancels out
// of the on/off delta.
function setupC2() {
    const clorinde = makeBuild('Clorinde');
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(clorinde);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(clorinde);
    columbina.setCharSettings(C2_ON);
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(clorinde, {atk_total: 1000});
    return {team, clorinde, columbina};
}

describe('Clorinde A1 reads total ATK', () => {
    test('solo formula: 20% of ATK per stack, exemplar ratios off burst L10', () => {
        const {clorinde} = setupBennett();
        // No extra ATK here, so premod and total agree.
        expect(totalAtk(finalStats(clorinde))).toBeCloseTo(1000, 6);
        clorinde.setCharSettings({});
        const d0 = burstDmg(clorinde);
        clorinde.setCharSettings({clorinde_dark_shattering_flame: 1});
        const d1 = burstDmg(clorinde);
        clorinde.setCharSettings({clorinde_dark_shattering_flame: 3});
        const d3 = burstDmg(clorinde);
        // Game formula: burst = (T x ATK + 0.2 x ATK x stacks) x F; F cancels.
        expect((d1 - d0) / d0).toBeCloseTo(0.2 / (BURST_TALENT_L10 / 100), 6);
        expect((d3 - d0) / d0).toBeCloseTo(0.6 / (BURST_TALENT_L10 / 100), 6);
    });

    test('solo cap: 1800 flat at C0', () => {
        const {clorinde} = setupBennett();
        clorinde.setCharSettings({});
        matchCarrierTotals(clorinde, {atk_total: 10000});
        const d0 = burstDmg(clorinde);
        clorinde.setCharSettings({clorinde_dark_shattering_flame: 3});
        const d3 = burstDmg(clorinde);
        // 0.2 x 10000 x 3 = 6000, capped to 1800: (D3-D0)/D0 = 1800/(T x 10000).
        expect((d3 - d0) / d0).toBeCloseTo(1800 / BURST_TALENT_L10 / 100, 6);
    });

    test('C2 solo ratio: 30% of ATK per stack', () => {
        const clorinde = withConstellation('Clorinde', 2);
        const bennett = makeBuild('Bennet');
        const team = Team.fromMember(clorinde);
        team.setMember(1, bennett);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Yaoyao'));
        team.setOnFieldMember(clorinde);
        bennett.setCharSettings({});
        matchCarrierTotals(clorinde, {atk_total: 1000});
        clorinde.setCharSettings({});
        const d0 = burstDmg(clorinde);
        clorinde.setCharSettings({clorinde_dark_shattering_flame: 3});
        const d3 = burstDmg(clorinde);
        expect((d3 - d0) / d0).toBeCloseTo(0.9 / (BURST_TALENT_L10 / 100), 6);
    });

    test('counts Bennett burst extra ATK: damage stays proportional to total ATK', () => {
        const {clorinde, bennett} = setupBennett();
        clorinde.setCharSettings({clorinde_dark_shattering_flame: 3});
        const atkBefore = totalAtk(finalStats(clorinde));
        const dmgBefore = burstDmg(clorinde);
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const atkAfter = totalAtk(finalStats(clorinde));
        const dmgAfter = burstDmg(clorinde);
        // Sanity: Bennett applied (extra ATK raises the total).
        expect(atkAfter - atkBefore).toBeGreaterThan(100);
        // Uncapped here (0.2 x 1818 x 3 = 1091 < 1800): base and A1 both scale
        // with total ATK, so damage per ATK is constant. A premod read would give
        // D_after = D_before + T x extra x F (A1 flat frozen), breaking this.
        expect(dmgAfter / atkAfter).toBeCloseTo(dmgBefore / atkBefore, 6);
    });

    test('counts Columbina C2 premod ATK: damage stays proportional to total ATK', () => {
        const {clorinde, columbina} = setupC2();
        clorinde.setCharSettings({clorinde_dark_shattering_flame: 3});
        // 1% of 30000 total HP, premod: Clorinde (on field) gains 300 ATK.
        const atkOn = totalAtk(finalStats(clorinde));
        const dmgOn = burstDmg(clorinde);
        columbina.setCharSettings({});
        const atkOff = totalAtk(finalStats(clorinde));
        const dmgOff = burstDmg(clorinde);
        expect(atkOn - atkOff).toBeCloseTo(300, 6);
        // Uncapped (0.2 x 1300 x 3 = 780 < 1800): proportional again.
        expect(dmgOn / atkOn).toBeCloseTo(dmgOff / atkOff, 6);
    });

    test('contrast: Flins A4 (premod) ignores Bennett extra ATK in the same team', () => {
        const clorinde = makeBuild('Clorinde');
        const bennett = makeBuild('Bennet');
        const flins = makeBuild('Flins');
        const team = Team.fromMember(clorinde);
        team.setMember(1, bennett);
        team.setMember(2, flins);
        team.setMember(3, makeBuild('Aino'));
        team.setOnFieldMember(clorinde);
        bennett.setCharSettings({});
        clorinde.setCharSettings({clorinde_dark_shattering_flame: 3});
        matchCarrierTotals(clorinde, {atk_total: 1000});
        matchCarrierTotals(flins, {atk_total: 1000});
        const perAtkBefore = burstDmg(clorinde) / totalAtk(finalStats(clorinde));
        const flinsBefore = totalMastery(finalStats(flins));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        // Clorinde (total read) stays proportional to total ATK; Flins A4 (8% of
        // premod ATK, cap 160, linear here) does not move with extra ATK.
        expect(burstDmg(clorinde) / totalAtk(finalStats(clorinde))).toBeCloseTo(perAtkBefore, 6);
        expect(totalMastery(finalStats(flins)) - flinsBefore).toBeCloseTo(0, 8);
    });
});

describe('Clorinde C4 reads Bond of Life (2% per 1%, max 200%)', () => {
    function setupC4() {
        const clorinde = withConstellation('Clorinde', 4);
        const team = Team.fromMember(clorinde);
        team.setMember(1, makeBuild('Bennet'));
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Yaoyao'));
        team.setOnFieldMember(clorinde);
        return {team, clorinde};
    }

    function burstBonus(member) {
        return finalStats(member).get('dmg_burst_clorinde') || 0;
    }

    test('solo formula and cap', () => {
        const {clorinde} = setupC4();
        clorinde.setCharSettings({'common.bond_of_life': 0});
        expect(burstBonus(clorinde)).toBeCloseTo(0, 10);
        clorinde.setCharSettings({'common.bond_of_life': 50});
        expect(burstBonus(clorinde)).toBeCloseTo(1.0, 8);
        clorinde.setCharSettings({'common.bond_of_life': 100});
        expect(burstBonus(clorinde)).toBeCloseTo(2.0, 8);
        // Past the cap the bonus stays flat.
        clorinde.setCharSettings({'common.bond_of_life': 150});
        expect(burstBonus(clorinde)).toBeCloseTo(2.0, 8);
    });
});

describe('Clorinde skill heals read total HP (solo formula)', () => {
    test('(talent% - 1) x HP x BoL: 104%/110% at HP 20000, BoL 100%', () => {
        const clorinde = makeBuild('Clorinde');
        const team = Team.fromMember(clorinde);
        team.setMember(1, makeBuild('Bennet'));
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Yaoyao'));
        team.setOnFieldMember(clorinde);
        matchCarrierTotals(clorinde, {hp_total: 20000});
        clorinde.setCharSettings({'common.bond_of_life': 100});
        const vals = featureValues(clorinde);
        expect(vals['skill.clorinde_impale_the_night_2_heal'][0]).toBeCloseTo(800, 6);
        expect(vals['skill.clorinde_impale_the_night_3_heal'][0]).toBeCloseTo(2000, 6);
        // HP scaling: +50% HP is +50% heal (no extra-HP writer exists; premod=total).
        matchCarrierTotals(clorinde, {hp_total: 30000});
        const vals2 = featureValues(clorinde);
        expect(vals2['skill.clorinde_impale_the_night_2_heal'][0]).toBeCloseTo(1200, 6);
    });
});
