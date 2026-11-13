import { serializeWorkerMember, deserializeWorkerMember } from './Team';

/** Plain run data shared by worker input, result reconstruction and stale checks. */
export function captureArtifactSuggestRun({member, artifacts, settings, feature, featureType, showBeta, fastFilter}) {
    return {
        build: serializeWorkerMember(member),
        inventory: artifacts.map(artifact => artifact.serialize()),
        settings: JSON.parse(JSON.stringify(settings)),
        feature, featureType, showBeta: !!showBeta, fastFilter: !!fastFilter,
    };
}

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    }
    return value;
}

/** A result replaces the searched member's pieces, so equipping one leaves the run current: they are not part of its key. */
export function artifactSuggestRunKey(snapshot) {
    const member = deserializeWorkerMember(snapshot.build);
    if (!member) return JSON.stringify(canonical(snapshot));
    member.artifacts.clearArtifacts();
    return JSON.stringify(canonical({...snapshot, build: serializeWorkerMember(member)}));
}

export function artifactSuggestResultBuild(snapshot, result) {
    const member = deserializeWorkerMember(snapshot.build);
    if (!member) throw new Error('Invalid artifact suggestion snapshot');
    equipArtifactPieces(member, result.artifacts);
    member.suggesterWorkerValue = result.value;
    member.suggesterWorkerFeature = snapshot.feature;
    member.suggesterWorkerFeatureType = snapshot.featureType;
    return member;
}

/** Replace the loadout atomically: pruning partial 1-piece intermediates would
 * erase member state such as Nightsoul before the complete set is installed. */
export function equipArtifactPieces(member, artifacts) {
    const pieces = artifacts.filter(Boolean).map(artifact => artifact.clone());
    member.artifacts.clearArtifacts();
    member.replaceArtifacts(pieces);
}
