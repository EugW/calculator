import { Artifact } from "./Artifact";
import { Condition } from "./Condition";
import { FeatureCompiler } from "./Feature2/Compiler";
import { Stats, isPercent } from "./Stats";

const FEATURE_TYPE_INDEX = {
    normal: 0,
    crit: 1,
    average: 2,
};

const VARIANT_EPSILON = 0.000001;
const FACTORIAL_CACHE = [1];
const DISTRIBUTION_CACHE = {};
const ROLL_DISTRIBUTION_CACHE = {};

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

export function visitMaxUpgradeVariants(artifact, callback) {
    let variantMap = new Map();
    let finalLevel = getArtifactMaxLevel(artifact);

    enumerateMaxUpgradeStates(artifact, (subStats, probability, paths) => {
        if (!probability || !paths) {
            return;
        }

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

    for (let item of variantMap.values()) {
        callback({
            artifact: makeVariantArtifact(artifact, finalLevel, item.subStats),
            probability: item.probability,
            paths: item.paths,
        });
    }
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

function enumerateMaxUpgradeStates(artifact, callback) {
    let targetLevel = getArtifactMaxLevel(artifact);
    let rarityData = DB.Artifacts.Rarity[artifact.getRarity() - 1];
    let currentSubStats = cloneSubStats(artifact.getSubStats());
    let unactivatedSubStats = cloneSubStats(artifact.getUnactivatedSubStats ? artifact.getUnactivatedSubStats() : []);
    let currentStats = currentSubStats.map((item) => item.stat);
    let knownInactiveStats = unactivatedSubStats.map((item) => item.stat);
    let targetSubStats = rarityData.maxSubstats;
    let remainingEvents = Math.max(0, Math.floor(targetLevel / 4) - Math.floor(artifact.getLevel() / 4));

    if (remainingEvents <= 0) {
        callback(currentSubStats, 1, 1);
        return;
    }

    let activatedSubStats = unactivatedSubStats.slice(0, Math.min(unactivatedSubStats.length, remainingEvents));
    let knownStats = currentStats.concat(activatedSubStats.map((item) => item.stat));
    let activationCount = activatedSubStats.length;
    let missingCount = Math.min(Math.max(0, targetSubStats - knownStats.length), Math.max(0, remainingEvents - activationCount));
    let upgradeEvents = remainingEvents - activationCount - missingCount;
    let availableStats = DB.Artifacts.Substats.getKeys().filter((stat) => {
        return stat != artifact.getMainStat() && !knownStats.includes(stat) && !knownInactiveStats.includes(stat);
    });
    let missingCombos = getCombinations(availableStats, missingCount);
    let comboProbability = missingCombos.length ? 1 / missingCombos.length : 1;

    for (let combo of missingCombos) {
        enumerateAddedRolls(combo, artifact.getRarity(), {}, 1, (addedValues, addedProbability, addedWays) => {
            let finalStats = knownStats.concat(combo);

            for (let distribution of getCountDistributions(upgradeEvents, finalStats.length)) {
                let selectionWays = getDistributionWays(distribution, upgradeEvents);
                let selectionProbability = getDistributionProbability(selectionWays, finalStats.length, upgradeEvents);

                enumerateUpgradeRolls(finalStats, distribution, artifact.getRarity(), {}, 1, 1, (upgradeValues, upgradeProbability, upgradeWays) => {
                    callback(
                        buildFinalSubStats(currentSubStats, activatedSubStats, combo, addedValues, upgradeValues),
                        comboProbability * addedProbability * selectionProbability * upgradeProbability,
                        addedWays * selectionWays * upgradeWays,
                    );
                });
            }
        });
    }
}

function enumerateAddedRolls(stats, rarity, current, probability, callback, index) {
    index ||= 0;

    if (index >= stats.length) {
        callback(current, probability, 1);
        return;
    }

    let stat = stats[index];
    let rolls = DB.Artifacts.Substats.get(stat).rolls[rarity - 1];
    let nextProbability = probability / rolls.length;

    for (let roll of rolls) {
        let next = Object.assign({}, current);
        next[stat] = roll;

        enumerateAddedRolls(stats, rarity, next, nextProbability, callback, index + 1);
    }
}

function enumerateUpgradeRolls(stats, distribution, rarity, current, probability, ways, callback, index) {
    index ||= 0;
    ways ||= 1;

    if (index >= stats.length) {
        callback(current, probability, ways);
        return;
    }

    let stat = stats[index];
    let count = distribution[index];
    let sums = getRollSumDistributions(stat, rarity, count);

    for (let item of sums) {
        let next = Object.assign({}, current);
        next[stat] = item.value;

        enumerateUpgradeRolls(stats, distribution, rarity, next, probability * item.probability, ways * item.ways, callback, index + 1);
    }
}

function buildFinalSubStats(currentSubStats, activatedSubStats, addedStats, addedValues, upgradeValues) {
    let result = [];

    for (let item of currentSubStats) {
        result.push({
            stat: item.stat,
            value: normalizeSubStatValue(item.stat, item.value + (upgradeValues[item.stat] || 0)),
        });
    }

    for (let item of activatedSubStats) {
        result.push({
            stat: item.stat,
            value: normalizeSubStatValue(item.stat, item.value + (upgradeValues[item.stat] || 0)),
        });
    }

    for (let stat of addedStats) {
        result.push({
            stat: stat,
            value: normalizeSubStatValue(stat, (addedValues[stat] || 0) + (upgradeValues[stat] || 0)),
        });
    }

    return result;
}

function makeVariantArtifact(artifact, level, subStats) {
    let variant = artifact.clone();

    variant.level = level;
    variant.subStats = cloneSubStats(subStats);
    variant.unactivatedSubstats = [];
    variant.calculated = null;

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

function normalizeSubStatValue(stat, value) {
    let rounded = Stats.roundStatValue('', value, isPercent(stat));

    if (isPercent(stat)) {
        return parseFloat(rounded);
    }

    return parseInt(rounded, 10);
}

function formatStoredValue(stat, value) {
    if (isPercent(stat)) {
        return parseFloat(value).toFixed(1);
    }

    return `${parseInt(value, 10)}`;
}

function getCombinations(items, size, index, current, result) {
    index ||= 0;
    current ||= [];
    result ||= [];

    if (size === 0) {
        result.push([].concat(current));
        return result;
    }

    if (items.length - index < size) {
        return result;
    }

    for (let i = index; i <= items.length - size; ++i) {
        current.push(items[i]);
        getCombinations(items, size - 1, i + 1, current, result);
        current.pop();
    }

    if (result.length === 0 && size === 0) {
        result.push([]);
    }

    return result.length ? result : [[]];
}

function getCountDistributions(total, parts) {
    let key = `${total}|${parts}`;

    if (DISTRIBUTION_CACHE[key]) {
        return DISTRIBUTION_CACHE[key];
    }

    let result = [];

    buildDistributions(total, parts, [], result);
    DISTRIBUTION_CACHE[key] = result;

    return result;
}

function buildDistributions(total, parts, current, result) {
    if (parts <= 1) {
        result.push(current.concat([total]));
        return;
    }

    for (let i = 0; i <= total; ++i) {
        current.push(i);
        buildDistributions(total - i, parts - 1, current, result);
        current.pop();
    }
}

function getDistributionProbability(ways, slots, total) {
    if (total <= 0 || slots <= 0) {
        return 1;
    }

    return ways / Math.pow(slots, total);
}

function getDistributionWays(distribution, total) {
    let result = factorial(total);

    for (let count of distribution) {
        result = result / factorial(count);
    }

    return result;
}

function getRollSumDistributions(stat, rarity, count) {
    let key = `${stat}|${rarity}|${count}`;

    if (ROLL_DISTRIBUTION_CACHE[key]) {
        return ROLL_DISTRIBUTION_CACHE[key];
    }

    if (count <= 0) {
        ROLL_DISTRIBUTION_CACHE[key] = [{ value: 0, ways: 1, probability: 1 }];
        return ROLL_DISTRIBUTION_CACHE[key];
    }

    let rolls = DB.Artifacts.Substats.get(stat).rolls[rarity - 1];
    let sums = new Map();

    sums.set(0, 1);

    for (let i = 0; i < count; ++i) {
        let next = new Map();

        for (let [sum, ways] of sums.entries()) {
            for (let roll of rolls) {
                let nextSum = sum + Math.round(roll * 100);
                next.set(nextSum, (next.get(nextSum) || 0) + ways);
            }
        }

        sums = next;
    }

    let grouped = {};
    let totalWays = Math.pow(rolls.length, count);

    for (let [sum, ways] of sums.entries()) {
        let value = normalizeSubStatValue(stat, sum / 100);
        let groupedKey = formatStoredValue(stat, value);

        if (!grouped[groupedKey]) {
            grouped[groupedKey] = {
                value: value,
                ways: 0,
            };
        }

        grouped[groupedKey].ways += ways;
    }

    let result = Object.values(grouped).map((item) => {
        return {
            value: item.value,
            ways: item.ways,
            probability: item.ways / totalWays,
        };
    });

    ROLL_DISTRIBUTION_CACHE[key] = result;
    return result;
}

function factorial(value) {
    if (FACTORIAL_CACHE[value] !== undefined) {
        return FACTORIAL_CACHE[value];
    }

    let result = FACTORIAL_CACHE[FACTORIAL_CACHE.length - 1];

    for (let i = FACTORIAL_CACHE.length; i <= value; ++i) {
        result *= i;
        FACTORIAL_CACHE[i] = result;
    }

    return FACTORIAL_CACHE[value];
}
