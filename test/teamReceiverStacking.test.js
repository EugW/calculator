import { Condition } from "../src/js/classes/Condition";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { PostEffectStatsAtk } from "../src/js/classes/PostEffect/Stats/Atk";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { RECEIVERS } from "../src/js/classes/Team/Receivers";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, makeSolo, stackSource, withSource } from "./support/team";

global.DB = DB;
const key = 'test_receiver_stack';
const routing = {receivers: RECEIVERS.TEAM, stack: key, stackScope: 'receiver'};

function source(char, kind, value) {
    return withSource(makeBuild(char),
        kind === 'condition' ? [new Condition({...routing, stats: {atk_percent: value}})] : [],
        kind === 'post-effect' ? [new PostEffectStatsAtk({...routing, percent: new StatTable('dmg_all', [value / 1000])})] : [],
        {},
        kind === 'multiplier' ? [new FeatureMultiplier({...routing, values: new StatTable('test_' + char, [value])})] : [],
    );
}

test.each(['condition', 'post-effect', 'multiplier'])("%s can yield to one recipient while supplying another", (kind) => {
    const first = source('Hutao', kind, 20);
    const second = source('Kazuha', kind, 40);
    const third = makeBuild('Ayaka');
    const team = Team.fromMember(first);
    team.setMember(1, second);
    // A new recipient has no choice: the earliest slot supplies it.
    team.setMember(2, third);
    expect(team.stackSources().getConflicts()).toEqual([]);
    expect(stackSource(team, key, third)).toBe(first);

    // A choice is per recipient.
    team.setStackSource(key, second, first);
    expect(stackSource(team, key, first)).toBe(second);
    expect(stackSource(team, key, second)).toBe(first);
    expect(stackSource(team, key, third)).toBe(first);
    expect(team.stackSources().getConflicts()).toEqual([]);

    if (kind === 'condition') {
        expect(finalStats(first).get('atk_percent') - finalStats(makeSolo('Hutao')).get('atk_percent')).toBeCloseTo(0.4, 10);
        expect(finalStats(third).get('atk_percent') - finalStats(makeSolo('Ayaka')).get('atk_percent')).toBeCloseTo(0.2, 10);
    } else if (kind === 'post-effect') {
        expect(finalStats(first).get('dmg_all')).toBeCloseTo(finalStats(second).getTotalPercent('atk') * 0.0004, 10);
        expect(finalStats(third).get('dmg_all')).toBeCloseTo(finalStats(first).getTotalPercent('atk') * 0.0002, 10);
    } else {
        const names = (member) => member.getBuildData().multipliers.filter((item) => item.stack === key).map((item) => item.getName());
        expect(names(first)).toEqual(['test_Kazuha']);
        expect(names(third)).toEqual(['test_Hutao']);
    }
});
