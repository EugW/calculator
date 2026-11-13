import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeBuild, offField } from "./support/team";

global.DB = DB;

test.each([
    ['Kachina', 4, 'kachina_more_foes_more_caution', '4', 'def_percent', 0.2],
    ['Yaoyao', 1, 'yaoyao_adeptus_tutelage', true, 'dmg_dendro', 0.15],
    ['Ororon', 6, 'ororon_ode_to_deep_springs', 3, 'atk_percent', 0.3],
    ['Barbara', 2, 'barbara_vitality_burst', true, 'dmg_hydro', 0.15],
    ['Ganyu', 0, 'ganyu_harmony', true, 'dmg_cryo', 0.2],
    ['Yelan', 0, 'yelan_adapt_with_ease', 15, 'dmg_all', 0.5],
])("%s delivers its active-character buff while off-field and keeps the trigger when saved", (char, constellation, toggle, value, stat, bonus) => {
    const source = makeBuild(char);
    source.setCharLevels({level: 90, ascension: 6, constellation});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(source);
    team.setMember(1, receiver);
    team.setOnFieldMember(receiver);
    const baseline = receiver.getBuildData().stats.get(stat);
    const sourceBaseline = source.getBuildData().stats.get(stat);
    source.setCharSettings({[toggle]: value});

    expect(receiver.getBuildData().stats.get(stat) - baseline).toBeCloseTo(bonus, 10);
    expect(source.getBuildData().stats.get(stat)).toBeCloseTo(sourceBaseline, 10);
    const decoded = Team.deserialize(team.serialize());
    expect(decoded).not.toBeNull();
    expect(String(decoded.getMember(0).getSettings()[toggle])).toBe(String(value));
    expect(decoded.getMember(1).getBuildData().stats.get(stat) - baseline).toBeCloseTo(bonus, 10);

    team.setOnFieldMember(source);
    expect(receiver.getBuildData().stats.get(stat)).toBeCloseTo(baseline, 10);
    expect(source.getBuildData().stats.get(stat) - sourceBaseline).toBeCloseTo(bonus, 10);
});

test("one team selection determines field state independently of the viewed member", () => {
    const first = makeBuild('Ayaka');
    const second = makeBuild('Kazuha');
    const team = Team.fromMember(first);
    team.setMember(2, second);
    expect(team.getOnFieldMember()).toBe(first);
    team.setOnFieldMember(second);
    // Obsolete per-member values cannot override the team's selection.
    first.modifyBuffsSettings({'common.off_field': false});
    second.modifyBuffsSettings({'common.off_field': true});
    expect(offField(first)).toBe(true);
    expect(offField(second)).toBe(false);
    expect(team.getOnFieldMember()).toBe(second);
    expect(() => team.setOnFieldMember(makeBuild('Dori'))).toThrow();
    for (const copy of [team.clone(), team.cloneWithArtifactSettings(), Team.deserialize(team.serialize())]) {
        expect(copy.getOnFieldMember()).toBe(copy.getMember(2));
    }
    team.swapMembers(0, 2);
    expect(team.getOnFieldMember()).toBe(second);
    team.removeMember(0);
    expect(team.getOnFieldMember()).toBe(first);
    team.removeMember(2);
    expect(team.getOnFieldMember()).toBeNull();
});
