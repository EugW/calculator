import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Linnea):
// - A4 (both copies) reads premod DEF (game: Avatar_Linnea_PermanentSkill_2,
//   DefToMastery_Factor x FIGHT_PROP_NONEXTRA_DEFENSE) and writes extra EM
//   (Actor_ElemMasteryExtraDelta). GO reads input.premod.def.
// - Moonsign benediction reads total DEF (game:
//   Avatar_Linnea_PermanentSkill_3 SetNewElementReactionBaseDamageRatioParam
//   propType Defense; GO: input.total.def) into lunarcrystallize_multi.
// No ability in the game writes extra DEF, so total and premod DEF agree
// unless a test stages a synthetic extra DEF write (test/linneaA4Self.test.js);
// the must-not-count side below uses the Key's extra EM instead.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function totalDef(stats) {
    return stats.get('def_base') * (1 + stats.get('def_percent')) + stats.get('def');
}

function delta(member, apply) {
    const before = finalStats(member);
    apply();
    const after = finalStats(member);
    return (stat) => after.get(stat) - before.get(stat);
}

// Linnea on field with Columbina C2 (geo, 30000 HP -> +300 premod DEF) and
// her own DEF matched to 800, so the benediction stays under its cap.
function setupC2() {
    const linnea = makeBuild('Linnea');
    const columbina = makeBuild('Columbina');
    columbina.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const team = Team.fromMember(linnea);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Kazuha'));
    team.setOnFieldMember(linnea);
    linnea.setCharSettings({linnea_universal_naturalist_archive: true});
    columbina.setCharSettings({
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: 'geo',
    });
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(linnea, {def_total: 800});
    return {team, linnea, columbina};
}

describe("Linnea A4 reads premod DEF", () => {
    test("self copy: solo grant is 5% of DEF", () => {
        const linnea = makeBuild('Linnea');
        Team.fromMember(linnea);
        linnea.setCharSettings({linnea_universal_naturalist_archive: true});
        const def = totalDef(finalStats(linnea));
        // Toggling the A4 moves nothing but EM (no extra DEF anywhere, so
        // premod DEF is the total): the grant is 5% of it.
        expect(delta(linnea, () => linnea.setCharSettings({}))('mastery')).toBeCloseTo(-0.05 * def, 8);
    });

    test("self copy counts Columbina C2 premod DEF", () => {
        const {linnea, columbina} = setupC2();
        // 1% of 30000 total HP, premod: Linnea (on field) gains 300 DEF.
        expect(delta(linnea, () => columbina.setCharSettings({}))('def')).toBeCloseTo(-300, 8);
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'geo',
        });
        // Her A4 reads premod DEF (5%, no cap): +15 EM.
        expect(delta(linnea, () => columbina.setCharSettings({}))('mastery')).toBeCloseTo(-15, 8);
    });

    test("team copy grants 5% of her premod DEF to the active Moonsign member", () => {
        const linnea = makeBuild('Linnea');
        const aino = makeBuild('Aino');
        const team = Team.fromMember(linnea);
        team.setMember(1, aino);
        team.setMember(2, makeBuild('Columbina'));
        team.setMember(3, makeBuild('Kazuha'));
        team.setOnFieldMember(aino);
        linnea.setCharSettings({linnea_universal_naturalist_archive: true});
        matchCarrierTotals(linnea, {def_total: 2000});
        // Linnea is off field and the active member is a Moonsign character,
        // so only the team copy fires: Aino gains 5% of 2000 = 100 EM.
        expect(delta(aino, () => linnea.setCharSettings({}))('mastery')).toBeCloseTo(-100, 8);
    });

    test("A4 ignores the Key's extra EM", () => {
        const linnea = makeBuild('Linnea');
        const aino = makeBuild('Aino');
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(linnea);
        team.setMember(1, aino);
        team.setMember(2, kazuha);
        team.setMember(3, makeBuild('Columbina'));
        team.setOnFieldMember(aino);
        linnea.setCharSettings({linnea_universal_naturalist_archive: true});
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(linnea, {def_total: 2000});

        const grant = () => {
            const on = totalMastery(finalStats(aino));
            linnea.setCharSettings({});
            const off = totalMastery(finalStats(aino));
            linnea.setCharSettings({linnea_universal_naturalist_archive: true});
            return on - off;
        };
        expect(grant()).toBeCloseTo(100, 8);
        // The Key's party EM is extra: it raises Aino's total EM, but the
        // premod-DEF A4 grant must not move with it.
        const emBefore = totalMastery(finalStats(aino));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(aino)) - emBefore).toBeGreaterThan(1);
        expect(grant()).toBeCloseTo(100, 8);
    });
});

describe("Linnea benediction (reads total DEF; same number while no extra DEF exists)", () => {
    test("solo formula and cap: 0.7% of DEF, max 14", () => {
        const linnea = makeBuild('Linnea');
        Team.fromMember(linnea);
        // lunarcrystallize_multi is a percent stat (stored /100).
        for (const [def, expected] of [[1000, 0.07], [3000, 0.14]]) {
            matchCarrierTotals(linnea, {def_total: def});
            // No extra DEF exists in the game, so the total read and a premod
            // read give the same number here; the read direction is pinned by
            // the game expression, not by these values.
            expect(finalStats(linnea).get('lunarcrystallize_multi')).toBeCloseTo(expected, 8);
        }
    });

    test("counts Columbina C2 premod DEF", () => {
        const {linnea, columbina} = setupC2();
        // Hold Brilliance on and switch only the dominant Lunar reaction:
        // Columbina's own C2 HP (and her Benediction share) stays put while
        // Linnea loses the 300 C2 DEF. 0.7% of 300 = 2.1 (uncapped: 800 DEF
        // gives 5.6%).
        const off = {columbina_lunar_brilliance: true, columbina_c2_dominant_lunar: 'electro'};
        expect(delta(linnea, () => columbina.setCharSettings(off))('lunarcrystallize_multi')).toBeCloseTo(-0.021, 8);
    });

    test("ignores the Key's extra EM", () => {
        const linnea = makeBuild('Linnea');
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(linnea);
        team.setMember(1, makeBuild('Aino'));
        team.setMember(2, kazuha);
        // No second Benediction source on the team (Columbina would add her
        // own lunarcrystallize_multi from HP), so the stat is Linnea's alone.
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(linnea);
        linnea.setCharSettings({linnea_universal_naturalist_archive: true});
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(linnea, {def_total: 1000});
        expect(finalStats(linnea).get('lunarcrystallize_multi')).toBeCloseTo(0.07, 8);
        // The Key's party EM is extra: it raises her total EM (50 own A4
        // grant plus the party share) but must not move the DEF-read bonus.
        const emBefore = totalMastery(finalStats(linnea));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(linnea)) - emBefore).toBeGreaterThan(1);
        expect(finalStats(linnea).get('lunarcrystallize_multi')).toBeCloseTo(0.07, 8);
    });
});
