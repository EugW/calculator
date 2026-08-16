import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { getPostEffectStatDependencyClosure } from "../src/js/classes/Build/Data";
import { CalcSet } from "../src/js/classes/CalcSet";
import { CPostEffect } from "../src/js/classes/Feature2/Compile/Types/Block";
import { CStat } from "../src/js/classes/Feature2/Compile/Types/Item";
import { Stats } from "../src/js/classes/Stats";
import { DB } from "../src/js/db/DB";

global.DB = DB;

const FEATURE_NAME = 'attack.normal_hit_1';
const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const MAIN_STATS = {
    flower: 'hp',
    plume: 'atk',
    sands: 'mastery',
    goblet: 'dmg_phys',
    circlet: 'crit_rate',
};

function makeBuild(opts = {}) {
    const build = new CalcSet();
    const char = DB.Chars.get('Jean');

    build.setChar(char);
    build.setEnemy(DB.Enemies.getFirst().getFirst());

    if (opts.xiphos) {
        build.setWeapon(DB.Weapons.get('sword').get('XiphosMoonlight'));
        build.setWeaponSettings({whisper_of_the_jinn: true});
    }

    return build;
}

function makeArtifacts(setId = 'GladiatorFinale') {
    return SLOTS.map((slot) => {
        return new Artifact(5, 20, slot, setId, MAIN_STATS[slot], []);
    });
}

function makeSuggester(build, artifacts, overrides = {}) {
    const settings = Object.assign({
        sets_settings: {},
        stats: {},
        setMinValues: {},
        setMaxValues: {},
    }, overrides.settings || {});

    return new ArtifactsSuggest({
        build: build,
        artifacts: artifacts,
        featureName: FEATURE_NAME,
        featureType: 'average',
        settings: settings,
        limit: overrides.limit || 20,
        useGPU: false,
        showBeta: true,
    });
}

test('post-effect stat closure follows dependencies through earlier priority groups only', () => {
    const masteryFromAtk = new CPostEffect([
        new CStat({stat: 'atk'}),
    ], {stat: 'mastery', priority: 2});
    const rechargeFromMastery = new CPostEffect([
        new CStat({stat: 'mastery'}),
    ], {stat: 'recharge', priority: 3});
    const transitive = getPostEffectStatDependencyClosure([
        [masteryFromAtk],
        [rechargeFromMastery],
    ], ['recharge']);

    expect(transitive.items).toEqual(expect.arrayContaining([
        masteryFromAtk,
        rechargeFromMastery,
    ]));
    expect(transitive.usedStats).toEqual(expect.arrayContaining([
        'recharge',
        'mastery',
        'atk',
    ]));

    const samePriorityMasteryFromAtk = new CPostEffect([
        new CStat({stat: 'atk'}),
    ], {stat: 'mastery', priority: 3});
    const samePriority = getPostEffectStatDependencyClosure([
        [samePriorityMasteryFromAtk, rechargeFromMastery],
    ], ['recharge']);

    expect(samePriority.items).toContain(rechargeFromMastery);
    expect(samePriority.items).not.toContain(samePriorityMasteryFromAtk);
    expect(samePriority.usedStats).toContain('mastery');
    expect(samePriority.usedStats).not.toContain('atk');
});

test('Jean with active Xiphos rejects an impossible recharge constraint without NaN pass-through', () => {
    const suggester = makeSuggester(makeBuild({xiphos: true}), makeArtifacts(), {
        settings: {
            sets_settings: {},
            stats: {recharge_min: 10000},
            setMinValues: {},
            setMaxValues: {},
        },
    });

    suggester.prepare();

    const constraint = suggester.featureVariants.default.constraintData;
    expect(constraint.usedStats).toEqual(expect.arrayContaining([
        'recharge',
        'recharge_base',
        'mastery',
        'mastery_base',
    ]));
    expect(constraint.postEffects.some((item) => item.stat == 'recharge')).toBe(true);
    expect(suggester.featureVariants.default.checkFunc(new Stats())).toBe(false);
    expect(suggester.getResult(() => {})).toEqual([]);
});

test('a required set that is absent from the candidate pool counts as zero pieces', () => {
    const suggester = makeSuggester(makeBuild(), makeArtifacts('GladiatorFinale'), {
        settings: {
            sets_settings: {},
            stats: {},
            setMinValues: {EmblemofSeveredFate: 2},
            setMaxValues: {},
        },
    });

    suggester.prepare();

    expect(suggester.getResult(() => {})).toEqual([]);
    expect(suggester.skippedCombinations).toBe(1);
});

test('an equipped artifact fills a slot omitted from the candidate pool', () => {
    const build = makeBuild();
    const equipped = makeArtifacts('WandererTroupe');

    for (const artifact of equipped) {
        build.setArtifact(artifact);
    }

    const candidates = makeArtifacts('GladiatorFinale').filter((artifact) => {
        return artifact.slot != 'circlet';
    });
    const suggester = makeSuggester(build, candidates);

    suggester.prepare();
    const results = suggester.getResult(() => {});

    expect(suggester.slots.circlet).toEqual([equipped[4]]);
    expect(results).toHaveLength(1);
    expect(results[0].artifacts).toHaveLength(5);
    expect(results[0].artifacts.find((artifact) => artifact.slot == 'circlet')).toBe(equipped[4]);

    // Preparation must not strip the source build, and a second preparation
    // must see the same equipped fallback rather than an artificial empty slot.
    expect(build.getArtifacts().circlet).toBe(equipped[4]);
    suggester.prepare();
    expect(build.getArtifacts().circlet).toBe(equipped[4]);
    expect(suggester.slots.circlet).toEqual([equipped[4]]);
    expect(suggester.getResult()).toHaveLength(1);
});

test('repeated CPU getResult calls are deterministic and leave prepared stats unchanged', () => {
    const suggester = makeSuggester(makeBuild(), makeArtifacts());

    suggester.prepare();
    const preparedStats = new Stats(suggester.buildData.stats);
    const first = suggester.getResult(() => {});
    const second = suggester.getResult(() => {});

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(second[0].value).toBeCloseTo(first[0].value, 10);
    expect(suggester.buildData.stats).toEqual(preparedStats);
});

test('CPU keeps finite negative scores and does not require a progress callback', () => {
    const suggester = makeSuggester(makeBuild(), makeArtifacts());

    suggester.prepare();
    suggester.cpuOptimizationProgram.evaluate = () => -5;

    const results = suggester.getResult();

    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(-5);
});

test('missing objective output is invalid rather than a feasible zero score', () => {
    const suggester = makeSuggester(makeBuild(), makeArtifacts());

    suggester.prepare();
    suggester.cpuOptimizationProgram.evaluate = () => undefined;

    expect(suggester.getResult()).toEqual([]);
    expect(suggester.skippedCombinations).toBe(1);
});

test('post-effect constraints can pass and exact stat bounds are inclusive', () => {
    const xiphosSuggester = makeSuggester(makeBuild({xiphos: true}), makeArtifacts(), {
        settings: {
            sets_settings: {},
            stats: {recharge_min: 0, recharge_max: 10000},
            setMinValues: {},
            setMaxValues: {},
        },
    });
    xiphosSuggester.prepare();
    expect(xiphosSuggester.getResult()).toHaveLength(1);

    const boundarySuggester = makeSuggester(makeBuild(), makeArtifacts(), {
        settings: {
            sets_settings: {},
            stats: {crit_rate_min: 5, crit_rate_max: 5},
            setMinValues: {},
            setMaxValues: {},
        },
    });
    boundarySuggester.prepare();
    expect(boundarySuggester.featureVariants.default.checkFunc(new Stats({
        crit_rate_base: 0.05,
        crit_rate: 0,
    }))).toBe(true);
});

test('malformed required-set thresholds fail before enumeration', () => {
    const suggester = makeSuggester(makeBuild(), makeArtifacts(), {
        settings: {
            sets_settings: {},
            stats: {},
            setMinValues: {EmblemofSeveredFate: 'bogus'},
            setMaxValues: {},
        },
    });

    expect(() => suggester.prepare()).toThrow('must be an integer');
});

test('CPU rejects a global Cartesian tie index outside the safe-integer domain', () => {
    const suggester = makeSuggester(makeBuild(), makeArtifacts());
    suggester.combinationIndexContext = {
        splitSlot: 'flower',
        splitOffset: 0,
        globalCounts: Object.fromEntries(SLOTS.map((slot) => [slot, 10000])),
    };

    expect(() => suggester.prepare()).toThrow('exceeds Number.MAX_SAFE_INTEGER');
});
