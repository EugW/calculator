import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactGenerator, getMainStatCombinations } from "../src/js/classes/Generator/Artifacts";
import { Rotation } from "../src/js/classes/Rotation";
import { Serializer } from "../src/js/classes/Serializer";
import { Team, serializeWorkerMember } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeBuild } from "./support/team";

global.DB = DB;

/**
 * Every search that scores a candidate reads the member's set-bonus profile
 * and none of them writes it.
 */

const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const MAINS = {flower: 'hp', plume: 'atk', sands: 'atk_percent', goblet: 'dmg_pyro', circlet: 'crit_rate'};
const NOBLESSE_4 = 'set.noblesse_oblige_4';

function piece(slot, setId) {
    return new Artifact(5, 20, slot, setId, MAINS[slot], [{stat: 'crit_dmg', value: 14}]);
}

// Bennett with 3 Noblesse and 2 Gladiator pieces: a Noblesse goblet makes 4.
function bennett(profile) {
    const build = makeBuild('Bennet');
    Team.fromMember(build);
    build.replaceArtifacts(SLOTS.map((slot, index) => piece(slot, index < 3 ? 'NoblesseOblige' : 'GladiatorFinale')));
    if (profile) build.setArtifactsSettings(profile);
    return build;
}

const handlers = {};
function runWorker(name, data) {
    global.self = {postMessage: jest.fn()};
    if (!handlers[name]) {
        require('../src/js/workers/' + name);
        handlers[name] = self.onmessage;
    }
    handlers[name]({data});
    return self.postMessage.mock.calls.at(-1)[0].result;
}

afterEach(() => {
    delete global.self;
});

describe("the Artifacts tab's sort", () => {
    const goblets = {noblesse: piece('goblet', 'NoblesseOblige'), gladiator: piece('goblet', 'GladiatorFinale')};
    const sort = (build) => runWorker('ArtifactsSort', {
        artifacts: [Serializer.pack(goblets.noblesse), Serializer.pack(goblets.gladiator)],
        calcSet: serializeWorkerMember(build), feature: 'burst.burst_dmg', featureType: 'average',
        sortByFeature: true, sortByStat: '',
        // A tie keeps Gladiator first.
        setsOrders: {GladiatorFinale: 1, NoblesseOblige: 2},
    });

    test("a fourth Noblesse piece counts only while its effect is on in the profile", () => {
        expect(sort(bennett())[0]).toBe(Serializer.pack(goblets.noblesse));
        const off = bennett({[NOBLESSE_4]: false});
        expect(sort(off)[0]).toBe(Serializer.pack(goblets.gladiator));
        expect(off.artifacts.getProfileSettings()).toEqual({[NOBLESSE_4]: false});
    });
});

describe("set suggestions", () => {
    const suggest = (build) => runWorker('ArtifactSetSuggest', {
        calcset: serializeWorkerMember(build), feature: 'burst.burst_dmg', showBeta: true,
    });
    const has = (rows, setId, pieces) => rows.some((row) => row.sets.length == 1
        && row.sets[0].id == setId && row.sets[0].pieces == pieces);

    test("try each set with the member's own set effects", () => {
        expect(has(suggest(bennett()), 'NoblesseOblige', 4)).toBe(true);
        // Off in the profile, four pieces add nothing over two.
        expect(has(suggest(bennett({[NOBLESSE_4]: false})), 'NoblesseOblige', 4)).toBe(false);
    });

    test("a row's scenario is the team's and the enemy's only", () => {
        const rows = suggest(bennett());
        const blizzard = rows.find((row) => row.sets.some((item) => item.id == 'BlizzardStrayer' && item.pieces == 4));
        expect(blizzard.settings).toEqual({'common.enemy_status': 'cryo', enemy_frozen: 1});
        for (const row of rows) {
            expect(Object.keys(row.settings).filter((name) => name.startsWith('set.'))).toEqual([]);
        }
    });
});

test("the generator leaves the member's profile as it is", () => {
    const build = bennett({[NOBLESSE_4]: false});
    const params = {
        build, feature: 'burst.burst_dmg',
        settings: {sets: ['NoblesseOblige', 'NoblesseOblige'], count: 20, critRolls: 10, mode: 'avg', minRecharge: 0, kqms: false},
    };
    params.combinations = getMainStatCombinations(params);
    new ArtifactGenerator(params);
    expect(build.artifacts.getProfileSettings()).toEqual({[NOBLESSE_4]: false});
});

test("a rotation saved with the retired 'turn off set effects' action loads without it", () => {
    const member = makeBuild('Bennet');
    const id = member.char.getId();
    const hit = {type: 'feature', charId: id, feature: 'burst.burst_dmg', count: 1, reaction: 0};
    const rotation = new Rotation({items: [
        hit,
        {type: 'action', action: 'switch', charId: id},
        {type: 'repeat', count: 2, items: [{type: 'action', action: 'switch', charId: id}, hit]},
    ]});

    // Action 1 in place of the two switches (action 2), as older versions wrote it.
    const input = rotation.serialize();
    for (let i = 0; i + 2 < input.length; ++i) {
        if (input[i] == 5 && input[i + 1] == 2 && input[i + 2] == id) input[i + 1] = 1;
    }
    const loaded = Rotation.deserialize(input);
    expect(loaded.getItems().map((item) => item.type)).toEqual(['feature', 'repeat']);
    expect(loaded.getItems()[1].items.map((item) => item.type)).toEqual(['feature']);
});
