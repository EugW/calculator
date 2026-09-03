import { Artifact } from "../Artifact";
import { Serializer } from "../Serializer";
import { StorageItem } from "../StorageItem";
import { planArtifactImport } from "../Importer/Good";

export class StorageItemArtifacts extends StorageItem {
    constructor() {
        super('artifact_pool');
        this.resetCache();
    }

    decodeItem(string) {
        let input = Serializer.unpack(string);
        if (!input) return null;

        const artifact = Artifact.deserialize(input);
        return input.length ? null : artifact;
    }

    fromPool(pool) {
        this.items = [];
        this.error = false;

        for (let art of pool.items) {
            this.items.push({
                data: Serializer.pack(art),
                locked: art.isLocked(),
                group: art.getGroups(),
            });
        }

        this.save();
    }

    validateItem(item) {
        if (!item || typeof item != 'object' || Array.isArray(item) || typeof item.data != 'string') {
            return null;
        }

        try {
            let art = this.decodeItem(item.data);
            if (!art) return null;

            return StorageItemArtifacts.getValidData(item);
        } catch (error) {
            return null;
        }
    }

    parseString(string) {
        if (string.substring(0,1) == '[') {
            return super.parseString(string);
        }

        let items = string.split(';');
        let result = [];

        for (let item of items) {
            result.push({
                data: item,
                locked: 0,
                group: '',
            });
        }

        return result;
    }

    storageHashes() {
        let hashes = {};

        for (let item of this.listDecoded(1)) {
            hashes[item.data.getHash()] = 1;
        }

        return hashes;
    }

    listGroups() {
        this.requireCache();
        return this.groupsCache;
    }

    listArtifacts() {
        this.requireCache();
        return this.artifactsCache;
    }

    save() {
        super.save();
        this.resetCache();
    }

    reload() {
        super.reload();
        this.resetCache();
    }

    getByHash(hash) {
        this.requireCache();
        let index = this.indexByHash[hash];
        if (index !== undefined) return this.artifactsCache[index];
        try {
            const artifact = this.decodeItem(hash);
            return artifact ? this.findMatching(artifact) : undefined;
        } catch (error) { return undefined; }
    }

    findMatching(artifact) {
        this.requireCache();
        const exact = this.indexByHash[artifact.getHash()];
        if (exact !== undefined) return this.artifactsCache[exact];
        const matches = (this.indexByStatsHash[artifact.getStatsHash()] || [])
            .filter(item => item.enrichFrom(artifact));
        return matches.length === 1 ? matches[0] : undefined;
    }

    enrichBuild(build) {
        for (const artifact of Object.values(build.getArtifacts())) {
            if (!artifact) continue;
            const stored = this.findMatching(artifact);
            if (stored) {
                const enriched = artifact.enrichFrom(stored);
                if (enriched) artifact.setMetadata(enriched.getMetadata());
            }
        }
    }

    getItemByHash(hash) {
        this.requireCache();
        const artifact = this.getByHash(hash);
        let index = artifact ? this.indexByHash[artifact.getHash()] : undefined;
        return this.items[index];
    }

    getArtByIndex(index) {
        this.requireCache();
        return this.artifactsCache[index];
    }

    addArtifacts(items, replace) {
        if (this.error) return;
        this.requireCache();
        const unique = [...new Map(items.map(art => [art.getHash(), art])).values()];
        const plan = planArtifactImport(replace ? [] : this.artifactsCache, unique);
        for (const {previous, artifact} of plan.updated) {
            this.items[this.indexByHash[previous.getHash()]].data = artifact.getHash();
        }
        const newArts = plan.added.map(art => ({
            data: art.getHash(),
            locked: art.isLocked(),
            group: art.getGroups(),
        }));

        if (newArts.length || plan.updated.length || replace) {
            if (replace) {
                this.items = newArts;
            } else {
                this.items = this.items.concat(newArts);
            }
            this.save();
        }
    }

    updateMetadata(updates) {
        if (this.error || !updates.length) return;
        this.requireCache();
        for (const {previous, artifact} of updates) {
            const index = this.indexByHash[previous.getHash()];
            if (index !== undefined) this.items[index].data = artifact.getHash();
        }
        this.save();
    }

    updateByHash(hash, art) {
        let item = this.getItemByHash(hash);
        if (item) {
            item.data = Serializer.pack(art);
            item.locked = art.isLocked();
            item.group = art.getGroups();
            this.save();
        }
    }

    updateGroup(oldName, newName) {
        for (let item of this.items) {
            let newGroups = [];
            for (let group of item.group) {
                if (Artifact.groupsAreEqual(group, oldName)) {
                    newGroups.push(newName);
                } else {
                    newGroups.push(group);
                }
            }

            item.group = newGroups;
        }
        this.save();
    }

    deleteByHash(hash) {
        this.requireCache();
        const artifact = this.getByHash(hash);
        this.remove(artifact ? this.indexByHash[artifact.getHash()] : undefined);
    }

    getLocked() {
        let arts = [];
        for (let item of this.listDecoded(1)) {
            if (item.locked) {
                arts.push(item.data.getHash());
            }
        }
        return arts;
    }

    requireCache() {
        if (this.artifactsCache === null) {
            this.refreshCache();
        }
    }

    resetCache() {
        this.artifactsCache = null;
        this.groupsCache = null;
        this.indexByHash = null;
        this.indexByStatsHash = null;
    }

    refreshCache() {
        this.artifactsCache = [];
        this.groupsCache = [];
        this.indexByHash = {};
        this.indexByStatsHash = {};

        let groups_hash = {};
        let groups_counter = {'': 0};

        for (let index in this.items) {
            let item = this.items[index];

            for (let group of item.group) {
                if (group) {
                    let lcname = group.toUpperCase();
                    groups_hash[lcname] = group;

                    if (!groups_counter[lcname]) {
                        groups_counter[lcname] = 0;
                    }
                    ++groups_counter[lcname];
                } else {
                    ++groups_counter[''];
                }
            }

            let art = this.decodeItem(item.data);
            let hash = art.getHash();

            this.indexByHash[item.data] = index;
            this.indexByHash[hash] = index;
            const statsHash = art.getStatsHash();
            (this.indexByStatsHash[statsHash] ||= []).push(art);

            art.setLocked(item.locked);
            art.setGroups(item.group);
            this.artifactsCache.push(art);
        }

        this.groupsCache = [{
            value: '',
            title: UI.Lang.get('artifact_group.empty_group'),
            count: groups_counter[''],
        }];

        for (let key of Object.keys(groups_hash).sort()) {
            this.groupsCache.push({
                value: groups_hash[key],
                title: groups_hash[key],
                count: groups_counter[key],
            });
        }
    }

    getSimilar(sample) {
        let result = [];

        if (!sample || !sample.set || !sample.mainStat) {
            return [];
        }

        for (let i in this.artifactsCache) {
            const art = this.artifactsCache[i];

            if (sample.set != art.set || sample.mainStat != art.mainStat || sample.rarity != art.rarity || sample.level < art.level) {
                continue;
            }

            if (!Artifact.subStatsIsSimilar(sample, art)) {
                continue;
            }

            result.push({
                art: art,
                index: i,
            });
        }

        return result;
    }

    setLocked(artifacts, value) {
        this.requireCache();
        let canonicalHashes = {};

        for (let hash of artifacts) {
            const artifact = this.getByHash(hash);
            let index = artifact ? this.indexByHash[artifact.getHash()] : undefined;
            if (index !== undefined) {
                canonicalHashes[this.artifactsCache[index].getHash()] = 1;
            }
        }

        for (let item of this.listDecoded(1)) {
            if (canonicalHashes[item.data.getHash()]) {
                this.items[item.index].locked = !!value;
            }
        }

        this.save();
    }

    lockAll() {
        for (let item of this.items) {
            item.locked = 1;
        }
        this.save();
    }

    unlockAll() {
        for (let item of this.items) {
            item.locked = 0;
        }
        this.save();
    }

    static getValidData(item) {
        return Object.assign({}, item, {
            data: item.data,
            locked: !!item.locked,
            group: Artifact.trimGroupNames(item.group),
        });
    }
}
