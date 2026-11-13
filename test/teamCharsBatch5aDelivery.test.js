import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { matchCarrierTotals } from "./support/teamConversion";
import { finalStats, makeBuild, enemyChange } from "./support/team";

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

function feature(member, name) {
    return member.getFeatures(member.getBuildData())[name];
}

describe("Columbina", () => {
    function setup(receiverKey = 'Alhaitham') {
        const receiver = makeBuild(receiverKey);
        const columbina = withConstellation('Columbina', 6);
        const team = Team.fromMember(receiver);
        team.setMember(1, columbina);
        return {team, receiver, columbina};
    }

    test("Benediction scales on her live HP", () => {
        const {receiver, columbina} = setup();
        matchCarrierTotals(columbina, {hp_total: 20000});
        expect(finalStats(receiver).get('lunarbloom_multi')).toBeCloseTo(0.04, 10);
        matchCarrierTotals(columbina, {hp_total: 30000});
        expect(finalStats(receiver).get('lunarbloom_multi')).toBeCloseTo(0.06, 10);
        matchCarrierTotals(columbina, {hp_total: 50000});
        expect(finalStats(receiver).get('lunarbloom_multi')).toBeCloseTo(0.07, 10);
    });

    test("Lunar Domain reaches the whole team at her burst level", () => {
        const {receiver, columbina} = setup();
        const on = {columbina_lunar_domain: true};
        expect(delta(receiver, () => columbina.setCharSettings(on))('dmg_reaction_lunar')).toBeCloseTo(0.49, 10);
        columbina.setCharSettings({});
        expect(delta(columbina, () => columbina.setCharSettings(on))('dmg_reaction_lunar')).toBeCloseTo(0.49, 10);

        columbina.setCharSettings(on);
        const at10 = finalStats(receiver).get('dmg_reaction_lunar');
        columbina.setCharSkills({attack: 10, elemental: 10, burst: 1});
        const at1 = finalStats(receiver).get('dmg_reaction_lunar');
        expect(at1).toBeLessThan(at10);
    });

    test("C2 DEF goes to the on-field member and survives off-field save/load", () => {
        const {team, receiver, columbina} = setup();
        const on = {
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'geo',
        };
        // Match HP with the effect on in the final team (resonance applies):
        // the 40% Brilliance HP raises her live HP, and the DEF is 1% of
        // that live total.
        team.setMember(2, makeBuild('Aino'));
        team.setOnFieldMember(receiver);
        columbina.setCharSettings(on);
        matchCarrierTotals(columbina, {hp_total: 30000});
        expect(delta(receiver, () => columbina.setCharSettings({}))('def')).toBeCloseTo(-300, 10);
        columbina.setCharSettings(on);

        team.setOnFieldMember(columbina);
        columbina.setCharSettings({});
        expect(delta(receiver, () => columbina.setCharSettings(on))('def')).toBeCloseTo(0, 10);

        team.setOnFieldMember(receiver);
        const loaded = Team.deserialize(team.serialize());
        expect(loaded.getMember(1).getSettings()).toMatchObject(on);
        expect(finalStats(loaded.getMember(0)).get('def')).toBeCloseTo(
            finalStats(receiver).get('def'), 2);
    });

    test("every elevation applies at Nascent Gleam; C2 DEF needs Ascendant Gleam", () => {
        const {team, receiver, columbina} = setup();
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'geo',
        });
        matchCarrierTotals(columbina, {hp_total: 30000});
        // Nascent Gleam (one Nod-Krai member): all six elevations
        // (1.5 + 7 + 1.5 + 1.5 + 1.5 + 7), but no C2 DEF.
        expect(finalStats(receiver).get('dmg_lunar_special')).toBeCloseTo(0.2, 10);
        expect(finalStats(receiver).get('def')).toBeCloseTo(0, 10);

        team.setMember(2, makeBuild('Aino'));
        matchCarrierTotals(columbina, {hp_total: 30000});
        expect(finalStats(receiver).get('dmg_lunar_special')).toBeCloseTo(0.2, 10);
        expect(finalStats(receiver).get('def')).toBeCloseTo(300, 10);
    });

    test("C6 CRIT reaches the whole team, herself included", () => {
        const {receiver, columbina} = setup();
        const change = (member) => delta(member, () => columbina.setCharSettings({
            columbina_c6_crit: 'hydro',
        }))('crit_dmg_hydro');
        expect(change(receiver)).toBeCloseTo(0.8, 10);
        columbina.setCharSettings({});
        expect(change(columbina)).toBeCloseTo(0.8, 10);
    });
});

describe("Illuga", () => {
    function setup(receiverKey = 'Alhaitham') {
        const receiver = makeBuild(receiverKey);
        const illuga = withConstellation('Illuga', 6);
        const team = Team.fromMember(receiver);
        team.setMember(1, illuga);
        return {team, receiver, illuga};
    }

    test("Oath CRIT reaches other members, EM only at Ascendant Gleam", () => {
        const {team, receiver, illuga} = setup();
        const on = {
            illuga_lightkeepers_oath: true,
            illuga_lightkeepers_oath_c6: true,
        };
        const base = finalStats(receiver).get('mastery');
        illuga.setCharSettings(on);
        expect(finalStats(receiver).get('crit_rate_geo')).toBeCloseTo(0.1, 10);
        expect(finalStats(receiver).get('crit_dmg_geo')).toBeCloseTo(0.3, 10);
        // Nascent Gleam (one Nod-Krai member): no EM.
        expect(finalStats(receiver).get('mastery') - base).toBeCloseTo(0, 10);

        team.setMember(2, makeBuild('Aino'));
        expect(finalStats(receiver).get('mastery') - base).toBeCloseTo(80, 10);
        illuga.setCharSettings({});
        expect(finalStats(receiver).get('mastery') - base).toBeCloseTo(0, 10);
    });

    test("C4 DEF goes to other on-field members and is saved off-field", () => {
        const {team, receiver, illuga} = setup();
        const on = {illuga_c4_def: true};
        expect(delta(receiver, () => illuga.setCharSettings(on))('def')).toBeCloseTo(200, 10);

        team.setOnFieldMember(illuga);
        illuga.setCharSettings({});
        expect(delta(receiver, () => illuga.setCharSettings(on))('def')).toBeCloseTo(0, 10);

        team.setOnFieldMember(receiver);
        const loaded = Team.deserialize(team.serialize());
        expect(loaded.getMember(1).getSettings()).toMatchObject(on);
    });

    test("Nightingale's Song scales on his live EM and burst level", () => {
        const itto = makeBuild('Itto');
        const illuga = withConstellation('Illuga', 0);
        const team = Team.fromMember(itto);
        team.setMember(1, illuga);
        illuga.setCharSettings({illuga_nightingales_song: true});

        matchCarrierTotals(illuga, {mastery_total: 500});
        const at500 = feature(itto, 'skill.skill_dmg').average;
        matchCarrierTotals(illuga, {mastery_total: 1000});
        expect(feature(itto, 'skill.skill_dmg').average).toBeGreaterThan(at500);

        matchCarrierTotals(illuga, {mastery_total: 500});
        const atBurst10 = feature(itto, 'skill.skill_dmg').average;
        illuga.setCharSkills({attack: 10, elemental: 10, burst: 1});
        expect(feature(itto, 'skill.skill_dmg').average).toBeLessThan(atBurst10);
    });

    test("Demonhunter's Dusk follows the live Hydro/Geo count", () => {
        function dmgWithFourth(fourthKey) {
            const itto = makeBuild('Itto');
            const illuga = withConstellation('Illuga', 6);
            const team = Team.fromMember(itto);
            team.setMember(1, illuga);
            team.setMember(2, makeBuild(fourthKey));
            matchCarrierTotals(illuga, {mastery_total: 500});
            illuga.setCharSettings({
                illuga_nightingales_song: true,
                illuga_demonhunters_dusk: true,
            });
            return feature(itto, 'skill.skill_dmg').average;
        }
        // Itto + Illuga + Alhaitham: 2 Hydro/Geo; + Gorou instead: 3.
        expect(dmgWithFourth('Gorou')).toBeGreaterThan(dmgWithFourth('Alhaitham'));
    });
});

describe("Linnea", () => {
    function setup(receiverKey = 'Alhaitham') {
        const receiver = makeBuild(receiverKey);
        const linnea = withConstellation('Linnea', 6);
        const team = Team.fromMember(receiver);
        team.setMember(1, linnea);
        return {team, receiver, linnea};
    }

    test("Benediction scales on her live DEF", () => {
        const {receiver, linnea} = setup();
        matchCarrierTotals(linnea, {def_total: 1000});
        expect(finalStats(receiver).get('lunarcrystallize_multi')).toBeCloseTo(0.07, 10);
        matchCarrierTotals(linnea, {def_total: 2000});
        expect(finalStats(receiver).get('lunarcrystallize_multi')).toBeCloseTo(0.14, 10);
    });

    test("Field Observation Notes tiers come from the live Moonsign", () => {
        const {team, receiver, linnea} = setup();
        linnea.setCharSettings({linnea_field_observation_notes: true});
        expect(enemyChange(receiver, 'enemy_res_geo')).toBeCloseTo(-0.15, 10);
        team.setMember(2, makeBuild('Aino'));
        expect(enemyChange(receiver, 'enemy_res_geo')).toBeCloseTo(-0.3, 10);
    });

    test("A4 EM follows her live DEF to the active Moonsign member", () => {
        const aino = makeBuild('Aino');
        const linnea = withConstellation('Linnea', 6);
        const team = Team.fromMember(aino);
        team.setMember(1, linnea);
        matchCarrierTotals(linnea, {def_total: 2000});
        linnea.setCharSettings({linnea_universal_naturalist_archive: true});
        const before = finalStats(aino).get('mastery');
        matchCarrierTotals(linnea, {def_total: 3000});
        expect(finalStats(aino).get('mastery') - before).toBeCloseTo(50, 10);

        // A non-Moonsign active member gets nothing from her.
        team.setOnFieldMember(linnea);
        const nahida = makeBuild('Nahida');
        team.setMember(2, nahida);
        team.setOnFieldMember(nahida);
        matchCarrierTotals(linnea, {def_total: 2000});
        expect(delta(nahida, () => linnea.setCharSettings({}))('mastery')).toBeCloseTo(0, 10);
    });

    test("C2 CRIT only reaches Hydro and Geo members", () => {
        const {receiver, linnea} = setup();
        linnea.setCharSettings({linnea_tidings_of_joy_and_sorrow: true});
        expect(finalStats(receiver).get('crit_dmg_geo')).toBe(0);
        expect(finalStats(receiver).get('crit_dmg_hydro')).toBe(0);

        const itto = makeBuild('Itto');
        const linnea2 = withConstellation('Linnea', 6);
        const team2 = Team.fromMember(itto);
        team2.setMember(1, linnea2);
        linnea2.setCharSettings({linnea_tidings_of_joy_and_sorrow: true});
        expect(finalStats(itto).get('crit_dmg_geo')).toBeCloseTo(0.4, 10);
        expect(finalStats(itto).get('crit_dmg_hydro')).toBeCloseTo(0.4, 10);
    });

    test("C4 DEF follows the on-field member and is saved off-field", () => {
        const {team, receiver, linnea} = setup();
        const on = {linnea_expert_instinct: true};
        expect(delta(receiver, () => linnea.setCharSettings(on))('def_percent')).toBeCloseTo(0.25, 10);

        team.setOnFieldMember(linnea);
        linnea.setCharSettings({});
        expect(delta(receiver, () => linnea.setCharSettings(on))('def_percent')).toBeCloseTo(0, 10);

        team.setOnFieldMember(receiver);
        const loaded = Team.deserialize(team.serialize());
        expect(loaded.getMember(1).getSettings()).toMatchObject(on);
    });

    test("C6 elevation needs Ascendant Gleam", () => {
        const {team, receiver, linnea} = setup();
        expect(finalStats(receiver).get('dmg_lunarcrystallize_special')).toBe(0);
        team.setMember(2, makeBuild('Aino'));
        expect(finalStats(receiver).get('dmg_lunarcrystallize_special')).toBeCloseTo(0.25, 10);
    });

    test("Provisional Classification scales on her live DEF for others", () => {
        const columbina = makeBuild('Columbina');
        const linnea = withConstellation('Linnea', 6);
        const team = Team.fromMember(columbina);
        team.setMember(1, linnea);
        matchCarrierTotals(linnea, {def_total: 2000});
        const at2000 = feature(columbina, 'skill.columbina_lunar_crystallize_dmg').average;
        matchCarrierTotals(linnea, {def_total: 3000});
        expect(feature(columbina, 'skill.columbina_lunar_crystallize_dmg').average).toBeGreaterThan(at2000);
    });
});
