import { BUILD_FORMAT, CalcSet } from '../src/js/classes/CalcSet';
import { Rotation } from '../src/js/classes/Rotation';
import { RotationCompiler } from '../src/js/classes/RotationCompiler';
import { Team, serializeWorkerMember, deserializeWorkerMember } from '../src/js/classes/Team';
import { teamSettings } from '../src/js/classes/Team/Scope';
import { DB } from '../src/js/db/DB';
import { enemyOf, makeBuild, finalStats, featureValues, enemyChange, teamOf } from './support/team';

global.DB = DB;

function setup() {
    const team = Team.fromMember(makeBuild('Ayaka'));
    team.setMember(2, makeBuild('Fischl'));
    return team;
}

test('field controls are shared and survive team copies and transport', () => {
    const team = setup();
    const first = team.getMember(0);
    const second = team.getMember(2);
    // They are the team's: a member cannot change them.
    expect(() => first.modifyBuffsSettings({polestar_field: true})).toThrow(/team's setting/);
    team.modifySettings({polestar_field: true, polestar_included_hits: 5, stellarswirl_vortex_triggers: 3});
    for (const copy of [team, team.clone(), Team.deserialize(team.serialize()), deserializeWorkerMember(serializeWorkerMember(second)).team]) {
        for (const member of copy.getMembers()) {
            expect(teamOf(member).polestar_field).toBe(true);
            expect(teamOf(member).polestar_included_hits).toBe(5);
            expect(teamOf(member).stellarswirl_vortex_triggers).toBe(3);
            // Team state is read, never copied into a member.
            expect(member.getSettings().polestar_field).toBeUndefined();
            expect(enemyChange(member, 'enemy_res_phys')).toBeCloseTo(-0.4);
        }
    }
    team.modifySettings({polestar_field: false});
    expect(teamOf(first).polestar_field).toBe(false);
    expect(enemyChange(first, 'enemy_res_phys')).toBe(0);
});

test('member state stays independent, enemy status has one owner', () => {
    const team = setup();
    const [first, second] = team.getMembers();
    // The shield is field state instead, see teamPartySetup.
    first.modifyBuffsSettings({'common.bond_of_life': 30});
    expect(second.getSettings()['common.bond_of_life']).toBeFalsy();
    // The enemy's status is the enemy's: a member cannot change it.
    expect(() => first.setWeaponSettings({'common.enemy_status': 'cryo'})).toThrow(/team's setting/);
    team.enemy.modifySettings({'common.enemy_status': 'cryo'});
    expect(enemyOf(second)['common.enemy_status']).toBe('cryo');
    team.enemy.modifySettings({'common.enemy_status': 'pyro'});
    expect(enemyOf(first)['common.enemy_status']).toBe('pyro');
    expect(enemyOf(Team.deserialize(team.serialize()).getMember(0))['common.enemy_status']).toBe('pyro');
    // The enemy's state is read by members, never copied into their settings.
    expect(first.getSettings()['common.enemy_status']).toBeUndefined();
});

test('character format omits the environment; evaluation copies and workers preserve it', () => {
    const build = makeBuild('Ayaka');
    const own = Team.fromMember(build);
    own.enemy.setLevels({level: 104});
    own.modifySettings({polestar_field: true, polestar_included_hits: 8});
    own.enemy.modifySettings({'common.enemy_status': 'cryo'});
    expect(build.serialize()[0]).toBe(BUILD_FORMAT);
    const character = CalcSet.deserialize(build.serialize());
    expect(character.team).toBeNull();
    expect(character.getSettings().polestar_field).toBeFalsy();
    // On its own it is evaluated in a new team of one.
    expect(enemyOf(Team.solo(character))['common.enemy_status']).toBeFalsy();
    expect(enemyOf(Team.solo(character)).enemy_level).toBe(1);
    for (const copy of [build.clone(), deserializeWorkerMember(serializeWorkerMember(build))]) {
        expect(featureValues(copy)).toEqual(featureValues(build));
        expect(enemyOf(copy).enemy_level).toBe(104);
        expect(enemyOf(copy)['common.enemy_status']).toBe('cryo');
    }
    const team = setup();
    team.modifySettings({polestar_field: true});
    const imported = team.importMember(0, build);
    expect(teamOf(imported).polestar_included_hits).toBe(0);
    expect(enemyOf(imported).enemy_level).toBe(team.enemy.getLevels().level);
});

test('rotation field changes update the copied team without changing the original', () => {
    const team = setup();
    const build = team.getMember(0);
    const teammate = team.getMember(2);
    const polestar = DB.Buffs.getList().filter((item) => item.isParty()).flatMap((item) => item.getConditions())
        .find((cond) => cond.getName() == 'polestar_field');
    team.setRotation(new Rotation({items: [
        {type: 'condition', subtype: 'buffs', itemId: 0, conditionId: polestar.getId(), value: 1},
        {type: 'feature', charId: teammate.char.getId(), feature: 'attack.normal_hit_1', count: 1, reaction: 0},
    ]}));
    const {items} = new RotationCompiler(build.team).compile();
    // After the step, the copy's team has the field, for every member.
    const state = items.filter((item) => item.type == 'state').pop();
    expect(teamSettings(state.members.get(2).settings).polestar_field).toBe(true);
    expect(teamOf(build).polestar_field).toBe(false);
});

test('exported controls survive a temporarily absent field and activate on import', () => {
    const source = makeBuild('Cyno');
    source.setCharLevels({level: 90, ascension: 6, constellation: 1});
    Team.fromMember(source).modifySettings({polestar_field: true});
    source.setCharSettings({cyno_radiance_stellarconduct: true, cyno_together_we_rise: true});
    const character = source.characterBuild();
    expect(character.getSettings().polestar_field).toBeFalsy();
    expect(character.char.getSettings().cyno_radiance_stellarconduct).toBe(true);
    expect(character.serialize()).toEqual(source.serialize());
    const team = setup();
    team.modifySettings({polestar_field: true});
    const receiver = team.getMember(0);
    const before = finalStats(receiver).get('mastery');
    team.importMember(1, character);
    expect(finalStats(receiver).get('mastery') - before).toBe(200);
});
