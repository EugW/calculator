import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { Condition } from "../src/js/classes/Condition";
import { Rotation } from "../src/js/classes/Rotation";
import { ROTATION_TEAM } from "../src/js/classes/RotationCompiler";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { ensureDawnNavigator } from "./support/gpuNode";
import { makeBuild } from "./support/team";

global.DB = DB;

/**
 * The optimizer scores a candidate as the calculator shows it: set effects
 * read the member's set-bonus profile, and a rotation step changes one only
 * from its point on. Before the profile, the start of a program and the
 * rotation inside a set's variation decided a control separately: a step
 * was ignored or counted twice, and VV's chosen elements were replaced by
 * all of them.
 */

const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const MAINS = {
    flower: ['hp'], plume: ['atk'], sands: ['atk_percent', 'recharge'],
    goblet: ['dmg_pyro', 'dmg_hydro'], circlet: ['crit_rate', 'crit_dmg'],
};
const NOBLESSE_4 = 'set.noblesse_oblige_4';

function pool(sets) {
    const result = [];
    for (const set of sets) {
        for (const slot of SLOTS) {
            for (const main of MAINS[slot]) {
                result.push(new Artifact(5, 20, slot, set, main, [
                    {stat: 'crit_rate', value: 7}, {stat: 'crit_dmg', value: 14}, {stat: 'recharge', value: 11},
                ]));
            }
        }
    }
    return result;
}

function hit(member, feature, count = 1) {
    return {type: 'feature', charId: member.char.getId(), feature, count, reaction: 0};
}

function setStep(member, setId, name, value) {
    const set = DB.Artifacts.Sets.get(setId);
    const cond = Condition.unwrap(set.getConditions(5)).find((item) => item.getName() == name);
    return {type: 'condition', subtype: 'member', object: 'artifacts', charId: member.char.getId(),
        itemId: set.getId(), conditionId: cond.getId(), value};
}

function makeTeam(keys) {
    const members = keys.map(makeBuild);
    const team = Team.fromMember(members[0]);
    members.slice(1).forEach((item, index) => team.setMember(index + 1, item));
    return {team, members};
}

function suggest(member, featureName, artifacts, useGPU = false) {
    const suggester = new ArtifactsSuggest({
        build: member, artifacts, featureName, featureType: 'average',
        settings: {stats: {}, setMinValues: {}, setMaxValues: {}},
        limit: 20, useGPU, showBeta: true,
    });
    suggester.prepare();
    return suggester;
}

function direct(member, artifacts, featureName) {
    const build = member.clone();
    build.clearArtifacts();
    for (const artifact of artifacts) build.setArtifact(artifact);
    return build.calcFeatures(1)[featureName].average;
}

function expectDirect(member, featureName, results, tolerance = 1e-9) {
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
        const expected = direct(member, result.artifacts, featureName);
        expect(Math.abs(result.value - expected)).toBeLessThanOrEqual(Math.max(1, Math.abs(expected)) * tolerance);
    }
}

function setCounts(result) {
    const counts = {};
    for (const artifact of result.artifacts) counts[artifact.set] = (counts[artifact.set] || 0) + 1;
    return counts;
}

// Bennett's Noblesse, switched by a step after his burst: Kazuha's hit comes
// before it, Xiangling's after.
function noblesse(profileValue, stepValue) {
    const {team, members: [xiangling, bennett, , kazuha]} = makeTeam(['Xiangling', 'Bennet', 'Xingqiu', 'Kazuha']);
    if (profileValue !== undefined) bennett.setArtifactsSettings({[NOBLESSE_4]: profileValue});
    team.setRotation(new Rotation({items: [
        hit(kazuha, 'skill.press_dmg'),
        hit(bennett, 'burst.burst_dmg'),
        setStep(bennett, 'NoblesseOblige', NOBLESSE_4, stepValue),
        hit(xiangling, 'burst.xiangling_pyronado', 6),
    ]}));
    return bennett;
}

const NOBLESSE_CASES = [
    ['a new profile, an ON step (on from the start)', undefined, 1],
    ['profile OFF, an ON step (on from the step)', false, 1],
    ['profile ON, an OFF step (off from the step)', true, 0],
];

describe("a set control a rotation step changes", () => {
    test.each(NOBLESSE_CASES)("%s scores as the calculator does", (label, profileValue, stepValue) => {
        const bennett = noblesse(profileValue, stepValue);
        const results = suggest(bennett, ROTATION_TEAM, pool(['NoblesseOblige', 'GladiatorFinale'])).getResult(() => {});
        expectDirect(bennett, ROTATION_TEAM, results);
    });

    test("starting off is worth less than starting on", () => {
        const artifacts = pool(['NoblesseOblige']).filter((art) => MAINS[art.slot][0] == art.mainStat);
        const on = noblesse(undefined, 1);
        const off = noblesse(false, 1);
        expect(direct(off, artifacts, ROTATION_TEAM)).toBeLessThan(direct(on, artifacts, ROTATION_TEAM));
        expect(suggest(off, ROTATION_TEAM, artifacts).getResult(() => {})[0].value)
            .toBeLessThan(suggest(on, ROTATION_TEAM, artifacts).getResult(() => {})[0].value);
    });
});

describe("the chosen value of a set control", () => {
    test("VV's elements: Pyro only shreds Pyro RES", () => {
        const {team, members: [xiangling, , xingqiu, kazuha]} = makeTeam(['Xiangling', 'Bennet', 'Xingqiu', 'Kazuha']);
        kazuha.setArtifactsSettings({'set.viridescent_venerer_4': 'pyro'});
        team.setRotation(new Rotation({items: [
            hit(kazuha, 'skill.press_dmg'), hit(xingqiu, 'skill.skill_dmg', 4), hit(xiangling, 'burst.xiangling_pyronado', 6),
        ]}));
        const results = suggest(kazuha, ROTATION_TEAM, pool(['ViridescentVenerer', 'GladiatorFinale'])).getResult(() => {});
        expectDirect(kazuha, ROTATION_TEAM, results);

        // With every element, Xingqiu's Hydro hits gain too.
        const vv = results.find((result) => setCounts(result).ViridescentVenerer >= 4);
        const allElements = kazuha.clone();
        allElements.setArtifactsSettings({'set.viridescent_venerer_4': undefined});
        expect(direct(allElements, vv.artifacts, ROTATION_TEAM)).toBeGreaterThan(vv.value);
    });

    test("Archaic Petra's element", () => {
        const {team, members: [zhongli, xingqiu]} = makeTeam(['Zhongli', 'Xingqiu']);
        zhongli.setArtifactsSettings({'set_bonus.archaic_petra_4': 'hydro'});
        team.setRotation(new Rotation({items: [hit(xingqiu, 'skill.skill_dmg', 4)]}));
        const results = suggest(zhongli, ROTATION_TEAM, pool(['ArchaicPetra', 'GladiatorFinale'])).getResult(() => {});
        expectDirect(zhongli, ROTATION_TEAM, results);
    });

    test.each([
        ['Kokomi', 'OceanHuedClam', {accumulated_healing: 12000}],
        ['Neuvillette', 'MarechausseeHunter', {'set.marechaussee_hunter_4': 1}],
    ])("%s with %s and a chosen number", (charKey, setId, profile) => {
        const {members: [build]} = makeTeam([charKey]);
        build.setArtifactsSettings(profile);
        const featureName = Object.entries(build.calcFeatures(1))
            .find(([name, result]) => /^(attack|other)\./.test(name) && result.isDamage && result.normal > 0)[0];
        const results = suggest(build, featureName, pool([setId, 'GladiatorFinale'])).getResult(() => {});
        expectDirect(build, featureName, results);
    });
});

test("the GPU scores the same candidates as the calculator", async () => {
    await ensureDawnNavigator();

    const bennett = noblesse(false, 1);
    const noblesseResults = await suggest(bennett, ROTATION_TEAM, pool(['NoblesseOblige', 'GladiatorFinale']), true)
        .getResultGPU(() => {});
    expectDirect(bennett, ROTATION_TEAM, noblesseResults, 1e-5);

    const {team, members: [xiangling, , xingqiu, kazuha]} = makeTeam(['Xiangling', 'Bennet', 'Xingqiu', 'Kazuha']);
    kazuha.setArtifactsSettings({'set.viridescent_venerer_4': 'pyro'});
    team.setRotation(new Rotation({items: [
        hit(kazuha, 'skill.press_dmg'), hit(xingqiu, 'skill.skill_dmg', 4), hit(xiangling, 'burst.xiangling_pyronado', 6),
    ]}));
    const vvResults = await suggest(kazuha, ROTATION_TEAM, pool(['ViridescentVenerer', 'GladiatorFinale']), true)
        .getResultGPU(() => {});
    expectDirect(kazuha, ROTATION_TEAM, vvResults, 1e-5);
}, 120000);
