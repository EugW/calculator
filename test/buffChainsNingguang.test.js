import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { featureValues, finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Ningguang.
//
// - Jade Screen HP display (FeaturePostEffectValue skill.ningguang_jade_screen_hp,
//   inner PostEffectStatsHP): the game builds the screen as gadget HP via
//   Actor_MaxHPRatio = SkillUpgrade_2_HpUpPercentageRatio
//   (Avatar_Ningguang_ServantStone_Material applies Ningguang_SkillUpgrade_2_HpUp;
//   the ProudSkill Inherited-HP param is 0.501 at skill 1, 0.816 at skill 10,
//   matching s2.p3). No FIGHT_PROP_* marker anywhere in
//   ConfigAbility_Avatar_Ningguang.json, so no read channel is evidenced
//   (engine-internal gadget HP, like Lyney's hat HP): the default premod read
//   stays. No ability writes extra HP, so it agrees with the total GO reads
//   (input.total.hp). KQM Ningguang has no EM/ATK/HP/ER buff-chain test.
// - A4 Strategic Reserve (12% team Geo DMG): the game
//   (Avatar_Ningguang_PermanentSkill_2,
//   UNIQUE_Ningguang_PermanentSkill_2_AttackUp) writes Actor_RockAddHurtDelta
//   from the flat PermanentSkill_RockAddHurtDelta special (0.12, ProudSkill
//   272201 param0), premod (no "Extra"), with no stat read. A flat
//   ConditionBoolean writes premod by construction: default confirmed.
//   GO puts it under teamBuff.premod.
// - C4 Exquisite be the Jade (10% team Elemental RES): the game
//   (Avatar_Ningguang_Constellation_4,
//   UNIQUE_ServantStone_Shield_ElementDefenceUp) writes Actor_*SubHurtDelta 0.1
//   for every element (premod, no "Extra"), no stat read. Flat condition =
//   premod: default confirmed. GO puts it under teamBuff.premod.
// - Damage hits read the total ATK by construction (plain damagePercentage
//   specials, no FIGHT_PROP read; GO dmgNode('atk', ...)) and need nothing.
// - A1/C1/C2/C3/C5/C6 read no stat and write no attribute.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

// Skill 10 (makeBuild sets every talent to 10): s2.p3 = 81.6 -> 81.6% of HP.
const JADE_HP_RATIO = 0.816;
const A4_GEO = 0.12;
const C4_RES = 0.1;

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function jadeHp(build) {
    return featureValues(build)['skill.ningguang_jade_screen_hp'][0];
}

// Ningguang (geo) + Kaeya (cryo) + Sucrose (anemo) + Aino (hydro): four
// different elements, so no Elemental Resonance.
function neutralTeam(ningguangConstellation = 0) {
    const ningguang = makeBuild('Ningguang');
    ningguang.setCharLevels({level: 90, ascension: 6, constellation: ningguangConstellation});
    const kaeya = makeBuild('Kaeya');
    const team = Team.fromMember(ningguang);
    team.setMember(1, kaeya);
    team.setMember(2, makeBuild('Sucrose'));
    team.setMember(3, makeBuild('Aino'));
    team.setOnFieldMember(ningguang);
    return {team, ningguang, kaeya};
}

describe("Jade Screen HP display (default premod read, engine-internal)", () => {
    test("formula parity: 81.6% of Max HP at skill 10", () => {
        const {ningguang} = neutralTeam();
        for (const hp of [20000, 30000]) {
            matchCarrierTotals(ningguang, {hp_total: hp});
            expect(totalHp(finalStats(ningguang))).toBeCloseTo(hp, 6);
            expect(jadeHp(ningguang)).toBeCloseTo(hp * JADE_HP_RATIO, 6);
        }
        expect(20000 * JADE_HP_RATIO).toBeCloseTo(16320, 9);
        expect(30000 * JADE_HP_RATIO).toBeCloseTo(24480, 9);
    });

    test("counts Hydro resonance HP (premod) through the formula", () => {
        // Resonance team: Hydro pair -> +25% Max HP (a stage-0 premod condition).
        const ningguang = makeBuild('Ningguang');
        const team = Team.fromMember(ningguang);
        team.setMember(1, makeBuild('Barbara'));
        team.setMember(2, makeBuild('Xingqiu'));
        team.setMember(3, makeBuild('Kaeya'));
        team.setOnFieldMember(ningguang);

        // Same Ningguang build without resonance: geo/hydro/pyro/cryo, no pair.
        const plain = makeBuild('Ningguang');
        const team2 = Team.fromMember(plain);
        team2.setMember(1, makeBuild('Barbara'));
        team2.setMember(2, makeBuild('Hutao'));
        team2.setMember(3, makeBuild('Kaeya'));
        team2.setOnFieldMember(plain);

        const hpR = totalHp(finalStats(ningguang));
        const hpN = totalHp(finalStats(plain));
        // Sanity: resonance actually raised Ningguang's HP% by 25 points.
        expect(finalStats(ningguang).get('hp_percent') - finalStats(plain).get('hp_percent'))
            .toBeCloseTo(0.25, 8);
        // The whole resonance gain is counted.
        expect(jadeHp(ningguang)).toBeCloseTo(hpR * JADE_HP_RATIO, 6);
        expect(jadeHp(plain)).toBeCloseTo(hpN * JADE_HP_RATIO, 6);
        expect(jadeHp(ningguang) - jadeHp(plain)).toBeCloseTo((hpR - hpN) * JADE_HP_RATIO, 6);
    });

    test("ignores Bennett extra ATK and Sucrose A4 extra EM", () => {
        const {team, ningguang} = neutralTeam();
        const sucrose = team.getSlots()[2];
        matchCarrierTotals(ningguang, {hp_total: 20000});
        matchCarrierTotals(sucrose, {mastery_total: 600});
        team.setOnFieldMember(ningguang);
        const before = jadeHp(ningguang);

        // Sucrose A4: 20% of 600 = 120 extra EM on the on-field Ningguang.
        const emBase = totalMastery(finalStats(ningguang));
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        expect(totalMastery(finalStats(ningguang)) - emBase).toBeCloseTo(120, 4);
        expect(jadeHp(ningguang)).toBeCloseTo(before, 8);

        // Bennett's burst ATK is extra ATK on the on-field Ningguang; the HP
        // display must not move.
        const bennett = makeBuild('Bennet');
        team.setMember(3, bennett);
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const atkBefore = finalStats(ningguang).get('atk');
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(finalStats(ningguang).get('atk') - atkBefore).toBeGreaterThan(10);
        expect(jadeHp(ningguang)).toBeCloseTo(before, 8);
    });
});

describe("A4 Strategic Reserve (flat team Geo DMG, premod by construction)", () => {
    test("team member gains 12% Geo DMG, nothing else", () => {
        const {ningguang, kaeya} = neutralTeam();
        teamSetOnField(kaeya);
        expect(finalStats(kaeya).get('dmg_geo')).toBeCloseTo(0, 9);
        ningguang.setCharSettings({ningguang_strategic_reserve: true});
        expect(finalStats(kaeya).get('dmg_geo')).toBeCloseTo(A4_GEO, 8);
        expect(finalStats(kaeya).get('dmg_pyro')).toBeCloseTo(0, 9);
        ningguang.setCharSettings({});
        expect(finalStats(kaeya).get('dmg_geo')).toBeCloseTo(0, 9);
    });

    test("ignores Bennett extra ATK (no stat read)", () => {
        const {team, ningguang, kaeya} = neutralTeam();
        teamSetOnField(kaeya);
        ningguang.setCharSettings({ningguang_strategic_reserve: true});
        const bennett = makeBuild('Bennet');
        team.setMember(3, bennett);
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const atkBefore = finalStats(kaeya).get('atk');
        const geoBefore = finalStats(kaeya).get('dmg_geo');
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(finalStats(kaeya).get('atk') - atkBefore).toBeGreaterThan(10);
        expect(finalStats(kaeya).get('dmg_geo')).toBeCloseTo(geoBefore, 10);
    });
});

describe("C4 Exquisite be the Jade (flat team RES, premod by construction)", () => {
    test("team member gains 10% Elemental RES in every element", () => {
        const {ningguang, kaeya} = neutralTeam(4);
        teamSetOnField(kaeya);
        const base = {};
        for (const stat of ['res_geo', 'res_pyro', 'res_hydro', 'res_cryo', 'res_electro', 'res_dendro', 'res_anemo']) {
            base[stat] = finalStats(kaeya).get(stat);
        }
        ningguang.setCharSettings({ningguang_exquisite_be_the_jade_outshining_all_beneath: true});
        for (const stat of ['res_geo', 'res_pyro', 'res_hydro', 'res_cryo', 'res_electro', 'res_dendro', 'res_anemo']) {
            expect(finalStats(kaeya).get(stat) - base[stat]).toBeCloseTo(C4_RES, 8);
        }
        ningguang.setCharSettings({});
        expect(finalStats(kaeya).get('res_geo') - base['res_geo']).toBeCloseTo(0, 9);
    });
});

describe("solo numbers with no extra stat present", () => {
    test("display formula and flat toggles off by default", () => {
        const {ningguang, kaeya} = neutralTeam();
        matchCarrierTotals(ningguang, {hp_total: 20000});
        expect(jadeHp(ningguang)).toBeCloseTo(20000 * JADE_HP_RATIO, 6);
        expect(finalStats(kaeya).get('dmg_geo')).toBeCloseTo(0, 9);
        // No C4: toggling it on and off returns RES to its base value.
        const resBase = finalStats(kaeya).get('res_geo');
        ningguang.setCharSettings({ningguang_exquisite_be_the_jade_outshining_all_beneath: true});
        ningguang.setCharSettings({});
        expect(finalStats(kaeya).get('res_geo')).toBeCloseTo(resBase, 9);
    });
});

function teamSetOnField(member) {
    member.team.setOnFieldMember(member);
}
