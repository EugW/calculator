import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery, featureValues } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Itto):
// - Burst DEF -> ATK reads premod DEF (game:
//   UNIQUE_Avatar_Itto_ElementalBurst_Buff Actor_AttackExtraDelta from
//   FIGHT_PROP_NONEXTRA_DEFENSE x Defence_Ratio, 103.68% at burst 10) and
//   writes extra ATK. The default channels are confirmed, so premod DEF
//   writers (Columbina C2) count. GO reads input.total.def; the game reads
//   premod, the same number while nothing writes extra DEF. No ability in
//   the game writes extra DEF, so the must-not-count side below uses the
//   Key's extra EM instead (a DEF-read bonus must not move with it).
// - A4 Kesagiri bonus reads total DEF (game:
//   Avatar_Itto_ExtraAttack_DamageUp ModifyDamageMixin damageExtra
//   [FIGHT_PROP_CUR_DEFENSE x Defence_Ratio], +35% of DEF); scaling: 'def*'
//   already reads the total. GO reads input.premod.def; the game reads
//   total, the same number while nothing writes extra DEF.
// - C4 team ATK%/DEF% are premod writes (game: Actor_AttackRatio /
//   Actor_DefenceRatio, no Extra); conditions write premod by construction.
// - Ushi HP display: the game data names no premod/total read (gadget-side
//   Actor_MaxHPRatio, engine-internal); GO reads input.total.hp. Default
//   kept; the same number either way while nothing writes extra HP.
// - C6, A1, burst SPD/RES/infusion: flats, no stat read. Damage hits read
//   total ATK (default atk* scaling) and need nothing.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

const BURST_RATIO = 1.0368; // burst 10: CharTalentTables.Itto.s3.p2[9]
const A4_RATIO = 0.35; // TalentValues.A4ChargedDefBonus
const COMBO_TALENT = 1.802; // combo slash at attack 10: s1.p6[9]

function totalDef(stats) {
    return stats.get('def_base') * (1 + stats.get('def_percent')) + stats.get('def');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

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

function kesagiriDamage(itto) {
    return featureValues(itto)['attack.itto_kesagiri_combo_slash_dmg'][2];
}

const BURST_ON = {itto_royal_descent: true};
const C2_GEO = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'geo',
};

// Itto on field with Columbina C2 (geo, 30000 HP -> +300 premod DEF).
// Aino is the second Nod-Krai member for the Ascendant Gleam gate
// (Moonsign >= 2); Bennet is a neutral fourth.
function setupC2(burstOn = true) {
    const itto = makeBuild('Itto');
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(itto);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Bennet'));
    team.setOnFieldMember(itto);
    if (burstOn) {
        itto.setCharSettings(BURST_ON);
    }
    columbina.setCharSettings(C2_GEO);
    matchCarrierTotals(columbina, {hp_total: 30000});
    return {team, itto, columbina};
}

// Neutral 4-member team (no settings on anyone but Itto).
function setupNeutral() {
    const itto = makeBuild('Itto');
    const team = Team.fromMember(itto);
    team.setMember(1, makeBuild('Aino'));
    team.setMember(2, makeBuild('Kazuha'));
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(itto);
    return {team, itto};
}

function setupKey() {
    const itto = makeBuild('Itto');
    const kazuha = makeBuild('Kazuha');
    kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
    kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
    const team = Team.fromMember(itto);
    team.setMember(1, makeBuild('Aino'));
    team.setMember(2, kazuha);
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(itto);
    kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
    return {team, itto, kazuha};
}

describe("Itto burst reads premod DEF", () => {
    test("solo grant is 103.68% of DEF", () => {
        const {itto} = setupNeutral();
        itto.setCharSettings(BURST_ON);
        const def = totalDef(finalStats(itto));
        // Toggling the burst moves nothing but ATK (no extra DEF anywhere,
        // so premod DEF is the total): the grant is 103.68% of it.
        expect(delta(itto, () => itto.setCharSettings({}))('atk')).toBeCloseTo(-BURST_RATIO * def, 4);
    });

    test("counts Columbina C2 premod DEF", () => {
        const {itto, columbina} = setupC2();
        // 1% of 30000 total HP, premod: Itto (on field) gains 300 DEF.
        expect(delta(itto, () => columbina.setCharSettings({}))('def')).toBeCloseTo(-300, 6);
        columbina.setCharSettings(C2_GEO);
        // His burst reads premod DEF (103.68%, no cap): +311.04 ATK.
        expect(delta(itto, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-300 * BURST_RATIO, 4);
    });

    test("ignores the Key's extra EM", () => {
        const {itto, kazuha} = setupKey();
        itto.setCharSettings(BURST_ON);
        const grant = () => {
            const on = finalStats(itto).get('atk');
            itto.setCharSettings({});
            const off = finalStats(itto).get('atk');
            itto.setCharSettings(BURST_ON);
            return on - off;
        };
        const def = totalDef(finalStats(itto));
        expect(grant()).toBeCloseTo(BURST_RATIO * def, 4);
        // The Key's party EM is extra: it raises Itto's total EM, but the
        // premod-DEF burst grant must not move with it.
        const emBefore = totalMastery(finalStats(itto));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(itto)) - emBefore).toBeGreaterThan(1);
        expect(grant()).toBeCloseTo(BURST_RATIO * def, 4);
    });
});

describe("Itto A4 reads total DEF", () => {
    test("Kesagiri DEF slope vs ATK slope is 0.35 / talent", () => {
        const {itto} = setupNeutral();
        // Burst off: ATK stays put while DEF moves, so only the A4 term
        // (0.35 x DEF) moves with DEF. Ascension 6, so the A4 is active.
        const base = (() => {
            matchCarrierTotals(itto, {atk_total: 2000, def_total: 2000});
            return kesagiriDamage(itto);
        })();
        matchCarrierTotals(itto, {atk_total: 3000, def_total: 2000});
        const dAtk = kesagiriDamage(itto) - base;
        matchCarrierTotals(itto, {atk_total: 2000, def_total: 3000});
        const dDef = kesagiriDamage(itto) - base;
        // Same enemy mitigation on both deltas, so it cancels: the game
        // formula gives (0.35 x 1000) / (1.802 x 1000).
        expect(dAtk).toBeGreaterThan(100);
        expect(dDef / dAtk).toBeCloseTo(A4_RATIO / COMBO_TALENT, 4);
    });

    test("counts Columbina C2 premod DEF through damage (burst off)", () => {
        const {itto, columbina} = setupC2(false);
        // Mitigation from an ATK bump in the same setup: the combo slash
        // scales its ATK part at 180.2%.
        const atkNow = totalAtk(finalStats(itto));
        const dOn = kesagiriDamage(itto);
        matchCarrierTotals(itto, {atk_total: atkNow + 1000});
        const mitigation = (kesagiriDamage(itto) - dOn) / (COMBO_TALENT * 1000);
        matchCarrierTotals(itto, {atk_total: atkNow});
        // Back at matched ATK: losing the 300 C2 DEF costs 0.35 x 300 of
        // A4 damage (a total read counts the premod write).
        expect(delta(itto, () => columbina.setCharSettings({}))('def')).toBeCloseTo(-300, 6);
        columbina.setCharSettings(C2_GEO);
        const dOff = (() => {
            columbina.setCharSettings({});
            const value = kesagiriDamage(itto);
            columbina.setCharSettings(C2_GEO);
            return value;
        })();
        expect(dOn - dOff).toBeCloseTo(A4_RATIO * 300 * mitigation, 4);
    });

    test("ignores the Key's extra EM", () => {
        const {itto, kazuha} = setupKey();
        matchCarrierTotals(itto, {atk_total: 2000, def_total: 2000});
        const before = kesagiriDamage(itto);
        // The Key's party EM is extra: it raises Itto's total EM but must
        // not move the DEF-read Kesagiri bonus.
        const emBefore = totalMastery(finalStats(itto));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(itto)) - emBefore).toBeGreaterThan(1);
        expect(kesagiriDamage(itto) - before).toBeCloseTo(0, 8);
    });
});

describe("Itto C4 grants 20% ATK and DEF to the team (premod)", () => {
    test("formula on a teammate and on Itto himself", () => {
        const itto = withConstellation('Itto', 4);
        const fischl = makeBuild('Fischl');
        const team = Team.fromMember(itto);
        team.setMember(1, fischl);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Kazuha'));
        team.setOnFieldMember(fischl);
        const C4 = {itto_jailhouse_bread_and_butter: true};
        itto.setCharSettings(C4);
        // Flat team percent buffs (game: Actor_AttackRatio /
        // Actor_DefenceRatio, premod); conditions write premod.
        expect(delta(fischl, () => itto.setCharSettings({}))('def_percent')).toBeCloseTo(-0.2, 9);
        itto.setCharSettings(C4);
        expect(delta(fischl, () => itto.setCharSettings({}))('atk_percent')).toBeCloseTo(-0.2, 9);
        itto.setCharSettings(C4);
        expect(delta(itto, () => itto.setCharSettings({}))('def_percent')).toBeCloseTo(-0.2, 9);
    });
});

describe("Ushi HP and solo parity", () => {
    test("Ushi HP is 100% of Max HP", () => {
        const itto = makeBuild('Itto');
        Team.fromMember(itto);
        // No extra HP exists in the game, so the premod read and a total
        // read give the same number here.
        const hp = totalHp(finalStats(itto));
        expect(featureValues(itto)['skill.itto_hurls_ushi_hp'][2]).toBeCloseTo(hp, 4);
    });
});
