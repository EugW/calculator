import { Artifact } from "./Artifact";
import { getPostEffectStatDependencyClosure } from "./Build/Data";
import { Condition } from "./Condition";
import { FeatureCompiler } from "./Feature2/Compiler";
import { Stats } from "./Stats";
import { GPUArtifactOptimizer } from "./GPUArtifactOptimizer";
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

// Global GPU optimizer instance (reused across optimizations)
let gpuOptimizer = null;

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
        this.setNames = {};
        this.totalCombinations = 1;

        for (let art of this.artifacts) {
            this.setNames[art.set] = 1;

            art.calcCache(this.usedStats);
            art.concatFunc = art.calculated.getConcatFunc();
            this.slots[art.slot].push(art);
        }

        for (const slot of Object.keys(this.slots)) {
            if (this.slots[slot].length == 0) {
                let curArt = this.currentArts[slot];
                if (curArt) {
                    this.setNames[curArt.set] = 1;
                    curArt.calcCache(this.usedStats);
                    curArt.concatFunc = curArt.calculated.getConcatFunc();
                    this.slots[slot].push(curArt);
                } else {
                    let emptyArtifact = new Artifact(5, 0, slot, 'none', 'none', []);
                    emptyArtifact.isEmpty = true;
                    emptyArtifact.calculated = new Stats();
                    emptyArtifact.concatFunc = emptyArtifact.calculated.getConcatFunc();
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
        if (this.requestedLimit !== GPU_TOP_K_CAPACITY) {
            throw new RangeError(
                `GPU optimizer result limit is fixed at ${GPU_TOP_K_CAPACITY}; got ${this.requestedLimit}`
            );
        }

        // A worker can be reused after adapter/device loss. Recreate the
        // optimizer whenever its device is absent instead of caching an
        // unusable instance for every later run.
        if (!gpuOptimizer || !gpuOptimizer.device) {
            gpuOptimizer = new GPUArtifactOptimizer();
            const initialized = await gpuOptimizer.initialize();
            if (!initialized) {
                gpuOptimizer = null;
                throw new Error('WebGPU is unavailable on this device');
            }
        }

        // The pipeline is bound to the same semantic plan as the CPU lowerer.
        await gpuOptimizer.preparePipeline(this.optimizationPlan, this.buildData);

        // Run GPU optimization
        const results = await gpuOptimizer.optimize({
            slots: this.slots,
            buildData: this.buildData,
            setData: this.setData,
            limit: this.limit,
            batchSize: this.gpuBatchSize,
            callback: callback,
        });
        this.gpuProfile = {
            prepare: gpuOptimizer.lastPrepareProfile,
            optimize: gpuOptimizer.lastOptimizeProfile,
        };

        // Remove empty artifacts from results
        removeEmptyArtifacts(results);
        if (!this.combinationIndexContext) {
            removeCombinationIndices(results);
        }

        return results;
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
