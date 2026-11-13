import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery, featureValues } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Zibai): every effect keeps the
// default channels (no reads/writes params in src/js/db/Char/Zibai.js).
// - Moonsign Benediction (lunarCrystallizePost, DEF -> lunarcrystallize_multi,
//   TEAM, 0.7%/cap 14): reads total DEF.
//   Avatar_Zibai_ElementalBurst onAdded uses
//   SetNewElementReactionBaseDamageRatioParam (propType Defense), which names
//   no premod/total read; the same call reads the total in game (Ineffa's
//   Benediction, in-game test: md/buff_chains.md), as GO does. No ability
//   writes extra DEF, so premod and total DEF agree; the must-not-count side
//   below uses the Key's extra EM instead (as in test/buffChainsLinnea.test.js).
// - Skill/burst DEF scalings (scaling 'def*'): the game reads
//   FIGHT_PROP_CUR_DEFENSE (total) everywhere; def* is already total.
// - A1 (+60% DEF) and C2 (+550% DEF) flat bonuses to Spirit Steed's Stride
//   2nd hit (reaction_flat): the game reads FIGHT_PROP_CUR_DEFENSE (total)
//   (PermanentSkill_1 UNIQUE_Avatar_Zibai_P1_Buff; Talent_2 ZibaiT2_EArt_UP;
//   GO: input.total.def); def* is already total. They count premod DEF
//   (Columbina C2) and must ignore unrelated extra stats (Bennett's ATK).
// - A4 (+15% DEF per other Geo, +60 EM per Hydro, self): the game writes
//   Actor_DefenceRatio / Actor_ElemMasteryDelta (premod, no stat read); GO
//   writes premod. Conditions write premod: confirmed.
// - C1 (+220% reaction bonus), C2 party (+30% Lunar-Crystallize DMG) and C6
//   (1.6%/radiance over 70) are flat/counter effects with no stat read.
// - KQM has no Zibai stat-interaction test.
//
// A 4-member team is used throughout (solo excepted): a smaller team would get
// Elemental Resonance in our engine but not in the game (md/buff_chains.md).

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

function totalDef(stats) {
    return stats.get('def_base') * (1 + stats.get('def_percent')) + stats.get('def');
}

function spiritSteedAvg(zibai) {
    return featureValues(zibai)['skill.zibai_spirit_steed_hit_2'][2];
}

const A1_ON = {zibai_a1_moonfall: true};
const C2_GEO = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'geo',
};
const C2_ELECTRO = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

// Zibai on field with Columbina C2 (geo, 30000 HP -> +300 premod DEF) and
// her own DEF matched to 800, so the benediction stays under its cap.
function setupC2(zibaiConstellation = 0) {
    const zibai = withConstellation('Zibai', zibaiConstellation);
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(zibai);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Kazuha'));
    team.setOnFieldMember(zibai);
    columbina.setCharSettings(C2_GEO);
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(zibai, {def_total: 800});
    return {team, zibai, columbina};
}

describe("Zibai benediction (reads total DEF; same number while no extra DEF exists)", () => {
    test("solo formula and cap: 0.7% of DEF, max 14", () => {
        const zibai = makeBuild('Zibai');
        Team.fromMember(zibai);
        // lunarcrystallize_multi is a percent stat (stored /100).
        for (const [def, expected] of [[1000, 0.07], [3000, 0.14]]) {
            matchCarrierTotals(zibai, {def_total: def});
            // No extra DEF exists in the game, so the total read and the
            // default premod read give the same number here; the read
            // direction is pinned by the game expression, not by these values.
            expect(finalStats(zibai).get('lunarcrystallize_multi')).toBeCloseTo(expected, 8);
        }
    });

    test("counts Columbina C2 premod DEF", () => {
        const {zibai, columbina} = setupC2();
        // Hold Brilliance on and switch only the dominant Lunar reaction:
        // Columbina's own HP benediction stays put while Zibai loses the 300
        // C2 DEF. 0.7% of 300 = 2.1 (uncapped: 800 DEF gives 5.6%).
        expect(delta(zibai, () => columbina.setCharSettings(C2_ELECTRO))('lunarcrystallize_multi')).toBeCloseTo(-0.021, 8);
    });

    test("ignores the Key's extra EM", () => {
        const zibai = makeBuild('Zibai');
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(zibai);
        team.setMember(1, makeBuild('Aino'));
        team.setMember(2, kazuha);
        // No second Benediction source on the team (Columbina would add her
        // own lunarcrystallize_multi from HP), so the stat is Zibai's alone.
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(zibai);
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(zibai, {def_total: 1000});
        expect(finalStats(zibai).get('lunarcrystallize_multi')).toBeCloseTo(0.07, 8);
        // The Key's party EM is extra: it raises her total EM but must not
        // move the DEF-read bonus.
        const emBefore = totalMastery(finalStats(zibai));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(zibai)) - emBefore).toBeGreaterThan(1);
        expect(finalStats(zibai).get('lunarcrystallize_multi')).toBeCloseTo(0.07, 8);
    });
});

describe("Zibai A1/C2 DEF bonuses read the total DEF (scaling def*)", () => {
    function a1Bonus(defTotal) {
        const zibai = makeBuild('Zibai');
        Team.fromMember(zibai);
        matchCarrierTotals(zibai, {def_total: defTotal});
        zibai.setCharSettings({});
        const off = spiritSteedAvg(zibai);
        zibai.setCharSettings(A1_ON);
        return spiritSteedAvg(zibai) - off;
    }

    test("solo: the A1 bonus scales with DEF", () => {
        // No extra DEF anywhere, so premod DEF is the total: the isolated
        // A1 flat (60% of DEF, post-flat chain DEF-independent) doubles when
        // DEF doubles. Game formula pin: bonus is 0.6 x DEF x chain.
        const bonus1000 = a1Bonus(1000);
        expect(bonus1000).toBeGreaterThan(0);
        expect(a1Bonus(2000) / bonus1000).toBeCloseTo(2, 6);
    });

    test("counts Columbina C2 premod DEF", () => {
        const {zibai, columbina} = setupC2();
        zibai.setCharSettings(A1_ON);
        // Match the total with the C2 DEF off (electro): electro state is
        // 1000 premod DEF, switching to geo adds the 300 premod C2 DEF.
        columbina.setCharSettings(C2_ELECTRO);
        matchCarrierTotals(zibai, {def_total: 1000});
        // Isolate the A1 flat with the toggle at fixed team state, then move
        // only Columbina's C2 DEF (+300 premod on top of 1000): the bonus
        // grows by 1300/1000 however the post-flat chain scales it.
        const bonusAt = (c2) => {
            columbina.setCharSettings(c2);
            zibai.setCharSettings({});
            const off = spiritSteedAvg(zibai);
            zibai.setCharSettings(A1_ON);
            return spiritSteedAvg(zibai) - off;
        };
        const withoutC2 = bonusAt(C2_ELECTRO);
        // Sanity: the electro state really is the matched 1000 DEF.
        expect(totalDef(finalStats(zibai))).toBeCloseTo(1000, 6);
        const withC2 = bonusAt(C2_GEO);
        expect(totalDef(finalStats(zibai))).toBeCloseTo(1300, 6);
        expect(withC2 / withoutC2).toBeCloseTo(1.3, 6);
    });

    test("ignores Bennett's burst extra ATK", () => {
        const zibai = makeBuild('Zibai');
        const bennet = makeBuild('Bennet');
        const team = Team.fromMember(zibai);
        team.setMember(1, bennet);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(zibai);
        zibai.setCharSettings(A1_ON);
        matchCarrierTotals(zibai, {def_total: 1000});
        const before = spiritSteedAvg(zibai);
        const atkBefore = finalStats(zibai).get('atk');
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        // Bennett's burst reads base ATK and writes extra: total ATK rises
        // but the DEF-scaled hit must not move.
        expect(finalStats(zibai).get('atk') - atkBefore).toBeGreaterThan(100);
        expect(spiritSteedAvg(zibai) - before).toBeCloseTo(0, 6);
    });

    test("C2 stacks its 550% on top of A1's 60% (moonsign >= 2)", () => {
        // Two Nod-Krai members (Zibai + Aino): Ascendant Gleam, so the C2
        // flat is active. Same DEF and A1 state: the C2-only flat (C2 on
        // state minus the C0 on state; base and A1 parts cancel) over the
        // A1-only flat (C0 on minus off) is 5.5/0.6 however the post-flat
        // chain scales them.
        function states(constellation) {
            const zibai = withConstellation('Zibai', constellation);
            const team = Team.fromMember(zibai);
            team.setMember(1, makeBuild('Aino'));
            team.setMember(2, makeBuild('Fischl'));
            team.setMember(3, makeBuild('Kazuha'));
            team.setOnFieldMember(zibai);
            matchCarrierTotals(zibai, {def_total: 1000});
            zibai.setCharSettings({});
            const off = spiritSteedAvg(zibai);
            zibai.setCharSettings(A1_ON);
            return {off, on: spiritSteedAvg(zibai)};
        }
        const c0 = states(0);
        const a1 = c0.on - c0.off;
        expect(a1).toBeGreaterThan(0);
        expect((states(2).on - c0.on) / a1).toBeCloseTo(5.5 / 0.6, 6);
    });
});

describe("Zibai A4 writes premod DEF% and EM (flat, no stat read)", () => {
    test("solo numbers: 15% DEF per other Geo, 60 EM per Hydro", () => {
        const plain = makeBuild('Zibai');
        let team = Team.fromMember(plain);
        team.setMember(1, makeBuild('Fischl'));
        team.setMember(2, makeBuild('Kazuha'));
        team.setMember(3, makeBuild('Bennet'));
        const baseDef = finalStats(plain).get('def_percent');
        const baseEm = totalMastery(finalStats(plain));

        // Two other Geo (Itto, Gorou) and one Hydro (Furina): +30% DEF, +60 EM.
        // Geo/Hydro resonance writes neither def_percent nor mastery.
        const buffed = makeBuild('Zibai');
        team = Team.fromMember(buffed);
        team.setMember(1, makeBuild('Itto'));
        team.setMember(2, makeBuild('Gorou'));
        team.setMember(3, makeBuild('Furina'));
        expect(finalStats(buffed).get('def_percent') - baseDef).toBeCloseTo(0.3, 8);
        expect(totalMastery(finalStats(buffed)) - baseEm).toBeCloseTo(60, 8);
    });
});

describe("Zibai C1/C2/C6 flats (no stat read)", () => {
    test("C1: first Stride reaction bonus is a flat 220%", () => {
        const zibai = withConstellation('Zibai', 1);
        Team.fromMember(zibai);
        expect(finalStats(zibai).get('dmg_reaction_zibai_spirit_steed_c1') || 0).toBe(0);
        zibai.setCharSettings({zibai_c1_first_spirit_steed: true});
        // Talent Zibai_Constellation_1 paramList[0] = 2.2; game text 220%.
        expect(finalStats(zibai).get('dmg_reaction_zibai_spirit_steed_c1')).toBeCloseTo(2.2, 8);
    });

    test("C2: party Lunar-Crystallize DMG is a flat 30%", () => {
        const zibai = withConstellation('Zibai', 2);
        const keqing = makeBuild('Keqing');
        const team = Team.fromMember(zibai);
        team.setMember(1, keqing);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Fischl'));
        expect(finalStats(keqing).get('dmg_reaction_lunarcrystallize') || 0).toBe(0);
        zibai.setCharSettings({zibai_c2_party_lunar_crystallize: true});
        // Talent Zibai_Constellation_2 paramList[0] = 0.3; game text 30%.
        expect(finalStats(keqing).get('dmg_reaction_lunarcrystallize')).toBeCloseTo(0.3, 10);
    });

    test("C6: elevation is (radiance - 70) x 1.6%", () => {
        const zibai = withConstellation('Zibai', 6);
        Team.fromMember(zibai);
        // The number condition is inactive until set: explicit 100 -> 48%
        // (talent Zibai_Constellation_6 param 0.016), 70 -> 0.
        zibai.setCharSettings({zibai_c6_radiance_consumed: 100});
        expect(finalStats(zibai).get('dmg_lunarcrystallize_special')).toBeCloseTo(0.48, 8);
        zibai.setCharSettings({zibai_c6_radiance_consumed: 70});
        expect(finalStats(zibai).get('dmg_lunarcrystallize_special') || 0).toBe(0);
    });
});
