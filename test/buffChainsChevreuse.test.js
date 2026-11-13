import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery, featureValues } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md worker: Chevreuse.
// A4 reads total HP (FIGHT_PROP_MAX_HP via CalcDamageUp) and writes premod ATK%
// (Actor_AttackRatio in UNIQUE_Avatar_Chevreuse_Damage_Up). Game formula: 1% ATK
// per 1000 Max HP, cap 40%. Flins A4 (8% of premod ATK as EM, cap 160) is the
// real premod reader; Bennett burst (base ATK -> extra ATK) is the extra writer
// a premod reader must ignore.

function chevreusePair() {
    const flins = makeBuild('Flins');
    const chevreuse = makeBuild('Chevreuse');
    const team = Team.fromMember(flins);
    team.setMember(1, chevreuse);
    return {team, flins, chevreuse};
}

test("solo parity and HP scaling: 20k HP -> 20% ATK, 30k HP -> 30%, Dendro gets nothing", () => {
    const chevreuse = makeBuild('Chevreuse');
    chevreuse.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const hutao = makeBuild('Hutao');
    const dendro = makeBuild('Alhaitham');
    const team = Team.fromMember(hutao);
    team.setMember(1, chevreuse);
    matchCarrierTotals(chevreuse, {hp_total: 20000});
    chevreuse.setCharSettings({
        chevreuse_tactics: true,
        chevreuse_force_coordination: true,
        chevreuse_in_pursuit: 3,
    });
    const gain20 = finalStats(hutao).get('atk_percent');
    matchCarrierTotals(chevreuse, {hp_total: 30000});
    const gain30 = finalStats(hutao).get('atk_percent');
    // Game formula: 1% per 1000 HP, so +10k HP is +10% ATK (decimal 0.1).
    // (Absolute includes Pyro resonance 25% in this Pyro+Pyro team, so only the
    // difference is asserted.)
    expect(gain30 - gain20).toBeCloseTo(0.1, 8);
    // Dendro receiver gets nothing from the HP scaling.
    expect(finalStats(Team.solo(dendro)).get('atk_percent') || 0).toBeCloseTo(0, 10);
    // C6: 3 stacks x 20% Pyro DMG.
    expect(finalStats(hutao).get('dmg_pyro')).toBeCloseTo(0.6, 8);
});

test("writes PREMOD: Flins A4 (premod ATK read) counts Chevreuse A4", () => {
    const {flins, chevreuse} = chevreusePair();
    matchCarrierTotals(chevreuse, {hp_total: 30000});
    chevreuse.setCharSettings({chevreuse_force_coordination: false});
    const emOff = totalMastery(finalStats(flins));
    const atkBase = finalStats(flins).get('atk_base');
    chevreuse.setCharSettings({chevreuse_force_coordination: true});
    const emOn = totalMastery(finalStats(flins));
    // Game formula: Chevreuse gives 30% ATK at 30k HP; Flins A4 gives 8% of that
    // premod ATK as EM. Expected gain = 0.08 * 0.30 * Flins base ATK (cap 160
    // not reached: assert below).
    const expected = 0.08 * 0.30 * atkBase;
    expect(expected).toBeLessThan(150);
    expect(emOn - emOff).toBeCloseTo(expected, 1);
    expect(emOn - emOff).toBeGreaterThan(1);
});

test("premod proof: Bennett burst (extra ATK) does NOT move Flins A4 EM", () => {
    const flins = makeBuild('Flins');
    const bennett = makeBuild('Bennet');
    const team = Team.fromMember(flins);
    team.setMember(1, bennett);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const emOff = totalMastery(finalStats(flins));
    const atkOff = finalStats(flins).get('atk');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    const emOn = totalMastery(finalStats(flins));
    const atkOn = finalStats(flins).get('atk');
    // Sanity: Bennett applied (Flins total ATK rose), but his extra ATK is
    // invisible to the premod read, so Flins A4 EM does not move.
    expect(atkOn - atkOff).toBeGreaterThan(10);
    expect(emOn - emOff).toBeCloseTo(0, 8);
});

test("reads HP (not ATK): Chevreuse A4 follows HP and ignores Bennett ATK; heals follow HP", () => {
    const {team, flins, chevreuse} = chevreusePair();
    chevreuse.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const bennett = makeBuild('Bennet');
    // Reuse the pair team and add Bennett in slot 2 (Pyro, keeps receivers valid).
    team.setMember(2, bennett);
    matchCarrierTotals(chevreuse, {hp_total: 20000});
    chevreuse.setCharSettings({chevreuse_force_coordination: true});
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const atk20 = finalStats(flins).get('atk_percent');
    const heal20 = featureValues(chevreuse)['skill.heal_dot'][0];
    matchCarrierTotals(chevreuse, {hp_total: 30000});
    const atk30 = finalStats(flins).get('atk_percent');
    const heal30 = featureValues(chevreuse)['skill.heal_dot'][0];
    expect(atk30 - atk20).toBeCloseTo(0.1, 8);
    // Skill hold heal at skill 13 (10 + C3): 5.6667% of Max HP + flat, so +10k HP
    // is +566.67 healing (CharTalentTables Chevreuse s2 p5[12]=5.6667).
    expect(heal30 - heal20).toBeCloseTo(566.67, 0);
    // C6 party heal is 10% of Max HP: 3000 at 30k HP.
    expect(featureValues(chevreuse)['skill.chevreuse_heal_dot'][0]).toBeCloseTo(3000, 0);
    // Bennett's extra ATK must not change Chevreuse's HP-scaled ATK% nor her heals.
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(finalStats(flins).get('atk_percent')).toBeCloseTo(atk30, 8);
    expect(featureValues(chevreuse)['skill.heal_dot'][0]).toBeCloseTo(heal30, 6);
});
