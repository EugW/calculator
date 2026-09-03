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

test('explicit correlated CPU evaluation matches ordinary optimizer enumeration', () => {
    const gladiatorArtifacts = makeArtifacts('GladiatorFinale');
    const alternateFlower = new Artifact(
        5,
        20,
        'flower',
        'WandererTroupe',
        MAIN_STATS.flower,
        [],
    );
    const suggester = makeSuggester(
        makeBuild(),
        gladiatorArtifacts.concat([alternateFlower]),
        {
            settings: {
                sets_settings: {},
                stats: {},
                setMinValues: {GladiatorFinale: 5},
                setMaxValues: {},
            },
        },
    );

    suggester.prepare();
    const preparedStats = new Stats(suggester.buildData.stats);
    const results = suggester.getResult();

    expect(results).toHaveLength(1);
    expect(suggester.evaluateArtifactCombination(
        [...results[0].artifacts].reverse()
    )).toBeCloseTo(results[0].value, 10);

    // Upgrade outcomes need not be objects from the prepared candidate pool.
    const freshEquivalentFlower = new Artifact(
        5,
        20,
        'flower',
        'GladiatorFinale',
        MAIN_STATS.flower,
        [],
    );
    const freshCombination = results[0].artifacts.map((artifact) => {
        return artifact.getSlot() == 'flower' ? freshEquivalentFlower : artifact;
    });
    expect(suggester.evaluateArtifactCombination(freshCombination)).toBeCloseTo(
        results[0].value,
        10,
    );

    const rejectedCombination = gladiatorArtifacts.map((artifact) => {
        return artifact.getSlot() == 'flower' ? alternateFlower : artifact;
    });
    expect(suggester.evaluateArtifactCombination(rejectedCombination)).toBeUndefined();
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

test.each([4, 5])('transient %i-star outcome scoring is exact without retained per-outcome caches', rarity => {
    const pool = makeArtifacts();
    const suggester = makeSuggester(makeBuild({xiphos: true}), pool);
    suggester.prepare();
    const outcome = new Artifact(rarity, rarity === 5 ? 20 : 16, 'flower', 'GladiatorFinale', 'hp',
        rarity === 5 ? [
            {stat: 'crit_rate', value: 15.6}, {stat: 'crit_dmg', value: 23.3},
            {stat: 'atk_percent', value: 5.8}, {stat: 'atk', value: 19},
        ] : [
            {stat: 'crit_rate', value: 9.3}, {stat: 'crit_dmg', value: 12.4},
            {stat: 'atk_percent', value: 4.7}, {stat: 'atk', value: 16},
        ]);
    const control = outcome.clone();
    const companions = pool.filter(artifact => artifact.slot !== 'flower');
    const expected = suggester.evaluateArtifactCombination([control, ...companions]);
    expect(Number.isFinite(expected)).toBe(true);
    expect(suggester.evaluateArtifactCombination([outcome, ...companions], outcome)).toBe(expected);
    expect(outcome.calculated).toBeNull();
    expect(outcome.concatFunc).toBeUndefined();
    expect(suggester.explicitArtifactCache.has(outcome)).toBe(false);

    const rejected = makeSuggester(makeBuild(), pool, {settings: {stats: {atk_min: 100000}}});
    rejected.prepare();
    expect(rejected.evaluateArtifactCombination([outcome, ...companions], outcome)).toBeUndefined();
    expect(outcome.calculated).toBeNull();
    expect(rejected.explicitArtifactCache.has(outcome)).toBe(false);
});

function seededRandom(seed) {
    return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
}

function randomArtifact(random, rarity, slot, set) {
    const mains = DB.Artifacts.Slots.get(slot).mainStats;
    const main = mains[Math.floor(random() * mains.length)];
    const pool = DB.Artifacts.Substats.getKeys().filter(stat => stat !== main);
    const stats = [];
    const lines = Math.min(4, DB.Artifacts.Rarity[rarity - 1].maxSubstats);
    while (stats.length < lines) {
        const stat = pool[Math.floor(random() * pool.length)];
        if (!stats.includes(stat)) stats.push(stat);
    }
    const subs = stats.map(stat => {
        const data = DB.Artifacts.Substats.get(stat);
        const rolls = data.rolls[rarity - 1];
        let units = 0;
        for (let roll = 0, count = 1 + Math.floor(random() * 3); roll < count; ++roll) {
            units += Math.round(rolls[Math.floor(random() * rolls.length)] * 100);
        }
        const scale = data.type === 'percent' ? 10 : 1;
        return {stat, value: Math.round((units / 100 + 1e-8) * scale) / scale};
    });
    const maxLevel = DB.Artifacts.Rarity[rarity - 1].maxLevel;
    return new Artifact(rarity, Math.floor(random() * (maxLevel + 1)), slot, set, main, subs);
}

test('the exact optimizer-stat lowering matches calcOptimizerStats key for key', () => {
    const random = seededRandom(3);
    const suggester = makeSuggester(makeBuild({xiphos: true}), makeArtifacts());
    suggester.prepare();
    for (const usedStats of [suggester.usedStats, ['crit_value'], ['crit_rate', 'hp', 'mastery'],
        DB.Artifacts.Substats.getKeys().concat(['crit_value', 'dmg_phys', 'healing'])]) {
        const lower = Artifact.createOptimizerStatsLowering(usedStats);
        for (let i = 0; i < 400; ++i) {
            const slot = SLOTS[i % SLOTS.length];
            const artifact = randomArtifact(random, 3 + i % 3, slot, 'GladiatorFinale');
            const expected = artifact.calcOptimizerStats(usedStats);
            const {keys, values, length} = lower(artifact);
            expect(keys.slice(0, length)).toEqual(Object.keys(expected));
            keys.slice(0, length).forEach((stat, at) => expect(Object.is(values[at], expected[stat])).toBe(true));
        }
    }
});

test('the forced-outcome scorer reproduces evaluateArtifactCombination bit for bit', () => {
    const random = seededRandom(5);
    const sets = ['GladiatorFinale', 'WandererTroupe', 'NoblesseOblige'];
    const pool = [];
    for (const slot of SLOTS) {
        if (slot === 'flower') continue;
        for (let i = 0; i < 6; ++i) pool.push(randomArtifact(random, 5, slot, sets[i % sets.length]));
    }
    pool.push(new Artifact(5, 20, 'flower', 'GladiatorFinale', 'hp', []));
    for (const settings of [undefined, {stats: {atk_min: 1500}}, {stats: {atk_min: 100000}}]) {
        const suggester = makeSuggester(makeBuild({xiphos: true}), pool, settings ? {settings} : {});
        suggester.prepare();
        const scorer = suggester.createForcedOutcomeScorer('flower', 'GladiatorFinale');
        const companions = ['plume', 'sands', 'goblet', 'circlet'].map(slot => suggester.slots[slot]);
        let rejected = 0;
        for (let i = 0; i < 300; ++i) {
            const outcome = randomArtifact(random, 5, 'flower', 'GladiatorFinale');
            outcome.level = 20;
            const picks = companions.map(pieces => Math.floor(random() * pieces.length));
            const complement = picks.map((pick, axis) => companions[axis][pick]);
            const expected = suggester.evaluateArtifactCombination([outcome, ...complement], outcome);
            const scored = scorer(outcome, picks.join('/'), () => complement);
            expect(Object.is(scored.value, expected)).toBe(true);
            expect(scored.complement).toEqual(complement);
            if (expected === undefined) ++rejected;
        }
        // The impossible constraint rejects every build through the cache.
        if (settings?.stats.atk_min === 100000) expect(rejected).toBe(300);
    }
    const suggester = makeSuggester(makeBuild(), pool);
    suggester.prepare();
    expect(() => suggester.createForcedOutcomeScorer('flower', 'WandererTroupe')).toThrow('outside the prepared');
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
