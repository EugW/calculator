import { Artifact } from "../src/js/classes/Artifact";
import { serializeWorkerMember, Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeBuild } from "./support/team";

global.DB = DB;

// The worker module registers self.onmessage when it loads.
global.self = {postMessage: jest.fn()};
require("../src/js/workers/ArtifactSetSuggest");

test("set suggestions cover every set, the ones assuming an enemy state included", () => {
    const ganyu = makeBuild('Ganyu');
    const team = Team.fromMember(ganyu);
    team.setMember(1, makeBuild('Xingqiu'));
    for (const slot of DB.Artifacts.Slots.getKeys()) {
        ganyu.setArtifact(new Artifact(5, 20, slot, 'GladiatorFinale', DB.Artifacts.Slots.get(slot).mainStats[0], []));
    }

    self.postMessage.mockClear();
    self.onmessage({data: {calcset: serializeWorkerMember(ganyu), feature: 'attack.charged_aimed', showBeta: true}});

    const results = self.postMessage.mock.calls[0][0].result;
    const blizzard = results.find((item) => item.sets.length == 1 && item.sets[0].id == 'BlizzardStrayer' && item.sets[0].pieces == 4);
    expect(blizzard).toBeTruthy();
    // Its scenario was set on the candidate's copy of the team, not the team.
    expect(blizzard.settings['common.enemy_status']).toBe('cryo');
    expect(team.enemy.getSettings()['common.enemy_status']).toBeFalsy();
}, 120000);
