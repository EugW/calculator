import { Cyno } from "../src/js/db/Char/Cyno";
import { kavehOnField } from "../src/js/db/Char/Kaveh";
import { characterConversionTests } from "./support/teamCharacterConversion";
import { Team } from "../src/js/classes/Team";
import { enemyChange, finalStats, makeBuild } from "./support/team";

// The old recording allowed Cyno's Radiance shares without a Polestar
// Field. Open only his source gates for that recorded state; enabling the
// real shared field would also add its unrelated RES and elemental bonuses.
// The direct delivery suite checks Radiance and recipient requirements.
// The gates read the team's Polestar Field through ConditionTeam.
const cynoPolestarGates = Cyno.getAllConditions().flatMap((condition) => (
    condition.params.condition?.items || condition.params.subConditions || []
)).map((condition) => condition.params.condition || condition)
    .filter((condition) => condition.getName() === 'polestar_field');

/**
 * Batch 5b: Alhaitham, Baizhu, Cyno, Kaveh, Nilou, Faruzan, Dahlia, Mika.
 */
const CONVERTED = [
    {
        // C4 Elucidation: consumed Mirrors raise other nearby members'
        // Mastery by 30 per stack; Alhaitham keeps his own Dendro bonus.
        char: 'Alhaitham',
        constellation: 6,
        on: {
            alhaitham_elucidation: 3,
        },
    },
    {
        // A4 Year of Verdant Favor reaction bonuses from live Max HP for
        // the healed active character (the recorded receiver). C4 raises the whole
        // team's Mastery by 80, Baizhu included.
        char: 'Baizhu',
        constellation: 6,
        on: {
            baizhu_all_things_are_of_the_earth: true,
            baizhu_ancient_art_of_perception: true,
        },
        carrierTotals: {hp_total: 30000},
        ignoreStats: ['baizhu_max_hp'],
    },
    {
        // C1 Together We Rise: 200 Mastery for the incoming active
        // character. The text requires being in a Polestar Field to enter
        // Radiance: Stellar-Conduct; open that source gate as the old party
        // row did. C2 adds 16% Stellar-Conduct DMG per stack.
        char: 'Cyno',
        constellation: 6,
        openConditions: cynoPolestarGates,
        on: {
            cyno_radiance_stellarconduct: true,
            cyno_together_we_rise: true,
            cyno_homecoming_of_spirits_stellarconduct: 5,
        },
    },
    {
        // Painted Dome: Bloom and Lunar-Bloom cores of all party members
        // deal additional DMG from Kaveh's live burst level (C3 bonus comes
        // from his own constellation). "These effects will be canceled once
        // Kaveh leaves the field": the old model did not check that, so the
        // gate is open here as recorded (checked in teamCharsBatch5bReview).
        char: 'Kaveh',
        constellation: 6,
        openConditions: [kavehOnField],
        on: {
            kaveh_painted_dome: true,
        },
        ignoreStats: ['kaveh_char_skill_burst'],
    },
    {
        // A1 Golden Chalice's Bounty Mastery, A4 Bountiful bonus from live
        // HP and C2 RES shreds reach the team; the Nilou-party bookkeeping
        // reads the real team, so mixed recorded teams only hold the
        // ungated Dendro shred.
        char: 'Nilou',
        constellation: 6,
        on: {
            nilou_stance_bonus: true,
            nilou_stance_attacked: true,
            nilou_the_starry_skies_1: true,
            nilou_the_starry_skies_2: true,
        },
        carrierTotals: {hp_total: 30000},
        ignoreStats: ['nilou_max_hp'],
    },
    {
        // Burst Anemo RES shred (enemy debuff) and Anemo DMG bonus from
        // live burst level for all nearby members; A4 Hurricane Guard from
        // live Base ATK for Anemo damage; C6 Anemo CRIT DMG. The C5 burst
        // bonus comes from her own constellation.
        char: 'Faruzan',
        constellation: 6,
        on: {
            faruzan_wind_bale: true,
            faruzan_wind_benefit: true,
            faruzan_lost_wisdom_of_the_seven_caverns: true,
            faruzan_the_wondrous_path_of_truth: true,
        },
        carrierTotals: {atk_base: 900},
        ignoreStats: ['faruzan_atk_base', 'faruzan_char_skill_burst'],
    },
    {
        // A4 ATK SPD from live Max HP for the active affected member; C2
        // Shield Strength for the protected character; C6 ATK SPD for the
        // active affected character.
        char: 'Dahlia',
        constellation: 6,
        on: {
            dahlia_prayer_of_well_wrought_joy: true,
            dahlia_revelation_of_mercy: true,
            dahlia_you_shall_go_out_with_joy: true,
        },
        carrierTotals: {hp_total: 30000},
        ignoreStats: ['dahlia_max_hp'],
    },
    {
        // Soulwind ATK SPD from live skill level, Detector Physical DMG
        // and C6 Physical CRIT DMG for affected characters on the field.
        // The C5 skill bonus comes from his own constellation.
        char: 'Mika',
        constellation: 6,
        on: {
            mika_soulwind: true,
            mika_suppressive_barrage: 5,
            mika_companions_counsel: true,
        },
        ignoreStats: ['mika_char_skill_elemental'],
    },
];

characterConversionTests(CONVERTED);


test("Cyno's real Polestar gate keeps the field's shared effects intact", () => {
    const receiver = makeBuild('Eula');
    const cyno = makeBuild('Cyno');
    cyno.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const team = Team.fromMember(receiver);
    team.setMember(1, cyno);
    cyno.setCharSettings({
        cyno_radiance_stellarconduct: true,
        cyno_together_we_rise: true,
        cyno_homecoming_of_spirits_stellarconduct: 5,
    });
    const withoutField = finalStats(receiver);
    expect(withoutField.get('mastery')).toBe(0);
    expect(withoutField.get('dmg_stellarconduct')).toBe(0);
    expect(enemyChange(receiver, 'enemy_res_phys', withoutField)).toBe(0);

    team.setSettings({...team.getSettings(), polestar_field: true});
    const withField = finalStats(receiver);
    expect(withField.get('mastery')).toBe(200);
    expect(withField.get('dmg_stellarconduct')).toBeCloseTo(0.8, 10);
    expect(enemyChange(receiver, 'enemy_res_phys', withField)).toBeCloseTo(-0.4, 10);
    expect(withField.get('dmg_cryo')).toBeCloseTo(0.2, 10);
});
