import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md worker: Yaoyao.
//
// - C4 Winsome (mastery_bonus, 0.3% of Max HP, cap 120) reads the TOTAL HP:
//   Avatar_Yaoyao_Constellation_4 computes FIGHT_PROP_MAX_HP *
//   Yaoyao_Constellation_4_Ratio into Actor_ElemMasteryExtraDelta (extra EM).
//   No ability writes extra HP, so premod and total HP agree today; the tests
//   lock the formula and the counted side (premod HP such as Hydro
//   resonance). GO reads input.premod.hp here (a guess against the data).
//   The write stays extra (the default): no premod EM reader reads Yaoyao's
//   EM, so the forbidden chain has no teammate observer today; the observable
//   is her total EM.
// - A1 Starscatter throws radishes (no stat read). A4 In Others' Shoes heals
//   0.8% of Max HP (amountByCasterMaxHPRatio; heals read the total and need
//   nothing), as do the skill/burst/C6 heals (scaling 'hp*', already total).
// - C1's 15% Dendro DMG is a flat toggle (conditions are premod, as usual).
// - KQM has no Yaoyao EM/HP-interaction test.
//
// A 4-member team is used throughout: a 2-member team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

// Game formula for C4 at a given Max HP.
function expectedBonus(hp) {
    return Math.min(0.003 * hp, 120);
}

// Yaoyao plus three neutral members; all four elements differ, so no
// Elemental Resonance applies.
function neutralTeam() {
    const yaoyao = makeBuild('Yaoyao');
    yaoyao.setCharLevels({level: 90, ascension: 6, constellation: 4});
    const eula = makeBuild('Eula');
    const hutao = makeBuild('Hutao');
    const sucrose = makeBuild('Sucrose');
    const team = Team.fromMember(eula);
    team.setMember(1, yaoyao);
    team.setMember(2, hutao);
    team.setMember(3, sucrose);
    team.setOnFieldMember(eula);
    return {team, yaoyao};
}

function bonusOf(yaoyao) {
    return totalMastery(finalStats(yaoyao)) - yaoyaoOffEm(yaoyao);
}

// Yaoyao's EM with C4 off: her premod EM plus unrelated shares.
function yaoyaoOffEm(yaoyao) {
    yaoyao.setCharSettings({yaoyao_winsome: false});
    const em = totalMastery(finalStats(yaoyao));
    yaoyao.setCharSettings({yaoyao_winsome: true});
    return em;
}

test('C4 formula parity: 0.3% of Max HP, cap 120 (binds at 40k)', () => {
    const {yaoyao} = neutralTeam();
    yaoyao.setCharSettings({yaoyao_winsome: true});

    for (const hp of [20000, 40000, 50000]) {
        matchCarrierTotals(yaoyao, {hp_total: hp});
        expect(totalHp(finalStats(yaoyao))).toBeCloseTo(hp, 6);
        expect(totalMastery(finalStats(yaoyao)) - yaoyaoOffEm(yaoyao))
            .toBeCloseTo(expectedBonus(hp), 6);
    }
    // 20k -> 60; 40k -> 120 (cap); 50k stays 120.
    expect(expectedBonus(20000)).toBeCloseTo(60, 9);
    expect(expectedBonus(40000)).toBeCloseTo(120, 9);
    expect(expectedBonus(50000)).toBeCloseTo(120, 9);
});

test('C4 counts premod HP: Hydro resonance follows the formula', () => {
    // Resonance team: Hydro pair -> +25% Max HP (a stage-0 premod condition).
    const yaoyao = makeBuild('Yaoyao');
    yaoyao.setCharLevels({level: 90, ascension: 6, constellation: 4});
    const eula = makeBuild('Eula');
    const team = Team.fromMember(eula);
    team.setMember(1, yaoyao);
    team.setMember(2, makeBuild('Barbara'));
    team.setMember(3, makeBuild('Xingqiu'));
    team.setOnFieldMember(eula);
    yaoyao.setCharSettings({yaoyao_winsome: true});

    // Same Yaoyao build without resonance: dendro/hydro/cryo/anemo, no pair.
    const plain = makeBuild('Yaoyao');
    plain.setCharLevels({level: 90, ascension: 6, constellation: 4});
    const eula2 = makeBuild('Eula');
    const team2 = Team.fromMember(eula2);
    team2.setMember(1, plain);
    team2.setMember(2, makeBuild('Barbara'));
    team2.setMember(3, makeBuild('Sucrose'));
    team2.setOnFieldMember(eula2);
    plain.setCharSettings({yaoyao_winsome: true});

    const hpR = totalHp(finalStats(yaoyao));
    const hpN = totalHp(finalStats(plain));
    // Sanity: resonance actually raised Yaoyao's HP% by 25 points.
    expect(finalStats(yaoyao).get('hp_percent') - finalStats(plain).get('hp_percent'))
        .toBeCloseTo(0.25, 8);
    expect(bonusOf(yaoyao)).toBeCloseTo(expectedBonus(hpR), 6);
    expect(bonusOf(plain)).toBeCloseTo(expectedBonus(hpN), 6);
    // The whole resonance gain is counted: the difference follows the formula
    // (both below the cap here).
    expect(bonusOf(yaoyao) - bonusOf(plain)).toBeCloseTo(0.003 * (hpR - hpN), 6);
});

test('C4 ignores extra EM (Nahida A1, Sucrose A4) and Bennett burst ATK', () => {
    const yaoyao = makeBuild('Yaoyao');
    yaoyao.setCharLevels({level: 90, ascension: 6, constellation: 4});
    const nahida = makeBuild('Nahida');
    const sucrose = makeBuild('Sucrose');
    const fischl = makeBuild('Fischl');
    const team = Team.fromMember(yaoyao);
    team.setMember(1, nahida);
    team.setMember(2, sucrose);
    team.setMember(3, fischl);
    team.setOnFieldMember(yaoyao);
    yaoyao.setCharSettings({yaoyao_winsome: true});
    matchCarrierTotals(nahida, {mastery_total: 900});
    matchCarrierTotals(sucrose, {mastery_total: 600});

    const before = bonusOf(yaoyao);
    const emBase = totalMastery(finalStats(yaoyao));

    // Sucrose A4: 20% of 600 = 120 extra EM on the on-field Yaoyao.
    sucrose.setCharSettings({sucrose_mollis_favonius: true});
    expect(totalMastery(finalStats(yaoyao)) - emBase).toBeCloseTo(120, 4);
    // Nahida A1: 25% of 900 = 225 extra EM on top.
    nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
    expect(totalMastery(finalStats(yaoyao)) - emBase).toBeCloseTo(120 + 225, 4);
    // Neither extra-EM buff moves the HP-scaled C4 bonus.
    expect(bonusOf(yaoyao)).toBeCloseTo(before, 8);

    // Bennett's burst ATK is extra ATK on the on-field Yaoyao; the C4 reads
    // HP, so it must not move either.
    const bennett = makeBuild('Bennet');
    team.setMember(3, bennett);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const atkBefore = finalStats(yaoyao).get('atk');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(finalStats(yaoyao).get('atk') - atkBefore).toBeGreaterThan(10);
    expect(bonusOf(yaoyao)).toBeCloseTo(before, 8);
});
