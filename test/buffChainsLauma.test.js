import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, featureValues } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md: Lauma's EM-scaled effects and their channels.
//
// - A4 Cleansing for the Spring (dmg_skill, 0.04% per EM, capped 32%) reads
//   the TOTAL EM: Avatar_Lauma_PermanentSkill_2 computes Ratio_PerMastery *
//   FIGHT_PROP_ELEMENT_MASTERY into _ABILITY_Lauma_PermanentSkill_2_DeerAttack_Buff
//   (ModifyDamageMixin on Elemental_Art); GO reads input.total.eleMas. It counts
//   every extra EM buff, so there is no EM buff it must ignore.
// - The Moonsign Benediction (lunarbloom_multi, 1.75% per EM, capped 14%) is set
//   by Avatar_Lauma_PermanentSkill_3's SetNewElementReactionBaseDamageRatioParam
//   (propType Mastery): the engine resolves the stat itself with no
//   NONEXTRA/CUR marker. The same call reads the total stat in game
//   (Ineffa's Benediction, in-game test: md/buff_chains.md), so it counts
//   extra EM.
// - Pale Hymn (burst) and its C2 addition (+500%/+400% EM) add
//   ElementalBurst_DamageExtra(_MoonOvergrow) * FIGHT_PROP_ELEMENT_MASTERY
//   (total) through ModifyDamageCountMixin (UNIQUE_Avatar_Lauma_ElementalBurst_Buff
//   family; C2 switches the ratio from _Normal to _Normal + _Extra). In our
//   engine these are FeatureMultipliers with scaling 'mastery*', which already
//   reads the total, so they count extra EM with no params.
// - Talent hits (hold-2, C6 sanctuary/normal Lunar-Bloom: Constellation_6_Attack
//   and Attack0N_Constellation_6_Damage * FIGHT_PROP_ELEMENT_MASTERY, total) read
//   the total as hits do; C1's heal (Constellation_1_Heal_Ratio * total EM) is
//   display text only here. KQM has no Lauma EM-interaction test.
//
// A 4-member team is used throughout: a 2-member team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const NAHIDA_A1 = {nahida_compassion_illuminated: true, nahida_illusory_heart: true};

// Nahida at 900 premod EM: her A1 shares 25% of it (225, under the 250 cap)
// with the on-field member (Lauma).
function setup(laumaEM) {
    const lauma = makeBuild('Lauma');
    const nahida = makeBuild('Nahida');
    const sucrose = makeBuild('Sucrose');
    const fischl = makeBuild('Fischl');
    const team = Team.fromMember(lauma);
    team.setMember(1, nahida);
    team.setMember(2, sucrose);
    team.setMember(3, fischl);
    team.setOnFieldMember(lauma);
    // Totals matched with every effect off, so they are premod values.
    matchCarrierTotals(lauma, {mastery_total: laumaEM});
    matchCarrierTotals(nahida, {mastery_total: 900});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    matchCarrierTotals(fischl, {mastery_total: 100});
    return {team, lauma, nahida, sucrose, fischl};
}

function hyperbloomAvg(fischl) {
    return featureValues(fischl)['reaction.hyperbloom'][2];
}

describe('Lauma A4 reads total EM', () => {
    test('solo numbers: 0.04% of EM, capped at 32%', () => {
        const {lauma} = setup(500);
        // No extra EM present: premod and total agree.
        expect(totalMastery(finalStats(lauma))).toBeCloseTo(500, 6);
        expect(finalStats(lauma).get('dmg_skill')).toBeCloseTo(0.0004 * 500, 9);
    });

    test('counts Nahida A1 extra EM', () => {
        const {lauma, nahida} = setup(500);
        nahida.setCharSettings(NAHIDA_A1);
        expect(totalMastery(finalStats(lauma))).toBeCloseTo(500 + 225, 6);
        expect(finalStats(lauma).get('dmg_skill')).toBeCloseTo(0.0004 * (500 + 225), 9);
    });

    test('extra EM is indistinguishable from premod EM', () => {
        const first = setup(500);
        first.nahida.setCharSettings(NAHIDA_A1);
        const withExtra = finalStats(first.lauma).get('dmg_skill');

        const second = setup(500 + 225);
        const withPremod = finalStats(second.lauma).get('dmg_skill');

        expect(withExtra).toBeCloseTo(0.0004 * 725, 9);
        expect(withPremod).toBeCloseTo(0.0004 * 725, 9);
    });

    test('caps at 32% when extra EM pushes past it', () => {
        const {lauma, nahida} = setup(700);
        expect(finalStats(lauma).get('dmg_skill')).toBeCloseTo(0.28, 9);
        nahida.setCharSettings(NAHIDA_A1);
        // 0.04% of 925 = 37%, capped to 32%.
        expect(totalMastery(finalStats(lauma))).toBeCloseTo(925, 6);
        expect(finalStats(lauma).get('dmg_skill')).toBeCloseTo(0.32, 9);
    });
});

describe('Lauma Benediction reads total EM', () => {
    test('solo numbers: 1.75% of EM, capped at 14%', () => {
        const {lauma, fischl} = setup(500);
        expect(finalStats(fischl).get('lunarbloom_multi')).toBeCloseTo(0.0175 * 500 / 100, 9);
        expect(finalStats(lauma).get('lunarbloom_multi')).toBeCloseTo(0.0175 * 500 / 100, 9);
    });

    test('counts Nahida A1 extra EM on Lauma', () => {
        const {lauma, nahida, fischl} = setup(500);
        nahida.setCharSettings(NAHIDA_A1);
        expect(totalMastery(finalStats(lauma))).toBeCloseTo(725, 6);
        expect(finalStats(fischl).get('lunarbloom_multi')).toBeCloseTo(0.0175 * 725 / 100, 9);
    });

    test('grows with premod EM the same way', () => {
        const {fischl} = setup(500 + 225);
        expect(finalStats(fischl).get('lunarbloom_multi')).toBeCloseTo(0.0175 * 725 / 100, 9);
    });
});

describe('Lauma Pale Hymn reads total EM', () => {
    test('counts Nahida A1 extra EM like premod EM', () => {
        const first = setup(500);
        first.lauma.setCharSettings({lauma_pale_hymn: true});
        const withoutExtra = hyperbloomAvg(first.fischl);
        first.nahida.setCharSettings(NAHIDA_A1);
        const withExtra = hyperbloomAvg(first.fischl);

        const second = setup(500 + 225);
        second.lauma.setCharSettings({lauma_pale_hymn: true});
        const withPremod = hyperbloomAvg(second.fischl);

        // Fischl's own EM is fixed at 100 in both: only Lauma's EM moves the
        // Pale Hymn flat bonus, and extra EM moves it exactly like premod EM.
        expect(withExtra).toBeGreaterThan(withoutExtra);
        expect(withExtra).toBeCloseTo(withPremod, 6);
    });

    test('C2 addition counts extra EM like premod EM', () => {
        const c0 = setup(500);
        c0.lauma.setCharSettings({lauma_pale_hymn: true});
        c0.nahida.setCharSettings(NAHIDA_A1);
        const c0Extra = hyperbloomAvg(c0.fischl);

        const first = setup(500);
        first.lauma.setCharLevels({level: 90, ascension: 6, constellation: 2});
        first.lauma.setCharSettings({lauma_pale_hymn: true});
        first.nahida.setCharSettings(NAHIDA_A1);
        const withExtra = hyperbloomAvg(first.fischl);

        const second = setup(500 + 225);
        second.lauma.setCharLevels({level: 90, ascension: 6, constellation: 2});
        second.lauma.setCharSettings({lauma_pale_hymn: true});
        const withPremod = hyperbloomAvg(second.fischl);

        // The C2 toggle adds a bonus on top of Pale Hymn, and its EM scaling
        // reads the total: extra and premod EM agree.
        expect(withExtra).toBeGreaterThan(c0Extra);
        expect(withExtra).toBeCloseTo(withPremod, 6);
    });
});
