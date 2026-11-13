import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { finalStats, makeBuild, totalMastery } from "./support/team";
import { matchCarrierTotals } from "./support/teamConversion";

global.DB = DB;

// md/buff_chains.md, md/task_progress.md (Nefer):
// - Moonsign benediction (lunarBloomPost, EM -> lunarbloom_multi, TEAM, cap
//   14): reads total EM. Game data:
//   Avatar_Nefer_PermanentSkill_3 uses SetNewElementReactionBaseDamageRatioParam
//   (propType Mastery), which names no premod/total read; the same call
//   reads the total stat in game (Ineffa's Benediction, in-game test:
//   md/buff_chains.md), as GO does (input.total.eleMas). It counts Columbina
//   C2 premod EM and Key/Nahida/Sucrose extra EM alike.
// - Every scaling: 'mastery*' hit below reads the total EM (game:
//   Avatar_Nefer_Damage_Handler ModifyDamageMixin damageExtra and
//   Avatar_Nefer_ElementalArt / SkillObj_Nefer_ElementalBurst_Attacker
//   attackProperty damageExtra DPM x FIGHT_PROP_ELEMENT_MASTERY; GO:
//   input.total.eleMas). mastery* is already total: C1 (60% EM) and C6
//   (85%/120% EM) need no params.
// - A1/C2 flat EM (100/200) writes Actor_ElemMasteryDelta (non-extra, no stat
//   read): conditions write premod, default confirmed.
// - A4 Verdant Dew speed reads total EM in the game but has no attribute
//   stat here: STOP, reported in md/task_progress.md.
//
// Nefer's base EM is 100 (AvatarExcelConfigData elementMastery): totals below
// include it via matchCarrierTotals.
//
// A 4-member team is used throughout (solo excepted): a smaller team would get
// Elemental Resonance in our engine but not in the game (md/buff_chains.md).

function delta(member, apply) {
    const before = finalStats(member);
    apply();
    const after = finalStats(member);
    return (stat) => after.get(stat) - before.get(stat);
}

// Nefer on field with Columbina C2 (dendro, 30000 HP -> +105 premod EM) and
// her own EM matched to 400, so the benediction stays under its cap.
function setupC2() {
    const nefer = makeBuild('Nefer');
    const columbina = makeBuild('Columbina');
    columbina.setCharLevels({level: 90, ascension: 6, constellation: 2});
    const team = Team.fromMember(nefer);
    team.setMember(1, columbina);
    team.setMember(2, makeBuild('Aino'));
    team.setMember(3, makeBuild('Kazuha'));
    team.setOnFieldMember(nefer);
    columbina.setCharSettings({
        columbina_lunar_brilliance: true,
        columbina_c2_dominant_lunar: 'dendro',
    });
    matchCarrierTotals(columbina, {hp_total: 30000});
    matchCarrierTotals(nefer, {mastery_total: 400});
    return {team, nefer, columbina};
}

describe("Nefer benediction reads total EM", () => {
    test("solo formula and cap: 1.75% of EM, max 14%", () => {
        const nefer = makeBuild('Nefer');
        Team.fromMember(nefer);
        // lunarbloom_multi is stored /100: 0.000175 per EM, cap 0.14.
        for (const [em, expected] of [[200, 0.035], [400, 0.07], [800, 0.14], [1000, 0.14]]) {
            matchCarrierTotals(nefer, {mastery_total: em});
            // No extra EM present: premod and total agree here; the read
            // direction is pinned by the game expression, not by these values.
            expect(totalMastery(finalStats(nefer))).toBeCloseTo(em, 6);
            expect(finalStats(nefer).get('lunarbloom_multi')).toBeCloseTo(expected, 8);
        }
    });

    test("counts Columbina C2 premod EM", () => {
        const {nefer, columbina} = setupC2();
        // 0.35% of 30000 total HP, premod: Nefer (on field) gains 105 EM.
        expect(delta(nefer, () => columbina.setCharSettings({}))('mastery')).toBeCloseTo(-105, 8);
        columbina.setCharSettings({
            columbina_lunar_brilliance: true,
            columbina_c2_dominant_lunar: 'dendro',
        });
        // Hold Brilliance on and switch only the dominant Lunar reaction:
        // Columbina's own HP benediction stays put while Nefer loses the 105
        // C2 EM. 1.75% of 105 = 1.8375% (uncapped: 400 EM gives 7%).
        const off = {columbina_lunar_brilliance: true, columbina_c2_dominant_lunar: 'electro'};
        expect(delta(nefer, () => columbina.setCharSettings(off))('lunarbloom_multi')).toBeCloseTo(-0.018375, 8);
    });

    test("counts the Key's extra EM", () => {
        const nefer = makeBuild('Nefer');
        const kazuha = makeBuild('Kazuha');
        kazuha.setWeapon(DB.Weapons.get('sword').get('KeyofKhajNisut'));
        kazuha.setWeaponLevels({level: 90, ascension: 6, refine: 1});
        const team = Team.fromMember(nefer);
        team.setMember(1, kazuha);
        team.setMember(2, makeBuild('Aino'));
        // No second Benediction source on the team (Columbina would add her
        // own lunarbloom_multi from HP), so the stat is Nefer's alone.
        team.setMember(3, makeBuild('Fischl'));
        team.setOnFieldMember(nefer);
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 0});
        matchCarrierTotals(nefer, {mastery_total: 400});
        expect(finalStats(nefer).get('lunarbloom_multi')).toBeCloseTo(0.07, 8);
        // The Key's party EM is extra: it raises her total EM, which the
        // bonus reads (1.75% per 100 EM, max 14%).
        const emBefore = totalMastery(finalStats(nefer));
        kazuha.setWeaponSettings({weapon_key_of_khaj_nisut: 3});
        const stats = finalStats(nefer);
        const gained = totalMastery(stats) - emBefore;
        expect(gained).toBeGreaterThan(1);
        expect(stats.get('lunarbloom_multi')).toBeCloseTo(Math.min(0.14, 0.000175 * (400 + gained)), 8);
    });
});
