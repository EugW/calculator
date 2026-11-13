import { BuildData } from "./Build/Data";
import { CalcObjectArtifacts } from "./CalcObject/Artifacts";
import { CalcObjectBuffs } from "./CalcObject/Buffs";
import { CalcObjectCharacter } from "./CalcObject/Character"
import { CalcObjectEnemy, isEnemySetting } from "./CalcObject/Enemy";
import { CalcObjectFood } from "./CalcObject/Food";
import { CalcObjectReaction } from "./CalcObject/Reaction";
import { CalcObjectStatic } from "./CalcObject/Static";
import { CalcObjectWeapon } from "./CalcObject/Weapon";
import { Condition } from "./Condition";
import { Rotation } from "./Rotation";
import { compileRotationFeatures } from "./RotationCompiler";
import { Serializer } from "./Serializer";
import { normalizeRadianceStellarGlimmer } from "./Build/Settings";
import { deliveredFeature } from "./Team/DeliveredFeature";
import { featuresDeliveredBy, MEMBER_OBJECTS } from "./Team/Evaluation";
import { reachesSource } from "./Team/Receivers";
import { isTeamSetting } from "./Team/Settings";

export const objectsNames = MEMBER_OBJECTS;
// The parts a member is saved with. The rotation is the team's: a character
// build saves the member's part of it (see savedRotation).
const memberObjectsNames = ['char', 'weapon', 'artifacts', 'buffs', 'rotation', 'food'];
/**
 * First number of a serialized character build. 1 is the released layout,
 * with the enemy and the party; 2 was never released and is not read. A
 * team starts with Team.TEAM_FORMAT.
 */
export const BUILD_FORMAT = 3;

export class CalcSet {
    constructor() {
        /** @type {Team|null} team this build is a member of */
        this.team      = null;
        this.char      = new CalcObjectCharacter();
        this.weapon    = new CalcObjectWeapon();
        this.artifacts = new CalcObjectArtifacts();
        this.buffs     = new CalcObjectBuffs();
        this.food      = new CalcObjectFood();
        this.reaction  = new CalcObjectReaction();
        this.static    = new CalcObjectStatic();
        /**
         * @type {Rotation|null} the rotation a character build was saved
         *     with: its part of its team's rotation (Rotation.memberPart), or
         *     a rotation saved before rotations belonged to teams. A member of
         *     a team has none: the team owns the rotation and takes this one
         *     over when its own is empty (Team.adoptRotation).
         */
        this.savedRotation = null;
        /** @type {Object|null} format-1 context used only when making a new team */
        this.legacyTeam = null;
    }

    /**
     * @returns {number} the number this member is identified by as a source
     *     of effects: its character's ID. The entries of a team's legacy
     *     source have their own (Team/Legacy).
     */
    getSourceId() {
        return this.char.getId();
    }

    getChar() {
        return this.char;
    }

    setChar(data) {
        if (this.team) {
            this.team.checkCharacter(this, data.getId());
        }

        let commonSettings = this.getCommonSettings('char');
        this.char.set(data);

        let weapon = '';

        if (this.weapon.object) {
            weapon = this.weapon.object.weapon;
        }

        if (weapon != data.weapon) {
            this.setWeapon(DB.Weapons.get(data.weapon).getFirst());
        }

        this.setCharSettings(commonSettings);
    }

    setCharLevels(data) {
        this.char.setLevels(data);
    }

    setCharSkills(data) {
        this.char.setSkills(data);
    }

    setCharSettings(data) {
        this.checkOwnSettings(data);
        this.char.setSettings(data);
        this.setCommonSettings(data);
        this.normalizeRadianceStellarGlimmerSettings();
    }

    getWeapon() {
        return this.weapon;
    }

    setWeapon(data) {
        let commonSettings = this.getCommonSettings('weapon');
        this.weapon.set(data);
        this.setWeaponSettings(commonSettings);
    }

    setWeaponLevels(data) {
        this.weapon.setLevels(data);
    }

    setWeaponSettings(data) {
        this.checkOwnSettings(data);
        this.weapon.setSettings(data);
        this.setCommonSettings(data);
    }

    setArtifact(data) {
        this.artifacts.set(data);
    }

    replaceArtifacts(items) {
        this.artifacts.replace(items);
    }

    getArtifacts() {
        return this.artifacts.get();
    }

    getArtifactsHashList() {
        let result = [];
        let artifacts = this.getArtifacts();

        Object.keys(artifacts).forEach(function(slot) {
            let art = artifacts[slot];
            if (art) {
                result.push( art.getHash() );
            }
        });

        return result;
    }

    removeArtifact(data) {
        this.artifacts.remove(data);
    }

    clearArtifacts() {
        this.artifacts.clearArtifacts();
    }

    setArtifactsSettings(data) {
        this.checkOwnSettings(data);
        this.artifacts.setSettings(data);
        this.setCommonSettings(data);
    }

    modifyArtifactsSettings(data) {
        this.checkOwnSettings(data);
        this.artifacts.modifySettings(data);
    }

    isEquipped(data) {
        return this.artifacts.isEquipped(data);
    }

    getBuffs() {
        return this.buffs.get();
    }

    setBuffsSettings(data) {
        this.checkOwnSettings(data);
        this.buffs.setSettings(data);
        this.setCommonSettings(data);
        this.normalizeRadianceStellarGlimmerSettings();
    }

    modifyBuffsSettings(data) {
        this.checkOwnSettings(data);
        this.buffs.modifySettings(data);
        this.setCommonSettings(data);
        this.normalizeRadianceStellarGlimmerSettings();
    }

    setFood(type, data, level) {
        let result = this.food.set(type, data, level);
        return result;
    }

    getFood(type) {
        return this.food.get(type);
    }

    getFoodLevel(type) {
        return this.food.getLevel(type);
    }

    hasBetaContent() {
        for (let i of objectsNames) {
            if (!this[i]) {
                continue;
            }

            if (this[i].isBeta()) {
                return true;
            }
        }

        return false;
    }

    refreshCommonSettings() {
        let allSettings = this.getSettings();

        for (let i of objectsNames) {
            if (!this[i]) {
                continue;
            }

            let settings = this[i].getSettings();
            let conditions = this.getActiveConditions(allSettings, {objects: [i]});
            Condition.setCommonValues(settings, conditions);
            this[i].setSettings(settings);
        }

        this.normalizeRadianceStellarGlimmerSettings();
    }

    normalizeRadianceStellarGlimmerSettings() {
        // A team toggle never changes a member's own settings: Polestar Field
        // overrides them in evaluations only (Build/Settings.applyTeamOverrides).
        const normalized = normalizeRadianceStellarGlimmer(this.getSettings());

        for (const objectName of objectsNames) {
            const object = this[objectName];
            if (!object) continue;

            const settings = object.getSettings();
            let changed = false;

            for (const name of Object.keys(settings)) {
                if (Object.prototype.hasOwnProperty.call(normalized, name) &&
                    settings[name] !== normalized[name]) {
                    settings[name] = normalized[name];
                    changed = true;
                }
            }

            if (changed) {
                object.setSettings(settings);
            }
        }
    }

    getCommonSettings(object) {
        let settings = this.getSettings();
        let result = this[object].getSettings();

        for (let name of Object.keys(settings)) {
            if (/^common\./.test(name)) {
                result[name] = settings[name];
            }
        }

        return result;
    }

    setCommonSettings(data) {
        let common = [];

        for (const name of Object.keys(data)) {
            if (/^common\./.test(name)) {
                common.push(name);
            }
        }

        if (common.length == 0) {
            return;
        }

        for (let i of objectsNames) {
            if (!this[i]) {
                continue;
            }

            let settings = this[i].getSettings();

            for (const name of Object.keys(settings)) {
                if (common.includes(name)) {
                    settings[name] = data[name];
                }
            }

            this[i].setSettings(settings);
        }
    }

    getConditions(options) {
        let result = [];
        let objects = objectsNames;

        for (let i = 0; i < objects.length; ++i) {
            let name = objects[i];
            if (!this[name]) {
                continue;
            }

            if (options && options.objects && !options.objects.includes(name)) {
                continue;
            }

            result = result.concat(this[name].getConditions());
        }

        return result;
    }

    getActiveConditions(settings, options) {
        let result = [];
        let objects = objectsNames;

        for (let i = 0; i < objects.length; ++i) {
            let name = objects[i];
            if (!this[name]) {
                continue;
            }

            if (options && options.objects && !options.objects.includes(name)) {
                continue;
            }

            let conditions = this[name].getConditions();

            for (let j = 0; j < conditions.length; ++j) {
                const cond = conditions[j];

                if (cond.params.hideInactive && !cond.checkSubconditions(settings)) {
                    continue;
                }

                result.push(cond);
            }
        }

        return result;
    }

    getArtifactsConditions() {
        if (this.artifacts) {
            return this.artifacts.getConditions();
        }

        return [];
    }

    getSettings() {
        let result = {};

        let objects = objectsNames;

        for (let i = 0; i < objects.length; ++i) {
            let name = objects[i];
            if (!this[name]) {
                continue;
            }

            result = Object.assign(result, this[name].getSettings());
        }

        // Only the member's own: team state is read through the team scope
        // (Team/Scope.teamSettings), never copied into a member.
        return result;
    }

    /**
     * A member's settings are its own. Team toggles belong to its team and
     * the enemy's settings to the team's enemy: they are changed there
     * (Team.modifySettings, the enemy's modifySettings; Team.splitSettings
     * for settings that span owners, such as a weapon scenario).
     *
     * @param {Object} data
     */
    checkOwnSettings(data) {
        for (const name of Object.keys(data || {})) {
            if (isTeamSetting(name) || isEnemySetting(name)) {
                throw new Error(`"${name}" is the team's setting, not a member's`);
            }
        }
    }

    /**
     * Unprocessed stage 0 data of this build: final settings, stats before
     * post-effects, and the post-effects and multipliers it receives.
     */
    /* deprecated */
    getBaseStats() {
        return this.view().getStats();
    }

    /* deprecated */
    getBaseStatsWithSets() {
        return this.view().getBaseStatsWithSets();
    }

    /**
     * This member in a new view of its team as it is now. Only a team is
     * evaluated: a build on its own is evaluated as a team of one, which its
     * owner makes (Team.fromMember).
     *
     * @returns {MemberView}
     */
    view() {
        if (!this.team) {
            throw new Error('A build is evaluated in its team: make a team of one for a build on its own (Team.fromMember)');
        }
        return this.team.view().member(this);
    }

    getPostEffects() {
        let postEffects = [];
        let objects = objectsNames;

        for (let i = 0; i < objects.length; ++i) {
            let name = objects[i];
            if (!this[name]) continue;

            postEffects = postEffects.concat(this[name].getPostEffects());
        }

        return postEffects;
    }

    getMultipliers() {
        let result = [];
        for (let name of objectsNames) {
            if (!this[name]) continue;
            result = result.concat(this[name].getMultipliers());
        }

        result = result.concat(DB.CalcData.Multipliers);

        return result;
    }

    /* deprecated */
    getStats() {
        return this.getBaseStats();
    }

    /**
     * Data for compiled programs: this build's processed stats, teammates'
     * stats under their prefixes, and the post-effects of the whole team.
     */
    getBuildData() {
        return this.view().getBuildData();
    }

    calcFeatures() {
        return this.view().calcFeatures();
    }

    getFeaturesList(opts) {
        let result = [];
        opts = Object.assign({}, opts);

        for (let name of objectsNames) {
            if (!this[name]) {
                continue;
            }

            result = result.concat(this[name].getFeatures().filter(reachesSource));
        }

        result = result.concat(this.deliveredFeatures());
        if (!opts.ignoreRotation) {
            result = result.concat(this.rotationFeatures(opts.compiledRotation));
        }
        return result;
    }

    /**
     * The team's rotation as this member's features: the whole team's damage
     * (rotation.total) and this member's own hits (rotation_self.total), see
     * RotationCompiler.
     *
     * @param {Object|null} [compiled] the team's compiled rotation, when a
     *     view of the team has it (TeamView.compiledRotation)
     * @returns {Array.<FeatureRotation>}
     */
    rotationFeatures(compiled) {
        return this.team ? compileRotationFeatures(this, compiled) : [];
    }

    /**
     * Features teammates and the team's legacy source deliver to this
     * member: damage this member deals, such as Nicole's Arcane Projections
     * (see Team/DeliveredFeature).
     *
     * @returns {Array.<Feature2>}
     */
    deliveredFeatures() {
        let result = [];
        if (!this.team) {
            return result;
        }

        for (let source of this.team.getSources()) {
            if (source === this) continue;

            for (let feature of featuresDeliveredBy(source)) {
                result.push(deliveredFeature(feature, source.getSourceId()));
            }
        }
        return result;
    }

    getFeaturesHash(data, opts) {
        return this.view().getFeaturesHash(data, opts);
    }

    getFeatures(data) {
        return this.view().getFeatures(data);
    }

    getFeaturesNames() {
        return this.view().getFeaturesNames();
    }

    getFeatureResultByName(name) {
        return this.view().getFeatureResultByName(name);
    }

    getFeatureByName(name, buildData) {
        return this.view().getFeatureByName(name, buildData);
    }

    getAllFeaturesByName(name, opts) {
        if (!name) { return []; }

        let result = [];
        for (let feat of this.getFeaturesList(opts)) {
            if (name == feat.getName()) {
                result.push(feat);
            }
        }

        return result;
    }

    /**
     * Copy for evaluation. A member's numbers depend on its team, so a member
     * of a team is copied together with a copy of its team. A build on its
     * own is copied alone.
     *
     * @returns {CalcSet}
     */
    clone() {
        if (this.team) {
            return this.team.clone().getMember(this.team.slotOf(this));
        }

        return this.characterBuild();
    }

    /**
     * This member as a character build on its own, for saved builds,
     * presets, character links and a team's copies: no team, no team state
     * and no old party list or party settings.
     *
     * @param {Object} [opts] {artifactSettings: true} also copies the artifact
     *     settings exactly, member state the format keeps only when set included
     * @returns {CalcSet}
     */
    characterBuild(opts) {
        let body = this.serializeMember({rotation: !opts || opts.rotation !== false});
        let build = body ? CalcSet.deserialize([BUILD_FORMAT].concat(body)) : null;
        if (build && opts && opts.artifactSettings) {
            build.artifacts.copySettingsFrom(this.artifacts);
        }
        return build;
    }

    /**
     * Copy for evaluations that change settings, such as rotation steps. A
     * member of a team is copied together with a copy of its team, so the
     * copy still sees its teammates.
     */
    cloneWithArtifactSettings() {
        if (this.team) {
            return this.team.cloneWithArtifactSettings().getMember(this.team.slotOf(this));
        }

        return this.characterBuild({artifactSettings: true});
    }

    getHash() {
        return Serializer.pack(this);
    }

    /**
     * Format 3: character data only. Enemy and field state belong to teams.
     */
    serialize() {
        let body = this.serializeMember();
        return body ? [BUILD_FORMAT].concat(body) : null;
    }

    /**
     * A member of a team, without format ID and without the enemy, as the
     * team format embeds it.
     *
     * @param {Object} [opts] {rotation: false} saves an empty rotation (a
     *     team saves its rotation itself); {artifacts: CalcObjectArtifacts}
     *     saves these artifacts in place of the member's (Team.serialize)
     * @returns {Array.<number>|null}
     */
    serializeMember(opts) {
        return this.serializeObjects(memberObjectsNames, opts);
    }

    /**
     * @param {Object} [opts] {rotation: false} for an empty rotation
     * @returns {Rotation} the rotation a character build of this member saves
     */
    rotationToSave(opts) {
        if (opts && opts.rotation === false) {
            return new Rotation();
        }
        if (this.team) {
            return this.team.getRotation().memberPart(this.char.getId());
        }
        return this.savedRotation || new Rotation();
    }

    serializeObjects(names, opts) {
        let result = [];

        // Only what the user set is saved. Settings derived by conditions
        // (from composition, field state, talent bonuses) are derived again
        // when the build is evaluated; saving them would freeze them as input.
        let settings = this.getSettings();

        for (let i of names) {
            if (i == 'rotation') {
                result = result.concat(this.rotationToSave(opts).serialize());
                continue;
            }

            let object = (i == 'artifacts' && opts && opts.artifacts) || this[i];
            if (!object) {
                return null;
            }

            let part = object.serialize(Object.assign({}, settings));
            if (!part) {
                return null;
            }

            result = result.concat(part);
        }

        return result;
    }

    /**
     * @param {Array.<number>} input consumed from the front
     * @returns {CalcSet|null} a standalone member
     */
    static deserializeMember(input) {
        let result = new CalcSet();

        result.char = CalcObjectCharacter.deserialize(input);
        if (!result.char) return null;

        result.weapon = CalcObjectWeapon.deserialize(input);
        if (!result.weapon) return null;

        result.artifacts = CalcObjectArtifacts.deserialize(input, {profile: true});
        if (!result.artifacts) return null;

        result.buffs = CalcObjectBuffs.deserialize(input);
        if (!result.buffs) return null;

        result.savedRotation = readSavedRotation(input, result.char.getId());

        result.food = CalcObjectFood.deserialize(input);
        if (!result.food) return null;

        result.normalizeRadianceStellarGlimmerSettings();

        return result;
    }

    static deserialize(input) {
        let version = input.shift();
        let result = null;

        if (version == BUILD_FORMAT) return CalcSet.deserializeMember(input);

        if (version == 1) {
            result = new CalcSet();

            result.char = CalcObjectCharacter.deserialize(input);
            if (!result.char) return null;

            result.weapon = CalcObjectWeapon.deserialize(input);
            if (!result.weapon) return null;

            result.artifacts = CalcObjectArtifacts.deserialize(input);
            if (!result.artifacts) return null;

            const enemy = CalcObjectEnemy.deserialize(input);
            if (!enemy) return null;

            result.buffs = CalcObjectBuffs.deserialize(input, true);
            if (!result.buffs) return null;
            result.legacyTeam = Object.assign({enemy}, result.buffs.legacyTeam);
            delete result.buffs.legacyTeam;
            if (result.legacyTeam.defReduce !== undefined) {
                enemy.modifySettings({'enemy.def_reduce': result.legacyTeam.defReduce});
            }

            result.savedRotation = readSavedRotation(input, result.char.getId());

            result.food = CalcObjectFood.deserialize(input);
            if (!result.food) return null;

            result.normalizeRadianceStellarGlimmerSettings();
        }

        return result;
    }
}

/**
 * The rotation saved with a character build. It was its owner's own before
 * rotations belonged to teams: the items that name no member are its.
 *
 * @param {Array.<number>} input consumed from the front
 * @param {number} charId the build's character
 * @returns {Rotation|null} null when it has no items
 */
function readSavedRotation(input, charId) {
    // Builds saved before rotations existed end here.
    let rotation = input.length ? Rotation.deserialize(input) : null;
    if (!rotation || rotation.getItems().length == 0) {
        return null;
    }
    return rotation.assignOwner(charId);
}

/**
 * A new build of a character with its first weapon.
 *
 * @param {DbObjectChar} [char] the first character by default
 * @returns {CalcSet}
 */
export function defaultBuild(char) {
    char ||= DB.Chars.getFirst();
    let build = new CalcSet();
    build.setChar(char);
    build.setWeapon(DB.Weapons.get(char.weapon).getFirst());
    return build;
}
