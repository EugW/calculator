import { isExtraStat } from "../PostEffect/Channels";
import { Stats } from "../Stats";

/**
 * What each teammate changes on a member: the member's final stats with the
 * whole team minus its final stats with that teammate's slot emptied. This
 * includes everything the teammate brings, deliveries and team composition
 * (resonance, element counts) alike.
 *
 * The team's legacy source (Team/Legacy) is one more entry, for all its
 * entries together: the member's stats minus its stats with the legacy
 * source emptied.
 *
 * @param {CalcSet} member
 * @returns {Array.<{member: CalcSet|null, legacy: boolean, stats: Stats}>} one
 *     entry per teammate, in slot order, then the legacy source's
 */
export function teammateContributions(member) {
    let team = member.team;
    if (!team) {
        return [];
    }

    let withTeam = memberStats(member);
    let result = [];
    for (let other of team.getMembers()) {
        if (other === member) continue;

        let copy = member.clone();
        let copyOther = copy.team.getMembers().find((item) => item.char.getId() == other.char.getId());
        copy.team.removeMember(copy.team.slotOf(copyOther));

        result.push({member: other, legacy: false, stats: Stats.diff(memberStats(copy), withTeam)});
    }

    if (team.legacy.active(team.getMembers()).length) {
        let copy = member.clone();
        copy.team.legacy.getEntries().forEach((entry) => copy.team.legacy.remove(entry));
        result.push({member: null, legacy: true, stats: Stats.diff(memberStats(copy), withTeam)});
    }
    return result;
}

/**
 * Final stats of the member itself, without teammates' namespaced stats and
 * description-only stats.
 *
 * @param {CalcSet} member
 * @returns {Stats}
 */
function memberStats(member) {
    let data = member.getBuildData();
    data.applyPostEffects();

    let result = new Stats();
    for (let [stat, value] of Object.entries(data.stats)) {
        if (typeof value != 'number' || /^m\d+__/.test(stat) || /^text_/.test(stat) || isExtraStat(stat)) continue;
        result.add(stat, value);
    }
    return result;
}
