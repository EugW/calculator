import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Emilie):
// - A4 Rectification (dmg_all from ATK, 15% per 1000 ATK, cap 36%) reads
//   total ATK: the game (Avatar_Emilie_PermanentSkill_2,
//   Avatar_Emilie_PermanentSkill_2_Attack_Handler onThinkInterval
//   SetOverrideMapValue [FIGHT_PROP_CUR_ATTACK x Ratio x 0.001, max MaxRatio];
//   ProudSkill Emilie_PermanentSkill_2 = [0.15, 0.36]) scales on
//   FIGHT_PROP_CUR_ATTACK, and GO reads input.total.atk. A total read counts
//   every ATK buff, so there is no ATK buff it must ignore; the
//   must-not-count side is covered by the contrast test (Flins's A4, a premod
//   reader, ignoring Bennett's burst in the same team) and by the
//   burning-off case. Writes dmg_all, which has no extra lane, so no writes
//   param is needed. Game text ("increased DMG to Burning opponents") and
//   GO's all_dmg_ agree the generic dmg_all target is right.
// - A1 Lingering Fragrance (Cleardew Cologne, 600% of ATK) and C6 Marcotte
//   Sillage (+300% of ATK): damage paths reading total ATK in the game
//   (Talent1 ratio with no stat read; Talent6 ModifyDamageMixin damageExtra
//   on FIGHT_PROP_CUR_ATTACK). Damage hits read the total by construction
//   (FeatureMultiplier scaling atk* / FeatureDamage), so nothing is declared
//   or tested beyond the A4 chain.
// - C1 (+20% skill/Cologne DMG), C2 (-30% Dendro RES), C4 (burst duration):
//   flat toggles, no stat read.
// - KQM Emilie evidence page lists no ATK/EM/ER interaction test.
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

// Game formula for Emilie's A4 at a given total ATK (decimal bonus).
function expectedA4(atk) {
    return Math.min(0.00015 * atk, 0.36);
}

function burning(team, on = true) {
    team.enemy.modifySettings({enemy_burning: on});
}

function dmgAll(member) {
    return finalStats(member).get('dmg_all') || 0;
}

// Emilie on field with Bennett (extra ATK source) and two neutral members;
// dendro/pyro/electro/hydro, so no Elemental Resonance applies.
function setupBennett() {
    const emilie = makeBuild('Emilie');
    const bennett = makeBuild('Bennet');
    const team = Team.fromMember(emilie);
    team.setMember(1, bennett);
    team.setMember(2, makeBuild('Fischl'));
    team.setMember(3, makeBuild('Aino'));
    team.setOnFieldMember(emilie);
    bennett.setCharSettings({});
    burning(team, true);
    matchCarrierTotals(emilie, {atk_total: 1000});
    return {team, emilie, bennett};
}

const C2_ON = {
    columbina_lunar_brilliance: true,
    columbina_c2_dominant_lunar: 'electro',
};

// Emilie on field with Columbina C2 (electro, 30000 HP -> +300 premod ATK).
// Columbina C2 needs Moonsign Ascendant Gleam (2 Nod-Krai members), so Aino
// stands in as the second one; Hydro resonance is absorbed by
// matchCarrierTotals and cancels out of the on/off delta.
function setupC2() {
    const emilie = makeBuild('Emilie');
    const columbina = withConstellation('Columbina', 2);
    const team = Team.fromMember(emilie);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Fischl'));
    team.setOnFieldMember(emilie);
    columbina.setCharSettings(C2_ON);
    burning(team, true);
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(emilie, {atk_total: 1000});
    return {team, emilie, columbina};
}

describe('Emilie A4 reads total ATK', () => {
    test('solo formula and cap: 15% per 1000 ATK, max 36%; needs Burning', () => {
        const {team, emilie} = setupBennett();
        // No extra ATK here, so premod and total agree: 0.00015 * 1000.
        expect(dmgAll(emilie)).toBeCloseTo(0.15, 8);
        expect(dmgAll(emilie)).toBeCloseTo(expectedA4(totalAtk(finalStats(emilie))), 8);
        matchCarrierTotals(emilie, {atk_total: 2400});
        expect(dmgAll(emilie)).toBeCloseTo(0.36, 8);
        // Past the cap the bonus stays flat.
        matchCarrierTotals(emilie, {atk_total: 3000});
        expect(dmgAll(emilie)).toBeCloseTo(0.36, 8);
        // Without Burning there is no bonus at all.
        burning(team, false);
        expect(dmgAll(emilie)).toBeCloseTo(0, 10);
    });

    test('counts Bennett burst extra ATK', () => {
        const {emilie, bennett} = setupBennett();
        const atkBefore = totalAtk(finalStats(emilie));
        const bonusBefore = dmgAll(emilie);
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        const atkAfter = totalAtk(finalStats(emilie));
        const bonusAfter = dmgAll(emilie);
        // Sanity: Bennett applied (extra ATK raises the total).
        expect(atkAfter - atkBefore).toBeGreaterThan(100);
        // Game formula: 15% per 1000 ATK, uncapped here (0.15 + delta).
        expect(bonusAfter - bonusBefore).toBeCloseTo(0.00015 * (atkAfter - atkBefore), 8);
        expect(bonusAfter - bonusBefore).toBeGreaterThan(0.01);
    });

    test('counts Columbina C2 premod ATK', () => {
        const {emilie, columbina} = setupC2();
        // 1% of 30000 total HP, premod: Emilie (on field) gains 300 ATK.
        const atkOn = totalAtk(finalStats(emilie));
        const bonusOn = dmgAll(emilie);
        columbina.setCharSettings({});
        const atkOff = totalAtk(finalStats(emilie));
        const bonusOff = dmgAll(emilie);
        expect(atkOn - atkOff).toBeCloseTo(300, 6);
        // 15% per 1000 ATK of the 300 premod ATK = 0.045, uncapped.
        expect(bonusOn - bonusOff).toBeCloseTo(0.045, 8);
    });

    test('contrast: Flins A4 (premod) ignores Bennett extra ATK in the same team', () => {
        const emilie = makeBuild('Emilie');
        const bennett = makeBuild('Bennet');
        const flins = makeBuild('Flins');
        const team = Team.fromMember(emilie);
        team.setMember(1, bennett);
        team.setMember(2, flins);
        team.setMember(3, makeBuild('Aino'));
        team.setOnFieldMember(emilie);
        bennett.setCharSettings({});
        burning(team, true);
        matchCarrierTotals(emilie, {atk_total: 1000});
        matchCarrierTotals(flins, {atk_total: 1000});
        const emilieBefore = dmgAll(emilie);
        const flinsBefore = totalMastery(finalStats(flins));
        bennett.setCharSettings({bennet_fantastic_voyage: true});
        // Emilie (total read) moves with the extra ATK; Flins A4 (8% of
        // premod ATK, cap 160, linear here) does not.
        expect(dmgAll(emilie) - emilieBefore).toBeGreaterThan(0.01);
        expect(totalMastery(finalStats(flins)) - flinsBefore).toBeCloseTo(0, 8);
    });
});
