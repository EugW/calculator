import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Prune):
// - A4 Tolling Rally (dmg_all for the others, 0.025% per ATK over 2000, cap
//   50%) reads premod ATK: the game (UNIQUE_Prune_PermanentSkill_2_Handler,
//   SetOverrideMapValue [DamageAddRatio, FIGHT_PROP_NONEXTRA_ATTACK, ...])
//   scales on FIGHT_PROP_NONEXTRA_ATTACK, and GO reads input.premod.atk.
//   The default channels are confirmed, so premod ATK writers (Columbina C2,
//   her own C2/C6 flat conditions) count; extra ATK (Bennett's burst) does
//   not. Writes dmg_all, which has no extra lane, so no writes param.
// - Secret Rite self 60% / team 30% ATK% (game: UNIQUE_Prune_Monv_Talent_Buff_
//   _ForPrune/_ForOther write Actor_AttackRatio, premod), C2 ATK% stacks
//   (game: Prune_Constellation_2_Buff writes Actor_AttackRatio, premod) and
//   C6 flat 350 ATK (game: UNIQUE_Prune_C6_Buff_OnPrune/_OnCurLocalAvatar
//   write Actor_AttackDelta, premod) are flat conditions: always premod,
//   need nothing. Her own C2 below doubles as a premod writer the A4 counts.
// - A1 Banehunter Oathhammer (150% of ATK), C4 ricochet (80% of ATK) and all
//   talent hits read the total (FIGHT_PROP_CUR_ATTACK; GO: input.total.atk)
//   and need nothing. C1 energy, C3/C5 talent levels: no stat read.
// - KQM Prune evidence page lists no ATK/EM/ER interaction test.
// - A 4-member team is used throughout: a smaller team would get Elemental
//   Resonance in our engine but not in the game (md/buff_chains.md).

const C2_STACKS = 'prune_useful_for_cleaning_messy_baggage_elemental_powers_are_indeed';

function withConstellation(key, constellation) {
    const build = makeBuild(key);
    build.setCharLevels({level: 90, ascension: 6, constellation});
    return build;
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

// Game formula for the A4 bonus at a given premod ATK (decimal dmg_all).
function expectedA4(premodAtk) {
    return Math.min(0.00025 * Math.max(premodAtk - 2000, 0), 0.5);
}

function dmgAll(member) {
    return finalStats(member).get('dmg_all') || 0;
}

// Prune on field with Bennett (extra ATK source, off unless switched on)
// and two neutral members; anemo/pyro/electro/hydro, so no Elemental
// Resonance applies.
function setupBennett() {
    const prune = makeBuild('Prune');
    const bennett = makeBuild('Bennet');
    const team = Team.fromMember(prune);
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Aino'));
    team.setOnFieldMember(prune);
    prune.setCharSettings({prune_tolling_synchronicity: true});
    bennett.setCharSettings({});
    return {team, prune, bennett, receiver: team.getMember(2)};
}

// Prune on field with Columbina C2 (electro, 30000 HP -> +300 premod ATK).
// Columbina C2 needs Moonsign Ascendant Gleam (2 Nod-Krai members), so Aino
// stands in as the second one; Hydro resonance is absorbed by
// matchCarrierTotals and cancels out of the on/off delta.
function setupC2() {
    const prune = makeBuild('Prune');
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(prune);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(prune);
    prune.setCharSettings({prune_tolling_synchronicity: true});
    columbina.setCharSettings({
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: 'electro',
    });
    matchCarrierTotals(columbina, {hp_total: 30000});
    return {team, prune, columbina, receiver: team.getMember(3)};
}

describe("Prune A4 reads premod ATK", () => {
    test("formula, threshold and cap; Prune herself gets nothing", () => {
        const {prune, receiver} = setupBennett();
        // No extra ATK here, so premod and total agree.
        for (const [atk, expected] of [[1500, 0], [2000, 0], [3000, 0.25], [5000, 0.5]]) {
            matchCarrierTotals(prune, {atk_total: atk});
            expect(dmgAll(receiver)).toBeCloseTo(expected, 8);
            expect(dmgAll(receiver)).toBeCloseTo(expectedA4(totalAtk(finalStats(prune))), 8);
        }
        // Past the cap the bonus stays flat.
        matchCarrierTotals(prune, {atk_total: 6000});
        expect(dmgAll(receiver)).toBeCloseTo(0.5, 8);
        // OTHERS only: Prune herself gets no bonus.
        expect(dmgAll(prune)).toBeCloseTo(0, 10);
    });

    test("counts Columbina C2 premod ATK", () => {
        const {prune, columbina, receiver} = setupC2();
        matchCarrierTotals(prune, {atk_total: 3000});
        // 1% of 30000 total HP, premod: Prune (on field) gains 300 ATK.
        const atkOn = totalAtk(finalStats(prune));
        const bonusOn = dmgAll(receiver);
        columbina.setCharSettings({});
        const atkOff = totalAtk(finalStats(prune));
        const bonusOff = dmgAll(receiver);
        expect(atkOn - atkOff).toBeCloseTo(300, 6);
        // 0.025% per premod ATK of the 300 = 0.075, uncapped.
        expect(bonusOn - bonusOff).toBeCloseTo(0.075, 8);
        expect(bonusOn - bonusOff).toBeCloseTo(expectedA4(atkOn) - expectedA4(atkOff), 8);
    });

    test("counts her own C2 premod ATK%", () => {
        const prune = withConstellation('Prune', 2);
        const team = Team.fromMember(prune);
        team.setMember(1, makeBuild('Bennet'));
        team.setMember(2, makeBuild('Fischl'));
        team.setMember(3, makeBuild('Aino'));
        team.setOnFieldMember(prune);
        const receiver = team.getMember(2);
        prune.setCharSettings({prune_tolling_synchronicity: true, [C2_STACKS]: '0'});
        matchCarrierTotals(prune, {atk_total: 3000});
        const atkBase = finalStats(prune).get('atk_base');
        const bonus0 = dmgAll(receiver);
        expect(bonus0).toBeCloseTo(0.25, 8);
        // 6 stacks: 10% + 6 x 5% = 40% premod ATK, against 10% at 0 stacks:
        // +30 points of base ATK on top of the matched total.
        prune.setCharSettings({prune_tolling_synchronicity: true, [C2_STACKS]: '6'});
        const bonus6 = dmgAll(receiver);
        // Game formula: 0.025% of the 30%-of-base premod ATK, uncapped here.
        expect(bonus6 - bonus0).toBeCloseTo(0.00025 * 0.3 * atkBase, 8);
        expect(bonus6 - bonus0).toBeGreaterThan(0.01);
    });

    test("ignores Bennett burst extra ATK", () => {
        const {prune, bennett, receiver} = setupBennett();
        matchCarrierTotals(prune, {atk_total: 3000});
        const atkBefore = totalAtk(finalStats(prune));
        const bonusBefore = dmgAll(receiver);
        expect(bonusBefore).toBeCloseTo(0.25, 8);
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        // Sanity: Bennett applied (extra ATK raises Prune's total).
        expect(totalAtk(finalStats(prune)) - atkBefore).toBeGreaterThan(100);
        // But the premod read does not see it: the others' bonus is unchanged.
        expect(dmgAll(receiver)).toBeCloseTo(bonusBefore, 8);
    });
});
