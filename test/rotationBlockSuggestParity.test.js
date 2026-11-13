import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { Rotation } from "../src/js/classes/Rotation";
import { ROTATION_TEAM } from "../src/js/classes/RotationCompiler";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeBuild } from "./support/team";

global.DB = DB;

// A step inside a block changes the viewer's stats for the block's hits: the
// block reads its own copy of each changed stat (Feature2/Rotation/Tree). A
// candidate's artifacts count in that copy as they do in the stat itself, so
// the search's plan gives a build what the calculator shows for it.

const PYRONADO = 'burst.xiangling_pyronado';
const ELEGY = 'weapon_elegy_for_the_end';
const VAPORIZE = 2;
// Elegy for the End raises the team's Elemental Mastery and ATK: the
// candidate has both.
const MAIN_STATS = {flower: 'hp', plume: 'atk', sands: 'mastery', goblet: 'dmg_pyro', circlet: 'atk_percent'};

function setup(block) {
    const [xiangling, fischl] = ['Xiangling', 'Fischl'].map(makeBuild);
    const elegy = DB.Weapons.get('bow').get('ElegyfortheEnd');
    fischl.setWeapon(elegy);
    const team = Team.fromMember(xiangling);
    team.setMember(1, fischl);

    const cond = elegy.getConditions().find((item) => item.getName() == ELEGY);
    const step = {type: 'condition', subtype: 'member', object: 'weapon', charId: fischl.char.getId(),
        itemId: elegy.getId(), conditionId: cond.getId(), value: 1};
    const hit = {type: 'feature', charId: xiangling.char.getId(), feature: PYRONADO, count: 1, reaction: VAPORIZE};
    team.setRotation(new Rotation({items: [hit, block(step, hit)]}).clone());

    xiangling.replaceArtifacts(DB.Artifacts.Slots.getKeys().map((slot) =>
        new Artifact(5, 20, slot, 'GladiatorFinale', MAIN_STATS[slot], [])));
    return xiangling;
}

test.each([
    ['repeat', (step, hit) => ({type: 'repeat', count: 2, items: [step, hit]})],
    ['uptime', (step, hit) => ({type: 'uptime', typeId: 1, percent: 60, conditions: [step], features: [hit]})],
])('a step inside a %s block keeps the candidate\'s stats in the plan', (name, block) => {
    const member = setup(block);
    const artifacts = Object.values(member.getArtifacts()).filter(Boolean);
    const suggester = new ArtifactsSuggest({
        build: member,
        artifacts,
        featureName: ROTATION_TEAM,
        featureType: 'average',
        settings: {sets_settings: {}, stats: {}, setMinValues: {}, setMaxValues: {}},
        limit: 20,
        useGPU: false,
        showBeta: true,
    });
    suggester.prepare();

    const fresh = member.view().getFeatureResultByName(ROTATION_TEAM).average;
    const planned = suggester.evaluateArtifactCombination(artifacts);
    expect(fresh).toBeGreaterThan(0);
    expect(Math.abs(planned - fresh)).toBeLessThan(fresh * 1e-9);
});
