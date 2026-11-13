import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { featureValues, finalStats, makeBuild, makeSolo, totalMastery } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md worker: Lyney.
//
// Lyney has no stat conversion: no post-effect writes an attribute, so no
// read/write channel can chain. The evidence (game data
// ConfigAbility_Avatar_Liney.json, GO Characters/Lyney/index.tsx, game text;
// KQM's Lyney page has no EM/ATK/HP/ER buff-interaction test):
// - Grin-Malkin Hat inherited HP (FeaturePostEffectValue lyney_hat_hp,
//   talent 10: 115.2% of Max HP): the FissionAgent gadget HP comes from the
//   MaxHPRatio special with no FIGHT_PROP_* marker (engine-internal, like a
//   heal), so no read channel is evidenced and the default premod read stays.
//   No ability writes extra HP, so it agrees with the total GO reads.
// - Skill heal (20% of Max HP per Prop Surplus stack): game action HealHP
//   with amountByTargetMaxHPRatio (engine-internal); heal scalings read the
//   total by construction.
// - A1 Perilous Performance (+80% Pyrotechnic Strike DMG): flat addition onto
//   the ATK base (Bullet_EndBoom damagePercentage ADDs
//   AfterFission_PermanentSkill_1_HurtUp; GO: 80% x input.total.atk). Damage
//   reads total ATK, so Bennett's (extra) ATK counts.
// - Skill per-stack bonus: flat addition onto the same ATK base (GO TODO
//   about Bennett notwithstanding, it is an ordinary damage multiplier here).
// - A4 Conclusive Ovation (dmg_all 60/80/100%): Avatar_Liney_PermanentSkill_2
//   ModifyDamageMixin on BaseDPR/ExtraDPR stepped by the same-element count
//   (ProudSkill 842201 [0.6, 0.2]); no stat read.
// - C2 (+20% CRIT DMG/stack, Actor_CriticalHurtDelta), C4 (-20% enemy Pyro
//   RES, Actor_FireSubHurtDelta), C6 (80% reprised strike): flat, no reads.
// - C1/C3/C5: no stat reads.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

// Talent 10 values (makeBuild sets every talent to 10).
const HAT_HP_RATIO = 1.152;      // attack p13
const PYRO_BASE = 381.6;         // attack p15
const A1_BONUS = 80;             // flat, ProudSkill 842101
const HEAL_PER_STACK = 0.2;      // skill p3
const C6_RATIO = 0.8;            // ProudSkill talent 846

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function hatHp(build) {
    return featureValues(build)['attack.lyney_hat_hp'][0];
}

function heal(build) {
    return featureValues(build)['skill.lyney_hp_regeneration'][0];
}

function pyroStrike(build) {
    return featureValues(build)['attack.lyney_pyrotechnic_strike_dmg'][0];
}

// Lyney plus three members of other elements: no Elemental Resonance.
function neutralTeam() {
    const lyney = makeBuild('Lyney');
    const eula = makeBuild('Eula');
    const sucrose = makeBuild('Sucrose');
    const fischl = makeBuild('Fischl');
    const team = Team.fromMember(eula);
    team.setMember(1, lyney);
    team.setMember(2, sucrose);
    team.setMember(3, fischl);
    team.setOnFieldMember(lyney);
    return {team, lyney, sucrose};
}

test('hat HP formula parity: 115.2% of Max HP', () => {
    const {lyney} = neutralTeam();
    for (const hp of [20000, 30000]) {
        matchCarrierTotals(lyney, {hp_total: hp});
        expect(totalHp(finalStats(lyney))).toBeCloseTo(hp, 6);
        expect(hatHp(lyney)).toBeCloseTo(hp * HAT_HP_RATIO, 6);
    }
    expect(20000 * HAT_HP_RATIO).toBeCloseTo(23040, 9);
    expect(30000 * HAT_HP_RATIO).toBeCloseTo(34560, 9);
});

test('hat HP counts premod HP: Hydro resonance follows the formula', () => {
    // Resonance team: Hydro pair -> +25% Max HP (a stage-0 premod condition).
    const lyney = makeBuild('Lyney');
    const team = Team.fromMember(makeBuild('Eula'));
    team.setMember(1, lyney);
    team.setMember(2, makeBuild('Barbara'));
    team.setMember(3, makeBuild('Xingqiu'));
    team.setOnFieldMember(lyney);

    // Same Lyney build without resonance: pyro/cryo/hydro/anemo, no pair.
    const plain = makeBuild('Lyney');
    const team2 = Team.fromMember(makeBuild('Eula'));
    team2.setMember(1, plain);
    team2.setMember(2, makeBuild('Barbara'));
    team2.setMember(3, makeBuild('Sucrose'));
    team2.setOnFieldMember(plain);

    const hpR = totalHp(finalStats(lyney));
    const hpN = totalHp(finalStats(plain));
    // Sanity: resonance actually raised Lyney's HP% by 25 points.
    expect(finalStats(lyney).get('hp_percent') - finalStats(plain).get('hp_percent'))
        .toBeCloseTo(0.25, 8);
    // The whole resonance gain is counted.
    expect(hatHp(lyney)).toBeCloseTo(hpR * HAT_HP_RATIO, 6);
    expect(hatHp(plain)).toBeCloseTo(hpN * HAT_HP_RATIO, 6);
    expect(hatHp(lyney) - hatHp(plain)).toBeCloseTo((hpR - hpN) * HAT_HP_RATIO, 6);
});

test('hat HP ignores extra ATK (Bennett burst) and extra EM (Sucrose A4)', () => {
    const {team, lyney, sucrose} = neutralTeam();
    matchCarrierTotals(lyney, {hp_total: 20000});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    const before = hatHp(lyney);

    // Sucrose A4: 20% of 600 = 120 extra EM on the on-field Lyney.
    const emBase = totalMastery(finalStats(lyney));
    sucrose.setCharSettings({sucrose_mollis_favonius: true});
    expect(totalMastery(finalStats(lyney)) - emBase).toBeCloseTo(120, 4);
    expect(hatHp(lyney)).toBeCloseTo(before, 8);

    // Bennett's burst ATK is extra ATK on the on-field Lyney; the hat reads
    // HP, so it must not move.
    const bennett = makeBuild('Bennet');
    team.setMember(3, bennett);
    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const atkBefore = finalStats(lyney).get('atk');
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(finalStats(lyney).get('atk') - atkBefore).toBeGreaterThan(10);
    expect(hatHp(lyney)).toBeCloseTo(before, 8);
});

test('skill heal formula parity: 20% of Max HP per stack, resonance counted', () => {
    const {lyney} = neutralTeam();
    matchCarrierTotals(lyney, {hp_total: 20000});
    lyney.setCharSettings({lyney_surplus_stacks: 5});
    expect(heal(lyney)).toBeCloseTo(20000 * HEAL_PER_STACK * 5, 6);
    lyney.setCharSettings({lyney_surplus_stacks: 1});
    expect(heal(lyney)).toBeCloseTo(20000 * HEAL_PER_STACK, 6);

    // Hydro resonance (premod HP) is counted.
    const res = makeBuild('Lyney');
    const team = Team.fromMember(makeBuild('Eula'));
    team.setMember(1, res);
    team.setMember(2, makeBuild('Barbara'));
    team.setMember(3, makeBuild('Xingqiu'));
    team.setOnFieldMember(res);
    res.setCharSettings({lyney_surplus_stacks: 5});
    expect(heal(res)).toBeCloseTo(totalHp(finalStats(res)), 6);
});

test('skill heal ignores extra ATK and extra EM', () => {
    const {team, lyney, sucrose} = neutralTeam();
    matchCarrierTotals(lyney, {hp_total: 20000});
    matchCarrierTotals(sucrose, {mastery_total: 600});
    lyney.setCharSettings({lyney_surplus_stacks: 5});
    const before = heal(lyney);

    sucrose.setCharSettings({sucrose_mollis_favonius: true});
    expect(heal(lyney)).toBeCloseTo(before, 8);

    const bennett = makeBuild('Bennet');
    team.setMember(3, bennett);
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    expect(finalStats(lyney).get('atk')).toBeGreaterThan(10);
    expect(heal(lyney)).toBeCloseTo(before, 8);
});

test('A1 parity: +80% of ATK on the Pyrotechnic Strike; C6 reprised is 80%', () => {
    const {team, lyney} = neutralTeam();
    team.enemy.modifySettings({'common.enemy_status': 'pyro'});
    lyney.setCharSettings({lyney_perilous_performance: false});
    const off = pyroStrike(lyney);
    lyney.setCharSettings({lyney_perilous_performance: true});
    const on = pyroStrike(lyney);
    // Both share the same ATK, A4 bonus and enemy state: only the flat 80%
    // differs, on the 381.6% talent base.
    expect(on / off).toBeCloseTo((PYRO_BASE + A1_BONUS) / PYRO_BASE, 6);
    expect((PYRO_BASE + A1_BONUS) / PYRO_BASE).toBeCloseTo(461.6 / 381.6, 9);

    // C6 Reprised is a flat 80% of the same strike (no A1 bonus on it).
    const c6 = makeBuild('Lyney');
    c6.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const team2 = Team.fromMember(makeBuild('Eula'));
    team2.setMember(1, c6);
    team2.setMember(2, makeBuild('Sucrose'));
    team2.setMember(3, makeBuild('Fischl'));
    team2.setOnFieldMember(c6);
    team2.enemy.modifySettings({'common.enemy_status': 'pyro'});
    c6.setCharSettings({lyney_perilous_performance: false});
    const reprised = featureValues(c6)['attack.lyney_pyrotechnic_strike_reprised_dmg'][0];
    expect(reprised / pyroStrike(c6)).toBeCloseTo(C6_RATIO, 6);
});

test("Lyney's damage counts Bennett's extra ATK (damage reads total)", () => {
    // Pyro pair present in both states, so resonance is constant; only the
    // burst toggle moves ATK.
    const lyney = makeBuild('Lyney');
    const bennett = makeBuild('Bennet');
    const team = Team.fromMember(makeBuild('Eula'));
    team.setMember(1, lyney);
    team.setMember(2, bennett);
    team.setMember(3, makeBuild('Sucrose'));
    team.setOnFieldMember(lyney);
    team.enemy.modifySettings({'common.enemy_status': 'pyro'});
    lyney.setCharSettings({lyney_perilous_performance: true});

    bennett.setCharSettings({bennet_fantastic_voyage: false});
    const atkOff = totalAtk(finalStats(lyney));
    const dmgOff = pyroStrike(lyney);
    bennett.setCharSettings({bennet_fantastic_voyage: true});
    const atkOn = totalAtk(finalStats(lyney));
    const dmgOn = pyroStrike(lyney);
    // Sanity: the burst actually added ATK.
    expect(atkOn - atkOff).toBeGreaterThan(10);
    // Damage scales linearly with total ATK: the whole extra-ATK gain counts.
    expect(dmgOn / dmgOff).toBeCloseTo(atkOn / atkOff, 6);
});

test('A4 parity: 60/80/100% by other Pyro members, only vs Pyro-affected enemies', () => {
    function a4Lyney(pyroOthers) {
        const lyney = makeBuild('Lyney');
        const others = pyroOthers == 0
            ? [makeBuild('Eula'), makeBuild('Sucrose'), makeBuild('Fischl')]
            : pyroOthers == 1
                ? [makeBuild('Hutao'), makeBuild('Eula'), makeBuild('Sucrose')]
                : [makeBuild('Hutao'), makeBuild('Bennet'), makeBuild('Eula')];
        const team = Team.fromMember(others[0]);
        team.setMember(1, lyney);
        team.setMember(2, others[1]);
        team.setMember(3, others[2]);
        team.setOnFieldMember(lyney);
        return {team, lyney};
    }

    // No Pyro-affected enemy: no bonus whatever the party.
    for (const n of [0, 1, 2]) {
        const {team, lyney} = a4Lyney(n);
        team.enemy.modifySettings({'common.enemy_status': 'hydro'});
        expect(finalStats(lyney).get('dmg_all')).toBe(0);
    }

    // Pyro-affected enemy: 60% + 20% per other Pyro member.
    const expected = [0.6, 0.8, 1.0];
    for (const n of [0, 1, 2]) {
        const {team, lyney} = a4Lyney(n);
        team.enemy.modifySettings({'common.enemy_status': 'pyro'});
        expect(finalStats(lyney).get('dmg_all')).toBeCloseTo(expected[n], 8);
    }
});

test('solo numbers: hat formula and A4 60% with no extra stat present', () => {
    const lyney = makeSolo('Lyney');
    matchCarrierTotals(lyney, {hp_total: 20000});
    expect(hatHp(lyney)).toBeCloseTo(20000 * HAT_HP_RATIO, 6);
    lyney.team.enemy.modifySettings({'common.enemy_status': 'pyro'});
    expect(finalStats(lyney).get('dmg_all')).toBeCloseTo(0.6, 8);
});
