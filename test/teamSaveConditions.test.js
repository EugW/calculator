import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, offField } from "./support/team";

global.DB = DB;

test.each([
    ['Venti', 'venti_witch_homework', 'venti_secret_rite_4s', 'dmg_all', 0.5],
    ['Fischl', 'fischl_witch_homework', 'fischl_overloaded_buff', 'atk_percent', 0.225],
    ['Sucrose', 'sucrose_witch_homework', 'sucrose_large_wind_spirit', 'dmg_normal', 0.0714285],
])('%s keeps a composition-dependent toggle across team saves and evaluation copies', (key, witch, toggle, stat, value) => {
    const source = makeBuild(key);
    const helper = makeBuild('Klee');
    const team = Team.fromMember(helper);
    team.setMember(1, source);
    helper.setCharSettings({klee_witch_homework: true});
    const baseline = finalStats(source).get(stat);
    source.setCharSettings({[witch]: true, [toggle]: true,
        venti_secret_rite_4s_receiver: source.char.getId()});
    const before = finalStats(source).get(stat);
    expect(before - baseline).toBeCloseTo(value, 10);
    for (const copy of [Team.deserialize(team.serialize()), team.clone(), team.cloneWithArtifactSettings()]) {
        expect(copy).not.toBeNull();
        const member = copy.getMember(1);
        expect(member.getSettings()[toggle]).toBe(true);
        expect(offField(member)).toBe(true);
        expect(finalStats(member).get(stat)).toBeCloseTo(before, 10);
    }
});
