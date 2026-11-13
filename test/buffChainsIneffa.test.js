import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Ineffa):
// - A4 Panoramic Permutation (both copies) reads premod ATK (game:
//   Avatar_Ineffa_PermanentSkill_2, FIGHT_PROP_NONEXTRA_ATTACK into
//   Actor_ElemMasteryExtraDelta) and writes extra EM. GO reads
//   input.premod.atk; KQM has no premod/total interaction test for Ineffa.
// - Moonsign Benediction Assemblage Hub scales on ATK through
//   SetNewElementReactionBaseDamageRatioParam (engine-internal, no
//   premod/total marker). In-game test (2026-10-01; Ineffa, Fischl, Yelan,
//   Bennett): a Lunar-Charged tick did 4,037 at 938 ATK and 4,319 in
//   Bennett's burst (over the 2,000 ATK cap), the same 4,319 as with 2,300
//   ATK of her own. It reads the total ATK, as GO does (input.total.atk).
// - C1 Rectifying Processor reads premod ATK (game:
//   Avatar_Ineffa_ElementalArt UNIQUE_Ineffa_Talent_1_Real_Caster,
//   FIGHT_PROP_NONEXTRA_ATTACK into AttackCache, scaled by TransferRatio
//   into Actor_ElemReactMoonShockDelta, which has no extra lane). GO reads
//   input.total.atk (a guess); the traced game expression is preferred.
// - Birgitta's Discharge, the skill shield, C2 and C6 hits read total ATK
//   (FIGHT_PROP_CUR_ATTACK); atk* is already total and needs nothing.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

function delta(member, apply) {
    const before = finalStats(member);
    apply();
    const after = finalStats(member);
    return (stat) => after.get(stat) - before.get(stat);
}

function withConstellation(key, constellation) {
    const build = makeBuild(key);
    build.setCharLevels({level: 90, ascension: 6, constellation});
    return build;
}

const INEFA_A4 = {ineffa_panoramic_permutation_protocol: true};
const COLUMBINA_C2_ELECTRO = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

// Ineffa on field with Columbina C2 (electro, 30000 HP -> +300 premod ATK)
// and her own ATK matched to 1000, so every ATK scaling stays linear.
function setupC2(ineffaConstellation = 0) {
    const ineffa = withConstellation('Ineffa', ineffaConstellation);
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(ineffa);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Kazuha'));
    team.setOnFieldMember(ineffa);
    ineffa.setCharSettings(INEFA_A4);
    if (ineffaConstellation >= 1) {
        ineffa.setCharSettings(Object.assign({}, INEFA_A4, {ineffa_rectifying_processor: true}));
    }
    columbina.setCharSettings(COLUMBINA_C2_ELECTRO);
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(ineffa, {atk_total: 1000});
    return {team, ineffa, columbina};
}

describe('Ineffa A4 reads premod ATK', () => {
    test('self copy: solo grant is 6% of ATK', () => {
        const ineffa = makeBuild('Ineffa');
        Team.fromMember(ineffa);
        ineffa.setCharSettings(INEFA_A4);
        matchCarrierTotals(ineffa, {atk_total: 1000});
        // No extra ATK anywhere, so premod ATK is the total: 6% of 1000.
        expect(delta(ineffa, () => ineffa.setCharSettings({}))('mastery')).toBeCloseTo(-60, 8);
    });

    test('self copy counts Columbina C2 premod ATK', () => {
        const {ineffa, columbina} = setupC2();
        // 1% of 30000 total HP, premod: Ineffa (on field) gains 300 ATK.
        expect(delta(ineffa, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-300, 8);
        columbina.setCharSettings(COLUMBINA_C2_ELECTRO);
        // Her A4 reads premod ATK (6%, no cap): +18 EM.
        expect(delta(ineffa, () => columbina.setCharSettings({}))('mastery')).toBeCloseTo(-18, 8);
    });

    test('self copy counts Chevreuse A4 premod ATK%', () => {
        const ineffa = makeBuild('Ineffa');
        const chevreuse = makeBuild('Chevreuse');
        const team = Team.fromMember(ineffa);
        team.setMember(1, chevreuse);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(ineffa);
        ineffa.setCharSettings(INEFA_A4);
        matchCarrierTotals(ineffa, {atk_total: 1000});
        matchCarrierTotals(chevreuse, {hp_total: 30000});
        // 0.1% of 30000 total HP, premod: +30% ATK on Ineffa (electro).
        const atkBase = finalStats(ineffa).get('atk_base');
        const dPct = delta(ineffa, () => chevreuse.setCharSettings({chevreuse_force_coordination: true}))('atk_percent');
        expect(dPct).toBeCloseTo(0.3, 8);
        chevreuse.setCharSettings({});
        // 6% of the premod ATK gain: no extra ATK anywhere, so the total
        // ATK gain is the premod one.
        const dEm = delta(ineffa, () => chevreuse.setCharSettings({chevreuse_force_coordination: true}))('mastery');
        expect(dEm).toBeCloseTo(0.06 * atkBase * 0.3, 8);
    });

    test("self copy ignores Bennett's burst extra ATK", () => {
        const ineffa = makeBuild('Ineffa');
        const bennet = makeBuild('Bennet');
        const team = Team.fromMember(ineffa);
        team.setMember(1, bennet);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(ineffa);
        ineffa.setCharSettings(INEFA_A4);
        matchCarrierTotals(ineffa, {atk_total: 1000});
        const emBefore = totalMastery(finalStats(ineffa));
        const atkBefore = finalStats(ineffa).get('atk');
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        // Bennett's burst reads base ATK and writes extra: total ATK rises
        // but the premod-read A4 EM must not move.
        expect(finalStats(ineffa).get('atk') - atkBefore).toBeGreaterThan(100);
        expect(totalMastery(finalStats(ineffa)) - emBefore).toBeCloseTo(0, 8);
    });
});

describe('Ineffa A4 team copy', () => {
    test("grants 6% of Ineffa's premod ATK to the active member", () => {
        const ineffa = makeBuild('Ineffa');
        const aino = makeBuild('Aino');
        const team = Team.fromMember(ineffa);
        team.setMember(1, aino);
        team.setMember(2, makeBuild('Columbina'));
        team.setMember(3, makeBuild('Kazuha'));
        team.setOnFieldMember(aino);
        ineffa.setCharSettings(INEFA_A4);
        matchCarrierTotals(ineffa, {atk_total: 2000});
        // Ineffa is off field and the active member is on field, so only
        // the team copy fires on Aino: 6% of 2000 = 120 EM.
        expect(delta(aino, () => ineffa.setCharSettings({}))('mastery')).toBeCloseTo(-120, 8);
    });

    test('team copy counts Chevreuse A4 premod ATK on off-field Ineffa', () => {
        const ineffa = makeBuild('Ineffa');
        const aino = makeBuild('Aino');
        const chevreuse = makeBuild('Chevreuse');
        const team = Team.fromMember(ineffa);
        team.setMember(1, aino);
        team.setMember(2, chevreuse);
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(aino);
        ineffa.setCharSettings(INEFA_A4);
        matchCarrierTotals(ineffa, {atk_total: 1000});
        matchCarrierTotals(chevreuse, {hp_total: 30000});
        const atkBase = finalStats(ineffa).get('atk_base');
        // Chevreuse A4 is a premod ATK% for the whole team, so it reaches
        // off-field Ineffa and the active member's grant moves with it.
        const dEm = delta(aino, () => chevreuse.setCharSettings({chevreuse_force_coordination: true}))('mastery');
        expect(dEm).toBeCloseTo(0.06 * atkBase * 0.3, 8);
    });

    test("team copy ignores the receiver's own Bennett extra ATK", () => {
        const ineffa = makeBuild('Ineffa');
        const aino = makeBuild('Aino');
        const bennet = makeBuild('Bennet');
        const team = Team.fromMember(ineffa);
        team.setMember(1, aino);
        team.setMember(2, bennet);
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(aino);
        ineffa.setCharSettings(INEFA_A4);
        matchCarrierTotals(ineffa, {atk_total: 2000});
        const grant = () => {
            const on = totalMastery(finalStats(aino));
            ineffa.setCharSettings({});
            const off = totalMastery(finalStats(aino));
            ineffa.setCharSettings(INEFA_A4);
            return on - off;
        };
        expect(grant()).toBeCloseTo(120, 8);
        // Bennett's burst raises the active member's total ATK, but the
        // grant scales on Ineffa's premod ATK and must not move with it.
        const atkBefore = finalStats(aino).get('atk');
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        expect(finalStats(aino).get('atk') - atkBefore).toBeGreaterThan(100);
        expect(grant()).toBeCloseTo(120, 8);
    });
});

describe('Ineffa Benediction reads total ATK (in-game test)', () => {
    test('solo formula and cap: 0.7% of ATK per 100, max 14', () => {
        const ineffa = makeBuild('Ineffa');
        Team.fromMember(ineffa);
        for (const [atk, expected] of [[1000, 0.07], [3000, 0.14]]) {
            matchCarrierTotals(ineffa, {atk_total: atk});
            // The game expression names no premod/total read; either way
            // the number here is 0.7% of ATK while no extra ATK is present.
            expect(finalStats(ineffa).get('lunarcharged_multi')).toBeCloseTo(expected, 8);
        }
    });

    test('counts Columbina C2 premod ATK', () => {
        const {ineffa, columbina} = setupC2();
        // Hold Brilliance on and switch only the dominant Lunar reaction to
        // dendro (EM, which no ATK-read bonus sees): Ineffa loses the 300
        // C2 ATK while her own ATK otherwise stays put. 0.7% of 300 per
        // 100 = 2.1 (uncapped: 1000 ATK gives 7%).
        const noAtk = {columbina_lunar_brilliance: true, columbina_c2_dominant_lunar: 'dendro'};
        expect(delta(ineffa, () => columbina.setCharSettings(noAtk))('lunarcharged_multi')).toBeCloseTo(-0.021, 8);
    });

    test("counts Bennett's burst ATK (extra), as measured in game", () => {
        const ineffa = makeBuild('Ineffa');
        const bennett = makeBuild('Bennet');
        const team = Team.fromMember(ineffa);
        team.setMember(1, bennett);
        team.setMember(2, makeBuild('Fischl'));
        team.setMember(3, makeBuild('Yelan'));
        team.setOnFieldMember(ineffa);
        matchCarrierTotals(ineffa, {atk_total: 938});
        // 0.7% per 100 ATK: 6.566% at 938 ATK.
        expect(finalStats(ineffa).get('lunarcharged_multi')).toBeCloseTo(0.00007 * 938, 8);

        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const stats = finalStats(ineffa);
        const extraAtk = stats.get('atk_extra');
        expect(extraAtk).toBeGreaterThan(100);
        expect(stats.get('lunarcharged_multi')).toBeCloseTo(Math.min(0.14, 0.00007 * (938 + extraAtk)), 8);
    });

    test('the in-game numbers follow the formula with a total read', () => {
        // 938 ATK: 6.566%. In Bennett's burst she was over 2,000 ATK: 14%.
        // A premod read would have left the tick at 4,037.
        expect(4037 * 1.14 / (1 + 0.00007 * 938)).toBeCloseTo(4319, 0);
    });

    test("ignores the Key's extra EM", () => {
        const ineffa = makeBuild('Ineffa');
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(ineffa);
        team.setMember(1, makeBuild('Aino'));
        team.setMember(2, kazuha);
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(ineffa);
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(ineffa, {atk_total: 1000});
        expect(finalStats(ineffa).get('lunarcharged_multi')).toBeCloseTo(0.07, 8);
        // The Key's party EM is extra: it raises her total EM but must not
        // move the ATK-read bonus.
        const emBefore = totalMastery(finalStats(ineffa));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(ineffa)) - emBefore).toBeGreaterThan(1);
        expect(finalStats(ineffa).get('lunarcharged_multi')).toBeCloseTo(0.07, 8);
    });
});

describe('Ineffa C1 reads premod ATK', () => {
    function setupC1Solo() {
        const ineffa = withConstellation('Ineffa', 1);
        Team.fromMember(ineffa);
        ineffa.setCharSettings({ineffa_rectifying_processor: true});
        return ineffa;
    }

    test('solo formula and cap: 2.5% of ATK per 100, max 50', () => {
        const ineffa = setupC1Solo();
        for (const [atk, expected] of [[1000, 0.25], [3000, 0.5]]) {
            matchCarrierTotals(ineffa, {atk_total: atk});
            expect(finalStats(ineffa).get('dmg_reaction_lunarcharged')).toBeCloseTo(expected, 8);
        }
    });

    test('counts Columbina C2 premod ATK', () => {
        const {ineffa, columbina} = setupC2(1);
        // 2.5% of 300 per 100 = 7.5 (uncapped: 1000 ATK gives 25%).
        const noAtk = {columbina_lunar_brilliance: true, columbina_c2_dominant_lunar: 'dendro'};
        expect(delta(ineffa, () => columbina.setCharSettings(noAtk))('dmg_reaction_lunarcharged')).toBeCloseTo(-0.075, 8);
    });

    test("ignores Bennett's burst extra ATK", () => {
        const ineffa = withConstellation('Ineffa', 1);
        const bennet = makeBuild('Bennet');
        const team = Team.fromMember(ineffa);
        team.setMember(1, bennet);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(ineffa);
        ineffa.setCharSettings({ineffa_rectifying_processor: true});
        matchCarrierTotals(ineffa, {atk_total: 1000});
        expect(finalStats(ineffa).get('dmg_reaction_lunarcharged')).toBeCloseTo(0.25, 8);
        const atkBefore = finalStats(ineffa).get('atk');
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        expect(finalStats(ineffa).get('atk') - atkBefore).toBeGreaterThan(100);
        expect(finalStats(ineffa).get('dmg_reaction_lunarcharged')).toBeCloseTo(0.25, 8);
    });

    test("ignores the Key's extra EM", () => {
        const ineffa = withConstellation('Ineffa', 1);
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(ineffa);
        team.setMember(1, makeBuild('Aino'));
        team.setMember(2, kazuha);
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(ineffa);
        ineffa.setCharSettings({ineffa_rectifying_processor: true});
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(ineffa, {atk_total: 1000});
        expect(finalStats(ineffa).get('dmg_reaction_lunarcharged')).toBeCloseTo(0.25, 8);
        const emBefore = totalMastery(finalStats(ineffa));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(ineffa)) - emBefore).toBeGreaterThan(1);
        expect(finalStats(ineffa).get('dmg_reaction_lunarcharged')).toBeCloseTo(0.25, 8);
    });
});
