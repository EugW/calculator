import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";

global.DB = DB;

function teamOf(keys) {
    const members = keys.map((key) => makeBuild(key));
    const team = Team.fromMember(members[0]);
    members.slice(1).forEach((member, index) => team.setMember(index + 1, member));
    return {team, members};
}

function gain(member, source, settings, stat) {
    source.setCharSettings({});
    const before = finalStats(member).get(stat);
    source.setCharSettings(settings);
    return finalStats(member).get(stat) - before;
}

describe("Kaveh's Painted Dome ends when he leaves the field", () => {
    test("the Dendro Core bonus reaches teammates only while Kaveh is on-field", () => {
        const {team, members: [nahida, kaveh]} = teamOf(['Nahida', 'Kaveh']);
        const on = {kaveh_painted_dome: true};
        expect(gain(nahida, kaveh, on, 'dmg_reaction_rupture')).toBeCloseTo(0, 10);

        team.setOnFieldMember(kaveh);
        expect(gain(nahida, kaveh, on, 'dmg_reaction_rupture')).toBeGreaterThan(0);
        expect(gain(kaveh, kaveh, on, 'dmg_reaction_rupture')).toBeGreaterThan(0);
    });
});

describe("Baizhu's Year of Verdant Favor goes to the healed active character", () => {
    test("only the on-field member, Baizhu included", () => {
        const {team, members: [nahida, baizhu]} = teamOf(['Nahida', 'Baizhu']);
        const on = {baizhu_all_things_are_of_the_earth: true};
        expect(gain(nahida, baizhu, on, 'dmg_reaction_bloom')).toBeGreaterThan(0);
        expect(gain(baizhu, baizhu, on, 'dmg_reaction_bloom')).toBeCloseTo(0, 10);

        team.setOnFieldMember(baizhu);
        expect(gain(nahida, baizhu, on, 'dmg_reaction_bloom')).toBeCloseTo(0, 10);
        expect(gain(baizhu, baizhu, on, 'dmg_reaction_bloom')).toBeGreaterThan(0);
    });
});
