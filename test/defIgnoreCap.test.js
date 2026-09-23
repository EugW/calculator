import { BuildData } from "../src/js/classes/Build/Data";
import { FeatureDamageBurst } from "../src/js/classes/Feature2/Damage/Burst";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { FeatureCompiler } from "../src/js/classes/Feature2/Compiler";
import { StatTable } from "../src/js/classes/StatTable";

function defMultiplier(stats, settings) {
    const data = new BuildData(
        Object.assign({char_level: 90, enemy_level: 90}, settings),
        stats,
    );
    const feature = new FeatureDamageBurst({
        name: 'test_burst',
        element: 'pyro',
        multipliers: [
            new FeatureMultiplier({
                values: new StatTable('test', [100]),
            }),
        ],
    });
    const tree = feature.getDefenceLevelMultiplier(data);
    const compiler = new FeatureCompiler(tree);
    compiler.prepare({}, {dontProcessStaticValues: true});
    compiler.compile({});
    return compiler.execute(data);
}

test('total DEF ignore is capped at 100% (Durin C6 darkness + Nicole C6)', () => {
    // Durin C6 darkness: 30% + 40% = 70% burst ignore, Nicole C6: 40% generic ignore = 110% total
    const value = defMultiplier({
        enemy_def_reduce: 0,
        enemy_def_ignore: 0.4,
        enemy_def_ignore_burst: 0.7,
    });
    // Fully ignored DEF => (90+100)/((90+100)*0 + (90+100)) = 1
    expect(value).toBeCloseTo(1, 5);
});

test('total DEF ignore capped at 100% combined with DEF reduce', () => {
    const value = defMultiplier({
        enemy_def_reduce: 0.3,
        enemy_def_ignore: 0.4,
        enemy_def_ignore_burst: 0.7,
    });
    expect(value).toBeCloseTo(1, 5);
});

test('partial DEF ignore below cap is unaffected', () => {
    // 40% ignore, no reduce: (190)/(190*0.6 + 190) = 190/304
    const value = defMultiplier({
        enemy_def_reduce: 0,
        enemy_def_ignore: 0.4,
        enemy_def_ignore_burst: 0,
    });
    expect(value).toBeCloseTo(190 / (190 * 0.6 + 190), 5);
});
