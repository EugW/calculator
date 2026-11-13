import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Baizhu.
// A4 (All Things Are of the Earth) reads TOTAL HP: the game computes
// FIGHT_PROP_MAX_HP x TransRatio in Avatar_Baizhuer_Heal_ControlAbiilty
// (gated by Baizhuer_PermanentSkill_2_Param), and GO reads input.total.hp.
// Game formula: 2% / 0.8% / 0.7% per 1000 Max HP for Burning/Bloom-family /
// Aggravate-Spread / Lunar-Bloom, capped at 100 / 40 / 35 (cap binds at 50k HP).
// No ability writes extra HP, so premod and total HP agree today; the tests
// lock the formula and the counted side (premod HP such as Hydro resonance).
// C4 (Ancient Art of Perception) writes premod EM: the game
// (UNIQUE_Baizhuer_ElementalBurst_Talent4Buff, Talent_4 = C4, paramList
// [80, 15]) writes Actor_ElemMasteryDelta, and GO puts it under
// teamBuff.premod. Sucrose's A4 (20% of premod EM to others) is the real
// premod reader that must count it.

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

// Baizhu plus an on-field receiver and two neutral members; all four elements
// differ, so no Elemental Resonance applies.
function neutralTeam() {
    const baizhu = makeBuild('Baizhu');
    const receiver = makeBuild('Eula');
    const hutao = makeBuild('Hutao');
    const sucrose = makeBuild('Sucrose');
    const team = Team.fromMember(receiver);
    team.setMember(1, baizhu);
    team.setMember(2, hutao);
    team.setMember(3, sucrose);
    team.setOnFieldMember(receiver);
    return {team, baizhu, receiver};
}

function a4Bonus(stats) {
    return {
        bloom: stats.get('dmg_reaction_bloom') || 0,
        burning: stats.get('dmg_reaction_burning') || 0,
        quicken: stats.get('dmg_reaction_quicken') || 0,
        lunar: stats.get('dmg_reaction_lunarbloom') || 0,
    };
}

// Game formula for Baizhu's A4 at a given Max HP (decimal bonus).
function expectedA4(hp) {
    return {
        bloom: Math.min(0.002 * hp, 100) / 100,
        burning: Math.min(0.002 * hp, 100) / 100,
        quicken: Math.min(0.0008 * hp, 40) / 100,
        lunar: Math.min(0.0007 * hp, 35) / 100,
    };
}

test("A4 formula parity: 30k HP, 50k caps, 60k stays capped; off-field gets nothing", () => {
    const {baizhu, receiver} = neutralTeam();
    baizhu.setCharSettings({baizhu_all_things_are_of_the_earth: true});

    for (const hp of [30000, 50000, 60000]) {
        matchCarrierTotals(baizhu, {hp_total: hp});
        const got = a4Bonus(finalStats(receiver));
        const want = expectedA4(hp);
        expect(got.bloom).toBeCloseTo(want.bloom, 8);
        expect(got.burning).toBeCloseTo(want.burning, 8);
        expect(got.quicken).toBeCloseTo(want.quicken, 8);
        expect(got.lunar).toBeCloseTo(want.lunar, 8);
    }
    // 30k -> 60% / 24% / 21%; 50k -> 100% / 40% / 35% (caps).
    expect(expectedA4(30000).bloom).toBeCloseTo(0.6, 9);
    expect(expectedA4(50000).quicken).toBeCloseTo(0.4, 9);
    // The Year of Verdant Favor heals the active character: off-field Baizhu
    // holds no copy of his own bonus.
    expect(a4Bonus(finalStats(baizhu)).bloom).toBe(0);
});

test("A4 counts Hydro resonance HP (premod) and ignores Bennett burst ATK", () => {
    // Resonance team: Hydro pair -> +25% Max HP (a stage-0 premod condition).
    const baizhu = makeBuild('Baizhu');
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, baizhu);
    team.setMember(2, makeBuild('Barbara'));
    team.setMember(3, makeBuild('Xingqiu'));
    team.setOnFieldMember(receiver);
    baizhu.setCharSettings({baizhu_all_things_are_of_the_earth: true});

    // Same Baizhu build without resonance: dendro/hydro/cryo/pyro, no pair.
    const plain = makeBuild('Baizhu');
    const receiver2 = makeBuild('Eula');
    const team2 = Team.fromMember(receiver2);
    team2.setMember(1, plain);
    team2.setMember(2, makeBuild('Barbara'));
    team2.setMember(3, makeBuild('Hutao'));
    team2.setOnFieldMember(receiver2);
    plain.setCharSettings({baizhu_all_things_are_of_the_earth: true});

    const hpR = totalHp(finalStats(baizhu));
    const hpN = totalHp(finalStats(plain));
    // Sanity: resonance actually raised Baizhu's HP% by 25 points.
    expect(finalStats(baizhu).get('hp_percent') - finalStats(plain).get('hp_percent')).toBeCloseTo(0.25, 8);
    const gotR = a4Bonus(finalStats(receiver));
    const gotN = a4Bonus(finalStats(receiver2));
    const wantR = expectedA4(hpR);
    const wantN = expectedA4(hpN);
    expect(gotR.bloom).toBeCloseTo(wantR.bloom, 8);
    expect(gotN.bloom).toBeCloseTo(wantN.bloom, 8);
    expect(gotR.quicken).toBeCloseTo(wantR.quicken, 8);
    // The whole resonance gain is counted: the difference follows the formula.
    expect(gotR.bloom - gotN.bloom).toBeCloseTo(0.002 * (hpR - hpN) / 100, 8);

    // Bennett's burst ATK is extra ATK on the on-field receiver; the A4 reads
    // HP, so it must not move. Bennett is Pyro: still no resonance here.
    const bennett = makeBuild('Bennet');
    team2.setMember(3, bennett);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const before = a4Bonus(finalStats(receiver2)).bloom;
    const atkBefore = finalStats(receiver2).get('atk');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    const after = a4Bonus(finalStats(receiver2)).bloom;
    expect(finalStats(receiver2).get('atk') - atkBefore).toBeGreaterThan(10);
    expect(after).toBeCloseTo(before, 10);
});

test("C4 EM (premod write) is counted by Sucrose A4 (premod read)", () => {
    const sucrose = makeBuild('Sucrose');
    const baizhu = makeBuild('Baizhu');
    baizhu.setCharLevels({level: 90, ascension: 6, constellation: 4});
    const receiver = makeBuild('Eula');
    const team = Team.fromMember(receiver);
    team.setMember(1, sucrose);
    team.setMember(2, baizhu);
    team.setMember(3, makeBuild('Hutao'));
    team.setOnFieldMember(receiver);
    sucrose.setCharSettings({sucrose_mollis_favonius: true});
    sucrose.modifyBuffsSettings({'custom_buffs.mastery': 600});

    baizhu.setCharSettings({baizhu_ancient_art_of_perception: false});
    const sucOff = totalMastery(finalStats(sucrose));
    const recOff = totalMastery(finalStats(receiver));
    baizhu.setCharSettings({baizhu_ancient_art_of_perception: true});
    const sucOn = totalMastery(finalStats(sucrose));
    const recOn = totalMastery(finalStats(receiver));
    // Game formula: C4 gives every party member 80 EM flat.
    expect(sucOn - sucOff).toBeCloseTo(80, 8);
    // Sucrose shares 20% of her premod EM with other members, so the receiver
    // gains the 80 directly plus 20% x 80 = 16 through the grown share.
    expect(recOn - recOff).toBeCloseTo(80 + 0.2 * 80, 6);
});
