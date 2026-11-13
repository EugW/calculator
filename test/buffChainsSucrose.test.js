import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { featureValues, finalStats, makeBuild, totalMastery } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Sucrose):
// - A4 Mollis Favonius (20% of her EM to the others) reads premod EM: the
//   game (Avatar_Sucrose_PermanentSkill_NetherWind,
//   UNIQUE_Avatar_Sucrose_PermanentSkill_NetherWind_Buff) computes
//   Actor_ElemMasteryExtraDelta (extra) from FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY.
//   KQM: flat EM (Albedo A4, Kazuha C2) counts; Nahida A1 and Key of
//   Khaj-Nisut extra EM do not. GO reads input.premod.eleMas into
//   teamBuff.total.eleMas. The default channels are confirmed, so premod
//   writers (Kazuha C2) count and extra writers (Nahida A1, Key party EM)
//   do not.
// - A1 Catalyst Conversion (flat +50 EM): the game writes
//   Actor_ElemMasteryDelta (premod, no Extra) with no stat read. Conditions
//   write premod: default confirmed, no params.
// - C6 Chaotic Entropy (flat +20% absorbed-element DMG): the game writes
//   Actor_*AddHurtDelta (premod, no Extra) with no stat read. Conditions
//   write premod: default confirmed, no params.
// - Damage hits read the total and need nothing.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const NAHIDA_A1 = {nahida_compassion_illuminated: true, nahida_illusory_heart: true};
const SUCROSE_A4 = {sucrose_mollis_favonius: true};

function setup() {
    const sucrose = makeBuild('Sucrose');
    const kazuha = makeBuild('Kazuha');
    const nahida = makeBuild('Nahida');
    const xiangling = makeBuild('Xiangling');
    const team = Team.fromMember(sucrose);
    team.setMember(1, kazuha);
    team.setMember(2, nahida);
    team.setMember(3, xiangling);
    team.setOnFieldMember(xiangling);
    kazuha.setCharLevels({level: 90, ascension: 6, constellation: 2});
    sucrose.setCharSettings({});
    kazuha.setCharSettings({});
    nahida.setCharSettings({});
    // Totals matched with every effect off, so they are premod values.
    matchCarrierTotals(sucrose, {mastery_total: 600});
    matchCarrierTotals(nahida, {mastery_total: 900});
    matchCarrierTotals(kazuha, {mastery_total: 500});
    return {team, sucrose, kazuha, nahida, xiangling};
}

// The A4 share on the receiver, isolated from every other team EM buff by
// toggling Sucrose's A4 (toggling it moves no premod EM, so Nahida's A1 and
// the receiver's own buffs stay constant).
function a4Share(sucrose, receiver) {
    const before = totalMastery(finalStats(receiver));
    sucrose.setCharSettings(SUCROSE_A4);
    const after = totalMastery(finalStats(receiver));
    sucrose.setCharSettings({});
    return after - before;
}

describe('Sucrose A4 reads premod EM', () => {
    test('solo numbers: 20% of premod EM, display matches', () => {
        const {sucrose, xiangling} = setup();
        expect(totalMastery(finalStats(sucrose))).toBeCloseTo(600, 6);
        // No extra EM present: premod and total agree.
        expect(a4Share(sucrose, xiangling)).toBeCloseTo(0.2 * 600, 8);
        // The feature panel shows the same premod-based value.
        expect(featureValues(sucrose)['other.sucrose_mastery_bonus'][0]).toBeCloseTo(0.2 * 600, 8);
    });

    test('counts Kazuha C2 flat EM (premod)', () => {
        const {sucrose, kazuha, xiangling} = setup();
        kazuha.setCharSettings({kaedehara_kazuha_yamaarashi_tailwind: true});
        // C2 writes Actor_ElemMasteryDelta (premod): +200 on Sucrose.
        expect(totalMastery(finalStats(sucrose))).toBeCloseTo(600 + 200, 6);
        expect(a4Share(sucrose, xiangling)).toBeCloseTo(0.2 * (600 + 200), 8);
    });

    test('ignores Nahida A1 extra EM', () => {
        const {team, sucrose, nahida, xiangling} = setup();
        // Nahida A1 reaches the on-field member only: put Sucrose on field.
        team.setOnFieldMember(sucrose);
        nahida.setCharSettings(NAHIDA_A1);
        // 25% of the highest premod EM (900) = 225, under the 250 cap.
        expect(totalMastery(finalStats(sucrose))).toBeCloseTo(600 + 225, 6);
        expect(a4Share(sucrose, xiangling)).toBeCloseTo(0.2 * 600, 8);
        // The display copy ignores it too.
        expect(featureValues(sucrose)['other.sucrose_mastery_bonus'][0]).toBeCloseTo(0.2 * 600, 8);
    });

    test('ignores Key of Khaj-Nisut party EM (extra)', () => {
        const {sucrose, kazuha, xiangling} = setup();
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        // The Key scales on max HP: raise it so the party share is visible.
        matchCarrierTotals(kazuha, {hp_total: 40000, mastery_total: 500});
        // The extra party EM reaches Sucrose ...
        expect(totalMastery(finalStats(sucrose)) - 600).toBeGreaterThan(5);
        // ... but her premod-read A4 share stays 20% of 600.
        expect(a4Share(sucrose, xiangling)).toBeCloseTo(0.2 * 600, 8);
    });
});

describe('Sucrose A1 shares flat EM with matching elements only', () => {
    test('pyro receiver gains 50, others and Sucrose gain nothing', () => {
        const {sucrose, nahida, xiangling} = setup();
        const before = (member) => totalMastery(finalStats(member));
        const xianglingBefore = before(xiangling);
        const nahidaBefore = before(nahida);
        const sucroseBefore = before(sucrose);
        sucrose.setCharSettings({sucrose_catalyst_conversion: 'pyro'});
        expect(totalMastery(finalStats(xiangling)) - xianglingBefore).toBeCloseTo(50, 8);
        expect(totalMastery(finalStats(nahida)) - nahidaBefore).toBeCloseTo(0, 8);
        expect(totalMastery(finalStats(sucrose)) - sucroseBefore).toBeCloseTo(0, 8);
        sucrose.setCharSettings({});
    });
});

describe('Sucrose C6 grants flat absorbed-element DMG', () => {
    test('pyro 20%, only the absorbed element', () => {
        const {sucrose, xiangling} = setup();
        sucrose.setCharLevels({level: 90, ascension: 6, constellation: 6});
        const before = finalStats(xiangling);
        sucrose.setCharSettings({sucrose_chaotic_entropy: 'pyro'});
        const after = finalStats(xiangling);
        expect(after.get('dmg_pyro') - before.get('dmg_pyro')).toBeCloseTo(0.2, 8);
        expect(after.get('dmg_hydro') - before.get('dmg_hydro')).toBeCloseTo(0, 8);
        sucrose.setCharSettings({});
    });
});
