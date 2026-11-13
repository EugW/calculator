import { Condition } from "../src/js/classes/Condition";
import { Rotation } from "../src/js/classes/Rotation";
import { ROTATION_TEAM } from "../src/js/classes/RotationCompiler";
import { Team } from "../src/js/classes/Team";
import { FloatingSet, VirtualCharacter } from "../src/js/classes/Team/Legacy";
import { DB } from "../src/js/db/DB";
import { makeBuild } from "./support/team";

global.DB = DB;

// Rotation steps on the controls of the team's legacy source (Team/Legacy):
// a step names its owner by its source ID, a member or an entry alike.

const HIT = 'attack.normal_hit_1';

function hit(member) {
    return {type: 'feature', charId: member.char.getId(), feature: HIT, count: 1, reaction: 0};
}

/** A step on a control of a legacy entry. */
function entryStep(entry, object, name, value, receiver) {
    const cond = Condition.unwrap(entry.getConditions({objects: [object]})).find((item) => item.getName() == name);
    const step = {
        type: 'condition',
        subtype: 'member',
        charId: entry.getSourceId(),
        object: object,
        itemId: object == 'artifacts' ? DB.Artifacts.Sets.get(entry.getSet()).getId() : entry[object].getId(),
        conditionId: cond.getId(),
        value: value,
    };
    if (receiver) step.receiverId = receiver.char.getId();
    return step;
}

const total = (member) => member.getFeatureResultByName(ROTATION_TEAM).normal;
const single = (member) => member.getFeatures(member.getBuildData())[HIT].normal;

test("a step switches a floating set's control from its point on", () => {
    const hutao = makeBuild('Hutao');
    const team = Team.fromMember(hutao);
    const without = single(hutao);
    const noblesse = team.addLegacy(new FloatingSet('NoblesseOblige'));
    const withSet = single(hutao);
    expect(withSet).toBeGreaterThan(without);

    team.setRotation(new Rotation({items: [
        hit(hutao), entryStep(noblesse, 'artifacts', 'set.noblesse_oblige_4', 0), hit(hutao),
    ]}));
    expect(total(hutao)).toBeCloseTo(withSet + without, 6);
    // The team itself is not changed.
    expect(noblesse.getSettings()['set.noblesse_oblige_4']).toBe(true);

    const data = Rotation.getConditionData(team.getRotation().getItems()[1], team);
    expect(data.member).toBe(noblesse);
    expect(data.invalid).toBeFalsy();

    // Saved and loaded with the team.
    const copy = Team.deserialize(team.serialize());
    expect(total(copy.getMember(0))).toBeCloseTo(withSet + without, 6);

    // Without its entry the step does not apply.
    team.legacy.remove(noblesse);
    expect(total(hutao)).toBeCloseTo(without * 2, 6);
});

test("a step on a virtual character's control, for all members or for one", () => {
    const hutao = makeBuild('Hutao');
    const xingqiu = makeBuild('Xingqiu');
    const team = Team.fromMember(hutao);
    team.setMember(1, xingqiu);
    const bennett = team.addLegacy(new VirtualCharacter(DB.Chars.get('Bennet')));
    bennett.setSkills({burst: 10});
    bennett.setStated('atk_base', 800);
    const [plainHutao, plainXingqiu] = [single(hutao), single(xingqiu)];
    bennett.setSettings({bennet_fantastic_voyage: true});
    const [buffedHutao, buffedXingqiu] = [single(hutao), single(xingqiu)];
    bennett.setSettings({});
    expect(buffedHutao).toBeGreaterThan(plainHutao);

    team.setRotation(new Rotation({items: [
        hit(hutao), entryStep(bennett, 'char', 'bennet_fantastic_voyage', 1), hit(hutao), hit(xingqiu),
    ]}));
    expect(total(hutao)).toBeCloseTo(plainHutao + buffedHutao + buffedXingqiu, 6);

    // For Hu Tao only: Xingqiu's hit stays as it was.
    team.setRotation(new Rotation({items: [
        hit(hutao), entryStep(bennett, 'char', 'bennet_fantastic_voyage', 1, hutao), hit(hutao), hit(xingqiu),
    ]}));
    expect(total(hutao)).toBeCloseTo(plainHutao + buffedHutao + plainXingqiu, 6);
});
