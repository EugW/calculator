import { Condition } from "../src/js/classes/Condition";
import { PostEffectStats } from "../src/js/classes/PostEffect/Stats";
import { Rotation } from "../src/js/classes/Rotation";
import { ROTATION_TEAM } from "../src/js/classes/RotationCompiler";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { RECEIVERS } from "../src/js/classes/Team/Receivers";
import { DB } from "../src/js/db/DB";
import { enemyOf, finalStats, makeBuild, enemyChange, withSource } from "./support/team";

global.DB = DB;

// The enemy is a component of the team: resolved once per evaluation and
// read by the members through the enemy scope, never copied into them.

const AIMED = 'attack.aimed';

function enemyCondition(name) {
    return Condition.unwrap(DB.Conditions.Enemy).find((cond) => cond.getName() == name);
}

function makeTeam() {
    const a = makeBuild('Ganyu');
    const b = makeBuild('Emilie');
    const team = Team.fromMember(a);
    team.setMember(1, b);
    return {team, a, b};
}

test("the enemy is not a member object and is resolved once per evaluation", () => {
    const {team, a} = makeTeam();
    expect(a.getConditions().some((cond) => cond.getName() == 'enemy_frozen')).toBe(false);

    const frozen = enemyCondition('enemy_frozen');
    const getData = jest.spyOn(frozen, 'getData');
    try {
        const evaluation = team.evaluate();
        for (const member of team.getMembers()) {
            evaluation.member(member).programData();
        }
        expect(getData).toHaveBeenCalledTimes(1);
    } finally {
        getData.mockRestore();
    }
});

test("members read the enemy's state", () => {
    const {team, a, b} = makeTeam();
    team.enemy.modifySettings({'common.enemy_status': 'cryo', enemy_burning: true, 'enemy.superconduct': true});

    for (const member of [a, b]) {
        expect(enemyOf(member)['common.enemy_status']).toBe('cryo');
        // Superconduct is the enemy's: it reaches every member's hits.
        expect(enemyChange(member, 'enemy_res_phys')).toBeCloseTo(-0.4, 10);
    }

    // Emilie's A4 reads the enemy's burning state through ConditionEnemy.
    b.setCharLevels({level: 90, ascension: 6, constellation: 0});
    const burning = finalStats(b).get('dmg_all');
    team.enemy.modifySettings({enemy_burning: false});
    expect(burning).toBeGreaterThan(finalStats(b).get('dmg_all'));
});

test("a member cannot change the enemy", () => {
    const {team, a} = makeTeam();
    expect(() => a.setWeaponSettings({'common.enemy_status': 'pyro'})).toThrow(/team's setting/);
    expect(team.enemy.getSettings()['common.enemy_status']).toBeFalsy();
    expect(a.weapon.getSettings()['common.enemy_status']).toBeUndefined();
});

test("a weapon scenario against an enemy affected by Pyro changes the team's enemy", () => {
    const {team, a, b} = makeTeam();
    const scenario = {'common.enemy_status': 'pyro', polestar_field: true};
    expect(Team.splitSettings(Object.assign({test_weapon_toggle: true}, scenario))).toEqual({
        team: {polestar_field: true},
        enemy: {'common.enemy_status': 'pyro'},
        member: {test_weapon_toggle: true},
    });

    a.setWeaponSettings(team.applyShared(scenario));
    expect(team.enemy.getSettings()['common.enemy_status']).toBe('pyro');
    expect(team.getSettings().polestar_field).toBe(true);
    expect(enemyOf(b)['common.enemy_status']).toBe('pyro');
    expect(a.weapon.getSettings()['common.enemy_status']).toBeUndefined();
});

test("a rotation step on the enemy changes it for the following hits", () => {
    const {team, a} = makeTeam();
    const weakShot = enemyCondition('enemy_weak_shot');
    const enemyId = team.enemy.object.getId();
    const hit = {type: 'feature', charId: a.char.getId(), feature: AIMED, count: 1, reaction: 0};

    team.setRotation(new Rotation({items: [
        {id: 1, ...hit},
        {id: 2, type: 'condition', subtype: 'enemy', itemId: enemyId, conditionId: weakShot.getId(), value: 1},
        {id: 3, ...hit},
    ]}));
    const total = a.getFeatureResultByName(ROTATION_TEAM);

    const aimed = a.getFeatureResultByName(AIMED);
    // A weak spot hit always crits: the second hit is a crit.
    expect(total.average).toBeCloseTo(aimed.average + aimed.crit, 6);
    // The rotation works on a copy of the team.
    expect(team.enemy.getSettings().enemy_weak_shot).toBeFalsy();
});

describe("a post-effect on the enemy", () => {
    // Pyro RES shred scaling on the source's Elemental Mastery.
    const shred = (receivers) => new PostEffectStats({
        receivers,
        from: 'mastery',
        percent: new StatTable('enemy_res_pyro', [-0.01]),
    });

    function enemyRes(member) {
        const data = member.getBuildData();
        data.applyPostEffects();
        return data.stats.get('enemy__res_pyro');
    }

    function makeTeam(receivers, size) {
        const source = withSource(makeBuild('Kazuha'), [], [shred(receivers)]);
        source.modifyBuffsSettings({'custom_buffs.mastery': 800});
        const members = [source, makeBuild('Hutao'), makeBuild('Xingqiu')].slice(0, size);
        const team = Team.fromMember(members[0]);
        members.slice(1).forEach((member, i) => team.setMember(i + 1, member));
        return {team, members};
    }

    test.each([RECEIVERS.TEAM, RECEIVERS.OTHERS])("reaching %s changes the enemy once, the same for every member", (receivers) => {
        // With one teammate the effect has one instance that reaches the enemy.
        const pair = makeTeam(receivers, 2);
        const base = pair.team.view().getEnemy().stats.get('enemy_res_pyro');
        const once = enemyRes(pair.members[1]) - base;
        expect(once).toBeLessThan(0);

        const {members} = makeTeam(receivers, 3);
        for (const member of members) {
            expect(enemyRes(member) - base).toBeCloseTo(once, 10);
        }
    });
});
