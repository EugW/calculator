import { Condition } from "../src/js/classes/Condition";
import { Rotation } from "../src/js/classes/Rotation";
import { RotationCompiler } from "../src/js/classes/RotationCompiler";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeBuild } from "./support/team";

global.DB = DB;

/**
 * A rotation step that sets a control to the value it already has at its
 * point is "the same state as before": the editor warns about it. The walk
 * is the compiler's, and the steps still run.
 */

const VOYAGE = 'bennet_fantastic_voyage';
const NOBLESSE_4 = 'set.noblesse_oblige_4';

function setup() {
    const members = ['Xiangling', 'Bennet'].map(makeBuild);
    const team = Team.fromMember(members[0]);
    team.setMember(1, members[1]);
    return {team, xiangling: members[0], bennett: members[1]};
}

const hit = (member) => ({type: 'feature', charId: member.char.getId(), feature: 'burst.burst_dmg', count: 1, reaction: 0});

function voyage(bennett, value, receiver) {
    const cond = Condition.unwrap(DB.Chars.get('Bennet').getAllConditions()).find((item) => item.getName() == VOYAGE);
    return Object.assign({type: 'condition', subtype: 'member', object: 'char', charId: bennett.char.getId(),
        itemId: bennett.char.getId(), conditionId: cond.getId(), value}, receiver ? {receiverId: receiver.char.getId()} : {});
}

function noblesse(member, value) {
    const set = DB.Artifacts.Sets.get('NoblesseOblige');
    const cond = Condition.unwrap(set.getConditions(5)).find((item) => item.getName() == NOBLESSE_4);
    return {type: 'condition', subtype: 'member', object: 'artifacts', charId: member.char.getId(),
        itemId: set.getId(), conditionId: cond.getId(), value};
}

// Items get their IDs when a rotation is read, as in the editor.
function diagnose(team, items) {
    team.setRotation(new Rotation({items}).clone());
    return {ids: flatIds(team.getRotation().getItems()), result: new RotationCompiler(team).diagnoseSteps()};
}

function flatIds(items, result = []) {
    for (const item of items) {
        result.push(item.id);
        for (const key of ['items', 'conditions', 'features']) {
            if (item[key]) flatIds(item[key], result);
        }
    }
    return result;
}

test("a step repeating the previous step's value; steps after the last hit count too", () => {
    const {team, bennett} = setup();
    const {ids, result} = diagnose(team, [voyage(bennett, 1), hit(bennett), voyage(bennett, 1), voyage(bennett, 0), voyage(bennett, 0)]);
    expect(result).toEqual({[ids[2]]: {branches: null}, [ids[4]]: {branches: null}});
});

test("a rotation without hits is checked as well", () => {
    const {team, bennett} = setup();
    const {ids, result} = diagnose(team, [voyage(bennett, 1), voyage(bennett, 1)]);
    expect(result).toEqual({[ids[1]]: {branches: null}});
});

test("a set control is compared with the member's set-bonus profile", () => {
    const {team, bennett} = setup();
    // A new profile has Noblesse on: turning it on repeats it.
    let {ids, result} = diagnose(team, [hit(bennett), noblesse(bennett, 1)]);
    expect(result).toEqual({[ids[1]]: {branches: null}});

    bennett.setArtifactsSettings({[NOBLESSE_4]: false});
    ({result} = diagnose(team, [hit(bennett), noblesse(bennett, 1)]));
    expect(result).toEqual({});
});

test("a receiver's step is compared with the value it inherits from its source", () => {
    const {team, xiangling, bennett} = setup();
    bennett.setCharSettings({[VOYAGE]: true});
    const {ids, result} = diagnose(team, [voyage(bennett, 1, xiangling), voyage(bennett, 0, xiangling)]);
    expect(result).toEqual({[ids[0]]: {branches: null}});
});

test("an uptime's branches are walked separately; a branch that never happens is not", () => {
    const {team, bennett} = setup();
    const uptime = (percent) => ({type: 'uptime', percent, conditions: [voyage(bennett, 1)],
        features: [{type: 'repeat', count: 2, items: [voyage(bennett, 1), hit(bennett)]}]});

    // The repeated step: the same state after the uptime's own step only.
    let {ids, result} = diagnose(team, [uptime(50)]);
    const inner = ids[3];
    expect(result).toEqual({[inner]: {branches: ['on']}});

    ({ids, result} = diagnose(team, [uptime(100)]));
    expect(result).toEqual({[ids[3]]: {branches: null}});
});

test("disabled steps are skipped, and diagnosing changes nothing", () => {
    const {team, bennett} = setup();
    const items = [voyage(bennett, 1), Object.assign(voyage(bennett, 1), {disabled: true}), voyage(bennett, 1)];
    const before = team.serialize();
    const {ids, result} = diagnose(team, items);
    expect(result).toEqual({[ids[2]]: {branches: null}});
    team.setRotation(new Rotation());
    expect(team.serialize().slice(0, 50)).toEqual(before.slice(0, 50));
    expect(bennett.getSettings()[VOYAGE]).toBeFalsy();
});
