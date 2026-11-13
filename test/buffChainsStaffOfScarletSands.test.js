import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Staff Of The Scarlet Sands):
// - weaponPost (PostEffectStatsMastery: 52/65/78/91/104% of EM base plus
//   28/35/42/49/56% per stack, max 3) reads premod EM and writes extra ATK
//   (game: Weapon_Pole_Deshret reads FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY into
//   Cur_Mastery and writes Actor_AttackExtraDelta; GO: input.premod.eleMas
//   into total atk). The default channels are confirmed, so no params: extra
//   EM (Nahida A1, Key party share, Sucrose A4) does not count, premod EM
//   (Columbina C2, flat custom buffs) does, and the ATK written is extra, so
//   premod ATK readers (Flins A4 here) ignore it.
// - FeaturePostEffectValue atk_bonus displays the post-effect's value and
//   follows its channels: needs nothing.
// - KQM (Nahida): Nahida's A1 EM does not work with Scarlet Sands (nor do the
//   Key, Xiphos or Evenstar); Hunter's Path and Gilded Dreams flat EM do.
//   A1 also snapshots on cast (rotation timing, not chaining; not tested).
//
// Xiangling holds the Staff for the read tests (no stat-scaled post-effects
// of her own); Flins holds it for the write test (his A4 reads premod ATK).
// A 4-member team of four different elements is used throughout (no resonance
// in the game or in our engine).

function equipStaff(build, refine = 1) {
    build.setWeapon(DB.Weapons.get('polearm').get('StaffOfScarletSands'));
    build.setWeaponLevels({level: 90, ascension: 6, refine});
    return build;
}

function delta(member, apply) {
    const before = finalStats(member);
    apply();
    const after = finalStats(member);
    return (stat) => after.get(stat) - before.get(stat);
}

// Xiangling (Staff R1, 3 stacks) with EM matched to 400 and no extra EM
// anywhere, so premod EM is the total. Fillers are proven neutral.
function setupSolo() {
    const xiangling = makeBuild('Xiangling');
    equipStaff(xiangling);
    const team = Team.fromMember(xiangling);
    team.setMember(1, makeBuild('Aino'));
    team.setMember(2, makeBuild('Noelle'));
    team.setMember(3, makeBuild('Kaeya'));
    team.setOnFieldMember(xiangling);
    xiangling.setWeaponSettings({weapon_staff_of_the_scarlet_sands: 3});
    matchCarrierTotals(xiangling, {mastery_total: 400});
    return {team, xiangling};
}

const COLUMBINA_C2_DENDRO = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'dendro',
};

// Xiangling (Staff R1, 3 stacks, on field) with Columbina C2 (dendro,
// 30000 HP -> +105 premod EM to the active character).
function setupColumbina() {
    const xiangling = makeBuild('Xiangling');
    equipStaff(xiangling);
    const columbina = makeBuild('Columbina');
    columbina.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const team = Team.fromMember(xiangling);
    team.setMember(1, columbina);
    // Flins (nodkrai) as the second Moonsign member: C2's Ascendant Gleam
    // gate needs party_moonsign >= 2. His A4 is self-only.
    team.setMember(2, makeBuild('Flins'));
    team.setMember(3, makeBuild('Kaeya'));
    team.setOnFieldMember(xiangling);
    xiangling.setWeaponSettings({weapon_staff_of_the_scarlet_sands: 3});
    columbina.setCharSettings(COLUMBINA_C2_DENDRO);
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(xiangling, {mastery_total: 400});
    return {team, xiangling, columbina};
}

// Xiangling (Staff R1, 3 stacks, on field) with Nahida (A1 off; matched to
// 500 premod EM, the party max, so A1 gives 125 extra EM).
function setupNahida() {
    const xiangling = makeBuild('Xiangling');
    equipStaff(xiangling);
    const nahida = makeBuild('Nahida');
    const team = Team.fromMember(xiangling);
    team.setMember(1, nahida);
    team.setMember(2, makeBuild('Noelle'));
    team.setMember(3, makeBuild('Kaeya'));
    team.setOnFieldMember(xiangling);
    xiangling.setWeaponSettings({weapon_staff_of_the_scarlet_sands: 3});
    nahida.setCharSettings({});
    matchCarrierTotals(nahida, {mastery_total: 500});
    matchCarrierTotals(xiangling, {mastery_total: 400});
    matchCarrierTotals(team.getSlots()[2], {mastery_total: 100});
    matchCarrierTotals(team.getSlots()[3], {mastery_total: 100});
    return {team, xiangling, nahida};
}

describe('Staff Of The Scarlet Sands reads premod EM, writes extra ATK', () => {
    test('solo numbers: 52% base plus 28% per stack (R1)', () => {
        const {xiangling} = setupSolo();
        // No extra EM anywhere, so premod EM is the 400 total: the full grant
        // at 3 stacks is 136% of 400 = 544. The Catch writes no 'atk', so the
        // difference against it is the Staff's grant alone.
        const atkStaff = finalStats(xiangling).get('atk');
        xiangling.setWeapon(DB.Weapons.get('polearm').get('Catch'));
        xiangling.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        expect(atkStaff - finalStats(xiangling).get('atk')).toBeCloseTo(544, 6);
    });

    test('stacks scale linearly with premod EM', () => {
        const {xiangling} = setupSolo();
        // The stack portion at EM 400: 3 x 28% x 400 = 336.
        const atk3 = finalStats(xiangling).get('atk');
        xiangling.setWeaponSettings({weapon_staff_of_the_scarlet_sands: 0});
        const atk0 = finalStats(xiangling).get('atk');
        expect(atk3 - atk0).toBeCloseTo(336, 6);
        xiangling.setWeaponSettings({weapon_staff_of_the_scarlet_sands: 1});
        expect(finalStats(xiangling).get('atk') - atk0).toBeCloseTo(112, 6);
        // Double the premod EM: the stack portion doubles to 672.
        xiangling.setWeaponSettings({weapon_staff_of_the_scarlet_sands: 3});
        matchCarrierTotals(xiangling, {mastery_total: 800});
        const atk3b = finalStats(xiangling).get('atk');
        xiangling.setWeaponSettings({weapon_staff_of_the_scarlet_sands: 0});
        expect(atk3b - finalStats(xiangling).get('atk')).toBeCloseTo(672, 6);
    });

    test('counts Columbina C2 premod EM', () => {
        const {xiangling, columbina} = setupColumbina();
        // 0.35% of 30000 total HP, premod: Xiangling (on field) gains 105 EM.
        expect(delta(xiangling, () => columbina.setCharSettings({}))('mastery')).toBeCloseTo(-105, 8);
        columbina.setCharSettings(COLUMBINA_C2_DENDRO);
        // The Staff reads premod EM (136% at 3 stacks, R1): +142.8 ATK.
        expect(delta(xiangling, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-142.8, 6);
        columbina.setCharSettings(COLUMBINA_C2_DENDRO);
    });

    test('ignores Nahida A1 extra EM (KQM)', () => {
        const {xiangling, nahida} = setupNahida();
        const atkBefore = finalStats(xiangling).get('atk');
        const emBefore = totalMastery(finalStats(xiangling));
        nahida.setCharSettings({nahida_compassion_illuminated: true, nahida_illusory_heart: true});
        // A1: 25% of the premod max (Nahida's 500) = 125 extra EM on the
        // on-field holder; the premod-read Staff must not move.
        expect(totalMastery(finalStats(xiangling)) - emBefore).toBeCloseTo(125, 6);
        expect(finalStats(xiangling).get('atk') - atkBefore).toBeCloseTo(0, 8);
    });

    test("ignores the Key's party extra EM", () => {
        const xiangling = makeBuild('Xiangling');
        equipStaff(xiangling);
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(xiangling);
        team.setMember(1, kazuha);
        team.setMember(2, makeBuild('Noelle'));
        team.setMember(3, makeBuild('Kaeya'));
        team.setOnFieldMember(xiangling);
        xiangling.setWeaponSettings({weapon_staff_of_the_scarlet_sands: 3});
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(xiangling, {mastery_total: 400});
        const atkBefore = finalStats(xiangling).get('atk');
        const emBefore = totalMastery(finalStats(xiangling));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        // The party share is extra: total EM rises but the Staff ATK stays.
        expect(totalMastery(finalStats(xiangling)) - emBefore).toBeGreaterThan(1);
        expect(finalStats(xiangling).get('atk') - atkBefore).toBeCloseTo(0, 8);
    });

    test('ignores Sucrose A4 extra EM', () => {
        const xiangling = makeBuild('Xiangling');
        equipStaff(xiangling);
        const sucrose = makeBuild('Sucrose');
        const team = Team.fromMember(xiangling);
        team.setMember(1, sucrose);
        team.setMember(2, makeBuild('Noelle'));
        team.setMember(3, makeBuild('Kaeya'));
        team.setOnFieldMember(xiangling);
        xiangling.setWeaponSettings({weapon_staff_of_the_scarlet_sands: 3});
        sucrose.setCharSettings({});
        matchCarrierTotals(sucrose, {mastery_total: 600});
        matchCarrierTotals(xiangling, {mastery_total: 400});
        const atkBefore = finalStats(xiangling).get('atk');
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        // 20% of Sucrose premod EM (600) = 120 extra EM on everyone; the
        // premod-read Staff must not move.
        expect(totalMastery(finalStats(xiangling))).toBeCloseTo(520, 6);
        expect(finalStats(xiangling).get('atk') - atkBefore).toBeCloseTo(0, 8);
    });
});

describe("the Staff's ATK is extra: Flins A4 ignores it", () => {
    test("stacks add total ATK but Flins' premod-read A4 EM does not move", () => {
        const flins = makeBuild('Flins');
        equipStaff(flins);
        const team = Team.fromMember(flins);
        team.setMember(1, makeBuild('Aino'));
        team.setMember(2, makeBuild('Noelle'));
        team.setMember(3, makeBuild('Kaeya'));
        team.setOnFieldMember(flins);
        flins.setWeaponSettings({weapon_staff_of_the_scarlet_sands: 3});
        matchCarrierTotals(flins, {mastery_total: 400});
        const atk3 = finalStats(flins).get('atk');
        const em3 = totalMastery(finalStats(flins));
        flins.setWeaponSettings({weapon_staff_of_the_scarlet_sands: 0});
        // The stacks add extra ATK (84% of the holder's premod EM: hundreds).
        expect(atk3 - finalStats(flins).get('atk')).toBeGreaterThan(100);
        // Flins' A4 reads premod ATK (game: FIGHT_PROP_NONEXTRA_ATTACK), so
        // the extra Staff ATK must not move his EM.
        expect(totalMastery(finalStats(flins)) - em3).toBeCloseTo(0, 8);
    });
});
