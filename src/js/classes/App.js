import { CalcSet, defaultBuild } from "./CalcSet";
import { Rotation } from "./Rotation";
import { Serializer } from "./Serializer";
import { Storage } from "./Storage";
import { isTeamFormat, Team } from "./Team";

export class App {
    constructor(version) {
        this.version = version;
        this.storage = new Storage(this);
        this.settings = {};
        this.team = Team.fromMember(defaultBuild());
        this.viewedSlot = 0;
        /** The team as of the last refresh, see teamView() */
        this.currentTeamView = null;

        window.addEventListener('hashchange', () =>{ this.checkHash(); });
    }

    checkHash() {
        let hash = document.location.hash || '';
        hash = hash.substring(1);
        let loadedRotation;

        if (/^r/.exec(hash)) {
            let input = Serializer.unpack(hash.substring(1));
            loadedRotation = Rotation.deserialize(input);
        } else {
            let match = /^uid(\d{9})$/.exec(hash);
            if (match) {
                UI.EnkaImport.show(match[1]);
            }

            match = /^profile_(\w+)$/.exec(hash);
            if (match) {
                UI.EnkaImport.show(match[1]);
            }
        }

        let loaded = !!hash && this.loadSerialized(Serializer.unpack(hash));
        if (!loaded) {
            loaded = this.loadSerialized(Serializer.unpack(this.getSetting('last_team') || ''));
        }
        if (!loaded) {
            this.loadSerialized(Serializer.unpack(this.getSetting('last_build') || ''));
        }

        if (loadedRotation) {
            // A rotation link names no members: it is the viewed member's.
            this.setRotation(loadedRotation.assignOwner(this.currentSet().char.getId()));
            setTimeout(() => {UI.Layout.showTab('rotation');}, 500);
        }
    }

    getVersion() {
        return this.version;
    }

    /**
     * Load a team link, or make a team from a character build. A released
     * format-1 build brings its enemy and its Buffs tab, as the team's
     * legacy source (Team.fromMember).
     *
     * @param {Array.<number>|null} input serialized team or build
     * @returns {boolean} whether it was loaded
     */
    loadSerialized(input) {
        if (!input || !input.length) {
            return false;
        }

        let team = null;
        if (isTeamFormat(input[0])) {
            team = Team.deserialize(input);
        } else {
            let build = CalcSet.deserialize(input);
            if (build) {
                // Format 1 also brings its enemy, its party and buff rows
                // (the legacy source) and its team toggles.
                team = Team.fromMember(build);
            }
        }

        if (!team || team.getMembers().length == 0) {
            return false;
        }
        if (!this.showBetaContent() && team.hasBetaContent()) {
            return false;
        }

        this.setTeam(team);
        return true;
    }

    /**
     * @param {Team} team
     * @param {number} [slot] slot to view, the first member by default
     */
    setTeam(team, slot) {
        this.team = team;
        this.viewedSlot = team.getMember(slot) ? slot : team.getSlots().findIndex((member) => !!member);
        this.refresh();
    }

    getTeam() {
        return this.team;
    }

    getViewedSlot() {
        return this.viewedSlot;
    }

    /**
     * @param {number} slot an occupied slot
     */
    viewMember(slot) {
        if (!this.team.getMember(slot)) {
            return;
        }
        this.viewedSlot = slot;
        this.refresh();
    }

    /**
     * Fill a slot from any build (a link, a saved build, an import, a
     * suggestion) and view it: only its character build is taken, see
     * Team.importMember. A character is in one slot only: a build of a
     * character already in another slot replaces that member.
     *
     * @param {number} slot
     * @param {CalcSet} build
     */
    fillSlot(slot, build) {
        let existing = this.team.getMembers().find((member) => member.char.getId() == build.char.getId());
        if (existing) {
            slot = this.team.slotOf(existing);
        }

        this.team.importMember(slot, build);
        this.viewedSlot = slot;
        this.refresh();
    }

    /**
     * What the My characters tab saves for the viewed member: the character,
     * and with it the team's additional buffs (its legacy source) when it
     * has any. They are saved as a team of one (Team.withOnly), so the
     * enemy and the team toggles are saved with them: what a build of the
     * released calculator holds, and what loadSavedTeam gives back. The
     * other members are never saved with a character.
     *
     * @returns {CalcSet|Team} a build on its own, or a team of one
     */
    buildToSave() {
        let member = this.currentSet();
        return this.team.legacy.getEntries().length ? this.team.withOnly(member) : member.characterBuild();
    }

    /**
     * Start a new team from a saved build: the character with what it was
     * saved with (buildToSave), or a build of the released calculator (format
     * 1) with its enemy, its party and buff rows (the team's legacy source)
     * and its team toggles, as its link loads (loadSerialized). Filling a
     * slot takes only the character (fillSlot). The saved build is not
     * changed.
     *
     * @param {CalcSet} build a build as its storage decodes it
     *     (StorageItemChar.decodeItem)
     * @returns {boolean} whether it was loaded
     */
    loadSavedTeam(build) {
        let team = build.team ? build.team.clone() : Team.solo(build).team;
        if (!this.showBetaContent() && team.hasBetaContent()) {
            return false;
        }

        this.setTeam(team);
        return true;
    }

    /**
     * Fill a slot with a new build of a character.
     *
     * @param {number} slot
     * @param {DbObjectChar} char
     */
    newMember(slot, char) {
        this.fillSlot(slot, defaultBuild(char));
    }

    /**
     * Empty a slot. The last member cannot be removed; removing the viewed
     * member views the first remaining one.
     *
     * @param {number} slot
     */
    removeMember(slot) {
        if (this.team.getMembers().length <= 1) {
            return;
        }
        this.team.removeMember(slot);
        if (slot == this.viewedSlot) {
            this.viewedSlot = this.team.getSlots().findIndex((member) => !!member);
        }
        this.refresh();
    }

    setOnFieldMember(slot) {
        this.team.setOnFieldMember(this.team.getMember(slot));
        this.refresh();
    }

    /**
     * Team toggles (Team/Settings.js): changed on the team, not through a
     * member.
     *
     * @param {Object} data
     */
    modifyTeamSettings(data) {
        this.team.modifySettings(data);
        this.refresh();
    }

    /**
     * @param {string} key stack key
     * @param {number} sourceId the source (CalcSet.getSourceId: a member's
     *     character, or an entry of the legacy source), or 0 for nobody
     * @param {number|null} [receiverSlot] recipient's slot for a key scoped per recipient
     */
    setStackSource(key, sourceId, receiverSlot = null) {
        let receiver = receiverSlot === null ? null : this.team.getMember(receiverSlot);
        let source = sourceId ? this.team.getSources().find((item) => item.getSourceId() === sourceId) : null;
        this.team.setStackSource(key, source || null, receiver);
        this.refresh();
    }

    /**
     * Change the team's legacy source (Team/Legacy): add, remove or move an
     * entry, or change one. The team is refreshed after the change.
     *
     * @param {function(Team)} change
     */
    changeLegacy(change) {
        change(this.team);
        this.refresh();
    }

    setConditionValue(sourceId, receiverId, name, value) {
        this.team.setConditionValue(sourceId, receiverId, name, value);
        this.refresh();
    }

    resetBuild(charId) {
        let char = charId ? DB.Chars.getById(charId) : null;
        this.newMember(this.viewedSlot, char || DB.Chars.getFirst());
        document.location.hash = '';
    }

    /**
     * Start over: a new team of one default build, as the calculator opens
     * with. Everything the team owns goes with the old one: its members, the
     * enemy, the team toggles, the rotation, the legacy source, the stack
     * choices and the condition values per receiver.
     */
    resetTeam() {
        this.setTeam(Team.fromMember(defaultBuild()));
        document.location.hash = '';
    }

    /**
     * Replace the viewed member with a build.
     *
     * @param {CalcSet} set
     */
    replaceSet(set) {
        this.fillSlot(this.viewedSlot, set);
    }

    /**
     * @returns {CalcSet} the viewed member
     */
    currentSet() {
        return this.team.getMember(this.viewedSlot);
    }

    /**
     * The team as the calculator shows it: one evaluation of its state,
     * which every member's view reads. Every change the app makes ends with
     * a refresh, which discards the view, so all readers of one state share
     * one evaluation. Read through it; change through the team or its
     * members and refresh.
     *
     * @returns {TeamView}
     */
    teamView() {
        this.currentTeamView ||= this.team.view();
        return this.currentTeamView;
    }

    /**
     * The viewed member as the calculator shows it, see teamView().
     *
     * @returns {MemberView}
     */
    view() {
        return this.teamView().member(this.currentSet());
    }

    getFeatures(data) {
        return this.view().getFeatures(data);
    }

    setChar(char) {
        this.currentSet().setChar(char);
        this.refresh();
    }

    setCharLevels(data) {
        this.currentSet().setCharLevels(data);
        this.refresh();
    }

    setCharSkills(data) {
        this.currentSet().setCharSkills(data);
        this.refresh();
    }

    setCharSettings(data) {
        this.currentSet().setCharSettings(data);
        this.refresh();
    }

    getChar() {
        return this.currentSet().getChar();
    }

    setWeapon(data) {
        this.currentSet().setWeapon(data);
        this.refresh();
    }

    setWeaponLevels(data) {
        this.currentSet().setWeaponLevels(data);
        this.refresh();
    }

    setWeaponSettings(data) {
        this.currentSet().setWeaponSettings(data);
        this.refresh();
    }

    setArtifact(data, noRefresh) {
        this.currentSet().setArtifact(data);
        if (!noRefresh) {
            this.refresh();
        }
    }

    getWeapon() {
        return this.currentSet().getWeapon();
    }

    // The enemy is team state: it is changed on the team, not through a member.

    /**
     * @param {DbObjectEnemy|null} data null for a custom enemy
     */
    setEnemy(data) {
        this.team.enemy.set(data);
        this.refresh();
    }

    setEnemyLevels(data) {
        this.team.enemy.setLevels(data);
        this.refresh();
    }

    setEnemyResistances(data) {
        this.team.enemy.setResistances(data);
        this.refresh();
    }

    /**
     * @param {Object} data enemy condition settings to change
     */
    setEnemySettings(data) {
        this.team.enemy.modifySettings(data);
        this.refresh();
    }

    /**
     * The team's and its enemy's part of settings that span owners, such as
     * an artifact set's scenario (Team.applyShared).
     *
     * @param {Object} data
     */
    applySharedSettings(data) {
        this.team.applyShared(data);
        this.refresh();
    }

    getArtifacts() {
        return this.currentSet().getArtifacts();
    }

    removeArtifact(data) {
        this.currentSet().removeArtifact(data);
        this.refresh();
    }

    setArtifactsSettings(data) {
        this.currentSet().setArtifactsSettings(data);
        this.refresh();
    }

    isEquipped(data) {
        return this.currentSet().isEquipped(data);
    }

    setFood(type, food, level) {
        this.currentSet().setFood(type, food, level);
        this.refresh();
    }

    getFood(type) {
        return this.currentSet().getFood(type);
    }

    getFoodLevel(type) {
        return this.currentSet().getFoodLevel(type);
    }

    getBuffs() {
        return this.currentSet().getBuffs();
    }

    setBuffsSettings(data) {
        this.currentSet().setBuffsSettings(data);
        this.refresh();
    }

    modifyBuffsSettings(data) {
        this.currentSet().modifyBuffsSettings(data);
        this.refresh();
    }

    /**
     * @param {Rotation} data the team's rotation
     */
    setRotation(data) {
        this.team.setRotation(data);
    }

    /**
     * @returns {Rotation} the team's rotation
     */
    getRotation() {
        return this.team.getRotation();
    }

    getSettings() {
        let settings = this.currentSet().getSettings();
        return settings;
    }

    getConditions(options) {
        return this.currentSet().getConditions(options);
    }

    getStats() {
        return this.view().getStats();
    }

    getBuildData() {
        return this.view().getBuildData();
    }

    setSetting(name, value) {
        return this.storage.settings.set(name, value);
    }

    showBetaContent() {
        return this.storage.settings.showBetaContent();
    }

    getSetting(name) {
        return this.storage.settings.get(name);
    }

    setFeature(value) {
        this.setSetting('suggester_feature_name', value);
    }

    getFeature() {
        let features = this.view().calcFeatures();
        let keys = Object.keys(features);
        let featureName = this.getSetting('suggester_feature_name');

        if (! keys.includes(featureName)) {
            featureName = keys[0];
        }

        return featureName;
    }

    getDisplayMode() {
        return this.getSetting('suggester_display_mode') || 'percent';
    }

    setDisplayMode(value) {
        this.setSetting('suggester_display_mode', value);
    }

    queueUpdate() {
        if (this.getSetting('storage_sync_enabled')) {
            this.storage.sync.queue();
        }
    }

    initSync(manual) {
        this.storage.sync.init(manual);
    }

    enableSync() {
        UI.Sync.enable();
        this.storage.sync.driveInitApp(true);
    }

    disableSync(deleteFile) {
        this.storage.sync.disable(deleteFile);
        this.refresh();
    }

    refresh(opts) {
        opts = Object.assign({}, opts);
        for (let member of this.team.getMembers()) {
            this.storage.artifacts.enrichBuild(member);
        }
        this.currentSet().refreshCommonSettings();
        // The state is final for this refresh: views of the previous one
        // are discarded.
        this.currentTeamView = null;
        this.saveLastTeam();

        let updateStorage = false;
        if (Array.isArray(opts.objects)) {
            for (let obj of opts.objects) {
                let parts = obj.split('.');
                let category = parts[0];
                if (category == 'storage') {
                    updateStorage = true;
                    break;
                }
            }
        }

        if (updateStorage) {
            this.queueUpdate();
        }

        UI.Layout.refresh();
    }

    saveLastTeam() {
        this.setSetting('last_team', Serializer.pack(this.team));
        // Keep last_build as the original released-data backup.
    }

    addCharactersToStorage(chars) {
        this.storage.char.addChars(chars);
        this.refresh({objects: ['storage.artifacts']});
    }

    addArtifactsToStorage(arts) {
        this.storage.artifacts.addArtifacts(arts);
        this.refresh({objects: ['storage.artifacts']});
    }
}
