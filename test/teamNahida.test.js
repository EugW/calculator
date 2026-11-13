import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactsSuggest } from "../src/js/classes/ArtifactsSuggest";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

const A1 = {nahida_illusory_heart: true, nahida_compassion_illuminated: true};

function totalMastery(member) {
    const stats = finalStats(member);
    return stats.get('mastery_base') + stats.get('mastery');
}

function setup() {
    const alhaitham = makeBuild('Alhaitham');
    const nahida = makeBuild('Nahida');
    const team = Team.fromMember(alhaitham);
    team.setMember(1, nahida);
    return {team, alhaitham, nahida};
}

function a1Gain(member, nahida) {
    nahida.setCharSettings({});
    const before = totalMastery(member);
    nahida.setCharSettings(A1);
    return totalMastery(member) - before;
}

describe("Nahida's Compassion Illuminated", () => {
    // Totals are matched with the A1 off, so they do not include it.
    function totals(nahida, alhaitham, nahidaTotal, alhaithamTotal) {
        nahida.setCharSettings({});
        matchCarrierTotals(nahida, {mastery_total: nahidaTotal});
        matchCarrierTotals(alhaitham, {mastery_total: alhaithamTotal});
    }

    test("gives the on-field member 25% of the team's highest Elemental Mastery", () => {
        const {alhaitham, nahida} = setup();
        totals(nahida, alhaitham, 800, 300);
        expect(a1Gain(alhaitham, nahida)).toBeCloseTo(200, 6);
        expect(a1Gain(nahida, nahida)).toBeCloseTo(0, 6);

        // The highest member can be the receiver itself.
        totals(nahida, alhaitham, 100, 600);
        expect(a1Gain(alhaitham, nahida)).toBeCloseTo(150, 6);
    });

    test("is capped at 250", () => {
        const {alhaitham, nahida} = setup();
        totals(nahida, alhaitham, 2000, 300);
        expect(a1Gain(alhaitham, nahida)).toBeCloseTo(250, 6);
    });

    test("goes to Nahida when she is on-field", () => {
        const {team, alhaitham, nahida} = setup();
        totals(nahida, alhaitham, 100, 600);
        team.setOnFieldMember(nahida);
        expect(a1Gain(nahida, nahida)).toBeCloseTo(150, 6);
        expect(a1Gain(alhaitham, nahida)).toBeCloseTo(0, 6);
    });

    test("reads the team's Elemental Mastery before its own bonus", () => {
        // 25% of 400, not of the 500 the receiver ends with.
        const {alhaitham, nahida} = setup();
        totals(nahida, alhaitham, 100, 400);
        expect(a1Gain(alhaitham, nahida)).toBeCloseTo(100, 6);
        expect(totalMastery(alhaitham)).toBeCloseTo(500, 6);
    });

    test("a Nahida on her own reads her own Elemental Mastery", () => {
        const nahida = makeBuild('Nahida');
        Team.fromMember(nahida);
        matchCarrierTotals(nahida, {mastery_total: 400});
        expect(a1Gain(nahida, nahida)).toBeCloseTo(100, 6);
    });
});

describe("the optimizer with the team's highest Elemental Mastery", () => {
    test("suggestions match direct evaluation, the teammate's value folded", () => {
        const {alhaitham, nahida} = setup();
        nahida.setCharSettings(A1);
        matchCarrierTotals(nahida, {mastery_total: 500});

        const setId = DB.Artifacts.Sets.getKeys(true).find((key) => {
            const set = DB.Artifacts.Sets.get(key);
            return set.minRarity <= 5 && set.maxRarity >= 5 && !set.getConditionsByPieces().some((conditions) => {
                return conditions && conditions.some((cond) => cond && cond.isSerializable && cond.isSerializable());
            });
        });
        const mains = {flower: ['hp'], plume: ['atk'], sands: ['mastery', 'atk_percent'], goblet: ['mastery', 'dmg_dendro'], circlet: ['mastery', 'crit_dmg']};
        const artifacts = [];
        for (const [slot, list] of Object.entries(mains)) {
            for (const main of list) artifacts.push(new Artifact(5, 20, slot, setId, main, []));
        }

        const featureName = Object.entries(alhaitham.calcFeatures(1))
            .find(([name, result]) => /^attack\./.test(name) && result.isDamage && result.normal > 0)[0];
        const suggester = new ArtifactsSuggest({
            build: alhaitham,
            artifacts,
            featureName,
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
            const build = alhaitham.clone();
            build.clearArtifacts();
            result.artifacts.forEach((artifact) => build.setArtifact(artifact));
            const expected = build.calcFeatures(1)[featureName].normal;
            expect(Math.abs(result.value - expected)).toBeLessThan(Math.max(1, expected) * 1e-6);
        }
    });
});
