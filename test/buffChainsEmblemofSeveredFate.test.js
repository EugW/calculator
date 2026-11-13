import { setControlsOff } from '../src/js/classes/ArtifactSetProfile';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeSetArtifacts } from './support/baseline';
import { finalStats, makeBuild, totalMastery } from './support/team';

global.DB = DB;

// md/buff_chains.md: Emblem of Severed Fate 4pc (Burst DMG +25% of ER, max
// 75%) reads premod ER: the game's Relic_ElementalBurstUpByChargeEfficiency
// reads FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY, and KQM (weapons evidence,
// "Xiphos and Raiden A4 Interactions"; Electro Traveler evidence) says
// neither Xiphos' nor the amulets' ER affects it. A 4-member team avoids our
// 2-member Elemental Resonance.

function setup() {
    const raiden = makeBuild('RaidenShogun');
    const bennet = makeBuild('Bennet');
    bennet.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    bennet.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const team = Team.fromMember(raiden);
    team.setMember(1, bennet);
    team.setMember(2, makeBuild('Xingqiu'));
    team.setMember(3, makeBuild('Diona'));
    team.setOnFieldMember(raiden);
    raiden.replaceArtifacts(makeSetArtifacts('EmblemofSeveredFate').slice(0, 4));
    raiden.setArtifactsSettings(setControlsOff('EmblemofSeveredFate'));
    return {raiden, bennet};
}

function premodEr(stats) {
    return stats.get('recharge_base') + stats.get('recharge') - (stats.get('recharge_extra') || 0);
}

function emblemBonus(raiden) {
    const stats = finalStats(raiden);
    const without = raiden.getBuildData().stats;
    return {stats, bonus: stats.get('dmg_burst') - without.get('dmg_burst')};
}

test('4pc: 25% of premod ER, at most 75%', () => {
    const {raiden} = setup();
    const {stats, bonus} = emblemBonus(raiden);
    expect(stats.get('recharge_extra') || 0).toBe(0);
    expect(bonus).toBeCloseTo(Math.min(0.75, 0.25 * premodEr(stats)), 9);
});

test("4pc ignores Xiphos' party ER (extra)", () => {
    const {raiden, bennet} = setup();
    const before = emblemBonus(raiden);
    bennet.setWeaponSettings({whisper_of_the_jinn: true});
    const carrierStats = finalStats(bennet);
    const carrierEm = totalMastery(carrierStats) - (carrierStats.get('mastery_extra') || 0);
    const after = emblemBonus(raiden);

    // The Xiphos ER reaches Raiden's total as extra ER.
    expect(after.stats.get('recharge_extra')).toBeCloseTo(0.0108 * carrierEm / 100, 9);
    expect(premodEr(after.stats)).toBeCloseTo(premodEr(before.stats), 9);
    // The bonus stays where the premod ER puts it.
    expect(after.bonus).toBeCloseTo(before.bonus, 9);
});
