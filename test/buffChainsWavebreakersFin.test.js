import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, featureValues } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md: Wavebreakers Fin (Watatsumi Wavewalker, Burst DMG from
// the party's combined maximum Energy) keeps the default channels (no
// reads/writes params changed in src/js/db/Weapon/Polearm/WavebreakersFin.js).
//
// - Game data: Weapon_Pole_Maria (ConfigAbility_Weapon_Pole.json,
//   openConfig Weapon_Pole_Maria, EquipAffixExcelConfigData id 113416x:
//   Ratio 0.12-0.24, Max 0.4-0.8) runs GetTeamTotalMaxEnergyToOverridemap
//   into Pole_Maria_TeamEnergy, then TeamEnergy x Ratio / 100 capped at
//   Max_Value into Pole_Maria_BuffValue, applied by a ModifyDamageMixin for
//   Elemental_Burst. No FIGHT_PROP_* read and no Actor_*Delta write
//   (extra_scan lists no markers for it): the read is a static team
//   property (CharTables burst_energy_cost), not an attribute with a
//   premod/extra split, and the ModifyDamageMixin write has no Actor
//   channel (as Emblem's Relic_ElementalBurstUpByChargeEfficiency and
//   Furina's Fanfare bonus, both left at the default). dmg_burst itself has
//   no extra lane (Channels SPLIT_STATS covers only elemental dmg_*).
// - KQM weapons evidence: no Wavebreaker buff-chain test (static energy,
//   no premod/total variant to interact with other stat buffs).
// - GO (Polearm/WavebreakersFin): writes premod burst_dmg_ from a
//   weapon-refinement lookup over the party energy sum; supporting evidence
//   only (as for Emblem, whose premod burst_dmg_ is also the default here).
// - Game text (data/strings/weapons/talent_common.csv,
//   weapon_watatsumi_wavewalker): "For every point of the entire party's
//   combined maximum Energy capacity, the Elemental Burst DMG ... is
//   increased by %{text_percent_bonus}. A maximum of %{text_percent_cap}
//   ... can be achieved". data/raw/weapon_texts.txt has no entry.
// - Display-only FeaturePostEffectValue burst_dmg_bonus reads through the
//   post-effect; the ConditionStaticRefine text_* stats are display text.
//   Conditions write premod by construction.
//
// Game-formula constants (refine R1-R5):
// - rate = 0.12/0.15/0.18/0.21/0.24% per energy = 0.0012-0.0024;
// - cap = 40/50/60/70/80% = 0.40-0.80;
// - bonus = min(cap, rate x sum(team burst_energy_cost)).
// Live energy costs (CharTables burst_energy_cost): Xiangling 80, Raiden 90,
// Ayaka 80, Nahida 50, Yae 90, Eula 80, Sucrose 80, Bennet 60, Skirk 0.
// Only the builds' live energy costs are read from the engine; every
// expected number is computed from those formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const RATES = [0, 0.0012, 0.0015, 0.0018, 0.0021, 0.0024];
const CAPS = [0, 0.40, 0.50, 0.60, 0.70, 0.80];

function holderWithTeam(holderKey, mateKeys, refine = 1) {
    const holder = makeBuild(holderKey);
    holder.setWeapon(DB.Weapons.get('polearm').get('WavebreakersFin'));
    holder.setWeaponLevels({level: 90, ascension: 6, refine});
    const team = Team.fromMember(holder);
    mateKeys.forEach((key, i) => team.setMember(i + 1, makeBuild(key)));
    return {team, holder};
}

function teamEnergy(team) {
    return team.getMembers().reduce((sum, m) => sum + m.getBuildData().stats.get('burst_energy_cost'), 0);
}

function expectedBonus(team, refine) {
    return Math.min(CAPS[refine], RATES[refine] * teamEnergy(team));
}

function wavebreakerBonus(holder) {
    const stats = finalStats(holder);
    const without = holder.getBuildData().stats;
    return {stats, bonus: stats.get('dmg_burst') - without.get('dmg_burst')};
}

describe('Wavebreakers Fin sums party energy', () => {
    test('R1 below cap: 300 energy -> 36% Burst DMG', () => {
        // Xiangling 80 + Raiden 90 + Ayaka 80 + Nahida 50 = 300, all
        // different elements so no resonance.
        const {team, holder} = holderWithTeam('Xiangling', ['RaidenShogun', 'Ayaka', 'Nahida'], 1);
        expect(teamEnergy(team)).toBe(300);
        const {stats, bonus} = wavebreakerBonus(holder);
        expect(bonus).toBeCloseTo(0.36, 9);
        expect(bonus).toBeCloseTo(expectedBonus(team, 1), 12);
        // No extra stats present: solo parity, the formula is the bonus.
        expect(stats.get('mastery_extra') || 0).toBe(0);
        expect(stats.get('recharge_extra') || 0).toBe(0);
        // Display feature matches (percent format).
        expect(featureValues(holder)['weapon.burst_dmg_bonus'][0]).toBeCloseTo(36, 6);
        // Teammates get nothing: the bonus is holder-only.
        expect(finalStats(team.getMember(1)).get('dmg_burst')).toBeCloseTo(0, 9);
    });

    test('R1 at cap: 340 energy -> capped at 40%', () => {
        // Xiangling 80 + Raiden 90 + Yae 90 + Eula 80 = 340;
        // 340 x 0.0012 = 40.8% capped to 40%.
        const {team, holder} = holderWithTeam('Xiangling', ['RaidenShogun', 'YaeMiko', 'Eula'], 1);
        expect(teamEnergy(team)).toBe(340);
        const {bonus} = wavebreakerBonus(holder);
        expect(bonus).toBeCloseTo(0.40, 9);
        expect(bonus).toBeCloseTo(expectedBonus(team, 1), 12);
        expect(featureValues(holder)['weapon.burst_dmg_bonus'][0]).toBeCloseTo(40, 6);
    });

    test('R5: 300 energy -> 72%, 340 energy -> capped at 80%', () => {
        const below = holderWithTeam('Xiangling', ['RaidenShogun', 'Ayaka', 'Nahida'], 5);
        expect(teamEnergy(below.team)).toBe(300);
        expect(wavebreakerBonus(below.holder).bonus).toBeCloseTo(0.72, 9);
        const capped = holderWithTeam('Xiangling', ['RaidenShogun', 'YaeMiko', 'Eula'], 5);
        expect(teamEnergy(capped.team)).toBe(340);
        // 340 x 0.0024 = 81.6% capped to 80%.
        expect(wavebreakerBonus(capped.holder).bonus).toBeCloseTo(0.80, 9);
    });

    test('counts real teammates, including zero-cost Skirk', () => {
        // Below the cap so the delta is clean: 300 -> 220.
        const {team, holder} = holderWithTeam('Xiangling', ['RaidenShogun', 'Ayaka', 'Nahida'], 1);
        const before = wavebreakerBonus(holder).bonus;
        expect(before).toBeCloseTo(300 * 0.0012, 9);
        // Swap Ayaka (80) for Skirk (0): sum 300 -> 220.
        team.setMember(2, makeBuild('Skirk'));
        expect(teamEnergy(team)).toBe(220);
        const after = wavebreakerBonus(holder).bonus;
        expect(after).toBeCloseTo(220 * 0.0012, 9);
        expect(before - after).toBeCloseTo(80 * 0.0012, 9);
    });
});

describe('Wavebreakers Fin reads static energy only', () => {
    // Xiangling 80 + Sucrose 80 + Nahida 50 + Bennet 60 = 270 -> 32.4% R1.
    function buffTeam() {
        const {team, holder} = holderWithTeam('Xiangling', ['Sucrose', 'Nahida', 'Bennet'], 1);
        team.setOnFieldMember(holder);
        const sucrose = team.getMember(1);
        const nahida = team.getMember(2);
        const bennet = team.getMember(3);
        sucrose.setCharSettings({});
        nahida.setCharSettings({});
        bennet.setCharSettings({});
        // Matched with every effect off, so these are premod values.
        matchCarrierTotals(sucrose, {mastery_total: 600});
        matchCarrierTotals(nahida, {mastery_total: 900});
        return {team, holder, sucrose, nahida, bennet};
    }

    test('ignores Sucrose A4, Nahida A1 and Bennett burst (extra stats)', () => {
        const {team, holder, sucrose, nahida, bennet} = buffTeam();
        expect(teamEnergy(team)).toBe(270);
        const solo = wavebreakerBonus(holder).bonus;
        expect(solo).toBeCloseTo(270 * 0.0012, 9);

        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
        bennet.setCharSettings({bennet_fantastic_voyage: true});

        // The extra buffs land (so the test is meaningful): Sucrose shares
        // 20% x 600 = 120, Nahida adds 25% x 900 = 225 (cap 250).
        const stats = finalStats(holder);
        expect(stats.get('mastery_extra') || 0).toBeCloseTo(120 + 225, 6);
        expect(totalMastery(stats)).toBeGreaterThan(totalMastery(holder.getBuildData().stats));
        // ... but the static-energy bonus does not move.
        expect(wavebreakerBonus(holder).bonus).toBeCloseTo(solo, 9);
        expect(wavebreakerBonus(holder).bonus).toBeCloseTo(expectedBonus(team, 1), 12);
    });
});
