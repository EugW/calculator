import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";

global.DB = DB;

describe("Iansan's burst raises the on-field member's ATK from her ATK", () => {
    const points = {iansan_points: 30};

    function gain(member, iansan) {
        iansan.setCharSettings({});
        const before = finalStats(member).get('atk');
        iansan.setCharSettings(points);
        return finalStats(member).get('atk') - before;
    }

    test("an Iansan on her own is on-field and receives it", () => {
        const iansan = makeBuild('Iansan');
        Team.fromMember(iansan);
        expect(gain(iansan, iansan)).toBeGreaterThan(0);
    });

    test("in a team only the on-field member receives it", () => {
        const iansan = makeBuild('Iansan');
        const hutao = makeBuild('Hutao');
        const team = Team.fromMember(hutao);
        team.setMember(1, iansan);

        team.setOnFieldMember(hutao);
        const onField = gain(hutao, iansan);
        expect(onField).toBeGreaterThan(0);
        expect(gain(iansan, iansan)).toBeCloseTo(0, 10);

        team.setOnFieldMember(iansan);
        expect(gain(hutao, iansan)).toBeCloseTo(0, 10);
        expect(gain(iansan, iansan)).toBeGreaterThan(0);

        // The bonus scales on Iansan's ATK, not the receiver's.
        team.setOnFieldMember(hutao);
        hutao.modifyBuffsSettings({'custom_buffs.atk': 500});
        expect(gain(hutao, iansan)).toBeCloseTo(onField, 6);
    });
});
