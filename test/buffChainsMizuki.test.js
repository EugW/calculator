import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, featureValues } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md: Yumemizuki Mizuki's EM-scaled effects and their channels.
//
// - Skill Dreamdrifter Swirl/Stellar Swirl DMG bonuses (dmg_reaction_swirl,
//   dmg_stellarswirl) read the TOTAL EM: Avatar_Mizuki_MasteryToSwirhurt caches
//   FIGHT_PROP_ELEMENT_MASTERY into MasteryCache
//   (UNIQUE_Mizuki_MasteryToSwirDamage). GO reads input.total.eleMas too. They
//   count every extra EM buff, so there is no EM buff they must ignore; the
//   must-not-count side is covered by contrast tests on the premod effects.
// - Vast EM share (10% of EM, gameplay passive "Vast Be the Dream") reads
//   PREMOD EM: Avatar_Mizuki_ExtraProudSkill caches
//   FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY into NonExtraMasteryCache and writes
//   Actor_ElemMasteryExtraDelta. GO reads input.premod.eleMas. Default.
// - C2 element DMG (0.04% per EM, "Your Echo I Meet in Dreams") reads PREMOD
//   EM: Avatar_Mizuki_Talent_2 (gameplay C2) scales FIGHT_PROP_NONEXTRA_
//   ELEMENT_MASTERY into Actor_*AddHurtExtraDelta. GO reads input.total.eleMas
//   here; the game data overrules the guess. Default.
// - C6 per-EM CRIT (0.04%/0.16% per EM over 500, "The Heart Lingers Long")
//   reads PREMOD EM: Avatar_Mizuki_Talent_6 (gameplay C6) scales
//   FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY into Actor_CriticalExtraDelta /
//   Actor_CriticalHurtExtraDelta. GO reads input.premod.eleMas (with a verify
//   TODO); the data confirms it. Default.
// - C1 Swirl/Stellar Swirl flats (1100%/550%, "In Mist-Like Waters") read
//   TOTAL EM: Avatar_Mizuki_Talent_1_New (gameplay C1) caches
//   FIGHT_PROP_ELEMENT_MASTERY as OwnerMasteryCache; GO reads input.total.
//   In our engine these are FeatureMultipliers with scaling 'mastery*', which
//   already reads the total, so they count extra EM with no params. The C1
//   extra Anemo hits (1000%/400%), the Vast periodic hits (1000% EM) and the
//   burst heals (cached _ABILITY_Mizuki_Burst_Dream_MasteryCache from
//   FIGHT_PROP_ELEMENT_MASTERY, total; C4 adds ExtraHealRatio 266% from the
//   same cache) are hits/heals and read the total by design, needing nothing.
// - A4 (+100 flat EM, "Thoughts by Day Bring Dreams by Night") is
//   Avatar_Mizuki_PermanentSkill_2 (Actor_ElemMasteryDelta = MasteryBuffDelta):
//   a flat toggle, premod as conditions are. A1, the C6 flat Swirl CRIT
//   (30%/100%) and Stellar CRIT (10%/20%), and the C2 RES shred (-20%) are
//   flat toggles too. KQM has no Mizuki EM-interaction test.
//
// A 4-member team is used throughout: a 2-member team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const NAHIDA_A1 = {nahida_compassion_illuminated: true, nahida_illusory_heart: true};

// Skill level 13 at constellation 6 (C3 +3): 54% Swirl and 5.4% Stellar Swirl
// per 100 EM, i.e. 0.0054 and 0.00054 per point.
const SWIRL_PER_EM = 0.0054;
const STELLAR_PER_EM = 0.00054;

function setup(mizukiEM) {
    const mizuki = makeBuild('Mizuki');
    const nahida = makeBuild('Nahida');
    const sucrose = makeBuild('Sucrose');
    const fischl = makeBuild('Fischl');
    const team = Team.fromMember(mizuki);
    team.setMember(1, nahida);
    team.setMember(2, sucrose);
    team.setMember(3, fischl);
    team.setOnFieldMember(mizuki);
    mizuki.setCharLevels({level: 90, ascension: 6, constellation: 6});
    // Totals matched with every effect off, so they are premod values.
    matchCarrierTotals(mizuki, {mastery_total: mizukiEM});
    matchCarrierTotals(nahida, {mastery_total: 900});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    matchCarrierTotals(fischl, {mastery_total: 100});
    mizuki.setCharSettings({mizuki_dreamdrifter: true});
    return {team, mizuki, nahida, sucrose, fischl};
}

// Mizuki's own total EM always includes her Vast self-share (10% of premod),
// which her total-read effects then count, as in the game.
function mizukiTotal(mizuki) {
    return totalMastery(finalStats(mizuki));
}

describe('Mizuki Swirl and Stellar Swirl bonuses read total EM', () => {
    test('solo numbers: rate times her total EM', () => {
        const {mizuki, fischl} = setup(500);
        // 500 premod + 50 Vast self-share; no extra EM otherwise.
        expect(mizukiTotal(mizuki)).toBeCloseTo(550, 6);
        expect(finalStats(fischl).get('dmg_reaction_swirl')).toBeCloseTo(SWIRL_PER_EM * 550, 9);
        expect(finalStats(fischl).get('dmg_stellarswirl')).toBeCloseTo(STELLAR_PER_EM * 550, 9);
    });

    test('counts Nahida A1 extra EM', () => {
        const {mizuki, nahida, fischl} = setup(500);
        nahida.setCharSettings(NAHIDA_A1);
        // 25% of the highest premod EM (900) = 225 extra on Mizuki.
        expect(mizukiTotal(mizuki)).toBeCloseTo(500 + 225 + 50, 6);
        expect(finalStats(fischl).get('dmg_reaction_swirl')).toBeCloseTo(SWIRL_PER_EM * 775, 9);
        expect(finalStats(fischl).get('dmg_stellarswirl')).toBeCloseTo(STELLAR_PER_EM * 775, 9);
    });

    test('extra EM is indistinguishable from premod EM', () => {
        const first = setup(500);
        first.nahida.setCharSettings(NAHIDA_A1);
        const withExtra = finalStats(first.fischl).get('dmg_reaction_swirl');
        const withExtraTotal = mizukiTotal(first.mizuki);

        const second = setup(725);
        const withPremod = finalStats(second.fischl).get('dmg_reaction_swirl');
        const withPremodTotal = mizukiTotal(second.mizuki);

        // Both scale with her total EM at the same per-point rate.
        expect(withExtra / withExtraTotal).toBeCloseTo(SWIRL_PER_EM, 9);
        expect(withPremod / withPremodTotal).toBeCloseTo(SWIRL_PER_EM, 9);
    });
});

describe('Mizuki Vast EM share keeps the default (premod) read', () => {
    test('solo numbers: 10% of premod EM', () => {
        const {fischl} = setup(500);
        expect(totalMastery(finalStats(fischl))).toBeCloseTo(100 + 50, 6);
    });

    test('ignores Nahida A1 extra EM on Mizuki', () => {
        const {mizuki, nahida, fischl} = setup(500);
        nahida.setCharSettings(NAHIDA_A1);
        expect(mizukiTotal(mizuki)).toBeCloseTo(775, 6);
        expect(totalMastery(finalStats(fischl))).toBeCloseTo(150, 6);
    });

    test('grows with premod EM instead', () => {
        const {fischl} = setup(725);
        expect(totalMastery(finalStats(fischl))).toBeCloseTo(100 + 72.5, 6);
    });
});

describe('Mizuki C2 element DMG keeps the default (premod) read', () => {
    test('solo numbers: 0.04% of premod EM', () => {
        const {fischl} = setup(500);
        expect(finalStats(fischl).get('dmg_pyro')).toBeCloseTo(0.0004 * 500, 9);
    });

    test('ignores Nahida A1 extra EM on Mizuki', () => {
        const {mizuki, nahida, fischl} = setup(500);
        nahida.setCharSettings(NAHIDA_A1);
        expect(mizukiTotal(mizuki)).toBeCloseTo(775, 6);
        expect(finalStats(fischl).get('dmg_pyro')).toBeCloseTo(0.0004 * 500, 9);
    });

    test('grows with premod EM instead', () => {
        const {fischl} = setup(725);
        expect(finalStats(fischl).get('dmg_pyro')).toBeCloseTo(0.0004 * 725, 9);
    });
});

describe('Mizuki C6 per-EM CRIT keeps the default (premod) read', () => {
    test('solo numbers: 0.04%/0.16% of EM over 500, capped', () => {
        const {mizuki} = setup(700);
        expect(finalStats(mizuki).get('crit_rate')).toBeCloseTo(0.0004 * 200, 9);
        expect(finalStats(mizuki).get('crit_dmg')).toBeCloseTo(0.0016 * 200, 9);
        const capped = setup(1200);
        expect(finalStats(capped.mizuki).get('crit_rate')).toBeCloseTo(0.2, 9);
        expect(finalStats(capped.mizuki).get('crit_dmg')).toBeCloseTo(0.8, 9);
    });

    test('ignores Nahida A1 extra EM on Mizuki', () => {
        const {mizuki, nahida} = setup(700);
        nahida.setCharSettings(NAHIDA_A1);
        expect(mizukiTotal(mizuki)).toBeCloseTo(700 + 225 + 70, 6);
        expect(finalStats(mizuki).get('crit_rate')).toBeCloseTo(0.0004 * 200, 9);
        expect(finalStats(mizuki).get('crit_dmg')).toBeCloseTo(0.0016 * 200, 9);
    });

    test('grows with premod EM instead', () => {
        const {mizuki} = setup(900);
        expect(finalStats(mizuki).get('crit_rate')).toBeCloseTo(0.0004 * 400, 9);
        expect(finalStats(mizuki).get('crit_dmg')).toBeCloseTo(0.0016 * 400, 9);
    });
});

describe('Mizuki C1 EM-scaled damage reads total EM', () => {
    function setupC1(mizukiEM) {
        const builds = setup(mizukiEM);
        builds.mizuki.setCharSettings({
            mizuki_dreamdrifter: true,
            mizuki_in_mist_like_waters: true,
        });
        return builds;
    }

    test('C1 Swirl flat counts Nahida A1 extra EM like premod EM', () => {
        const solo = setupC1(500);
        const soloAvg = featureValues(solo.sucrose)['reaction.swirl_pyro'][2];

        solo.nahida.setCharSettings(NAHIDA_A1);
        const withExtra = featureValues(solo.sucrose)['reaction.swirl_pyro'][2];

        const premod = setupC1(725);
        const withPremod = featureValues(premod.sucrose)['reaction.swirl_pyro'][2];

        // A premod read would leave the extra-EM case at the solo value.
        expect(withExtra).toBeGreaterThan(soloAvg);
        expect(withPremod).toBeGreaterThan(soloAvg);
    });

    test('C1 extra Anemo hit scales with her total EM', () => {
        const solo = setupC1(500);
        const soloNormal = featureValues(solo.mizuki)['other.mizuki_moonlit_dream_attack'][0];
        expect(soloNormal / mizukiTotal(solo.mizuki)).toBeGreaterThan(0);

        solo.nahida.setCharSettings(NAHIDA_A1);
        const withExtra = featureValues(solo.mizuki)['other.mizuki_moonlit_dream_attack'][0];
        // Non-critical hit scales with the total at the same per-point rate.
        expect(withExtra / mizukiTotal(solo.mizuki)).toBeCloseTo(soloNormal / 550, 9);
        expect(withExtra).toBeGreaterThan(soloNormal);
    });
});
