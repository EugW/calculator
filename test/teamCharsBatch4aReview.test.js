import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { matchCarrierTotals } from "./support/teamConversion";
import { finalStats, makeBuild } from "./support/team";

global.DB = DB;

function withConstellation(key, constellation) {
    const build = makeBuild(key);
    build.setCharLevels({level: 90, ascension: 6, constellation});
    return build;
}

function delta(member, apply) {
    const before = finalStats(member);
    apply();
    const after = finalStats(member);
    return (stat) => after.get(stat) - before.get(stat);
}

describe("Lauma C2 and C6 party bonuses need Ascendant Gleam", () => {
    const toggles = {
        lauma_twine_warnings_and_tales_from_the_north: true,
        lauma_i_offer_blood_and_tears_to_the_moonlight: true,
    };

    test("Nascent Gleam: no bonus, and the controls are still saved", () => {
        const lauma = withConstellation('Lauma', 6);
        const nahida = makeBuild('Nahida');
        const team = Team.fromMember(nahida);
        team.setMember(1, lauma);

        const change = delta(nahida, () => lauma.setCharSettings(toggles));
        expect(change('dmg_reaction_lunarbloom')).toBeCloseTo(0, 10);
        expect(change('dmg_lunarbloom_special')).toBeCloseTo(0, 10);

        const loaded = Team.deserialize(team.serialize());
        expect(loaded.getMember(1).getSettings()).toMatchObject(toggles);
    });

    test("Ascendant Gleam: +40% Lunar-Bloom DMG and 25% elevation for the team", () => {
        const lauma = withConstellation('Lauma', 6);
        const nahida = makeBuild('Nahida');
        const team = Team.fromMember(nahida);
        team.setMember(1, lauma);
        team.setMember(2, makeBuild('Aino'));

        for (const member of [nahida, lauma]) {
            lauma.setCharSettings({});
            const change = delta(member, () => lauma.setCharSettings(toggles));
            expect(change('dmg_reaction_lunarbloom')).toBeCloseTo(0.4, 10);
            expect(change('dmg_lunarbloom_special')).toBeCloseTo(0.25, 10);
        }
    });
});

describe("Aino's C1 and C6 follow the on-field member", () => {
    function setup() {
        const aino = withConstellation('Aino', 6);
        const nahida = makeBuild('Nahida');
        const team = Team.fromMember(aino);
        team.setMember(1, nahida);
        return {team, aino, nahida};
    }

    test("C1: other members gain 80 Mastery only on-field; Aino always", () => {
        const {team, aino, nahida} = setup();
        const on = {aino_the_theory_of_ashfield_equilibrium: true};

        team.setOnFieldMember(nahida);
        expect(delta(nahida, () => aino.setCharSettings(on))('mastery')).toBeCloseTo(80, 10);
        aino.setCharSettings({});
        expect(delta(aino, () => aino.setCharSettings(on))('mastery')).toBeCloseTo(80, 10);

        aino.setCharSettings({});
        team.setOnFieldMember(aino);
        expect(delta(nahida, () => aino.setCharSettings(on))('mastery')).toBeCloseTo(0, 10);
    });

    test("C6: the on-field member's reaction DMG, Aino included", () => {
        const {team, aino, nahida} = setup();
        const on = {aino_the_burden_of_creative_genius: true};
        const reaction = (member) => {
            aino.setCharSettings({});
            return delta(member, () => aino.setCharSettings(on))('dmg_reaction_bloom');
        };

        team.setOnFieldMember(nahida);
        expect(reaction(nahida)).toBeGreaterThan(0);
        expect(reaction(aino)).toBeCloseTo(0, 10);

        team.setOnFieldMember(aino);
        expect(reaction(aino)).toBeGreaterThan(0);
        expect(reaction(nahida)).toBeCloseTo(0, 10);

        // The saved control does not depend on the field.
        team.setOnFieldMember(nahida);
        const loaded = Team.deserialize(team.serialize());
        expect(loaded.getMember(0).getSettings()).toMatchObject(on);
    });
});

test("Zibai's Benediction scales on Zibai's DEF, not the receiver's", () => {
    const zibai = makeBuild('Zibai');
    const itto = makeBuild('Itto');
    const team = Team.fromMember(itto);
    team.setMember(1, zibai);

    const multi = () => finalStats(itto).get('lunarcrystallize_multi');
    matchCarrierTotals(zibai, {def_total: 1000});
    expect(multi()).toBeCloseTo(0.07, 10);
    matchCarrierTotals(itto, {def_total: 3000});
    expect(multi()).toBeCloseTo(0.07, 10);
    matchCarrierTotals(zibai, {def_total: 1500});
    expect(multi()).toBeCloseTo(0.105, 10);
    matchCarrierTotals(zibai, {def_total: 4000});
    expect(multi()).toBeCloseTo(0.14, 10);
});
