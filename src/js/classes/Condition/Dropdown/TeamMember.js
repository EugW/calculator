import { ConditionDropdown } from "../Dropdown";
import { Stats } from "../../Stats";
import { teamState } from "../../Team/Scope";

/**
 * A member selection: a source-owned one, or a team setting. Character IDs
 * remain stable across slot moves.
 *
 * `othersOnly` leaves out the owner; `excludeOrigins` leaves out characters
 * of those origins. The choice is a member that receives or is on field, so
 * the virtual characters of the party (Team/State) are left out unless
 * `allowVirtual` says the choice is a source of an effect.
 */
export class ConditionDropdownTeamMember extends ConditionDropdown {
    // Character names need the full width of the condition, on a line of their own.
    constructor(params) {
        super(Object.assign({separateControlLine: true, dropdownClass: 'medium-text'}, params));
    }

    getDropdownItems(settings) {
        const team = teamState(settings);
        const excluded = this.params.excludeOrigins || [];
        return (team ? team.members : [])
            .filter((member) => !member.virtual || this.params.allowVirtual)
            .filter((member) => !this.params.othersOnly || member.charId != settings.char_id)
            .filter((member) => !excluded.includes(member.origin))
            .map((member) => ({
                value: String(member.charId),
                title_str: 'char_name.' + member.name,
            }));
    }

    getSelectedId(settings) {
        const id = Number(this.getSelectedValue(settings));
        return Number.isInteger(id) && id > 0 ? id : 0;
    }

    getSelectedItems(settings) {
        const id = this.getSelectedId(settings);
        return this.getDropdownItems(settings).filter((item) => Number(item.value) === id);
    }

    getValueById(id) {
        return Number.isInteger(id) && id > 0 ? String(id) : '';
    }

    // The control stores a choice; a separate condition filters deliveries.
    // In particular, saving it never depends on whether its owner receives a buff.
    getData() {
        return {settings: {}, stats: new Stats()};
    }

    getStats() {
        return new Stats();
    }
}
