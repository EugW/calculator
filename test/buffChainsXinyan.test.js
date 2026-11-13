import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, featureValues } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Xinyan.
//
// - C6 Rockin' in a Flaming World (ATK from DEF): the game computes
//   Avatar_Xinyan_Talent_EnhanceExtraAttack as Actor_AttackExtraDelta =
//   Xinyan_Talent_EnhanceExtraAttack_DefPer x FIGHT_PROP_NONEXTRA_DEFENSE
//   (talent Xinyan_Constellation_6 paramList [-0.3, 0.5]: 50% of DEF).
//   Default channels (premod read, extra write) confirmed, so no params:
//   premod DEF (Columbina C2 Geo) counts, extra ATK (Bennett burst) does not
//   feed it back. KQM Xinyan ("C6 affects her Skill and Burst", v2.2): the
//   50% bonus lands on the stats page as flat ATK and her dynamic skill and
//   burst hits count it; no KQM buff-chain interaction test. GO reads
//   input.total.def into premod.atk (supporting evidence only; the game data
//   wins on both ends). Game formula: +50% of premod DEF as flat ATK while
//   Charged. (Our table had 30% there, the stamina number: fixed to 50%.)
// - Skill shields level 1/2/3 (FeatureShield scaling 'def*'): the game
//   builds UNIQUE_Xinyan_Skill_S_Shield.shieldHP as DefRatioDurability x
//   FIGHT_PROP_CUR_DEFENSE (total) + BaseDurability. scaling 'def*' reads the
//   total by construction and needs nothing. No ability writes extra DEF, so
//   premod and total DEF agree today; the Columbina cases below exercise the
//   total read through its premod part.
// - A4 "...Now That's Rock 'N' Roll!" (team 15% Physical DMG): the game
//   writes Actor_PhysicalAddHurtDelta from the flat DMGRate, no stat read.
//   Flat conditions are always premod: needs nothing.
// - C1 (12% Normal/Charged ATK SPD), C2 (100% burst Physical CRIT), C4
//   (Physical RES shred): flat, no stat read; needs nothing.
// - Damage hits scale plain ATK percentages with no FIGHT_PROP read: total
//   ATK by construction, need nothing.
// - The C6 write side (extra ATK, self-only) has no teammate reader today:
//   no converter reads another member's ATK, so only the read side and the
//   hit-visibility (KQM) direction are asserted.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md). The
// Bennett team has Pyro resonance, constant across its toggles (and the C6
// and shield reads below are DEF reads, unaffected by it).

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

function totalDef(stats) {
    return stats.get('def_base') * (1 + stats.get('def_percent')) + stats.get('def');
}

const C6_ON = {xinyan_rockin_in_a_flaming_world: true};

// Xinyan (pyro) + Kaeya (cryo) + Sucrose (anemo) + Aino (hydro): four
// different elements, so no resonance. Xinyan on field.
function neutralTeam(xinyanConstellation = 6) {
    const xinyan = withConstellation('Xinyan', xinyanConstellation);
    const team = Team.fromMember(xinyan);
    const kaeya = makeBuild('Kaeya');
    team.setMember(1, kaeya);
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Aino'));
    team.setOnFieldMember(xinyan);
    return {team, xinyan, kaeya};
}

// Xinyan on field with Columbina C2 (geo, 30000 HP -> +300 premod DEF).
// pyro/hydro/electro/cryo: no resonance. Flins is the second Moonsign
// character the C2 delivery needs; his own toggles stay off.
function setupC2() {
    const xinyan = withConstellation('Xinyan', 6);
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(xinyan);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Flins'));
    team.setMember(3, makeBuild('Kaeya'));
    team.setOnFieldMember(xinyan);
    columbina.setCharSettings({
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: 'geo',
    });
    matchCarrierTotals(columbina, {hp_total: 30000});
    xinyan.setCharSettings(C6_ON);
    return {team, xinyan, columbina};
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'geo',
};

describe("Xinyan C6 reads premod DEF, writes extra ATK", () => {
    test("formula: 50% of premod DEF, off gives nothing", () => {
        const {xinyan} = neutralTeam();
        xinyan.setCharSettings(C6_ON);
        matchCarrierTotals(xinyan, {def_total: 1000});
        expect(totalDef(finalStats(xinyan))).toBeCloseTo(1000, 8);
        // Toggling C6 off removes exactly half the premod DEF as ATK.
        expect(delta(xinyan, () => xinyan.setCharSettings({}))('atk')).toBeCloseTo(-500, 6);
        xinyan.setCharSettings(C6_ON);
        matchCarrierTotals(xinyan, {def_total: 2000});
        expect(delta(xinyan, () => xinyan.setCharSettings({}))('atk')).toBeCloseTo(-1000, 6);
        xinyan.setCharSettings(C6_ON);
    });

    test("counts Columbina C2 premod DEF", () => {
        const {xinyan, columbina} = setupC2();
        // 1% of 30000 total HP, premod: Xinyan (on field) gains 300 DEF.
        expect(delta(xinyan, () => columbina.setCharSettings({}))('def')).toBeCloseTo(-300, 8);
        columbina.setCharSettings(C2_ON);
        // Her C6 reads premod DEF (50%, no cap in this range): +150 ATK.
        expect(delta(xinyan, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-150, 6);
        columbina.setCharSettings(C2_ON);
    });

    test("ignores Bennett burst extra ATK", () => {
        const xinyan = withConstellation('Xinyan', 6);
        const team = Team.fromMember(xinyan);
        team.setMember(1, makeBuild('Kaeya'));
        team.setMember(2, makeBuild('Sucrose'));
        const bennett = makeBuild('Bennet');
        team.setMember(3, bennett);
        team.setOnFieldMember(xinyan);
        xinyan.setCharSettings(C6_ON);
        matchCarrierTotals(xinyan, {def_total: 1000});
        // C6 bonus with the burst off: 500 ATK.
        const bonusOff = -delta(xinyan, () => xinyan.setCharSettings({}))('atk');
        expect(bonusOff).toBeCloseTo(500, 6);
        xinyan.setCharSettings(C6_ON);
        // Bennett's burst reads base ATK and writes extra: it raises her
        // total ATK but must not move her DEF-read C6 bonus.
        const atkBefore = totalAtk(finalStats(xinyan));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(totalAtk(finalStats(xinyan)) - atkBefore).toBeGreaterThan(100);
        const bonusOn = -delta(xinyan, () => xinyan.setCharSettings({}))('atk');
        expect(bonusOn).toBeCloseTo(bonusOff, 8);
        xinyan.setCharSettings(C6_ON);
    });

    test("the bonus feeds dynamic hits like ordinary flat ATK (KQM)", () => {
        const {xinyan} = neutralTeam();
        xinyan.setCharSettings(C6_ON);
        matchCarrierTotals(xinyan, {def_total: 1000});
        const chargedOff = () => featureValues(xinyan)['attack.charged_final'][0];
        // A +100 flat-ATK bump with C6 off moves the hit by D1 ...
        xinyan.setCharSettings({});
        xinyan.modifyBuffsSettings({'custom_buffs.atk': 100});
        const withBump = chargedOff();
        xinyan.modifyBuffsSettings({'custom_buffs.atk': 0});
        const withoutBump = chargedOff();
        const per100 = withBump - withoutBump;
        expect(per100).toBeGreaterThan(10);
        // ... and the 500-ATK C6 bonus moves it by 5x D1: the extra write
        // lands in total ATK exactly like flat ATK, so dynamic hits count it.
        xinyan.setCharSettings(C6_ON);
        expect(chargedOff() - withoutBump).toBeCloseTo(5 * per100, 4);
    });
});

describe("Xinyan shield reads total DEF", () => {
    // Skill 13 (C3 +3): level-3 shield is 306% DEF + 1905.3866 flat
    // (CharTalentTables Xinyan s2 p6/p7, mirroring the game data).
    test("level-3 formula parity at matched DEF", () => {
        const {xinyan} = neutralTeam();
        matchCarrierTotals(xinyan, {def_total: 1000});
        expect(featureValues(xinyan)['skill.xinyan_shield_level_3'][0])
            .toBeCloseTo(3.06 * 1000 + 1905.3866, 4);
        matchCarrierTotals(xinyan, {def_total: 2000});
        expect(featureValues(xinyan)['skill.xinyan_shield_level_3'][0])
            .toBeCloseTo(3.06 * 2000 + 1905.3866, 4);
    });

    test("counts Columbina C2 premod DEF, ignores Bennett extra ATK", () => {
        const {xinyan, columbina} = setupC2();
        xinyan.setCharSettings({});
        const shield = () => featureValues(xinyan)['skill.xinyan_shield_level_3'][0];
        // +300 premod DEF moves the total-read shield by 306% x 300.
        expect(delta(xinyan, () => columbina.setCharSettings({}))('def')).toBeCloseTo(-300, 8);
        columbina.setCharSettings(C2_ON);
        const withC2 = shield();
        columbina.setCharSettings({});
        expect(withC2 - shield()).toBeCloseTo(3.06 * 300, 4);
        columbina.setCharSettings(C2_ON);

        // Bennett's extra ATK must not move the DEF-read shield.
        const bennett = makeBuild('Bennet');
        xinyan.team.setMember(3, bennett);
        const atkBefore = totalAtk(finalStats(xinyan));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(totalAtk(finalStats(xinyan)) - atkBefore).toBeGreaterThan(100);
        expect(shield()).toBeCloseTo(withC2, 8);
    });
});

describe("Xinyan flat effects (solo parity)", () => {
    test("A4 gives the team 15% Physical DMG", () => {
        const {xinyan, kaeya} = neutralTeam(0);
        expect(finalStats(kaeya).get('dmg_phys')).toBe(0);
        xinyan.setCharSettings({xinyan_now_thats_rock: true});
        expect(finalStats(kaeya).get('dmg_phys')).toBeCloseTo(0.15, 8);
    });
});
