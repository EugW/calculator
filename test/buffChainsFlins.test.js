import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Flins):
// - A4 / C4 EM from ATK read premod ATK (game:
//   Avatar_Flins_PermanentSkill_2, FIGHT_PROP_NONEXTRA_ATTACK x Ratio / Ratio2)
//   and write extra EM (Actor_ElemMasteryExtraDelta; GO: input.premod.atk into
//   total eleMas). The default channels are confirmed, so premod writers
//   (Columbina C2 ATK, Chevreuse A4 ATK%) count; extra writers (Bennett burst)
//   do not. Chevreuse A4 -> Flins A4 is covered from the writer's side in
//   test/buffChainsChevreuse.test.js.
// - Moonsign Benediction (ATK -> lunarcharged_multi): reads total ATK.
//   Avatar_Flins_PermanentSkill_3 uses
//   SetNewElementReactionBaseDamageRatioParam, which names no premod/total read;
//   the same call reads the total in game (Ineffa's Benediction,
//   in-game test: md/buff_chains.md, test/buffChainsIneffa.test.js), as GO
//   does (input.total.atk). The cases below have no extra ATK.
// - C4 flat 20% ATK: game writes AttackUp into Actor_AttackRatio (premod); flat
//   conditions are always premod, needs nothing.
// - A1 / C2 / C6: flat reaction bonuses, enemy RES and damage hits (game:
//   FIGHT_PROP_CUR_ATTACK, total); need nothing.
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

// Flins on field with Columbina C2 (electro, 30000 HP -> +300 premod ATK).
function setupC2(flinsConstellation = 0) {
    const flins = withConstellation('Flins', flinsConstellation);
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(flins);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    const bennet = makeBuild('Bennet');
    team.setMember(3, bennet);
    team.setOnFieldMember(flins);
    columbina.setCharSettings({
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: 'electro',
    });
    matchCarrierTotals(columbina, {hp_total: 30000});
    return {team, flins, columbina, bennet};
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

describe("Flins A4 reads premod ATK", () => {
    test("solo formula and cap: 8% of ATK, max 160", () => {
        const flins = makeBuild('Flins');
        Team.fromMember(flins);
        matchCarrierTotals(flins, {atk_total: 1000});
        const em1000 = totalMastery(finalStats(flins));
        // No extra ATK solo, so premod ATK is the total: +1000 ATK is +80 EM.
        matchCarrierTotals(flins, {atk_total: 2000});
        expect(totalMastery(finalStats(flins)) - em1000).toBeCloseTo(80, 6);
        // 8% of 3000 = 240, capped at 160: +2000 ATK past 1000 is +80 EM.
        matchCarrierTotals(flins, {atk_total: 3000});
        expect(totalMastery(finalStats(flins)) - em1000).toBeCloseTo(80, 6);
    });

    test("counts Columbina C2 premod ATK", () => {
        const {flins, columbina} = setupC2();
        // 1% of 30000 total HP, premod: Flins (on field) gains 300 ATK.
        expect(delta(flins, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-300, 8);
        columbina.setCharSettings(C2_ON);
        // His A4 reads premod ATK (8%, no cap in this range): +24 EM.
        expect(delta(flins, () => columbina.setCharSettings({}))('mastery')).toBeCloseTo(-24, 8);
        columbina.setCharSettings(C2_ON);
    });

    test("ignores Bennett burst extra ATK", () => {
        const {flins, columbina, bennet} = setupC2();
        matchCarrierTotals(flins, {atk_total: 1000});
        columbina.setCharSettings(C2_ON);
        // Bennett's burst reads base ATK and writes extra: it raises Flins'
        // total ATK but must not move his premod-read A4 EM.
        const emBefore = totalMastery(finalStats(flins));
        const atkBefore = finalStats(flins).get('atk');
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        expect(finalStats(flins).get('atk') - atkBefore).toBeGreaterThan(100);
        expect(totalMastery(finalStats(flins)) - emBefore).toBeCloseTo(0, 8);
    });
});

describe("Flins C4 enhanced EM (replaces A4)", () => {
    test("solo formula and cap: 10% of ATK, max 220, plus flat 20% ATK", () => {
        const flins = withConstellation('Flins', 4);
        Team.fromMember(flins);
        // The flat C4 ATK% (game: Actor_AttackRatio, premod) adds 20%: compare
        // against a C0 copy with the same weapon, so weapon substats cancel.
        const c0 = makeBuild('Flins');
        Team.fromMember(c0);
        expect(finalStats(flins).get('atk_percent') - finalStats(c0).get('atk_percent')).toBeCloseTo(0.2, 8);
        matchCarrierTotals(flins, {atk_total: 1000});
        const em1000 = totalMastery(finalStats(flins));
        // 10% rate, not A4 + C4 stacked: +1000 ATK is +100 EM.
        matchCarrierTotals(flins, {atk_total: 2000});
        expect(totalMastery(finalStats(flins)) - em1000).toBeCloseTo(100, 6);
        // 10% of 3000 = 300, capped at 220: +2000 ATK past 1000 is +120 EM.
        matchCarrierTotals(flins, {atk_total: 3000});
        expect(totalMastery(finalStats(flins)) - em1000).toBeCloseTo(120, 6);
    });

    test("counts Columbina C2 premod ATK", () => {
        const {flins, columbina} = setupC2(4);
        expect(delta(flins, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-300, 8);
        columbina.setCharSettings(C2_ON);
        // 10% of the 300 premod C2 ATK = 30 EM.
        expect(delta(flins, () => columbina.setCharSettings({}))('mastery')).toBeCloseTo(-30, 8);
        columbina.setCharSettings(C2_ON);
    });
});

describe("Flins benediction (reads total ATK; no extra ATK in these cases)", () => {
    test("solo formula and cap: 0.7% of ATK, max 14", () => {
        const flins = makeBuild('Flins');
        Team.fromMember(flins);
        // lunarcharged_multi is a percent stat (stored /100): 0.007 / 100.
        for (const [atk, expected] of [[1000, 0.07], [3000, 0.14]]) {
            matchCarrierTotals(flins, {atk_total: atk});
            // No extra ATK solo, so the total read and the default premod
            // read give the same number here; the read direction is pinned by
            // the game expression, not by these values.
            expect(finalStats(flins).get('lunarcharged_multi')).toBeCloseTo(expected, 8);
        }
    });

    test("counts Chevreuse A4 premod ATK%", () => {
        const flins = makeBuild('Flins');
        const chevreuse = makeBuild('Chevreuse');
        const team = Team.fromMember(flins);
        team.setMember(1, chevreuse);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Kazuha'));
        team.setOnFieldMember(flins);
        // Chevreuse A4 is a premod ATK% write (1% per 1000 HP, cap 40%),
        // toggleable on its own; she brings no lunar share of her own, so the
        // stat below is Flins's Benediction alone.
        matchCarrierTotals(chevreuse, {hp_total: 30000});
        matchCarrierTotals(flins, {atk_total: 1000});
        const off = () => chevreuse.setCharSettings({});
        const on = () => chevreuse.setCharSettings({chevreuse_force_coordination: true});
        on();
        // 30% ATK on ~1000 premod ATK: both a premod and a total read count
        // it, so the bonus moves at 0.7% of the ATK delta, uncapped. (Chevreuse
        // writes ATK%, so the total is compared, not the flat lane.)
        const dAtk = totalAtk(finalStats(flins));
        off();
        const dAtkOff = totalAtk(finalStats(flins)) - dAtk;
        on();
        expect(dAtkOff).toBeLessThan(-100);
        const dLunarOn = finalStats(flins).get('lunarcharged_multi');
        off();
        const dLunar = finalStats(flins).get('lunarcharged_multi') - dLunarOn;
        on();
        expect(dLunar).toBeCloseTo(0.007 / 100 * dAtkOff, 8);
    });

    test("ignores the Key's extra EM", () => {
        const flins = makeBuild('Flins');
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(flins);
        team.setMember(1, makeBuild('Aino'));
        team.setMember(2, kazuha);
        // No second Benediction source on the team (Columbina would add her
        // own lunarcharged_multi from HP), so the stat is Flins's alone.
        team.setMember(3, makeBuild('Bennet'));
        team.setOnFieldMember(flins);
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(flins, {atk_total: 1000});
        expect(finalStats(flins).get('lunarcharged_multi')).toBeCloseTo(0.07, 8);
        // The Key's party EM is extra: it raises his total EM but must not
        // move the ATK-read bonus.
        const emBefore = totalMastery(finalStats(flins));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(flins)) - emBefore).toBeGreaterThan(1);
        expect(finalStats(flins).get('lunarcharged_multi')).toBeCloseTo(0.07, 8);
    });
});
