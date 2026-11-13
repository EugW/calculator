import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";

global.DB = DB;

function teamOf(keys, constellations) {
    const members = keys.map((key, index) => {
        const build = makeBuild(key);
        build.setCharLevels({level: 90, ascension: 6, constellation: constellations[index] || 0});
        return build;
    });
    const team = Team.fromMember(members[0]);
    members.slice(1).forEach((member, index) => team.setMember(index + 1, member));
    return {team, members};
}

function gain(member, apply, stat) {
    const before = finalStats(member).get(stat);
    apply();
    return finalStats(member).get(stat) - before;
}

describe("Columbina's constellation elevations need no Moonsign level", () => {
    test("C1 and C2 elevate the team at Nascent Gleam", () => {
        const {members: [receiver, columbina]} = teamOf(['Alhaitham', 'Columbina'], [0, 2]);
        expect(finalStats(receiver).get('dmg_lunar_special')).toBeCloseTo(0.085, 10);
        expect(finalStats(columbina).get('dmg_lunar_special')).toBeCloseTo(0.085, 10);
    });
});

describe("Illuga's Lightkeeper's Oath is for the other members", () => {
    test("before C6: A1 values for the others, nothing for Illuga", () => {
        const {members: [receiver, illuga]} = teamOf(['Alhaitham', 'Illuga'], [0, 0]);
        const on = () => illuga.setCharSettings({illuga_lightkeepers_oath: true});
        illuga.setCharSettings({});
        expect(gain(receiver, on, 'crit_rate_geo')).toBeCloseTo(0.05, 10);
        illuga.setCharSettings({});
        expect(gain(illuga, on, 'crit_rate_geo')).toBeCloseTo(0, 10);
        illuga.setCharSettings({});
        expect(gain(illuga, on, 'mastery')).toBeCloseTo(0, 10);
    });

    test("at C6 the C6 toggle alone delivers the C6 values", () => {
        const {members: [receiver, illuga]} = teamOf(['Alhaitham', 'Illuga'], [0, 6]);
        const oath = DB.Chars.get('Illuga').getAllConditions().find((cond) => cond.params.name === 'illuga_lightkeepers_oath');
        expect(oath.isActive(illuga.getBuildData().settings)).toBe(false);

        const on = () => illuga.setCharSettings({illuga_lightkeepers_oath_c6: true});
        illuga.setCharSettings({});
        expect(gain(receiver, on, 'crit_rate_geo')).toBeCloseTo(0.1, 10);
        illuga.setCharSettings({});
        expect(gain(receiver, on, 'crit_dmg_geo')).toBeCloseTo(0.3, 10);
        illuga.setCharSettings({});
        expect(gain(illuga, on, 'crit_dmg_geo')).toBeCloseTo(0, 10);
    });

    test("C4 DEF goes to the on-field member, Illuga included", () => {
        const {team, members: [receiver, illuga]} = teamOf(['Alhaitham', 'Illuga'], [0, 4]);
        const on = () => illuga.setCharSettings({illuga_c4_def: true});
        team.setOnFieldMember(illuga);
        illuga.setCharSettings({});
        expect(gain(illuga, on, 'def')).toBeCloseTo(200, 10);
        illuga.setCharSettings({});
        expect(gain(receiver, on, 'def')).toBeCloseTo(0, 10);
    });
});

describe("Linnea's A4 EM goes to exactly one member", () => {
    function setup() {
        const {team, members} = teamOf(['Aino', 'Linnea', 'Nahida'], [0, 0, 0]);
        const [aino, linnea, nahida] = members;
        const on = () => linnea.setCharSettings({linnea_universal_naturalist_archive: true});
        const gains = () => members.map((member) => {
            linnea.setCharSettings({});
            return gain(member, on, 'mastery');
        });
        return {team, aino, linnea, nahida, gains};
    }

    test("a Moonsign active character gets it, Linnea does not", () => {
        const {gains} = setup();
        const [aino, linnea, nahida] = gains();
        expect(aino).toBeGreaterThan(0);
        expect(linnea).toBeCloseTo(0, 10);
        expect(nahida).toBeCloseTo(0, 10);
    });

    test("Linnea on-field or a non-Moonsign active character: Linnea gets it", () => {
        const {team, linnea: linneaBuild, nahida: nahidaBuild, gains} = setup();
        for (const onField of [linneaBuild, nahidaBuild]) {
            team.setOnFieldMember(onField);
            const [aino, linnea, nahida] = gains();
            expect(aino).toBeCloseTo(0, 10);
            expect(linnea).toBeGreaterThan(0);
            expect(nahida).toBeCloseTo(0, 10);
        }
    });
});
