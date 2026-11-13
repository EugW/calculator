import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { enemyChange, featureValues, finalStats, makeBuild, totalMastery } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md worker: Ganyu. Every effect keeps the default channels
// (no reads/writes params changed in src/js/db/Char/Ganyu.js).
//
// - Lotus HP display (skill.ganyu_lotus_hp, 216% of Max HP at skill 10):
//   game data (SkillObj_Ganyu_IceBreaker_Dummy, modifier UNIQUE_IceBreaker_HP)
//   writes the gadget's Actor_MaxHPRatio from the MaxHPRatio special (the talent
//   ratio) and names no premod/total read for the owner's Max HP (gadget
//   inheritance is engine-internal, as for Itto's Ushi). GO prods
//   input.total.hp. Default kept; the same number either way while nothing
//   writes extra HP (md/buff_chains.md).
// - A1 Undivided Heart (flat +20% CRIT Rate on Frostflake Arrows/blooms):
//   no stat read; conditions write premod. GO puts it under the hit's premod
//   critRate_. KQM: the first bloom does not count itself; the buff persists
//   through swaps (rotation/snapshot timing, not chaining).
// - A4 Harmony Between Heaven and Earth (flat +20% Cryo DMG to the active
//   member in Celestial Shower's AoE): no stat read; GO teamBuff.premod
//   cryo_dmg_. KQM: the burst does not buff its own cast (snapshot), but it
//   carries over on recast (rotation timing, not chaining).
// - C1 Dew-Drinker (flat -15% Cryo RES on opponents, +2 Energy): an enemy
//   debuff with no stat read; GO teamBuff.premod cryo_enemyRes_. KQM: the shred
//   applies to the first shot's own bloom.
// - C4 Westward Sojourn (flat +5% DMG taken per stack, 5 stacks): no stat read;
//   GO teamBuff.premod all_dmg_.
// - C2 (+1 skill charge), C3/C5 (talent levels), C6 (no-charge Frostflake):
//   no stat reads.
// - Damage hits read the total by construction (plain damagePercentage, no
//   FIGHT_PROP read; ConfigAbility_Avatar_Ganyu.json has no FIGHT_PROP read at
//   all; GO dmgNode('atk', ...) is total).
// - KQM Ganyu has no EM/ATK/HP/ER buff-chain interaction test.
// - The scanner (md/tools/extra_scan.js) lists no Ganyu ability.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

// Skill 10 Inherited HP is 216% (CharTalentTables Ganyu s2.p1[9] = 216).
const LOTUS_RATIO = 2.16;

function totalHp(stats) {
    return stats.get('hp_base') * (1 + stats.get('hp_percent')) + stats.get('hp');
}

function lotusHp(ganyu) {
    return featureValues(ganyu)['skill.ganyu_lotus_hp'][0];
}

// Ganyu (cryo) + Xiangling (pyro) + Sucrose (anemo) + Nahida (dendro): four
// different elements, so no Elemental Resonance applies.
function neutralTeam() {
    const ganyu = makeBuild('Ganyu');
    const team = Team.fromMember(ganyu);
    const xiangling = makeBuild('Xiangling');
    const sucrose = makeBuild('Sucrose');
    const nahida = makeBuild('Nahida');
    team.setMember(1, xiangling);
    team.setMember(2, sucrose);
    team.setMember(3, nahida);
    team.setOnFieldMember(xiangling);
    return {team, ganyu, xiangling, sucrose, nahida};
}

function expectedLotus(hp) {
    return hp * LOTUS_RATIO;
}

describe('Ganyu Lotus HP display (default channels)', () => {
    test('formula parity: 15k/20k/30k HP; solo numbers unchanged with no extra stat', () => {
        const {ganyu} = neutralTeam();
        for (const hp of [15000, 20000, 30000]) {
            matchCarrierTotals(ganyu, {hp_total: hp});
            expect(totalHp(finalStats(ganyu))).toBeCloseTo(hp, 6);
            expect(lotusHp(ganyu)).toBeCloseTo(expectedLotus(hp), 6);
        }
        // 20k -> 43200.
        expect(expectedLotus(20000)).toBeCloseTo(43200, 9);
    });

    test('counts Hydro resonance HP (premod)', () => {
        // Resonance team: hydro pair -> +25% Max HP (a stage-0 premod condition).
        const ganyuR = makeBuild('Ganyu');
        const teamR = Team.fromMember(ganyuR);
        teamR.setMember(1, makeBuild('Barbara'));
        teamR.setMember(2, makeBuild('Xingqiu'));
        teamR.setMember(3, makeBuild('Xiangling'));
        teamR.setOnFieldMember(ganyuR);

        // Same Ganyu build without resonance: cryo/hydro/pyro/anemo, no pair.
        const ganyuN = makeBuild('Ganyu');
        const teamN = Team.fromMember(ganyuN);
        teamN.setMember(1, makeBuild('Barbara'));
        teamN.setMember(2, makeBuild('Xiangling'));
        teamN.setMember(3, makeBuild('Sucrose'));
        teamN.setOnFieldMember(ganyuN);

        const hpR = totalHp(finalStats(ganyuR));
        const hpN = totalHp(finalStats(ganyuN));
        // Sanity: resonance actually raised Ganyu's HP% by 25 points.
        expect(finalStats(ganyuR).get('hp_percent') - finalStats(ganyuN).get('hp_percent')).toBeCloseTo(0.25, 8);
        expect(lotusHp(ganyuR)).toBeCloseTo(expectedLotus(hpR), 6);
        expect(lotusHp(ganyuN)).toBeCloseTo(expectedLotus(hpN), 6);
        // The whole resonance gain is counted: the difference follows the formula.
        expect(lotusHp(ganyuR) - lotusHp(ganyuN)).toBeCloseTo(LOTUS_RATIO * (hpR - hpN), 6);
    });

    test('ignores unrelated extra stats (Bennett burst ATK, Key party EM)', () => {
        const {ganyu, team} = neutralTeam();
        matchCarrierTotals(ganyu, {hp_total: 20000});
        const before = lotusHp(ganyu);
        expect(before).toBeCloseTo(43200, 6);

        // Bennett's burst is extra ATK on the on-field receiver; the Lotus HP
        // reads HP, so it must not move.
        const bennett = makeBuild('Bennet');
        team.setMember(1, bennett);
        team.setOnFieldMember(ganyu);
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const atkBefore = finalStats(ganyu).get('atk');
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(finalStats(ganyu).get('atk') - atkBefore).toBeGreaterThan(10);
        expect(lotusHp(ganyu)).toBeCloseTo(before, 10);

        // The Key's party EM is extra EM; it must not move the HP-read display.
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        team.setMember(3, kazuha);
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        const emBefore = totalMastery(finalStats(ganyu));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(ganyu)) - emBefore).toBeGreaterThan(1);
        expect(lotusHp(ganyu)).toBeCloseTo(before, 10);
    });
});

describe('Ganyu A1 is a flat CRIT bonus (solo parity)', () => {
    test('+20% Frostflake CRIT, unaffected by extra EM', () => {
        const {ganyu, sucrose, kazuha} = (() => {
            const {team, ganyu, xiangling, sucrose, nahida} = neutralTeam();
            const kazuha = makeBuild('Kazuha');
            kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
            kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
            team.setMember(3, kazuha);
            kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
            return {ganyu, sucrose, kazuha};
        })();
        ganyu.setCharSettings({});
        expect(finalStats(ganyu).get('crit_rate_ganyu')).toBeCloseTo(0, 9);
        ganyu.setCharSettings({ganyu_undivided_heart: true});
        expect(finalStats(ganyu).get('crit_rate_ganyu')).toBeCloseTo(0.2, 9);
        // Extra EM (Sucrose A4, Key party share) must not move the flat bonus.
        sucrose.setCharSettings({sucrose_mollis_favonius: true});
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(ganyu))).toBeGreaterThan(0);
        expect(finalStats(ganyu).get('crit_rate_ganyu')).toBeCloseTo(0.2, 9);
    });
});

describe('Ganyu A4 grants flat Cryo DMG to the on-field member only', () => {
    test('20% on-field, nothing off-field', () => {
        const {team, ganyu, xiangling, sucrose} = neutralTeam();
        ganyu.setCharSettings({});
        expect(finalStats(xiangling).get('dmg_cryo')).toBeCloseTo(0, 9);
        ganyu.setCharSettings({ganyu_harmony: true});
        // Xiangling is on-field: gets the full 20%.
        expect(finalStats(xiangling).get('dmg_cryo')).toBeCloseTo(0.2, 9);
        // Ganyu herself is off-field here: gets nothing.
        expect(finalStats(ganyu).get('dmg_cryo')).toBeCloseTo(0, 9);
        // An off-field member gets nothing either.
        expect(finalStats(sucrose).get('dmg_cryo')).toBeCloseTo(0, 9);
        // Moving Ganyu on-field moves the bonus to her.
        team.setOnFieldMember(ganyu);
        expect(finalStats(ganyu).get('dmg_cryo')).toBeCloseTo(0.2, 9);
        expect(finalStats(xiangling).get('dmg_cryo')).toBeCloseTo(0, 9);
    });
});

describe('Ganyu C1 is a flat enemy RES shred (solo parity)', () => {
    test('-15% Cryo RES with the toggle, 0 without', () => {
        const {ganyu, xiangling} = neutralTeam();
        ganyu.setCharLevels({level: 90, ascension: 6, constellation: 1});
        ganyu.setCharSettings({});
        expect(enemyChange(xiangling, 'enemy_res_cryo')).toBeCloseTo(0, 9);
        ganyu.setCharSettings({ganyu_dew_drinker: true});
        expect(enemyChange(xiangling, 'enemy_res_cryo')).toBeCloseTo(-0.15, 9);
        // Other elements are untouched.
        expect(enemyChange(xiangling, 'enemy_res_pyro')).toBeCloseTo(0, 9);
    });
});

describe('Ganyu C4 is a flat DMG-taken bonus per stack', () => {
    test('5% per stack up to 25% at 5 stacks', () => {
        const {ganyu, xiangling} = neutralTeam();
        ganyu.setCharLevels({level: 90, ascension: 6, constellation: 4});
        ganyu.setCharSettings({});
        expect(finalStats(xiangling).get('dmg_all')).toBeCloseTo(0, 9);
        ganyu.setCharSettings({ganyu_westward_sojourn: 1});
        expect(finalStats(xiangling).get('dmg_all')).toBeCloseTo(0.05, 9);
        ganyu.setCharSettings({ganyu_westward_sojourn: 5});
        expect(finalStats(xiangling).get('dmg_all')).toBeCloseTo(0.25, 9);
    });
});

describe('Ganyu hits read total ATK (Bennett burst counts)', () => {
    test('Frostflake Bloom damage rises with Bennett extra ATK', () => {
        const {team, ganyu} = neutralTeam();
        team.setOnFieldMember(ganyu);
        const bennett = makeBuild('Bennet');
        team.setMember(1, bennett);
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        const without = featureValues(ganyu)['attack.ganyu_frostflake_bloom'][2];
        const atkBefore = finalStats(ganyu).get('atk');
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        expect(finalStats(ganyu).get('atk') - atkBefore).toBeGreaterThan(10);
        const withBuff = featureValues(ganyu)['attack.ganyu_frostflake_bloom'][2];
        // Game formula scales the hit on total ATK: extra ATK must count.
        expect(withBuff).toBeGreaterThan(without);
    });
});
