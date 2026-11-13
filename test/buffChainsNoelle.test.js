import { Condition } from "../src/js/classes/Condition";
import { PostEffectStats } from "../src/js/classes/PostEffect/Stats";
import { StatTable } from "../src/js/classes/StatTable";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, withSource, featureValues } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Noelle):
// - Sweeping Time (DEF -> ATK, incl. C6's extra 50%) reads premod DEF and
//   writes extra ATK (game: Avatar_Noel_Skill_E Buff modifier,
//   AS_Skill_E_AttackUp_PS33_P3 x FIGHT_PROP_NONEXTRA_DEFENSE into
//   Actor_AttackExtraDelta; extra_scan agrees). The defaults are confirmed,
//   so premod DEF writers (Columbina's C2 DEF) count and extra DEF does not
//   (nothing writes it in the game). GO reads input.total.def here, but the
//   game data says NONEXTRA: the game wins. KQM has no stat-interaction test
//   for her burst (only that it snapshots DEF at cast).
// - Every DEF-scaled hit, heal and shield reads FIGHT_PROP_CUR_DEFENSE
//   (total): our 'def*' already reads the total, so they need nothing. The
//   C4 hit is 400% of ATK (game text; KQM: it takes the ATK when the shield
//   breaks): the default 'atk*' scaling needs nothing.
// - C1/C2 are flat condition stats (conditions are always premod); A1/A4/C1
//   heal-chance and C3/C5 level boosts read no stat.
// - No premod ATK reader applies to her own ATK, so the extra-ATK write has
//   no must-not-count side on her; the C4 ratio below shows a total reader
//   counting it.
//
// Sweeping Time at burst talent 10 (makeBuild): s3.p3 = 72 -> 72% of DEF.
// At C6 the C5 +3 burst levels take it to talent 13 (s3.p3 = 85) and C6 adds
// another 50%: 135% of DEF.
//
// A 4-member team is used for the interaction tests: a smaller team would
// get Elemental Resonance in our engine but not in the game
// (md/buff_chains.md).

function totalDef(stats) {
    return stats.get('def_base') * (1 + stats.get('def_percent')) + stats.get('def');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function delta(member, apply) {
    const before = finalStats(member);
    apply();
    const after = finalStats(member);
    return (stat) => after.get(stat) - before.get(stat);
}

const BURST_ON = {noelle_sweeping_time: true};

// A synthetic extra-DEF write on Noelle (no game ability writes extra DEF):
// a default-stage post-effect writing DEF from a test-only source stat.
function withExtraDef(noelle, amount) {
    withSource(noelle,
        [new Condition({stats: {test_def_source: amount}})],
        [new PostEffectStats({from: 'test_def_source', percent: new StatTable('def', [1])})]);
}

// Noelle on field with Columbina C2 (geo, 30000 HP -> +300 premod DEF) and
// her burst on. Aino is the second Nod-Krai member: Columbina's C2 needs the
// Ascendant Gleam gate (Moonsign >= 2) open.
function setupC2(noelleConstellation = 0) {
    const noelle = makeBuild('Noelle');
    noelle.setCharLevels({level: 90, ascension: 6, constellation: noelleConstellation});
    const columbina = makeBuild('Columbina');
    columbina.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const team = Team.fromMember(noelle);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Kazuha'));
    team.setOnFieldMember(noelle);
    noelle.setCharSettings(BURST_ON);
    columbina.setCharSettings({
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: 'geo',
    });
    matchCarrierTotals(columbina, {hp_total: 30000});
    return {team, noelle, columbina};
}

function burstGain(noelle) {
    const off = totalAtk(finalStats(noelle));
    noelle.setCharSettings(BURST_ON);
    return totalAtk(finalStats(noelle)) - off;
}

describe("burst reads premod DEF, writes extra ATK", () => {
    test("solo formula: 72% of DEF", () => {
        const noelle = makeBuild('Noelle');
        Team.fromMember(noelle);
        matchCarrierTotals(noelle, {def_total: 2000});
        expect(totalDef(finalStats(noelle))).toBeCloseTo(2000, 6);
        // No extra DEF solo, so premod DEF is the total: +2000 DEF is +1440 ATK.
        expect(burstGain(noelle)).toBeCloseTo(0.72 * 2000, 6);
    });

    test("C6: 135% of DEF (85 talent + 50 C6)", () => {
        const noelle = makeBuild('Noelle');
        noelle.setCharLevels({level: 90, ascension: 6, constellation: 6});
        Team.fromMember(noelle);
        matchCarrierTotals(noelle, {def_total: 2000});
        expect(totalDef(finalStats(noelle))).toBeCloseTo(2000, 6);
        expect(burstGain(noelle)).toBeCloseTo(1.35 * 2000, 6);
    });

    test("counts Columbina C2 premod DEF", () => {
        const {noelle, columbina} = setupC2();
        // 1% of 30000 total HP, premod: Noelle (on field) gains 300 DEF.
        expect(delta(noelle, () => columbina.setCharSettings({}))('def')).toBeCloseTo(-300, 6);
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'geo',
        });
        // Her burst reads premod DEF (72% at talent 10): +216 ATK.
        expect(delta(noelle, () => columbina.setCharSettings({}))('atk')).toBeCloseTo(-0.72 * 300, 6);
    });

    test("ignores a synthetic extra DEF write (premod, not total)", () => {
        const plain = makeBuild('Noelle');
        Team.fromMember(plain);
        matchCarrierTotals(plain, {def_total: 2000});
        const boosted = makeBuild('Noelle');
        Team.fromMember(boosted);
        matchCarrierTotals(boosted, {def_total: 2000});
        withExtraDef(boosted, 500);
        // The synthetic write lands in the extra lane only.
        expect(finalStats(boosted).get('def_extra') || 0).toBeCloseTo(500, 6);
        expect(totalDef(finalStats(boosted)) - totalDef(finalStats(plain))).toBeCloseTo(500, 6);
        // A premod read ignores the extra 500 DEF: the burst gain stays put.
        // A total read would grow it by 0.72 x 500 = 360.
        expect(burstGain(plain)).toBeCloseTo(0.72 * 2000, 6);
        expect(burstGain(boosted)).toBeCloseTo(0.72 * 2000, 6);
    });
});

describe("DEF-scaled hits read total DEF", () => {
    test("skill hit scales with extra DEF", () => {
        const plain = makeBuild('Noelle');
        Team.fromMember(plain);
        matchCarrierTotals(plain, {def_total: 2000});
        const boosted = makeBuild('Noelle');
        Team.fromMember(boosted);
        matchCarrierTotals(boosted, {def_total: 2000});
        withExtraDef(boosted, 500);
        // The skill hit is pure DEF x rate (game: damageExtra with
        // FIGHT_PROP_CUR_DEFENSE), so everything else cancels in the ratio.
        const plainHit = featureValues(plain)['skill.skill_dmg'][0];
        const boostedHit = featureValues(boosted)['skill.skill_dmg'][0];
        expect(boostedHit / plainHit).toBeCloseTo(2500 / 2000, 6);
    });
});

describe("ATK-scaled hits count the burst ATK", () => {
    test("C4 hit scales with the burst ATK (total read)", () => {
        const noelle = makeBuild('Noelle');
        noelle.setCharLevels({level: 90, ascension: 6, constellation: 4});
        Team.fromMember(noelle);
        matchCarrierTotals(noelle, {def_total: 2000});
        // The C4 hit is 400% of ATK (game text): its burst on/off ratio is
        // the ATK ratio, since the mitigation cancels out.
        const atkOff = totalAtk(finalStats(noelle));
        const c4Off = featureValues(noelle)['skill.noelle_to_be_cleaned'][0];
        noelle.setCharSettings(BURST_ON);
        const atkOn = totalAtk(finalStats(noelle));
        const c4On = featureValues(noelle)['skill.noelle_to_be_cleaned'][0];
        expect(c4On / c4Off).toBeCloseTo(atkOn / atkOff, 6);
        expect(c4On - c4Off).toBeGreaterThan(1000);
    });
});
