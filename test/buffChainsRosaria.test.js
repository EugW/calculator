import { Condition } from '../src/js/classes/Condition';
import { CHANNELS } from '../src/js/classes/PostEffect/Channels';
import { PostEffectStats } from '../src/js/classes/PostEffect/Stats';
import { StatTable } from '../src/js/classes/StatTable';
import { Team } from '../src/js/classes/Team';
import { DB } from '../src/js/db/DB';
import { finalStats, makeBuild, totalMastery, withSource } from './support/team';
import { matchCarrierTotals } from './support/teamConversion';

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Rosaria): her only conversion keeps the
// default channels (no reads/writes params in src/js/db/Char/Rosaria.js).
// - A4 Shadow Samaritan (OTHERS, 15% of her CRIT Rate, cap 15): the game
//   (Avatar_Rosaria_ElementalBurst_Strike_01, talentParam Team_CritcUp / ProudSkill
//   Rosaria_PermanentSkill_2 = [0.15, 10, 0.15]) computes
//   _ABILITY_Rosaria_Talent_TeamCriticRate from FIGHT_PROP_NONEXTRA_CRITICAL
//   (premod) and writes Actor_CriticalExtraDelta (extra) via
//   UNIQUE_Rosaria_Talent_TeamCriticUp. GO reads input.premod.critRate_ into
//   teamBuff.total.critRate_. Default confirmed.
// - A1 Regina Probationum (flat +12% self CRIT; game: Extra_Critcal writes
//   Actor_CriticalDelta, premod; ProudSkill 452101 = [0.12, 5]) is premod, so the
//   premod A4 read counts it (KQM: A1 included in A4 sharing). External flat CRIT
//   (Hu Tao A1 OTHERS +12%) counts too (KQM: A4 stacks with Hu Tao A1 / Geo MC C1).
// - No teammate delivers extra CRIT to Rosaria (Mizuki C6 / Nilou C6 extra CRIT are
//   self-only; Jahoda C6 team CRIT is Nod-Krai-gated; no weapon/set delivers extra
//   CRIT to teammates), so premod and total CRIT agree on her in every real team;
//   the read direction is pinned by the explicit NONEXTRA marker, not by a
//   behavioral difference (as for HP/DEF in md/buff_chains.md). The extra-vs-premod
//   read below is staged with a synthetic extra-CRIT write (as in
//   test/buffChainsAlbedo.test.js); the write being extra is asserted via the
//   receiver's crit_rate_extra lane.
// - C1 (flat ATK SPD / Normal DMG), C2 (+4s lance), C4 (flat 5 energy), C6 (flat
//   -20% enemy Physical RES) and plain damage hits read no stat / read the total
//   and need nothing.
//
// A 4-member team is used throughout: a smaller team would get Elemental Resonance
// in our engine but not in the game (md/buff_chains.md).

const A1_ON = {rosaria_regina_probationum: true};
const A4_ON = {rosaria_shadow_samaritan: true};

// Rosaria (cryo) + Hu Tao (pyro) + Fischl (electro) + Kazuha (anemo): four
// elements, no resonance. Fischl is the measured receiver.
function setup() {
    const rosaria = makeBuild('Rosaria');
    const hutao = makeBuild('Hutao');
    const fischl = makeBuild('Fischl');
    const kazuha = makeBuild('Kazuha');
    const team = Team.fromMember(rosaria);
    team.setMember(1, hutao);
    team.setMember(2, fischl);
    team.setMember(3, kazuha);
    team.setOnFieldMember(fischl);
    rosaria.setCharSettings({});
    hutao.setCharSettings({});
    // Matched with every effect off, so this is the premod CRIT (no extra CRIT
    // exists on Rosaria in a real team).
    matchCarrierTotals(rosaria, {crit_rate_total: 60});
    return {team, rosaria, hutao, fischl, kazuha};
}

function shareOn(receiver) {
    return finalStats(receiver).get('crit_rate');
}

function rosariaTotal(rosaria) {
    const stats = finalStats(rosaria);
    return stats.get('crit_rate_base') + stats.get('crit_rate');
}

// A synthetic CRIT write on Rosaria (no real teammate delivers extra CRIT):
// a default-stage post-effect writing crit_rate from a test-only source stat.
// Amount is in percentage points (StatTable crit_rate divides by 100).
function withExtraCrit(rosaria, points) {
    withSource(rosaria,
        [new Condition({stats: {test_crit_source: points}})],
        [new PostEffectStats({from: 'test_crit_source', percent: new StatTable('crit_rate', [1])})]);
}

// The same amount as a premod write (like a flat condition / Columbina-style).
function withPremodCrit(rosaria, points) {
    withSource(rosaria,
        [new Condition({stats: {test_crit_source: points}})],
        [new PostEffectStats({
            from: 'test_crit_source',
            percent: new StatTable('crit_rate', [1]),
            writes: CHANNELS.PREMOD,
        })]);
}

describe('Rosaria A4 reads premod CRIT, writes extra CRIT', () => {
    test('solo numbers: 15% of CRIT, self excluded, extra lane', () => {
        const {rosaria, fischl} = setup();
        const base = shareOn(fischl);
        const selfBefore = rosariaTotal(rosaria);
        rosaria.setCharSettings(A4_ON);
        // 15% of the 60% premod CRIT = 9 percentage points (0.09).
        expect(shareOn(fischl) - base).toBeCloseTo(0.09, 9);
        // Written extra: the receiver's extra lane holds the share.
        expect(finalStats(fischl).get('crit_rate_extra') || 0).toBeCloseTo(0.09, 9);
        // Rosaria herself is excluded (OTHERS).
        expect(rosariaTotal(rosaria)).toBeCloseTo(selfBefore, 9);
        expect(finalStats(rosaria).get('crit_rate_extra') || 0).toBeCloseTo(0, 9);
    });

    test('caps at 15 percentage points', () => {
        const {rosaria, fischl} = setup();
        matchCarrierTotals(rosaria, {crit_rate_total: 120});
        const base = shareOn(fischl);
        rosaria.setCharSettings(A4_ON);
        // 15% of 120% = 18%, capped at 15% (0.15).
        expect(shareOn(fischl) - base).toBeCloseTo(0.15, 9);
    });

    test('counts own A1 flat CRIT (premod)', () => {
        const {rosaria, fischl} = setup();
        rosaria.setCharSettings(A4_ON);
        const before = shareOn(fischl);
        const rosBefore = rosariaTotal(rosaria);
        rosaria.setCharSettings({...A4_ON, ...A1_ON});
        // A1 is +12% premod CRIT (KQM: included in A4): +1.8 points of share.
        expect(rosariaTotal(rosaria) - rosBefore).toBeCloseTo(0.12, 9);
        expect(shareOn(fischl) - before).toBeCloseTo(0.018, 9);
    });

    test('counts Hu Tao A1 flat CRIT on Rosaria (premod)', () => {
        const {rosaria, hutao} = setup();
        rosaria.setCharSettings(A4_ON);
        // Measured on Hu Tao herself: her own Flutter By excludes its source
        // (OTHERS), so her CRIT moves only via Rosaria's increased share.
        const before = shareOn(hutao);
        const rosBefore = rosariaTotal(rosaria);
        hutao.setCharSettings({hu_tao_flutter_by: true});
        // Hu Tao Flutter By is OTHERS +12% CRIT (premod; KQM: A4 stacks with it).
        expect(rosariaTotal(rosaria) - rosBefore).toBeCloseTo(0.12, 9);
        expect(shareOn(hutao) - before).toBeCloseTo(0.018, 9);
    });

    test('ignores a synthetic extra CRIT write, counts the premod one', () => {
        const plain = setup();
        plain.rosaria.setCharSettings(A4_ON);
        const plainShare = shareOn(plain.fischl);

        const extra = setup();
        withExtraCrit(extra.rosaria, 5);
        extra.rosaria.setCharSettings(A4_ON);
        // The synthetic write lands in the extra lane only (+5 points total).
        expect(finalStats(extra.rosaria).get('crit_rate_extra') || 0).toBeCloseTo(0.05, 9);
        expect(rosariaTotal(extra.rosaria) - rosariaTotal(plain.rosaria)).toBeCloseTo(0.05, 9);
        // A premod read ignores the extra 5 points: same share as without it.
        expect(shareOn(extra.fischl) - plainShare).toBeCloseTo(0, 9);

        const premod = setup();
        withPremodCrit(premod.rosaria, 5);
        premod.rosaria.setCharSettings(A4_ON);
        expect(finalStats(premod.rosaria).get('crit_rate_extra') || 0).toBeCloseTo(0, 9);
        // The premod 5 points count: +0.75 points of share (15% of 5%).
        expect(shareOn(premod.fischl) - plainShare).toBeCloseTo(0.0075, 9);
    });

    test("ignores Bennett burst extra ATK", () => {
        const rosaria = makeBuild('Rosaria');
        const bennet = makeBuild('Bennet');
        const team = Team.fromMember(rosaria);
        team.setMember(1, bennet);
        team.setMember(2, makeBuild('Fischl'));
        team.setMember(3, makeBuild('Kazuha'));
        team.setOnFieldMember(rosaria);
        rosaria.setCharSettings({});
        bennet.setCharSettings({});
        matchCarrierTotals(rosaria, {crit_rate_total: 60});
        rosaria.setCharSettings(A4_ON);
        const receiver = team.getMember(2);
        const before = shareOn(receiver);
        const atkBefore = finalStats(rosaria).get('atk');
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        // Bennett's burst reads base ATK and writes extra: total ATK rises but
        // the CRIT-read share must not move.
        expect(finalStats(rosaria).get('atk') - atkBefore).toBeGreaterThan(100);
        expect(shareOn(receiver) - before).toBeCloseTo(0, 9);
    });

    test("ignores the Key's extra EM", () => {
        const rosaria = makeBuild('Rosaria');
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(rosaria);
        team.setMember(1, makeBuild('Fischl'));
        team.setMember(2, kazuha);
        team.setMember(3, makeBuild('Aino'));
        team.setOnFieldMember(rosaria);
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        rosaria.setCharSettings({});
        matchCarrierTotals(rosaria, {crit_rate_total: 60});
        rosaria.setCharSettings(A4_ON);
        const before = shareOn(kazuha);
        expect(before).toBeCloseTo(0.09, 6);
        // The Key's party EM is extra: it raises total EM but must not move
        // the CRIT-read share.
        const emBefore = totalMastery(finalStats(rosaria));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        expect(totalMastery(finalStats(rosaria)) - emBefore).toBeGreaterThan(1);
        expect(shareOn(kazuha) - before).toBeCloseTo(0, 9);
    });
});
