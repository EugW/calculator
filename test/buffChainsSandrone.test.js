import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Sandrone):
// - A4 EM from ATK reads premod ATK (game:
//   Avatar_Marionette_PermanentSkill_2, FIGHT_PROP_NONEXTRA_ATTACK x
//   TransRatio 0.08, cap MaxMasteryUp 160) and writes extra EM
//   (Actor_ElemMasteryExtraDelta; GO: prod(input.premod.atk) into total
//   eleMas). The default channels are confirmed, so premod writers
//   (Columbina C2 ATK) count; extra writers (Bennett burst) do not.
// - Stellar base bonus (ATK -> stellarglimmer_multi, TEAM): reads total ATK.
//   Avatar_MarionetteNew_ElementalBurst uses
//   SetNewElementReactionBaseDamageRatioParam, which names no premod/total
//   read; the same call reads the total in game (Ineffa's Benediction,
//   in-game test: md/buff_chains.md), as GO does (input.total.atk). The
//   cases below have no extra ATK.
// - C1 flat 30% Stellar DMG, C2 flat beam CRIT DMG, C4/C6 damage hits (game:
//   FIGHT_PROP_CUR_ATTACK, total) and the C6 flat elevate: no stat reads,
//   need nothing. A1's 400% prism and +10%/stack ray are damage
//   multipliers, not stat conversions.
// - KQM has no premod/total interaction test for Sandrone.
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

// Sandrone on field with Columbina C2 (electro, 30000 HP -> +300 premod ATK).
function setupC2(sandroneConstellation = 0) {
    const sandrone = withConstellation('Sandrone', sandroneConstellation);
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(sandrone);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    const bennet = makeBuild('Bennet');
    team.setMember(3, bennet);
    team.setOnFieldMember(sandrone);
    columbina.setCharSettings({
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: 'electro',
    });
    matchCarrierTotals(columbina, {hp_total: 30000});
    return {team, sandrone, columbina, bennet};
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

describe("Sandrone A4 reads premod ATK", () => {
    test("solo formula and cap: 8% of ATK, max 160", () => {
        const sandrone = makeBuild('Sandrone');
        Team.fromMember(sandrone);
        matchCarrierTotals(sandrone, {atk_total: 1000});
        const em1000 = totalMastery(finalStats(sandrone));
        // No extra ATK solo, so premod ATK is the total: +1000 ATK is +80 EM.
        matchCarrierTotals(sandrone, {atk_total: 2000});
        expect(totalMastery(finalStats(sandrone)) - em1000).toBeCloseTo(80, 6);
        // 8% of 3000 = 240, capped at 160: +2000 ATK past 1000 is +80 EM.
        matchCarrierTotals(sandrone, {atk_total: 3000});
        expect(totalMastery(finalStats(sandrone)) - em1000).toBeCloseTo(80, 6);
    });

    test("counts Columbina C2 premod ATK", () => {
        const {sandrone, columbina} = setupC2();
        // 1% of 30000 total HP, premod: Sandrone (on field) gains 300 ATK.
        expect(delta(sandrone, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-300, 8);
        columbina.setCharSettings(C2_ON);
        // Her A4 reads premod ATK (8%, no cap in this range): +24 EM.
        expect(delta(sandrone, () => columbina.setCharSettings({}))('mastery')).toBeCloseTo(-24, 8);
        columbina.setCharSettings(C2_ON);
    });

    test("ignores Bennett burst extra ATK", () => {
        const {sandrone, columbina, bennet} = setupC2();
        matchCarrierTotals(sandrone, {atk_total: 1000});
        columbina.setCharSettings(C2_ON);
        // Bennett's burst reads base ATK and writes extra: it raises
        // Sandrone's total ATK but must not move her premod-read A4 EM.
        const emBefore = totalMastery(finalStats(sandrone));
        const atkBefore = finalStats(sandrone).get('atk');
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        expect(finalStats(sandrone).get('atk') - atkBefore).toBeGreaterThan(100);
        expect(totalMastery(finalStats(sandrone)) - emBefore).toBeCloseTo(0, 8);
    });
});

describe("Sandrone benediction (reads total ATK; no extra ATK in these cases)", () => {
    test("solo formula and cap: 0.7% of ATK, max 14", () => {
        const sandrone = makeBuild('Sandrone');
        Team.fromMember(sandrone);
        // stellarglimmer_multi is a percent stat (stored /100): 0.007 / 100.
        for (const [atk, expected] of [[1000, 0.07], [3000, 0.14]]) {
            matchCarrierTotals(sandrone, {atk_total: atk});
            // No extra ATK solo, so the total read and the default premod
            // read give the same number here; the read direction is pinned by
            // the game expression, not by these values.
            expect(finalStats(sandrone).get('stellarglimmer_multi')).toBeCloseTo(expected, 8);
        }
    });

    test("counts Columbina C2 premod ATK", () => {
        const {sandrone, columbina} = setupC2();
        matchCarrierTotals(sandrone, {atk_total: 1000});
        // Hold Brilliance on and switch only the dominant Lunar reaction to
        // dendro (EM, which no ATK-read bonus sees): Sandrone loses the 300
        // C2 ATK while her own ATK otherwise stays put. 0.7% of 300 per
        // 100 = 2.1 (uncapped: 1000 ATK gives 7%).
        const noAtk = {columbina_lunar_brilliance: true, columbina_c2_dominant_lunar: 'dendro'};
        expect(delta(sandrone, () => columbina.setCharSettings(noAtk))('stellarglimmer_multi')).toBeCloseTo(-0.021, 8);
    });

    test("ignores the Key's extra EM", () => {
        const sandrone = makeBuild('Sandrone');
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(sandrone);
        team.setMember(1, makeBuild('Aino'));
        team.setMember(2, kazuha);
        // No second stellarglimmer_multi source on the team (Odette and
        // Cryo Traveler write their own), so the stat is Sandrone's alone.
        team.setMember(3, makeBuild('Bennet'));
        team.setOnFieldMember(sandrone);
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(sandrone, {atk_total: 1000});
        expect(finalStats(sandrone).get('stellarglimmer_multi')).toBeCloseTo(0.07, 8);
        // The Key's party EM is extra: it raises her total EM but must not
        // move the ATK-read bonus.
        const emBefore = totalMastery(finalStats(sandrone));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(sandrone)) - emBefore).toBeGreaterThan(1);
        expect(finalStats(sandrone).get('stellarglimmer_multi')).toBeCloseTo(0.07, 8);
    });
});
