import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { Condition } from "../src/js/classes/Condition";
import { Rotation } from "../src/js/classes/Rotation";
import { ROTATION_SELF, ROTATION_TEAM } from "../src/js/classes/RotationCompiler";
import { PRIORITIES } from "../src/js/classes/PostEffect";
import { PostEffectStatsMastery } from "../src/js/classes/PostEffect/Stats/Mastery";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { RECEIVERS } from "../src/js/classes/Team/Receivers";
import { DB } from "../src/js/db/DB";
import { makeBuild } from "./support/team";

global.DB = DB;

const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const EPSILON = 1e-6;

// The effects are attached to the first weapon of each weapon type, so they
// survive the serialize/deserialize copies the optimizer makes.
function attachChain() {
    const polearm = DB.Weapons.get('polearm').getFirst(true);
    const sword = DB.Weapons.get('sword').getFirst(true);

    // The viewed member (polearm) gives the others 30% of its EM as EM.
    polearm.postEffects.push(new PostEffectStatsMastery({
        receivers: RECEIVERS.OTHERS,
        percent: new StatTable('mastery', [0.3]),
        priority: PRIORITIES.STAT_LOCAL,
    }));

    // The teammate (sword) gives the others 0.1% DMG Bonus per point of EM.
    sword.postEffects.push(new PostEffectStatsMastery({
        receivers: RECEIVERS.OTHERS,
        percent: new StatTable('dmg_all', [0.1]),
        priority: PRIORITIES.STAT_GLOBAL,
    }));
}

function fillerSetId() {
    return DB.Artifacts.Sets.getKeys(true).find((setId) => {
        const set = DB.Artifacts.Sets.get(setId);
        const hasConditions = set.getConditionsByPieces().some((conditions) => {
            return conditions && conditions.some((cond) => cond && cond.isSerializable && cond.isSerializable());
        });
        return set.minRarity <= 5 && set.maxRarity >= 5 && !hasConditions;
    });
}

function makePool(setId) {
    const mains = {
        flower: ['hp'],
        plume: ['atk'],
        sands: ['mastery', 'atk_percent'],
        goblet: ['mastery', 'dmg_pyro'],
        circlet: ['mastery', 'crit_dmg'],
    };
    const result = [];
    for (const slot of SLOTS) {
        for (const main of mains[slot]) {
            result.push(new Artifact(5, 20, slot, setId, main, []));
        }
    }
    return result;
}

function evaluate(member, artifacts, featureName) {
    const build = member.clone();
    build.clearArtifacts();
    for (const artifact of artifacts) {
        build.setArtifact(artifact);
    }
    return build.calcFeatures(1)[featureName];
}

test("the optimizer scores a member through a chain that passes a teammate", () => {
    attachChain();

    const viewed = makeBuild('Hutao');
    const teammate = makeBuild('Kazuha');
    const team = Team.fromMember(viewed);
    team.setMember(1, teammate);

    const featureName = Object.entries(viewed.calcFeatures(1))
        .find(([name, result]) => /^attack\./.test(name) && result.isDamage && result.normal > 0)[0];
    const artifacts = makePool(fillerSetId());

    const suggester = new ArtifactsSuggest({
        build: viewed,
        artifacts: artifacts,
        featureName: featureName,
        featureType: 'normal',
        settings: {sets_settings: {}, stats: {}, setMinValues: {}, setMaxValues: {}},
        limit: 100,
        useGPU: false,
        showBeta: true,
    });
    suggester.prepare();
    const results = suggester.getResult(() => {});

    expect(results.length).toBe(8);

    for (const result of results) {
        const expected = evaluate(viewed, result.artifacts, featureName).normal;
        expect(Math.abs(result.value - expected)).toBeLessThan(Math.max(1, expected) * EPSILON);
    }

    // The chain is part of the objective: more EM on the viewed member means
    // more EM on the teammate and more DMG Bonus back on the viewed member.
    const masteryPieces = (result) => result.artifacts.filter((art) => art.mainStat == 'mastery').length;
    const allMastery = results.find((result) => masteryPieces(result) == 3);
    const alone = Team.solo(viewed.characterBuild());
    expect(allMastery.value).toBeGreaterThan(evaluate(alone, allMastery.artifacts, featureName).normal);
});

test("the optimizer scores a feature delivered by a teammate", () => {
    const viewed = makeBuild('Fischl');
    const nicole = makeBuild('Nicole');
    nicole.setCharLevels({level: 90, ascension: 6, constellation: 5});
    const team = Team.fromMember(viewed);
    team.setMember(1, nicole);

    const featureName = 'other.nicole_arcane_projection';
    const artifacts = makePool(fillerSetId());
    const suggester = new ArtifactsSuggest({
        build: viewed,
        artifacts: artifacts,
        featureName: featureName,
        featureType: 'normal',
        settings: {sets_settings: {}, stats: {}, setMinValues: {}, setMaxValues: {}},
        limit: 100,
        useGPU: false,
        showBeta: true,
    });
    suggester.prepare();
    const results = suggester.getResult(() => {});

    expect(results.length).toBe(8);
    for (const result of results) {
        const expected = evaluate(viewed, result.artifacts, featureName).normal;
        expect(expected).toBeGreaterThan(0);
        expect(Math.abs(result.value - expected)).toBeLessThan(expected * EPSILON);
    }
    // The receiver's ATK is what counts: ATK% sands beats EM sands.
    const best = results[0].artifacts.find((art) => art.slot == 'sands');
    expect(best.mainStat).toBe('atk_percent');
});

describe("the optimizer with the team's rotation", () => {
    // Kazuha's A4 (Pyro) raises Hu Tao's Pyro DMG from his Elemental
    // Mastery: in the team's total, Kazuha's artifacts count through her hits.
    function setup() {
        const hutao = makeBuild('Hutao');
        const kazuha = makeBuild('Kazuha');
        const team = Team.fromMember(hutao);
        team.setMember(1, kazuha);
        hutao.setCharSettings({hutao_paramita_papilio: true});

        const a4 = Condition.unwrap(DB.Chars.get('Kazuha').getAllConditions())
            .find((cond) => cond.getName() == 'kaedehara_kazuha_poetics_of_fuubutsu');
        const hit = (member, feature) => ({type: 'feature', charId: member.char.getId(), feature, count: 1, reaction: 0});
        team.setRotation(new Rotation({items: [
            hit(kazuha, 'skill.press_dmg'),
            {
                type: 'condition', subtype: 'member', charId: kazuha.char.getId(), object: 'char',
                itemId: kazuha.char.getId(), conditionId: a4.getId(),
                value: a4.getSelectedId({[a4.getName()]: ['pyro']}),
            },
            hit(hutao, 'attack.normal_hit_1'),
            hit(hutao, 'attack.charged_hit'),
        ]}));
        return {kazuha};
    }

    test.each([ROTATION_TEAM, ROTATION_SELF])("suggestions for %s match direct evaluation", (featureName) => {
        const {kazuha} = setup();
        const suggester = new ArtifactsSuggest({
            build: kazuha,
            artifacts: makePool(fillerSetId()),
            featureName: featureName,
            featureType: 'normal',
            settings: {sets_settings: {}, stats: {}, setMinValues: {}, setMaxValues: {}},
            limit: 100,
            useGPU: false,
            showBeta: true,
        });
        suggester.prepare();
        const results = suggester.getResult(() => {});

        expect(results.length).toBeGreaterThan(1);
        for (const result of results) {
            const expected = evaluate(kazuha, result.artifacts, featureName).normal;
            expect(Math.abs(result.value - expected)).toBeLessThan(Math.max(1, expected) * EPSILON);
        }
    });

    test("the team's total counts a teammate's hits that the member's stats raise", () => {
        const {kazuha} = setup();
        const mastery = [new Artifact(5, 20, 'sands', fillerSetId(), 'mastery', [])];
        const attack = [new Artifact(5, 20, 'sands', fillerSetId(), 'atk_percent', [])];

        const own = (artifacts) => evaluate(kazuha, artifacts, ROTATION_SELF).normal;
        const team = (artifacts) => evaluate(kazuha, artifacts, ROTATION_TEAM).normal;
        // Elemental Mastery does nothing for Kazuha's own Skill hit, but
        // raises Hu Tao's hits after his A4.
        expect(own(mastery)).toBeLessThan(own(attack));
        expect(team(mastery) - own(mastery)).toBeGreaterThan(team(attack) - own(attack));
    });
});

describe("a rotation evaluated for a candidate build", () => {
    test("is the candidate's own: set effects it captured are the candidate's", () => {
        const xiangling = makeBuild('Xiangling');
        const team = Team.fromMember(xiangling);
        team.setMember(1, makeBuild('Bennet'));
        for (const slot of SLOTS) {
            xiangling.setArtifact(new Artifact(5, 20, slot, fillerSetId(), slot == 'sands' ? 'recharge' : DB.Artifacts.Slots.get(slot).mainStats[0], []));
        }
        team.setRotation(new Rotation({items: [
            {type: 'feature', charId: xiangling.char.getId(), feature: 'burst.xiangling_pyronado', count: 1, reaction: 0},
        ]}));
        // A search takes the feature from its original build once.
        const feature = xiangling.getFeatureByName(ROTATION_TEAM);

        const candidate = xiangling.clone();
        candidate.artifacts.modifySets(Array(4).fill('EmblemofSeveredFate'));
        const own = candidate.getFeatureResultByName(ROTATION_TEAM).average;
        const stale = feature.getResult(candidate.getBuildData())[ROTATION_TEAM].average;

        // Emblem's Burst DMG Bonus is in the candidate's states only.
        expect(stale).toBeLessThan(own);
        expect(candidate.view().getResultOf(feature).average).toBeCloseTo(own, 6);
    });
});
