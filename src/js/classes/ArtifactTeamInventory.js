/** Resolve older build payloads to the same inventory entry as saved-build markers. */
export function inventoryArtifactHash(artifact, storage) {
    const hash = artifact.getHash();
    return storage?.getByHash(hash)?.getHash() || hash;
}

/** Ownership is relative to the viewed member, independently of who is on field. */
export function teamArtifactOwnership(member, storage) {
    const equipped = new Set();
    const teammates = new Map();

    for (const owner of member.team?.getMembers() || [member]) {
        for (const artifact of Object.values(owner.getArtifacts())) {
            if (!artifact) continue;
            const hash = inventoryArtifactHash(artifact, storage);
            if (owner === member) {
                equipped.add(hash);
            } else {
                if (!teammates.has(hash)) teammates.set(hash, []);
                teammates.get(hash).push(owner.char.object);
            }
        }
    }

    return {equipped, teammates};
}

/** Fixed teammates keep their equipment throughout optimization and action prediction. */
export function availableTeamArtifacts(member, artifacts, storage) {
    const {teammates} = teamArtifactOwnership(member, storage);
    return artifacts.filter(artifact => artifact && !teammates.has(inventoryArtifactHash(artifact, storage)));
}

/** A deliberate inventory equip moves the piece, including metadata-enriched copies. */
export function equipTeamArtifact(member, artifact, storage) {
    const hash = inventoryArtifactHash(artifact, storage);
    for (const owner of member.team?.getMembers() || []) {
        if (owner === member) continue;
        for (const equipped of Object.values(owner.getArtifacts())) {
            if (equipped && inventoryArtifactHash(equipped, storage) === hash) {
                owner.removeArtifact(equipped);
            }
        }
    }
    member.setArtifact(artifact);
}

/** Match serialized worker equipment to the inventory hashes used by its candidate pool. */
export function copyWithInventoryArtifacts(member, storage) {
    const copy = member.clone();
    for (const owner of copy.team?.getMembers() || [copy]) {
        for (const artifact of Object.values(owner.getArtifacts())) {
            if (!artifact) continue;
            const stored = storage.getByHash(artifact.getHash());
            if (stored) owner.setArtifact(stored);
        }
    }
    return copy;
}
