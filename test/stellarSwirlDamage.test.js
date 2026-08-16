import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureDamageStellarSwirl } from "../src/js/classes/Feature2/Damage/StellarSwirl";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { FeatureMultiplierStellarSwirl } from "../src/js/classes/Feature2/Multiplier/StellarSwirl";
import { FeatureMultiplierTarget } from "../src/js/classes/Feature2/Multiplier/Target";
import { FeatureReactionStellarSwirl } from "../src/js/classes/Feature2/Reaction/Transformative/StellarSwirl";
import { StatTable } from "../src/js/classes/StatTable";
import { reactionDamageValues } from "../src/js/db/generated/ElementScale";
import { Reactions } from "../src/js/db/Features/Reactions";

function makeFlatMultiplier(name, tags, options, value = 10) {
    return new FeatureMultiplier({
        scaling: 'atk_base',
        values: new StatTable(name, [value]),
        target: new FeatureMultiplierTarget({tags, options}),
    });
}

function makeFormulaData(element) {
    const data = new BuildData({
        char_level: 90,
        enemy_level: 100,
        ['enemy_res_' + element]: 10,
        reaction: 'melt',
    }, {
        atk_base: 1000,
        mastery: 500,
        stellarglimmer_multi: 0.1,
        stellarswirl_multi: 0.2,
        stellarconduct_multi: 9,
        dmg_stellarglimmer: 0.05,
        dmg_stellarswirl: 0.15,
        dmg_stellarconduct: 9,
        dmg_stellarglimmer_special: 0.1,
        dmg_stellarswirl_special: 0.2,
        dmg_stellarconduct_special: 9,
        dmg_all: 10,
        ['dmg_' + element]: 10,
        enemy_def_reduce: 0.9,
        enemy_def_ignore: 0.9,
        crit_rate_base: 1,
        crit_dmg_base: 0.5,
        crit_dmg: 0.1,
        crit_dmg_stellarglimmer: 0.2,
        crit_dmg_stellarswirl: 0.3,
        crit_dmg_stellarconduct: 9,
    });

    return data;
}

test('Stellar Swirl contribution follows base/additive/Quill/RES/CRIT/elevation order and ignores DEF', () => {
    const feature = new FeatureReactionStellarSwirl({
        name: 'test_stellarswirl_anemo',
        element: 'anemo',
        reactionRate: 0.75,
        penalty: 0.6,
        tags: ['stellarswirl_trigger'],
    });
    const data = makeFormulaData('anemo');
    data.multipliers = [
        makeFlatMultiplier('stellarswirl_reaction_quill', ['stellarswirl_reaction'], ['stellarglimmer_flat']),
        makeFlatMultiplier('generic_reaction_flat_does_not_apply', ['stellarswirl_reaction'], ['reaction_flat'], 100),
    ];

    const result = feature.getResult(data)['reaction.test_stellarswirl_anemo'];
    const base = reactionDamageValues.getValue(90) * 0.75 * 0.6;
    const baseBonus = 1 + 0.1 + 0.2;
    const masteryAndAdditive = 1 + 6 * 500 / 2500 + 0.05 + 0.15;
    const expected = (base * baseBonus * masteryAndAdditive + 100) * 0.9 * 1.3;

    expect(result.normal).toBeCloseTo(expected, 5);
    expect(result.crit).toBeCloseTo(expected * 2.1, 5);
    expect(result.isReacted).toBe(false);
});

test('direct Stellar Swirl uses coefficient 1, strips trigger tags, and ignores trigger-only Quills', () => {
    const feature = new FeatureDamageStellarSwirl({
        category: 'skill',
        element: 'anemo',
        tags: ['stellarswirl_trigger'],
        multipliers: [
            new FeatureMultiplier({
                values: new StatTable('stellarswirl_direct_test', [100]),
            }),
        ],
    });
    const data = makeFormulaData('anemo');
    data.multipliers = [
        makeFlatMultiplier('stellarswirl_direct_quill', ['stellarswirl_direct'], ['stellarswirl_flat']),
        makeFlatMultiplier('stellarswirl_trigger_only_quill', ['stellarswirl_trigger'], ['stellarswirl_flat'], 100),
    ];

    const result = feature.getResult(data)['skill.stellarswirl_direct_test'];
    const expected = (1000 * 1.3 * 2.4 + 100) * 0.9 * 1.3;

    expect(feature.getTags()).toEqual(expect.arrayContaining(['stellarglimmer_direct', 'stellarswirl_direct']));
    expect(feature.getTags()).not.toContain('stellarswirl_trigger');
    expect(result.normal).toBeCloseTo(expected, 5);
});

test('configured Stellar Swirl rows expose coefficients, contribution ranks, trigger ownership, and Cryo RES', () => {
    const byName = Object.fromEntries(Reactions.map((feature) => [feature.name, feature]));

    expect(byName.stellarswirl_anemo_contribution.getReactionRate()).toBe(0.75);
    expect(byName.stellarswirl_anemo_contribution.getContributionWeight()).toBe(0.6);
    expect(byName.stellarswirl_anemo_contribution_2.getContributionWeight()).toBe(0.3);
    expect(byName.stellarswirl_anemo_contribution_12.getContributionWeight()).toBe(0.05);
    expect(byName.stellarswirl_anemo_contribution.getTags()).toContain('stellarswirl_trigger');

    expect(byName.stellarswirl_vortex_1_contribution.getReactionRate()).toBe(2);
    expect(byName.stellarswirl_vortex_2_contribution.getReactionRate()).toBe(3);
    expect(byName.stellarswirl_vortex_1_contribution.getTags()).not.toContain('stellarswirl_trigger');

    const data = new BuildData({
        char_level: 90,
        enemy_res_cryo: 40,
        allowed_stellarswirl: true,
        char_element: 'cryo',
    }, {});
    const result = byName.stellarswirl_vortex_1_contribution.getResult(data)
        ['reaction.stellarswirl_vortex_1_contribution'];
    const expected = reactionDamageValues.getValue(90) * 2 * 0.6 * 0.6;

    expect(result.normal).toBeCloseTo(expected, 5);
});

test('Stellar Vortex promotes at three triggers and bursts early at six', () => {
    const byName = Object.fromEntries(Reactions.map((feature) => [feature.name, feature]));
    const data = new BuildData({stellarswirl_vortex_triggers: 99}, {});

    expect(FeatureMultiplierStellarSwirl.getVortexTriggerCount(data)).toBe(6);
    expect(FeatureMultiplierStellarSwirl.getVortexLevel(2)).toBe(1);
    expect(FeatureMultiplierStellarSwirl.getVortexCoefficient(2)).toBe(2);
    expect(FeatureMultiplierStellarSwirl.getVortexLevel(3)).toBe(2);
    expect(FeatureMultiplierStellarSwirl.getVortexCoefficient(3)).toBe(3);
    expect(FeatureMultiplierStellarSwirl.shouldBurstVortex(5)).toBe(false);
    expect(FeatureMultiplierStellarSwirl.shouldBurstVortex(6)).toBe(true);

    const level1 = new BuildData({
        char_element: 'anemo',
        allowed_stellarswirl: true,
        stellarswirl_vortex_triggers: 2,
    }, {});
    const level2 = new BuildData({
        char_element: 'anemo',
        allowed_stellarswirl: true,
        stellarswirl_vortex_triggers: 3,
    }, {});

    expect(byName.stellarswirl_vortex_1_contribution.isActive(level1)).toBe(true);
    expect(byName.stellarswirl_vortex_2_contribution.isActive(level1)).toBe(false);
    expect(byName.stellarswirl_vortex_1_contribution.isActive(level2)).toBe(false);
    expect(byName.stellarswirl_vortex_2_contribution.isActive(level2)).toBe(true);
});

test('enabled Stellar Swirl replaces the ordinary Cryo Swirl row only', () => {
    const byName = Object.fromEntries(Reactions.map((feature) => [feature.name, feature]));
    const ordinary = new BuildData({char_element: 'anemo'}, {});
    const stellar = new BuildData({char_element: 'anemo', allowed_stellarswirl: true}, {});

    expect(byName.swirl_cryo.isActive(ordinary)).toBe(true);
    expect(byName.swirl_cryo.isActive(stellar)).toBe(false);
    expect(byName.swirl_pyro.isActive(stellar)).toBe(true);
    expect(byName.stellarswirl_anemo_contribution.isActive(stellar)).toBe(true);
});
