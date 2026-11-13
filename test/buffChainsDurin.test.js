import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Durin):
// - A4 Primordial Fusion (dmg_burst_periodic_special from ATK, 3% per
//   100 ATK, cap 75%) reads total ATK: the game
//   (Avatar_Durin_PermanentSkill_2,
//   UNIQUE_Avatar_Durin_PermanentSkill_2_DamageUp onThinkInterval and
//   onHittingOther) scales on FIGHT_PROP_CUR_ATTACK, and GO reads
//   input.total.atk. A total read counts every ATK buff, so there is no
//   ATK buff it must ignore; the must-not-count side is covered by the
//   contrast test (Flins's A4, a premod reader, ignoring Bennett's burst
//   in the same team).
// - C1 Cycle of Enlightenment flat damage (60% party / 150% self of ATK)
//   reads total ATK in the game (Avatar_Durin_Talent_1,
//   ModifyDamageCountMixin damageExtra on FIGHT_PROP_CUR_ATTACK; GO reads
//   input.total.atk). Damage flat bonuses read the total by construction
//   (FeatureMultiplier scaling atk*), so nothing is declared or tested
//   beyond the A4 chain.
// - A1 (RES shred, Vaporize/Melt bonus), C2 (Pyro/elemental DMG%), C4
//   (Burst DMG%), C6 (DEF ignore/shred): flat toggles, no stat read.
// - KQM Durin evidence page lists no ATK/EM/ER interaction test.
// - 4-member teams throughout: a smaller team would get Elemental
//   Resonance in our engine but not in the game (md/buff_chains.md).

function withConstellation(key, constellation) {
    const build = makeBuild(key);
    build.setCharLevels({level: 90, ascension: 6, constellation});
    return build;
}

function totalAtk(stats) {
    return stats.get('atk_base') * (1 + stats.get('atk_percent')) + stats.get('atk');
}

function special(member) {
    return finalStats(member).get('dmg_burst_periodic_special');
}

// Durin on field with A4 on and exactly 1000 total ATK (linear zone:
// 0.0003 * 1000 = 0.30, under the 0.75 cap).
function setupBennett() {
    const durin = makeBuild('Durin');
    const bennett = makeBuild('Bennet');
    const team = Team.fromMember(durin);
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(durin);
    durin.setCharSettings({durin_primordial_fusion: true});
    bennett.setCharSettings({});
    matchCarrierTotals(durin, {atk_total: 1000});
    return {team, durin, bennett};
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

// Durin on field with Columbina C2 (electro, 30000 HP -> +300 premod ATK).
function setupC2() {
    const durin = makeBuild('Durin');
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(durin);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(durin);
    durin.setCharSettings({durin_primordial_fusion: true});
    columbina.setCharSettings(C2_ON);
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(durin, {atk_total: 1000});
    return {team, durin, columbina};
}

describe('Durin A4 reads total ATK', () => {
    test('solo formula and cap: 3% per 100 ATK, max 75%', () => {
        const {durin} = setupBennett();
        // No extra ATK solo, so premod and total agree: 0.0003 * 1000.
        expect(special(durin)).toBeCloseTo(0.30, 8);
        matchCarrierTotals(durin, {atk_total: 2500});
        expect(special(durin)).toBeCloseTo(0.75, 8);
        // Past the cap the bonus stays flat.
        matchCarrierTotals(durin, {atk_total: 3000});
        expect(special(durin)).toBeCloseTo(0.75, 8);
    });

    test('counts Bennett burst extra ATK', () => {
        const {durin, bennett} = setupBennett();
        const atkBefore = totalAtk(finalStats(durin));
        const specialBefore = special(durin);
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const atkAfter = totalAtk(finalStats(durin));
        const specialAfter = special(durin);
        // Sanity: Bennett applied (extra ATK raises the total).
        expect(atkAfter - atkBefore).toBeGreaterThan(100);
        // Game formula: 3% per 100 ATK, uncapped here (0.30 + delta).
        expect(specialAfter - specialBefore).toBeCloseTo(0.0003 * (atkAfter - atkBefore), 8);
        expect(specialAfter - specialBefore).toBeGreaterThan(0.01);
    });

    test('counts Columbina C2 premod ATK', () => {
        const {durin, columbina} = setupC2();
        // 1% of 30000 total HP, premod: Durin (on field) gains 300 ATK.
        const atkOn = totalAtk(finalStats(durin));
        const specialOn = special(durin);
        columbina.setCharSettings({});
        const atkOff = totalAtk(finalStats(durin));
        const specialOff = special(durin);
        expect(atkOn - atkOff).toBeCloseTo(300, 6);
        // 3% per 100 ATK of the 300 premod ATK = 0.09, uncapped.
        expect(specialOn - specialOff).toBeCloseTo(0.09, 8);
    });

    test('contrast: Flins A4 (premod) ignores Bennett extra ATK in the same team', () => {
        const durin = makeBuild('Durin');
        const bennett = makeBuild('Bennet');
        const flins = makeBuild('Flins');
        const team = Team.fromMember(durin);
        team.setMember(1, bennett);
        team.setMember(2, flins);
        team.setMember(3, makeBuild('Aino'));
        team.setOnFieldMember(durin);
        durin.setCharSettings({durin_primordial_fusion: true});
        bennett.setCharSettings({});
        matchCarrierTotals(durin, {atk_total: 1000});
        matchCarrierTotals(flins, {atk_total: 1000});
        const durinBefore = special(durin);
        const flinsBefore = totalMastery(finalStats(flins));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        // Durin (total read) moves with the extra ATK; Flins A4 (8% of
        // premod ATK, cap 160, linear here) does not.
        expect(special(durin) - durinBefore).toBeGreaterThan(0.01);
        expect(totalMastery(finalStats(flins)) - flinsBefore).toBeCloseTo(0, 8);
    });
});
