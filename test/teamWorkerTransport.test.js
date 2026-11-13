import { Team, deserializeWorkerMember, serializeWorkerMember } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { featureValues, makeBuild } from "./support/team";

global.DB = DB;

/** Workers receive a structured clone; JSON is a stricter stand-in. */
function throughWorker(member) {
    return deserializeWorkerMember(JSON.parse(JSON.stringify(serializeWorkerMember(member))));
}

function setup() {
    const fischl = makeBuild('Fischl');
    const nicole = makeBuild('Nicole');
    nicole.setCharLevels({level: 90, ascension: 6, constellation: 4});
    nicole.setCharSettings({
        nicole_grace_of_kenosis: 'guidance',
        nicole_whether_left_or_right_no_matter_which_way_you_turn: true,
    });
    const team = Team.fromMember(fischl);
    team.setMember(2, nicole);
    team.setOnFieldMember(nicole);
    return {team, fischl, nicole};
}

test("a worker evaluates a member with its teammates", () => {
    const {fischl, nicole} = setup();
    for (const member of [fischl, nicole]) {
        const copy = throughWorker(member);
        expect(copy).not.toBe(member);
        expect(copy.char.getId()).toBe(member.char.getId());
        expect(copy.team.getMembers().map((item) => item.char.getId()))
            .toEqual(member.team.getMembers().map((item) => item.char.getId()));
        expect(copy.team.slotOf(copy)).toBe(member.team.slotOf(member));
        expect(copy.team.getOnFieldMember().char.getId()).toBe(nicole.char.getId());
        expect(featureValues(copy)).toEqual(featureValues(member));
    }
    expect(Object.keys(featureValues(throughWorker(fischl)))).toContain('other.nicole_arcane_projection');
});

test("a worker gets a build on its own in a team of one", () => {
    const build = makeBuild('Fischl');
    expect(() => serializeWorkerMember(build)).toThrow(/team/);
    const solo = Team.solo(build);
    const copy = throughWorker(solo);
    expect(copy.team.getMembers()).toEqual([copy]);
    expect(featureValues(copy)).toEqual(featureValues(solo));
});

test.each([true, false])("the payload is not consumed by decoding (team: %s)", (inTeam) => {
    const member = inTeam ? setup().fischl : Team.solo(makeBuild('Fischl'));
    const payload = serializeWorkerMember(member);
    const first = deserializeWorkerMember(payload);
    const second = deserializeWorkerMember(payload);
    expect(featureValues(second)).toEqual(featureValues(first));
});
