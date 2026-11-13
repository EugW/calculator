import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { deserializeWorkerMember, serializeWorkerMember, Team } from "../src/js/classes/Team";
import { FloatingSet, FloatingWeapon, VirtualCharacter } from "../src/js/classes/Team/Legacy";
import { DB } from "../src/js/db/DB";
import { makeBuild } from "./support/team";

global.DB = DB;

// Searches over a member's artifacts in a team with a legacy source
// (Team/Legacy): the entries' effects are part of what a candidate scores,
// and their stated stats are constants of the program.

const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const EPSILON = 1e-6;

function fillerSetId() {
    return DB.Artifacts.Sets.getKeys(true).find((setId) => {
        const set = DB.Artifacts.Sets.get(setId);
        const hasConditions = set.getConditionsByPieces().some((conditions) => {
            return conditions && conditions.some((cond) => cond && cond.isSerializable && cond.isSerializable());
        });
        return set.minRarity <= 5 && set.maxRarity >= 5 && !hasConditions;
    });
}

function makePool(setId) {
    const mains = {
        flower: ['hp'],
        plume: ['atk'],
        sands: ['mastery', 'atk_percent'],
        goblet: ['mastery', 'dmg_pyro'],
        circlet: ['mastery', 'crit_dmg'],
    };
    const result = [];
    for (const slot of SLOTS) {
        for (const main of mains[slot]) {
            result.push(new Artifact(5, 20, slot, setId, main, []));
        }
    }
    return result;
}

function evaluate(member, artifacts, featureName) {
    const build = member.clone();
    build.clearArtifacts();
    for (const artifact of artifacts) {
        build.setArtifact(artifact);
    }
    return build.calcFeatures(1)[featureName];
}

function search(viewed, featureName) {
    const suggester = new ArtifactsSuggest({
        build: viewed,
        artifacts: makePool(fillerSetId()),
        featureName: featureName,
        featureType: 'normal',
        settings: {sets_settings: {}, stats: {}, setMinValues: {}, setMaxValues: {}},
        limit: 100,
        useGPU: false,
        showBeta: true,
    });
    suggester.prepare();
    return suggester.getResult(() => {});
}

function makeTeam() {
    const viewed = makeBuild('Hutao');
    const team = Team.fromMember(viewed);

    const bennett = team.addLegacy(new VirtualCharacter(DB.Chars.get('Bennet')));
    bennett.setSkills({burst: 10});
    bennett.setSettings({bennet_fantastic_voyage: true});
    bennett.setStated('atk_base', 800);

    const key = team.addLegacy(new FloatingWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'), 5));
    key.setSettings({weapon_key_of_khaj_nisut: 3});
    key.setStated('hp', 60000);

    team.addLegacy(new FloatingSet('NoblesseOblige'));
    return {team, viewed};
}

test("the optimizer scores candidates with the legacy source's effects", () => {
    const {viewed} = makeTeam();
    const featureName = 'attack.normal_hit_1';

    const results = search(viewed, featureName);
    expect(results.length).toBe(8);
    for (const result of results) {
        const expected = evaluate(viewed, result.artifacts, featureName).normal;
        expect(Math.abs(result.value - expected)).toBeLessThan(Math.max(1, expected) * EPSILON);
    }

    // The entries are part of the score: without them every candidate is worth less.
    const alone = Team.solo(viewed.characterBuild());
    expect(results[0].value).toBeGreaterThan(evaluate(alone, results[0].artifacts, featureName).normal);
});

test("a reaction's score counts the Elemental Mastery a floating weapon gives", () => {
    const {viewed} = makeTeam();
    const featureName = Object.keys(viewed.calcFeatures(1)).find((name) => /^reaction\./.test(name));
    expect(featureName).toBeDefined();

    for (const result of search(viewed, featureName)) {
        const expected = evaluate(viewed, result.artifacts, featureName).normal;
        expect(Math.abs(result.value - expected)).toBeLessThan(Math.max(1, expected) * EPSILON);
    }
});

test("a worker gets the member with its team's legacy source", () => {
    const {team, viewed} = makeTeam();
    const copy = deserializeWorkerMember(serializeWorkerMember(viewed));

    expect(copy.team.legacy.getEntries().map((entry) => [entry.kind, entry.uid, entry.stated]))
        .toEqual(team.legacy.getEntries().map((entry) => [entry.kind, entry.uid, entry.stated]));
    expect(copy.calcFeatures(1)['attack.normal_hit_1'].normal).toBeCloseTo(viewed.calcFeatures(1)['attack.normal_hit_1'].normal, 9);
});
