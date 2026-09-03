import { Artifact } from '../src/js/classes/Artifact';
import { DB } from '../src/js/db/DB';
import { collectArtifactUpgradeVariants } from '../src/js/classes/ArtifactActionUnion';
import { artifactUpgradeInputs, weightedUpgradeSubstats } from '../src/js/classes/ArtifactUpgradeProbability';

global.DB = DB;
const value = (artifact, stat) => artifact.getSubStats().find(sub => sub.stat === stat)?.value;
const mass = (variants, predicate = () => true) => variants.filter(({artifact}) => predicate(artifact))
    .reduce((sum, variant) => sum + variant.probability, 0);
const subs = (cr, def, hp) => [{stat: 'crit_rate', value: cr}, {stat: 'atk_percent', value: 5.8},
    {stat: 'def', value: def}, {stat: 'hp', value: hp}];
function crafted(level = 16, stats = subs(7.8, 69, 598)) {
    const artifact = new Artifact(5, level, 'circlet', 'GladiatorFinale', 'crit_dmg', stats);
    artifact.setMetadata({totalRolls: 4 + Math.floor(level / 4), elixirCrafted: true,
        definedSubstats: ['crit_rate', 'atk_percent'],
        initialValues: {crit_rate: 3.89, atk_percent: 5.83, def: 23.15, hp: 298.75}});
    return artifact;
}

test.each([3, 4])('a %i-line crafted start forces the final enhancement when only one pair hit has occurred', initialLines => {
    const artifact = crafted(16, subs(7.8, initialLines === 3 ? 46 : 69, 598));
    artifact.setMetadata({...artifact.getMetadata(), totalRolls: initialLines + 4});
    const variants = collectArtifactUpgradeVariants(artifact);
    expect(mass(variants)).toBeCloseTo(1, 12);
    expect(mass(variants, a => value(a, 'crit_rate') === 7.8 && value(a, 'atk_percent') === 5.8)).toBe(0);
    expect(mass(variants, a => value(a, 'crit_rate') > 7.8)).toBeCloseTo(0.5, 12);
    expect(mass(variants, a => value(a, 'atk_percent') > 5.8)).toBeCloseTo(0.5, 12);
    expect(artifact.getLevel()).toBe(16);
    expect(artifact.getMetadata().totalRolls).toBe(initialLines + 4);
});

test('ordinary artifacts with the same current values keep uniform enhancement targets', () => {
    const artifact = crafted();
    artifact.setMetadata({...artifact.getMetadata(), elixirCrafted: false});
    const variants = collectArtifactUpgradeVariants(artifact);
    expect(mass(variants, a => value(a, 'crit_rate') === 7.8 && value(a, 'atk_percent') === 5.8)).toBeCloseTo(0.5, 12);
});

test('missing roll history blocks prediction instead of inventing provenance', () => {
    const artifact = crafted();
    artifact.setMetadata({elixirCrafted: true, definedSubstats: ['crit_rate', 'atk_percent']});
    expect(() => collectArtifactUpgradeVariants(artifact)).toThrow('action_upgrade_missing_start');
    expect(artifact.getMetadata().initialValues).toBeUndefined();
    expect(artifact.getMetadata().totalRolls).toBeUndefined();
});

test('a missing defined pair is reported instead of silently treating a crafted artifact as ordinary', () => {
    const artifact = crafted();
    artifact.setMetadata({elixirCrafted: true});
    expect(() => collectArtifactUpgradeVariants(artifact)).toThrow('action_upgrade_missing_pair');
});

test('two outstanding guaranteed hits force both remaining enhancements into the pair', () => {
    const artifact = crafted(12, subs(3.9, 69, 598));
    const variants = collectArtifactUpgradeVariants(artifact);
    expect(mass(variants)).toBeCloseTo(1, 12);
    expect(mass(variants, a => value(a, 'def') === 69 && value(a, 'hp') === 598)).toBeCloseTo(1, 12);
});

test('partial crafted PMF agrees with an independent chronological two-step tree', () => {
    const artifact = crafted(12, subs(7.8, 46, 598));
    const stats = artifact.getSubStats().map(sub => sub.stat);
    const key = a => JSON.stringify(a.getSubStats());
    const expected = new Map();
    const walk = (raw, step, hits, probability) => {
        if (step === 2) {
            const result = artifact.clone();
            result.subStats = stats.map((stat, i) => {
                const scale = DB.Artifacts.Substats.get(stat).type === 'percent' ? 10 : 1;
                return {stat, value: Math.round((raw[i] / 100 + 1e-8) * scale) / scale};
            });
            expected.set(key(result), (expected.get(key(result)) || 0) + probability);
            return;
        }
        const targets = hits + 2 - step === 2 ? [0, 1] : [0, 1, 2, 3];
        for (const target of targets) for (const roll of DB.Artifacts.Substats.get(stats[target]).rolls[4]) {
            const next = [...raw];
            next[target] += Math.round(roll * 100);
            walk(next, step + 1, hits + (target < 2 ? 1 : 0), probability / targets.length / 4);
        }
    };
    walk([778, 583, 4630, 59750], 0, 1, 1);
    const variants = collectArtifactUpgradeVariants(artifact);
    expect(variants).toHaveLength(expected.size);
    for (const variant of variants) expect(variant.probability).toBeCloseTo(expected.get(key(variant.artifact)), 12);
    // No early forcing: two naturally selected pair hits still have mass 1/4.
    expect(mass(variants, a => value(a, 'def') === 46 && value(a, 'hp') === 598)).toBeCloseTo(0.25, 12);
});

test('missing substat reveal uses the documented 6/4/3 weights', () => {
    const artifact = new Artifact(3, 8, 'circlet', 'Instructor', 'crit_rate', [
        {stat: 'hp', value: 143}, {stat: 'def', value: 11}, {stat: 'recharge', value: 3.9}]);
    artifact.setMetadata({totalRolls: 3, elixirCrafted: false, initialValues: {hp: 143, def: 11, recharge: 3.9}});
    const variants = collectArtifactUpgradeVariants(artifact);
    expect(mass(variants)).toBeCloseTo(1, 12);
    expect(mass(variants, a => value(a, 'atk') !== undefined)).toBeCloseTo(6 / 25, 12);
    expect(mass(variants, a => value(a, 'crit_dmg') !== undefined)).toBeCloseTo(3 / 25, 12);
});

test('multiple missing identities sum the weighted probabilities of all draw orders', () => {
    const choices = weightedUpgradeSubstats(['atk', 'crit_dmg', 'hp_percent'], 2);
    expect(choices.reduce((sum, choice) => sum + choice.probability, 0)).toBeCloseTo(1, 12);
    expect(choices.find(choice => choice.stats.join(',') === 'atk,crit_dmg').probability)
        .toBeCloseTo(6 * 3 / 13 * (1 / 7 + 1 / 10), 12);
});

test('raw enhancement sums are added before display rounding', () => {
    const artifact = new Artifact(5, 16, 'flower', 'GladiatorFinale', 'hp', [
        {stat: 'crit_rate', value: 3.9}, {stat: 'crit_dmg', value: 7.8},
        {stat: 'atk_percent', value: 5.8}, {stat: 'def', value: 93}]);
    artifact.setMetadata({totalRolls: 7, elixirCrafted: false,
        initialValues: {crit_rate: 3.9, crit_dmg: 7.8, atk_percent: 5.8, def: 23}});
    const variants = collectArtifactUpgradeVariants(artifact);
    expect([...new Set(variants.map(v => value(v.artifact, 'crit_dmg')))].sort((a, b) => a - b))
        .toEqual([7.8, 13.2, 14, 14.8, 15.5]);
    expect(mass(variants, a => value(a, 'crit_dmg') === 15.5)).toBeCloseTo(1 / 16, 12);
});

test('ambiguous displayed flat rolls retain both canonical totals with their conditional weights', () => {
    const artifact = new Artifact(3, 4, 'circlet', 'Instructor', 'crit_rate', [
        {stat: 'atk', value: 7}, {stat: 'hp', value: 143}, {stat: 'def', value: 11}]);
    artifact.setMetadata({totalRolls: 3, elixirCrafted: false, initialValues: {atk: 7, hp: 143, def: 11}});
    const input = artifactUpgradeInputs(artifact);
    expect(input.states.map(state => [state.units[0], state.probability])).toEqual([[654, 0.5], [747, 0.5]]);
    expect(mass(collectArtifactUpgradeVariants(artifact), a => value(a, 'atk') === 17)).toBeCloseTo(1 / 32, 12);
    // First rolls are stored as displayed: 3★ ATK 6.54 and 7.47 both show as 7.
    artifact.setMetadata({...artifact.getMetadata(), initialValues: {atk: 6.54, hp: 143, def: 11}});
    expect(artifact.getMetadata().initialValues.atk).toBe(7);
    expect(artifactUpgradeInputs(artifact).states.map(state => state.units[0])).toEqual([654, 747]);
});

test('an unknown start blocks prediction until totalRolls is supplied', () => {
    const artifact = new Artifact(5, 12, 'flower', 'GladiatorFinale', 'hp', [
        {stat: 'crit_rate', value: 11.3}, {stat: 'crit_dmg', value: 7.8},
        {stat: 'atk_percent', value: 5.8}, {stat: 'def', value: 23}]);
    const initialValues = {crit_rate: 2.7, crit_dmg: 7.8, atk_percent: 5.8, def: 23};
    artifact.setMetadata({elixirCrafted: false, initialValues});
    expect(() => artifactUpgradeInputs(artifact)).toThrow('action_upgrade_missing_start');
    artifact.setMetadata({totalRolls: 7, elixirCrafted: false, initialValues});
    const known = artifactUpgradeInputs(artifact);
    expect(known.assumptions.startingLines).toBeNull();
    expect(known.states).toHaveLength(1);
    expect(known.states[0].units[0]).toBe(1127);
});

test('impossible current totals are rejected instead of manufacturing a rounded starting state', () => {
    const artifact = crafted();
    artifact.subStats[0].value = 99;
    expect(() => collectArtifactUpgradeVariants(artifact)).toThrow('action_upgrade_invalid_values');
});

test.each([1, 2, 3, 4, 5])('rarity %i uses its own tier count and conserves future probability', rarity => {
    const count = Math.max(0, rarity - 2);
    const stats = ['crit_rate', 'crit_dmg', 'def'].slice(0, count).map(stat => {
        const data = DB.Artifacts.Substats.get(stat);
        const scale = data.type === 'percent' ? 10 : 1;
        return {stat, value: Math.round(data.rolls[rarity - 1][0] * scale) / scale};
    });
    // A 3-line 5★ below +4 carries its 4th line as an unactivated stat.
    const inactive = rarity === 5 ? [{stat: 'atk', value: 19}] : [];
    const artifact = new Artifact(rarity, 0, 'flower', 'GladiatorFinale', 'hp', stats, inactive);
    artifact.setMetadata({totalRolls: count, elixirCrafted: false,
        initialValues: Object.fromEntries(stats.concat(inactive).map(({stat, value}) => [stat, value]))});
    const variants = collectArtifactUpgradeVariants(artifact);
    expect(variants.length).toBeGreaterThan(0);
    expect(mass(variants)).toBeCloseTo(1, 10);
    expect(variants.every(v => v.artifact.getLevel() === DB.Artifacts.Rarity[rarity - 1].maxLevel)).toBe(true);
});

test.each([0, 3])('a 3-line 5★ at +%i without its unactivated 4th line is incomplete, not random', level => {
    const artifact = new Artifact(5, level, 'circlet', 'GladiatorFinale', 'crit_rate', [
        {stat: 'hp', value: 299}, {stat: 'def', value: 23}, {stat: 'recharge', value: 6.5}]);
    artifact.setMetadata({totalRolls: 3, elixirCrafted: false, initialValues: {hp: 299, def: 23, recharge: 6.5}});
    expect(() => collectArtifactUpgradeVariants(artifact)).toThrow('action_upgrade_missing_unactivated');
    // 4★ artifacts hide nothing: their unrevealed lines are genuinely drawn.
    const four = new Artifact(4, level, 'circlet', 'GladiatorFinale', 'crit_rate', [
        {stat: 'hp', value: 239}, {stat: 'def', value: 19}]);
    four.setMetadata({totalRolls: 2, elixirCrafted: false, initialValues: {hp: 239, def: 19}});
    expect(mass(collectArtifactUpgradeVariants(four))).toBeCloseTo(1, 12);
});

test('an unactivated 5★ line activates with its own value and no new line is drawn', () => {
    const artifact = new Artifact(5, 0, 'circlet', 'GladiatorFinale', 'crit_rate', [
        {stat: 'hp', value: 299}, {stat: 'def', value: 23}, {stat: 'recharge', value: 6.5}],
    [{stat: 'atk', value: 19}]);
    artifact.setMetadata({totalRolls: 3, elixirCrafted: false, initialValues: {hp: 299, def: 23, recharge: 6.5, atk: 19}});
    const variants = collectArtifactUpgradeVariants(artifact);
    expect(mass(variants)).toBeCloseTo(1, 12);
    for (const {artifact: variant} of variants) {
        expect(variant.getSubStats().map(sub => sub.stat)).toEqual(['hp', 'def', 'recharge', 'atk']);
        expect(variant.getUnactivatedSubStats()).toEqual([]);
    }
    // Four enhancements follow the activation; atk keeps 19 only if none picks it.
    expect(mass(variants, a => value(a, 'atk') === 19)).toBeCloseTo((3 / 4) ** 4, 12);
    expect(artifact.getUnactivatedSubStats()).toEqual([{stat: 'atk', value: 19}]);
});
