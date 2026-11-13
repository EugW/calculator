import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Columbina): her C2 writes non-extra
// (premod) ATK / EM / DEF from total HP, so premod readers count them; her
// Benediction reads total HP. Game data:
// ConfigAbility_Avatar_Columbina.json (Constellation_2 ..._OnLocal
// Actor_*Delta from FIGHT_PROP_MAX_HP; PermanentSkill_3 propType MaxHp).

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

// Columbina at C2 with the gate open (Ascendant Gleam needs Moonsign >= 2,
// hence the second Nod-Krai member) and exactly 30000 total HP, so C2 gives
// 300 ATK / 105 EM / 300 DEF to whoever is on field.
function setupC2(onFieldKey, dominant) {
    const onField = makeBuild(onFieldKey);
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(onField);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setOnFieldMember(onField);
    columbina.setCharSettings({
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: dominant,
    });
    matchCarrierTotals(columbina, {hp_total: 30000});
    return {team, onField, columbina};
}

describe('Columbina C2 ATK (Lunar-Charged)', () => {
    test('Flins A4 counts it, Bennett burst does not feed A4', () => {
        const flins = makeBuild('Flins');
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
        // Keep Flins' A4 (8%, cap 160) in its linear zone: premod ATK 1000.
        matchCarrierTotals(flins, {atk_total: 1000});

        // 1% of 30000 total HP, premod: Flins (on field) gains 300 ATK.
        expect(delta(flins, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-300, 8);
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'electro',
        });

        // Flins A4 reads premod ATK (game: FIGHT_PROP_NONEXTRA_ATTACK): with
        // nothing writing extra ATK, premod is the total, so his EM moves by
        // 8% of the 300 C2 ATK = 24.
        expect(delta(flins, () => columbina.setCharSettings({}))('mastery')).toBeCloseTo(-24, 8);
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'electro',
        });

        // Bennett's burst reads base ATK and writes extra: it raises Flins'
        // total ATK but must not move his premod-read A4 EM.
        const emBefore = totalMastery(finalStats(flins));
        const atkBefore = finalStats(flins).get('atk');
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        expect(finalStats(flins).get('atk') - atkBefore).toBeGreaterThan(100);
        expect(totalMastery(finalStats(flins)) - emBefore).toBeCloseTo(0, 8);
    });
});

describe('Columbina C2 EM (Lunar-Bloom)', () => {
    test('Sucrose A4 counts it, Key of Khaj-Nisut party EM does not feed A4', () => {
        const sucrose = makeBuild('Sucrose');
        const columbina = withConstellation('Columbina', 2);
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(sucrose);
        team.setMember(1, columbina);
        team.setMember(2, kazuha);
        const aino = makeBuild('Aino');
        team.setMember(3, aino);
        team.setOnFieldMember(sucrose);
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'dendro',
        });
        matchCarrierTotals(columbina, {hp_total: 30000});

        // 0.35% of 30000 total HP, premod: Sucrose (on field) gains 105 EM.
        expect(delta(sucrose, () => columbina.setCharSettings({}))('mastery')).toBeCloseTo(-105, 8);
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'dendro',
        });

        // Sucrose A4 shares 20% of her premod EM with the other members, so
        // a teammate gains 21 while her own total gains 105.
        const share = (apply) => delta(aino, apply)('mastery');
        expect(share(() => columbina.setCharSettings({}))).toBeCloseTo(-21, 8);
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'dendro',
        });

        // The Key's party EM is extra: it raises Sucrose's total EM, but her
        // premod-read A4 share for the teammate must not move with it (the
        // teammate's own party share is the whole delta).
        const sucroseBefore = totalMastery(finalStats(sucrose));
        const ainoBefore = totalMastery(finalStats(aino));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        const dSucrose = totalMastery(finalStats(sucrose)) - sucroseBefore;
        const dAino = totalMastery(finalStats(aino)) - ainoBefore;
        expect(dSucrose).toBeGreaterThan(1);
        expect(dAino - dSucrose).toBeCloseTo(0, 8);
    });
});

describe('Columbina C2 DEF (Lunar-Crystallize)', () => {
    test("Linnea's A4 still counts it", () => {
        const {onField: linnea, columbina} = setupC2('Linnea', 'geo');
        linnea.setCharSettings({linnea_universal_naturalist_archive: true});

        // 1% of 30000 total HP, premod: Linnea (on field) gains 300 DEF.
        expect(delta(linnea, () => columbina.setCharSettings({}))('def')).toBeCloseTo(-300, 8);
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'geo',
        });

        // Her own A4 reads total DEF (5%, no cap): +15 EM.
        expect(delta(linnea, () => columbina.setCharSettings({}))('mastery')).toBeCloseTo(-15, 8);
        // No ability in the game writes extra DEF (md/buff_chains.md), so
        // there is no must-not-count case for a DEF read; total == premod.
    });
});

describe('Columbina Benediction (Moonsign)', () => {
    test('solo formula and cap: total HP, unchanged without extra HP', () => {
        const columbina = makeBuild('Columbina');
        Team.fromMember(columbina);
        for (const hp of [20000, 30000, 50000]) {
            matchCarrierTotals(columbina, {hp_total: hp});
            // 0.2% per 1000 Max HP, cap 7%. No ability writes extra HP, so
            // the total read and the old premod read give the same number.
            const expected = Math.min(0.002 * hp / 1000, 0.07);
            const stats = finalStats(columbina);
            expect(stats.get('lunarbloom_multi')).toBeCloseTo(expected, 8);
            expect(stats.get('lunarcharged_multi')).toBeCloseTo(expected, 8);
            expect(stats.get('lunarcrystallize_multi')).toBeCloseTo(expected, 8);
        }
    });
});
