import { CHANNELS } from "../src/js/classes/PostEffect/Channels";
import { PostEffectStats } from "../src/js/classes/PostEffect/Stats";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, withSource } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Jadefalls Splendor (all refinements).
// Primordial Jade Regalia: 0.3%/0.5%/0.7%/0.9%/1.1% Elemental DMG Bonus per
// 1000 Max HP, capped at 12%/20%/28%/36%/44% (the R1 cap binds at 40k HP).
// - Read: the game computes CurBuff from FIGHT_PROP_MAX_HP (total) times
//   HPConvertRatio in Weapon_Catalyst_Morax (affix 114505: R1 0.003 and 0.12).
//   GO reads input.total.hp (its comment guesses a premod read but leaves it
//   as total for formatting). KQM has no chain test for this weapon.
//   Declared reads: TOTAL. No ability writes extra HP, so premod and total HP
//   agree today; the tests lock the formula and the counted side (premod HP
//   such as Hydro resonance).
// - Write: UNIQUE_Weapon_Catalyst_Morax_Buff writes Actor_*AddHurtDelta (no
//   "Extra"): premod, so `writes: CHANNELS.PREMOD`. GO writes the bonus under
//   premod as well. Contrast Kazuha's A4, which writes
//   Actor_*AddHurtExtraDelta (extra). Proven by the empty extra lane below.
// The Primordial Jade Regalia energy restore (ReviveElemEnergy, 4.5 at R1) is
// not a stat write. The FeaturePostEffectValue is only a display of the same
// post-effect: no stat read of its own.
// A 4-member team of four different elements is used throughout: a smaller
// team would get Elemental Resonance in our engine but not in the game
// (md/buff_chains.md).

const RATES = [0.0003, 0.0005, 0.0007, 0.0009, 0.0011];
const CAPS = [12, 20, 28, 36, 44];

// Game formula for the DMG bonus (decimal) at a given Max HP and refinement.
function expectedBonus(hp, refine = 1) {
    return Math.min(RATES[refine - 1] * hp, CAPS[refine - 1]) / 100;
}

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function bonusOf(holder) {
    return finalStats(holder).get('dmg_dendro') || 0;
}

function extraOf(holder) {
    return finalStats(holder).get('dmg_dendro_extra') || 0;
}

// Baizhu holds Jadefall (dendro catalyst); Eula, Barbara and Hutao keep the
// four elements distinct, so no Elemental Resonance applies.
function holderTeam(sourcePostEffects) {
    const holder = makeBuild('Baizhu');
    holder.setWeapon(DB.Weapons.get('catalyst').get('JadefallsSplendor'));
    holder.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    if (sourcePostEffects) withSource(holder, [], sourcePostEffects);
    const eula = makeBuild('Eula');
    const team = Team.fromMember(eula);
    team.setMember(1, holder);
    team.setMember(2, makeBuild('Barbara'));
    team.setMember(3, makeBuild('Hutao'));
    team.setOnFieldMember(eula);
    return {team, holder};
}

function weaponOn(holder) {
    holder.setWeaponSettings({weapon_jadefalls_splendor: true});
}

function weaponOff(holder) {
    holder.setWeaponSettings({weapon_jadefalls_splendor: false});
}

test("formula parity R1/R5 with caps; off gives nothing; extra lane stays empty", () => {
    const {holder} = holderTeam();

    // Baizhu's A1 (Five Fortunes Forever) gives a flat +25% Dendro DMG, so the
    // Jadefall bonus is measured on top of that baseline.
    weaponOff(holder);
    const base = bonusOf(holder);
    expect(base).toBeCloseTo(0.25, 8);

    weaponOn(holder);
    for (const hp of [30000, 40000, 50000]) {
        matchCarrierTotals(holder, {hp_total: hp});
        expect(totalHp(finalStats(holder))).toBeCloseTo(hp, 6);
        expect(bonusOf(holder)).toBeCloseTo(base + expectedBonus(hp), 8);
        // Premod write: nothing lands in the extra lane.
        expect(extraOf(holder)).toBeCloseTo(0, 9);
    }
    // 30k -> 9%; the 12% cap binds at 40k and holds at 50k.
    expect(expectedBonus(30000)).toBeCloseTo(0.09, 9);
    expect(expectedBonus(40000)).toBeCloseTo(0.12, 9);
    expect(expectedBonus(50000)).toBeCloseTo(0.12, 9);

    // R5: 1.1% per 1000 HP, capped at 44%.
    holder.setWeaponLevels({level: 90, ascension: 6, refine: 5});
    for (const hp of [30000, 40000]) {
        matchCarrierTotals(holder, {hp_total: hp});
        expect(bonusOf(holder)).toBeCloseTo(base + expectedBonus(hp, 5), 8);
        expect(extraOf(holder)).toBeCloseTo(0, 9);
    }
    expect(expectedBonus(30000, 5)).toBeCloseTo(0.33, 9);
    expect(expectedBonus(40000, 5)).toBeCloseTo(0.44, 9);
});

test("counts Hydro resonance HP (premod) and ignores Bennett burst ATK", () => {
    // Resonance team: Hydro pair -> +25% Max HP (a stage-0 premod condition).
    const holder = makeBuild('Baizhu');
    holder.setWeapon(DB.Weapons.get('catalyst').get('JadefallsSplendor'));
    holder.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const eula = makeBuild('Eula');
    const team = Team.fromMember(eula);
    team.setMember(1, holder);
    team.setMember(2, makeBuild('Barbara'));
    team.setMember(3, makeBuild('Xingqiu'));
    team.setOnFieldMember(eula);
    weaponOn(holder);

    // Same holder build without resonance: dendro/cryo/hydro/pyro, no pair.
    const plain = makeBuild('Baizhu');
    plain.setWeapon(DB.Weapons.get('catalyst').get('JadefallsSplendor'));
    plain.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const eula2 = makeBuild('Eula');
    const team2 = Team.fromMember(eula2);
    team2.setMember(1, plain);
    team2.setMember(2, makeBuild('Barbara'));
    team2.setMember(3, makeBuild('Hutao'));
    team2.setOnFieldMember(eula2);
    weaponOn(plain);

    const hpR = totalHp(finalStats(holder));
    const hpN = totalHp(finalStats(plain));
    // Sanity: resonance actually raised the holder's HP% by 25 points.
    expect(finalStats(holder).get('hp_percent') - finalStats(plain).get('hp_percent')).toBeCloseTo(0.25, 8);
    // Both builds share the +25% A1 baseline, so it cancels in the difference.
    // (Both stay under the 40k R1 cap, so the linear rate applies.)
    expect(hpR).toBeLessThan(40000);
    expect(bonusOf(holder) - bonusOf(plain)).toBeCloseTo(expectedBonus(hpR) - expectedBonus(hpN), 8);
    // The whole resonance gain is counted: the difference follows the formula.
    expect(bonusOf(holder) - bonusOf(plain)).toBeCloseTo(0.0003 * (hpR - hpN) / 100, 8);

    // Bennett's burst ATK is extra ATK on the on-field holder; the bonus reads
    // HP, so it must not move. Bennett is Pyro: still no resonance here.
    team2.setOnFieldMember(plain);
    const bennett = makeBuild('Bennet');
    team2.setMember(3, bennett);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = bonusOf(plain);
    const atkBefore = finalStats(plain).get('atk');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    const after = bonusOf(plain);
    expect(finalStats(plain).get('atk') - atkBefore).toBeGreaterThan(10);
    expect(after).toBeCloseTo(before, 10);
});

test("the holder's own dendro hits count the bonus at the game rate", () => {
    const {holder} = holderTeam();
    weaponOff(holder);
    const base = bonusOf(holder);
    weaponOn(holder);
    const hit = () => holder.calcFeatures(1)['attack.normal_hit_1'].normal;

    matchCarrierTotals(holder, {hp_total: 30000});
    const hit0 = hit();
    expect(hit0).toBeGreaterThan(0);
    // +1000 HP -> +0.3% bonus (R1): the hit scales by the DMG totals ratio.
    // Only custom_buffs.hp changes between the two states, so every other
    // damage factor cancels out.
    matchCarrierTotals(holder, {hp_total: 31000});
    const hit1 = hit();
    expect(hit1 / hit0).toBeCloseTo(
        (1 + base + expectedBonus(31000)) / (1 + base + expectedBonus(30000)), 8);
});

test("total HP read counts a synthetic extra HP write; premod control counts too", () => {
    // No shipped effect writes extra HP (md/buff_chains.md), so the total-vs-
    // premod HP read is told apart with a synthetic HP% write scaling on total
    // ATK (nothing here writes ATK, so the base is stable); the extra lanes
    // pin the rig (Furina A4 precedent: buffChainsFurina.test.js).
    function syntheticHolder(writes) {
        const {holder} = holderTeam([
            new PostEffectStats({
                from: 'atk*',
                // 0.0005 per ATK; the +HP fraction is read back below from
                // the same build's total ATK, so no number is hardcoded.
                percent: new StatTable('hp_percent', [0.05]),
                writes,
            }),
        ]);
        weaponOn(holder);
        return holder;
    }

    const plain = holderTeam().holder;
    weaponOn(plain);
    const plainStats = finalStats(plain);
    const plainHp = totalHp(plainStats);
    const hpBase = plainStats.get('hp_base');
    const totalAtk = plainStats.get('atk_base') * (1 + plainStats.get('atk_percent')) + plainStats.get('atk');
    // Game formula of the rig: hp_base x 0.0005 x total ATK added HP.
    const added = hpBase * (0.05 / 100) * totalAtk;
    expect(added).toBeGreaterThan(10);
    weaponOff(plain);
    const base = bonusOf(plain);

    const extra = syntheticHolder(CHANNELS.TOTAL);
    const extraStats = finalStats(extra);
    expect(totalHp(extraStats)).toBeCloseTo(plainHp + added, 6);
    // The synthetic write is really extra: the fraction sits in the lane.
    expect(extraStats.get('hp_percent_extra') || 0).toBeCloseTo((0.05 / 100) * totalAtk, 9);
    // Total read: the Jadefall bonus grows with the extra HP.
    expect(bonusOf(extra)).toBeCloseTo(base + expectedBonus(plainHp + added), 8);

    const premod = syntheticHolder(CHANNELS.PREMOD);
    const premodStats = finalStats(premod);
    expect(totalHp(premodStats)).toBeCloseTo(plainHp + added, 6);
    // Premod write: nothing lands in the extra lanes.
    expect(premodStats.get('hp_percent_extra') || 0).toBeCloseTo(0, 9);
    expect(premodStats.get('hp_extra') || 0).toBeCloseTo(0, 9);
    // Total reads count premod HP as well.
    expect(bonusOf(premod)).toBeCloseTo(base + expectedBonus(plainHp + added), 8);
});
