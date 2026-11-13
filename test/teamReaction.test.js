import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactCandidateEvaluator } from "../src/js/classes/ArtifactCandidateEvaluator";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { BuildData } from "../src/js/classes/Build/Data";
import { Condition } from "../src/js/classes/Condition";
import { DamageGraph } from "../src/js/classes/DamageGraph";
import { CONTRIBUTION_WEIGHTS } from "../src/js/classes/Feature2/Compile/Types/Damage";
import { Rotation } from "../src/js/classes/Rotation";
import { ROTATION_SELF, ROTATION_TEAM } from "../src/js/classes/RotationCompiler";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeBuild, pinStats } from "./support/team";

global.DB = DB;

// Reactions the team deals together (Feature2/Reaction/Team): Lunar-Charged,
// Lunar-Crystallize, Stellar Swirl. Every member that takes part contributes
// what the reaction would deal as its own; every contributor rolls its own
// CRIT, and the values are ranked after the rolls: 60% of the highest, 30% of
// the second, 5% of each of the rest.
//
// Sources: KQM's Lunar and Stellar Glimmer reaction guides (the highest, 1/2
// and 1/12 on a rate of 1.8, 0.96 and 0.45: 60% of our 3, 1.6 and 0.75), and
// a published Lunar-Charged example, reproduced below. That the ranking
// follows the CRIT rolls is how the guides read ("whether the final damage is
// a CRIT is determined by whether the highest individual damage was"), not
// something they state outright.

const LUNAR_CHARGED = 'reaction.lunarcharged';
/** A member's contribution at the first rank: the row with a rank weight of its own. */
const RANK_ROWS = {
    'reaction.lunarcharged': 'reaction.lunarcharged_contrubution',
    'reaction.lunarcrystallize': 'reaction.lunarcrystallize_contrubution',
    'reaction.stellarswirl_anemo': 'reaction.stellarswirl_anemo_contribution',
    'reaction.stellarswirl_vortex_1': 'reaction.stellarswirl_vortex_1_contribution',
    'reaction.stellarswirl_vortex_2': 'reaction.stellarswirl_vortex_2_contribution',
};

function makeTeam(...charKeys) {
    const members = charKeys.map(makeBuild);
    const team = Team.fromMember(members[0]);
    members.slice(1).forEach((member, index) => team.setMember(index + 1, member));
    return {team, members};
}

function result(member, name) {
    return member.getFeatureResultByName(name);
}

/**
 * What a member contributes: the damage without and with a CRIT, and its
 * CRIT Rate, read from its row of the first rank.
 */
function contribution(member, feature = LUNAR_CHARGED) {
    const value = result(member, RANK_ROWS[feature]);
    return {
        normal: value.normal / CONTRIBUTION_WEIGHTS[0],
        crit: value.crit / CONTRIBUTION_WEIGHTS[0],
        rate: (value.average - value.normal) / (value.crit - value.normal),
    };
}

function ranked(values) {
    return [...values].sort((a, b) => b - a)
        .reduce((sum, value, index) => sum + value * CONTRIBUTION_WEIGHTS[Math.min(index, 2)], 0);
}

/** The team's reaction, by rolling every contributor's CRIT and sorting. */
function expected(contributions) {
    let average = 0;
    for (let mask = 0; mask < 1 << contributions.length; ++mask) {
        let chance = 1;
        const values = contributions.map((item, index) => {
            const crit = mask >> index & 1;
            chance *= crit ? item.rate : 1 - item.rate;
            return crit ? item.crit : item.normal;
        });
        average += chance * ranked(values);
    }
    return {
        normal: ranked(contributions.map((item) => item.normal)),
        crit: ranked(contributions.map((item) => item.crit)),
        average,
    };
}

function expectResult(value, target) {
    expect(value).toBeDefined();
    for (const key of ['normal', 'crit', 'average']) {
        expect(Math.abs(value[key] - target[key])).toBeLessThan(Math.max(1, Math.abs(target[key])) * 1e-9);
    }
}

/**
 * A feature of a member wearing its artifacts, as the artifact search
 * evaluates a candidate: by the plan it prepares once for the member.
 */
function planResult(member, featureName) {
    const artifacts = Object.values(member.getArtifacts()).filter(Boolean);
    const suggester = new ArtifactsSuggest({
        build: member,
        artifacts,
        featureName,
        featureType: 'average',
        settings: {sets_settings: {}, stats: {}, setMinValues: {}, setMaxValues: {}},
        limit: 20,
        useGPU: false,
        showBeta: true,
    });
    suggester.prepare();

    const result = {};
    for (const type of ['normal', 'crit', 'average']) {
        suggester.setOptimizationObjective(type);
        result[type] = suggester.evaluateArtifactCombination(artifacts);
    }
    return result;
}

function hit(member, feature, count = 1) {
    return {type: 'feature', charId: member.char.getId(), feature, count, reaction: 0};
}

function masteryArtifacts(value) {
    const mains = ['hp', 'atk', 'mastery', 'mastery', 'mastery'];
    return DB.Artifacts.Slots.getKeys().map((slot, index) => new Artifact(5, 20, slot, 'NoblesseOblige', mains[index],
        [{stat: 'mastery', value}, {stat: 'crit_rate', value: 10}]));
}

describe('Lunar-Charged of the team', () => {
    test('ranks the contributions of the members that take part, after their CRIT rolls', () => {
        const {members} = makeTeam('Ineffa', 'Fischl', 'Xingqiu', 'Bennet');
        const [ineffa, fischl, xingqiu, bennet] = members;

        // Pyro: the reaction is not Bennett's to trigger.
        expect(result(bennet, LUNAR_CHARGED)).toBeUndefined();

        const target = expected([ineffa, fischl, xingqiu].map((member) => contribution(member)));
        expect(target.average).toBeGreaterThan(target.normal);
        // One result for the team, whoever views it.
        for (const member of [ineffa, fischl, xingqiu]) {
            expectResult(result(member, LUNAR_CHARGED), target);
        }
    });

    test('reproduces a published example', () => {
        // Level 80; Ineffa 471 EM and 152.3% CRIT DMG, Xingqiu 105 EM and
        // 91.9%, Fischl 256 EM and 91.9%; Ineffa's Benediction at its cap
        // (+14% base); +40% Lunar-Charged DMG for all; RES multiplier 0.9.
        // Alone: 5,063 / 12,772, 3,382 / 6,490 and 4,141 / 7,946. All three
        // CRIT: 12,772 + 7,946 / 2 + 6,490 / 12 = 17,285.
        const {team, members} = makeTeam('Ineffa', 'Xingqiu', 'Fischl', 'Bennet');
        const builds = [[471, 152.3], [105, 91.9], [256, 91.9]];
        team.enemy.set(null);
        team.enemy.setResistances({electro: 10});
        members.slice(0, 3).forEach((member) => {
            member.setCharLevels({level: 80, ascension: 6, constellation: 0});
            member.modifyBuffsSettings({'custom_buffs.dmg_reaction_lunarcharged': 40});
        });
        pinStats([
            [members[0], 'atk', 2500],
            ...members.slice(0, 3).flatMap((member, index) => [
                [member, 'mastery', builds[index][0]],
                [member, 'crit_dmg', builds[index][1]],
            ]),
        ]);

        const published = [[5063, 12772], [3382, 6490], [4141, 7946]];
        members.slice(0, 3).forEach((member, index) => {
            const own = contribution(member);
            expect(Math.abs(own.normal * CONTRIBUTION_WEIGHTS[0] - published[index][0])).toBeLessThan(3);
            expect(Math.abs(own.crit * CONTRIBUTION_WEIGHTS[0] - published[index][1])).toBeLessThan(3);
        });
        expect(Math.abs(result(members[0], LUNAR_CHARGED).crit - 17285)).toBeLessThan(3);
    });

    test('of four contributors counts the third and the fourth for 5% each', () => {
        // Anemo takes part by swirling the elements.
        const {members} = makeTeam('Ineffa', 'Fischl', 'Xingqiu', 'Kazuha');
        const target = expected(members.map((member) => contribution(member)));
        for (const member of members) {
            expectResult(result(member, LUNAR_CHARGED), target);
        }
    });

    test('of a member alone is its contribution at the first rank', () => {
        const ineffa = makeBuild('Ineffa');
        Team.fromMember(ineffa);
        expectResult(result(ineffa, LUNAR_CHARGED), result(ineffa, RANK_ROWS[LUNAR_CHARGED]));

        // Data built outside a team's program reads only itself.
        const feature = DB.Features.Reactions.find((item) => item.getName() == LUNAR_CHARGED);
        const data = new BuildData({char_level: 90, char_element: 'electro', allowed_lunarcharged: 1, enemy_level: 90});
        const base = DB.Features.Reactions.find((item) => item.getName() == RANK_ROWS[LUNAR_CHARGED]);
        expect(feature.getResult(data)[LUNAR_CHARGED].normal)
            .toBeCloseTo(base.getResult(data)[RANK_ROWS[LUNAR_CHARGED]].normal, 6);
    });

    test('leaves out a member that is taken out', () => {
        const {members} = makeTeam('Ineffa', 'Fischl', 'Xingqiu', 'Bennet');
        const [ineffa, fischl, xingqiu] = members;
        xingqiu.setCharSettings({no_lunarcharged_contribution: true});

        expect(result(xingqiu, LUNAR_CHARGED)).toBeUndefined();
        const target = expected([ineffa, fischl].map((member) => contribution(member)));
        expectResult(result(ineffa, LUNAR_CHARGED), target);
        expectResult(result(fischl, LUNAR_CHARGED), target);

        // The control is saved with the member.
        const copy = xingqiu.clone();
        expect(copy.getSettings().no_lunarcharged_contribution).toBeTruthy();
    });

    test('follows a member overtaking a teammate', () => {
        const {members} = makeTeam('Ineffa', 'Fischl', 'Xingqiu', 'Bennet');
        const [ineffa, fischl, xingqiu] = members;
        const before = result(ineffa, LUNAR_CHARGED);

        fischl.replaceArtifacts(masteryArtifacts(100));
        const contributions = [ineffa, fischl, xingqiu].map((member) => contribution(member));
        // Fischl is now the highest: the 60% is hers.
        expect(contributions[1].normal).toBeGreaterThan(contributions[0].normal);
        expect(contributions[1].normal).toBeGreaterThan(contributions[2].normal);
        expectResult(result(ineffa, LUNAR_CHARGED), expected(contributions));
        expect(result(ineffa, LUNAR_CHARGED).normal).toBeGreaterThan(before.normal);
    });
});

describe("a team's reaction in the rotation", () => {
    function setup() {
        const {team, members} = makeTeam('Ineffa', 'Fischl', 'Xingqiu', 'Bennet');
        return {team, members, ineffa: members[0], fischl: members[1], xingqiu: members[2], bennet: members[3]};
    }

    test("counts in the team's total and in no member's own", () => {
        const {team, members, ineffa, fischl} = setup();
        team.setRotation(new Rotation({items: [hit(ineffa, LUNAR_CHARGED, 3), hit(fischl, 'attack.normal_hit_1', 2)]}));

        const single = result(ineffa, LUNAR_CHARGED);
        const normal = result(fischl, 'attack.normal_hit_1');
        for (const member of members) {
            const total = result(member, ROTATION_TEAM);
            for (const key of ['normal', 'crit', 'average']) {
                expect(total[key]).toBeCloseTo(single[key] * 3 + normal[key] * 2, 4);
            }
        }

        // Ineffa's only hit is the team's: she has none of her own.
        expect(result(ineffa, ROTATION_SELF)).toBeUndefined();
        expect(result(fischl, ROTATION_SELF).average).toBeCloseTo(normal.average * 2, 4);
    });

    test('is ranked with the team as it is at the hit', () => {
        const {team, members, ineffa, xingqiu} = setup();
        const control = Condition.unwrap(DB.Conditions.Character).find((cond) => cond.getName() == 'no_lunarcharged_contribution');
        const step = {
            type: 'condition', subtype: 'member', object: 'char',
            charId: xingqiu.char.getId(), itemId: xingqiu.char.getId(), conditionId: control.getId(), value: 1,
        };
        expect(Rotation.getConditionData(step, team).invalid).toBe(false);

        const all = result(ineffa, LUNAR_CHARGED);
        team.setRotation(new Rotation({items: [hit(ineffa, LUNAR_CHARGED), step, hit(ineffa, LUNAR_CHARGED)]}));
        const without = expected([members[0], members[1]].map((member) => contribution(member)));
        expect(result(ineffa, ROTATION_TEAM).average).toBeCloseTo(all.average + without.average, 4);

        // A saved rotation keeps the step.
        const loaded = Rotation.deserialize(team.getRotation().serialize());
        expect(loaded.getItems()[1].conditionId).toBe(control.getId());
    });

    test('keeps the rows with a rank weight of their own in saved rotations, and offers the team row', () => {
        const names = DB.Features.Reactions.map((item) => item.getName());
        for (const [teamRow, rankRow] of Object.entries(RANK_ROWS)) {
            for (const name of [teamRow, rankRow, rankRow + '_2', rankRow + '_12']) {
                expect(names).toContain(name);
                expect(DB.Features.Rotation.getByName(name)).toBeGreaterThan(0);
            }
            const byName = (name) => DB.Features.Reactions.find((item) => item.getName() == name);
            expect(byName(teamRow).isRotationChoice()).toBe(true);
            expect(byName(teamRow).isTeamHit()).toBe(true);
            expect(byName(rankRow).isRotationChoice()).toBe(false);
            expect(byName(rankRow).isTeamHit()).toBe(false);
        }
    });
});

describe("a team's reaction as a search target", () => {
    test.each([LUNAR_CHARGED, ROTATION_TEAM])('%s follows the candidate as a fresh view does', (target) => {
        const {team, members} = makeTeam('Ineffa', 'Fischl', 'Xingqiu', 'Bennet');
        const [ineffa, fischl] = members;
        team.setRotation(new Rotation({items: [hit(ineffa, LUNAR_CHARGED, 2), hit(fischl, 'attack.normal_hit_1')]}));

        // More Elemental Mastery on Fischl: her contribution rises through the ranks.
        const evaluator = new ArtifactCandidateEvaluator(target);
        const values = [];
        for (const mastery of [16, 60, 120]) {
            const candidate = fischl.clone();
            candidate.replaceArtifacts(masteryArtifacts(mastery));
            const value = evaluator.getResult(candidate);
            expectResult(value, candidate.view().getFeatureResultByName(target));
            // And as the artifact search's plan evaluates it.
            expectResult(planResult(candidate, target), value);
            values.push(value.average);
        }
        expect(values[1]).toBeGreaterThan(values[0]);
        expect(values[2]).toBeGreaterThan(values[1]);
    });

    test.each([LUNAR_CHARGED, ROTATION_TEAM])("%s keeps the cap of a teammate's CRIT Rate that the search cannot change", (target) => {
        const {team, members} = makeTeam('Ineffa', 'Fischl', 'Xingqiu', 'Bennet');
        const [ineffa, fischl] = members;
        // Ineffa's CRIT Rate is above 100%, and nothing of Fischl's changes
        // it: the search's plan folds what is constant to it, in Ineffa's
        // contribution and in her own hit.
        ineffa.modifyBuffsSettings({'custom_buffs.crit_rate': 100});
        team.setRotation(new Rotation({items: [hit(ineffa, LUNAR_CHARGED), hit(ineffa, 'attack.normal_hit_1')]}));
        fischl.replaceArtifacts(masteryArtifacts(60));

        const fresh = fischl.view().getFeatureResultByName(target);
        expect(fresh.average).toBeLessThan(fresh.crit);
        expectResult(planResult(fischl, target), fresh);
    });
});

describe('the other reactions of the team', () => {
    test('Lunar-Crystallize ranks its contributors', () => {
        const {members} = makeTeam('Zibai', 'Columbina', 'Xingqiu', 'Bennet');
        const feature = 'reaction.lunarcrystallize';
        const [zibai, columbina, xingqiu, bennet] = members;

        expect(result(bennet, feature)).toBeUndefined();
        const target = expected([zibai, columbina, xingqiu].map((member) => contribution(member, feature)));
        for (const member of [zibai, columbina, xingqiu]) {
            expectResult(result(member, feature), target);
        }
    });

    test('Stellar Swirl ranks its contributors, for the Anemo hit and for the Vortex', () => {
        const {team, members} = makeTeam('Vesna', 'Sandrone', 'Qiqi', 'Bennet');
        const contributors = members.slice(0, 3);

        for (const [triggers, vortex, other] of [[1, 'reaction.stellarswirl_vortex_1', 'reaction.stellarswirl_vortex_2'],
            [3, 'reaction.stellarswirl_vortex_2', 'reaction.stellarswirl_vortex_1']]) {
            team.modifySettings({stellarswirl_vortex_triggers: triggers});
            for (const feature of ['reaction.stellarswirl_anemo', vortex]) {
                const target = expected(contributors.map((member) => contribution(member, feature)));
                for (const member of contributors) {
                    expectResult(result(member, feature), target);
                }
                expect(result(members[3], feature)).toBeUndefined();
            }
            expect(result(members[0], other)).toBeUndefined();
        }
    });

    test('flat damage is part of a contribution: its rank weight is of it too', () => {
        const {members} = makeTeam('Vesna', 'Sandrone', 'Qiqi', 'Mizuki');
        const mizuki = members[3];
        const feature = 'reaction.stellarswirl_anemo';
        const before = result(members[0], feature);

        // Mizuki's C1 adds flat damage to the team's Stellar Swirl.
        mizuki.setCharLevels({level: 90, ascension: 6, constellation: 1});
        mizuki.setCharSettings({mizuki_dreamdrifter: true, mizuki_in_mist_like_waters: true});
        const contributors = members.filter((member) => result(member, feature));
        expect(contributors.length).toBeGreaterThan(1);
        expect(result(members[0], feature).normal).toBeGreaterThan(before.normal);

        // The rows with a rank weight of their own weigh it as the team's row does.
        const target = expected(contributors.map((member) => contribution(member, feature)));
        for (const member of contributors) {
            expectResult(result(member, feature), target);
        }
    });
});

describe("the damage graph of a team's reaction", () => {
    test('has a node per contributor, its factors in its member lane', () => {
        const {members} = makeTeam('Ineffa', 'Fischl', 'Xingqiu', 'Bennet');
        const fischl = members[1];
        const graph = new DamageGraph(fischl.view(), LUNAR_CHARGED);
        const {result: total, values} = graph.evaluate();
        expectResult(total, result(fischl, LUNAR_CHARGED));
        expect(graph.hasCrit).toBe(true);

        const nodes = [...graph.nodes.values()];
        const contributions = nodes.filter((node) => node.kind == 'contribution');
        expect(contributions.map((node) => node.owner)).toEqual(['slot0', 'slot1', 'slot2']);
        // The result ranks the contributions: a row each, in the tree's order.
        const rows = graph.nodes.get('result').rows;
        expect(rows.map((row) => row.from)).toEqual(contributions.map((node) => node.id));
        expect(rows.map((row) => row.part)).toEqual([0, 1, 2]);
        expect(graph.nodes.get('result').formula).toBe('ranking');
        contributions.forEach((node, index) => {
            // What the member would deal alone, without a CRIT.
            expect(values.get(node.id)).toBeCloseTo(contribution(members[index]).normal, 6);
            expect(node.rows.length).toBeGreaterThan(2);
            for (const row of node.rows) {
                expect(graph.nodes.get(row.from).kind).toBe('factor');
                expect(graph.nodes.get(row.from).lane).toBe(node.owner);
            }
        });

        // Ineffa's Benediction is one source for the whole team: turned off,
        // every contribution loses its base bonus.
        const benediction = nodes.find((node) => node.kind == 'source' && node.toggle && node.lane == 'slot0'
            && node.adds.some((add) => /lunarcharged_multi$/.test(add.stat)));
        const bonus = graph.contributions.final.get('lunarcharged_multi');
        expect(bonus).toBeGreaterThan(0);
        const without = graph.evaluateResult(new Set([benediction.sourceKey]));
        for (const key of ['normal', 'crit', 'average']) {
            expect(without[key]).toBeCloseTo(total[key] / (1 + bonus), 6);
        }
    });

    test('of a row with a rank weight of its own has the weight as a factor', () => {
        const {members} = makeTeam('Vesna', 'Sandrone', 'Qiqi', 'Bennet');
        const name = RANK_ROWS['reaction.stellarswirl_anemo'];
        const graph = new DamageGraph(members[0].view(), name);
        const {result: total, values} = graph.evaluate();
        expectResult(total, result(members[0], name));

        const weight = [...graph.nodes.values()].find((node) => node.kind == 'factor' && node.ast.comment == 'reaction_contribution');
        expect(values.get(weight.id)).toBeCloseTo(CONTRIBUTION_WEIGHTS[0], 9);
        expect(graph.nodes.get('result').rows.map((row) => row.from)).toContain(weight.id);
    });

    test('ranks the contributions: a weight each, and what each adds to every result', () => {
        const {members} = makeTeam('Ineffa', 'Fischl', 'Xingqiu', 'Bennet');
        // More Elemental Mastery on Fischl: she is the highest whatever the
        // CRIT rolls. Ineffa is the second with a CRIT and the third without.
        members[1].replaceArtifacts(masteryArtifacts(100));
        const graph = new DamageGraph(members[0].view(), LUNAR_CHARGED);
        const {result: total, formulas} = graph.evaluate();
        const {parts} = formulas.get('result');
        const own = members.slice(0, 3).map((member) => contribution(member));
        expect(own[0].crit).toBeGreaterThan(own[2].crit);
        expect(own[0].normal).toBeLessThan(own[2].normal);

        expect(parts.map((part) => part.normal.weight)).toEqual([0.05, 0.6, 0.3]);
        expect(parts.map((part) => part.crit.weight)).toEqual([0.3, 0.6, 0.05]);
        parts.forEach((part, index) => {
            expect(part.value).toBeCloseTo(own[index].normal, 6);
            expect(part.normal.share).toBeCloseTo(part.normal.weight * own[index].normal, 6);
            expect(part.crit.share).toBeCloseTo(part.crit.weight * own[index].crit, 6);
        });
        for (const key of ['normal', 'crit', 'average']) {
            expect(parts.reduce((sum, part) => sum + part[key].share, 0)).toBeCloseTo(total[key], 6);
            expect(parts.reduce((sum, part) => sum + part[key].weight, 0)).toBeCloseTo(0.95, 9);
        }
        // On average Ineffa takes the second rank from Xingqiu as often as she lands a CRIT.
        expect(parts[0].average.weight).toBeCloseTo(0.05 + 0.25 * own[0].rate, 9);
        expect(parts[1].average.weight).toBeCloseTo(0.6, 9);
        expect(parts[2].average.weight).toBeCloseTo(0.3 - 0.25 * own[0].rate, 9);
    });
});
