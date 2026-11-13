import { Artifact } from "../src/js/classes/Artifact";
import { CalcSet } from "../src/js/classes/CalcSet";
import { ConditionBoolean } from "../src/js/classes/Condition/Boolean";
import { PostEffectStatsMastery } from "../src/js/classes/PostEffect/Stats/Mastery";
import { Rotation } from "../src/js/classes/Rotation";
import { RotationCompiler } from "../src/js/classes/RotationCompiler";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { TeamEvaluation } from "../src/js/classes/Team/Evaluation";
import { RECEIVERS } from "../src/js/classes/Team/Receivers";
import { DB } from "../src/js/db/DB";
import { makeBuild, withSource } from "./support/team";

global.DB = DB;

// Nothing in the model caches an evaluation. Only a team is evaluated. A
// view of a team (the app keeps one per refresh) evaluates its state once for
// all its members' readers; a build's own read methods always evaluate the
// build's team as it is.

const HIT = 'attack.normal_hit_1';

function makeTeam() {
    const a = makeBuild('Hutao');
    const b = makeBuild('Bennet');
    const c = makeBuild('Kazuha');
    const team = Team.fromMember(a);
    team.setMember(1, b);
    team.setMember(2, c);
    return {team, a, b, c};
}

/** The member's data from an evaluation made for the check. */
function freshData(member) {
    return member.team.evaluate().member(member).programData();
}

/** Settings passes run while a function runs, as "character:own|source|full". */
function passes(run) {
    const resolve = TeamEvaluation.prototype.resolve;
    const result = [];
    TeamEvaluation.prototype.resolve = function (member, sourceSettings, initialSettings, recordSources) {
        const kind = recordSources ? 'full' : sourceSettings ? 'source' : 'own';
        result.push(member.char.object.name + ':' + kind);
        return resolve.apply(this, arguments);
    };
    try {
        run();
    } finally {
        TeamEvaluation.prototype.resolve = resolve;
    }
    return result;
}

test("the readers of one view share one evaluation", () => {
    const {a} = makeTeam();
    const view = a.view();

    view.getBuildData();
    expect(passes(() => {
        view.getBuildData();
        view.getStats();
        view.getSettings();
        view.stackSources();
        view.getFeatureByName(HIT);
    })).toEqual([]);
});

test("one evaluation of a team serves every member's view", () => {
    const {team, a, b, c} = makeTeam();
    const view = team.view();

    view.member(a).getBuildData();
    expect(passes(() => {
        view.member(b).getBuildData();
        view.member(c).getStats();
        view.member(b).getSettings();
        view.member(c).getPartySettings();
        view.getEnemy();
    })).toEqual([]);

    // Each member reads its own data from it, in its own namespace.
    expect(view.member(b)).toBe(view.member(b));
    expect({...view.member(b).getBuildData().stats}).toEqual({...freshData(b).stats});
    expect({...view.member(c).getBuildData().stats}).toEqual({...freshData(c).stats});
    expect(view.member(b).getBuildData().stats.get('m1__atk_base')).toBe(freshData(a).stats.get('atk_base'));
});

test("a view of a team reads only its members", () => {
    const {team} = makeTeam();
    expect(() => team.view().member(makeBuild('Nahida'))).toThrow(/not a member/);
});

test("a view compiles the rotation once", () => {
    const {team, a} = makeTeam();
    team.setRotation(new Rotation({items: [{id: 1, type: 'feature', charId: a.char.getId(), feature: HIT, count: 1, reaction: 0}]}));

    const compile = jest.spyOn(CalcSet.prototype, 'rotationFeatures');
    try {
        const view = a.view();
        view.getFeaturesHash(view.getBuildData());
        view.getFeatureByName(HIT);
        view.calcFeatures();
        expect(compile).toHaveBeenCalledTimes(1);
    } finally {
        compile.mockRestore();
    }
});

describe("a build's own reads see every change", () => {
    const changes = {
        "viewed member's levels": ({a}) => a.setCharLevels({level: 50, ascension: 2, constellation: 1}),
        "teammate's talents": ({b}) => b.setCharSkills({attack: 1, elemental: 1, burst: 1}),
        "teammate's weapon levels": ({b}) => b.setWeaponLevels({level: 20, ascension: 0, refine: 5}),
        "teammate's weapon": ({c}) => c.setWeapon(DB.Weapons.get('sword').getFirst(true)),
        "teammate's artifact": ({c}) => c.setArtifact(new Artifact(5, 20, 'sands', 'ViridescentVenerer', 'mastery', [])),
        "teammate's artifact edited in place": ({a}) => { a.artifacts.artifacts.sands = new Artifact(5, 20, 'sands', 'GladiatorsFinale', 'atk_percent', []); },
        "teammate's buffs": ({b}) => b.modifyBuffsSettings({'custom_buffs.atk': 100}),
        "a team toggle": ({team}) => team.modifySettings({polestar_field: true}),
        "the enemy": ({team}) => team.enemy.setLevels({level: 10}),
        "the on-field member": ({team, b}) => team.setOnFieldMember(b),
        "slot order": ({team}) => team.swapMembers(1, 2),
        "a removed member": ({team}) => team.removeMember(2),
    };

    test.each(Object.keys(changes))("%s", (name) => {
        const context = makeTeam();
        context.a.getBuildData();

        changes[name](context);

        expect({...context.a.getBuildData().stats}).toEqual({...freshData(context.a).stats});
    });
});

test("data handed out is the caller's own", () => {
    const {a} = makeTeam();
    const view = a.view();

    const first = view.getBuildData();
    first.addSettings({test_added: 1});
    first.stats.add('atk', 1000);

    const second = view.getBuildData();
    expect(second.settings.test_added).toBeUndefined();
    expect(second.stats.get('atk')).toBe(freshData(a).stats.get('atk'));
});

test("saving a team evaluates nothing", () => {
    const {team} = makeTeam();
    expect(passes(() => team.serialize())).toEqual([]);
});

test("a rotation without features compiles to nothing without copying the team", () => {
    const {a} = makeTeam();
    const clone = jest.spyOn(Team.prototype, 'cloneWithArtifactSettings');
    try {
        expect(a.rotationFeatures()).toEqual([]);
        expect(clone).not.toHaveBeenCalled();
    } finally {
        clone.mockRestore();
    }
});

describe("stack sources list the members that could supply a key", () => {
    const noblesse = () => new ConditionBoolean({
        name: 'test.noblesse',
        receivers: RECEIVERS.TEAM,
        stack: 'test_noblesse',
        stats: {atk_percent: 20},
    });
    const mastery = () => new PostEffectStatsMastery({
        receivers: RECEIVERS.TEAM,
        stack: 'test_mastery',
        percent: new StatTable('dmg_all', [0.01]),
        condition: new ConditionBoolean({name: 'test.mastery'}),
    });

    function makeStackTeam(bSettings) {
        const a = withSource(makeBuild('Hutao'), [noblesse()], [mastery()], {'test.noblesse': true, 'test.mastery': true});
        const b = withSource(makeBuild('Kazuha'), [noblesse()], [mastery()], bSettings);
        const team = Team.fromMember(a);
        team.setMember(1, b);
        return {team, a, b};
    }

    test("an active effect of a later slot is a candidate", () => {
        const {team, a, b} = makeStackTeam({'test.noblesse': true, 'test.mastery': true});
        expect(team.stackGroups().map((group) => [group.key, group.sources, group.source]))
            .toEqual([['test_noblesse', [a, b], a], ['test_mastery', [a, b], a]]);

        const ledger = a.view().stackSources();
        expect(ledger.getSources('test_noblesse')).toEqual(new Set([a]));
        expect(ledger.getYielded('test_noblesse')).toEqual(new Set([b]));
        expect(ledger.getSources('test_mastery')).toEqual(new Set([a]));
        expect(ledger.getYielded('test_mastery')).toEqual(new Set([b]));
    });

    test("a yielded effect that is switched off is not", () => {
        const {a, b} = makeStackTeam({'test.noblesse': true, 'test.mastery': true});
        b.static.modifySettings({'test.noblesse': false, 'test.mastery': false});

        const ledger = a.view().stackSources();
        expect(ledger.getYielded('test_noblesse').size).toBe(0);
        expect(ledger.getYielded('test_mastery').size).toBe(0);
    });

    test("reading the candidates changes nothing", () => {
        const {team, a, b} = makeStackTeam({'test.noblesse': true, 'test.mastery': true});
        const settings = [a.getSettings(), b.getSettings()];
        a.view().stackSources();
        team.stackGroups();
        expect([a.getSettings(), b.getSettings()]).toEqual(settings);
        expect(team.stackChoices).toEqual({});
    });
});

test("a view of the team compiles its rotation once for every member", () => {
    const {team, a, b} = makeTeam();
    team.setRotation(new Rotation({items: [
        {type: 'feature', charId: a.char.getId(), feature: 'attack.normal_hit_1', count: 1, reaction: 0},
        {type: 'feature', charId: b.char.getId(), feature: 'attack.normal_hit_1', count: 1, reaction: 0},
    ]}));
    const compile = jest.spyOn(RotationCompiler.prototype, 'compile');
    try {
        const view = team.view();
        const totals = [a, b].map((member) => view.member(member).getFeatureResultByName('rotation.total').average);
        expect(totals[1]).toBeCloseTo(totals[0], 6);
        expect(compile).toHaveBeenCalledTimes(1);
    } finally {
        compile.mockRestore();
    }
});
