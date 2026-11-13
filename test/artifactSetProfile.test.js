import { Artifact } from "../src/js/classes/Artifact";
import { ArtifactCandidateEvaluator } from "../src/js/classes/ArtifactCandidateEvaluator";
import { controlDefault, deserializeProfile, resolveArtifactSetSettings, serializeProfile,
    setControlsOff, setProfileControls } from "../src/js/classes/ArtifactSetProfile";
import { CalcObjectArtifacts } from "../src/js/classes/CalcObject/Artifacts";
import { BUILD_FORMAT, CalcSet } from "../src/js/classes/CalcSet";
import { Serializer } from "../src/js/classes/Serializer";
import { Team, TEAM_FORMAT, deserializeWorkerMember, serializeWorkerMember } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { REL_TOL } from "./support/baseline";
import { decodeFormat2Build, finalStats, makeBuild } from "./support/team";
import legacy from "./fixtures/artifactProfileLegacy.json";

global.DB = DB;

const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
const MAINS = {flower: 'hp', plume: 'atk', sands: 'atk_percent', goblet: 'dmg_pyro', circlet: 'crit_rate'};
const NOBLESSE_4 = 'set.noblesse_oblige_4';
const VV_4 = 'set.viridescent_venerer_4';

function pieces(setId, count = 5) {
    return SLOTS.slice(0, count).map((slot) => new Artifact(5, 20, slot, setId, MAINS[slot], [
        {stat: 'crit_dmg', value: 14}, {stat: 'recharge', value: 11},
    ]));
}

function member(charKey, setId, count) {
    const build = makeBuild(charKey);
    Team.fromMember(build);
    if (setId) build.replaceArtifacts(pieces(setId, count));
    return build;
}

function features(build) {
    const result = {};
    for (const [name, value] of Object.entries(build.calcFeatures())) {
        if (value && typeof value.normal == 'number' && Number.isFinite(value.average)) {
            result[name] = [value.normal, value.crit, value.average];
        }
    }
    return result;
}

function expectFeatures(actual, expected, label, tolerance = 1e-9) {
    expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
    for (const [name, values] of Object.entries(expected)) {
        values.forEach((value, i) => {
            const diff = Math.abs(actual[name][i] - value);
            if (diff > Math.max(1, Math.abs(value)) * tolerance) {
                throw new Error(`${label}: ${name}[${i}] ${actual[name][i]} != ${value}`);
            }
        });
    }
}

describe("the set-bonus profile", () => {
    test("a control nobody set is on", () => {
        const byName = (setId, name) => setProfileControls(setId).find((entry) => entry.name == name).cond;
        expect(controlDefault(byName('NoblesseOblige', NOBLESSE_4))).toBe(true);
        expect(controlDefault(byName('ViridescentVenerer', VV_4))).toBe('cryo;electro;hydro;pyro');
        expect(controlDefault(byName('OceanHuedClam', 'accumulated_healing'))).toBe(30000);
        expect(controlDefault(byName('SongOfDaysPast', 'days_past_healing_recorded'))).toBe(15000);
        expect(controlDefault(byName('MarechausseeHunter', 'set.marechaussee_hunter_4'))).toBe(3);
        // A single element with no default: nothing is chosen for the user.
        expect(controlDefault(byName('ArchaicPetra', 'set_bonus.archaic_petra_4'))).toBe('');

        const build = member('Bennet', 'NoblesseOblige');
        expect(build.artifacts.getProfileSettings()).toEqual({});
        expect(build.getSettings()[NOBLESSE_4]).toBe(true);
    });

    test("stores only what differs from the defaults, false, zero and nothing selected included", () => {
        const build = member('Kazuha', 'ViridescentVenerer');
        build.setArtifactsSettings({[VV_4]: '', 'accumulated_healing': 0, [NOBLESSE_4]: true});
        expect(build.artifacts.getProfileSettings()).toEqual({[VV_4]: '', 'accumulated_healing': 0});
        expect(build.getSettings()[VV_4]).toBe('');

        // undefined or null resets a control.
        build.setArtifactsSettings({[VV_4]: undefined});
        expect(build.artifacts.getProfileSettings()).toEqual({'accumulated_healing': 0});
        expect(build.getSettings()[VV_4]).toBe('cryo;electro;hydro;pyro');
    });

    test("keeps a set's controls while it is unequipped; only worn sets reach evaluation", () => {
        const build = member('Bennet', 'NoblesseOblige');
        build.setArtifactsSettings({[NOBLESSE_4]: false});

        build.replaceArtifacts(pieces('GladiatorFinale'));
        expect(build.artifacts.getProfileSettings()).toEqual({[NOBLESSE_4]: false});
        expect(build.getSettings()).not.toHaveProperty(NOBLESSE_4);

        build.replaceArtifacts(pieces('NoblesseOblige', 4));
        expect(build.getSettings()[NOBLESSE_4]).toBe(false);
        // Two pieces do not reach the four-piece control.
        build.replaceArtifacts(pieces('NoblesseOblige', 2).concat(pieces('GladiatorFinale').slice(2)));
        expect(build.getSettings()).not.toHaveProperty(NOBLESSE_4);
    });

    test("writing back what evaluation reads changes nothing; piece counts are never stored", () => {
        const build = member('Bennet', 'NoblesseOblige');
        build.setArtifactsSettings({'accumulated_healing': 1234});
        const profile = build.artifacts.getProfileSettings();

        build.setArtifactsSettings(build.artifacts.getSettings());
        build.refreshCommonSettings();
        build.normalizeRadianceStellarGlimmerSettings();
        expect(build.artifacts.getProfileSettings()).toEqual(profile);
        expect(Object.keys(build.artifacts.settings).some((name) => name.startsWith('set_pieces.'))).toBe(false);
    });

    test("member state a worn set declares stays the member's and leaves with the set", () => {
        const build = member('Mualani', 'ObsidianCodex', 4);
        build.setArtifactsSettings({'common.nightsoul_blessing_state': true});
        expect(build.artifacts.getProfileSettings()).toEqual({});
        expect(build.getSettings()['common.nightsoul_blessing_state']).toBe(true);

        build.replaceArtifacts(pieces('GladiatorFinale'));
        expect(build.artifacts.settings).not.toHaveProperty('common.nightsoul_blessing_state');
    });

    test("switching a set off sets every control to its off value", () => {
        expect(setControlsOff('ViridescentVenerer')).toEqual({[VV_4]: ''});
        const build = member('Kazuha', 'ViridescentVenerer');
        build.setArtifactsSettings(setControlsOff('ViridescentVenerer'));
        expect(resolveArtifactSetSettings(build.artifacts.getProfileSettings(), {ViridescentVenerer: 4}))
            .toEqual({[VV_4]: ''});
    });
});

describe("saving the profile", () => {
    const profile = {[NOBLESSE_4]: false, [VV_4]: 'pyro', 'accumulated_healing': 12000,
        'set.marechaussee_hunter_4': 0, 'set_bonus.archaic_petra_4': 'hydro'};

    test("round-trips every control type, unworn sets included", () => {
        expect(deserializeProfile(serializeProfile(profile))).toEqual(profile);
        expect(deserializeProfile(serializeProfile({[VV_4]: ''}))).toEqual({[VV_4]: ''});
        expect(serializeProfile({})).toEqual([0]);
        expect(deserializeProfile([1, 99999, 1])).toBeNull();
    });

    test("in character builds, teams, workers and copies", () => {
        const build = member('Bennet', 'NoblesseOblige');
        const team = build.team;
        team.setMember(1, makeBuild('Kazuha'));
        build.setArtifactsSettings(profile);

        expect(build.serialize()[0]).toBe(BUILD_FORMAT);
        expect(Serializer.unpack(Serializer.pack(team))[0]).toBe(TEAM_FORMAT);
        const copies = [
            CalcSet.deserialize(build.serialize()),
            Team.deserialize(team.serialize()).getMember(0),
            deserializeWorkerMember(serializeWorkerMember(build)),
            build.clone(),
            build.cloneWithArtifactSettings(),
        ];
        for (const copy of copies) {
            expect(copy.artifacts.getProfileSettings()).toEqual(profile);
        }
    });

    test("a retired control still decodes and is dropped", () => {
        // Obsidian Codex's own four-piece toggle (42) in the released layout,
        // next to Nightsoul's Blessing (41), which it declares for the member.
        const input = [4, ...pieces('ObsidianCodex', 4).flatMap((art) => art.serialize()), 2, 41, 42];
        const artifacts = CalcObjectArtifacts.deserialize(input);
        expect(input).toEqual([]);
        expect(artifacts.settings).toEqual({'common.nightsoul_blessing_state': true});
    });
});

describe("builds saved before profiles", () => {
    test.each(legacy.scenarios.map((scenario) => [scenario.name, scenario]))("%s keeps its numbers", (name, scenario) => {
        const build = Team.solo(decodeFormat2Build(Serializer.unpack(scenario.packed)));
        // Viridescent Venerer's Stellar Swirl checkbox is gone and a saved one
        // is ignored: the shred it recorded is the Cryo choice now.
        if (scenario.settings && scenario.settings[VV_4 + '_stellarswirl']) {
            build.setArtifactsSettings({[VV_4]: 'cryo;' + build.getSettings()[VV_4]});
        }
        // The fixture is older than the tables of the released 7.2, whose
        // fourth decimals differ here and there (support/baseline.js, REL_TOL).
        expectFeatures(features(build), scenario.features[0], name, REL_TOL);
    });

    test("a worn control the old build did not hold was off, and stays off", () => {
        const scenario = legacy.scenarios.find((item) => item.name == 'Bennet NoblesseOblige unset');
        const build = decodeFormat2Build(Serializer.unpack(scenario.packed));
        expect(build.artifacts.getProfileSettings()).toEqual({[NOBLESSE_4]: false});
    });
});

test("Obsidian Codex's four-piece bonus follows Nightsoul's Blessing", () => {
    const build = member('Mualani', 'ObsidianCodex', 4);
    const critRate = () => finalStats(build).get('crit_rate');

    build.setArtifactsSettings({'common.nightsoul_blessing_state': false});
    const off = critRate();
    build.setArtifactsSettings({'common.nightsoul_blessing_state': true});
    expect(critRate() - off).toBeCloseTo(0.4, 9);
});

test("controls of sets that are not worn change nothing", () => {
    const plain = member('Furina', 'GladiatorFinale');
    const dormant = member('Furina', 'GladiatorFinale');
    dormant.setArtifactsSettings({[NOBLESSE_4]: false, 'accumulated_healing': 5000,
        'days_past_healing_recorded': 100, [VV_4]: ''});
    expect(dormant.artifacts.getProfileSettings()).not.toEqual({});
    expectFeatures(features(dormant), features(plain), 'dormant profile');
});

test("a candidate evaluation reads the profile as it is when evaluated", () => {
    const build = member('Bennet', 'GladiatorFinale');
    const feature = 'burst.burst_dmg';
    const evaluator = new ArtifactCandidateEvaluator(feature);
    const wearing = (setId) => {
        const candidate = build.clone();
        candidate.replaceArtifacts(pieces(setId));
        return candidate;
    };

    const on = evaluator.getResult(wearing('NoblesseOblige')).average;
    build.setArtifactsSettings({[NOBLESSE_4]: false});
    const off = evaluator.getResult(wearing('NoblesseOblige')).average;
    expect(off).toBeLessThan(on);
    expect(off).toBeCloseTo(wearing('NoblesseOblige').calcFeatures()[feature].average, 9);
});
