import { Artifact } from '../Artifact';
import { deserializeProfile, isProfileControl, migrateLegacyProfile, normalizeProfile, patchProfile,
    resolveArtifactSetSettings, serializeProfile } from '../ArtifactSetProfile';
import { CalcObject } from '../CalcObject';
import { Condition } from '../Condition';
import { normalizeRadianceStellarGlimmer } from '../Build/Settings';
import { Stats } from '../Stats';

const slots = ['flower', 'plume', 'sands', 'goblet', 'circlet'];

/**
 * The member's artifacts. Its settings hold the member's set-bonus profile
 * (ArtifactSetProfile): the effect controls of every set, worn or not, kept
 * when a set is unequipped. They also hold member state a worn set declares
 * (a `common.*` control), which is dropped with the set as before.
 *
 * getSettings() is what evaluation reads: the controls of the worn sets up
 * to their pieces, from the profile or their defaults, and the piece counts.
 * Writes change only the controls they name (patchProfile).
 */
export class CalcObjectArtifacts extends CalcObject {
    constructor() {
        super();
        this.artifacts = {
            flower: null,
            plume: null,
            sands: null,
            goblet: null,
            circlet: null,
        };
    }

    get() {
        return this.artifacts;
    }

    hasEquipped() {
        for (let slot of slots) {
            if (this.artifacts[slot]) {
                return true;
            }
        }

        return false;
    }

    getSettings() {
        let settings = this.getStateSettings();
        let setCounter = this.activeSets();

        Object.assign(settings, resolveArtifactSetSettings(this.getProfileSettings(), setCounter));

        for (let setName of Object.keys(setCounter)) {
            settings[Artifact.settingName(setName)] = setCounter[setName];
        }

        return settings;
    }

    /**
     * @returns {Object} a copy of the set-bonus profile, unworn sets included
     */
    getProfileSettings() {
        let result = {};
        for (const [name, value] of Object.entries(this.settings)) {
            if (isProfileControl(name)) result[name] = value;
        }
        return result;
    }

    /**
     * @returns {Object} a copy of the member state worn sets declare
     */
    getStateSettings() {
        let result = {};
        for (const [name, value] of Object.entries(this.settings)) {
            if (!isProfileControl(name)) result[name] = value;
        }
        return result;
    }

    /**
     * Replace the whole profile (a loaded build, a committed profile edit).
     *
     * @param {Object} profile
     */
    replaceProfile(profile) {
        this.settings = Object.assign(this.getStateSettings(), normalizeProfile(profile));
    }

    /**
     * @param {CalcObjectArtifacts} other
     */
    copySettingsFrom(other) {
        this.settings = structuredClone(other.settings);
        this.removeInvalidSettings();
    }

    /**
     * Change the controls the data names: a set effect control in the
     * profile (undefined or null resets it to its default), member state
     * replaced as before. Piece counts are derived, never stored.
     *
     * @param {Object} data
     */
    setSettings(data) {
        this.writeSettings(data, false);
    }

    modifySettings(data) {
        this.writeSettings(data, true);
        return this.getSettings();
    }

    addSettings(data) {
        this.writeSettings(data, true);
    }

    writeSettings(data, merge) {
        data = data || {};
        let profile = patchProfile(this.getProfileSettings(), data);
        let state = merge ? this.getStateSettings() : {};

        for (const [name, value] of Object.entries(data)) {
            if (isProfileControl(name) || isPieceSetting(name)) continue;
            state[name] = value;
        }

        this.settings = Object.assign(normalizeRadianceStellarGlimmer(state), profile);
        this.removeInvalidSettings();
    }

    /**
     * Profile controls are kept whether their set is worn or not; member
     * state is kept only for the worn sets' controls.
     */
    removeInvalidSettings() {
        let active = Condition.allConditionsOn(this.getConditions());
        let state = {};
        for (const [name, value] of Object.entries(this.getStateSettings())) {
            if (active[name] !== undefined && !isPieceSetting(name)) state[name] = value;
        }
        this.settings = Object.assign(state, normalizeProfile(this.getProfileSettings()));
    }

    /**
     * @returns {Array.<Condition>} the worn sets' conditions that are member
     *     state, not profile controls
     */
    getStateConditions() {
        return Condition.unwrap(this.getConditions()).filter((cond) => !isProfileControl(cond.getName()));
    }

    getFeatures() {
        let result = [];

        let sets = this.activeSets();
        let setIds = Object.keys(sets);

        for (let i = 0; i < setIds.length; ++i) {
            let set = setIds[i];
            let setData = DB.Artifacts.Sets.get(set);

            if (setData) {
                let features = setData.getFeatures(sets[set]);
                result = result.concat(features);
            }
        }

        return result;
    }

    isBeta() {
        let sets = this.activeSets();
        let setIds = Object.keys(sets);

        for (let set of setIds) {
            let setData = DB.Artifacts.Sets.get(set);
            if (setData && setData.isBeta()) {
                return true;
            }
        }

        return false;
    }

    getStats(settings) {
        let result = {
            stats: new Stats(),
            settings: {},
        };

        for (let i = 0; i < slots.length; ++i) {
            const slot = slots[i];
            let art = this.artifacts[slot];
            if (art) {
                result.stats.concat(art.calcStats(settings));
            }
        }

        return result;
    }

    getConditions() {
        let result = [];
        let sets = this.activeSets();
        let setIds = Object.keys(sets);

        for (let i = 0; i < setIds.length; ++i) {
            let set = setIds[i];

            let setData = DB.Artifacts.Sets.get(set);
            if (setData) {
                let items = setData.getConditions(sets[set]);
                result = result.concat(items);
            }
        }

        return result;
    }

    getPostEffects() {
        let result = [];

        for (let setData of DB.Artifacts.Sets.getList()) {
            let items = setData.getPostEffects();
            result = result.concat(items);
        }

        return result;
    }

    getMultipliers() {
        let result = [];
        let sets = this.activeSets();

        for (const [set, pieces] of Object.entries(sets)) {
            let setData = DB.Artifacts.Sets.get(set);
            if (setData) {
                let items = setData.getMultipliers(pieces);
                result = result.concat(items);
            }
        }

        return result;
    }

    modifySets(sets) {
        let data = [].concat(sets);
        let usedSet = {};
        let setNames = DB.Artifacts.Sets.getKeys();

        for (let i = 0; i < slots.length; ++i) {
            const slot = slots[i];
            let curArt = this.artifacts[slot];

            if (curArt) {
                let name = data.shift();


                if (!name) {
                    for (const setName of setNames) {
                        if (usedSet[setName]) {
                            continue;
                        }

                        let setData = DB.Artifacts.Sets.get(setName);
                        let cond = setData.getConditions(1);

                        if (cond.length) {
                            continue;
                        }

                        if (setData.minRarity <= curArt.rarity && setData.maxRarity >= curArt.rarity) {
                            name = setName;
                        }
                    }
                }

                usedSet[name] = 1;
                curArt.set = name;
            }
        }
    }

    set(art) {
        let slot = art.slot;
        this.artifacts[slot] = art;

        this.removeInvalidSettings();
    }

    replace(items) {
        for (let art of items) {
            let slot = art.slot;
            this.artifacts[slot] = art;
        }

        this.removeInvalidSettings();
    }

    remove(art) {
        let hash = art.getHash();
        for (let i = 0; i < slots.length; ++i) {
            const slot = slots[i];
            let art = this.artifacts[slot];
            if (art && art.getHash() == hash) {
                this.artifacts[slot] = null;
                this.removeInvalidSettings();
            }
        }
    }

    clearArtifacts() {
        for (let i = 0; i < slots.length; ++i) {
            const slot = slots[i];
            this.artifacts[slot] = null;
        }
    }

    isEquipped(art) {
        let slot = art.slot;

        if (this.artifacts[slot] && this.artifacts[slot] == art) {
            return true;
        }

        return false;
    }

    /**
     * @returns {Object.<string, number>} pieces by set of the worn pieces
     */
    activeSets() {
        let activeSets = {};

        for (let i = 0; i < slots.length; ++i) {
            const slot = slots[i];

            let art = this.artifacts[slot];
            if (!art) {
                continue;
            }

            if (!art.set) {
                continue;
            }

            if (!activeSets[art.set]) {
                activeSets[art.set] = 0;
            }

            ++activeSets[art.set];
        }

        return activeSets;
    }

    /**
     * The sets whose bonus is in effect, most pieces first: one set for four
     * pieces, two for 2+2.
     *
     * @returns {Array.<{set: string, pieces: number}>}
     */
    bonusSets() {
        let result = [];

        for (const [set, pieces] of Object.entries(this.activeSets())) {
            let setData = DB.Artifacts.Sets.get(set);
            let minPieces = setData ? setData.getMinBonusPieces() : 0;
            if (minPieces && pieces >= minPieces) {
                result.push({set, pieces});
            }
        }

        return result.sort((a, b) => b.pieces - a.pieces);
    }

    /**
     * [count, ...artifacts, profile (serializeProfile), member state of the
     * worn sets (serializeConditions)].
     *
     * @param {Object} settings the member's settings, for member state that
     *     another of its objects may hold
     * @returns {Array.<number>}
     */
    serialize(settings) {
        let result = [];
        let count = 0;

        for (let i = 0; i < slots.length; ++i) {
            const slot = slots[i];

            let art = this.artifacts[slot];
            if (!art) {
                continue;
            }

            ++count;

            result = result.concat(art.serialize());
        }

        result.unshift(count);
        result = result.concat(serializeProfile(this.getProfileSettings()));

        let state = Object.assign({}, settings, this.getStateSettings());
        return result.concat(this.serializeConditions(state, this.getStateConditions()));
    }

    /**
     * @param {Array.<number>} input consumed from the front
     * @param {Object} [opts] {profile: true} for the layout with a profile
     *     (character format 3 and a team's members). The released layout
     *     (character format 1) held the worn sets' controls only: they
     *     become a profile (migrateLegacyProfile).
     * @returns {CalcObjectArtifacts|null}
     */
    static deserialize(input, opts) {
        let count = input.shift();
        if (count < 0 || count > 5) return null;

        let result = new CalcObjectArtifacts();

        for (let i = 1; i <= count; ++i) {
            let art = Artifact.deserialize(input);
            if (art) {
                result.set(art);
            } else {
                return null;
            }
        }

        let profile;
        let state;
        if (opts && opts.profile) {
            profile = deserializeProfile(input);
            if (!profile) return null;
            state = result.deserializeConditions(input, result.getStateConditions());
            if (!state) return null;
        } else {
            let settings = result.deserializeConditions(input);
            if (!settings) return null;
            profile = migrateLegacyProfile(settings, result.activeSets());
            state = {};
            for (const [name, value] of Object.entries(settings)) {
                if (!isProfileControl(name)) state[name] = value;
            }
        }

        result.settings = Object.assign(normalizeRadianceStellarGlimmer(state), profile);
        result.removeInvalidSettings();

        return result;
    }
}

function isPieceSetting(name) {
    return name.startsWith('set_pieces.');
}
