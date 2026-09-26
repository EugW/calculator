import { Artifact } from "./Artifact";
import { getPostEffectStatDependencyClosure } from "./Build/Data";
import { Condition } from "./Condition";
import { FeatureCompiler } from "./Feature2/Compiler";
import { Stats } from "./Stats";
import { GPUArtifactOptimizer } from "./GPUArtifactOptimizer";
import { GPUForcedOutcomeOptimizer, chunkDenseBlocks, FUSED_CHUNK_LIMIT, packForcedOutcomeInputs,
    reduceForcedOutcomeReadback } from "./GPUForcedOutcomeOptimizer";
import { GPU_SLOT_NAMES } from "./GPUOptimizerInputs";
import { GPUDeviceContext } from "./GPUDeviceContext";
import {
    GPU_TOP_K_CAPACITY,
    normalizeGPUOptimizerBatchSize,
} from "./GPUOptimizerContract";
import {
    compareOptimizerResults,
    DEFAULT_OPTIMIZER_RESULT_LIMIT,
    getArtifactCombinationCounts,
    remapCombinationIndex,
} from "./OptimizerResult";
import {
    createOptimizationPlan,
    createOptimizationPlanConstraints,
} from "./OptimizationPlan";
import { compileOptimizationPlanCPU } from "./OptimizationPlanCPU";

const DYNAMIC_STATS = ['crit_value'];

// Worker-local device, with independent pipeline/resource owners.
const gpuContext = new GPUDeviceContext();
let gpuOptimizer = null;
let forcedOutcomeOptimizer = null;

export class ArtifactsSuggest {
    constructor(data) {
        this.sourceBuild = data.build;
        this.build = null;
        this.artifacts = data.artifacts;
        this.featureName = data.featureName;
        this.featureType = data.featureType;
        this.settings = data.settings;
        this.requestedLimit = data.limit === undefined
            ? DEFAULT_OPTIMIZER_RESULT_LIMIT
            : data.limit;
        this.limit = data.limit || DEFAULT_OPTIMIZER_RESULT_LIMIT;
        this.useGPU = data.useGPU === true; // Disabled by default, opt-in
        this.gpuBatchSize = normalizeGPUOptimizerBatchSize(data.gpuBatchSize);
        this.combinationIndexContext = data.combinationIndexContext || null;
        this.showBeta = data.showBeta !== false; // Default to true for backwards compatibility
    }

    prepare() {
        this.optimizationPlanConstraints = createOptimizationPlanConstraints(this.settings);
        this.settings = Object.assign({}, this.settings, {
            setMinValues: this.optimizationPlanConstraints.setConstraints.minValues,
            setMaxValues: this.optimizationPlanConstraints.setConstraints.maxValues,
        });

        // CalcObjectArtifacts#get returns its live slot map. Keep a snapshot so
        // clearArtifacts does not also erase the empty-slot fallbacks. Work on
        // a fresh clone so prepare() is repeatable and never strips the caller's
        // equipped artifacts or modifies its artifact settings.
        this.currentArts = Object.assign({}, this.sourceBuild.getArtifacts());
        this.build = this.sourceBuild.clone();
        this.build.clearArtifacts();
        // this.addArtifactPostSettings();
        this.build.artifacts.modifySettings(this.settings.sets_settings);

        this.buildData = this.build.getBuildData();

        // ???
        let baseConditions = this.build.getActiveConditions(this.buildData.settings);
        Condition.setCommonValues(this.buildData.settings, baseConditions);

        this.prepareArtifactSets();
        this.prepareDynamicStats();

        let compilerOpts = {
            // dontProcessTree: 1,
            ignoreSideEffects: 1,
            staticStats: [],
        };

        this.featureVariants = {};
        this.usedStats = [];
        let variationData = [];
        let planVariations = [];

        let statBounds = this.optimizationPlanConstraints.statConstraints.bounds;
        let statFilterUsedStats = this.optimizationPlanConstraints.statConstraints.targetStats;

        this.usedStats = this.usedStats.concat(statFilterUsedStats);

        for (let variant of this.getVariations()) {
            let vBuild = this.build.clone();
            let setSettings = Object.assign({}, this.settings.sets_settings);
            let variantNames = [];
            let artSetIds = [];

            for (let vItem of variant) {
                if (vItem.setId) {
                    variantNames.push(vItem.name);
                    setSettings[ Artifact.settingName(vItem.setId) ] = vItem.pieces;
                    for (let i = 0; i < vItem.pieces; ++i) {
                        artSetIds.push(vItem.setId);
                    }
                }
            }

            for (let slot of DB.Artifacts.Slots.getKeys()) {
                let setId = artSetIds.pop();
                if (!setId) break;

                let art = new Artifact(5, 20, slot, setId, '', []);
                vBuild.setArtifact(art);
            }

            let variandId = variantNames.sort().join('-') || 'default';
            vBuild.artifacts.modifySettings(setSettings);
            let vBuildData = vBuild.getBuildData();
            this.addDynamicStats(vBuildData.getActivePostEffectsTree());
            let feature = vBuild.getFeatureByName(this.featureName);

            // FIXME rotation detect
            if (feature.items) {
                this.addDynamicStatsFromItems(vBuildData, feature.items);
            }

            // Track set info for GPU variation lookup
            let setInfo = [];
            for (let vItem of variant) {
                if (vItem.setId) {
                    setInfo.push({setName: vItem.setId, pieces: vItem.pieces});
                }
            }

            variationData.push({
                variandId: variandId,
                feature: feature,
                buildData: vBuildData,
                setInfo: setInfo,
            });
        }

        for (let item of variationData) {
            let activePostTree = item.buildData.postEffectTreeByPriority();
            let constraintData = makeStatConstraintData(
                statBounds,
                activePostTree,
                statFilterUsedStats
            );
            let postTrees = this.filterPostEffects(item.feature, item.buildData);

            let tree = item.feature.getTree(item.buildData, compilerOpts);
            let compiler = new FeatureCompiler(tree, postTrees);

            let usedStats = [...new Set(compiler.usedStats.concat(constraintData.usedStats))];
            this.usedStats = this.usedStats.concat(usedStats);
            item.buildData.stats.ensure(usedStats);

            compilerOpts.staticStats = this.makeStaticStats(usedStats);

            compiler.prepare(item.buildData, compilerOpts);
            compiler.compile(compilerOpts);
            const objectiveUsedStats = compiler.usedStats.slice();

            // Keep the complete constraint dependency closure available to all
            // backends, including stats read only by a relevant post effect.
            for (const stat of constraintData.usedStats) {
                if (!compiler.usedStats.includes(stat)) {
                    compiler.usedStats.push(stat);
                }
            }

            this.usedStats = this.usedStats.concat(compiler.usedStats);
            compiler.constraintData = constraintData;
            compiler.setInfo = item.setInfo;  // For GPU variation lookup

            this.featureVariants[item.variandId] = compiler;
            planVariations.push({
                id: item.variandId,
                objectiveAst: compiler.processed,
                objectiveUsedStats,
                constraintPostEffects: constraintData.postEffects,
                constraintUsedStats: constraintData.usedStats,
                constraintTargetStats: constraintData.targetStats,
                setInfo: item.setInfo,
            });
        }

        this.planVariationInputs = planVariations;
        this.setOptimizationObjective(this.featureType);

        this.usedStats = [...new Set(this.usedStats)];
        this.buildData.stats.truncate(this.usedStats);
        this.buildData.stats.ensure(this.usedStats);

        this.prepareArtifacts();
    }

    /**
     * Rebind the selected result component by constructing a new immutable
     * semantic plan over the already prepared shared AST references. This is
     * explicit so a caller cannot mutate featureType behind a compiled CPU or
     * GPU program and accidentally evaluate a different objective.
     */
    setOptimizationObjective(objective) {
        if (!this.planVariationInputs) {
            throw new Error('Artifact suggester must be prepared before rebinding its objective');
        }

        const plan = createOptimizationPlan({
            constraints: this.optimizationPlanConstraints,
            objective,
            variations: this.planVariationInputs,
        });
        const cpuProgram = compileOptimizationPlanCPU(plan);

        this.featureType = objective;
        this.optimizationPlan = plan;
        this.cpuOptimizationProgram = cpuProgram;

        // Temporary compatibility surface for diagnostics and callers that
        // inspect the prepared feature compiler. Production evaluation below
        // is driven exclusively by the shared plan lowering.
        for (const variation of plan.variations) {
            const compiler = this.featureVariants[variation.id];
            compiler.checkFunc = cpuProgram.variationsById[variation.id].checkStats;
        }
    }

    getVariations() {
        let usedVariations = {};
        let variations = [];

        for (let setId of Object.keys(this.setData)) {
            for (let pieces of Object.keys(this.setData[setId])) {
                let data = this.setData[setId][pieces];
                if (data.variation && !usedVariations[data.variation]) {
                    usedVariations[data.variation] = 1;
                    variations.push({
                        name: data.variation,
                        setId: setId,
                        pieces: parseInt(pieces),
                    });
                }
            }
        }

        let variationCombinations = [
            [{name: 'default'}],
        ];

        for (let i = 0; i < variations.length; ++i) {
            let item1 = variations[i];
            variationCombinations.push([item1]);

            for (let j = i + 1; j < variations.length; ++j) {
                let item2 = variations[j];
                if (item1.pieces + item2.pieces <= 5) {
                    variationCombinations.push([item1, item2]);
                }
            }
        }

        return variationCombinations;
    }

    filterPostEffects(feature, buildData) {
        if (feature.isRotation()) {
            return [];
        }

        let postItems = buildData.postEffectTreeByPriority();
        buildData.postEffects = [];
        let result = [];

        for (let items of postItems) {
            let tree = feature.getTree(buildData);
            let compiler = new FeatureCompiler(tree, result);
            let usedStats = compiler.usedStats;

            for (let item of items) {
                for (let stat of item.getAssignedStats()) {
                    if (usedStats.includes(stat)) {
                        result.push(item);
                    }
                }
            }
        }

        return result;
    }

    prepareArtifacts() {
        this.slots = {
            flower: [],
            plume: [],
            sands: [],
            goblet: [],
            circlet: [],
        };
        this.explicitArtifactCache = new WeakMap();
        this.explicitArtifactSetSlots = new Map(
            Object.keys(this.slots).map((slot) => [slot, new Set()])
        );
        this.setNames = {};
        this.totalCombinations = 1;

        for (let art of this.artifacts) {
            this.setNames[art.set] = 1;

            this.prepareExplicitArtifact(art);
            this.explicitArtifactSetSlots.get(art.slot).add(art.set);
            this.slots[art.slot].push(art);
        }

        for (const slot of Object.keys(this.slots)) {
            if (this.slots[slot].length == 0) {
                let curArt = this.currentArts[slot];
                if (curArt) {
                    this.setNames[curArt.set] = 1;
                    this.prepareExplicitArtifact(curArt);
                    this.explicitArtifactSetSlots.get(slot).add(curArt.set);
                    this.slots[slot].push(curArt);
                } else {
                    let emptyArtifact = new Artifact(5, 0, slot, 'none', 'none', []);
                    emptyArtifact.isEmpty = true;
                    this.setNames[emptyArtifact.set] = 1;
                    this.prepareExplicitArtifact(emptyArtifact);
                    this.explicitArtifactSetSlots.get(slot).add(emptyArtifact.set);
                    this.slots[slot].push(emptyArtifact);
                }
            }

            this.totalCombinations *= this.slots[slot].length;
        }

        if (!Number.isSafeInteger(this.totalCombinations) || this.totalCombinations < 1) {
            throw new RangeError(
                `CPU optimizer requires a positive safe-integer Cartesian product; got ${this.totalCombinations}`
            );
        }

        const globalCounts = this.combinationIndexContext?.globalCounts;
        if (globalCounts) {
            let globalTotal = 1;
            for (const slot of this.optimizationPlan.ordering.cartesianSlotOrder) {
                const count = globalCounts[slot];
                if (!Number.isInteger(count) || count < 1) {
                    throw new RangeError(`CPU optimizer global Cartesian count for "${slot}" is invalid`);
                }
                globalTotal *= count;
            }
            if (!Number.isSafeInteger(globalTotal)) {
                throw new RangeError(
                    `CPU optimizer global Cartesian index exceeds Number.MAX_SAFE_INTEGER; got ${globalTotal} combinations`
                );
            }
        }
    }

    prepareArtifactSets() {
        let setPieces = {};
        let availableArtifacts = [].concat(this.artifacts);
        let candidateSlots = new Set(this.artifacts.map((art) => {return art.slot;}));

        for (let [slot, art] of Object.entries(this.currentArts)) {
            if (art && !candidateSlots.has(slot)) {
                availableArtifacts.push(art);
            }
        }

        for (let art of availableArtifacts) {
            if (!setPieces[art.set]) {
                setPieces[art.set] = {};
            }
            setPieces[art.set][art.slot] = 1;
        }

        let setMaxPieces = {};
        for (let setName of Object.keys(setPieces)) {
            setMaxPieces[setName] = Object.keys(setPieces[setName]).length;
        }


        this.setData = {};
        // let baseSettings = Object.assign({}, this.buildData.settings, this.settings.sets_settings);
        let baseSettings = Object.assign({}, this.buildData.settings);

        // let artPostItems = DB.Buffs.get('Artifacts').getPostEffects();
        // let postArtNames = [];
        // for (let item of artPostItems) {
        //     if (item.params.suggesterPieces) {
        //         postArtNames.push(item.params.suggesterPieces);
        //     }
        // }

        let activePostEffects = this.buildData.getActivePostEffects().length;

        for (let setId of DB.Artifacts.Sets.getKeys(this.showBeta)) {
            let set = DB.Artifacts.Sets.get(setId);
            let bonuses = set.getConditionsByPieces();

            let setStats = new Stats();
            let setPostStats;
            let setTotalSettings = {};
            let artPiecesName = Artifact.settingNameShort(setId);
            let maxPieces = setMaxPieces[setId] || 0;

            let buildData = this.build.getBuildData();
            let prevActivePostEffects = activePostEffects;
            let featureVariation = '';

            for (let pieces = 1; pieces < bonuses.length; ++pieces) {
                if (pieces > maxPieces) {
                    break;
                }

                buildData.addSettings({[Artifact.settingName(setId)]: pieces});

                const conditions = bonuses[pieces];
                let pieceSettings = {};

                if (conditions.length) {
                    pieceSettings = Condition.allConditionsOn(conditions, baseSettings);
                    let calculatedSettings = getCalculatedConditionSettings(conditions, baseSettings);
                    for (let key of Object.keys(pieceSettings)) {
                        if (baseSettings.hasOwnProperty(key) && !calculatedSettings.hasOwnProperty(key)) {
                            pieceSettings[key] = baseSettings[key];
                        }
                    }
                    let localSettings = Object.assign({}, baseSettings, pieceSettings);

                    let stats = new Stats();

                    for (let cond of conditions) {
                        let data = cond.getData(localSettings);
                        stats.concat(data.stats);
                        Object.assign(localSettings, data.settings);
                    }

                    // stats.truncate(this.usedStats); // TODO нужно пересчитать после обработки всех variation
                    setStats.concat(stats);
                    Object.assign(setTotalSettings, pieceSettings);
                    buildData.addSettings(pieceSettings);
                }

                setStats = this.calculateSetStats(setId, pieces, setTotalSettings);

                // change variation if new togglable condition or post effect appears
                let curActivePostEffects = buildData.getActivePostEffects().length;
                let curSerializableConditions = conditions.filter((i) => {return i.isSerializable();}).length;
                if (curActivePostEffects > prevActivePostEffects) {
                    prevActivePostEffects = curActivePostEffects;
                    featureVariation = artPiecesName + pieces;
                } else if (curSerializableConditions) {
                    featureVariation = artPiecesName + pieces;
                }

                if (Object.keys(setStats).length || setPostStats || featureVariation) {
                    let s = new Stats(setStats);

                    if (!this.setData[setId]) {
                        this.setData[setId] = {};
                    }

                    this.setData[setId][pieces] = {
                        stats: s,
                        variation: featureVariation,
                        concatFunc: s.getConcatFunc(),
                    };
                }
            }
        }
    }

    calculateSetStats(setId, pieces, setSettings) {
        let build = this.build.clone();
        let slots = DB.Artifacts.Slots.getKeys();
        let fakeArtifacts = [];

        for (let i = 0; i < pieces && i < slots.length; ++i) {
            fakeArtifacts.push(new Artifact(5, 20, slots[i], setId, '', []));
        }

        build.artifacts.replace(fakeArtifacts);
        build.artifacts.modifySettings(Object.assign({}, this.settings.sets_settings, setSettings));

        let buildData = build.getBuildData();
        let stats = new Stats(buildData.stats);
        stats.concat(this.buildData.stats.revert());

        return normalizeSetStats(stats);
    }

    prepareDynamicStats() {
        let stats = {};

        for (let stat of DB.Artifacts.Mainstats.getKeys()) {
            stats[stat] = 1;
        }

        for (let stat of DB.Artifacts.Substats.getKeys()) {
            stats[stat] = 1;
        }

        for (let setId of Object.keys(this.setData)) {
            for (let pieces of Object.keys(this.setData[setId])) {
                let setStats = this.setData[setId][pieces].stats;
                for (let stat of Object.keys(setStats)) {
                    if (/^text_/.test(stat)) continue;
                    stats[stat] = 1;
                }
            }
        }

        this.dynamicStats = Object.keys(stats);
    }

    addDynamicStats(items) {
        for (let item of items) {
            if (item.stat && !this.dynamicStats.includes(item.stat)) {
                this.dynamicStats.push(item.stat);
            }
        }
    }

    addDynamicStatsFromItems(buildData, items) {
        for (let item of items) {

            if (item.postEffects) {
                for (let post of item.postEffects) {
                    if (!post.getTree) continue;
                    this.addDynamicStats(post.getTree(buildData));
                }
            }

            if (item.items) {
                this.addDynamicStatsFromItems(buildData, item.items);
            }

            if (item.conditions) {
                this.addDynamicStatsFromItems(buildData, item.conditions);
            }
        }
    }

    makeStaticStats(usedStats) {
        let result = [];

        for (let stat of usedStats) {
            if (this.dynamicStats.includes(stat)) continue;
            if (DYNAMIC_STATS.includes(stat)) continue;
            result.push(stat);
        }

        return result;
    }

    /**
     * Evaluate one explicit, already-correlated artifact combination through
     * the prepared authoritative CPU plan. Missing slots are treated as empty;
     * duplicate slots are invalid. The artifacts do not have to be members of
     * the original candidate array, but their slots and sets must belong to the
     * topology for which this suggester was prepared.
     *
     * @param {Artifact[]} artifacts at most one artifact per slot
     * @param {Artifact|null} transientArtifact an outcome to score without
     * retaining numerical caches or a generated concatenation function
     * @returns {number|undefined} finite f64 objective, or undefined when the
     * combination violates complete-set/stat constraints or has no variation
     */
    evaluateArtifactCombination(artifacts, transientArtifact = null) {
        if (
            !this.cpuOptimizationProgram ||
            !this.buildData ||
            !this.setData ||
            !this.slots ||
            !this.explicitArtifactCache ||
            !this.explicitArtifactSetSlots
        ) {
            throw new Error('Artifact suggester must be prepared before evaluating a combination');
        }
        if (!Array.isArray(artifacts)) {
            throw new TypeError('Artifact combination must be an array');
        }

        let artSets = {};
        let usedSlots = new Set();

        for (let artifact of artifacts) {
            if (
                !artifact ||
                typeof artifact.getSlot !== 'function' ||
                typeof artifact.getSet !== 'function' ||
                typeof artifact.calcCache !== 'function'
            ) {
                throw new TypeError('Artifact combination contains an invalid artifact');
            }

            let slot = artifact.getSlot();
            if (!Object.prototype.hasOwnProperty.call(this.slots, slot)) {
                throw new RangeError(`Artifact combination contains unknown slot "${slot}"`);
            }
            if (usedSlots.has(slot)) {
                throw new RangeError(`Artifact combination contains more than one "${slot}" artifact`);
            }
            usedSlots.add(slot);

            let setName = artifact.getSet();
            if (!this.explicitArtifactSetSlots.get(slot).has(setName)) {
                throw new RangeError(
                    `Artifact set "${setName}" in slot "${slot}" is outside the prepared optimizer topology`
                );
            }

            if (artifact !== transientArtifact) this.prepareExplicitArtifact(artifact);
            artSets[setName] = (artSets[setName] || 0) + 1;
        }

        if (this.cpuOptimizationProgram.rejectsCompleteSetsTrusted(artSets)) {
            return undefined;
        }

        let variationId = this.cpuOptimizationProgram.resolveVariationIdTrusted(artSets);
        if (variationId === undefined) {
            return undefined;
        }

        let artStats = new Stats(this.buildData.stats);
        for (let artifact of artifacts) {
            if (artifact === transientArtifact) {
                // Forced outcomes are each rescored once. Do not retain a
                // Stats object/cache/generated function for millions of them.
                const calculated = artifact.calcOptimizerStats(this.usedStats);
                for (const stat of Object.keys(calculated)) artStats[stat] += calculated[stat];
            } else {
                artifact.concatFunc(artStats);
            }
        }

        for (let setName in artSets) {
            let setData = this.setData[setName] && this.setData[setName][artSets[setName]];
            if (setData && setData.concatFunc) {
                setData.concatFunc(artStats);
            }
        }

        return this.cpuOptimizationProgram.evaluate(variationId, artStats);
    }

    /**
     * Rescore many forced outcomes of one run (same target slot and set):
     * scorer(outcome, key, decode) equals
     * evaluateArtifactCombination([outcome, ...decode()], outcome), bit for bit.
     * Validation, set counts, the variation and set-bonus functions are
     * resolved once per distinct companion build (`key`), the base stats copy
     * is precompiled, and outcome stats use the shared exact lowering.
     * Additions keep the original order: base, outcome, companions, sets.
     * Returns {value, complement}; value is undefined when rejected.
     */
    createForcedOutcomeScorer(targetSlot, outcomeSet) {
        if (!this.cpuOptimizationProgram || !this.buildData || !this.setData || !this.slots
            || !this.explicitArtifactSetSlots) {
            throw new Error('Artifact suggester must be prepared before evaluating a combination');
        }
        if (!this.explicitArtifactSetSlots.get(targetSlot)?.has(outcomeSet)) {
            throw new RangeError(
                `Artifact set "${outcomeSet}" in slot "${targetSlot}" is outside the prepared optimizer topology`
            );
        }
        const base = this.buildData.stats;
        // Constant property names keep the per-outcome copy monomorphic.
        const copyBase = Function('Stats', 'base', `return function () {
    const stats = new Stats();
${Object.keys(base).map(stat => `    stats[${JSON.stringify(stat)}] = base[${JSON.stringify(stat)}];`).join('\n')}
    return stats;
};`)(Stats, base);
        const lower = Artifact.createOptimizerStatsLowering(this.usedStats);
        const complements = new Map();
        const prepare = complement => {
            const artSets = {[outcomeSet]: 1};
            const usedSlots = new Set([targetSlot]);
            for (const artifact of complement) {
                if (!artifact || typeof artifact.getSlot !== 'function' || typeof artifact.getSet !== 'function'
                    || typeof artifact.calcCache !== 'function') {
                    throw new TypeError('Artifact combination contains an invalid artifact');
                }
                const slot = artifact.getSlot();
                if (!Object.prototype.hasOwnProperty.call(this.slots, slot)) {
                    throw new RangeError(`Artifact combination contains unknown slot "${slot}"`);
                }
                if (usedSlots.has(slot)) {
                    throw new RangeError(`Artifact combination contains more than one "${slot}" artifact`);
                }
                usedSlots.add(slot);
                const setName = artifact.getSet();
                if (!this.explicitArtifactSetSlots.get(slot).has(setName)) {
                    throw new RangeError(
                        `Artifact set "${setName}" in slot "${slot}" is outside the prepared optimizer topology`
                    );
                }
                this.prepareExplicitArtifact(artifact);
                artSets[setName] = (artSets[setName] || 0) + 1;
            }
            const variationId = this.cpuOptimizationProgram.rejectsCompleteSetsTrusted(artSets)
                ? undefined : this.cpuOptimizationProgram.resolveVariationIdTrusted(artSets);
            const setFuncs = [];
            for (const setName in artSets) {
                const setData = this.setData[setName] && this.setData[setName][artSets[setName]];
                if (setData && setData.concatFunc) setFuncs.push(setData.concatFunc);
            }
            return {complement, variationId, setFuncs};
        };
        return (outcome, key, decode) => {
            let entry = complements.get(key);
            if (!entry) {
                entry = prepare(decode());
                complements.set(key, entry);
            }
            if (entry.variationId === undefined) return {value: undefined, complement: entry.complement};
            const stats = copyBase();
            const {keys, values, length} = lower(outcome);
            for (let i = 0; i < length; ++i) stats[keys[i]] += values[i];
            for (const artifact of entry.complement) artifact.concatFunc(stats);
            for (const concat of entry.setFuncs) concat(stats);
            return {value: this.cpuOptimizationProgram.evaluate(entry.variationId, stats), complement: entry.complement};
        };
    }

    /** Keep artifact stat lowering valid across different prepared suggesters. */
    prepareExplicitArtifact(artifact) {
        let cached = this.explicitArtifactCache && this.explicitArtifactCache.get(artifact);
        if (
            cached &&
            cached.calculated === artifact.calculated &&
            cached.concatFunc === artifact.concatFunc
        ) {
            return;
        }

        artifact.calcCache(this.usedStats);
        artifact.concatFunc = artifact.calculated.getConcatFunc();
        this.explicitArtifactCache ||= new WeakMap();
        this.explicitArtifactCache.set(artifact, {
            calculated: artifact.calculated,
            concatFunc: artifact.concatFunc,
        });
    }

    getResult(callback) {
        let combination;
        let results = [];
        let minimalValue = Number.NEGATIVE_INFINITY;
        this.currentCombinations = 0;
        this.skippedCombinations = 0;

        let artifacts;
        let artSets;
        let artStats;
        let value;
        const localCombinationCounts = getArtifactCombinationCounts(this.slots);

        // Every run starts from and leaves behind the prepared build state.
        // Candidate stats are passed directly to the compiled feature instead
        // of replacing buildData.stats with the last visited combination.
        let initialStats = new Stats(this.buildData.stats);
        let initialStatFunc = initialStats.getSetFunc();
        let generator = artifactCombinations(this.cpuOptimizationProgram, this.setNames, this.slots, (val) => {
            this.currentCombinations += val;
            this.skippedCombinations += val;
            if (callback && (this.currentCombinations % 50000 == 0 || val > 50000)) {
                callback(this.currentCombinations, this.totalCombinations, this.skippedCombinations);
            }
        });

        if (callback) {
            callback(this.currentCombinations, this.totalCombinations, this.skippedCombinations);
        }

        while (combination = generator.next()) {
            if (combination.done) {
                break;
            }

            ++this.currentCombinations;
            // Keep this trillion-scale hot loop inlined. The public explicit
            // scorer above deliberately performs boundary validation and lazy
            // artifact preparation that would be wasteful for enumerated pool
            // artifacts; parity tests keep both semantic paths aligned.
            artSets = {};
            artifacts = combination.value;
            artStats = new Stats();
            initialStatFunc(artStats);

            for (let item of artifacts) {
                if (item) {
                    artSets[item.set] = (artSets[item.set] || 0) + 1;
                    item.concatFunc(artStats);
                }
            }

            for (let id in artSets) {
                let sdata = this.setData[ id ] && this.setData[ id ][ artSets[id] ];
                if (!sdata) continue;

                if (sdata.concatFunc) {
                    sdata.concatFunc(artStats);
                }
            }

            const variationId = this.cpuOptimizationProgram.resolveVariationIdTrusted(artSets);
            value = this.cpuOptimizationProgram.evaluate(variationId, artStats);

            if (value !== undefined && value >= minimalValue) {
                results.push({
                    value: value,
                    artifacts: artifacts,
                    combinationIndex: remapCombinationIndex(
                        this.currentCombinations - 1,
                        localCombinationCounts,
                        this.combinationIndexContext
                    ),
                });
            } else if (value === undefined) {
                ++this.skippedCombinations;
            }

            if (this.currentCombinations % 50000 == 0) {
                if (results.length > this.limit * 100) {
                    truncateResults(results, this.limit);
                    minimalValue = results[results.length - 1].value;
                }

                if (callback) {
                    callback(this.currentCombinations, this.totalCombinations, this.skippedCombinations);
                }
            }
        }

        if (callback) {
            callback(this.currentCombinations, this.totalCombinations, this.skippedCombinations);
        }
        truncateResults(results, this.limit);
        removeEmptyArtifacts(results);
        if (!this.combinationIndexContext) {
            removeCombinationIndices(results);
        }

        return results;
    }

    /**
     * Get results using GPU compute
     * @param {Function} callback - Progress callback
     * @returns {Promise<Array>}
     */
    async getResultGPU(callback) {
        const optimizer = await this.prepareGPUOptimizer();

        // Run GPU optimization
        const results = await optimizer.optimize({
            slots: this.slots,
            buildData: this.buildData,
            setData: this.setData,
            limit: this.limit,
            batchSize: this.gpuBatchSize,
            callback: callback,
        });
        this.gpuProfile = {
            prepare: optimizer.lastPrepareProfile,
            optimize: optimizer.lastOptimizeProfile,
        };

        // Remove empty artifacts from results
        removeEmptyArtifacts(results);
        if (!this.combinationIndexContext) {
            removeCombinationIndices(results);
        }

        return results;
    }

    /**
     * Fused forced-outcome search: one best complement per outcome artifact in
     * a complement-major GPU search, then an authoritative f64 CPU rescore
     * of every winner (the "CPU operations on the final map"). Returns one
     * entry per input outcome, in input order: {value, artifacts} where value
     * is Number.NEGATIVE_INFINITY and artifacts null when infeasible.
     * With opts.onOutcome(index, value, artifacts), deliver each CPU-rescored
     * result directly instead of retaining a second object graph in `scored`.
     */
    async getResultGPUForcedOutcomes(targetSlot, outcomeArtifacts, opts = {}) {
        // K===0 guard before enumeration: ForSpec reads outcomeArtifacts[0].
        if (!outcomeArtifacts.length) {
            if (opts.onOutcome) outcomeArtifacts.forEach((_, index) => opts.onOutcome(index, Number.NEGATIVE_INFINITY, null));
            return {scored: opts.onOutcome ? null
                : outcomeArtifacts.map(() => ({value: Number.NEGATIVE_INFINITY, artifacts: null})),
                raw: opts.debug ? outcomeArtifacts.map(() => ({v: 'NEG_INF', c: 0xFFFFFFFF})) : null,
                complementCount: 0, regions: []};
        }
        // One segment plan, one optimizer run, one readback. No per-region dispatches.
        // Callers may pass a prebuilt plan (same slots/outcomes/topology) to
        // avoid enumerating twice; it is used as-is.
        const plan = opts.densePlan || buildFusedOutcomeSegments(this.slots, targetSlot, outcomeArtifacts, opts.topology);
        if (!plan.validCount || !plan.regions.length) {
            if (opts.onOutcome) outcomeArtifacts.forEach((_, index) => opts.onOutcome(index, Number.NEGATIVE_INFINITY, null));
            return {scored: opts.onOutcome ? null
                : outcomeArtifacts.map(() => ({value: Number.NEGATIVE_INFINITY, artifacts: null})),
                raw: opts.debug ? outcomeArtifacts.map(() => ({v: 'NEG_INF', c: 0xFFFFFFFF})) : null,
                complementCount: 0, regions: []};
        }
        // Resolve packed-pool row offsets now so the host decode mirror works
        // even if the optimizer is mocked; the real run overwrites them with
        // the identical artifactsToCombinedBuffer offsets.
        resolveDenseRows(plan);
        let values, complementIndices, chunkIndices, complementCount, profile;
        if (opts.executeGPU) {
            // The candidate owns live artifacts, CPU functions and the full
            // precision outcome data. Only WGSL and numeric inputs leave it.
            const packed = packForcedOutcomeInputs(opts.preparedProgram, {
                slots: plan.packedSlots, buildData: this.buildData, setData: this.setData,
                targetSlot, outcomeArtifacts, densePlan: plan,
            });
            packed.outcomeRows = opts.preparedRows.rows;
            packed.mapKeys = opts.preparedRows.mapKeys;
            const {code, statIndexMap, profile: programProfile} = opts.preparedProgram;
            const reply = await opts.executeGPU({
                program: {kind: 'gpu-program', code, statIndexMap, profile: programProfile},
                inputs: packed,
            }, update => {
                if (update.phase === 'upload') opts.onSetupProgress?.('upload');
                else opts.onProgress?.(update.current, update.total);
            });
            ({bestValues: values, complementIndices, chunkIndices} = reduceForcedOutcomeReadback(
                reply.readback, reply.outcomeCount, reply.shards));
            complementCount = reply.complementCount;
            profile = reply.profile;
        } else {
            const optimizer = await this.prepareForcedOutcomeOptimizer();
            // Stats and the outcome upload are independent of topology. Prepare
            // once, then bind the same rows in the single run.
            const preparedOutcomes = optimizer.prepareForcedOutcomes(outcomeArtifacts, targetSlot, {
                getStats: artifact => artifact.calcOptimizerStats(this.usedStats),
                onSetupProgress: opts.onSetupProgress,
            });
            try {
                ({bestValues: values, complementIndices, chunkIndices, complementCount} = await optimizer.optimizeForcedOutcomes({
                    slots: plan.packedSlots, buildData: this.buildData, setData: this.setData,
                    preparedOutcomes, targetSlot, densePlan: plan, compact: true,
                    onProgress: opts.onProgress,
                }));
            } finally {
                preparedOutcomes.destroy();
            }
            this.gpuProfile = {prepare: optimizer.lastPrepareProfile, optimize: optimizer.lastOptimizeProfile};
            profile = optimizer.lastOptimizeProfile;
        }

        const artifactRefs = GPU_SLOT_NAMES.flatMap((slot) => plan.packedSlots[slot]);
        const raw = opts.debug ? Array.from(values, (value, index) => ({
            v: Number.isFinite(value) ? value : 'NEG_INF', c: complementIndices[index],
            ...(chunkIndices[index] > 0 && chunkIndices[index] !== 0xFFFFFFFF ? {chunk: chunkIndices[index]} : {}),
        })) : null;
        // CPU rescore is a real stage of the run (one f64 evaluation per
        // winner); report it so large unions do not look frozen after the GPU.
        const onRescoreProgress = opts.onRescoreProgress;
        if (onRescoreProgress) onRescoreProgress(0, outcomeArtifacts.length);
        const scored = opts.onOutcome ? null : [];
        const first = outcomeArtifacts[0];
        let scorer = null;
        // GPU winners that the f64 rescore rejects (a constraint or set rule
        // at the f32/f64 boundary): the outcome is reported infeasible even
        // though another companion build might pass. Counted, not hidden.
        let rescoreRejected = 0;
        for (let outcomeIndex = 0; outcomeIndex < outcomeArtifacts.length; ++outcomeIndex) {
            const complementIndex = complementIndices[outcomeIndex];
            let value = Number.NEGATIVE_INFINITY;
            let complement = null;
            let rejected = false;
            if (Number.isFinite(values[outcomeIndex]) && complementIndex !== 0xFFFFFFFF) {
                const chunk = chunkIndices[outcomeIndex];
                scorer ||= this.createForcedOutcomeScorer(targetSlot, first.getSetName ? first.getSetName() : first.set);
                const rescored = scorer(outcomeArtifacts[outcomeIndex], chunk * 0x100000000 + complementIndex,
                    () => decodeDenseComplement(plan.chunks[chunk].base + complementIndex, plan, artifactRefs));
                if (rescored.value !== undefined) {
                    value = rescored.value;
                    complement = rescored.complement;
                } else {
                    rejected = true;
                    ++rescoreRejected;
                }
            }
            if (opts.onOutcome) opts.onOutcome(outcomeIndex, value, complement, rejected);
            else scored.push({value, artifacts: complement && complement.slice(), rejected});
            if (onRescoreProgress && ((outcomeIndex + 1) & 8191) === 0) {
                onRescoreProgress(outcomeIndex + 1, outcomeArtifacts.length);
            }
        }
        if (onRescoreProgress) onRescoreProgress(outcomeArtifacts.length, outcomeArtifacts.length);
        return {scored, raw, complementCount, regions: plan.logical.map(region => region.size),
            profile, rescoreRejected};
    }

    async prepareGPUOptimizer() {
        if (this.requestedLimit !== GPU_TOP_K_CAPACITY) {
            throw new RangeError(
                `GPU optimizer result limit is fixed at ${GPU_TOP_K_CAPACITY}; got ${this.requestedLimit}`
            );
        }

        // The shared context reacquires a lost device. Preparation binds this
        // engine's program to that device without touching the fused engine.
        if (!gpuOptimizer) gpuOptimizer = new GPUArtifactOptimizer({context: gpuContext});
        if (!await gpuOptimizer.initialize()) {
            throw new Error('WebGPU is unavailable on this device');
        }

        // The pipeline is bound to the same semantic plan as the CPU lowerer.
        await gpuOptimizer.preparePipeline(this.optimizationPlan);
        return gpuOptimizer;
    }

    async prepareForcedOutcomeOptimizer() {
        if (!forcedOutcomeOptimizer) forcedOutcomeOptimizer = new GPUForcedOutcomeOptimizer({context: gpuContext});
        if (!await forcedOutcomeOptimizer.initialize()) {
            throw new Error('WebGPU forced-outcome search is unavailable on this device');
        }
        await forcedOutcomeOptimizer.preparePipeline(this.optimizationPlan);
        return forcedOutcomeOptimizer;
    }

    /** The coordinator owns GPU resources on its shared device. */
    async createForcedOutcomeOptimizer() {
        const optimizer = new GPUForcedOutcomeOptimizer({context: gpuContext});
        if (!await optimizer.initialize()) {
            throw new Error('WebGPU forced-outcome search is unavailable on this device');
        }
        return optimizer;
    }
}

function* artifactCombinations(cpuProgram, setNames, slots, skipCallback) {
    let s1, s2, s3, s4, s5;

    let sets = {};
    for (let name of Object.keys(setNames)) {
        sets[name] = 0;
    }
    for (const artifacts of Object.values(slots)) {
        for (const artifact of artifacts) {
            if (!Object.prototype.hasOwnProperty.call(sets, artifact.set)) {
                sets[artifact.set] = 0;
            }
        }
    }

    let skip5 = slots.circlet.length;
    let skip4 = skip5 * slots.goblet.length;
    let skip3 = skip4 * slots.sands.length;

    for (let i1 = 0; i1 < slots.flower.length; --sets[s1.set], ++i1) {
        s1 = slots.flower[i1];
        ++sets[s1.set];

        for (let i2 = 0; i2 < slots.plume.length; --sets[s2.set], ++i2) {
            s2 = slots.plume[i2];
            ++sets[s2.set];

            if (cpuProgram.rejectsSetPrefixTrusted(sets)) {
                skipCallback(skip3);
                continue;
            }

            for (let i3 = 0; i3 < slots.sands.length; --sets[s3.set], ++i3) {
                s3 = slots.sands[i3];
                ++sets[s3.set];

                if (cpuProgram.rejectsSetPrefixTrusted(sets)) {
                    skipCallback(skip4);
                    continue;
                }

                for (let i4 = 0; i4 < slots.goblet.length; --sets[s4.set], ++i4) {
                    s4 = slots.goblet[i4];
                    ++sets[s4.set];

                    if (cpuProgram.rejectsSetPrefixTrusted(sets)) {
                        skipCallback(skip5);
                        continue;
                    }

                    for (let i5 = 0; i5 < slots.circlet.length; --sets[s5.set], ++i5) {
                        s5 = slots.circlet[i5];
                        ++sets[s5.set];

                        if (cpuProgram.rejectsCompleteSetsTrusted(sets)) {
                            skipCallback(1);
                            continue;
                        }

                        yield [s1, s2, s3, s4, s5];
                    }
                }
            }
        }
    }
}


function truncateResults(results, limit) {
    results = results.sort(compareOptimizerResults);
    results.splice(limit);
}

function removeEmptyArtifacts(results) {
    for (let item of results) {
        let arts = [];
        for (let art of item.artifacts) {
            if (art.isEmpty) continue;
            arts.push(art);
        }
        item.artifacts = arts;
    }
}

function getCalculatedConditionSettings(conditions, baseSettings) {
    let result = {};

    for (let cond of conditions) {
        if (cond.getAllConditionsOn) {
            Object.assign(result, cond.getAllConditionsOn(baseSettings));
        }
    }

    return result;
}

function normalizeSetStats(stats) {
    for (let stat of Object.keys(stats)) {
        if (/^text_/.test(stat) || Math.abs(stats[stat]) < 0.0000001) {
            stats.del(stat);
        }
    }

    return stats;
}

function makeStatConstraintData(bounds, postTree, targetStats) {
    let closure = getPostEffectStatDependencyClosure(postTree, targetStats);

    return {
        bounds: bounds.map((bound) => {return Object.assign({}, bound, {
            components: Object.assign({}, bound.components),
        });}),
        targetStats: targetStats,
        usedStats: closure.usedStats,
        postEffects: closure.items,
    };
}

function removeCombinationIndices(results) {
    for (const item of results) {
        delete item.combinationIndex;
    }
}

/**
 * Complement enumeration regions for the fused forced-outcome search.
 *
 * Without a topology: one region, the full pools.
 * With a baseline topology ({kind: '4pc'|'2+2'|'2pc', sets: [...]}): only
 * complements that keep the baseline set bonuses active. Each axis is
 * assigned to one required set pool or to the free pool (pieces of any set
 * outside the required ones); an assignment is legal when every required set
 * reaches its piece threshold counting the target artifact own piece.
 * Regions are disjoint and jointly cover every final build that preserves
 * the baseline bonus structure (a 4pc or 2+2 automatically excludes any other
 * 2pc because only one piece remains).
 *
 * This is a deliberate design restriction, not a mechanic: results are best
 * within the baseline set topology and may miss rare alternate-topology flips
 * (a different 4pc, or a 2pc+2pc pair overtaking the baseline bonuses).
 */
export function buildFusedOutcomeRegions(slots, targetSlot, outcomeArtifacts, topology) {
    const axes = ['flower', 'plume', 'sands', 'goblet', 'circlet'].filter((slot) => slot !== targetSlot);
    const fullSize = axes.reduce((total, slot) => total * slots[slot].length, 1);
    const requested = Array.isArray(topology) ? topology : topology ? [topology] : [];
    const specs = [];
    const seen = new Set();
    for (const spec of requested) {
        if (!spec || !Array.isArray(spec.sets) || !spec.sets.length) continue;
        const signature = JSON.stringify([spec.kind, [...spec.sets].sort()]);
        if (seen.has(signature)) continue;
        seen.add(signature);
        specs.push(spec);
    }
    if (!specs.length) {
        return [{slots, size: fullSize}];
    }
    const regions = [];
    for (const spec of specs) {
        regions.push(...buildFusedOutcomeRegionsForSpec(slots, axes, outcomeArtifacts, spec));
    }
    // Requested topology is a constraint. An impossible topology must not
    // silently fall back to unrestricted search (including after RV filtering).
    return regions;
}

function buildFusedOutcomeRegionsForSpec(slots, axes, outcomeArtifacts, topology) {
    const threshold = topology.kind === '4pc' ? 4 : 2;
    const first = outcomeArtifacts[0];
    const targetSet = first.getSetName ? first.getSetName() : first.set;
    const required = topology.sets.slice(0, topology.kind === '4pc' ? 1 : 2);
    const requiredSet = new Set(required);
    const needs = required.map((name) => Math.max(0, threshold - (targetSet === name ? 1 : 0)));
    const pools = required.map((name) => axes.map((axis) => slots[axis].filter((artifact) => {
        const setName = artifact.getSetName ? artifact.getSetName() : artifact.set;
        return setName === name;
    })));
    const freePools = axes.map((axis) => slots[axis].filter((artifact) => {
        const setName = artifact.getSetName ? artifact.getSetName() : artifact.set;
        return !requiredSet.has(setName);
    }));
    const regions = [];
    const assignment = new Array(axes.length);
    const choices = required.length + 1;
    const build = (depth) => {
        if (depth === axes.length) {
            const counts = new Array(required.length).fill(0);
            const regionSlots = Object.assign({}, slots);
            let size = 1;
            for (let axis = 0; axis < axes.length; ++axis) {
                const pick = assignment[axis];
                const pool = pick === required.length ? freePools[axis] : pools[pick][axis];
                if (!pool.length) { size = 0; break; }
                if (pick < required.length) ++counts[pick];
                regionSlots[axes[axis]] = pool;
                size *= pool.length;
            }
            if (size > 0 && counts.every((count, index) => count >= needs[index])) {
                regions.push({slots: regionSlots, size});
            }
            return;
        }
        for (let pick = 0; pick < choices; ++pick) {
            assignment[depth] = pick;
            build(depth + 1);
        }
    };
    build(0);
    return regions;
}

/**
 * Pack the logical
 * regions of buildFusedOutcomeRegions into one segment plan for a single
 * optimizer run. Each complement axis is interned by pool identity, so pools
 * shared across regions upload once; pools that differ (multi-spec) get
 * separate segments. Regions stay disjoint within one spec; overlapping specs
 * concatenate (duplicate work preserved, matching serial behavior).
 *
 * Returns {axes, packedSlots, regions, chunks, validCount, logical} where each
 * region is {end (exclusive global dense endpoint), divs[3] (mixed-radix
 * divisors), dims[4], localRows[4] (offsets into packedSlots axes), size}.
 * validCount = Σ size and may exceed u32: regions larger than `chunkLimit`
 * are sliced and grouped into chunks ({base, count, regionStart, regionEnd})
 * that each fit the shader's u32 index. An impossible topology yields no
 * regions (never falls back to unrestricted search).
 */
export function buildFusedOutcomeSegments(slots, targetSlot, outcomeArtifacts, topology, chunkLimit = FUSED_CHUNK_LIMIT) {
    const axes = GPU_SLOT_NAMES.filter((slot) => slot !== targetSlot);
    const logical = buildFusedOutcomeRegions(slots, targetSlot, outcomeArtifacts, topology);
    const packedSlots = {[targetSlot]: slots[targetSlot]};
    for (const axis of axes) packedSlots[axis] = [];
    const interned = axes.map(() => new Map());
    const blocks = [];
    for (const region of logical) {
        if (!region.size) continue;
        const dims = axes.map((slot) => region.slots[slot].length);
        if (dims.some((dim) => !Number.isInteger(dim) || dim < 1)) continue;
        const localRows = axes.map((slot, axis) => {
            const pool = region.slots[slot];
            let base = interned[axis].get(pool);
            if (base === undefined) {
                base = packedSlots[slot].length;
                interned[axis].set(pool, base);
                for (const artifact of pool) packedSlots[slot].push(artifact);
            }
            return base;
        });
        blocks.push({dims, localRows});
    }
    return {axes, packedSlots, ...chunkDenseBlocks(blocks, chunkLimit), logical};
}

/**
 * Resolve absolute packed-pool row offsets onto plan regions. Same arithmetic
 * as artifactsToCombinedBuffer (GPU_SLOT_NAMES order, slots concatenated):
 * the optimizer overwrites these with the authoritative combined offsets.
 * Mutates the plan.
 */
export function resolveDenseRows(plan) {
    const offsets = {};
    let cursor = 0;
    for (const slot of GPU_SLOT_NAMES) {
        offsets[slot] = cursor;
        cursor += plan.packedSlots[slot].length;
    }
    for (const region of plan.regions) {
        region.rows = plan.axes.map((slot, axis) => offsets[slot] + region.localRows[axis]);
    }
    return plan;
}

/**
 * Mirror of the dense shader decode: global index c over concatenated regions,
 * first exclusive end above c wins, then row-major mixed-radix within the
 * region (last axis fastest — the same convention as
 * decodeFusedOutcomeComplement). artifactRefs is the packed pools flattened in
 * GPU_SLOT_NAMES order; region.rows holds absolute row offsets (resolved by
 * the optimizer from artifactsToCombinedBuffer offsets). A GPU winner is
 * chunk-local: pass plan.chunks[chunk].base + local.
 */
export function decodeDenseComplement(index, plan, artifactRefs) {
    if (!Number.isInteger(index) || index < 0 || index >= plan.validCount) {
        throw new RangeError(`Dense complement index out of range; got ${index}`);
    }
    let low = 0;
    let high = plan.regions.length;
    while (low < high) {
        const mid = low + Math.floor((high - low) / 2);
        if (index < plan.regions[mid].end) high = mid;
        else low = mid + 1;
    }
    const region = plan.regions[low];
    let q = index - (low === 0 ? 0 : plan.regions[low - 1].end);
    const picks = region.divs.map((divisor) => {
        const pick = Math.floor(q / divisor);
        q %= divisor;
        return pick;
    });
    picks.push(q);
    return picks.map((pick, axis) => artifactRefs[region.rows[axis] + pick]);
}
