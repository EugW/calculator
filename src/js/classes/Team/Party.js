import { ASSUMED, teamState } from "./Scope";

/**
 * The team as seen by the member whose settings these are: the member's own
 * facts and its teammates' facts ({charId, name, element, origin}).
 *
 * Facts always come from the evaluated team. A build on its own is a team
 * of one, without teammates; historical party keys cannot create members. The team's own
 * settings (the party component, see TeamEvaluation.resolveParty) belong to
 * no member: self is null and every member is one of the others.
 *
 * A floating weapon or set of the legacy source (Team/Legacy) has a wielder
 * who is not in the team: self is that wielder, with no facts but an element
 * the entry may state, and every member is one of the others. So it is for a
 * virtual character that fills no slot: self is the character, the others
 * are the party.
 *
 * @param {Object} settings a member's settings (source scope)
 * @returns {{self: Object|null, others: Array.<Object>}}
 */
export function partyView(settings) {
    let team = teamState(settings);
    if (team && !settings.char_id) {
        let wielder = settings[ASSUMED] ? {charId: 0, name: '', element: settings.char_element || '', origin: ''} : null;
        return {self: wielder, others: team.members.slice()};
    }
    if (team) {
        let self = team.members.find((member) => member.charId == settings.char_id);
        if (self) {
            return {
                self: self,
                others: team.members.filter((member) => member !== self),
            };
        }
    }

    let self = {
        charId: settings.char_id || 0,
        name: settings.char_name || '',
        element: settings.char_element || '',
        origin: settings.char_origin || '',
    };

    // A virtual character that fills no slot is not in the party, but its
    // own effects are evaluated against it.
    return {self, others: team && settings[ASSUMED] ? team.members.slice() : []};
}

/**
 * Elements of the member's teammates, in team order.
 *
 * @param {Object} settings
 * @returns {Array.<string>}
 */
export function teammateElements(settings) {
    return partyView(settings).others.map((member) => member.element).filter((element) => !!element);
}

/**
 * Elements of the whole team: the member's own element first.
 *
 * @param {Object} settings
 * @returns {Array.<string>}
 */
export function teamElements(settings) {
    let view = partyView(settings);
    return [view.self, ...view.others].filter((member) => !!member).map((member) => member.element).filter((element) => !!element);
}

/**
 * @param {Object} settings
 * @returns {number} members in the team, the member included
 */
export function teamSize(settings) {
    let view = partyView(settings);
    return (view.self ? 1 : 0) + view.others.length;
}
