import { isUsedArtifactStat } from './ArtifactActionProbability';
import { getPostEffectStatDependencyClosure } from './Build/Data';
import { getStatConstraintTargetStats, normalizeStatConstraintBounds } from './OptimizerConstraints';

/** Only these slots participate in useless-main deselection. Flower/Plume
 * mains are fixed, so their upgrades are always kept for substat value.
 */
export const UPGRADE_MAIN_FILTER_SLOTS = ['sands', 'goblet', 'circlet'];

/** Objective + optimizer-constraint closure for main-stat usefulness.
 * Mirrors the predictor VOID definition without pulling the GPU optimizer
 * into the UI bundle. Returns null when usefulness cannot be determined,
 * in which case callers must keep the current selection unchanged.
 */
export function getUpgradeMainUsefulStats({build, feature, optimizerSettings}) {
    try {
        if (!build || typeof build.clone !== 'function' || !feature) return null;
        const probe = build.clone();
        const buildData = probe.getBuildData();
        const featureObj = probe.getFeatureByName(feature, buildData);
        if (!featureObj || typeof featureObj.getUsedStats !== 'function') return null;
        const objectiveStats = featureObj.getUsedStats(buildData) || [];
        let constraintStats = [];
        try {
            const bounds = normalizeStatConstraintBounds(optimizerSettings?.stats);
            constraintStats = getStatConstraintTargetStats(bounds);
            try {
                const postTree = buildData.getActivePostEffectsTree();
                constraintStats = getPostEffectStatDependencyClosure(postTree, constraintStats).usedStats;
            } catch {
                // Keep direct constraint targets when closure is unavailable.
            }
        } catch {
            // Invalid constraint input must not change candidate selection.
        }
        const combined = [...new Set([...objectiveStats, ...constraintStats])];
        return combined.length ? combined : null;
    } catch {
        return null;
    }
}

export function isUpgradeMainUseful(artifact, usedStats) {
    if (!artifact || typeof artifact.getSlot !== 'function') return true;
    if (!UPGRADE_MAIN_FILTER_SLOTS.includes(artifact.getSlot())) return true;
    if (!usedStats) return true;
    try {
        const mainStat = typeof artifact.getMainStat === 'function'
            ? artifact.getMainStat()
            : artifact.mainStat;
        return isUsedArtifactStat(usedStats, mainStat);
    } catch {
        return true;
    }
}

/** Keep flowers/plumes and useful-main sands/goblets/circlets. */
export function filterUpgradeCandidatesByUsefulMain(candidates, usedStats) {
    if (!usedStats) return (candidates || []).slice();
    return (candidates || []).filter(artifact => isUpgradeMainUseful(artifact, usedStats));
}
