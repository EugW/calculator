import { setControlsOff } from '../src/js/classes/ArtifactSetProfile';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeSetArtifacts } from './support/baseline';
import { featureValues, finalStats, makeBuild, totalMastery } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md: Mona's A4 Hydro DMG reads premod (non-extra) ER: the
// game (Avatar_Mona_Talent_ChargeEfficiencyToWaterAddHurt /
// UNIQUE_ChargeEfficiencyToWaterAddHurt_AddValue) computes the bonus from
// FIGHT_PROP_NONEXTRA_CHARGE_EFFICIENCY into Actor_WaterAddHurtExtraDelta,
// and KQM (Electro Traveler evidence) says the amulet ER does not affect
// Mona's A4. The default channels hold, locked in here.
//
// Game-formula constants used below (ascension 6):
// - base ER 100% + 32% ascension = 132% premod with no other ER source;
// - A4 Hydro = 20% x ER_premod (Mona_PermanentSkill_02 = [1, 0.2]);
// - Xiphos Moonlight R1 party: 30% of 0.036% per wielder EM = 0.0108% per
//   EM, written extra (default channels, matching the game);
// - Emblem of Severed Fate 2pc: +20% ER, a plain set bonus (premod; the only
//   extra-ER writers in the game are Xiphos and the Traveler amulet).
// Only the builds' base inputs (carrier premod EM, Mona base ER) are read
// from the engine; every expected number is computed from those formulas.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function setup() {
    const mona = makeBuild('Mona');
    const bennet = makeBuild('Bennet');
    bennet.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
    bennet.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const diona = makeBuild('Diona');
    const fischl = makeBuild('Fischl');
    const team = Team.fromMember(mona);
    team.setMember(1, bennet);
    team.setMember(2, diona);
    team.setMember(3, fischl);
    team.setOnFieldMember(mona);
    return {mona, bennet};
}

function withEmblem(mona) {
    mona.replaceArtifacts(makeSetArtifacts('EmblemofSeveredFate').slice(0, 2));
    mona.setArtifactsSettings(setControlsOff('EmblemofSeveredFate'));
}

function premodEr(stats) {
    return stats.get('recharge_base') + stats.get('recharge') - (stats.get('recharge_extra') || 0);
}

function extraEr(stats) {
    return stats.get('recharge_extra') || 0;
}

function a4Of(mona) {
    return finalStats(mona).get('dmg_hydro');
}

describe('Mona A4 reads premod ER', () => {
    test('solo numbers: base 132% ER, no extra lane', () => {
        const {mona} = setup();
        const stats = finalStats(mona);
        expect(extraEr(stats)).toBe(0);
        // 100% base + 32% ascension.
        expect(premodEr(stats)).toBeCloseTo(1.32, 9);
        // 20% x 1.32.
        expect(a4Of(mona)).toBeCloseTo(0.264, 9);
    });

    test('counts premod ER: Emblem 2pc moves A4', () => {
        const {mona} = setup();
        withEmblem(mona);
        const stats = finalStats(mona);
        // Still no extra ER anywhere: a set bonus is premod.
        expect(extraEr(stats)).toBe(0);
        expect(premodEr(stats)).toBeCloseTo(1.52, 9);
        // +0.2 ER: Hydro +0.04.
        expect(a4Of(mona)).toBeCloseTo(0.304, 9);
    });

    test('ignores extra ER: Xiphos party ER does not move A4', () => {
        const {mona, bennet} = setup();
        const soloA4 = a4Of(mona);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        // The carrier's premod EM is the buff's input (Xiphos reads non-extra
        // EM in the game); the 0.0108 R1 party rate is the game formula.
        const carrierStats = finalStats(bennet);
        const carrierEm = totalMastery(carrierStats) - (carrierStats.get('mastery_extra') || 0);
        const expectedExtra = 0.0108 * carrierEm / 100;

        const stats = finalStats(mona);
        expect(extraEr(stats)).toBeCloseTo(expectedExtra, 9);
        expect(premodEr(stats)).toBeCloseTo(1.32, 9);
        // The extra ER lands in the total but A4 stays.
        expect(stats.get('recharge_base') + stats.get('recharge')).toBeCloseTo(1.32 + expectedExtra, 9);
        expect(a4Of(mona)).toBeCloseTo(soloA4, 9);
    });

    test('extra and premod together: only the premod part counts', () => {
        const {mona, bennet} = setup();
        withEmblem(mona);
        bennet.setWeaponSettings({whisper_of_the_jinn: true});
        const carrierStats = finalStats(bennet);
        const carrierEm = totalMastery(carrierStats) - (carrierStats.get('mastery_extra') || 0);

        const stats = finalStats(mona);
        expect(extraEr(stats)).toBeCloseTo(0.0108 * carrierEm / 100, 9);
        expect(premodEr(stats)).toBeCloseTo(1.52, 9);
        expect(a4Of(mona)).toBeCloseTo(0.304, 9);
    });
});

// C4 Prophecy of Oblivion: "When any party member attacks an opponent affected
// by an Omen, their CRIT Rate is increased by 15%." The game lowers the
// opponent's CRIT resistance (Avatar_Mona_StarChart: the Omen modifiers write
// Actor_AntiCriticalDelta on it), so the 15% is CRIT Rate against that
// opponent, like Blizzard Strayer's, and not a stat of the member. Rosaria's
// A4 shares her non-extra CRIT Rate and must not count it.
describe('Mona C4 is CRIT Rate against the Omen opponent', () => {
    const C4 = {mona_prophecy_of_oblivion: true};

    function c4Team() {
        const mona = makeBuild('Mona');
        mona.setCharLevels({level: 90, ascension: 6, constellation: 4});
        const rosaria = makeBuild('Rosaria');
        const fischl = makeBuild('Fischl');
        const team = Team.fromMember(fischl);
        team.setMember(1, mona);
        team.setMember(2, rosaria);
        team.setMember(3, makeBuild('Kazuha'));
        team.setOnFieldMember(fischl);
        matchCarrierTotals(rosaria, {crit_rate_total: 60});
        rosaria.setCharSettings({rosaria_shadow_samaritan: true});
        return {mona, rosaria, fischl};
    }

    test('every member gains it against the opponent, none as a stat', () => {
        const {mona, rosaria, fischl} = c4Team();
        const before = [mona, rosaria, fischl].map((member) => finalStats(member).get('crit_rate'));
        mona.setCharSettings(C4);
        [mona, rosaria, fischl].forEach((member, index) => {
            const stats = finalStats(member);
            expect(stats.get('crit_rate_enemy')).toBeCloseTo(0.15, 10);
            expect(stats.get('crit_rate')).toBeCloseTo(before[index], 10);
        });
    });

    test("Rosaria's A4 share does not grow", () => {
        const {mona, fischl} = c4Team();
        // 15% of her 60% CRIT Rate.
        const share = finalStats(fischl).get('crit_rate_extra');
        expect(share).toBeCloseTo(0.09, 8);
        mona.setCharSettings(C4);
        expect(finalStats(fischl).get('crit_rate_extra')).toBeCloseTo(share, 10);
    });

    test('hits crit more often: the average rises, a crit hit does not', () => {
        const {mona, fischl} = c4Team();
        const name = 'attack.normal_hit_1';
        const feature = DB.Chars.get('Fischl').getFeatures().find((item) => item.getName() === name);
        const values = () => {
            // Features cache their compiled program: recompile for this state.
            feature.compiled = undefined;
            return featureValues(fischl)[name];
        };
        const [normal, crit, average] = values();
        mona.setCharSettings(C4);
        const [normalOn, critOn, averageOn] = values();
        expect(normalOn).toBeCloseTo(normal, 6);
        expect(critOn).toBeCloseTo(crit, 6);
        // average = normal x (1 + CRIT Rate x CRIT DMG): 15% more CRIT Rate.
        expect(averageOn - average).toBeCloseTo(0.15 * (crit - normal), 6);
    });
});
