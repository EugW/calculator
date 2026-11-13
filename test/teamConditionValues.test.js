import { ConditionBoolean } from "../src/js/classes/Condition/Boolean";
import { PostEffectStats } from "../src/js/classes/PostEffect/Stats";
import { Rotation } from "../src/js/classes/Rotation";
import { ROTATION_TEAM } from "../src/js/classes/RotationCompiler";
import { StatTable } from "../src/js/classes/StatTable";
import { Serializer } from "../src/js/classes/Serializer";
import { Team, TEAM_FORMAT, deserializeWorkerMember, serializeWorkerMember } from "../src/js/classes/Team";
import { deliveredControlNames } from "../src/js/classes/Team/ConditionValues";
import { RECEIVERS } from "../src/js/classes/Team/Receivers";
import { teamSettingDefinitions } from "../src/js/classes/Team/Settings";
import { Condition } from "../src/js/classes/Condition";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, withSource } from "./support/team";

global.DB = DB;
const VOYAGE = 'bennet_fantastic_voyage';
const HIT = 'attack.normal_hit_1';
const id = (member) => member.char.getId();
const ownStats = (member) => Object.fromEntries(Object.entries(finalStats(member)).filter(([name]) => !/^m\d+__/.test(name)));

function makeTeam(...names) {
    const members = names.map(makeBuild);
    const team = Team.fromMember(members[0]);
    members.slice(1).forEach((member, slot) => team.setMember(slot + 1, member));
    return {team, members};
}

function hit(member) {
    return {type: 'feature', charId: id(member), feature: HIT, count: 1};
}

function voyage(source, receiver, value) {
    return {type: 'condition', subtype: 'member', charId: id(source), object: 'char',
        itemId: id(source), conditionId: 2, receiverId: id(receiver), value};
}

const normal = (member) => member.getFeatureResultByName(HIT).normal;

test("Hu Tao receives Bennett's field while Xingqiu and Bennett do not", () => {
    const {team, members: [hutao, bennett, xingqiu]} = makeTeam('Hutao', 'Bennet', 'Xingqiu');
    const off = [hutao, bennett, xingqiu].map(ownStats);
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, true);
    expect(finalStats(hutao).get('atk')).toBeGreaterThan((off[0].atk || 0));
    expect(ownStats(bennett)).toEqual(off[1]);
    expect(ownStats(xingqiu)).toEqual(off[2]);
    expect(bennett.getSettings()[VOYAGE]).toBeFalsy();

    const received = finalStats(hutao).get('atk');
    team.setConditionValue(id(bennett), id(bennett), VOYAGE, true);
    expect(finalStats(bennett).get('atk')).toBeGreaterThan((off[1].atk || 0));
    expect(finalStats(hutao).get('atk')).toBe(received);
    expect(ownStats(xingqiu)).toEqual(off[2]);
});

test("explicit false stays off when the source changes; clearing restores inheritance", () => {
    const {team, members: [bennett, hutao, xingqiu]} = makeTeam('Bennet', 'Hutao', 'Xingqiu');
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, false);
    const off = finalStats(hutao).get('atk');
    bennett.setCharSettings({[VOYAGE]: true});
    expect(finalStats(hutao).get('atk')).toBe(off);
    expect(finalStats(xingqiu).get('atk')).toBeGreaterThan(makeTeam('Xingqiu').members[0].getBuildData().stats.get('atk'));
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, null);
    expect(finalStats(hutao).get('atk')).toBeGreaterThan(off);
    expect(team.conditionValues).toEqual({});
});

test("a self override does not become the default for other receivers", () => {
    const {team, members: [bennett, hutao]} = makeTeam('Bennet', 'Hutao');
    const plain = normal(hutao);
    team.setConditionValue(id(bennett), id(bennett), VOYAGE, true);
    expect(normal(hutao)).toBe(plain);
});

test("pair settings are rebuilt from inputs, without stale derived flags or changed source stats", () => {
    const {team, members: [bennett, hutao, xingqiu]} = makeTeam('Bennet', 'Hutao', 'Xingqiu');
    withSource(bennett, [new ConditionBoolean({name: VOYAGE, settings: {'test.derived': 1}, stats: {def_percent: 50}})], [
        new PostEffectStats({receivers: RECEIVERS.OTHERS, from: 'def*', percent: new StatTable('mastery', [0.1]),
            conditions: [new ConditionBoolean({name: 'test.derived'})]}),
    ]);
    bennett.setCharSettings({[VOYAGE]: true});
    const own = ownStats(bennett);
    const on = finalStats(hutao).get('mastery');
    expect(on).toBeGreaterThan(0);
    const other = ownStats(xingqiu);
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, false);
    expect(finalStats(hutao).get('mastery')).toBe(0);
    expect(ownStats(bennett)).toEqual(own);
    expect(ownStats(xingqiu)).toEqual(other);
    const evaluation = team.evaluate();
    const view = evaluation.sourceView(bennett, evaluation.member(hutao).settings());
    expect(view['test.derived']).toBeUndefined();
    expect(view[VOYAGE]).toBe(false);
});

test("delivered multipliers read the pair and keep received talent bonuses", () => {
    const {team, members: [shenhe, ayaka, kokomi, skirk]} = makeTeam('Shenhe', 'Ayaka', 'Kokomi', 'Skirk');
    shenhe.setCharSkills({attack: 10, elemental: 9, burst: 10});
    shenhe.setCharSettings({shenhe_icy_quill: true});
    skirk.setCharSettings({skirk_mutual_weapons_mentorship: true});
    const before = kokomi.getFeatureResultByName(HIT).normal;
    team.setConditionValue(id(shenhe), id(ayaka), 'shenhe_icy_quill', false);
    const data = ayaka.getBuildData();
    expect(data.multipliers.some((item) => item.getName() === 'shenhe_dmg_bonus')).toBe(false);
    const other = kokomi.getBuildData();
    expect(other.multipliers.find((item) => item.getName() === 'shenhe_dmg_bonus').getLevel(other)).toBe(10);
    expect(kokomi.getFeatureResultByName(HIT).normal).toBe(before);
});

test("the team format, workers and copies preserve explicit values and absent members", () => {
    const {team, members: [bennett, hutao, kazuha]} = makeTeam('Bennet', 'Hutao', 'Kazuha');
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, false);
    team.setConditionValue(id(kazuha), id(hutao), 'kaedehara_kazuha_poetics_of_fuubutsu', 'pyro;hydro');
    team.setConditionValue(id(kazuha), id(kazuha), 'kaedehara_kazuha_poetics_of_fuubutsu', '');
    const values = structuredClone(team.conditionValues);
    team.removeMember(2);
    team.swapMembers(0, 1);
    const packed = Serializer.pack(team);
    expect(Serializer.unpack(packed)[0]).toBe(TEAM_FORMAT);
    for (const copy of [team.clone(), team.cloneWithArtifactSettings(), Team.deserialize(Serializer.unpack(packed)),
        deserializeWorkerMember(serializeWorkerMember(hutao)).team]) {
        expect(copy.conditionValues).toEqual(values);
        copy.setConditionValue(id(bennett), id(hutao), VOYAGE, true);
        expect(team.conditionValues).toEqual(values);
    }
    team.setMember(2, kazuha);
    expect(team.conditionValues).toEqual(values);
});

test("a rotation step changes one recipient, round-trips and leaves the live team alone", () => {
    const {team, members: [bennett, hutao, xingqiu]} = makeTeam('Bennet', 'Hutao', 'Xingqiu');
    const h0 = normal(hutao), x0 = normal(xingqiu);
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, true);
    const h1 = normal(hutao);
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, null);
    team.setRotation(new Rotation({items: [hit(hutao), voyage(bennett, hutao, 1), hit(hutao), hit(xingqiu)]}));
    const copy = Team.deserialize(team.serialize());
    expect(copy.rotation.getItems()[1].receiverId).toBe(id(hutao));
    for (const member of copy.getMembers()) {
        expect(member.getFeatureResultByName(ROTATION_TEAM).normal).toBeCloseTo(h0 + h1 + x0, 7);
    }
    expect(team.conditionValues).toEqual({});
    expect(copy.conditionValues).toEqual({});
    copy.removeMember(1);
    expect(Rotation.getConditionData(copy.rotation.getItems()[1], copy).invalid).toBe(true);
});

test("the UI discovers hidden post-effect controls from declarations", () => {
    const member = makeBuild('Bennet');
    expect(deliveredControlNames(member).has(VOYAGE)).toBe(true);
});


test("the same stored source stat feeds all recipients; pair replays change only settings", () => {
    const {team, members: [bennett, hutao]} = makeTeam('Bennet', 'Hutao');
    withSource(bennett, [new ConditionBoolean({name: VOYAGE, stats: {def_percent: 50}})], [
        new PostEffectStats({receivers: RECEIVERS.OTHERS, from: 'def*', percent: new StatTable('mastery', [0.1])}),
    ]);
    team.setConditionValue(id(bennett), id(bennett), VOYAGE, true);
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, false);
    expect(finalStats(hutao).get('mastery')).toBeCloseTo(finalStats(bennett).getTotalPercent('def') * 0.1, 9);
});

test("an others-only condition still excludes its source pair", () => {
    const {team, members: [hutao, bennett]} = makeTeam('Hutao', 'Bennet');
    withSource(bennett, [new ConditionBoolean({name: VOYAGE, receivers: RECEIVERS.OTHERS, stats: {mastery: 123}})]);
    team.setConditionValue(id(bennett), id(bennett), VOYAGE, true);
    expect(finalStats(bennett).get('mastery')).toBe(0);
    expect(finalStats(hutao).get('mastery')).toBe(0);
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, true);
    expect(finalStats(hutao).get('mastery')).toBe(123);
});

test("Nicole's delivered feature receives her pair-specific condition scope", () => {
    const {team, members: [fischl, nicole, hutao]} = makeTeam('Fischl', 'Nicole', 'Hutao');
    const original = nicole.char.getFeatures.bind(nicole.char);
    const gated = Object.create(original().find((item) => item.name === 'nicole_arcane_projection'));
    gated.condition = new ConditionBoolean({name: 'nicole_witch_homework'});
    nicole.char.getFeatures = () => [gated];
    const feature = 'other.nicole_arcane_projection';
    team.setConditionValue(id(nicole), id(fischl), 'nicole_witch_homework', true);
    expect(fischl.getFeaturesHash(fischl.getBuildData())[feature]).toBeDefined();
    expect(hutao.getFeaturesHash(hutao.getBuildData())[feature]).toBeUndefined();
    expect(nicole.getFeaturesHash(nicole.getBuildData())[feature]).toBeUndefined();
});

test("pair inputs keep their weapon choice while unequipped", () => {
    const {team, members: [venti, hutao]} = makeTeam('Venti', 'Hutao');
    const weapon = DB.Weapons.get('bow').get('ElegyfortheEnd');
    const old = venti.weapon.object;
    venti.setWeapon(weapon);
    const plain = finalStats(hutao).get('mastery');
    team.setConditionValue(id(venti), id(hutao), 'weapon_elegy_for_the_end', true);
    expect(finalStats(hutao).get('mastery')).toBeGreaterThan(plain);
    venti.setWeapon(old);
    expect(finalStats(hutao).get('mastery')).toBe(plain);
    const copy = Team.deserialize(team.serialize());
    copy.getMember(0).setWeapon(weapon);
    expect(finalStats(copy.getMember(1)).get('mastery')).toBeGreaterThan(plain);
});

test("numbers, zero and empty choices keep their meanings through links", () => {
    const {team, members: [yoimiya, hutao]} = makeTeam('Yoimiya', 'Hutao');
    const stacks = 'yoimiya_summer_nights_dawn_stacks';
    team.setConditionValue(id(yoimiya), id(hutao), stacks, 0);
    team.setConditionValue(id(yoimiya), id(yoimiya), stacks, 5);
    const copy = Team.deserialize(Serializer.unpack(Serializer.pack(team)));
    expect(copy.conditionValues).toEqual(team.conditionValues);
    expect(copy.getConditionValues(id(yoimiya), id(hutao))[stacks]).toBe(0);
});

test("malformed pair payloads fail instead of shifting the rotation", () => {
    const {team, members: [bennett, hutao]} = makeTeam('Bennet', 'Hutao');
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, false);
    const input = team.serialize();
    const start = input.length - team.rotation.serialize().length - 7;
    for (const [offset, value] of [[0, 9999], [1, 9999], [2, 0], [3, 99], [5, 9999], [6, 2]]) {
        const bad = input.slice();
        bad[start + offset] = value;
        expect(Team.deserialize(bad)).toBeNull();
    }
    expect(() => team.setConditionValue(id(bennett), id(hutao), 'enemy.def_reduce', 30)).toThrow();
    expect(() => team.setConditionValue(id(bennett), id(hutao), 'polestar_field', true)).toThrow();
});

test("rotation blocks isolate recipient overrides", () => {
    const {team, members: [bennett, hutao]} = makeTeam('Bennet', 'Hutao');
    const plain = normal(hutao);
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, true);
    const buffed = normal(hutao);
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, null);
    team.setRotation(new Rotation({items: [
        {type: 'repeat', count: 2, items: [voyage(bennett, hutao, 1), hit(hutao)]},
        {type: 'uptime', percent: 25, conditions: [voyage(bennett, hutao, 1)], features: [hit(hutao)]},
        hit(hutao),
    ]}));
    expect(hutao.getFeatureResultByName(ROTATION_TEAM).normal).toBeCloseTo(2.25 * buffed + 1.75 * plain, 7);
    expect(team.conditionValues).toEqual({});
});

test("team ownership and stable wire IDs are declared together", () => {
    const definitions = teamSettingDefinitions();
    const controls = Condition.unwrap(DB.Buffs.getList().filter((item) => item.isParty()).flatMap((item) => item.getConditions()))
        .filter((cond) => cond.getName() && cond.isSerializable() && !cond.isRetired?.());
    expect(Object.keys(definitions).sort()).toEqual(['on_field_char', ...controls.map((cond) => cond.getName())].sort());
    for (const cond of controls) expect(definitions[cond.getName()].id).toBe(cond.params.teamSerializeId);
    expect(definitions.polestar_included_hits.max).toBe(12);
});


test("pair values select eligible non-stacking sources per receiver", () => {
    const {team, members: [bennett, kazuha, hutao, xingqiu]} = makeTeam('Bennet', 'Kazuha', 'Hutao', 'Xingqiu');
    const key = 'test.pair';
    const params = {receivers: RECEIVERS.TEAM, stack: key, stackScope: 'receiver'};
    withSource(bennett, [new ConditionBoolean({...params, name: VOYAGE, stats: {mastery: 100}})]);
    withSource(kazuha, [new ConditionBoolean({...params, name: 'kaedehara_kazuha_poetics_of_fuubutsu', stats: {mastery: 200}})]);
    bennett.setCharSettings({[VOYAGE]: true});
    kazuha.setCharSettings({kaedehara_kazuha_poetics_of_fuubutsu: 'pyro'});
    team.setStackSource(key, bennett, hutao);
    expect(finalStats(hutao).get('mastery')).toBe(100);
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, false);
    expect(finalStats(hutao).get('mastery')).toBe(200);
    expect(finalStats(xingqiu).get('mastery')).toBe(100);
    expect(team.stackChoices[key + '@' + id(hutao)]).toBe(id(bennett));
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, null);
    expect(finalStats(hutao).get('mastery')).toBe(100);
});


test("an evaluation retains its pair inputs after the team is edited", () => {
    const {team, members: [bennett, hutao]} = makeTeam('Bennet', 'Hutao');
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, true);
    const evaluation = team.evaluate();
    const before = evaluation.member(hutao).programData();
    before.applyPostEffects();
    team.setConditionValue(id(bennett), id(hutao), VOYAGE, false);
    const after = evaluation.member(hutao).programData();
    after.applyPostEffects();
    expect(after.stats.get('atk')).toBe(before.stats.get('atk'));
    expect(finalStats(hutao).get('atk')).toBeLessThan(after.stats.get('atk'));
});
