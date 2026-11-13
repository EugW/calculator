import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Odette):
// - A4 (Pathetique of Pateticheskaya) self Stellar base bonus reads total ATK
//   (game: Avatar_Odette_PermanentSkill_2, GetFightProperty
//   FIGHT_PROP_CUR_ATTACK into _ABILITY_Odette_Talent2_AttackCache; ProudSkill
//   Odette_PermanentSkill_2 = [1000, 0.015, 0.30]; GO: input.total.atk):
//   `reads: CHANNELS.TOTAL`. stellarglimmer_multi has no extra lane, so only
//   the read matters. Extra ATK (Bennett burst) must count; premod ATK
//   (Columbina C2) must count.
// - Radiance (Dance of Aurore) team Stellar base bonus: reads total ATK.
//   Avatar_Odette_PermanentSkill_3 uses
//   SetNewElementReactionBaseDamageRatioParam, which names no premod/total
//   read; the same call reads the total in game (Ineffa's Benediction,
//   in-game test: md/buff_chains.md), as GO does. Asserted here: solo parity, the
//   premod count (Columbina C2, where both reads agree), and isolation from an
//   unrelated extra stat (Key party EM).
// - Marvelous Splendor (+C2 ATK%), Snow Swan (+C4 half), C6 specials, C2 RES
//   shred: flat conditions, always premod; damage hits (incl. C1/C4 Stellar
//   hits) read total ATK by construction. Need nothing (see odetteStable).
//
// A 4-member team with four different elements is used throughout: a smaller
// team would get Elemental Resonance in our engine but not in the game
// (md/buff_chains.md).

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

// Odette (cryo) + Kazuha (anemo) + Aino (hydro) + Bennett (pyro): four
// different elements, so no resonance. Radiance off unless stated.
function neutralTeam() {
    const odette = makeBuild('Odette');
    const team = Team.fromMember(odette);
    const kazuha = makeBuild('Kazuha');
    team.setMember(1, kazuha);
    team.setMember(2, makeBuild('Aino'));
    const bennett = makeBuild('Bennet');
    team.setMember(3, bennett);
    team.setOnFieldMember(odette);
    return {team, odette, kazuha, bennett};
}

// Same, but Kazuha replaced by Columbina (hydro) C2 and Aino by Flins
// (electro): cryo/hydro/pyro/electro, still no resonance. Flins is the second
// Moonsign character the C2 delivery needs (party_moonsign >= 2,
// columbinaAscendantGleam); his own toggles stay off.
function c2Team() {
    const odette = makeBuild('Odette');
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(odette);
    team.setMember(1, columbina);
    const flins = makeBuild('Flins');
    team.setMember(2, flins);
    team.setMember(3, makeBuild('Bennet'));
    team.setOnFieldMember(odette);
    columbina.setCharSettings({
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: 'electro',
    });
    matchCarrierTotals(columbina, {hp_total: 30000});
    return {team, odette, columbina, flins};
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

describe("Odette A4 reads total ATK", () => {
    test("solo formula: 1.5% per 100 ATK over 1000, max 30%", () => {
        const {odette} = neutralTeam();
        // No extra ATK solo, so premod and total agree here; the read
        // direction is pinned by the game expression, not by these values.
        for (const [atk, expected] of [[500, 0], [1000, 0], [2000, 0.15], [3000, 0.30], [4000, 0.30]]) {
            matchCarrierTotals(odette, {atk_total: atk});
            expect(finalStats(odette).get('stellarglimmer_multi')).toBeCloseTo(expected, 8);
        }
    });

    test("counts Columbina C2 premod ATK", () => {
        const {odette, columbina} = c2Team();
        matchCarrierTotals(odette, {atk_total: 2000});
        expect(finalStats(odette).get('stellarglimmer_multi')).toBeCloseTo(0.15, 8);
        // 1% of 30000 total HP, premod: Odette (on field) gains 300 ATK.
        expect(delta(odette, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-300, 8);
        columbina.setCharSettings(C2_ON);
        // 300 ATK at 1.5% per 100, uncapped here: +0.045.
        expect(delta(odette, () => columbina.setCharSettings({}))('stellarglimmer_multi')).toBeCloseTo(-0.045, 8);
        columbina.setCharSettings(C2_ON);
    });

    test("counts Bennett burst extra ATK", () => {
        const {odette, bennett} = neutralTeam();
        matchCarrierTotals(odette, {atk_total: 2000});
        expect(finalStats(odette).get('stellarglimmer_multi')).toBeCloseTo(0.15, 8);
        // Bennett's burst reads base ATK and writes extra ATK: a total read
        // counts it (a premod read would not).
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const atkBefore = totalAtk(finalStats(odette));
        const multiBefore = finalStats(odette).get('stellarglimmer_multi');
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const dAtk = totalAtk(finalStats(odette)) - atkBefore;
        expect(dAtk).toBeGreaterThan(50);
        // Uncapped in this range (2000 + buff stays under 4000): 1.5%/100.
        expect(finalStats(odette).get('stellarglimmer_multi') - multiBefore).toBeCloseTo(dAtk / 100 * 0.015, 8);
    });
});

describe("Odette Radiance (reads total ATK; no extra ATK in these cases)", () => {
    test("solo formula on a teammate: 0.7% per 100 ATK, max 14%", () => {
        const {odette, kazuha} = neutralTeam();
        const receiver = kazuha;
        odette.setCharSettings({odette_radiance_stellarswirl: true});
        // No extra ATK solo, so the total read and the default premod read
        // give the same number here.
        for (const [atk, expected] of [[1000, 0.07], [2000, 0.14], [3000, 0.14]]) {
            matchCarrierTotals(odette, {atk_total: atk});
            expect(finalStats(receiver).get('stellarglimmer_multi')).toBeCloseTo(expected, 8);
        }
    });

    test("counts Columbina C2 premod ATK on a teammate", () => {
        const {odette, columbina, flins} = c2Team();
        const receiver = flins;
        odette.setCharSettings({odette_radiance_stellarswirl: true});
        matchCarrierTotals(odette, {atk_total: 1000});
        expect(finalStats(receiver).get('stellarglimmer_multi')).toBeCloseTo(0.07, 8);
        // Both a premod and a total read count premod ATK: +300 ATK moves the
        // team bonus at 0.7% per 100, uncapped: +0.021.
        expect(delta(receiver, () => columbina.setCharSettings({}))('stellarglimmer_multi')).toBeCloseTo(-0.021, 8);
        columbina.setCharSettings(C2_ON);
    });

    test("ignores the Key's extra EM", () => {
        const {odette, kazuha, bennett} = neutralTeam();
        const receiver = bennett;
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        odette.setCharSettings({odette_radiance_stellarswirl: true});
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(odette, {atk_total: 1000});
        expect(finalStats(receiver).get('stellarglimmer_multi')).toBeCloseTo(0.07, 8);
        // The Key's party EM is extra: it raises total EM but must not move
        // the ATK-read bonus.
        const emBefore = totalMastery(finalStats(receiver));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(receiver)) - emBefore).toBeGreaterThan(1);
        expect(finalStats(receiver).get('stellarglimmer_multi')).toBeCloseTo(0.07, 8);
    });
});
