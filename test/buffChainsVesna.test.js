import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Vesna): every effect keeps the
// default channels (no reads/writes params in src/js/db/Char/Vesna.js).
// - Stellar Jubilee: Splendid Prelude (TEAM base Stellar Swirl bonus from
//   ATK, 0.7% per 100, cap 14%): reads total ATK.
//   Avatar_Vesna_PermanentSkill_3 sets it with
//   SetNewElementReactionBaseDamageRatioParam, which names no premod/total
//   read; the same call reads the total in game (Ineffa's Benediction,
//   in-game test: md/buff_chains.md). GO has no Vesna sheet. Asserted
//   here: solo parity, the premod count
//   (Columbina C2, where both reads agree), and isolation from an unrelated
//   extra stat (Key party EM).
// - A4 Truth Prevails: no stat read (team element counts); the game writes
//   Actor_AttackRatio and Actor_ElemMasteryDelta (both premod, no "Extra").
//   Conditions write premod: confirmed. The premod ATK% chains into the
//   Jubilee bonus; the premod EM is counted by premod EM readers (Nahida
//   A1, tested from the writer's side). C4 triples both bonuses.
// - A1 is a stack counter (its hits read total ATK by construction); C1,
//   C2 and C6 are flat bonuses with no stat read: solo parity only.
// - KQM has no Vesna stat-interaction test.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

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

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

// Vesna (anemo) + Kaeya (cryo) + Aino (hydro) + Bennett (pyro): four
// different elements, so no resonance. A4 sees 2 Cryo/Anemo and 2 other.
function neutralTeam(vesnaConstellation = 0) {
    const vesna = withConstellation('Vesna', vesnaConstellation);
    const team = Team.fromMember(vesna);
    const kaeya = makeBuild('Kaeya');
    team.setMember(1, kaeya);
    team.setMember(2, makeBuild('Aino'));
    const bennett = makeBuild('Bennet');
    team.setMember(3, bennett);
    team.setOnFieldMember(vesna);
    return {team, vesna, kaeya, bennett};
}

// Same, but Kaeya replaced by Columbina (hydro) C2 and Aino by Flins
// (electro): anemo/hydro/electro/pyro, still no resonance. Flins is the
// second Moonsign character the C2 delivery needs (party_moonsign >= 2,
// columbinaAscendantGleam); his own toggles stay off.
function c2Team() {
    const vesna = makeBuild('Vesna');
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(vesna);
    team.setMember(1, columbina);
    const flins = makeBuild('Flins');
    team.setMember(2, flins);
    team.setMember(3, makeBuild('Bennet'));
    team.setOnFieldMember(vesna);
    columbina.setCharSettings({
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: 'electro',
    });
    matchCarrierTotals(columbina, {hp_total: 30000});
    return {team, vesna, columbina, flins};
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

describe("Vesna Jubilee (reads total ATK; no extra ATK in these cases)", () => {
    test("solo formula on a teammate: 0.7% per 100 ATK, max 14%", () => {
        const {vesna, kaeya} = neutralTeam();
        const receiver = kaeya;
        // No extra ATK here, so the total read and the default premod read
        // give the same number here.
        for (const [atk, expected] of [[1000, 0.07], [2000, 0.14], [3000, 0.14]]) {
            matchCarrierTotals(vesna, {atk_total: atk});
            expect(finalStats(receiver).get('stellarswirl_multi')).toBeCloseTo(expected, 8);
        }
    });

    test("counts Columbina C2 premod ATK on a teammate", () => {
        const {vesna, columbina, flins} = c2Team();
        const receiver = flins;
        matchCarrierTotals(vesna, {atk_total: 1000});
        expect(finalStats(receiver).get('stellarswirl_multi')).toBeCloseTo(0.07, 8);
        // 1% of 30000 total HP, premod: Vesna (on field) gains 300 ATK.
        expect(delta(vesna, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-300, 8);
        columbina.setCharSettings(C2_ON);
        // Both a premod and a total read count premod ATK: +300 ATK moves the
        // team bonus at 0.7% per 100, uncapped: +0.021.
        expect(delta(receiver, () => columbina.setCharSettings({}))('stellarswirl_multi')).toBeCloseTo(-0.021, 8);
        columbina.setCharSettings(C2_ON);
    });

    test("ignores the Key's extra EM", () => {
        const {vesna, kaeya, bennett} = neutralTeam();
        const receiver = bennett;
        kaeya.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kaeya.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        kaeya.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(vesna, {atk_total: 1000});
        expect(finalStats(receiver).get('stellarswirl_multi')).toBeCloseTo(0.07, 8);
        // The Key's party EM is extra: it raises total EM but must not move
        // the ATK-read bonus.
        const emBefore = totalMastery(finalStats(receiver));
        kaeya.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(receiver)) - emBefore).toBeGreaterThan(1);
        expect(finalStats(receiver).get('stellarswirl_multi')).toBeCloseTo(0.07, 8);
    });
});

describe("Vesna A4 writes premod ATK% and EM", () => {
    test("formula, Radiance gate, and C4 tripling", () => {
        const {vesna} = neutralTeam();
        vesna.setCharSettings({vesna_radiance_stellarswirl: true});
        // 2 Cryo/Anemo (Vesna, Kaeya): +12% ATK; 2 other: +50 EM.
        expect(finalStats(vesna).get('atk_percent')).toBeCloseTo(0.12, 8);
        // Gated on Radiance: Stellar Swirl (and off while Stellar-Conduct
        // has priority); the Conduct case is covered in test/vesna.test.js.
        const d = delta(vesna, () => vesna.setCharSettings({}));
        expect(d('atk_percent')).toBeCloseTo(-0.12, 8);
        expect(d('mastery')).toBeCloseTo(-50, 8);
        vesna.setCharSettings({vesna_radiance_stellarswirl: true});

        const c4 = neutralTeam(4);
        c4.vesna.setCharSettings({vesna_radiance_stellarswirl: true});
        const d4 = delta(c4.vesna, () => c4.vesna.setCharSettings({}));
        expect(d4('atk_percent')).toBeCloseTo(-0.36, 8);
        expect(d4('mastery')).toBeCloseTo(-150, 8);
        c4.vesna.setCharSettings({vesna_radiance_stellarswirl: true});
    });

    test("premod A4 ATK% chains into the Jubilee bonus", () => {
        const {vesna, kaeya} = neutralTeam();
        const receiver = kaeya;
        vesna.setCharSettings({vesna_radiance_stellarswirl: false});
        matchCarrierTotals(vesna, {atk_total: 1000});
        expect(finalStats(receiver).get('stellarswirl_multi')).toBeCloseTo(0.07, 8);
        // A4 writes premod ATK%, and the (default premod) Jubilee read
        // counts it.
        const atkBefore = totalAtk(finalStats(vesna));
        const multiBefore = finalStats(receiver).get('stellarswirl_multi');
        vesna.setCharSettings({vesna_radiance_stellarswirl: true});
        const dAtk = totalAtk(finalStats(vesna)) - atkBefore;
        expect(dAtk).toBeGreaterThan(10);
        // Uncapped in this range (1000 + bonus stays under 2000): 0.7%/100.
        expect(finalStats(receiver).get('stellarswirl_multi') - multiBefore).toBeCloseTo(dAtk / 100 * 0.007, 8);
    });

    test("premod A4 EM is counted by Nahida A1", () => {
        const vesna = makeBuild('Vesna');
        const nahida = makeBuild('Nahida');
        const team = Team.fromMember(vesna);
        team.setMember(1, nahida);
        const aino = makeBuild('Aino');
        team.setMember(2, aino);
        const bennett = makeBuild('Bennet');
        team.setMember(3, bennett);
        team.setOnFieldMember(nahida);
        // anemo/dendro/hydro/pyro: A4 sees 1 Cryo/Anemo and 3 other (+75 EM).
        // Totals matched with every effect off, so they are premod values.
        vesna.setCharSettings({vesna_radiance_stellarswirl: false});
        nahida.setCharSettings({});
        matchCarrierTotals(vesna, {mastery_total: 800});
        matchCarrierTotals(nahida, {mastery_total: 100});
        matchCarrierTotals(aino, {mastery_total: 100});
        matchCarrierTotals(bennett, {mastery_total: 100});
        nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
        // 25% of Vesna's premod EM (800) = 200, under the 250 cap.
        expect(totalMastery(finalStats(nahida))).toBeCloseTo(100 + 200, 6);
        vesna.setCharSettings({vesna_radiance_stellarswirl: true});
        // +75 premod EM moves Nahida's premod max read: +18.75, still capped
        // only at 250 (875 x 25% = 218.75).
        expect(totalMastery(finalStats(nahida))).toBeCloseTo(100 + 218.75, 6);
    });
});

describe("Vesna constellations are flat (solo parity)", () => {
    test("C1 Stellar DMG needs Armed for Action", () => {
        const {vesna} = neutralTeam(1);
        vesna.setCharSettings({vesna_armed_for_action: true});
        expect(finalStats(vesna).get('dmg_stellarswirl')).toBeCloseTo(0.20, 8);
        const d = delta(vesna, () => vesna.setCharSettings({}));
        expect(d('dmg_stellarswirl')).toBeCloseTo(-0.20, 8);
        vesna.setCharSettings({vesna_armed_for_action: true});
    });

    test("C2 ATK needs maximum Disciplinary Action", () => {
        const {vesna} = neutralTeam(2);
        vesna.setCharSettings({vesna_armed_for_action: true, vesna_disciplinary_action: 6});
        expect(finalStats(vesna).get('atk_percent')).toBeCloseTo(0.40, 8);
        // Not at maximum stacks: no bonus.
        vesna.setCharSettings({vesna_armed_for_action: true, vesna_disciplinary_action: 5});
        expect(finalStats(vesna).get('atk_percent')).toBeCloseTo(0, 8);
    });

    test("C6 elevation is flat", () => {
        const {vesna} = neutralTeam(6);
        expect(finalStats(vesna).get('dmg_stellarswirl_special')).toBeCloseTo(0.20, 8);
    });
});
