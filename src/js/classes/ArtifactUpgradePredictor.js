import { enumerateArtifactUpgradeStates } from "./ArtifactUpgradeProbability";
import { isPercent } from "./Stats";

export function getArtifactMaxLevel(artifact) {
    return DB.Artifacts.Rarity[artifact.getRarity() - 1].maxLevel;
}

export function isArtifactUnderleveled(artifact) {
    return artifact && artifact.getLevel() < getArtifactMaxLevel(artifact);
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

    for (let item of variantMap.values()) {
        callback({
            artifact: makeVariantArtifact(artifact, finalLevel, item.subStats),
            probability: item.probability,
            paths: item.paths,
        });
    }
    return assumptions;
}

function makeVariantArtifact(artifact, level, subStats) {
    let variant = artifact.clone();
    const metadata = artifact.getMetadata();
    if (metadata.totalRolls !== undefined) {
        metadata.totalRolls += Math.floor(level / 4) - Math.floor(artifact.level / 4);
    }

    variant.level = level;
    variant.subStats = cloneSubStats(subStats);
    variant.unactivatedSubstats = [];
    variant.calculated = null;
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
