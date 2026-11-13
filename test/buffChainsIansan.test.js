import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery, featureValues } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Iansan):
// - Burst ATK (delivered postEffectAtk, the atk_bonus display and the
//   iansan_bonus_max display) reads premod ATK (game:
//   Avatar_Iansan_ElementalBurst, FIGHT_PROP_NONEXTRA_ATTACK x
//   AttackTransRatio_NyxEnough / NyxValue x NyxTransRation, cap MaxAttackUp)
//   and writes extra ATK (Actor_AttackExtraDelta; GO: input.premod.atk into
//   teamBuff.total.atk). The defaults are confirmed, so premod writers
//   (Chevreuse A4 ATK%) count and extra writers (Bennett burst) do not. A
//   first-hand community test (cited in md/buff_chains.md) reports the burst
//   counting Chevreuse's A4.
// - A4 heal reads total ATK (game: HealHP amountByCasterAttackRatio; GO:
//   input.total.atk): scaling 'atk*' needs nothing, and Bennett's extra ATK
//   must count for it.
// - A1 (20% ATK) and C2 (30% ATK) write Actor_AttackRatio (premod); flat
//   conditions are always premod, need nothing. C6 is a ModifyDamageMixin
//   with no Actor channel; damage hits read the total and need nothing.
// - KQM has no Iansan premod/total interaction test.
//
// Game formula (burst talent 10, as makeBuild sets): 0.5% of ATK per
// Nightsoul point below 42 (CharTalentTables Iansan s3.p3), +6% at 42 for
// the 27% high conversion (s3.p2), cap 690 (s3.p4). Chevreuse A4: 1% ATK
// per 1000 HP, cap 40%.
//
// A 4-member team is used throughout: a smaller team would get Elemental
// Resonance in our engine but not in the game (md/buff_chains.md).

// Receiver on field (Ayaka: cryo, so Chevreuse's pyro/electro-only A4 never
// touches her directly), Iansan off field, Chevreuse, Aino (hydro): no
// resonance. Iansan's ATK is matched with her burst off (points 0), so the
// matched total is her premod ATK; she is off field, so her own burst never
// lands on her.
function setupReceiver() {
    const receiver = makeBuild('Ayaka');
    const iansan = makeBuild('Iansan');
    const chevreuse = makeBuild('Chevreuse');
    const team = Team.fromMember(receiver);
    team.setMember(1, iansan);
    team.setMember(2, chevreuse);
    team.setMember(3, makeBuild('Aino'));
    team.setOnFieldMember(receiver);
    iansan.setCharSettings({iansan_points: 0});
    chevreuse.setCharSettings({chevreuse_force_coordination: false});
    matchCarrierTotals(iansan, {atk_total: 500});
    matchCarrierTotals(chevreuse, {hp_total: 30000});
    return {team, receiver, iansan, chevreuse};
}

function receiverGain(receiver, iansan, points) {
    iansan.setCharSettings({iansan_points: 0});
    const base = finalStats(receiver).get('atk');
    iansan.setCharSettings({iansan_points: points});
    return finalStats(receiver).get('atk') - base;
}

describe("Iansan burst reads premod ATK, writes extra ATK", () => {
    test("solo formula, linearity, 42-point bonus and cap", () => {
        const {receiver, iansan} = setupReceiver();
        // 0.5% x 30 points = 15% of the 500 premod ATK.
        expect(receiverGain(receiver, iansan, 30)).toBeCloseTo(75, 6);
        // Halving the points halves the gain.
        expect(receiverGain(receiver, iansan, 15)).toBeCloseTo(37.5, 6);
        // 42 points: 42 x 0.5% + 6% = 27% (high conversion).
        expect(receiverGain(receiver, iansan, 42)).toBeCloseTo(135, 6);
        // The max display is the same 27% of premod ATK.
        expect(featureValues(iansan)['burst.iansan_bonus_max'][0]).toBeCloseTo(135, 6);
        expect(featureValues(iansan)['burst.atk_bonus'][0]).toBeCloseTo(135, 6);
        // Cap (burst 10: 690): 15% of 5000 would be 750.
        iansan.setCharSettings({iansan_points: 0});
        matchCarrierTotals(iansan, {atk_total: 5000});
        expect(receiverGain(receiver, iansan, 30)).toBeCloseTo(690, 6);
    });

    test("counts Chevreuse A4 premod ATK%", () => {
        const {receiver, iansan, chevreuse} = setupReceiver();
        const atkBase = finalStats(iansan).get('atk_base');
        iansan.setCharSettings({iansan_points: 30});
        const gainOff = finalStats(receiver).get('atk');
        const percentOff = finalStats(iansan).get('atk_percent');
        chevreuse.setCharSettings({chevreuse_force_coordination: true});
        const gainOn = finalStats(receiver).get('atk');
        const percentOn = finalStats(iansan).get('atk_percent');
        // Game formula: 30% ATK at 30000 HP lands on Iansan's premod ATK%.
        expect(percentOn - percentOff).toBeCloseTo(0.30, 8);
        // 0.5% x 30 points = 15% of that premod gain reaches the receiver:
        // 0.15 x 0.30 x Iansan base ATK.
        const expected = 0.15 * 0.30 * atkBase;
        expect(expected).toBeGreaterThan(1);
        expect(gainOn - gainOff).toBeCloseTo(expected, 4);
    });
});

describe("Iansan burst ignores Bennett burst extra ATK; her A4 heal counts it", () => {
    function setupOnField() {
        const iansan = makeBuild('Iansan');
        const bennett = makeBuild('Bennet');
        const team = Team.fromMember(iansan);
        team.setMember(1, bennett);
        team.setMember(2, makeBuild('Ayaka'));
        team.setMember(3, makeBuild('Aino'));
        team.setOnFieldMember(iansan);
        iansan.setCharSettings({iansan_points: 0});
        bennett.setCharSettings({bennet_fantastic_voyage: false});
        matchCarrierTotals(iansan, {atk_total: 1000});
        iansan.setCharSettings({iansan_points: 30});
        return {iansan, bennett};
    }

    test("Bennett extra ATK does not move the premod-read burst", () => {
        const {iansan, bennett} = setupOnField();
        const burstOff = featureValues(iansan)['burst.atk_bonus'][0];
        const maxOff = featureValues(iansan)['burst.iansan_bonus_max'][0];
        const atkOff = finalStats(iansan).get('atk');
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const atkOn = finalStats(iansan).get('atk');
        // Sanity: Bennett applied (Iansan is the active member).
        expect(atkOn - atkOff).toBeGreaterThan(100);
        // His extra ATK is invisible to the premod read.
        expect(featureValues(iansan)['burst.atk_bonus'][0]).toBeCloseTo(burstOff, 8);
        expect(featureValues(iansan)['burst.iansan_bonus_max'][0]).toBeCloseTo(maxOff, 8);
    });

    test("Bennett extra ATK counts for the total-read A4 heal", () => {
        const {iansan, bennett} = setupOnField();
        const healOff = featureValues(iansan)['other.iansan_heal'][0];
        const atkOff = finalStats(iansan).get('atk');
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const healOn = featureValues(iansan)['other.iansan_heal'][0];
        const atkOn = finalStats(iansan).get('atk');
        // Game text: 60% of her ATK; the heal reads the total, so it tracks
        // the total ATK delta one to one at that rate.
        expect(healOn - healOff).toBeCloseTo(0.6 * (atkOn - atkOff), 6);
        expect(healOn - healOff).toBeGreaterThan(10);
    });
});

describe("Iansan burst writes extra ATK: Flins A4 ignores it", () => {
    test("Flins premod ATK read does not see Iansan's burst", () => {
        const flins = makeBuild('Flins');
        const iansan = makeBuild('Iansan');
        const team = Team.fromMember(flins);
        team.setMember(1, iansan);
        team.setMember(2, makeBuild('Aino'));
        team.setMember(3, makeBuild('Kazuha'));
        team.setOnFieldMember(flins);
        iansan.setCharSettings({iansan_points: 0});
        matchCarrierTotals(flins, {atk_total: 1000});
        matchCarrierTotals(iansan, {atk_total: 1000});
        const emOff = totalMastery(finalStats(flins));
        const atkOff = finalStats(flins).get('atk');
        iansan.setCharSettings({iansan_points: 42});
        const emOn = totalMastery(finalStats(flins));
        const atkOn = finalStats(flins).get('atk');
        // Sanity: the burst applied (Flins is the active member).
        expect(atkOn - atkOff).toBeGreaterThan(100);
        // Flins A4 reads premod ATK (8%, cap 160; 1000 ATK gives 80 EM), so
        // Iansan's extra ATK leaves his EM alone.
        expect(emOn - emOff).toBeCloseTo(0, 8);
    });
});
