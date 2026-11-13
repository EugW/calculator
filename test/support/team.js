import { CalcObjectArtifacts } from "../../src/js/classes/CalcObject/Artifacts";
import { CalcObjectBuffs } from "../../src/js/classes/CalcObject/Buffs";
import { CalcObjectCharacter } from "../../src/js/classes/CalcObject/Character";
import { CalcObjectFood } from "../../src/js/classes/CalcObject/Food";
import { CalcObjectStatic } from "../../src/js/classes/CalcObject/Static";
import { CalcObjectWeapon } from "../../src/js/classes/CalcObject/Weapon";
import { CalcSet } from "../../src/js/classes/CalcSet";
import { Rotation } from "../../src/js/classes/Rotation";
import { Team } from "../../src/js/classes/Team";
import { enemyScope, teamSettings } from "../../src/js/classes/Team/Scope";
import { enemyStatName } from "../../src/js/classes/Team/EnemyStats";
import { isPercent, Stats } from "../../src/js/classes/Stats";
import { REAL_TOTAL } from "../../src/js/db/Constants";
import { ConditionOnField, ConditionShielded } from "../../src/js/classes/Condition/Field";

/**
 * Test-only source of effects: stands in for a weapon, set or character file
 * that declares effects with receivers. It replaces a member's `static`
 * object, which is evaluated like every other object of the member.
 */
export class TestSource extends CalcObjectStatic {
    constructor(conditions, postEffects, settings, multipliers) {
        super();
        this.conditions = conditions || [];
        this.postEffects = postEffects || [];
        this.multipliers = multipliers || [];
        this.settings = Object.assign({}, settings);
    }

    getConditions() {
        return this.conditions;
    }

    getPostEffects() {
        return this.postEffects;
    }

    getMultipliers() {
        return this.multipliers;
    }

    getSettings() {
        return Object.assign({}, this.settings);
    }
}

export function makeBuild(charKey) {
    const build = new CalcSet();
    const char = DB.Chars.get(charKey);

    build.setChar(char);
    build.setCharLevels({level: 90, ascension: 6, constellation: 0});
    build.setCharSkills({attack: 10, elemental: 10, burst: 10});
    build.setWeapon(DB.Weapons.get(char.weapon).getFirst(true));
    build.setWeaponLevels({level: 90, ascension: 6, refine: 1});

    return build;
}

/**
 * A build on its own, as the calculator evaluates it: in a team of one.
 *
 * @param {string} charKey
 * @returns {CalcSet}
 */
export function makeSolo(charKey) {
    const build = makeBuild(charKey);
    Team.fromMember(build);
    return build;
}

export function withSource(build, conditions, postEffects, settings, multipliers) {
    build.static = new TestSource(conditions, postEffects, settings, multipliers);
    return build;
}

/**
 * @param {CalcSet} member
 * @returns {Object} the enemy the member is evaluated against, as resolved
 */
export function enemyOf(member) {
    return enemyScope(member.getBuildData().settings);
}

/**
 * @param {CalcSet} member
 * @returns {Object} the team settings the member sees, as resolved (Scope.teamSettings)
 */
export function teamOf(member) {
    return teamSettings(member.getBuildData().settings);
}

/**
 * @param {CalcSet} member
 * @returns {boolean} whether the member is off field in its team (Condition/Field)
 */
export function offField(member) {
    return new ConditionOnField({invert: true}).isActive(member.getBuildData().settings);
}

/**
 * @param {CalcSet} member
 * @returns {boolean} whether the member is protected by the team's on-field shield
 */
export function shielded(member) {
    return new ConditionShielded().isActive(member.getBuildData().settings);
}

/**
 * How much the effects on the enemy change one of its stats, as a member's
 * program sees it: the enemy's total minus its base (its object's stats).
 *
 * @param {CalcSet} member
 * @param {string} stat enemy_res_pyro or enemy_def_reduce
 * @param {Stats} [stats] the member's final stats
 * @returns {number} processed (-0.2 for -20%)
 */
export function enemyChange(member, stat, stats = finalStats(member)) {
    const base = new Stats(member.team.enemy.getStats().stats);
    base.processPercent();
    return stats.get(enemyStatName(stat)) - (base[stat] || 0);
}

export function finalStats(build) {
    const data = build.getBuildData();
    data.applyPostEffects();
    return data.stats;
}

/**
 * Give members of a team the final values a test states for their stats (a
 * published example, a wielder's Max HP): a custom bonus of the member makes
 * up the difference to what it has now. Percent stats in percent points.
 * Repeated until every value holds: one member's stat can move another's.
 *
 * @param {Array.<Array>} pins [member, stat, value] each; stat is atk, hp,
 *     def, mastery, recharge, crit_rate or crit_dmg
 */
export function pinStats(pins) {
    const total = (member, stat) => {
        const stats = finalStats(member);
        const value = REAL_TOTAL.includes(stat) ? stats.getTotalPercent(stat) : stats.get(stat + '_base') + stats.get(stat);
        return isPercent(stat) ? value * 100 : value;
    };

    for (let pass = 0; pass < 5; ++pass) {
        let moved = false;
        for (const [member, stat, value] of pins) {
            const difference = value - total(member, stat);
            if (Math.abs(difference) < 1e-9) continue;

            const name = 'custom_buffs.' + stat;
            member.modifyBuffsSettings({[name]: (Number(member.buffs.getSettings()[name]) || 0) + difference});
            moved = true;
        }
        if (!moved) return;
    }
    throw new Error('The stated stats do not settle');
}

export function totalMastery(stats, prefix = '') {
    return stats.get(prefix + 'mastery_base') + stats.get(prefix + 'mastery');
}

export function featureValues(build) {
    const result = {};
    const features = build.getFeatures(build.getBuildData());
    for (const [name, feature] of Object.entries(features)) {
        result[name] = [feature.normal, feature.crit, feature.average];
    }
    return result;
}

/**
 * @param {Team} team
 * @returns {Array.<string>} stack keys with more than one eligible source (Team/Stacking)
 */
export function stackKeys(team) {
    return team.stackGroups().map((group) => group.key);
}

/**
 * @param {Team} team
 * @param {string} key
 * @param {CalcSet|null} [receiver]
 * @returns {CalcSet|null|undefined} the member supplying the key, null for nobody, undefined without a choice to make
 */
export function stackSource(team, key, receiver = null) {
    const receiverId = receiver ? receiver.char.getId() : 0;
    const group = team.stackGroups().find((item) => item.key == key && item.receiverId == receiverId);
    return group ? group.source : undefined;
}

/**
 * A character build of fixtures/artifactProfileLegacy.json. They are in
 * character format 2, which was never released and the calculator does not
 * read: format 3 without the set-bonus profile, the artifacts in the
 * released layout (the worn sets' controls).
 *
 * @param {Array.<number>} input consumed from the front
 * @returns {CalcSet}
 */
export function decodeFormat2Build(input) {
    if (input.shift() !== 2) {
        throw new Error('Not a format 2 build');
    }

    const build = new CalcSet();
    build.char = CalcObjectCharacter.deserialize(input);
    build.weapon = CalcObjectWeapon.deserialize(input);
    build.artifacts = CalcObjectArtifacts.deserialize(input);
    build.buffs = CalcObjectBuffs.deserialize(input);
    const rotation = Rotation.deserialize(input);
    build.savedRotation = rotation.getItems().length ? rotation.assignOwner(build.char.getId()) : null;
    build.food = CalcObjectFood.deserialize(input);
    build.normalizeRadianceStellarGlimmerSettings();
    return build;
}
