import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Varka):
// - A1 Dawn Wind's March (in-game A1, openConfig Varka_PermanentSkill_2,
//   ProudSkill 1282101 [0.10, 0.25, 1.4, 2.2]): 10% Anemo + priority-element
//   DMG% per 1000 ATK, cap 25%. The game
//   (Avatar_Varka_PermanentSkill_2 onThinkInterval) computes Calc_DamageRatio
//   from FIGHT_PROP_NONEXTRA_ATTACK (premod) and writes
//   Actor_WindAddHurtDelta / Actor_{Fire,Water,Elec,Ice}AddHurtDelta (no
//   "Extra": premod). GO reads input.premod.atk into premod anemo/phec dmg_.
//   The premod read is the default; the premod write is declared
//   (writes: CHANNELS.PREMOD in src/js/db/Char/Varka.js). KQM's Varka page
//   lists no ATK/EM/ER interaction test.
// - A1 Sturm multiplier (140%/220%), C1 Lyrical Libation (200%), A4 Azure
//   Fang's Oath stacks, C4 Freedom of Song, C6 CRIT DMG: numeric or flat,
//   no stat read. C2's 800% strike and all other damage hits read total ATK
//   by construction (scaling atk*); nothing to declare.
// - 4-member teams throughout: a smaller team would get Elemental
//   Resonance in our engine but not in the game (md/buff_chains.md).

const PRIORITY_PYRO = {party_varka_priority_element: 'pyro'};

function withConstellation(key, constellation) {
    const build = makeBuild(key);
    build.setCharLevels({level: 90, ascension: 6, constellation});
    return build;
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function anemoBonus(member) {
    return finalStats(member).get('dmg_anemo');
}

function pyroBonus(member) {
    return finalStats(member).get('dmg_pyro');
}

// Varka on field, priority Pyro, A1 in its linear zone (1000 total ATK ->
// 10%). Bennett's burst stays off unless a test switches it on.
function setupBennett() {
    const varka = makeBuild('Varka');
    const bennett = makeBuild('Bennet');
    const team = Team.fromMember(varka);
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(varka);
    varka.setCharSettings(PRIORITY_PYRO);
    bennett.setCharSettings({});
    matchCarrierTotals(varka, {atk_total: 1000});
    return {team, varka, bennett};
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

// Varka on field with Columbina C2 (electro, 30000 HP -> +300 premod ATK).
function setupC2() {
    const varka = makeBuild('Varka');
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(varka);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(varka);
    varka.setCharSettings(PRIORITY_PYRO);
    columbina.setCharSettings(C2_ON);
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(varka, {atk_total: 1000});
    return {team, varka, columbina};
}

describe('Varka A1 reads premod ATK, writes premod DMG%', () => {
    test('solo formula and cap: 10% per 1000 ATK, max 25%', () => {
        const {varka} = setupBennett();
        // No extra ATK present, so premod and total agree: 0.0001 * 1000.
        expect(anemoBonus(varka)).toBeCloseTo(0.10, 8);
        expect(pyroBonus(varka)).toBeCloseTo(0.10, 8);
        // The priority element is the only non-Anemo element written.
        expect(finalStats(varka).get('dmg_cryo') || 0).toBeCloseTo(0, 9);
        // Premod write: the bonus lands outside the extra lanes.
        expect(finalStats(varka).get('dmg_anemo_extra') || 0).toBeCloseTo(0, 9);
        expect(finalStats(varka).get('dmg_pyro_extra') || 0).toBeCloseTo(0, 9);
        matchCarrierTotals(varka, {atk_total: 2000});
        expect(anemoBonus(varka)).toBeCloseTo(0.20, 8);
        matchCarrierTotals(varka, {atk_total: 3000});
        expect(anemoBonus(varka)).toBeCloseTo(0.25, 8);
        expect(pyroBonus(varka)).toBeCloseTo(0.25, 8);
    });

    test('ignores Bennett burst extra ATK', () => {
        const {varka, bennett} = setupBennett();
        const atkBefore = totalAtk(finalStats(varka));
        const anemoBefore = anemoBonus(varka);
        const pyroBefore = pyroBonus(varka);
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const atkAfter = totalAtk(finalStats(varka));
        // Sanity: Bennett applied (extra ATK raises the total).
        expect(atkAfter - atkBefore).toBeGreaterThan(100);
        // A premod read ignores the extra ATK: the bonus does not move.
        expect(anemoBonus(varka) - anemoBefore).toBeCloseTo(0, 8);
        expect(pyroBonus(varka) - pyroBefore).toBeCloseTo(0, 8);
    });

    test('counts Columbina C2 premod ATK', () => {
        const {varka, columbina} = setupC2();
        // 1% of 30000 total HP, premod: Varka (on field) gains 300 ATK.
        const atkOn = totalAtk(finalStats(varka));
        const anemoOn = anemoBonus(varka);
        const pyroOn = pyroBonus(varka);
        columbina.setCharSettings({});
        const atkOff = totalAtk(finalStats(varka));
        const anemoOff = anemoBonus(varka);
        const pyroOff = pyroBonus(varka);
        expect(atkOn - atkOff).toBeCloseTo(300, 6);
        // Game formula: 10% per 1000 ATK of the 300 premod ATK = 3 points.
        expect(anemoOn - anemoOff).toBeCloseTo(0.03, 8);
        expect(pyroOn - pyroOff).toBeCloseTo(0.03, 8);
    });

    test('contrast: Durin A4 (total read) counts Bennett extra ATK in the same team', () => {
        const durin = makeBuild('Durin');
        const bennett = makeBuild('Bennet');
        const varka = makeBuild('Varka');
        const team = Team.fromMember(durin);
        team.setMember(1, bennett);
        team.setMember(2, varka);
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(durin);
        durin.setCharSettings({durin_primordial_fusion: true});
        varka.setCharSettings(PRIORITY_PYRO);
        bennett.setCharSettings({});
        matchCarrierTotals(durin, {atk_total: 1000});
        matchCarrierTotals(varka, {atk_total: 1000});
        const durinBefore = finalStats(durin).get('dmg_burst_periodic_special');
        const varkaBefore = anemoBonus(varka);
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        // Durin A4 reads total ATK (3% per 100 ATK): it moves with the extra
        // ATK. Varka A1 reads premod ATK: it does not.
        const durinMove = finalStats(durin).get('dmg_burst_periodic_special') - durinBefore;
        expect(durinMove).toBeGreaterThan(0.01);
        expect(durinMove).toBeCloseTo(0.0003 * (totalAtk(finalStats(durin)) - 1000), 6);
        expect(anemoBonus(varka) - varkaBefore).toBeCloseTo(0, 8);
    });
});
