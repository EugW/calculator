import { BuildData } from "../src/js/classes/Build/Data";
import { loadLegacyTeam } from "../src/js/classes/Legacy/Team";
import { Team } from "../src/js/classes/Team";
import { Kinich } from "../src/js/db/Char/Kinich";
import { DB } from "../src/js/db/DB";
import { enemyChange, finalStats, makeBuild } from "./support/team";

global.DB = DB;
global.UI ||= {Lang: {get: () => ''}};

function applyConditions(data, conditions) {
    for (const condition of conditions) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
}

function getSelfConditions(constellation, settings) {
    const data = new BuildData({char_constellation: constellation, ...settings}, {});
    applyConditions(data, Kinich.getAllConditions());
    return data;
}

function teamWithKinich(constellation, settings) {
    const receiver = makeBuild('Hutao');
    const kinich = makeBuild('Kinich');
    kinich.setCharLevels({level: 90, ascension: 6, constellation});
    kinich.setCharSettings(settings);
    const team = Team.fromMember(receiver);
    team.setMember(1, kinich);
    return {team, receiver, kinich};
}

const both = {kinich_tiger_beetles_palm_1: true, kinich_tiger_beetles_palm_2: true};

test("Kinich C2 shreds Dendro RES and buffs the first Scalespiker Cannon on self", () => {
    const data = getSelfConditions(2, both);

    expect(data.stats.get('enemy_res_dendro')).toBeCloseTo(-30, 5);
    expect(data.stats.get('dmg_skill_kinich')).toBeCloseTo(100, 5);
});

test("Kinich C2 Dendro RES shred reaches the party when enabled", () => {
    // The RES is the opponent's: one value for every member of the team.
    const enabled = teamWithKinich(2, {kinich_tiger_beetles_palm_1: true});
    expect(enemyChange(enabled.receiver, 'enemy_res_dendro')).toBeCloseTo(-0.3, 10);
    expect(enemyChange(enabled.kinich, 'enemy_res_dendro')).toBeCloseTo(-0.3, 10);

    const disabled = teamWithKinich(2, {kinich_tiger_beetles_palm_1: false});
    expect(enemyChange(disabled.receiver, 'enemy_res_dendro')).toBeCloseTo(0, 10);

    // The control is his second constellation's.
    const c1 = teamWithKinich(1, {kinich_tiger_beetles_palm_1: true});
    expect(enemyChange(c1.receiver, 'enemy_res_dendro')).toBeCloseTo(0, 10);
});

test("Kinich C2 Scalespiker Cannon bonus stays self-only", () => {
    const {receiver, kinich} = teamWithKinich(2, both);
    expect(finalStats(kinich).get('dmg_skill_kinich')).toBeCloseTo(1, 10);
    expect(finalStats(receiver).get('dmg_skill_kinich')).toBe(0);
});

test("the released party row loads as Kinich at C2 with the shred on", () => {
    expect(Kinich.partyData).toBeUndefined();
    expect(Kinich.getLegacyPartyConditions().map((condition) => [condition.getId(), condition.isRetired()])).toEqual([[1, true]]);

    const receiver = makeBuild('Hutao');
    const team = Team.fromMember(receiver);
    const report = loadLegacyTeam(team, {
        party: [{charId: Kinich.getId(), settings: {'party.kinich_tiger_beetles_palm_1': true}}],
        buffs: {},
        settings: {},
        dropped: [],
    });
    const entry = team.legacy.getBySourceId(Kinich.getId());
    expect(report.dropped).toEqual([]);
    expect(entry.getConstellation()).toBe(2);
    expect(entry.char.getSettings().kinich_tiger_beetles_palm_1).toBe(true);
    // The Scalespiker Cannon bonus was never part of the row.
    expect(entry.char.getSettings().kinich_tiger_beetles_palm_2).toBeFalsy();
    expect(enemyChange(receiver, 'enemy_res_dendro')).toBeCloseTo(-0.3, 10);
});
