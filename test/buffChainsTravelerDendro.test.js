import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Dendro Traveler):
//
// - A4 Verdant Luxury (skill +0.15%/EM, burst +0.1%/EM): reads TOTAL EM
//   (declared). Game data: Avatar_Player_Grass_Damage_Up_By_Element_Mastery caches
//   FIGHT_PROP_ELEMENT_MASTERY (total) and scales Elemental_Art / Elemental_Burst
//   through ModifyDamageMixin; GO reads input.total.eleMas. KQM Nahida: Dendro
//   Traveler A4 works with Nahida's A1 (extra EM). The Traveler-Dendro page also
//   carries a Luna video where Sucrose's A4 share (the same extra-EM channel)
//   does not move the bonus; that page documents A4 snapshot/off-field timing
//   quirks, i.e. rotation timing rather than chaining, so the game data and the
//   Nahida-page test win. A total read counts every EM buff: there is no EM buff
//   it must ignore.
// - A1 Verdant Overgrowth (+6 EM/stack to the active Lamp holder): game writes
//   Actor_ElemMasteryDelta (no "Extra": premod, flat); conditions write premod.
//   Default confirmed. Downstream it matters: Sucrose's A4 (premod read) counts
//   the Lamp EM, while Nahida's A1 (extra EM) must not move that share.
// - C6 Withering Aggregation (+12% Dendro / +12% transfigured element to the
//   active holder): game writes Actor_*AddHurtDelta (no "Extra": premod), flat
//   12%. Conditions write premod. Default confirmed; the bonus does not scale
//   with any stat.
// - C1 (energy), C2 (duration), C3/C5 (talent levels), C4 (stacks), quest/base
//   conditions, Verdessence/Vinecore flat hit numbers: no stat reads. Damage
//   hits read the total by construction.
//
// A 4-member team with four different elements is used throughout (except the
// Nahida-A1 team, where Dendro resonance is constant across toggles and matched
// away): a smaller team would get Elemental Resonance in our engine but not in
// the game (md/buff_chains.md).

const NAHIDA_A1 = {nahida_compassion_illuminated: true, nahida_illusory_heart: true};

function withConstellation(key, constellation) {
    const build = makeBuild(key);
    build.setCharLevels({level: 90, ascension: 6, constellation});
    return build;
}

// Traveler (dendro, on field) + Sucrose (anemo) + Kaeya (cryo, Key holder) +
// Noelle (geo): four different elements, so no resonance.
function setupA4() {
    const traveler = makeBuild('TravelerDendro');
    const team = Team.fromMember(traveler);
    const sucrose = makeBuild('Sucrose');
    team.setMember(1, sucrose);
    const kaeya = makeBuild('Kaeya');
    kaeya.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kaeya.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    team.setMember(2, kaeya);
    const noelle = makeBuild('Noelle');
    team.setMember(3, noelle);
    team.setOnFieldMember(traveler);
    sucrose.setCharSettings({});
    kaeya.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    // Totals matched with every effect off, so they are premod values.
    matchCarrierTotals(traveler, {mastery_total: 500});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    matchCarrierTotals(kaeya, {mastery_total: 100});
    matchCarrierTotals(noelle, {mastery_total: 100});
    return {team, traveler, sucrose, kaeya, noelle};
}

// Traveler (dendro, on field) + Nahida (dendro) + Kaeya (cryo) + Noelle (geo).
// Dendro Resonance is on in both states and matched away with effects off.
function setupNahida() {
    const traveler = makeBuild('TravelerDendro');
    const team = Team.fromMember(traveler);
    const nahida = makeBuild('Nahida');
    team.setMember(1, nahida);
    const kaeya = makeBuild('Kaeya');
    team.setMember(2, kaeya);
    const noelle = makeBuild('Noelle');
    team.setMember(3, noelle);
    team.setOnFieldMember(traveler);
    nahida.setCharSettings({});
    matchCarrierTotals(traveler, {mastery_total: 500});
    matchCarrierTotals(nahida, {mastery_total: 900});
    matchCarrierTotals(kaeya, {mastery_total: 100});
    matchCarrierTotals(noelle, {mastery_total: 100});
    return {team, traveler, nahida, kaeya, noelle};
}

function skillBonus(traveler) {
    return finalStats(traveler).get('dmg_skill_traveler_dendro');
}

function burstBonus(traveler) {
    return finalStats(traveler).get('dmg_burst_traveler_dendro');
}

describe('Traveler A4 reads total EM', () => {
    test('solo numbers: 0.15% skill and 0.1% burst per EM', () => {
        const {traveler} = setupA4();
        // No extra EM present: premod and total agree.
        expect(totalMastery(finalStats(traveler))).toBeCloseTo(500, 6);
        expect(skillBonus(traveler)).toBeCloseTo(0.0015 * 500, 9);
        expect(burstBonus(traveler)).toBeCloseTo(0.001 * 500, 9);
    });

    test('counts Sucrose A4 extra EM', () => {
        const {traveler, sucrose} = setupA4();
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        // 20% of Sucrose premod EM (600) = 120 extra on the Traveler.
        expect(totalMastery(finalStats(traveler))).toBeCloseTo(620, 6);
        expect(skillBonus(traveler)).toBeCloseTo(0.0015 * 620, 9);
        expect(burstBonus(traveler)).toBeCloseTo(0.001 * 620, 9);
    });

    test('counts the Key party extra EM', () => {
        const {traveler, kaeya, noelle} = setupA4();
        kaeya.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        // The party share is extra; the total read counts it. Its size is read
        // off Noelle, who gets nothing else.
        const share = totalMastery(finalStats(noelle)) - 100;
        expect(share).toBeGreaterThan(1);
        expect(totalMastery(finalStats(traveler))).toBeCloseTo(500 + share, 6);
        expect(skillBonus(traveler)).toBeCloseTo(0.0015 * (500 + share), 9);
        expect(burstBonus(traveler)).toBeCloseTo(0.001 * (500 + share), 9);
    });

    test('counts Nahida A1 extra EM (KQM: Traveler A4 works with Nahida A1)', () => {
        const {traveler, nahida} = setupNahida();
        nahida.setCharSettings(NAHIDA_A1);
        // Highest premod EM is Nahida's 900: 25% = 225, under the 250 cap.
        expect(totalMastery(finalStats(traveler))).toBeCloseTo(725, 6);
        expect(skillBonus(traveler)).toBeCloseTo(0.0015 * 725, 9);
        expect(burstBonus(traveler)).toBeCloseTo(0.001 * 725, 9);
    });

    test('extra EM is indistinguishable from premod EM', () => {
        const first = setupA4();
        first.sucrose.setCharSettings({sucrose_mollis_favonius: true});
        const withExtra = [skillBonus(first.traveler), burstBonus(first.traveler)];

        const second = setupA4();
        matchCarrierTotals(second.traveler, {mastery_total: 500 + 120});
        const withPremod = [skillBonus(second.traveler), burstBonus(second.traveler)];

        expect(withExtra[0]).toBeCloseTo(0.0015 * 620, 9);
        expect(withExtra[0]).toBeCloseTo(withPremod[0], 9);
        expect(withExtra[1]).toBeCloseTo(withPremod[1], 9);
    });
});

describe('Traveler A1 writes flat premod EM', () => {
    // Sucrose (anemo, on field) + Traveler (dendro, A1) + Nahida (dendro) +
    // Bennett (pyro). Dendro Resonance is constant across toggles and matched
    // away. Sucrose's A4 shares 20% of her premod EM; the Lamp EM lands on
    // Sucrose, so Bennett's share deltas measure exactly what the A1 feeds.
    function sucroseTeam() {
        const sucrose = makeBuild('Sucrose');
        const team = Team.fromMember(sucrose);
        const traveler = makeBuild('TravelerDendro');
        team.setMember(1, traveler);
        const nahida = makeBuild('Nahida');
        team.setMember(2, nahida);
        const bennett = makeBuild('Bennet');
        team.setMember(3, bennett);
        team.setOnFieldMember(sucrose);
        // Totals matched with every effect off, so they are premod values.
        matchCarrierTotals(sucrose, {mastery_total: 600});
        matchCarrierTotals(traveler, {mastery_total: 500});
        matchCarrierTotals(nahida, {mastery_total: 900});
        matchCarrierTotals(bennett, {mastery_total: 100});
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        traveler.setCharSettings({traveler_verdant_overgrowth: 10});
        nahida.setCharSettings({});
        return {team, sucrose, traveler, nahida, bennett};
    }

    function delta(member, apply) {
        const before = finalStats(member);
        apply();
        const after = finalStats(member);
        return (stat) => after.get(stat) - before.get(stat);
    }

    test('Sucrose A4 counts the Lamp EM', () => {
        const {traveler, bennett} = sucroseTeam();
        // Level 10: +60 premod EM on Sucrose, shared at 20%: +12.
        expect(delta(bennett, () => traveler.setCharSettings({}))('mastery')).toBeCloseTo(-12, 8);
        traveler.setCharSettings({traveler_verdant_overgrowth: 10});
        // Level 5: +30 premod EM: +6, i.e. -6 from level 10.
        const baseline = finalStats(bennett).get('mastery');
        traveler.setCharSettings({traveler_verdant_overgrowth: 5});
        expect(finalStats(bennett).get('mastery') - baseline).toBeCloseTo(-6, 8);
    });

    test('Nahida A1 extra EM does not move the share', () => {
        const {sucrose, traveler, nahida, bennett} = sucroseTeam();
        traveler.setCharSettings({traveler_verdant_overgrowth: 10});
        nahida.setCharSettings({});
        // Nahida's A1 writes extra EM on the on-field Sucrose: her total EM
        // rises, but the premod-read A4 share must not move. Bennett is
        // off-field and gets no A1: his total is the share alone.
        const emBefore = totalMastery(finalStats(sucrose));
        const shareBefore = finalStats(bennett).get('mastery');
        nahida.setCharSettings(NAHIDA_A1);
        expect(totalMastery(finalStats(sucrose)) - emBefore).toBeGreaterThan(10);
        expect(finalStats(bennett).get('mastery') - shareBefore).toBeCloseTo(0, 8);
    });
});

describe('Traveler C6 is flat (solo parity and active-only delivery)', () => {
    // Traveler (dendro, C6) + Ayaka (cryo) + Sucrose (anemo) + Bennett (pyro):
    // four different elements, so no resonance.
    function c6Team() {
        const traveler = withConstellation('TravelerDendro', 6);
        const team = Team.fromMember(traveler);
        const ayaka = makeBuild('Ayaka');
        team.setMember(1, ayaka);
        team.setMember(2, makeBuild('Sucrose'));
        team.setMember(3, makeBuild('Bennet'));
        team.setOnFieldMember(ayaka);
        // Totals matched with every effect off, so they are premod values.
        matchCarrierTotals(ayaka, {mastery_total: 100});
        matchCarrierTotals(traveler, {mastery_total: 500});
        traveler.setCharSettings({
            traveler_verdant_overgrowth: 10,
            traveler_withering_aggregation_1: true,
            traveler_withering_aggregation_2: 'hydro',
        });
        return {team, traveler, ayaka};
    }

    test('active holder gains 60 EM and 12% Dendro/Hydro DMG; off-field gains nothing', () => {
        const {team, traveler, ayaka} = c6Team();
        expect(totalMastery(finalStats(ayaka))).toBeCloseTo(160, 6);
        expect(finalStats(ayaka).get('dmg_dendro')).toBeCloseTo(0.12, 8);
        expect(finalStats(ayaka).get('dmg_hydro')).toBeCloseTo(0.12, 8);
        team.setOnFieldMember(traveler);
        expect(totalMastery(finalStats(ayaka))).toBeCloseTo(100, 6);
        expect(finalStats(ayaka).get('dmg_dendro') || 0).toBeCloseTo(0, 8);
        expect(finalStats(ayaka).get('dmg_hydro') || 0).toBeCloseTo(0, 8);
    });

    test('the 12% does not scale with the Traveler EM', () => {
        const {traveler, ayaka} = c6Team();
        expect(finalStats(ayaka).get('dmg_dendro')).toBeCloseTo(0.12, 8);
        // Tripling the Traveler EM leaves the flat bonus unchanged.
        matchCarrierTotals(traveler, {mastery_total: 1500});
        expect(totalMastery(finalStats(traveler))).toBeCloseTo(1500, 6);
        expect(finalStats(ayaka).get('dmg_dendro')).toBeCloseTo(0.12, 8);
        expect(finalStats(ayaka).get('dmg_hydro')).toBeCloseTo(0.12, 8);
    });
});
