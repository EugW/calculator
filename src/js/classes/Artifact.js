import { Serializer } from './Serializer';
import { Stats, isPercent } from './Stats';
import { substatCheck } from './SubstatCheck';
import { normalizeArtifactMetadata, serializeArtifactMetadata, deserializeArtifactMetadata, mergeArtifactMetadata, displaySubstatValue, correctHalfwayValue, goodRollIdValues } from './ArtifactMetadata';
import { artifactPreciseSubstatValues } from './ArtifactPreciseValues';

export class Artifact {
    constructor(rarity, level, slot, set, mainStat, subStats, unactivatedSubstats) {
        this.rarity = rarity;
        this.level = level;
        this.slot = slot;
        this.set = set;
        this.mainStat = mainStat;
        this.subStats = subStats || [];
        this.unactivatedSubstats = unactivatedSubstats || [];
        this.locked = false;
        this.groups = [];
        this.calculated = null;
        this.metadata = {};
    }

    setMetadata(input) {
        this.metadata = normalizeArtifactMetadata(this, input);
    }

    getMetadata() {
        return normalizeArtifactMetadata(this, this.metadata);
    }

    isCrafted() {
        return this.metadata.elixirCrafted === true;
    }

    getInitialLineCount() {
        const total = this.getMetadata().totalRolls;
        return total === undefined ? undefined : total - Math.floor(this.level / 4);
    }

    // Stats-only identity for importing metadata into older storage entries.
    // getHash() remains the complete serialized payload used by builds/storage.
    getStatsHash() {
        const copy = new Artifact(this.rarity, this.level, this.slot, this.set, this.mainStat,
            [...this.subStats].sort((a, b) => a.stat.localeCompare(b.stat)),
            [...this.getUnactivatedSubStats()]);
        return copy.getHash();
    }

    enrichFrom(artifact) {
        if (this.getStatsHash() !== artifact.getStatsHash()) return null;
        const metadata = mergeArtifactMetadata(this.getMetadata(), artifact.getMetadata(), this.rarity);
        if (!metadata) return null;
        const result = this.clone();
        result.setMetadata(metadata);
        return result;
    }

    addStat(stat, value) {
        this.subStats.push({
            stat: stat,
            value: value,
        });

        this.calculated = null;
    }

    addUnactivatedStat(stat, value) {
        this.unactivatedSubstats.push({
            stat: stat,
            value: value,
        });

        this.calculated = null;
    }

    // Exact line totals where the roll history allows, aligned with getSubStats().
    // Recomputed whenever the lines, level or metadata change.
    getPreciseSubStatValues() {
        const key = this.rarity + '/' + this.level + '/' + this.subStats.map(item => item.stat + ':' + item.value).join('/');
        const cache = this.preciseValues;
        if (!cache || cache.key !== key || cache.metadata !== this.metadata || cache.base !== this.basePreciseValues) {
            this.preciseValues = {key, metadata: this.metadata, base: this.basePreciseValues,
                values: artifactPreciseSubstatValues(this)};
        }
        return this.preciseValues.values;
    }

    calcStats() {
        const result = new Stats();

        let mainData = DB.Artifacts.Mainstats.get(this.mainStat);
        if (mainData) {
            let statTable = mainData.values[this.rarity - 1];
            result.add(this.mainStat, statTable.getValue(this.level));
        }

        const precise = this.getPreciseSubStatValues();
        for (let i = 0; i < this.subStats.length; ++i) {
            result.add(this.subStats[i].stat, precise[i]);
        }

        result.add('crit_value', result.get('crit_rate') * 2 + result.get('crit_dmg'));

        return result;
    }

    calcOptimizerStats(usedStats) {
        const calculated = this.calcStats();
        calculated.truncate(usedStats);
        calculated.processPercent();
        return calculated;
    }

    /**
     * Exact twin of calcOptimizerStats(usedStats) for lowering many artifacts:
     * the same keys in the same order with bit-identical values, without
     * building, truncating and rescaling a Stats object per artifact.
     * lower(artifact) returns a scratch {keys, values, length} that the next
     * call overwrites.
     */
    static createOptimizerStatsLowering(usedStats) {
        const used = new Set(usedStats);
        const percent = new Map();
        const mains = new Map();
        const keys = [];
        const values = [];
        const result = {keys, values, length: 0};
        let count = 0;
        // Stats#add: (current || 0) + value.
        const add = (stat, value) => {
            for (let i = 0; i < count; ++i) {
                if (keys[i] === stat) {
                    values[i] = (values[i] || 0) + value;
                    return;
                }
            }
            keys[count] = stat;
            values[count++] = 0 + value;
        };
        const get = stat => {
            for (let i = 0; i < count; ++i) if (keys[i] === stat) return values[i] || 0;
            return 0;
        };
        return artifact => {
            count = 0;
            const mainKey = artifact.mainStat + '/' + artifact.rarity + '/' + artifact.level;
            let main = mains.get(mainKey);
            if (main === undefined) {
                const mainData = DB.Artifacts.Mainstats.get(artifact.mainStat);
                main = mainData ? mainData.values[artifact.rarity - 1].getValue(artifact.level) : null;
                mains.set(mainKey, main);
            }
            if (main !== null) add(artifact.mainStat, main);
            const precise = artifact.getPreciseSubStatValues();
            for (let i = 0; i < artifact.subStats.length; ++i) {
                add(artifact.subStats[i].stat, precise[i]);
            }
            add('crit_value', get('crit_rate') * 2 + get('crit_dmg'));
            // truncate(usedStats) keeps order; processPercent rescales.
            let kept = 0;
            for (let i = 0; i < count; ++i) {
                const stat = keys[i];
                if (!used.has(stat)) continue;
                let isPercentStat = percent.get(stat);
                if (isPercentStat === undefined) percent.set(stat, isPercentStat = isPercent(stat));
                keys[kept] = stat;
                values[kept++] = isPercentStat ? values[i] / 100 : values[i];
            }
            result.length = kept;
            return result;
        };
    }

    calcCache(usedStats) {
        this.calculated = this.calcOptimizerStats(usedStats);
    }

    replace(art) {
        this.rarity = art.rarity;
        this.level = art.level;
        this.slot = art.slot;
        this.set = art.set;
        this.mainStat = art.mainStat;
        this.subStats = art.subStats;
        this.unactivatedSubstats = art.unactivatedSubstats || [];
        this.groups = art.getGroups();
        this.setMetadata(art.getMetadata());

        this.calculated = null;
    }

    getLevel() {
        return this.level;
    }

    getSet() {
        return this.set;
    }

    getRarity() {
        return this.rarity;
    }

    getMainStat() {
        return ''+ this.mainStat;
    }

    getSetName() {
        return ''+ this.set;
    }

    getSlot() {
        return ''+ this.slot;
    }

    getMainStatValue() {
        let stat = this.getMainStat();
        if (!stat) {
            return 0;
        }

        let data = DB.Artifacts.Mainstats.get(stat);

        return data.values[this.rarity-1].getValue(this.level);
    }

    getSubStats() {
        return this.subStats;
    }

    getUnactivatedSubStats() {
        return this.unactivatedSubstats || [];
    }

    getAllSubStats() {
        return this.getSubStats().concat(this.getUnactivatedSubStats());
    }

    getDisplaySubStats() {
        let result = [];

        for (let item of this.getSubStats()) {
            result.push({
                stat: item.stat,
                value: item.value,
                inactive: false,
            });
        }

        for (let item of this.getUnactivatedSubStats()) {
            result.push({
                stat: item.stat,
                value: item.value,
                inactive: true,
            });
        }

        return result;
    }

    // Only a stated count: never estimated from roll values.
    getTotalRolls() {
        return this.getMetadata().totalRolls;
    }

    activateUnlockedSubstats() {
        let count = Math.min(this.getUnactivatedSubStats().length, Math.floor(this.level / 4));

        while (count > 0) {
            let item = this.unactivatedSubstats.shift();
            this.addStat(item.stat, item.value);
            --count;
        }
    }

    setGroups(value) {
        let names = value;
        if (!Array.isArray(value)) {
            names = [value];
        }

        let result = [];
        for (let name of names) {
            let newName = Artifact.trimGroupName(name);
            if (!Artifact.inGroups(result, newName)) {
                result.push(newName);
            }
        }

        this.groups = result;
    }

    getGroups() {
        if (!this.groups || this.groups.length == 0) {
            return [''];
        }
        return this.groups;
    }

    hasGroup(group) {
        let id = group.toUpperCase();
        for (let group of this.groups) {
            if (id == group.toUpperCase()) {
                return true;
            }
        }
        return false;
    }

    inGroups(groupList) {
        for (let groupName of groupList) {
            if (this.hasGroup(groupName)) {
                return true;
            }
        }
        return false;
    }

    isValid() {
        return this.getErrors().length == 0;
    }

    setLocked(val) {
        this.locked = !!val;
    }

    isLocked() {
        return this.locked;
    }

    getHash() {
        return Serializer.pack(this);
    }

    getErrors() {
        let errors = [];

        if (! DB.Artifacts.Sets.get(this.set)) {
            errors.push('no_set');
        }

        if (! DB.Artifacts.Mainstats.get(this.mainStat)) {
            errors.push('no_main_stat');
        }

        let rarityData = DB.Artifacts.Rarity[this.rarity-1];

        let statsCnt = this.getAllSubStats().length;
        if (statsCnt < rarityData.minSubstats || statsCnt > rarityData.maxSubstats) {
            errors.push('substat_count_mismatch');
        }

        let isStatEqulaMain = false;
        let isSubstatValueRange = false;
        let isSubstatValueRolls = false;
        let isSubstatDuplicate = false;

        let allSubstats = [];
        let upgradesCnt = 0;

        for (const sub of this.getAllSubStats()) {
            if (sub.stat == this.mainStat) {
                isStatEqulaMain = true;
            }

            if (allSubstats.includes(sub.stat)) {
                isSubstatDuplicate = true;
            }
            allSubstats.push(sub.stat);

            let rollData = substatCheck(sub.stat, this.rarity, sub.value);

            if (rollData.last > 0) {
                if (rollData.steps.length < rollData.maxUpgrades) {
                    isSubstatValueRolls = true;
                } else {
                    isSubstatValueRange = true;
                }
            }

            if (this.subStats.includes(sub) && rollData.steps.length > 1) {
                upgradesCnt += rollData.steps.length - 1;
            }
        }

        let maxRarityUpdates = rarityData.maxSubstats - 4 + Math.floor(this.level / 4);
        let minRarityUpdates = Math.max(0, rarityData.minSubstats - 4 + Math.floor(this.level / 4));

        if (upgradesCnt > 0 && this.getAllSubStats().length < 4) {
            errors.push('not_full_substats');
        }

        if (upgradesCnt > maxRarityUpdates || upgradesCnt >= rarityData.maxUpgrades) {
            errors.push('too_much_upgrades');
        }

        if (upgradesCnt < minRarityUpdates - 1) {
            errors.push('too_low_upgrades');
        }

        if (isStatEqulaMain) {
            errors.push('substat_equal_main');
        }

        if (isSubstatValueRolls) {
            errors.push('substat_value_rolls');
        }

        if (isSubstatValueRange) {
            errors.push('substat_value_range');
        }

        if (isSubstatDuplicate) {
            errors.push('substat_duplicate');
        }

        return errors;
    }

    getErrorsFormatted() {
        let errors = this.getErrors();

        if (errors.length == 0) return '';

        let result = '';

        for (const text of errors) {
            result += '<p>'+ UI.Lang.get('artifact_error.'+ text) +'</p>';
        }

        return result;
    }

    toGood() {
        let setData = DB.Artifacts.Sets.get(this.set);
        let statData = DB.Artifacts.Mainstats.get(this.mainStat);

        let result = {
            setKey: setData.getGoodId(),
            slotKey: this.slot,
            level: this.level,
            rarity: this.rarity,
            mainStatKey: statData.goodId,
            location: "",
            lock: this.isLocked(),
            substats: [],
        };

        const metadata = this.getMetadata();
        for (const key of ['totalRolls', 'elixirCrafted']) {
            if (metadata[key] !== undefined) result[key] = metadata[key];
        }

        // GOOD v3 defines the crafted pair as the first two substats.
        const pair = metadata.definedSubstats || [];
        const ordered = [...this.subStats].sort((a, b) => Number(pair.includes(b.stat)) - Number(pair.includes(a.stat)));
        // Extension prevents a known crafted flag with an unknown pair from
        // accidentally claiming the first two displayed rows on round-trip.
        if (metadata.elixirCrafted === true) result.definedSubstats = pair.map(stat => DB.Artifacts.Substats.get(stat).goodId);

        for (const item of ordered) {
            let data = DB.Artifacts.Substats.get(item.stat);
            if (!data) {
                return null;
            }

            result.substats.push({
                key: data.goodId,
                value: item.value,
                ...(metadata.initialValues?.[item.stat] !== undefined ? {initialValue: metadata.initialValues[item.stat]} : {}),
            });
        }

        if (this.getUnactivatedSubStats().length) {
            result.unactivatedSubstats = [];

            for (const item of this.getUnactivatedSubStats()) {
                let data = DB.Artifacts.Substats.get(item.stat);
                if (!data) {
                    return null;
                }

                result.unactivatedSubstats.push({
                    key: data.goodId,
                    value: item.value,
                    ...(metadata.initialValues?.[item.stat] !== undefined ? {initialValue: metadata.initialValues[item.stat]} : {}),
                });
            }
        }

        // Not part of GOOD: the roll IDs, as Irminsul's roll-ID export writes them.
        if (metadata.appendPropIdList) result.appendPropIdList = [...metadata.appendPropIdList];

        return result;
    }

    serialize() {
        const metadata = this.getMetadata();
        const hasMetadata = Object.keys(metadata).length > 0;
        // v4 is v3 plus the roll IDs, only for artifacts that have them.
        let result = [metadata.appendPropIdList ? 4 : hasMetadata ? 3 : 2];
        // Metadata stores the defined pair explicitly, so v3 active rows can
        // have a canonical order across importers. Legacy v2 stays byte-stable.
        // Inactive row order still determines reveal order and is not sorted.
        const active = hasMetadata ? [...this.subStats].sort((a, b) => a.stat.localeCompare(b.stat)) : this.subStats;

        result.push(DB.Artifacts.Sets.getId(this.set));
        result.push(this.rarity);
        result.push(this.level);
        result.push(DB.Artifacts.Slots.getId(this.slot));
        result.push(DB.Artifacts.Mainstats.getId(this.mainStat) || 0);
        result.push(this.subStats.length);

        for (const stat of active) {
            result.push(DB.Artifacts.Substats.getId(stat.stat));

            let substat = DB.Artifacts.Substats.get(stat.stat);
            let value = stat.value;

            if (substat.type == 'percent') {
                value = Math.floor(value * 10);
            }

            result.push(value);
        }

        result.push(this.getUnactivatedSubStats().length);

        for (const stat of this.getUnactivatedSubStats()) {
            result.push(DB.Artifacts.Substats.getId(stat.stat));

            let substat = DB.Artifacts.Substats.get(stat.stat);
            let value = stat.value;

            if (substat.type == 'percent') {
                value = Math.floor(value * 10);
            }

            result.push(value);
        }

        if (hasMetadata) {
            const suffix = serializeArtifactMetadata(metadata);
            result.push(suffix.length, ...suffix);
        }
        return result;
    }

    clone() {
        const result = Artifact.deserialize(this.serialize());
        if (result) {
            result.setLocked(this.isLocked());
            result.setGroups([...this.getGroups()]);
            if (this.basePreciseValues) result.basePreciseValues = this.basePreciseValues;
        }
        return result;
    }

    static deserialize(input) {
        let version = input.shift();
        let result = null;

        if (version == 1 || version == 2 || version == 3 || version == 4) {
            let set = DB.Artifacts.Sets.getKeyId(input.shift());
            if (!set) return null;

            let rarity = input.shift();
            if (!Number.isInteger(rarity) || rarity < 1 || rarity > 5) return null;

            let level = input.shift();
            if (!Number.isInteger(level) || level < 0 || level > 20) return null;

            let slot = DB.Artifacts.Slots.getKeyId(input.shift());
            if (!slot) return null;

            let mainStat = DB.Artifacts.Mainstats.getKeyId(input.shift()) || '';
            // if (!mainStat) return null;

            let substatCnt = input.shift();
            if (!Number.isInteger(substatCnt) || substatCnt < 0 || substatCnt > 4) return null;

            result = new Artifact(rarity, level, slot, set, mainStat);

            for (let i = 1; i <= substatCnt; ++i) {
                let data = Artifact.deserializeSubStat(input);
                if (!data) return null;

                result.addStat(data.stat, data.value);
            }

            if (version >= 2) {
                let unactivatedCnt = input.shift();
                if (!Number.isInteger(unactivatedCnt) || unactivatedCnt < 0 || substatCnt + unactivatedCnt > 4) return null;

                for (let i = 1; i <= unactivatedCnt; ++i) {
                    let data = Artifact.deserializeSubStat(input);
                    if (!data) return null;

                    result.addUnactivatedStat(data.stat, data.value);
                }
            }

            const legacy = version < 3 ? Artifact.legacyMetadata(result) : null;
            result.activateUnlockedSubstats();
            if (legacy) result.setMetadata(legacy);
            if (version >= 3) {
                // v3 metadata is at most 14 numbers; v4 adds a count and up to 9 roll IDs.
                const length = input.shift();
                if (!Number.isInteger(length) || length < 4 || length > (version === 4 ? 24 : 14) || input.length < length) return null;
                const metadata = deserializeArtifactMetadata(input.splice(0, length), version === 4);
                if (!metadata) return null;
                result.setMetadata(metadata);
                if (JSON.stringify(serializeArtifactMetadata(result.getMetadata())) !== JSON.stringify(serializeArtifactMetadata(metadata))) return null;
            }
        }

        return result;
    }

    // Deployed v1/v2 records stored no roll history. Below +4 no upgrade has happened,
    // so the active lines are the start and each value is its first roll. A stored
    // unactivated line also proves the start. Nothing else is inferred. Values
    // imported from Irminsul get the same half-way correction as GOOD imports.
    static legacyMetadata(artifact) {
        artifact.subStats = artifact.subStats.map(({stat, value}) => ({stat, value: correctHalfwayValue(stat, artifact.rarity, value)}));
        const unactivated = artifact.getUnactivatedSubStats();
        if (artifact.level >= 4 && !unactivated.length) return null;
        const initialValues = Object.fromEntries(unactivated.map(({stat, value}) => [stat, value]));
        if (artifact.level < 4) for (const {stat, value} of artifact.subStats) initialValues[stat] = value;
        return {totalRolls: artifact.subStats.length + Math.floor(artifact.level / 4), initialValues};
    }

    static fromGood(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
        let setName = DB.Artifacts.Sets.getKeyIdGood(data.setKey);
        let setData = DB.Artifacts.Sets.get(setName);
        if (!setData) return null;

        let slotData = DB.Artifacts.Slots.get(data.slotKey);
        if (!slotData) return null;

        let mainStat = DB.Artifacts.Mainstats.getKeyIdGood(data.mainStatKey);
        let mainData = DB.Artifacts.Mainstats.get(mainStat);
        if (!mainData) return null;

        if (!mainData.slots.includes(data.slotKey)) return null;

        if (!Number.isInteger(data.rarity) || data.rarity < setData.minRarity || data.rarity > setData.maxRarity) return null;

        let rarityData = DB.Artifacts.Rarity[data.rarity - 1];
        if (!Number.isInteger(data.level) || data.level < 0 || data.level > rarityData.maxLevel) return null;

        let result = new Artifact(data.rarity, data.level, data.slotKey, setName, mainStat);
        const initialValues = {};

        let activeSubstats = Array.isArray(data.substats) ? data.substats : [];
        // Only a 5★ can hold an unactivated line; lower rarities never expose one.
        let inactiveSubstats = data.rarity === 5 && Array.isArray(data.unactivatedSubstats) ? data.unactivatedSubstats : [];

        if (activeSubstats.length) {
            if (activeSubstats.length > 4) return null;

            for (const item of activeSubstats) {
                if (!item || !item.key) {
                    continue;
                }
                let subStat = DB.Artifacts.Substats.getKeyIdGood(item.key);
                if (!subStat) return null;

                let value = item.value ?? item.initialValue;
                if (!Number.isFinite(value) || value <= 0) return null;
                value = correctHalfwayValue(subStat, data.rarity, displaySubstatValue(subStat, value));
                result.addStat(subStat, value);
                // Before +4 no upgrade has happened, so a value is still its first roll.
                initialValues[subStat] = item.initialValue ?? (data.level < 4 ? value : undefined);
            }
        }

        if (inactiveSubstats.length) {
            if (activeSubstats.length + inactiveSubstats.length > 4) return null;

            for (const item of inactiveSubstats) {
                if (!item || !item.key) {
                    continue;
                }

                let subStat = DB.Artifacts.Substats.getKeyIdGood(item.key);
                if (!subStat) return null;

                let value = item.initialValue ?? item.value;
                if (!Number.isFinite(value) || value <= 0) return null;
                value = displaySubstatValue(subStat, value);
                result.addUnactivatedStat(subStat, value);
                initialValues[subStat] = value;
            }
        }

        result.activateUnlockedSubstats();
        if (new Set(result.getAllSubStats().map(item => item.stat)).size !== result.getAllSubStats().length) return null;
        const crafted = typeof data.elixirCrafted === 'boolean' ? data.elixirCrafted : data.elixerCrafted;
        // Irminsul's roll-ID export lists every roll; its totals are the game's values.
        const rolled = goodRollIdValues(result, data.appendPropIdList, initialValues);
        if (rolled) {
            for (const item of result.getSubStats()) {
                item.value = rolled.values[item.stat];
                initialValues[item.stat] ??= rolled.initials[item.stat];
            }
        }
        // Below +4 the active lines are the start, whether or not the source says so.
        const totalRolls = Number.isInteger(data.totalRolls) ? data.totalRolls
            : rolled ? data.appendPropIdList.length
            : data.level < 4 ? result.getSubStats().length : undefined;
        result.setMetadata({
            initialValues, totalRolls, elixirCrafted: crafted,
            definedSubstats: Object.prototype.hasOwnProperty.call(data, 'definedSubstats')
                ? (Array.isArray(data.definedSubstats) ? data.definedSubstats.map(key => DB.Artifacts.Substats.getKeyIdGood(key)) : [])
                : crafted === true ? result.getAllSubStats().slice(0, 2).map(item => item.stat) : undefined,
            ...(rolled ? {appendPropIdList: data.appendPropIdList} : {}),
        });
        result.setLocked(data.lock === true);

        return result;
    }

    static subStatsIsSimilar(sample, art) {
        if (sample.subStats.length < art.subStats.length) {
            return false;
        }

        for (let i = 0; i < art.subStats.length; ++i) {
            if (sample.subStats[i].stat != art.subStats[i].stat || sample.subStats[i].value < art.subStats[i].value) {
                return false;
            }
        }

        return true;
    }

    static inGroups(groups, name) {
        for (let group of groups) {
            if (Artifact.groupsAreEqual(group, name)) {
                return true;
            }
        }
        return false;
    }

    static groupsAreEqual(g1, g2) {
        return g1.toUpperCase() == g2.toUpperCase();
    }

    static trimGroupNames(values) {
        if (!Array.isArray(values)) {
            values = [values];
        }

        let result = [];
        for (let value of values) {
            result.push(Artifact.trimGroupName(value));
        }
        return result;
    }

    static trimGroupName(value) {
        let group = value || '';
        group = group.replace(/[^\w\u0400-\u04ff\d_\-\s]/g, '');
        group = group.replace(/\s+/g, ' ');
        return group.trim();
    }

    static deserializeSubStat(input) {
        let statKey = DB.Artifacts.Substats.getKeyId(input.shift());
        if (!statKey) return null;

        let value = input.shift();
        if (!Number.isFinite(value) || value < 1) return null;

        let substat = DB.Artifacts.Substats.get(statKey);
        if (!substat) return null;

        if (substat.type == 'percent') {
            value = parseFloat(value) / 10;
        } else {
            value = parseInt(value);
        }

        return {
            stat: statKey,
            value: value,
        };
    }

    static settingName(name) {
        return 'set_pieces.'+ name.toLowerCase();
    }

    static settingNameShort(name) {
        return name.toLowerCase();
    }
}



