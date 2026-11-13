import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Cryo Traveler):
// - A4 Lucent Ice (ATK -> EM): game Avatar_Player_Ice_PermanentSkill_2 reads
//   FIGHT_PROP_NONEXTRA_ATTACK (premod; 8%, cap 160) into
//   Actor_ElemMasteryExtraDelta (extra; GO: input.premod.atk into total
//   eleMas). The default channels are confirmed, so premod writers (Columbina
//   C2 ATK) count; extra writers (Bennett burst) do not.
// - Stellar base bonus (Illusory Frostmirror, stellarglimmer_multi, 0.35% of
//   ATK, cap 7%): reads total ATK.
//   Avatar_Player_Ice_StarReaction_Damage_Up_By_Attack uses
//   SetNewElementReactionBaseDamageRatioParam, which names no premod/total
//   read; the same call reads the total in game (Ineffa's Benediction,
//   in-game test: md/buff_chains.md), as GO does. Asserted here: solo parity, the
//   premod count (Columbina C2, where both reads agree), and isolation from an
//   unrelated extra stat (Key party EM).
// - C2 Frostfall Reverberation (60/120 EM to the active character): game
//   writes Actor_ElemMasteryDelta (no "Extra": premod; GO: premod eleMas), and
//   condition stats are always premod. The premod write matters downstream:
//   Sucrose's A4 (premod EM read) counts it, while Nahida's A1 (extra EM)
//   must not move the share.
// - A1 Ever Keen Frost (+80%): game damageExtra of FIGHT_PROP_CUR_ATTACK
//   (total); damage hits read the total by construction. C1 (flat energy), C4
//   (duration), C6 (flat per-stack reaction DMG): no stat reads. Need nothing.
// - Chevreuse's A4 cannot supply premod ATK here: it only reaches
//   pyro/electro receivers.
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

// Traveler (cryo) + Columbina (hydro, C2 electro) + Flins (electro) +
// Bennett (pyro): four elements, no resonance; Columbina and Flins are the
// two Nodkrai members the C2 delivery needs (party_moonsign >= 2).
function c2Team(travelerConstellation = 0) {
    const traveler = withConstellation('TravelerCryo', travelerConstellation);
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(traveler);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Flins'));
    const bennett = makeBuild('Bennet');
    team.setMember(3, bennett);
    team.setOnFieldMember(traveler);
    columbina.setCharSettings({
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: 'electro',
    });
    matchCarrierTotals(columbina, {hp_total: 30000});
    return {team, traveler, columbina, bennett};
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

// Traveler (cryo) + Kazuha (anemo) + Aino (hydro) + Bennett (pyro): four
// different elements, so no resonance.
function neutralTeam() {
    const traveler = makeBuild('TravelerCryo');
    const team = Team.fromMember(traveler);
    const kazuha = makeBuild('Kazuha');
    team.setMember(1, kazuha);
    team.setMember(2, makeBuild('Aino'));
    const bennett = makeBuild('Bennet');
    team.setMember(3, bennett);
    team.setOnFieldMember(traveler);
    return {team, traveler, kazuha, bennett};
}

describe("Traveler A4 reads premod ATK", () => {
    test("solo formula and cap: 8% of ATK, max 160", () => {
        const traveler = makeBuild('TravelerCryo');
        Team.fromMember(traveler);
        matchCarrierTotals(traveler, {atk_total: 1000});
        const em1000 = totalMastery(finalStats(traveler));
        // No extra ATK solo, so premod ATK is the total: +1000 ATK is +80 EM.
        matchCarrierTotals(traveler, {atk_total: 2000});
        expect(totalMastery(finalStats(traveler)) - em1000).toBeCloseTo(80, 6);
        // 8% of 3000 = 240, capped at 160: +2000 ATK past 1000 is +80 EM.
        matchCarrierTotals(traveler, {atk_total: 3000});
        expect(totalMastery(finalStats(traveler)) - em1000).toBeCloseTo(80, 6);
    });

    test("counts Columbina C2 premod ATK", () => {
        const {traveler, columbina} = c2Team();
        // 1% of 30000 total HP, premod: Traveler (on field) gains 300 ATK.
        expect(delta(traveler, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-300, 8);
        columbina.setCharSettings(C2_ON);
        // Her A4 reads premod ATK (8%, no cap in this range): +24 EM.
        expect(delta(traveler, () => columbina.setCharSettings({}))('mastery')).toBeCloseTo(-24, 8);
        columbina.setCharSettings(C2_ON);
    });

    test("ignores Bennett burst extra ATK", () => {
        const {traveler, bennett} = neutralTeam();
        matchCarrierTotals(traveler, {atk_total: 1000});
        // Bennett's burst reads base ATK and writes extra: it raises
        // Traveler's total ATK but must not move her premod-read A4 EM.
        const emBefore = totalMastery(finalStats(traveler));
        const atkBefore = finalStats(traveler).get('atk');
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(finalStats(traveler).get('atk') - atkBefore).toBeGreaterThan(100);
        expect(totalMastery(finalStats(traveler)) - emBefore).toBeCloseTo(0, 8);
    });
});

describe("Stellar base bonus (reads total ATK; no extra ATK in these cases)", () => {
    test("solo formula and cap: 0.35% of ATK, max 7%", () => {
        const {traveler} = neutralTeam();
        // No extra ATK solo, so the total read and the default premod read
        // give the same number here; the read direction is pinned by the game
        // expression, not by these values.
        for (const [atk, expected] of [[1000, 0.035], [2000, 0.07], [3000, 0.07]]) {
            matchCarrierTotals(traveler, {atk_total: atk});
            expect(finalStats(traveler).get('stellarglimmer_multi')).toBeCloseTo(expected, 8);
        }
    });

    test("counts Columbina C2 premod ATK", () => {
        const {traveler, columbina} = c2Team();
        matchCarrierTotals(traveler, {atk_total: 1000});
        expect(finalStats(traveler).get('stellarglimmer_multi')).toBeCloseTo(0.035, 8);
        // Both a premod and a total read count premod ATK: +300 ATK moves the
        // bonus at 0.35%, uncapped here: +0.0105.
        expect(delta(traveler, () => columbina.setCharSettings({}))('stellarglimmer_multi')).toBeCloseTo(-0.0105, 8);
        columbina.setCharSettings(C2_ON);
    });

    test("ignores the Key's extra EM", () => {
        const {traveler, kazuha, bennett} = neutralTeam();
        const receiver = bennett;
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(traveler, {atk_total: 1000});
        expect(finalStats(receiver).get('stellarglimmer_multi')).toBeCloseTo(0.035, 8);
        // The Key's party EM is extra: it raises total EM but must not move
        // the ATK-read bonus.
        const emBefore = totalMastery(finalStats(receiver));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(receiver)) - emBefore).toBeGreaterThan(1);
        expect(finalStats(receiver).get('stellarglimmer_multi')).toBeCloseTo(0.035, 8);
    });
});

describe("Traveler C2 writes premod EM", () => {
    // Sucrose (anemo, on field) + Traveler (cryo, C2) + Nahida (dendro) +
    // Bennett (pyro): four elements, no resonance. Sucrose's A4 shares 20%
    // of her premod EM with the others; Traveler's C2 lands on Sucrose, so a
    // teammate's share deltas measure exactly what the C2 write feeds.
    function sucroseTeam() {
        const sucrose = makeBuild('Sucrose');
        const team = Team.fromMember(sucrose);
        const traveler = withConstellation('TravelerCryo', 2);
        team.setMember(1, traveler);
        const nahida = makeBuild('Nahida');
        team.setMember(2, nahida);
        const bennett = makeBuild('Bennet');
        team.setMember(3, bennett);
        team.setOnFieldMember(sucrose);
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        traveler.setCharSettings({traveler_cryo_frostfall_reverberation: 1});
        return {team, sucrose, traveler, nahida, bennett};
    }

    test("Sucrose A4 counts the C2 EM", () => {
        const {traveler, bennett} = sucroseTeam();
        // Level 1: +60 premod EM on Sucrose, shared at 20%: +12.
        expect(delta(bennett, () => traveler.setCharSettings({}))('mastery')).toBeCloseTo(-12, 8);
        traveler.setCharSettings({traveler_cryo_frostfall_reverberation: 1});
        // Level 2 (enhanced): +120 premod EM: +24, i.e. +12 over level 1.
        const baseline = finalStats(bennett).get('mastery');
        traveler.setCharSettings({traveler_cryo_frostfall_reverberation: 2});
        expect(finalStats(bennett).get('mastery') - baseline).toBeCloseTo(12, 8);
    });

    test("Nahida A1 extra EM does not move the share", () => {
        const {sucrose, traveler, nahida, bennett} = sucroseTeam();
        traveler.setCharSettings({traveler_cryo_frostfall_reverberation: 1});
        nahida.setCharSettings({});
        // Nahida's A1 writes extra EM on the on-field Sucrose: her total EM
        // rises, but the premod-read A4 share must not move.
        const emBefore = totalMastery(finalStats(sucrose));
        const shareBefore = finalStats(bennett).get('mastery');
        nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
        expect(totalMastery(finalStats(sucrose)) - emBefore).toBeGreaterThan(10);
        expect(finalStats(bennett).get('mastery') - shareBefore).toBeCloseTo(0, 8);
    });
});
