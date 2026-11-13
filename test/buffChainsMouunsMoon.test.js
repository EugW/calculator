import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, featureValues } from './support/team';

global.DB = DB;

// md/buff_chains.md worker: Mouuns Moon (Watatsumi Wavewalker, Burst DMG from
// the party's combined max Energy) keeps the default channels (no
// reads/writes params changed in src/js/db/Weapon/Bow/MouunsMoon.js).
//
// - Read: game data Weapon_Bow_Maria (ConfigAbility_Weapon_Bow.json)
//   runs GetTeamTotalMaxEnergyToOverridemap into Bow_Maria_TeamEnergy, then
//   SetGlobalValue _ABILITY_Bow_Maria_BuffValue = TeamEnergy x Ratio / 100
//   capped at Max_Value. Burst energy costs are a static property nothing
//   writes; the ability contains no FIGHT_PROP_* read at all.
// - Write: ModifyDamageMixin grants damagePercentageRatio Bow_Maria_BuffValue
//   on attackTags Elemental_Burst: a hit-level Burst bonus with no
//   Actor_*Delta write, so no premod/extra channel applies (our engine keeps
//   no extra lane for dmg_burst either).
// - Refinement values (EquipAffixExcelConfigData id 115416, openConfig
//   Weapon_Bow_Maria): R1-R5 Ratio 0.12-0.24, cap 40-80, matching the content
//   tables. md/tools/extra_scan.js flags 54 abilities; Maria is not one.
// - KQM weapons evidence has no Wavewalker buff-chain test (none expected
//   for a static input). GO (Bow/MouunsMoon) writes premod burst_dmg_;
//   supporting evidence only, behaviorally the same here.
// - Game text (data/raw/weapon_texts.txt): the mouuns_moon entry is empty;
//   the identical akuoumaru passive reads "For every point of the entire
//   party's combined maximum Energy capacity, the Elemental Burst DMG of the
//   character equipping this weapon is increased by 0.12%. A maximum of 40%
//   increased Elemental Burst DMG can be achieved this way."
// - ConditionStaticRefine text_percent_bonus/cap and the
//   FeaturePostEffectValue burst_dmg_bonus are display-only.
//
// Game-formula constants used below:
// - bonus = min(rate x teamEnergy, cap): R1 0.0012/0.40, R5 0.0024/0.80;
// - burst costs read live from the engine (Fischl 60, Bennet 60, Xingqiu 80,
//   Sucrose 80, Nahida 50);
// - Nahida A1 = 25% of the highest premod EM, cap 250 (extra); Bennett burst
//   = extra ATK; Xiphos Moonlight R1 party = 30% of 0.036% per wielder premod
//   EM = 0.0108% per EM, written extra.
// Only the builds' live inputs (members' static burst costs, carriers'
// premod EM, holder base ATK/ER) are read from the engine; every expected
// number is computed from those formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md). All teams
// below use four distinct elements, so no resonance applies.

const R1_RATE = 0.12 / 100;
const R1_CAP = 40 / 100;
const R5_RATE = 0.24 / 100;
const R5_CAP = 80 / 100;

// Fischl (electro bow holder) + Bennet (pyro) + Xingqiu (hydro, Xiphos R1) +
// Sucrose (anemo): 60 + 60 + 80 + 80 = 280 energy.
function setup() {
    const fischl = makeBuild('Fischl');
    fischl.setWeapon(DB.Weapons.get('bow').get('MouunsMoon'));
    fischl.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const bennet = makeBuild('Bennet');
    const xingqiu = makeBuild('Xingqiu');
    xingqiu.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    xingqiu.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const sucrose = makeBuild('Sucrose');
    const team = Team.fromMember(fischl);
    team.setMember(1, bennet);
    team.setMember(2, xingqiu);
    team.setMember(3, sucrose);
    team.setOnFieldMember(fischl);
    bennet.setCharSettings({bennet_fantastic_voyage: false});
    xingqiu.setWeaponSettings({whisper_of_the_jinn: false});
    sucrose.setCharSettings({});
    return {team, fischl, bennet, xingqiu, sucrose};
}

function teamEnergy(team) {
    return team.getMembers().reduce((sum, m) => sum + m.getBuildData().stats.get('burst_energy_cost'), 0);
}

function expectedBonus(energy, rate, cap) {
    return Math.min(rate * energy, cap);
}

function bonusOf(fischl) {
    return finalStats(fischl).get('dmg_burst');
}

function displayOf(fischl) {
    const values = featureValues(fischl);
    const key = Object.keys(values).find((name) => name.endsWith('burst_dmg_bonus'));
    expect(key).toBeTruthy();
    // The display feature uses format 'percent' (x100); the stat is a ratio.
    return values[key][0] / 100;
}

function burstHitOf(fischl) {
    const values = featureValues(fischl);
    const key = Object.keys(values).find((name) => name.endsWith('burst.burst_dmg'));
    expect(key).toBeTruthy();
    return values[key][0];
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function premodEr(stats) {
    return stats.get('recharge_base') + stats.get('recharge') - (stats.get('recharge_extra') || 0);
}

describe('Mouuns Moon bonus from team energy', () => {
    test('solo numbers R1: 0.12% per energy, display matches', () => {
        const {team, fischl} = setup();
        const energy = teamEnergy(team);
        expect(energy).toBe(280);
        const expected = expectedBonus(energy, R1_RATE, R1_CAP);
        expect(expected).toBeCloseTo(0.336, 9);
        expect(expected).toBeLessThan(R1_CAP);
        expect(bonusOf(fischl)).toBeCloseTo(expected, 9);
        expect(displayOf(fischl)).toBeCloseTo(expected, 9);
    });

    test('solo numbers R5: 0.24% per energy', () => {
        const {team, fischl} = setup();
        fischl.setWeaponLevels({level: 90, ascension: 6, refine: 5});
        const energy = teamEnergy(team);
        const expected = expectedBonus(energy, R5_RATE, R5_CAP);
        expect(expected).toBeCloseTo(0.672, 9);
        expect(expected).toBeLessThan(R5_CAP);
        expect(bonusOf(fischl)).toBeCloseTo(expected, 9);
        expect(displayOf(fischl)).toBeCloseTo(expected, 9);
    });

    test('counts team energy: Sucrose (80) for Nahida (50) moves the bonus', () => {
        const {team, fischl} = setup();
        const before = bonusOf(fischl);
        expect(before).toBeCloseTo(expectedBonus(teamEnergy(team), R1_RATE, R1_CAP), 9);
        const nahida = makeBuild('Nahida');
        nahida.setCharSettings({});
        team.setMember(3, nahida);
        const after = bonusOf(fischl);
        // Delta from the game formula: 0.12% x (50 - 80) = -3.6 points.
        expect(teamEnergy(team)).toBe(250);
        expect(after - before).toBeCloseTo(R1_RATE * (50 - 80), 9);
        expect(after).toBeCloseTo(expectedBonus(250, R1_RATE, R1_CAP), 9);
    });
});

describe('Mouuns Moon reads no attribute', () => {
    test('ignores Nahida A1 extra EM', () => {
        const {team, fischl} = setup();
        const nahida = makeBuild('Nahida');
        team.setMember(3, nahida);
        nahida.setCharSettings({});
        const before = bonusOf(fischl);
        const emBefore = totalMastery(finalStats(fischl));
        nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
        // Sanity: the holder actually gained extra EM.
        expect(totalMastery(finalStats(fischl)) - emBefore).toBeGreaterThan(1);
        expect(bonusOf(fischl)).toBeCloseTo(before, 9);
    });

    test('ignores Bennett burst extra ATK', () => {
        const {bennet, fischl} = setup();
        const before = bonusOf(fischl);
        const atkBefore = totalAtk(finalStats(fischl));
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        // Sanity: the burst actually raised the holder's ATK.
        expect(totalAtk(finalStats(fischl)) - atkBefore).toBeGreaterThan(10);
        expect(bonusOf(fischl)).toBeCloseTo(before, 9);
    });

    test('ignores Xiphos party extra ER', () => {
        const {xingqiu, fischl} = setup();
        const before = bonusOf(fischl);
        const erBefore = finalStats(fischl).get('recharge_base') + finalStats(fischl).get('recharge');
        xingqiu.setWeaponSettings({whisper_of_the_jinn: true});
        const stats = finalStats(fischl);
        // Sanity: the holder actually gained extra ER.
        expect(stats.get('recharge_extra') || 0).toBeGreaterThan(0);
        expect(stats.get('recharge_base') + stats.get('recharge') - erBefore)
            .toBeCloseTo(stats.get('recharge_extra') || 0, 9);
        expect(bonusOf(fischl)).toBeCloseTo(before, 9);
    });
});

describe('Mouuns Moon writes only Burst DMG', () => {
    test('no extra lane: ATK/EM/ER totals stay while the bonus moves', () => {
        const {team, fischl} = setup();
        const atkBefore = totalAtk(finalStats(fischl));
        const emBefore = totalMastery(finalStats(fischl));
        const erBefore = premodEr(finalStats(fischl));
        const bonusBefore = bonusOf(fischl);
        const nahida = makeBuild('Nahida');
        nahida.setCharSettings({});
        team.setMember(3, nahida);
        const stats = finalStats(fischl);
        expect(bonusOf(fischl) - bonusBefore).toBeCloseTo(R1_RATE * (50 - 80), 9);
        expect(totalAtk(stats)).toBeCloseTo(atkBefore, 9);
        expect(totalMastery(stats)).toBeCloseTo(emBefore, 9);
        expect(premodEr(stats)).toBeCloseTo(erBefore, 9);
        expect(stats.get('dmg_burst_extra') || 0).toBe(0);
    });

    test("holder's Burst hits count the bonus (damage reads the total)", () => {
        const {team, fischl} = setup();
        const bonusBefore = bonusOf(fischl);
        const hitBefore = burstHitOf(fischl);
        const nahida = makeBuild('Nahida');
        nahida.setCharSettings({});
        team.setMember(3, nahida);
        const bonusAfter = bonusOf(fischl);
        const hitAfter = burstHitOf(fischl);
        // Nothing else on the holder moves (previous test), so the hit
        // scales with 1 + Burst bonus exactly.
        expect(hitAfter).toBeCloseTo(hitBefore * (1 + bonusAfter) / (1 + bonusBefore), 9);
    });
});
