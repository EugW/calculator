import { BuildData } from '../src/js/classes/Build/Data';
import { PostEffectStats } from '../src/js/classes/PostEffect/Stats';
import { StatTable } from '../src/js/classes/StatTable';
import { Stats } from '../src/js/classes/Stats';
import { Team, serializeWorkerMember, deserializeWorkerMember } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { makeBuild, finalStats } from './support/team';

global.DB = DB;

test.each([
    ['Eula', 'claymore', 'Akoumaru'],
    ['Fischl', 'bow', 'MouunsMoon'],
    ['Xiangling', 'polearm', 'WavebreakersFin'],
])('%s Watatsumi weapon sums real teammates and survives copies', (char, type, weapon) => {
    const member = makeBuild(char);
    member.setWeapon(DB.Weapons.get(type).get(weapon));
    const team = Team.fromMember(member);
    team.setMember(1, makeBuild('RaidenShogun'));
    team.setMember(3, makeBuild('Ayaka'));
    const expected = team.getMembers().reduce((sum, m) => sum + m.getBuildData().stats.get('burst_energy_cost'), 0) * 0.0012;
    for (const copy of [member, member.clone(), Team.deserialize(team.serialize()).getMember(0), deserializeWorkerMember(serializeWorkerMember(member))]) {
        expect(finalStats(copy).get('dmg_burst')).toBeCloseTo(expected, 12);
    }
    team.removeMember(3);
    expect(finalStats(member).get('dmg_burst')).toBeCloseTo(expected - 80 * 0.0012, 12);
    team.setMember(2, makeBuild('Skirk')); // zero Burst Energy cost
    expect(finalStats(member).get('dmg_burst')).toBeCloseTo(expected - 80 * 0.0012, 12);
});

test('a bounded post-effect pass preserves later stages and can resume once', () => {
    const data = new BuildData({}, new Stats({mastery: 100}));
    data.postEffects = [
        new PostEffectStats({from: 'mastery', percent: new StatTable('mastery', [1]), priority: 1}),
        new PostEffectStats({from: 'mastery', percent: new StatTable('atk', [0.5]), priority: 2}),
    ];
    data.applyPostEffects({maxPriority: 0});
    expect(data.stats.get('mastery')).toBe(100);
    expect(data.postEffects).toHaveLength(2);
    data.applyPostEffects({maxPriority: 1});
    expect(data.stats.get('mastery')).toBe(200);
    expect(data.stats.get('atk')).toBe(0);
    expect(data.postEffects).toHaveLength(1);
    data.applyPostEffects();
    expect(data.stats.get('atk')).toBe(100);
    expect(data.postEffects).toHaveLength(0);
    data.applyPostEffects();
    expect(data.stats.get('atk')).toBe(100);
});
