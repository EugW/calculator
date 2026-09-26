import { enumerateArtifactUpgradeStates } from "./ArtifactUpgradeProbability";
import { Condition } from "./Condition";
import { FeatureCompiler } from "./Feature2/Compiler";
import { Stats, isPercent } from "./Stats";

const FEATURE_TYPE_INDEX = {
    normal: 0,
    crit: 1,
    average: 2,
};

const VARIANT_EPSILON = 0.000001;

export function getArtifactMaxLevel(artifact) {
    return DB.Artifacts.Rarity[artifact.getRarity() - 1].maxLevel;
}

export function isArtifactUnderleveled(artifact) {
    return artifact && artifact.getLevel() < getArtifactMaxLevel(artifact);
}

export function getFeatureValue(build, featureName, featureType) {
    let buildData = build.getBuildData();
    let feature = build.getFeatureByName(featureName, buildData);

    if (!feature) {
        return 0;
    }

    let result = feature.getResult(buildData)[featureName];
    if (!result) {
        return 0;
    }

    return result[featureType] || 0;
}

export function getArtifactSettingsForBuild(baseBuild, artifact) {
    let build = baseBuild.clone();
    let currentSettings = build.artifacts.getSettings();
    let conditions = build.getConditions({ objects: ['artifacts'] });
    let result = Condition.allConditionsOff(conditions);

    Object.assign(result, currentSettings);

    build.setArtifact(artifact.clone());

    conditions = build.getConditions({ objects: ['artifacts'] });
    let activeSettings = Condition.allConditionsOn(conditions);

    return Object.assign({}, activeSettings, result);
}

export function makeBuildWithArtifact(baseBuild, artifact) {
    let build = baseBuild.clone();
    let settings = getArtifactSettingsForBuild(baseBuild, artifact);

    build.setArtifact(artifact.clone());
    build.setArtifactsSettings(settings);

    return build;
}

export function evaluateArtifactUpgradePrediction(params) {
    let baseBuild = params.baseBuild;
    let artifact = params.artifact;
    let featureName = params.feature;
    let featureType = params.featureType || 'average';
    let baseValue = params.baseValue;

    if (baseValue === undefined) {
        baseValue = getFeatureValue(baseBuild, featureName, featureType);
    }

    let build = makeBuildWithArtifact(baseBuild, artifact);
    let buildData = build.getBuildData();
    let feature = build.getFeatureByName(featureName, buildData);

    if (!feature) {
        return {
            artifact: artifact,
            baseValue: baseValue,
            currentValue: 0,
            expectedValue: 0,
            absoluteGain: -1 * baseValue,
            score: baseValue ? -1 : 0,
            improveChance: 0,
            variants: 0,
        };
    }

    let compiler = makeFeatureCompiler(feature, buildData);
    let featureIndex = FEATURE_TYPE_INDEX[featureType] ?? FEATURE_TYPE_INDEX.average;
    let baseStatsSetFunc = buildData.stats.getSetFunc();
    let currentArtifactStats = getProcessedArtifactStats(artifact);
    let currentValue = compiler.execute(buildData)[featureIndex] || 0;

    let expectedValue = 0;
    let improveChance = 0;
    let probabilitySum = 0;
    let variants = 0;

    visitMaxUpgradeVariants(artifact, ({ artifact: variant, probability }) => {
        let stats = new Stats();
        let delta = Stats.diff(currentArtifactStats, getProcessedArtifactStats(variant));

        baseStatsSetFunc(stats);
        stats.concat(delta);
        buildData.stats = stats;

        let value = compiler.execute(buildData)[featureIndex] || 0;

        expectedValue += probability * value;
        probabilitySum += probability;
        improveChance += value > baseValue + VARIANT_EPSILON ? probability : 0;
        ++variants;
    });

    if (probabilitySum > 0 && Math.abs(probabilitySum - 1) > VARIANT_EPSILON) {
        expectedValue = expectedValue / probabilitySum;
        improveChance = improveChance / probabilitySum;
    }

    let absoluteGain = expectedValue - baseValue;

    return {
        artifact: artifact,
        baseValue: baseValue,
        currentValue: currentValue,
        expectedValue: expectedValue,
        absoluteGain: absoluteGain,
        score: baseValue ? absoluteGain / baseValue : 0,
        improveChance: improveChance,
        variants: variants,
    };
}

export function visitMaxUpgradeVariants(artifact, callback, acceptSubstats) {
    let variantMap = new Map();
    let finalLevel = getArtifactMaxLevel(artifact);

    const assumptions = enumerateArtifactUpgradeStates(artifact, (subStats, probability, paths) => {
        if (!probability || !paths) {
            return;
        }
        if (acceptSubstats && !acceptSubstats(subStats)) return;

        let key = makeVariantKey(subStats);
        let item = variantMap.get(key);

        if (!item) {
            item = {
                probability: 0,
                paths: 0,
                subStats: subStats,
            };
            variantMap.set(key, item);
        }

        item.probability += probability;
        item.paths += paths;
    });

    // Lines the upgrades leave unchanged keep the source's exact values, so a
    // variant never differs from its source on a line it did not roll.
    const precise = artifact.getPreciseSubStatValues();
    const base = new Map(artifact.getSubStats().map((item, i) => [item.stat, {value: item.value, precise: precise[i]}]));
    for (let item of variantMap.values()) {
        callback({
            artifact: makeVariantArtifact(artifact, finalLevel, item.subStats, base),
            probability: item.probability,
            paths: item.paths,
        });
    }
    return assumptions;
}

function makeFeatureCompiler(feature, buildData) {
    let tree = feature.getTree(buildData);
    let postItems = buildData.getActivePostEffectsTree();
    let compiler = new FeatureCompiler(tree, postItems);

    buildData.stats.ensure(compiler.usedStats);
    buildData.stats.ensure(compiler.assignedStats);
    compiler.prepare(buildData);
    compiler.compile();

    return compiler;
}

function getProcessedArtifactStats(artifact) {
    let stats = artifact.calcStats();
    stats.processPercent();
    return stats;
}

function makeVariantArtifact(artifact, level, subStats, basePreciseValues) {
    let variant = artifact.clone();
    const metadata = artifact.getMetadata();
    if (metadata.totalRolls !== undefined) {
        metadata.totalRolls += Math.floor(level / 4) - Math.floor(artifact.level / 4);
    }

    variant.level = level;
    variant.subStats = cloneSubStats(subStats);
    variant.unactivatedSubstats = [];
    variant.calculated = null;
    variant.basePreciseValues = basePreciseValues;
    variant.setMetadata(metadata);

    return variant;
}

function makeVariantKey(subStats) {
    let values = cloneSubStats(subStats).sort((a, b) => {
        return a.stat.localeCompare(b.stat);
    });

    return values.map((item) => {
        return `${item.stat}:${formatStoredValue(item.stat, item.value)}`;
    }).join('|');
}

function cloneSubStats(subStats) {
    return subStats.map((item) => {
        return {
            stat: item.stat,
            value: item.value,
        };
    });
}

function formatStoredValue(stat, value) {
    if (isPercent(stat)) {
        return parseFloat(value).toFixed(1);
    }

    return `${parseInt(value, 10)}`;
}
