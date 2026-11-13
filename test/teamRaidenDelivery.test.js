import { Serializer } from "../src/js/classes/Serializer";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { characterConversionTests } from "./support/teamCharacterConversion";
import { finalStats, makeBuild } from "./support/team";

global.DB = DB;

characterConversionTests([{
    char: 'RaidenShogun',
    constellation: 5,
    on: {baal_eye_of_stormy_judgment: true, raiden_shogun_pledge_of_propriety: true},
    ignoreStats: ['baal_char_skill_elemental'],
}]);

test("Raiden's Eye uses her skill level and each member's own burst cost", () => {
    const raiden = makeBuild('RaidenShogun');
    const keqing = makeBuild('Keqing');
    const kazuha = makeBuild('Kazuha');
    const team = Team.fromMember(keqing);
    team.setMember(1, raiden);
    team.setMember(2, kazuha);
    raiden.setCharSettings({baal_eye_of_stormy_judgment: true});
    for (const [member, expected] of [[raiden, 0.27], [keqing, 0.12], [kazuha, 0.18]]) {
        expect(finalStats(member).get('dmg_burst')).toBeCloseTo(expected, 10);
    }
    raiden.setCharSkills({elemental: 1});
    expect(finalStats(keqing).get('dmg_burst')).toBeCloseTo(0.088, 10);
    raiden.setCharSettings({baal_eye_of_stormy_judgment: false});
    expect(finalStats(keqing).get('dmg_burst')).toBe(0);
});

test("Pledge of Propriety is C4-gated, excludes Raiden and survives an off-field save", () => {
    const receiver = makeBuild('Keqing');
    const raiden = makeBuild('RaidenShogun');
    const team = Team.fromMember(receiver);
    team.setMember(1, raiden);
    const baseReceiver = finalStats(receiver).get('atk_percent');
    const baseSource = finalStats(raiden).get('atk_percent');
    raiden.setCharSettings({raiden_shogun_pledge_of_propriety: true});
    expect(finalStats(receiver).get('atk_percent')).toBeCloseTo(baseReceiver, 10);
    raiden.setCharLevels({constellation: 4});
    expect(finalStats(receiver).get('atk_percent') - baseReceiver).toBeCloseTo(0.3, 10);
    expect(finalStats(raiden).get('atk_percent')).toBeCloseTo(baseSource, 10);
    const copy = Team.deserialize(Serializer.unpack(Serializer.pack(team)));
    expect(finalStats(copy.getMember(0)).get('atk_percent') - baseReceiver).toBeCloseTo(0.3, 10);
    copy.setOnFieldMember(copy.getMember(1));
    expect(finalStats(copy.getMember(0)).get('atk_percent') - baseReceiver).toBeCloseTo(0.3, 10);
});
