import { HEXEREI_CAPABLE_CHARS } from "../Condition/Hexerei";

/**
 * Team state as seen by conditions in the team scope: the composition,
 * derived from the members and never stored, the team toggles and the
 * resolved enemy (read through Team/Scope.enemyScope).
 *
 * Composition is derived from character facts (id, element, origin, weapon
 * type) and from members' own user settings (such as Witch's Homework),
 * never from settings derived by conditions, so reading it never creates a
 * cycle in settings resolution.
 *
 * The party is the members and, in the team's free slots, the virtual
 * characters that fill them (Team/Legacy.compositionFillers; their facts are
 * marked `virtual`). They count for composition only: a virtual character
 * is never on field and never receives.
 */
export class TeamState {
    /**
     * @param {Array.<Object>} members facts of the party: {slot, charId, name, element, origin, weaponType, settings, virtual}
     * @param {Object} settings team toggles
     * @param {BuildSettings} [enemy] the resolved enemy
     */
    constructor(members, settings, enemy) {
        this.members = members;
        this.settings = Object.assign({}, settings);
        let real = this.getReceivers();
        if (!real.some((member) => member.charId === this.settings.on_field_char)) {
            this.settings.on_field_char = real.length ? real[0].charId : 0;
        }
        this.enemy = enemy || null;
        /** The party's resolved settings, see TeamEvaluation.resolveParty and Scope.teamSettings */
        this.party = null;
    }

    /**
     * @returns {number}
     */
    getSize() {
        return this.members.length;
    }

    /**
     * @returns {Array.<Object>} facts of the team's own members: the ones
     *     that receive effects and can be on field
     */
    getReceivers() {
        return this.members.filter((member) => !member.virtual);
    }

    /**
     * @param {number} slot
     * @returns {Object|undefined}
     */
    getMember(slot) {
        return this.members.find((m) => m.slot == slot);
    }

    isOnField(charId) {
        return this.settings.on_field_char === charId;
    }

    /**
     * @param {string} element
     * @returns {number}
     */
    countElement(element) {
        return this.members.filter((m) => m.element == element).length;
    }

    /**
     * @param {string} origin
     * @returns {number}
     */
    countOrigin(origin) {
        return this.members.filter((m) => m.origin == origin).length;
    }

    /**
     * A member is Hexerei when its character has Witch's Homework and the
     * member's own Witch's Homework toggle is on.
     *
     * @param {Object} member facts of a member
     * @returns {boolean}
     */
    static isHexerei(member) {
        return HEXEREI_CAPABLE_CHARS.includes(member.name) && !!member.settings[member.name + '_witch_homework'];
    }

    /**
     * @returns {number}
     */
    countHexerei() {
        return this.members.filter((m) => TeamState.isHexerei(m)).length;
    }

    /**
     * @param {CalcSet} member
     * @param {number} slot
     * @returns {Object}
     */
    static memberFacts(member, slot) {
        let char = member.char.get();

        return {
            slot: slot,
            charId: char ? char.getId() : 0,
            name: char ? char.name : '',
            element: char ? char.getElement() : '',
            origin: char ? char.getOrigin() : '',
            weaponType: char ? char.getWeapon() : '',
            settings: member.getSettings(),
        };
    }
}
